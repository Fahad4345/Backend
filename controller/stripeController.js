import Order from "../model/PlaceOrder.js";
import Stripe from "stripe";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

export const CreateCheckoutSession = async (req, res) => {
  console.log("Creating Stripe session...");

  try {
    // Validate environment variables
    if (!process.env.STRIPE_SECRET_KEY) {
      console.error("STRIPE_SECRET_KEY is not set");
      return res.status(500).json({ error: "Stripe configuration error" });
    }

    if (!process.env.FRONTEND_URL) {
      console.error("FRONTEND_URL is not set");
      return res.status(500).json({ error: "Frontend URL not configured" });
    }

    // Validate request body
    const { items, customer, total } = req.body;

    if (!items || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ error: "Items are required" });
    }

    if (!customer) {
      return res
        .status(400)
        .json({ error: "Customer information is required" });
    }

    console.log("Request data:", { items, customer, total });

    // Validate items structure
    for (const item of items) {
      if (!item.name || !item.price || !item.quantity) {
        return res.status(400).json({
          error: "Each item must have name, price, and quantity",
        });
      }

      if (item.price <= 0 || item.quantity <= 0) {
        return res.status(400).json({
          error: "Price and quantity must be positive numbers",
        });
      }
    }

    // Create Stripe session
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ["card"],
      mode: "payment",
      line_items: items.map((item) => ({
        price_data: {
          currency: "usd",
          product_data: {
            name: item.name,
            // Optional: add description, images, etc.
          },
          unit_amount: Math.round(item.price * 100), // Ensure it's an integer
        },
        quantity: item.quantity,
      })),
      success_url: `${process.env.FRONTEND_URL}/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${process.env.FRONTEND_URL}/cancel`,
      // Optional: Add customer email if available
      ...(customer.email && { customer_email: customer.email }),
      // Optional: Add metadata for tracking
      metadata: {
        orderId: `temp_${Date.now()}`,
        customerId: customer.userId || "guest",
      },
    });

    console.log("Stripe session created successfully:", session.id);

    // Create order in database
    const newOrder = new Order({
      customer,
      items,
      total:
        total ||
        items.reduce((acc, item) => acc + item.price * item.quantity, 0),
      paymentMethod: "Card",
      paymentStatus: "Pending",
      orderStatus: "Pending",
      sessionId: session.id,
      createdAt: new Date(),
    });

    try {
      const savedOrder = await newOrder.save();
      console.log("Order saved to database:", savedOrder._id);
    } catch (dbError) {
      console.error("Database save error:", dbError);
      // Don't return error here as Stripe session is already created
      // We'll handle this in the webhook
    }

    // Return the session URL
    return res.status(200).json({
      url: session.url,
      sessionId: session.id,
    });
  } catch (error) {
    console.error("Stripe session creation error:", error);

    // Handle specific Stripe errors
    if (error.type === "StripeCardError") {
      return res.status(400).json({ error: error.message });
    } else if (error.type === "StripeInvalidRequestError") {
      return res.status(400).json({ error: "Invalid request to Stripe" });
    } else if (error.type === "StripeAPIError") {
      return res.status(500).json({ error: "Stripe API error" });
    } else if (error.type === "StripeConnectionError") {
      return res.status(500).json({ error: "Network error with Stripe" });
    } else if (error.type === "StripeAuthenticationError") {
      return res.status(500).json({ error: "Stripe authentication failed" });
    }

    return res.status(500).json({
      error: "Failed to create payment session",
      details:
        process.env.NODE_ENV === "development" ? error.message : undefined,
    });
  }
};

export const webhook = async (req, res) => {
  console.log("Stripe webhook received");

  const sig = req.headers["stripe-signature"];
  let event;

  try {
    if (!process.env.STRIPE_WEBHOOK_SECRET) {
      console.error("STRIPE_WEBHOOK_SECRET is not set");
      return res.status(500).json({ error: "Webhook secret not configured" });
    }

    event = stripe.webhooks.constructEvent(
      req.body,
      sig,
      process.env.STRIPE_WEBHOOK_SECRET
    );

    console.log("Webhook event verified:", event.type);
  } catch (err) {
    console.error("Webhook signature verification failed:", err.message);
    return res.status(400).json({ error: `Webhook Error: ${err.message}` });
  }

  // Handle the event
  switch (event.type) {
    case "checkout.session.completed":
      const session = event.data.object;
      console.log("Processing completed checkout session:", session.id);

      try {
        const order = await Order.findOneAndUpdate(
          { sessionId: session.id },
          {
            paymentStatus: "Paid",
            paymentId: session.payment_intent,
            orderStatus: "Confirmed",
            updatedAt: new Date(),
          },
          { new: true }
        );

        if (order) {
          console.log("✅ Order updated successfully:", order._id);

          // Optional: Send confirmation email, update inventory, etc.
          // await sendConfirmationEmail(order);
          // await updateInventory(order.items);
        } else {
          console.error("❌ Order not found for session:", session.id);
        }
      } catch (err) {
        console.error("Database update error in webhook:", err);
      }
      break;

    case "checkout.session.expired":
      const expiredSession = event.data.object;
      console.log("Checkout session expired:", expiredSession.id);

      try {
        await Order.findOneAndUpdate(
          { sessionId: expiredSession.id },
          {
            paymentStatus: "Failed",
            orderStatus: "Cancelled",
            updatedAt: new Date(),
          }
        );
      } catch (err) {
        console.error("Error updating expired session:", err);
      }
      break;

    default:
      console.log(`Unhandled event type: ${event.type}`);
  }

  res.json({ received: true });
};

export const cancelOrder = async (req, res) => {
  try {
    const { orderId } = req.params;

    if (!orderId) {
      return res.status(400).json({ error: "Order ID is required" });
    }

    const order = await Order.findById(orderId);

    if (!order) {
      return res.status(404).json({ error: "Order not found" });
    }

    if (order.paymentStatus !== "Paid") {
      return res
        .status(400)
        .json({ error: "Order is not paid, cannot refund" });
    }

    if (order.orderStatus === "Cancelled") {
      return res.status(400).json({ error: "Order is already cancelled" });
    }

    if (!order.paymentId) {
      return res
        .status(400)
        .json({ error: "No payment ID found for this order" });
    }

    // Create refund in Stripe
    const refund = await stripe.refunds.create({
      payment_intent: order.paymentId,
      reason: "requested_by_customer",
    });

    // Update order in database
    order.paymentStatus = "Refunded";
    order.refundId = refund.id;
    order.orderStatus = "Cancelled";
    order.updatedAt = new Date();
    await order.save();

    console.log("Refund processed successfully:", refund.id);

    res.json({
      message: "Refund processed successfully",
      refund: {
        id: refund.id,
        amount: refund.amount,
        status: refund.status,
      },
    });
  } catch (error) {
    console.error("Refund error:", error);

    if (error.type === "StripeInvalidRequestError") {
      return res.status(400).json({ error: error.message });
    }

    res.status(500).json({ error: "Refund failed" });
  }
};

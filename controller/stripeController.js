import mongoose from "mongoose";

import User from "../model/User.js";
import Order from "../model/PlaceOrder.js";
import Stripe from "stripe";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

export const CreateCheckoutSession = async (req, res) => {
  console.log("Creating Stripe session...");

  try {
    const { items, customer, total } = req.body;
    console.log("user", customer, "Id", customer._id);
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ["card"],
      mode: "payment",
      line_items: items.map((item) => ({
        price_data: {
          currency: "usd",
          product_data: {
            name: item.name,
          },
          unit_amount: Math.round(item.price * 100),
        },
        quantity: item.quantity,
      })),
      success_url: `${process.env.FRONTEND_URL}/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${process.env.FRONTEND_URL}/cancel`,

      ...(customer.email && { customer_email: customer.email }),

      metadata: {
        orderId: `temp_${Date.now()}`,
        customerId: customer.userId || "guest",
      },
    });

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

    await newOrder.save();

    return res.status(200).json({
      url: session.url,
      sessionId: session.id,
    });
  } catch (error) {
    console.error("Stripe session creation error:", error);

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
    event = stripe.webhooks.constructEvent(
      req.body,
      sig,
      process.env.STRIPE_WEBHOOK_SECRET
    );
  } catch (err) {
    console.error("Webhook signature verification failed:", err.message);
    return res.status(400).json({ error: `Webhook Error: ${err.message}` });
  }

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
        if (order && order.customer?.userId) {
          const userId = new mongoose.Types.ObjectId(order.customer.userId);

          const result = await User.updateOne(
            { _id: userId },
            { $set: { cart: [] } }
          );

          console.log("🛒 Cart clear result:", result);
        } else {
          console.warn("⚠️ No order or userId found for session:", session.id);
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
  }

  res.json({ received: true });
};

export const cancel = async (req, res) => {
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

    const refund = await stripe.refunds.create({
      payment_intent: order.paymentId,
      reason: "requested_by_customer",
    });

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

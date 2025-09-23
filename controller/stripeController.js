import Order from "../model/PlaceOrder.js";
import Stripe from "stripe";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

export const CreateCheckoutSession = async (req, res) => {
  console.log("Stripe key", process.env.STRIPE_SECRET_KEY);
  console.log("session running");
  try {
    console.log("Try running");
    const { items, customer, paymentMethod } = req.body;

    const session = await stripe.checkout.sessions.create({
      payment_method_types: ["card"],
      mode: "payment",
      line_items: items.map((item) => ({
        price_data: {
          currency: "usd",
          product_data: { name: item.name },
          unit_amount: item.price * 100,
        },
        quantity: item.quantity,
      })),
      success_url: `${process.env.FRONTEND_URL}/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${process.env.FRONTEND_URL}/cancel`,
    });
    console.log("session  Created");

    const neworder = new Order({
      customer,
      items,
      total: items.reduce((acc, i) => acc + i.price * i.quantity, 0),
      paymentMethod: "Card",
      paymentStatus: "Pending",
      sessionId: session.id,
    });
    console.log("Order Created");
    try {
      const savedOrder = await neworder.save();
    } catch (error) {
      console.error("Stripe session error:", error);
      res.status(500).json({ error: error.message });
    }

    res.json({ url: session.url });
  } catch (error) {
    res.status(500).json({ error: "Failed to create session" });
  }
};

export const webhook = async (req, res) => {
  console.log("webhook running");
  const sig = req.headers["stripe-signature"];
  let event;

  try {
    console.log("Try running");
    console.log("Secret", process.env.STRIPE_WEBHOOK_SECRET);
    console.log("Body", req.body);
    console.log("Sig", sig);

    event = stripe.webhooks.constructEvent(
      req.body,
      sig,
      process.env.STRIPE_WEBHOOK_SECRET
    );
    console.log("Try running");
  } catch (err) {
    console.log(err, "error stripe----");
    return res.status(400).json(`Webhook Error: ${err.message}`);
  }
  console.log("Event", event.type);
  if (event.type === "checkout.session.completed") {
    const session = event.data.object;

    try {
      console.log("Try2 running");
      const order = await Order.findOneAndUpdate(
        { sessionId: session.id },
        { paymentStatus: "Paid", paymentId: session.payment_intent },
        { new: true }
      );

      console.log("Order", order);

      if (order) {
        console.log(
          "✅ Order updated:",
          order._id,
          "status:",
          order.paymentStatus
        );
      } else {
        console.error(" Order not found for session:", session.id);
      }
    } catch (err) {
      console.error("Webhook DB update error:", err);
    }
  }

  res.json({ received: true });
};

export const cancel = async (req, res) => {
  try {
    const order = await Order.findById(req.params.orderId);
    if (!order) return res.status(404).json({ error: "Order not found" });

    if (order.paymentStatus !== "Paid") {
      return res.status(400).json({ error: "Order not paid" });
    }

    const refund = await stripe.refunds.create({
      payment_intent: order.paymentId,
    });
    order.paymentStatus = "Refunded";
    order.refundId = refund.id;
    order.orderStatus = "Canceled";
    await order.save();

    res.json({ message: "Refund successful", refund });
  } catch (error) {
    console.error("Refund error:", error);
    res.status(500).json({ error: "Refund failed" });
  }
};

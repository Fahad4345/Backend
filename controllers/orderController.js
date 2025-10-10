import mongoose from "mongoose";
import Order from "../models/Order.js";
import User from "../models/User.js";
import express from "express";

const router = express.Router();

export const placeOrder = async (req, res) => {
  try {
    const { customer, items, total, paymentMethod, status } = req.body;
    if (!customer || !items || items.length === 0) {
      return res.status(400).json({ message: "Misssing required fields" });
    }

    const newOrder = new Order({
      customer,
      items,
      total,
      paymentMethod,
      status: "pending",
    });
    await newOrder.save();
    console.log(customer, items, total, paymentMethod, status);

    if (newOrder && newOrder.customer?.userId) {
      const userId = new mongoose.Types.ObjectId(newOrder.customer.userId);

      const result = await User.updateOne(
        { _id: userId },
        { $set: { cart: [] } }
      );

      console.log("🛒 Cart clear result:", result);
    } else {
      console.warn("⚠️ No order or userId found for session:", session.id);
    }
    res
      .status(201)
      .json({ message: "Order placed successfully", order: newOrder });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};
export const updateOrderStatus = async (req, res) => {
  try {
    const { id, orderStatus } = req.body;

    if (!id) {
      return res.status(400).json({ error: "Order ID is required" });
    }

    if (!orderStatus) {
      return res.status(400).json({ error: "orderStatus is required" });
    }

    const updatedOrder = await Order.findByIdAndUpdate(
      id,
      { orderStatus, updatedAt: new Date() },
      { new: true, runValidators: true }
    );

    if (!updatedOrder) {
      return res.status(404).json({ error: "Order not found" });
    }

    res.status(200).json({
      message: "Order status updated successfully",
      order: updatedOrder,
    });
  } catch (error) {
    console.log(" Error updating order status:", error);
    res.status(500).json({ error: "Server error updating order status" });
  }
};

export const GetAllOrder = async (req, res) => {
  try {
    const { userId } = req.params;
    console.log("UserID", userId);
    const orders = await Order.find({ "customer.userId": userId });

    if (!orders || orders.length === 0) {
      return res
        .status(404)
        .json({ message: "No orders found for this customer" });
    }

    res.status(200).json(orders);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

export const GetAllOrdersAdmin = async (req, res) => {
  try {
    const orders = await Order.find().sort({ createdAt: -1 });
    if (!orders || orders.length === 0) {
      return res.status(404).json({ message: "No orders found" });
    }
    res.status(200).json(orders);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

export default router;

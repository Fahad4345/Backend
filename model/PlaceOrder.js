import mongoose from "mongoose";

const orderSchema = new mongoose.Schema(
  {
    customer: {
      userId: { type: String, required: true },
      firstName: { type: String, required: true },
      email: { type: String, required: true },
      phone: { type: String, required: true },
      address: { type: String, required: true },
    },

    items: [
      {
        productId: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "Product",
          required: true,
        },
        name: { type: String, required: true },
        price: { type: Number, required: true },
        quantity: { type: Number, required: true },
      },
    ],

    total: { type: Number, required: true },

    paymentMethod: {
      type: String,
      enum: ["Cash on Delivery", "Card"],
      required: true,
    },
    paymentStatus: {
      type: String,
      enum: ["Pending", "Paid", "Failed", "Refunded"],
      default: "Pending",
    },
    paymentId: { type: String },
    sessionId: { type: String },
    refundId: { type: String },

    orderStatus: {
      type: String,
      enum: [
        "Placed",
        "Pending",
        "Processing",
        "Shipped",
        "Delivered",
        "Cancelled",
      ],
      default: "Placed",
    },
  },
  { timestamps: true }
);

const Order = mongoose.model("Order", orderSchema);
export default Order;

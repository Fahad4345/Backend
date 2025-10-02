import User from "../models/User.js";
import Item from "../models/Item.js";
import express from "express";

const router = express.Router();


export const InsertCart = async (req, res) => {
  try {
    const {
      itemId,

      size,
      color,
      quantity,
    } = req.body;
    const user = req.user;
    console.log("Insert Cart Running...");

    if (!user) return res.status(404).json({ message: "User not found" });

    const item = await Item.findById(itemId);

    if (!item) return res.status(404).json({ message: "Item not found" });
    if (!user.cart) user.cart = [];
    const existingCartItem = user.cart.find(
      (c) => c.itemId.toString() === itemId
    );

    if (existingCartItem) {
      existingCartItem.quantity += quantity || 1;
    } else {
      user.cart.push({
        itemId: item._id,
        size,
        color,
        quantity,
      });
    }

    await user.save();
    await user.populate("cart.itemId");
    const cartWithDetails = user.cart.map((cartItem) => ({
      _id: cartItem._id,
      quantity: cartItem.quantity,
      size: cartItem.size,
      color: cartItem.color,
      itemId: cartItem.itemId._id,
      name: cartItem.itemId.name,
      category: cartItem.itemId.category,
      price: cartItem.itemId.price,
      description: cartItem.itemId.description,
      discount: cartItem.itemId.discount,
      discountPrice: cartItem.itemId.discountPrice,
      review: cartItem.itemId.review,
      rating: cartItem.itemId.rating,
      image: cartItem.itemId.image,
    }));

    res
      .status(200)
      .json({ message: "Item added to cart", cart: cartWithDetails });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};


export const DeleteCartItem = async (req, res) => {
  try {
    const user = req.user;
    if (!user) return res.status(404).json({ message: "User not found" });

    const { itemId } = req.body;
    if (!itemId) return res.status(400).json({ message: "itemId is required" });

    const itemIndex = user.cart.findIndex(
      (item) => item.itemId.toString() === itemId
    );

    if (itemIndex === -1) {
      return res.status(404).json({ message: "Item not found in cart" });
    }

    user.cart.splice(itemIndex, 1);

    await user.save();
    await user.populate("cart.itemId");

    const cartWithDetails = user.cart.map((cartItem) => ({
      _id: cartItem._id,
      quantity: cartItem.quantity,
      size: cartItem.size,
      color: cartItem.color,
      itemId: cartItem.itemId._id,
      name: cartItem.itemId.name,
      category: cartItem.itemId.category,
      price: cartItem.itemId.price,
      description: cartItem.itemId.description,
      discount: cartItem.itemId.discount,
      discountPrice: cartItem.itemId.discountPrice,
      review: cartItem.itemId.review,
      rating: cartItem.itemId.rating,
      image: cartItem.itemId.image,
    }));

    res
      .status(200)
      .json({ message: "Item removed from cart", cart: cartWithDetails });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};


export const GetCart = async (req, res) => {
  try {
    const userFromToken = req.user;
    if (!userFromToken) {
      return res.status(400).json({ message: "User is required" });
    }

    const user = await User.findById(userFromToken.id).populate("cart.itemId");

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    res.status(200).json({ cart: user.cart });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};


export const UpdateCart = async (req, res) => {
  try {
    const user = req.user;
    if (!user) {
      return res.status(400).json({ message: "User is required" });
    }
    const { itemId, quantity, color, size } = req.body;
    const cart = await User.findById(user._id);
    if (!cart) return res.status(400).json({ message: "Cart not found" });
    const itemIndex = user.cart.findIndex(
      (item) => item.itemId.toString() === itemId
    );

    if (itemIndex === -1) {
      return res.status(404).json({ message: "Item not found in cart" });
    }
    if (quantity !== undefined) user.cart[itemIndex].quantity = quantity;
    if (size) user.cart[itemIndex].size = size;
    if (color) user.cart[itemIndex].color = color;

    await user.save();

    res
      .status(200)
      .json({ message: "Cart updated successfully", cart: user.cart });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

export default router;

import User from "../models/User.js";
import express from "express";

const router = express.Router();

export const InsertWishlist = async (req, res) => {
  try {
    const { itemId } = req.body;

    const user = await User.findById(req.user.id);

    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    if (!user.wishlist.includes(itemId)) {
      user.wishlist.push(itemId);
    }
    await user.save();

    res.status(200).json({
      message: "Item added to wishlist",
      wishlist: user.wishlist,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

export const GetWishlist = async (req, res) => {
  try {
    const user = await User.findById(req.user.id).populate("wishlist");
    console.log("User in request:", req.user);
    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }
    res.status(200).json({
      message: "Wishlist fetched sucessfully",
      wishlist: user.wishlist,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

export const RemoveItemWishlist = async (req, res) => {
  try {
    const { itemId } = req.body;

    if (!itemId) {
      return res.status(400).json({ message: "Item Id Required" });
    }
    const user = await User.findById(req.user.id);
    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }
    user.wishlist = user.wishlist.filter(
      (id) => id.toString() !== itemId.toString()
    );
    await user.save();
    res
      .status(200)
      .json({ message: "Item removed successfully", wishlist: user.wishlist });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

export default router;

import mongoose from "mongoose";

import User from "../model/User.js";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import Item from "../model/Item.js";

const ACCESS_SECRET = "mySuperSecretKey12345";
const REFRESH_SECRET = "myAnotherSecretKey67890";
import { OAuth2Client } from "google-auth-library";
import Stripe from "stripe";
import Order from "../model/PlaceOrder.js";

import { configDotenv } from "dotenv";

import express from "express";
import crypto from "crypto";
import {
  sendResetEmail,
  sendContactEmail,
  sendSubscribeEmail,
} from "../utils/mailer.js";

const router = express.Router();
configDotenv();

const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID;
const client = new OAuth2Client(GOOGLE_CLIENT_ID);
const Refresh_Tokens = new Set();
function generateAcessToken(user) {
  return jwt.sign(user, ACCESS_SECRET, { expiresIn: "1h" });
}
const getCookieOptions = () => ({
  httpOnly: true,
  secure: process.env.NODE_ENV === "production",
  sameSite: "lax",
});
function generateRefreshToken(user) {
  return jwt.sign(user, REFRESH_SECRET, { expiresIn: "7d" });
}
function isEmail(input) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(input);
}

function isPhone(input) {
  return /^\d{10,15}$/.test(input);
}
export const signup = async (req, res) => {
  let { Firstname, Lastname, Addresse, email, password } = req.body;

  try {
    if (!isEmail(email) && !isPhone(email)) {
      return res.status(400).json({ error: "Invalid Email or Phone" });
    }
    if (!password || password.trim() === "") {
      return res.status(400).json({ error: "Password is required" });
    }
    email = email.trim();
    password = password.trim();

    const user = new User({
      Firstname,
      Lastname,
      Addresse,
      email,
      password,
    });
    const exist = await User.findOne({ email });
    if (exist) {
      return res.status(401).json({ error: "User Already Exist" });
    }

    await user.save();
    await res.status(200).json({ message: "User Created Sucessfully", user });
  } catch (err) {
    console.log(err);
    res.status(500).json({ message: err.message });
  }
};

export const Login = async (req, res) => {
  const { email, password } = req.body;

  if (!email) return res.status(400).json({ message: "email required." });
  try {
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(500).json({ message: "Invalid Username" });
    }
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(500).json({ error: "Invalid Password" });
    }

    const Access_Token = generateAcessToken({
      id: user._id,
      email: user.email,
    });
    const Refresh_Token = generateRefreshToken({
      id: user._id,
      email: user.email,
    });
    Refresh_Tokens.add(Refresh_Token);

    res.cookie("Refresh_Token", Refresh_Token, getCookieOptions());

    res.status(200).json({ message: "Login Sucessfull", Access_Token, user });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};
export const RefreshToken = (req, res) => {
  const token = req.cookies.Refresh_Token;

  if (!token) return res.status(401).json({ error: "Refresh token missing" });
  if (!Refresh_Tokens.has(token)) {
    return res.status(403).json({ error: "Invalid refresh token" });
  }

  jwt.verify(token, REFRESH_SECRET, (err, user) => {
    if (err) return res.status(403).json({ error: "Token expired or invalid" });

    const newAccessToken = generateAcessToken({
      id: user.id,
      email: user.email,
    });
    res.status(200).json({ accessToken: newAccessToken });
  });
};

export const Dashboard = async (req, res) => {
  try {
    const user = await User.findOne(req.user);
    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }
    res.status(200).json({ user });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

export const Protected = async (req, res, next) => {
  const authHeader = req.headers["authorization"];
  if (!authHeader) {
    return res.status(400).json({ error: "Access Denied" });
  }
  const token = authHeader && authHeader.split(" ")[1];
  if (!token) {
    return res.status(401).json({ error: "Acess Token Required" });
  }
  try {
    const decoded = jwt.verify(token, ACCESS_SECRET);
    const user = await User.findById(decoded.id);
    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }
    req.user = user;

    next();
  } catch (error) {
    return res.status(400).json({ error: error.message });
  }
};

export const GoogleLogin = async (req, res) => {
  const { token } = req.body;

  if (!token) {
    return res.status(400).json({ error: "Google token is required" });
  }

  try {
    const ticket = await client.verifyIdToken({
      idToken: token,
      audience: GOOGLE_CLIENT_ID,
    });

    const payload = ticket.getPayload();
    const { email, name, picture, sub: googleId } = payload;

    if (!email) {
      return res.status(400).json({ error: "Email not found in token" });
    }

    let user = await User.findOne({ email });

    if (!user) {
      user = new User({
        Firstname: name.split(" ")[0],
        Lastname: name.split(" ")[1] || "",
        Addresse: "Google Account",
        email,
        password: "GOOGLE_OAUTH",
        picture,
        googleId,
      });
      await user.save();
    }

    const Access_Token = generateAcessToken({
      id: user._id,
      email: user.email,
    });

    const Refresh_Token = generateRefreshToken({
      id: user._id,
      email: user.email,
    });
    console.log("Referesh Token", Refresh_Token);

    Refresh_Tokens.add(Refresh_Token);

    res.cookie("Refresh_Token", Refresh_Token, getCookieOptions());

    res.status(200).json({
      message: "Google login successful",
      Access_Token,
      user: {
        id: user._id,
        name: user.Firstname,
        email: user.email,
        picture: user.picture,
      },
    });
  } catch (error) {
    console.error("Google login error:", error);
    res.status(500).json({ error: "Failed to verify Google token" });
  }
};
export const Logout = async (req, res) => {
  try {
    const token = req.cookies.Refresh_Token;
    console.log("Refresh Token:", token);

    if (token) {
      Refresh_Tokens.delete(token);
    } else {
      console.log("No refresh token found in cookies");
    }

    res.clearCookie("Refresh_Token", getCookieOptions());

    return res.status(200).json({ message: "Logout successful" });
  } catch (err) {
    console.error("Logout error:", err);
    return res.status(500).json({ error: "Failed to logout" });
  }
};
export const updateUser = async (req, res) => {
  try {
    const { Firstname, Lastname, Addresse, password, currentPassword } =
      req.body;
    const user = await User.findById(req.user.id);
    if (!user) {
      return res.staus(400).json({ error: "User not found" });
    }
    if (password) {
      if (!currentPassword) {
        return res.status(400).json({ error: "Current password is Required" });
      }
      const isMatch = await bcrypt.compare(currentPassword, user.password);
      if (!isMatch) {
        return res.status(400).json({ error: "Current password is incorrect" });
      }
      user.password = password;
    }
    if (Firstname) user.Firstname = Firstname;
    if (Lastname) user.Lastname = Lastname;
    if (Addresse) user.Addresse = Addresse;

    await user.save();
    res.status(200).json({ message: "User updated successfully", user });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};
export const InsertItem = async (req, res) => {
  console.log("Insert Item Called");
  console.log("📦 req.body:", req.body);
  console.log("📁 req.files:", req.files);

  try {
    const {
      name, // lowercase - matches req.body
      category, // lowercase
      price, // lowercase
      description, // lowercase
      color, // lowercase
      sizes, // lowercase
      review, // lowercase
      rating, // lowercase
      discount, // lowercase
    } = req.body;

    console.log("Extracted fields:", {
      name,
      category,
      price,
      description,
      color,
      sizes,
      review,
      rating,
      discount,
    });

    // Handle arrays (they're already arrays from FormData)
    const colorArray = Array.isArray(color) ? color : color ? [color] : [];
    const sizesArray = Array.isArray(sizes) ? sizes : sizes ? [sizes] : [];

    const images =
      req.files && req.files.length > 0
        ? req.files.map((file) => file.path)
        : [];

    console.log("📸 Images:", images);
    console.log("🎨 Colors:", colorArray);
    console.log("📏 Sizes:", sizesArray);

    let discountPrice = null;
    if (discount && price) {
      discountPrice = price - (price * discount) / 100;
    }

    let item = new Item({
      name: name,
      discount: discount,
      category: category,
      price: price,
      discountPrice: discountPrice,
      description: description,
      color: colorArray, // use the array
      sizes: sizesArray, // use the array
      review: review,
      rating: rating,
      image: images,
    });

    await item.save();
    console.log("✅ Item saved successfully");
    res.status(201).json({ message: "Item Added Successfully", item });
  } catch (err) {
    console.error("❌ Error:", err.message);
    res.status(500).json({ error: err.message });
  }
};
export const GetItem = async (req, res) => {
  try {
    const { Category } = req.query;
    let item;

    if (Category) {
      item = await Item.find({ category: Category });
    } else {
      item = await Item.find();
    }

    res.status(201).json({ message: "Item Fetched Sucessfully", item });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

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
export const getOneItem = async (req, res) => {
  try {
    const { id } = req.params;
    if (!id) {
      return res.status(400).json({ message: "Item Id Required" });
    }
    const item = await Item.findById(id);
    if (!item) {
      return res.status(404).json({ message: "Item not found" });
    }
    res.status(200).json({ message: "Item fetched successfully", item });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};
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

export const placeOrder = async (req, res) => {
  try {
    console.log("Place Order");
    const { customer, items, total, paymentMethod, status } = req.body;
    if (!customer || !items || items.length === 0) {
      return res.status(400).json({ message: "Misssing required fields" });
    }

    const newOrder = new Order({
      customer,
      items,
      total,
      paymentMethod,
      status: status || "pending",
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

export const SendGrid = async (req, res) => {
  const { email } = req.body;

  console.log("Forgot Password Request for:", email);
  if (!email) return res.status(400).json({ message: "Email is required" });

  const user = await User.findOne({ email: email.toLowerCase() });

  const genericMsg = {
    message: "If that email exists, you will receive reset instructions.",
  };

  if (!user) return res.json(genericMsg);

  console.log("User found:", user ? user.email : "No user found");

  const token = crypto.randomBytes(32).toString("hex");
  const tokenHash = crypto.createHash("sha256").update(token).digest("hex");

  user.resetPasswordTokenHash = tokenHash;
  user.resetPasswordExpires = Date.now() + 1000 * 60 * 60;
  await user.save();

  const resetUrl = `${process.env.DEPLOYED_URL}/resetPassword?token=${token}&id=${user._id}`;
  try {
    await sendResetEmail(user.email, resetUrl);
  } catch (err) {
    console.error("SendGrid error:", err);
  }

  return res.json(genericMsg);
};

export const ResetPassword = async (req, res) => {
  const { id, token, newPassword } = req.body;
  if (!id || !token || !newPassword)
    return res.status(400).json({ message: "Missing fields" });

  const user = await User.findById(id);
  if (!user || !user.resetPasswordTokenHash || !user.resetPasswordExpires)
    return res.status(400).json({ message: "Invalid or expired token" });

  if (Date.now() > user.resetPasswordExpires)
    return res.status(400).json({ message: "Token expired" });

  const tokenHash = crypto.createHash("sha256").update(token).digest("hex");
  if (tokenHash !== user.resetPasswordTokenHash)
    return res.status(400).json({ message: "Invalid token" });

  user.password = newPassword;

  user.resetPasswordTokenHash = undefined;
  user.resetPasswordExpires = undefined;
  await user.save();

  return res.json({ message: "Password updated successfully" });
};
export const SendContactEmail = async (req, res) => {
  try {
    const { to, text } = req.body;

    if (!to || !text) {
      return res.status(400).json({ error: "to,  and text are required" });
    }

    await sendContactEmail(to, text);

    res.json({ success: true, message: "Email sent successfully" });
  } catch (error) {
    res.status(500).json({ error: "Failed to send email" });
  }
};
export const SendSubscribeEmail = async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({ error: "Email is required" });
    }

    await sendSubscribeEmail(email);

    res.json({ success: true, message: "Email sent successfully" });
  } catch (error) {
    res.status(500).json({ error: "Failed to send email" });
  }
};
export const DeleteItem = async (req, res) => {
  try {
    const { id } = req.body;
    if (!id) {
      console.log("Delete Item Called without ID");
      return res.status(400).json({ message: "Item Id Required" });
    }
    const item = await Item.findByIdAndDelete(id);
    if (!item) {
      console.log("Item not found");
      return res.status(404).json({ message: "Item not found" });
    }
    res.json({ success: true, message: "Item deleted successfully" });
  } catch (error) {
    res.status(500).json({ error: "Failed to delete item" });
  }
};

export const UpdateItem = async (req, res) => {
  try {
    const { id } = req.params;
    const body = req.body;

    const updatedItem = await Item.findByIdAndUpdate(
      id,
      {
        name: body.name.trim(),
        description: body.description || "",
        price: parseFloat(body.price),
        sizes: body.sizes,
        color: body.color,
        updatedAt: new Date(),
      },
      { new: true, runValidators: true }
    );

    if (!updatedItem) {
      return res.status(404).json({ error: "Item not found" });
    }

    return res.status(200).json({
      success: true,
      message: "Item updated successfully",
      item: updatedItem,
    });
  } catch (error) {
    console.error("Error updating item:", error);
    return res.status(500).json({
      error: "Failed to update item",
      details: error.message,
    });
  }
};

export default router;

import User from "../model/User.js";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import Item from "../model/Item.js";
import Wishlist from "./../model/Wishlist.js";
import dbConnect from "./../lib/db.js";
const ACCESS_SECRET = "mySuperSecretKey12345";
const REFRESH_SECRET = "myAnotherSecretKey67890";
import { OAuth2Client } from "google-auth-library";
import Stripe from "stripe";
import Order from "../model/PlaceOrder.js";

import { configDotenv } from "dotenv";
configDotenv();

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID;
const client = new OAuth2Client(GOOGLE_CLIENT_ID);
const Refresh_Tokens = new Set();
function generateAcessToken(user) {
  return jwt.sign(user, ACCESS_SECRET, { expiresIn: "1h" });
}

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

    res.cookie("Refresh_Token", Refresh_Token, { httpOnly: true });
    res.status(200).json({ message: "Login Sucessfull", Access_Token, user });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};
export const RefreshToken = (req, res) => {
  const token = req.cookies.refreshToken;

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

    Refresh_Tokens.add(Refresh_Token);

    res.cookie("Refresh_Token", Refresh_Token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict",
    });

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
    const token = req.cookies.refreshToken;
    if (token) {
      Refresh_Tokens.delete(token);
    }
    res.clearCookie("Refresh_Token", {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict",
    });

    return res.status(200).json({ message: "Logout successful" });
  } catch (err) {
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
  try {
    const {
      Name,
      Category,
      Price,
      Description,
      Color,
      Sizes,
      Review,
      Rating,

      Discount,
    } = req.body;

    const images =
      req.files && req.files.length > 0
        ? req.files.map((file) => file.path)
        : [];
    let discountPrice = null;
    if (Discount && Price) {
      discountPrice = Price - (Price * Discount) / 100;
    }

    let item = new Item({
      name: Name,
      discount: Discount,
      category: Category,
      price: Price,
      discountPrice: discountPrice,
      description: Description,
      color: Color,
      sizes: Sizes,
      review: Review,
      rating: Rating,
      image: images,
    });

    await item.save();
    res.status(201).json({ message: "item Added Sucessfully", item });
  } catch (err) {
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
    res
      .status(201)
      .json({ message: "Order placed successfully", order: newOrder });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

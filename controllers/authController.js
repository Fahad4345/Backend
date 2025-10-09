import User from "../models/User.js";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { OAuth2Client } from "google-auth-library";
import express from "express";
import crypto from "crypto";
import { configDotenv } from "dotenv";
configDotenv();

const ACCESS_SECRET = process.env.ACCESS_SECRET;
const REFRESH_SECRET = process.env.REFRESH_SECRET;
const router = express.Router();
const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID;
const client = new OAuth2Client(GOOGLE_CLIENT_ID);
const Refresh_Tokens = new Set();

function generateAcessToken(user) {
  return jwt.sign(
    { id: user._id, email: user.email, role: user.role },
    ACCESS_SECRET,
    { expiresIn: "1m" }
  );
}
const getCookieOptions = () => ({
  httpOnly: true,
  secure: process.env.NODE_ENV === "production" ? true : false, // true on Railway
  sameSite: process.env.NODE_ENV === "production" ? "none" : "lax", // 'none' for cross-site
  path: "/", // allow all routes to access
});

function generateRefreshToken(user) {
  return jwt.sign(
    { id: user._id, email: user.email, role: user.role },
    REFRESH_SECRET,
    { expiresIn: "7d" }
  );
}

function isEmail(input) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(input);
}

function isPhone(input) {
  return /^\d{10,15}$/.test(input);
}

export const signup = async (req, res) => {
  let { Firstname, Lastname, Addresse, email, password, role } = req.body;

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
      role: "user",
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

    const Access_Token = generateAcessToken(user);
    const Refresh_Token = generateRefreshToken(user);

    Refresh_Tokens.add(Refresh_Token);

    res.cookie("Refresh_Token", Refresh_Token, getCookieOptions());

    res.status(200).json({ message: "Login Sucessfull", Access_Token, user });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

export const RefreshToken = (req, res) => {
  const token = req.cookies.Refresh_Token;
  console.log("refreshToken Called", token);

  if (!token) return res.status(401).json({ error: "Refresh token missing" });
  if (!Refresh_Tokens.has(token)) {
    return res.status(403).json({ error: "Invalid refresh token" });
  }

  jwt.verify(token, REFRESH_SECRET, (err, decodedUser) => {
    if (err) return res.status(403).json({ error: "Token expired or invalid" });

    console.log("Decoded refresh token payload:", decodedUser);

    // ✅ Use decodedUser, not 'user'
    const newAccessToken = jwt.sign(
      { id: decodedUser.id, email: decodedUser.email, role: decodedUser.role },
      ACCESS_SECRET,
      { expiresIn: "1d" }
    );

    console.log("✅ New Access Token generated successfully");

    res.status(200).json({ accessToken: newAccessToken });
  });
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

    const Access_Token = generateAcessToken(user);

    const Refresh_Token = generateRefreshToken(user);
    console.log("Referesh Token", Refresh_Token);

    Refresh_Tokens.add(Refresh_Token);

    res.cookie("Refresh_Token", Refresh_Token, getCookieOptions());

    res.status(200).json({
      message: "Google login successful",
      Access_Token,
      user: {
        _id: user._id,
        role: user.role,
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
export const GetAllUsers = async (req, res) => {
  try {
    const users = await User.find();
    res.status(200).json(users);
  } catch (error) {
    res.status(500).json({ error: "Failed to retrieve users" });
  }
};
export const Deleteuser = async (req, res) => {
  const { id } = req.body;
  if (!id) {
    return res.status(403).json({ message: "Id required" });
  }
  try {
    const user = User.findById(id);
    if (!user) {
      return res.status(403).json({ message: "User not found" });
    }
    await User.findByIdAndDelete(id);
    res.status(200).json({ message: "User deleted successfully" });
  } catch (err) {
    console.error("Delete user error:", error);
    res.status(500).json({ error: "Failed to delete user" });
  }
};

export default router;

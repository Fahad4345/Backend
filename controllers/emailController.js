import User from "../models/User.js";
import express from "express";
import crypto from "crypto";
import {
  sendResetPassword,
  sendContactEmail,
  sendSubscribeEmail,
} from "../utils/mailer.js";

const router = express.Router();

export const SendResetPassword = async (req, res) => {
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
    await sendResetPassword(user.email, resetUrl);
  } catch (err) {
    console.error("SendGrid error:", err);
  }

  return res.json(genericMsg);
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

export default router;

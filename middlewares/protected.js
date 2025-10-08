import jwt from "jsonwebtoken";
import User from "../models/User.js";

const ACCESS_SECRET = process.env.ACCESS_SECRET || "your_access_secret";
const REFRESH_SECRET = process.env.REFRESH_SECRET || "your_refresh_secret";

export const Protected = async (req, res, next) => {
  console.log("protected running");
  const authHeader = req.headers["authorization"];

  console.log("🔍 Auth Header:", authHeader); // Debug

  if (!authHeader) {
    return res.status(401).json({ error: "Access Denied" }); // Changed 400 to 401
  }

  const token = authHeader.split(" ")[1];
  console.log("🎫 Token:", token); // Debug

  if (!token) {
    return res.status(401).json({ error: "Access Token Required" }); // Fixed typo: "Acess" -> "Access"
  }

  try {
    const decoded = jwt.verify(token, ACCESS_SECRET);
    console.log("✅ Decoded:", decoded); // Debug

    const user = await User.findById(decoded.id);
    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    req.user = user;
    next();
  } catch (error) {
    console.error("❌ Token verification error:", error.message);

    // Return proper error for expired tokens
    if (error.name === "TokenExpiredError") {
      return res.status(401).json({ error: "Token expired" });
    }

    return res.status(401).json({ error: "Invalid token" }); // Changed 400 to 401
  }
};

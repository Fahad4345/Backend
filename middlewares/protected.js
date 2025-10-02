import jwt from "jsonwebtoken";
import User from "../models/User.js";

const ACCESS_SECRET = process.env.ACCESS_SECRET || "your_access_secret";
const REFRESH_SECRET = process.env.REFRESH_SECRET || "your_refresh_secret";

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

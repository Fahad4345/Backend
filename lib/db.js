import mongoose from "mongoose";
import User from "../model/User.js";

const connectDB = async () => {
  try {
    await mongoose.connect("mongodb://127.0.0.1:27017/mydatabase", {});
    await User.syncIndexes();
    console.log("Indexes synced with schema ✅");
    console.log("✅ MongoDB Connected...");
  } catch (error) {
    console.error("❌ MongoDB connection failed:", error.message);
    // process.exit(1);
  }
};

export default connectDB;

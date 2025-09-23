import mongoose from "mongoose";
import User from "../model/User.js";

const connectDB = async () => {
  try {
    await mongoose.connect(
      process.env.MONGO_URI || "mongodb://127.0.0.1:27017/mydatabase",
      {}
    );
    await User.syncIndexes();
    console.log("Indexes synced with schema ✅");
    console.log("✅ MongoDB Connected...");

    mongoose
      .connect(process.env.MONGO_URI)
      .then(() => {
        console.log("✅ MongoDB connected");
        console.log("📂 Database:", mongoose.connection.name);
      })
      .catch((err) => console.error("❌ DB Connection error:", err));
  } catch (error) {
    console.error("❌ MongoDB connection failed:", error.message);
    // process.exit(1);
  }
};

export default connectDB;

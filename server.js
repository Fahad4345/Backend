import authRoutes from "./routes/authRoutes.js";
import cartRoutes from "./routes/cartRoutes.js";
import emailRoutes from "./routes/emailRoutes.js";
import itemRoutes from "./routes/itemRoutes.js";
import orderRoutes from "./routes/orderRoutes.js";
import wishlistRoutes from "./routes/wishlistRoutes.js";
import env from "dotenv";
import express from "express";
import connectDB from "./lib/db.js";
import cookieParser from "cookie-parser";
import bodyParser from "body-parser";
import { v2 as cloudinary } from "cloudinary";
import cors from "cors";
import stripeRoute from "./routes/stripeRoutes.js";
import { webhook } from "./controllers/stripeController.js";

const PORT = process.env.PORT || 3001;

env.config();
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});
connectDB();

const app = express();

app.use(cookieParser());
app.use(
  cors({
    origin: [
      "http://localhost:3000",
      "https://backend-production-7ad70.up.railway.app",
      "https://ecommerce-three-delta-52.vercel.app",
    ],
    credentials: true,
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
  })
);

app.post("/Webhook", bodyParser.raw({ type: "application/json" }), webhook);
app.use(express.json());

app.use("/stripe", stripeRoute);
app.use("/auth", authRoutes);
app.use("/cart", cartRoutes);
app.use("/email", emailRoutes);
app.use("/item", itemRoutes);
app.use("/order", orderRoutes);
app.use("/wishlist", wishlistRoutes);
app.use((req, res, next) => {
  console.log("Incoming:", req.method, req.url);
  next();
});
app.listen(PORT, "0.0.0.0", () => {
  console.log(`✅ Server running on port ${PORT}`);
  console.log("PORT from env:", process.env.PORT);
});

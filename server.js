import authRoutes from "./routes/authRoutes.js";
import env from "dotenv";
import express from "express";
import connectDB from "./lib/db.js";
import cookieParser from "cookie-parser";
import multer from "multer";
import { v2 as cloudinary } from "cloudinary";
import { CloudinaryStorage } from "multer-storage-cloudinary";
import cors from "cors";
import Stripe from "stripe";
import stripeRoute from "./routes/stripeRoutes.js";
import webhook from "./controller/stripeController.js";
const PORT = process.env.PORT || 3001;

env.config();
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});
connectDB();

const app = express();
app.use(express.json());
app.use(cookieParser());
app.use(
  cors({
    origin: ["http://localhost:3000"],
    credentials: true,
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
  })
);

app.use("/stripe", authRoutes, stripeRoute);

app.use("/api/auth", express.json(), authRoutes);

router.post("/Webhook", bodyParser.raw({ type: "application/json" }), webhook);

app.listen(PORT, "0.0.0.0", () => {
  console.log(`✅ Server running on port ${PORT}`);
  console.log("PORT from env:", process.env.PORT);
});

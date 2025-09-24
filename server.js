import authRoutes from "./routes/authRoutes.js";
import env from "dotenv";
import express from "express";
import connectDB from "./lib/db.js";
import cookieParser from "cookie-parser";
import bodyParser from "body-parser";
import { v2 as cloudinary } from "cloudinary";
import cors from "cors";
import stripeRoute from "./routes/stripeRoutes.js";
import { webhook } from "./controller/stripeController.js";

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
      "https://ecommerce-8txphp4pf-fahad-rehans-projects.vercel.app",
    ],
    credentials: true,
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
  })
);

app.post("/Webhook", bodyParser.raw({ type: "application/json" }), webhook);

app.use("/stripe", express.json(), stripeRoute);
app.use("/api/auth", express.json(), authRoutes);

app.listen(PORT, "0.0.0.0", () => {
  console.log(`✅ Server running on port ${PORT}`);
  console.log("PORT from env:", process.env.PORT);
});

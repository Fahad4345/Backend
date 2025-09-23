import { Router } from "express";
import express from "express";
const router = Router();
import {
  CreateCheckoutSession,
  cancel,
  webhook,
} from "./../controller/stripeController.js";

router.post("/CreateSession", CreateCheckoutSession);
router.post("/Cancel", cancel);
router.post("/Webhook", express.raw({ type: "application/json" }), webhook);

export default router;

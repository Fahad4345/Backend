import { Router } from "express";
import bodyParser from "body-parser";
const router = Router();
import {
  CreateCheckoutSession,
  cancel,
  webhook,
} from "./../controller/stripeController.js";

router.post("/CreateSession", CreateCheckoutSession);
router.post("/Cancel", cancel);
router.post("/Webhook", bodyParser.raw({ type: "application/json" }), webhook);

export default router;

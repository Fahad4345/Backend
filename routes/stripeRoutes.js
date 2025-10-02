import { Router } from "express";
import {
  CreateCheckoutSession,
  cancel,
} from "./../controllers/stripeController.js";

const router = Router();
router.post("/CreateSession", CreateCheckoutSession);
router.post("/CancelOrder/:orderId", cancel);

export default router;

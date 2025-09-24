import { Router } from "express";
import bodyParser from "body-parser";
import { Router } from "express";
const router = Router();
import {
  CreateCheckoutSession,
  cancel,
  webhook,
} from "./../controller/stripeController.js";

router.post("/CreateSession", CreateCheckoutSession);
router.post("/CancelOrder/:orderId", cancel);

export default router;

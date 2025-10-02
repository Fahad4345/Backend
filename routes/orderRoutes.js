import { Router } from "express";
import {
  placeOrder,
  GetAllOrder,
  GetAllOrdersAdmin,
} from "../controllers/orderController.js";
import { Protected } from "../middlewares/protected.js";

const router = Router();
router.post("/PlaceOrder", Protected, placeOrder);
router.get("/GetOrder/:userId", Protected, GetAllOrder);
router.get("/GetAdminAllOrder", GetAllOrdersAdmin);
export default router;

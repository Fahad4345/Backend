import { Router } from "express";
import {
  placeOrder,
  GetAllOrder,
  GetAllOrdersAdmin,
  updateOrderStatus,
} from "../controllers/orderController.js";
import { Protected } from "../middlewares/protected.js";

const router = Router();
router.post("/PlaceOrder", Protected, placeOrder);
router.get("/GetOrder/:userId", Protected, GetAllOrder);
router.get("/GetAdminAllOrder", GetAllOrdersAdmin);
router.post("/UpdateOrderStatus", updateOrderStatus);
export default router;

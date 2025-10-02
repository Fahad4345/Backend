import { Router } from "express";
import {
  InsertCart,
  GetCart,
  DeleteCartItem,
  UpdateCart,
} from "../controllers/cartController.js";
import { Protected } from "../middlewares/protected.js";

const router = Router();
router.post("/InsertCart", Protected, InsertCart);
router.post("/DeleteCart", Protected, DeleteCartItem);
router.get("/GetCart", Protected, GetCart);
router.put("/UpdateCart", Protected, UpdateCart);

export default router;

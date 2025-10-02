import { Router } from "express";
import {
  InsertWishlist,
  GetWishlist,
  RemoveItemWishlist,
} from "../controllers/wishlistController.js";
import { Protected } from "../middlewares/protected.js";

const router = Router();
router.post("/InsertWishlist", Protected, InsertWishlist);
router.get("/GetWishlist", Protected, GetWishlist);
router.post("/RemoveItemWishlist", Protected, RemoveItemWishlist);
export default router;

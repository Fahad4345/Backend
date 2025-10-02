import { Router } from "express";
import upload from "../middlewares/upload.js";
import {
  InsertItem,
  DeleteItem,
  UpdateItem,
  GetItem,
  getOneItem,
} from "../controllers/itemController.js";

const router = Router();
router.post("/Insert", upload.array("images", 5), InsertItem);
router.post("/Delete", DeleteItem);
router.post("/Update/:id", UpdateItem);
router.get("/GetItem", GetItem);
router.get("/GetOneItem/:id", getOneItem);
export default router;

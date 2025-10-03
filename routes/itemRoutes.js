import { Router } from "express";
import upload from "../middlewares/upload.js";
import {
  InsertItem,
  DeleteItem,
  UpdateItem,
  GetItem,
  getOneItem,
} from "../controllers/itemController.js";
import { isAdmin } from "./../middlewares/isAdmin.js";

const router = Router();
router.post("/Insert", isAdmin, upload.array("images", 5), InsertItem);
router.post("/Delete", isAdmin, DeleteItem);
router.post("/Update/:id", isAdmin, UpdateItem);
router.get("/GetItem", GetItem);
router.get("/GetOneItem/:id", getOneItem);
export default router;

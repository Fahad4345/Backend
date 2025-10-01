import { Router } from "express";
import upload from "../upload.js";

const router = Router();
import {
  signup,
  Login,
  GoogleLogin,
  Logout,
  Protected,
  RefreshToken,
  updateUser,
  InsertItem,
  DeleteItem,
  UpdateItem,
  GetItem,
  InsertWishlist,
  GetWishlist,
  RemoveItemWishlist,
  getOneItem,
  InsertCart,
  GetCart,
  UpdateCart,
  DeleteCartItem,
  placeOrder,
  GetAllOrder,
  SendGrid,
  ResetPassword,
  SendContactEmail,
  SendSubscribeEmail,
} from "../controller/authController.js";
import { sendEmail } from "../controller/emailController.js";

router.post("/Signup", signup);
router.post("/Login", Login);
router.post("/GoogleLogin", GoogleLogin);
router.post("/Logout", Logout);

router.get("/RefreshToken", RefreshToken);
router.post("/UpdateProfile", Protected, updateUser);

router.post("/Insert", upload.array("images", 5), InsertItem);
router.post("/Delete", DeleteItem);
router.post("/Update/:id", UpdateItem);
router.get("/GetItem", GetItem);
router.post("/InsertWishlist", Protected, InsertWishlist);
router.get("/GetWishlist", Protected, GetWishlist);
router.post("/RemoveItemWishlist", Protected, RemoveItemWishlist);
router.get("/GetOneItem/:id", getOneItem);
router.post("/InsertCart", Protected, InsertCart);
router.post("/DeleteCart", Protected, DeleteCartItem);
router.get("/GetCart", Protected, GetCart);
router.put("/UpdateCart", Protected, UpdateCart);
router.post("/PlaceOrder", Protected, placeOrder);
router.get("/GetOrder/:userId", Protected, GetAllOrder);
router.post("/forgetPassword", SendGrid);
router.post("/resetPassword", ResetPassword);
router.post("/SendEmail", SendContactEmail);
router.post("/SendSubscribeEmail", SendSubscribeEmail);

export default router;

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
  GetItem,
  InsertWishlist,
  GetWishlist,
  RemoveItemWishlist,
  getOneItem,
  InsertCart,
  GetCart,
  UpdateCart,
  CheckoutSession,
  DeleteCartItem,
  placeOrder,
} from "../controller/authController.js";
import { sendEmail } from "../controller/emailController.js";

router.post("/Signup", signup);
router.post("/Login", Login);
router.post("/GoogleLogin", GoogleLogin);
router.post("/logout", Logout);

router.get("/RefreshToken", RefreshToken);
router.post("/UpdateProfile", Protected, updateUser);
router.post("/Insert", upload.array("images", 5), InsertItem);
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
router.post("/SendEmail", async (req, res) => {
  try {
    const { to, subject, text } = req.body;

    if (!to || !subject || !text) {
      return res
        .status(400)
        .json({ error: "to, subject, and text are required" });
    }

    await sendEmail(to, subject, text);

    res.json({ success: true, message: "Email sent successfully" });
  } catch (error) {
    res.status(500).json({ error: "Failed to send email" });
  }
});

export default router;

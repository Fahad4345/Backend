import { Router } from "express";
import {
  signup,
  Login,
  GoogleLogin,
  Logout,
  RefreshToken,
  updateUser,
  ResetPassword,
  GetAllUsers,
} from "../controllers/authController.js";
import { Protected } from "../middlewares/protected.js";

const router = Router();
router.post("/Signup", signup);
router.post("/Login", Login);
router.post("/GoogleLogin", GoogleLogin);
router.post("/Logout", Logout);
router.get("/RefreshToken", RefreshToken);
router.post("/UpdateProfile", Protected, updateUser);
router.post("/resetPassword", ResetPassword);
router.get("/GetAllUsers", GetAllUsers);

export default router;

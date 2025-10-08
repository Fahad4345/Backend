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
  Deleteuser,
} from "../controllers/authController.js";
import { Protected } from "../middlewares/protected.js";

const router = Router();
router.post("/Signup", signup);
router.post("/Login", Login);
router.post("/GoogleLogin", GoogleLogin);
router.post("/Logout", Logout);
router.post("/RefreshToken", RefreshToken);
router.post("/UpdateProfile", Protected, updateUser);
router.post("/resetPassword", ResetPassword);
router.get("/GetAllUsers", GetAllUsers);
router.post("/DeleteUser", Deleteuser);

export default router;

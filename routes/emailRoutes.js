import { Router } from "express";
import {
  SendContactEmail,
  SendSubscribeEmail,
  SendResetPassword,
} from "../controllers/emailController.js";

const router = Router();
router.post("/SendEmail", SendContactEmail);
router.post("/SendSubscribeEmail", SendSubscribeEmail);
router.post("/forgetPassword", SendResetPassword);
export default router;

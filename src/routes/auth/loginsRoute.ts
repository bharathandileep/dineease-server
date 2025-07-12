import express, { Application } from "express";
import { apiConfig } from "../../config/endpoint ";
import {
  generateLoginOtp,
} from "../../controllers/auth/authController";
import { handleRegisterUser, handleUserLogin } from "../../controllers/auth/loginsController";



const router = express.Router();

router.post(`${apiConfig.auth.userRegister}`, handleRegisterUser);
router.post(`${apiConfig.auth.userLogins}`, handleUserLogin);

export default router;

import express, { Application } from "express";
import { apiConfig } from "../../config/endpoint ";
import { verifyFirebaseToken } from "../../middleware/verifyFirebaseToken";
import {
  handleAuthenticateOtp,
  handleGoogleAuth,
  generateRegistrationOtp,
  generateLoginOtp,
  handleLoginOtpVerification,
  handleGenerateAccessToken,
  checkUserExistence,
  createUser,
  getUserInfoById,
} from "../../controllers/auth/authController";
import { otpRateLimiter } from "../../middleware/rateLimiter";
import {
  generateForgotPassOtp,
  handleAdminLogin,
  handleForgotPasswordVerification,
  handleRegisterAdmin,
  handleUpdatePassword,
} from "../../controllers/admin/adminController";
import { refreshTokenMiddleware } from "../../middleware/TokenValidation";

const router = express.Router();

router.post(`${apiConfig.auth.google}`, verifyFirebaseToken, handleGoogleAuth);
router.post(
  `${apiConfig.auth.sendOtp}`,
  otpRateLimiter,
  generateRegistrationOtp
);
router.post(`${apiConfig.auth.loginOtp}`, generateLoginOtp);
router.post(`${apiConfig.auth.verifyOtp}`, handleAuthenticateOtp);
router.post(`${apiConfig.auth.verifyLoginOtp}`, handleLoginOtpVerification);
router.post(`${apiConfig.auth.adminRegister}`, handleRegisterAdmin);
router.post(`${apiConfig.auth.adminLogin}`, handleAdminLogin);
router.post(
  `${apiConfig.auth.accessToken}`,
  refreshTokenMiddleware,
  handleGenerateAccessToken
);
router.post(`${apiConfig.auth.forgotPassword}`, generateForgotPassOtp);
router.post(
  `${apiConfig.auth.verifyForgotOtp}`,
  handleForgotPasswordVerification
);

router.post(`${apiConfig.auth.updatePassword}`, handleUpdatePassword);
router.post(`${apiConfig.auth.checkUserExistence}`, checkUserExistence);
router.post(`${apiConfig.auth.createNewUser}`, createUser);
router.get(`${apiConfig.auth.getUserInfoById}`, getUserInfoById);

export default router;

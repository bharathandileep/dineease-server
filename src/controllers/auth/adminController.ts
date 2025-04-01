import { Request, Response } from "express";

import {
  sendErrorResponse,
  sendSuccessResponse,
} from "../../lib/helpers/responseHelper";
import { HTTP_STATUS_CODE } from "../../lib/constants/httpStatusCodes";
import { ERROR_TYPES } from "../../lib/constants/errorType";
import Admin from "../../models/users/adminModel";
import {
  comparePassword,
  hashPassword,
} from "../../lib/helpers/generatePasswordHash";
import { appendRefreshTokenCookies } from "../../lib/utils/attachAuthToken";
import { generateJWTToken, verifyToken } from "../../lib/helpers/JWTToken";
import {
  accessTokenExpiration,
  accessTokenSecret,
} from "../../config/environment";
import { CustomError } from "../../lib/errors/customError";
import { validateForgotOtp, validateOtp } from "../../lib/utils/otpValidator";
import { generateAndEmailForgotOtp } from "../../lib/helpers/generateAndSendEmail";


export const handleRegisterAdmin = async (req: Request, res: Response) => {
  try {
    const { fullName, email, username, password } = req.body;

    if (!fullName || !email || !password) {
      throw new CustomError(
        "All fields are required",
        HTTP_STATUS_CODE.BAD_REQUEST,
        ERROR_TYPES.BAD_GATEWAY_ERROR,
        false
      );
    }
    const existingAdmin = await Admin.findOne({ email });
    if (existingAdmin) {
      throw new CustomError(
        "Admin already exists",
        HTTP_STATUS_CODE.BAD_REQUEST,
        ERROR_TYPES.BAD_GATEWAY_ERROR,
        false
      );
    }

    const hashedPassword = await hashPassword(password);
    const newAdmin = new Admin({
      fullName,
      username,
      email,
      password: hashedPassword,
    });

    await newAdmin.save();
    sendSuccessResponse(
      res,
      "Admin registered successfully",
      null,
      HTTP_STATUS_CODE.OK
    );
  } catch (error) {
    sendErrorResponse(
      res,
      error,
      HTTP_STATUS_CODE.INTERNAL_SERVER_ERROR,
      ERROR_TYPES.INTERNAL_SERVER_ERROR_TYPE
    );
  }
};
export const handleAdminLogin = async (req: Request, res: Response) => {
  try {
    const { username, password } = req.body;

    if (!username || !password) {
      throw new CustomError(
        "user name and password are required",
        HTTP_STATUS_CODE.BAD_REQUEST,
        ERROR_TYPES.BAD_GATEWAY_ERROR,
        false
      );
    }

    const admin = await Admin.findOne({ username });
    if (!admin) {
      throw new CustomError(
        `Invalid credential`,
        HTTP_STATUS_CODE.BAD_REQUEST,
        ERROR_TYPES.BAD_GATEWAY_ERROR,
        false
      );
    }

    const isMatch = await comparePassword(password, admin.password);
    if (!isMatch) {
      throw new CustomError(
        `Invalid credential`,
        HTTP_STATUS_CODE.BAD_REQUEST,
        ERROR_TYPES.BAD_GATEWAY_ERROR,
        false
      );
    }

    const payload = { id: admin._id, email: admin.email, role: admin.role };
    appendRefreshTokenCookies(res, payload);
    const accessToken = generateJWTToken(
      accessTokenSecret,
      payload,
      accessTokenExpiration
    );
    sendSuccessResponse(
      res,
      "User logged in successfully.",
      { token: accessToken },
      HTTP_STATUS_CODE.OK
    );
  } catch (error) {
    sendErrorResponse(
      res,
      error,
      HTTP_STATUS_CODE.INTERNAL_SERVER_ERROR,
      ERROR_TYPES.INTERNAL_SERVER_ERROR_TYPE
    );
  }
};
export const generateForgotPassOtp = async (
  req: Request,
  res: Response
): Promise<any> => {
  try {
    const { email } = req.body;
    let admin = await Admin.findOne({ email });
    if (!admin) {
      throw new CustomError(
        "Email not registered.Please enter a valid email address.",
        HTTP_STATUS_CODE.BAD_REQUEST,
        ERROR_TYPES.BAD_REQUEST_ERROR,
        false
      );
    }
    const result = await generateAndEmailForgotOtp(admin.email, admin.fullName);
    if (!result.success) {
      throw new CustomError(
        `Failed to send OTP to the email address. Please try again later.`,
        HTTP_STATUS_CODE.INTERNAL_SERVER_ERROR,
        ERROR_TYPES.SERVER_ERROR,
        false
      );
    }
    return sendSuccessResponse(
      res,
      "Verification code sent successfully to your email address.",
      { email },
      HTTP_STATUS_CODE.OK
    );
  } catch (error) {
    sendErrorResponse(
      res,
      error,
      HTTP_STATUS_CODE.INTERNAL_SERVER_ERROR,
      ERROR_TYPES.INTERNAL_SERVER_ERROR_TYPE
    );
  }
};
export const handleForgotPasswordVerification = async (
  req: Request,
  res: Response
): Promise<any> => {
  try {
    const { email, otp } = req.body;
    let admin = await Admin.findOne({ email });
    if (!admin) {
      throw new CustomError(
        "Email not registered. Please enter a valid email address.",
        HTTP_STATUS_CODE.BAD_REQUEST,
        ERROR_TYPES.BAD_REQUEST_ERROR,
        false
      );
    }


    const otpVerificationResult = await validateForgotOtp(email, otp);
    if (!otpVerificationResult) {
      throw new CustomError(
        "Invalid OTP. Please try again.",
        HTTP_STATUS_CODE.BAD_REQUEST,
        ERROR_TYPES.BAD_REQUEST_ERROR,
        false
      );
    }

   
    const payload = { id: admin._id, email: admin.email, role: admin.role };
    const token = generateJWTToken(
      accessTokenSecret,
      payload,
      '2m' 
    );

    return sendSuccessResponse(
      res,
      "OTP successfully verified. You can now reset your password.",
      { token },
      HTTP_STATUS_CODE.OK
    );
  } catch (error) {
    sendErrorResponse(
      res,
      error,
      HTTP_STATUS_CODE.INTERNAL_SERVER_ERROR,
      ERROR_TYPES.INTERNAL_SERVER_ERROR_TYPE
    );
  }
};
export const handleUpdatePassword = async (req: Request, res: Response): Promise<any> => {
  try {
    const { email, newPassword, token } = req.body;

    if (!token) {
      throw new CustomError(
        "Token is required.",
        HTTP_STATUS_CODE.UNAUTHORIZED,
        ERROR_TYPES.VALIDATION_ERROR,
        false
      );
    }

    // Verify the token
    let tokenPayload;
    try {
      tokenPayload = verifyToken(token, accessTokenSecret);
    } catch (err) {
      throw new CustomError(
        "Invalid token.",
        HTTP_STATUS_CODE.UNAUTHORIZED,
        ERROR_TYPES.VALIDATION_ERROR,
        false
      );
    }

    // Validate new password
    if (!newPassword || newPassword.length < 6) {
      throw new CustomError(
        "Password must be at least 6 characters long.",
        HTTP_STATUS_CODE.BAD_REQUEST,
        ERROR_TYPES.BAD_REQUEST_ERROR,
        false
      );
    }

    // Check if user exists
    let admin = await Admin.findOne({ email });
    if (!admin) {
      throw new CustomError(
        "Email not registered. Please enter a valid email address.",
        HTTP_STATUS_CODE.BAD_REQUEST,
        ERROR_TYPES.BAD_REQUEST_ERROR,
        false
      );
    }

    // Hash and update password
    const hashedPassword = await hashPassword(newPassword);
    admin.password = hashedPassword;
    await admin.save();

    return sendSuccessResponse(
      res,
      "Your password has been updated successfully.",

      HTTP_STATUS_CODE.OK
    );
  } catch (error) {
    sendErrorResponse(
      res,
      error,
      HTTP_STATUS_CODE.INTERNAL_SERVER_ERROR,
      ERROR_TYPES.INTERNAL_SERVER_ERROR_TYPE
    );
  }
};

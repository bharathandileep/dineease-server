import { Request, Response } from "express";
import { CustomError } from "../../lib/errors/customError";
import {
  sendErrorResponse,
  sendSuccessResponse,
} from "../../lib/helpers/responseHelper";
import { HTTP_STATUS_CODE } from "../../lib/constants/httpStatusCodes";
import { ERROR_TYPES } from "../../lib/constants/errorType";
import { generateAndEmailOtp } from "../../lib/helpers/generateAndSendEmail";
import { validateOtp } from "../../lib/utils/otpValidator";
import User from "../../models/users/UserModel";
import { appendRefreshTokenCookies } from "../../lib/utils/attachAuthToken";
import { generateJWTToken } from "../../lib/helpers/JWTToken";
import {
  accessTokenExpiration,
  accessTokenSecret,
} from "../../config/environment";

export const handleGoogleAuth = async (
  req: Request,
  res: Response
): Promise<any> => {
  try {
    const { email, name, picture } = req.body.user;
    let user = await User.findOne({ email });
    if (!user) {
      user = new User({
        fullName: name,
        email,
        profile_photo: picture,
      });
      await user.save();
    }
    const payload = {
      id: user._id,
      email: user.email,
      fullName: user.fullName,
      role: "User",
    };
    appendRefreshTokenCookies(res, payload);
    const accessToken = generateJWTToken(
      accessTokenSecret,
      payload,
      accessTokenExpiration
    );
    const message = user.isNew
      ? "Welcome! Your account has been created successfully."
      : "User logged in successfully.";

    return sendSuccessResponse(
      res,
      message,
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

export const generateRegistrationOtp = async (
  req: Request,
  res: Response
): Promise<any> => {
  try {
    const { email, fullName } = req.body;
    let user = await User.findOne({ email });
    if (user) {
      throw new CustomError(
        `This email address is already registered. Please try signing.`,
        HTTP_STATUS_CODE.BAD_REQUEST,
        ERROR_TYPES.BAD_REQUEST_ERROR,
        false
      );
    }
    const result = await generateAndEmailOtp(email, fullName);
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

export const generateLoginOtp = async (
  req: Request,
  res: Response
): Promise<any> => {
  try {
    const { email } = req.body;
    let user = await User.findOne({ email });
    if (!user) {
      throw new CustomError(
        "Email not registered. Please sign up to continue.",
        HTTP_STATUS_CODE.BAD_REQUEST,
        ERROR_TYPES.BAD_REQUEST_ERROR,
        false
      );
    }
    const result = await generateAndEmailOtp(user.email, user.fullName);
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

export const handleAuthenticateOtp = async (
  req: Request,
  res: Response
): Promise<any> => {
  try {
    const { email, otp } = req.body;
    const userDetails = await validateOtp(email, otp);
    const newUser = new User({
      fullName: userDetails.fullName,
      email: userDetails.email,
    });
    const isUserCreated = await newUser.save();
    if (!isUserCreated) {
      throw new CustomError(
        "We're experiencing a temporary technical issue. Please try your request again in a few moments. If the problem persists, contact our support team.",
        HTTP_STATUS_CODE.INTERNAL_SERVER_ERROR,
        ERROR_TYPES.INTERNAL_SERVER_ERROR_TYPE,
        false
      );
    }
    let user = await User.findOne({ email });
    const payload = {
      id: user?._id,
      email: user?.email,
      fullName: user?.fullName,
      role: "User",
    };
    appendRefreshTokenCookies(res, payload);
    const accessToken = generateJWTToken(
      accessTokenSecret,
      payload,
      accessTokenExpiration
    );
    return sendSuccessResponse(
      res,
      "Great! Your email address has been successfully verified.",
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

export const handleLoginOtpVerification = async (
  req: Request,
  res: Response
): Promise<any> => {
  try {
    const { email, otp } = req.body;
    let user = await User.findOne({ email });
    if (!user) {
      throw new CustomError(
        "Email not registered. Please sign up to continue.",
        HTTP_STATUS_CODE.BAD_REQUEST,
        ERROR_TYPES.BAD_REQUEST_ERROR,
        false
      );
    }
    await validateOtp(email, otp);
    const payload = {
      id: user._id,
      email: user.email,
      fullName: user.fullName,
      role: "User",
    };
    appendRefreshTokenCookies(res, payload);
    const accessToken = generateJWTToken(
      accessTokenSecret,
      payload,
      accessTokenExpiration
    );

    sendSuccessResponse(
      res,
      "Great! Your email address has been successfully verified.",
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

export const handlePhoneRegistration = (req: Request, res: Response) => {};

export const handleGenerateAccessToken = async (
  req: Request,
  res: Response
) => {
  try {
    const { payload } = req.body;
    const { iat, exp, ...cleanedPayload } = payload;
    const accessToken = generateJWTToken(
      accessTokenSecret,
      cleanedPayload,
      accessTokenExpiration
    );
    sendSuccessResponse(
      res,
      "Created new token",
      accessToken,
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

export const checkUserExistence = async ( 
  req: Request,
  res: Response
): Promise<any> => {
  try {
    const { email } = req.body;

    if (!email) {
      throw new CustomError(
        "Email is required.",
        HTTP_STATUS_CODE.BAD_REQUEST,
        ERROR_TYPES.BAD_REQUEST_ERROR
      );
    }

    const user = await User.findOne({ email });

    if (!user) {
      throw new CustomError(
        "User does not exist.",
        HTTP_STATUS_CODE.NOT_FOUND,
        ERROR_TYPES.NOT_FOUND_ERROR
      );
    }

    sendSuccessResponse(
      res,
      "User found successfully.",
      {
        id: user._id,
        email: user.email,
        fullName: user.fullName,
        phone: user.phone_number,
      },
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

export const createUser = async (req: Request, res: Response): Promise<any> => {
  try {
    const { email, phone, name } = req.body;

    if (!email || !phone || !name) {
      throw new CustomError(
        "Email, phone number, and full name are required.",
        HTTP_STATUS_CODE.BAD_REQUEST,
        ERROR_TYPES.BAD_REQUEST_ERROR
      );
    }

    const existingUser = await User.findOne({
      $or: [{ email }, { phone }],
    });

    if (existingUser) {
      throw new CustomError(
        "User with this email or phone number already exists.",
        HTTP_STATUS_CODE.BAD_REQUEST,
        ERROR_TYPES.CONFLICT_ERROR
      );
    }

    const newUser = new User({
      email,
      phone_number: phone,
      fullName: name,
    });
    await newUser.save();

    sendSuccessResponse(
      res,
      "User created successfully.",
      {
        id: newUser._id,
        email: newUser.email,
        phone: newUser.phone_number,
        fullName: newUser.fullName,
      },
      HTTP_STATUS_CODE.CREATED
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

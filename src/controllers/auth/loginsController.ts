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
import Logins from "../../models/users/loginsModel";
import { generateRandomPassword } from "../../lib/helpers/generateRandomPassword";
import { generateAndSendCredentialsEmail } from "../../lib/helpers/generateAndSendEmail";
import EmployeeManagement from "../../models/empmanagment/AdminEmployeeModel";
import OrgEmployeeManagement from "../../models/empmanagment/OrgEmployeeManagementModel";
import Organization from "../../models/organisations/OrgModel";
import User from "../../models/users/UserModel";
import RolesAndAccess from "../../models/users/rolesAndAccessModel";
import Kitchen from "../../models/kitchen/KitchenModel";

// not in use need to be removed(for checking)
export const handleRegisterUser = async (req: Request, res: Response) => {
  try {
    const { email, username, password } = req.body;

    if (!email || !password) {
      throw new CustomError(
        "All fields are required",
        HTTP_STATUS_CODE.BAD_REQUEST,
        ERROR_TYPES.BAD_GATEWAY_ERROR,
        false
      );
    }
    const existingAdmin = await Logins.findOne({ email });
    if (existingAdmin) {
      throw new CustomError(
        "User already exists",
        HTTP_STATUS_CODE.BAD_REQUEST,
        ERROR_TYPES.BAD_GATEWAY_ERROR,
        false
      );
    }

    const hashedPassword = await hashPassword(password);
    const newAdmin = new Logins({
      username,
      email,
      password: hashedPassword,
    });

    await newAdmin.save();
    sendSuccessResponse(
      res,
      "User registered successfully",
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

export const registerUser = async (
  email: string,
  fullName: string,
  role_id: any
): Promise<void> => {
  if (!email || !fullName) {
    throw new CustomError(
      "All fields are required",
      HTTP_STATUS_CODE.BAD_REQUEST,
      ERROR_TYPES.BAD_REQUEST_ERROR,
      false
    );
  }
  const existingUser = await User.findOne({ email });
  if (existingUser) {
    throw new CustomError(
      "User already exists",
      HTTP_STATUS_CODE.BAD_REQUEST,
      ERROR_TYPES.BAD_REQUEST_ERROR,
      false
    );
  }
  const password = generateRandomPassword();
  generateAndSendCredentialsEmail(email, fullName, password);
  const hashedPassword = await hashPassword(password);
  const newUser = new User({
    fullName,
    email,
    password: hashedPassword,
    role_id,
  });
  await newUser.save();
};

export const handleUserLogin = async (req: Request, res: Response) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      throw new CustomError(
        "Username and password are required",
        HTTP_STATUS_CODE.BAD_REQUEST,
        ERROR_TYPES.BAD_REQUEST_ERROR,
        false
      );
    }
    const userInfo = await User.findOne({ email });
    if (!userInfo) {
      throw new CustomError(
        "Invalid credentials",
        HTTP_STATUS_CODE.BAD_REQUEST,
        ERROR_TYPES.BAD_REQUEST_ERROR,
        false
      );
    }
    console.log(userInfo);
    const isMatch = await comparePassword(password, userInfo.password);
    if (!isMatch) {
      throw new CustomError(
        "Invalid credentials",
        HTTP_STATUS_CODE.BAD_REQUEST,
        ERROR_TYPES.BAD_REQUEST_ERROR,
        false
      );
    }
    console.log(userInfo.role_id);
    const roleInfo = await RolesAndAccess.findById(userInfo.role_id);
    if (!roleInfo) {
      throw new CustomError(
        "Employee details not found",
        HTTP_STATUS_CODE.NOT_FOUND,
        ERROR_TYPES.NOT_FOUND_ERROR,
        false
      );
    }
    const empDetails = {
      contextId: roleInfo.entityId,
      contextType: roleInfo.entityType,
      slug: "Admin",
      role: roleInfo._id,
    };
    if (roleInfo.entityType === "Organization") {
      const entityInfo = await Organization.findById(roleInfo.entityId);
      if (!entityInfo) {
        throw new Error(`Organization not found`);
      }
      empDetails.slug = entityInfo.slug;
    }
    if (roleInfo.entityType === "Kitchen") {
      const entityInfo = await Kitchen.findById(roleInfo.entityId);
      if (!entityInfo) {
        throw new Error(`Kitchen not found`);
      }
      empDetails.slug = entityInfo.slug;
    }
    const payload = {
      id: userInfo._id,
      email: userInfo.email,
      role: "Employee",
    };
    appendRefreshTokenCookies(res, payload);

    const accessToken = generateJWTToken(
      accessTokenSecret,
      payload,
      accessTokenExpiration
    );

    // Send success response
    sendSuccessResponse(
      res,
      "User logged in successfully.",
      { token: accessToken, employeeDetails: empDetails },
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

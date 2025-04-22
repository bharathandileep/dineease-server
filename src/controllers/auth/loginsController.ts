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
import EmployeeManagement from "../../models/empmanagment/EmployeeManagementModel";
import OrgEmployeeManagement from "../../models/empmanagment/OrgEmployeeManagementModel";
import Organization from "../../models/organisations/OrgModel";

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
  username: string,
  role_id: any
): Promise<void> => {
  if (!email || !username) {
    throw new CustomError(
      "All fields are required",
      HTTP_STATUS_CODE.BAD_REQUEST,
      ERROR_TYPES.BAD_REQUEST_ERROR,
      false
    );
  }
  const existingUser = await Logins.findOne({ email });
  if (existingUser) {
    throw new CustomError(
      "User already exists",
      HTTP_STATUS_CODE.BAD_REQUEST,
      ERROR_TYPES.BAD_REQUEST_ERROR,
      false
    );
  }
  const password = generateRandomPassword();
  generateAndSendCredentialsEmail(email, username, password);
  const hashedPassword = await hashPassword(password);
  const newUser = new Logins({
    username,
    email,
    password: hashedPassword,
    role_id,
  });
  await newUser.save();
};

export const handleUserLogin = async (req: Request, res: Response) => {
  try {
    const { email, password } = req.body;
    // Validate input
    if (!email || !password) {
      throw new CustomError(
        "Username and password are required",
        HTTP_STATUS_CODE.BAD_REQUEST,
        ERROR_TYPES.BAD_REQUEST_ERROR,
        false
      );
    }

    // Find the user by username
    const admin = await Logins.findOne({ email });
    if (!admin) {
      throw new CustomError(
        "Invalid credentials",
        HTTP_STATUS_CODE.BAD_REQUEST,
        ERROR_TYPES.BAD_REQUEST_ERROR,
        false
      );
    }

    // Validate password
    const isMatch = await comparePassword(password, admin.password);
    if (!isMatch) {
      throw new CustomError(
        "Invalid credentials",
        HTTP_STATUS_CODE.BAD_REQUEST,
        ERROR_TYPES.BAD_REQUEST_ERROR,
        false
      );
    }

    // Find employee details by email
    let employee = await EmployeeManagement.findOne({
      email: admin.email,
      is_deleted: false,
    });

    if (!employee) {
      employee = await OrgEmployeeManagement.findOne({
        email: admin.email,
        is_deleted: false,
      });
    }
    if (!employee) {
      throw new CustomError(
        "Employee details not found",
        HTTP_STATUS_CODE.NOT_FOUND,
        ERROR_TYPES.NOT_FOUND_ERROR,
        false
      );
    }
    let slug = "admin";
    if (employee.entity_type !== "Admin") {
      const organization = await Organization.findOne({
        _id: employee.entity_id,
        is_deleted: false,
      });

      if (!organization) {
        throw new CustomError(
          "Organization details not found",
          HTTP_STATUS_CODE.NOT_FOUND,
          ERROR_TYPES.NOT_FOUND_ERROR,
          false
        );
      }

      slug = organization.slug; 
    }

    const payload = {
      id: admin._id,
      email: admin.email,
      role: "Employee", 
      employeeDetails: employee, 
    };

    // Append refresh token to cookies
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
      { token: accessToken, employeeDetails: employee, slug },
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

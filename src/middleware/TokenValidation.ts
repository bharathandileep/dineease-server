import { NextFunction, Request, Response } from "express";
import { verifyToken } from "../lib/helpers/JWTToken";
import { accessTokenSecret, refreshTokenSecret } from "../config/environment";
import { CustomError } from "../lib/errors/customError";
import { HTTP_STATUS_CODE } from "../lib/constants/httpStatusCodes";
import { ERROR_TYPES } from "../lib/constants/errorType";
 
export const refreshTokenMiddleware = (
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  const { refreshToken } = req.cookies;
  if (!refreshToken) {
    throw new CustomError(
      "Authorization token not provided",
      HTTP_STATUS_CODE.BAD_REQUEST,
      ERROR_TYPES.BAD_REQUEST_ERROR,
      false
    );
  }
 
  const decode = verifyToken(refreshToken, refreshTokenSecret);
  if (!decode) {
    throw new CustomError(
      "Invalid refresh token",
      HTTP_STATUS_CODE.FORBIDDEN,
      ERROR_TYPES.AUTHENTICATION_ERROR,
      false
    );
  }
  req.body.payload = decode;
  next();
};
 
export const authorizationAccess = (
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  const authHeader = req.headers.authorization;
  console.log(authHeader)
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    throw new CustomError(
      "Authorization token not provided",
      HTTP_STATUS_CODE.UNAUTHORIZED,
      ERROR_TYPES.AUTHENTICATION_ERROR,
      false
    );
  }
 
  const token = authHeader.split(" ")[1];
  const decode = verifyToken(token, accessTokenSecret);
 
  if (!decode) {
    throw new CustomError(
      "Invalid access token",
      HTTP_STATUS_CODE.FORBIDDEN,
      ERROR_TYPES.AUTHENTICATION_ERROR,
      false
    );
  }
 
  req.body.payload = decode;
  next();
};
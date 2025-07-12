import {
  accessTokenExpiration,
  accessTokenSecret,
  node_env,
  refreshTokenExpiration,
  refreshTokenSecret,
} from "../../config/environment";
import { generateJWTToken } from "../helpers/JWTToken";
import { Response } from "express";

export const appendRefreshTokenCookies = (
  res: Response,
  payload: string | object
) => {
  const refreshToken = generateJWTToken(
    refreshTokenSecret,
    payload,
    refreshTokenExpiration
  );
  res.cookie("refreshToken", refreshToken, {
    httpOnly: true,
    secure: false,
    sameSite: "lax",
  });
};

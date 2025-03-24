import dotenv from "dotenv";
dotenv.config();

export const port: number | string = process.env.PORT || 5000;
export const node_env: string | undefined =
 process.env.NODE_ENV;

export const MONGO_DB_USERNAME: string | undefined =
  process.env.MONGO_DB_USERNAME;
export const MONGO_DB_PASSWORD: string | undefined =
  process.env.MONGO_DB_PASSWORD;
export const mongoURI = `mongodb+srv://${MONGO_DB_USERNAME}:${MONGO_DB_PASSWORD}@dineas-cluster-01.oag08.mongodb.net`;

export const accessTokenSecret: string = process.env.ACCESS_TOKEN_SECRET || "";
export const refreshTokenSecret: string =
  process.env.REFRESH_TOKEN_SECRET || "";

export const accessTokenExpiration = "15m";
export const refreshTokenExpiration = "7d";

export const mailId = process.env.AUTH_MAIL_ID;
export const mailPassword = process.env.AUTH_MAIL_PASSWOERD;
  
export const clientOrigin = process.env.CLIENT_ORIGIN;

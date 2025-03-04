import Express, { Application, NextFunction } from "express";
import { errorHandler } from "./middleware/globelErrorHandler";
import cors from "cors";
import cookieParser from "cookie-parser";

import { apiConfig } from "./config/endpoint ";
import { CustomError } from "./lib/errors/customError";
import { HTTP_STATUS_CODE } from "./lib/constants/httpStatusCodes";
import { ERROR_TYPES } from "./lib/constants/errorType";
import { sendSuccessResponse } from "./lib/helpers/responseHelper";
import addressDetailsRoutes from "./routes/addressdetails/addressDetailsRoutes"
import authRoute from "./routes/auth/AuthRoute";
import kitchensRoute from "./routes/kitchen/kitchensRoutes";
import organizationRoute from "./routes/organization/organizationRoute";
import menuCategoryRoutes from "./routes/kitchen/categoryRoutes";
import menuSubCategoryRoutes from "./routes/kitchen/subcategoryRoutes";
import designationRoutes from "./routes/designation/designationRoutes";
import EmployeeManagementRoutes from "./routes/empmanagment/EmployeeManagementRoutes";
import OrgEmployeeManagementRoutes from "./routes/empmanagment/OrgEmployeeManagementRoutes";
import menuitemsRoutes from "./routes/menuitems/menuitemsRoutes";
import kitchensMenuRoutes from "./routes/kitchen/kitchensMenuRoutes";
import { clientOrigin } from "./config/environment";
import userLoginsRoutes from "./routes/auth/loginsRoute";
export const app: Application = Express();

app.use(Express.json());
app.use(Express.urlencoded({ extended: true }));
app.use(cookieParser());
app.use(
  cors({
    origin:clientOrigin,
    credentials: true,
  })
);

app.use(`${apiConfig.baseAPIUrl}/auth`, authRoute);
app.use(`${apiConfig.baseAPIUrl}/user`, userLoginsRoutes);
app.use(`${apiConfig.baseAPIUrl}/kitchens`, kitchensRoute);
app.use(`${apiConfig.baseAPIUrl}/menu-category`, menuCategoryRoutes);
app.use(`${apiConfig.baseAPIUrl}/sub-menu-category`, menuSubCategoryRoutes);
app.use(`${apiConfig.baseAPIUrl}/designation`, designationRoutes);
app.use(`${apiConfig.baseAPIUrl}/organization`, organizationRoute);
app.use(`${apiConfig.baseAPIUrl}/employee`, EmployeeManagementRoutes);
app.use(`${apiConfig.baseAPIUrl}/menu-items`, menuitemsRoutes);
app.use(`${apiConfig.baseAPIUrl}/orgemployee`, OrgEmployeeManagementRoutes);
app.use(`${apiConfig.baseAPIUrl}/kitchens-menu`, kitchensMenuRoutes);
app.use(`${apiConfig.baseAPIUrl}/menu-items`, menuitemsRoutes);
app.use(`${apiConfig.baseAPIUrl}/org-employee`, OrgEmployeeManagementRoutes);
app.use(`${apiConfig.baseAPIUrl}/menu-items`,menuitemsRoutes)
app.use(`${apiConfig.baseAPIUrl}/orgemployee`,OrgEmployeeManagementRoutes)
app.use(`${apiConfig.baseAPIUrl}/addressDetails`,addressDetailsRoutes)
app.use(`${apiConfig.baseAPIUrl}/org-employee`,OrgEmployeeManagementRoutes)
app.use(`${apiConfig.baseAPIUrl}/menu-items`, menuitemsRoutes);
app.use(`${apiConfig.baseAPIUrl}/orgemployee`, OrgEmployeeManagementRoutes);
app.use(`${apiConfig.baseAPIUrl}/kitchens-menu`, kitchensMenuRoutes);






app.get(`/`, (req, res) => {
  res.send(`
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Server Status</title>
      <style>
        body { font-family: Arial, sans-serif; text-align: center; padding: 50px; }
        .status { font-size: 24px; color: green; }
      </style>
    </head>
    <body>
      <h1 class="status">The server is up and running.</h1>
      <p>All systems are operational.</p>
    </body>
    </html>
  `);
});

// 404 Error handler for all non-existing routes
app.use("*", (req, res, next) => {
  throw new CustomError(
    `The page ${req.originalUrl} you requested does not exist.`,
    HTTP_STATUS_CODE.NOT_FOUND,
    ERROR_TYPES.BAD_REQUEST_ERROR,
    false
  );
});

app.use(errorHandler);

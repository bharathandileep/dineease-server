import { Request, Response } from "express";
import { ERROR_TYPES } from "../../lib/constants/errorType";
import { HTTP_STATUS_CODE } from "../../lib/constants/httpStatusCodes";
import { CustomError } from "../../lib/errors/customError";
import {
  sendErrorResponse,
  sendSuccessResponse,
} from "../../lib/helpers/responseHelper";
import MenuCategory from "../../models/items/MenuCategory";
import MenuSubcategory from "../../models/items/MenuSubcategory";
import mongoose from "mongoose";



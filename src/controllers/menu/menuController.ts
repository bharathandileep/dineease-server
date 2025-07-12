import { Request, Response } from "express";
import { CustomError } from "../../lib/errors/customError";
import { HTTP_STATUS_CODE } from "../../lib/constants/httpStatusCodes";
import { ERROR_TYPES } from "../../lib/constants/errorType";
import { uploadFileToCloudinary } from "../../lib/utils/cloudFileManager";
import MenuItem from "../../models/kitchen/MenuModel";
import {
  sendErrorResponse,
  sendSuccessResponse,
} from "../../lib/helpers/responseHelper";

export const createMenuItem = async (req: Request, res: Response) => {
  try {
    const {
      category,
      name,
      mealTypes,
      foodType,
      description,
      ingredients,
      basicprice,
      orgPirce,
      tags,
      addOns,
      kitchenId,
    } = req.body;

    const files = req.files as { [fieldname: string]: Express.Multer.File[] };

    if (!files?.image?.[0]) {
      throw new CustomError(
        "Image is required",
        HTTP_STATUS_CODE.BAD_REQUEST,
        ERROR_TYPES.BAD_REQUEST_ERROR,
        false
      );
    }

    const imageUrl = await uploadFileToCloudinary(files.image[0].buffer);

    // Basic validation
    if (!name || !category || !basicprice || !orgPirce || !foodType) {
      throw new CustomError(
        "Missing required fields",
        HTTP_STATUS_CODE.BAD_REQUEST,
        ERROR_TYPES.BAD_REQUEST_ERROR,
        false
      );
    }

    const existingItem = await MenuItem.findOne({ name, category });
    if (existingItem) {
      throw new CustomError(
        "Item already exists in this category",
        HTTP_STATUS_CODE.BAD_REQUEST,
        ERROR_TYPES.BAD_REQUEST_ERROR,
        false
      );
    }

    const newItem = new MenuItem({
      category,
      kitchen_id: kitchenId,
      name,
      mealTypes: JSON.parse(mealTypes),
      foodType,
      image: imageUrl,
      description,
      ingredients: JSON.parse(ingredients),
      basicprice: Number(basicprice),
      orgPirce: Number(orgPirce),
      tags: JSON.parse(tags),
      addOns: JSON.parse(addOns),
    });

    await newItem.save();

    sendSuccessResponse(
      res,
      "Menu item successfully send for review",
      null,
      HTTP_STATUS_CODE.CREATED
    );
  } catch (error) {
    console.error(error);
    sendErrorResponse(
      res,
      error,
      HTTP_STATUS_CODE.INTERNAL_SERVER_ERROR,
      ERROR_TYPES.INTERNAL_SERVER_ERROR_TYPE
    );
  }
};

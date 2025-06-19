import { Request, Response } from "express";
import Item, { IItem } from "../../models/items/ItemTableModel";
import { CustomError } from "../../lib/errors/customError";
import { HTTP_STATUS_CODE } from "../../lib/constants/httpStatusCodes";
import { ERROR_TYPES } from "../../lib/constants/errorType";
import {
  sendErrorResponse,
  sendSuccessResponse,
} from "../../lib/helpers/responseHelper";
import { uploadFileToCloudinary } from "../../lib/utils/cloudFileManager";
import mongoose from "mongoose";

export const createItem = async (req: Request, res: Response) => {
  try {
    const { item_name, category, subcategory, item_description } = req.body;
    const files = req.files as { [fieldname: string]: Express.Multer.File[] };
    const itemImageUrl = await uploadFileToCloudinary(
      files.item_image[0].buffer
    );

    if (!item_name || !category) {
      throw new CustomError(
        "Item name and category are required",
        HTTP_STATUS_CODE.BAD_REQUEST,
        ERROR_TYPES.BAD_REQUEST_ERROR,
        false
      );
    }

    const existingItem = await Item.findOne({ item_name, category });
    if (existingItem) {
      throw new CustomError(
        "Item already exists in this category",
        HTTP_STATUS_CODE.BAD_REQUEST,
        ERROR_TYPES.BAD_REQUEST_ERROR,
        false
      );
    }

    const newItem = new Item({
      item_name,
      category,
      subcategory,
      item_description,
      item_image: itemImageUrl,
      status: true,
    });

    await newItem.save();

    sendSuccessResponse(
      res,
      "Item created successfully",
      newItem,
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

export const listItems = async (req: Request, res: Response) => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 4;
    const skip = (page - 1) * limit;
    const { search, category, subcategory } = req.query;

    const matchQuery: any = { is_deleted: false };

    if (category) {
      matchQuery.category = new mongoose.Types.ObjectId(category as string);
    }
    if (subcategory) {
      matchQuery.subcategory = new mongoose.Types.ObjectId(
        subcategory as string
      );
    }

    if (search && typeof search === "string" && search.trim() !== "") {
      const searchRegex = new RegExp(search.trim(), "i");
      matchQuery.$or = [
        { item_name: { $regex: searchRegex } },
        { item_description: { $regex: searchRegex } },
      ];

      const categoryMatch = await mongoose
        .model("MenuCategory")
        .find({
          category: { $regex: searchRegex },
        })
        .select("_id");
      const categoryIds = categoryMatch.map((cat) => cat._id);
      if (categoryIds.length > 0) {
        matchQuery.$or.push({ category: { $in: categoryIds } });
      }

      const subcategoryMatch = await mongoose
        .model("MenuSubcategory")
        .find({
          subcategoryName: { $regex: searchRegex },
        })
        .select("_id");
      const subcategoryIds = subcategoryMatch.map((sub) => sub._id);
      if (subcategoryIds.length > 0) {
        matchQuery.$or.push({ subcategory: { $in: subcategoryIds } });
      }
    }

    const totalItems = await Item.countDocuments(matchQuery);
    const items = await Item.aggregate([
      { $match: matchQuery },
      { $sort: { createdAt: -1 } },
      {
        $lookup: {
          from: "menucategories",
          localField: "category",
          foreignField: "_id",
          as: "categoryInfo",
        },
      },
      {
        $lookup: {
          from: "menusubcategories",
          localField: "subcategory",
          foreignField: "_id",
          as: "subcategoryInfo",
        },
      },
      {
        $project: {
          _id: 1,
          item_name: 1,
          item_description: 1,
          item_image: 1,
          status: 1,
          slug: 1, // Include slug for routing
          category: {
            $cond: {
              if: { $gt: [{ $size: "$categoryInfo" }, 0] },
              then: {
                _id: { $arrayElemAt: ["$categoryInfo._id", 0] },
                category: { $arrayElemAt: ["$categoryInfo.category", 0] },
              },
              else: null,
            },
          },
          subcategory: {
            $cond: {
              if: { $gt: [{ $size: "$subcategoryInfo" }, 0] },
              then: {
                _id: { $arrayElemAt: ["$subcategoryInfo._id", 0] },
                subcategoryName: {
                  $arrayElemAt: ["$subcategoryInfo.subcategoryName", 0],
                },
              },
              else: null,
            },
          },
        },
      },
      { $skip: skip },
      { $limit: limit },
    ]);

    if (!items.length && page === 1) {
      throw new CustomError(
        "No items found",
        HTTP_STATUS_CODE.NOT_FOUND,
        ERROR_TYPES.NOT_FOUND_ERROR,
        false
      );
    }

    const hasMore = skip + limit < totalItems;
    sendSuccessResponse(
      res,
      "Items fetched successfully",
      {
        items,
        totalPages: Math.ceil(totalItems / limit),
        currentPage: page,
        totalItems,
        hasMore,
      },
      HTTP_STATUS_CODE.OK
    );
  } catch (error) {
    if (error instanceof CustomError) {
      sendErrorResponse(
        res,
        error,
        error.statusCode || HTTP_STATUS_CODE.INTERNAL_SERVER_ERROR,
        error.errorType || ERROR_TYPES.INTERNAL_SERVER_ERROR_TYPE
      );
    } else {
      sendErrorResponse(
        res,
        error,
        HTTP_STATUS_CODE.INTERNAL_SERVER_ERROR,
        ERROR_TYPES.INTERNAL_SERVER_ERROR_TYPE
      );
    }
  }
};

export const getItemById = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const item = await Item.findById(id)
      .populate("category", "category")
      .populate("subcategory", "subcategoryName");

    if (!item || item.is_deleted) {
      throw new CustomError(
        "Item not found",
        HTTP_STATUS_CODE.NOT_FOUND,
        ERROR_TYPES.NOT_FOUND_ERROR,
        false
      );
    }

    sendSuccessResponse(
      res,
      "Item fetched successfully",
      item,
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

export const updateItem = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const files = req.files as { [fieldname: string]: Express.Multer.File[] };
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return sendErrorResponse(
        res,
        "Invalid item ID",
        HTTP_STATUS_CODE.BAD_REQUEST,
        ERROR_TYPES.VALIDATION_ERROR
      );
    }

    const { item_name, category, subcategory, item_description } = req.body;
    const existingItem = await Item.findById(id);

    if (!existingItem) {
      return sendErrorResponse(
        res,
        "Item not found",
        HTTP_STATUS_CODE.NOT_FOUND,
        ERROR_TYPES.NOT_FOUND_ERROR
      );
    }

    const item_image = files?.item_image
      ? await uploadFileToCloudinary(files.item_image[0].buffer)
      : existingItem.item_image;

    const updatedItem = await Item.findByIdAndUpdate(
      id,
      { item_name, category, subcategory, item_description, item_image },
      { new: true, runValidators: true }
    );

    if (!updatedItem) {
      return sendErrorResponse(
        res,
        "Failed to update item",
        HTTP_STATUS_CODE.INTERNAL_SERVER_ERROR,
        ERROR_TYPES.INTERNAL_SERVER_ERROR_TYPE
      );
    }

    return sendSuccessResponse(
      res,
      "Item updated successfully",
      updatedItem,
      HTTP_STATUS_CODE.OK
    );
  } catch (error) {
    console.error("Error updating item:", error);
    return sendErrorResponse(
      res,
      "Internal server error",
      HTTP_STATUS_CODE.INTERNAL_SERVER_ERROR,
      ERROR_TYPES.INTERNAL_SERVER_ERROR_TYPE
    );
  }
};

export const deleteItem = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const existingItem = await Item.findById(id);
    if (!existingItem) {
      throw new CustomError(
        "Item not found",
        HTTP_STATUS_CODE.NOT_FOUND,
        ERROR_TYPES.NOT_FOUND_ERROR,
        false
      );
    }

    const deletedItem = await Item.findByIdAndUpdate(
      id,
      { is_deleted: true },
      { new: true }
    );

    sendSuccessResponse(
      res,
      "Item deleted successfully",
      deletedItem,
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

export const changeItemStatus = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const existingItem = await Item.findById(id);
    if (!existingItem) {
      throw new CustomError(
        "Item not found",
        HTTP_STATUS_CODE.NOT_FOUND,
        ERROR_TYPES.NOT_FOUND_ERROR,
        false
      );
    }

    const newStatus = req.body.status ?? !existingItem.status;

    const updatedItem = await Item.findByIdAndUpdate(
      id,
      { status: newStatus },
      { new: true }
    );

    sendSuccessResponse(
      res,
      "Item status updated successfully",
      updatedItem,
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

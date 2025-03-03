import { Request, Response } from "express";
import { CustomError } from "../../lib/errors/customError";
import { HTTP_STATUS_CODE } from "../../lib/constants/httpStatusCodes";
import { ERROR_TYPES } from "../../lib/constants/errorType";
import {
  sendErrorResponse,
  sendSuccessResponse,
} from "../../lib/helpers/responseHelper";
import { validateMogooseObjectId } from "../../lib/helpers/validateObjectid";
import kitchenSubcategory from "../../models/kitchen/KitchenSubCategorymodel";
import kitchenCategory from "../../models/kitchen/KitchenCategoryModel";

export const kitchenGetAllSubCategories = async (req: Request, res: Response) => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10;
    const startIndex = (page - 1) * limit;
    const total = await kitchenSubcategory.countDocuments({});
    
    const categories = await kitchenSubcategory.find()
      .populate("category", "category status") // Ensure status is included if needed
      .skip(startIndex)
      .limit(limit);

    const pagination = {
      currentPage: page,
      totalItems: total,
      totalPages: Math.ceil(total / limit),
      itemsPerPage: limit,
    };

    sendSuccessResponse(res, "Categories retrieved successfully", { categories, pagination }, HTTP_STATUS_CODE.OK);
  } catch (error) {
    sendErrorResponse(res, error, HTTP_STATUS_CODE.INTERNAL_SERVER_ERROR, ERROR_TYPES.INTERNAL_SERVER_ERROR_TYPE);
  }
};


// Create subcategory
export const kitchenCreateSubcategory = async (req: Request, res: Response) => {
  try {
    const { category, subcategoryName } = req.body;
    if (!category || !subcategoryName) {
      throw new CustomError(
        "Subcategory name and category are required",
        HTTP_STATUS_CODE.BAD_REQUEST,
        ERROR_TYPES.BAD_GATEWAY_ERROR,
        false
      );
    }

    const existingCategory = await kitchenCategory.findById(category);
    if (!existingCategory) {
      throw new CustomError(
        "Category not found",
        HTTP_STATUS_CODE.NOT_FOUND,
        ERROR_TYPES.NOT_FOUND_ERROR,
        false
      );
    }
    const existingSubcategory = await kitchenSubcategory.findOne({
      subcategoryName,
      category,
    });

    if (existingSubcategory) {
      throw new CustomError(
        "Subcategory already exists in this category",
        HTTP_STATUS_CODE.BAD_REQUEST,
        ERROR_TYPES.BAD_GATEWAY_ERROR,
        false
      );
    }

    const newSubcategory = new kitchenSubcategory({
      subcategoryName,
      category,
      status: true,
    });

    await newSubcategory.save();

    sendSuccessResponse(
      res,
      "Subcategory created successfully",
      newSubcategory,
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

// Get subcategories by category
export const kitchenGetSubcategoriesByCategory = async (
  req: Request,
  res: Response
) => {

  
  try {
    
    const { categoryId } = req.params;
    console.log(categoryId);
    
    validateMogooseObjectId(categoryId);

    const category = await kitchenCategory.findOne({
      _id: categoryId,
      status: true,
    });

    if (!category) {
      throw new CustomError(
        "Category not found or inactive",
        HTTP_STATUS_CODE.NOT_FOUND,
        ERROR_TYPES.NOT_FOUND_ERROR,
        false
      );
    }
    const subcategories = await kitchenSubcategory.find({
      category: categoryId,
      status: true,
    });

    sendSuccessResponse(
      res,
      "Subcategories retrieved successfully",
      subcategories,
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

// Update subcategory
export const kitchenUpdateSubcategory = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { subcategoryName, category } = req.body;

    const existingSubcategory = await kitchenSubcategory.findById(id);
    if (!existingSubcategory) {
      throw new CustomError(
        "Subcategory not found",
        HTTP_STATUS_CODE.NOT_FOUND,
        ERROR_TYPES.NOT_FOUND_ERROR,
        false
      );
    }

    if (category) {
      const categoryExists = await kitchenCategory.findById(category);
      if (!categoryExists) {
        throw new CustomError(
          "Category not found",
          HTTP_STATUS_CODE.NOT_FOUND,
          ERROR_TYPES.NOT_FOUND_ERROR,
          false
        );
      }
    }

    if (subcategoryName && category) {
      const duplicateSubcategory = await kitchenSubcategory.findOne({
        subcategoryName,
        category,
        _id: { $ne: id },
      });

      if (duplicateSubcategory) {
        throw new CustomError(
          "Subcategory name already exists in this category",
          HTTP_STATUS_CODE.BAD_REQUEST,
          ERROR_TYPES.BAD_GATEWAY_ERROR,
          false
        );
      }
    }

    const updatedSubcategory = await kitchenSubcategory
      .findByIdAndUpdate(id, { subcategoryName, category }, { new: true })
      .populate("category", "category status");

    sendSuccessResponse(
      res,
      "Subcategory updated successfully",
      updatedSubcategory,
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

export const kitchenToggleSubcategoryStatus = async (
  req: Request,
  res: Response
) => {
  try {
    const { id } = req.params;
    const subcategory = await kitchenSubcategory.findById(id).populate<{
      category: any;
    }>("category", "category status");

    if (!subcategory) {
      throw new CustomError(
        "Subcategory not found",
        HTTP_STATUS_CODE.NOT_FOUND,
        ERROR_TYPES.NOT_FOUND_ERROR,
        false
      );
    }

    const newStatus = !subcategory.status;
    if (newStatus && !subcategory.category.status) {
      throw new CustomError(
        "Cannot activate subcategory when parent category is inactive",
        HTTP_STATUS_CODE.BAD_REQUEST,
        ERROR_TYPES.VALIDATION_ERROR,
        false
      );
    }

    const updatedSubcategory = await kitchenSubcategory
      .findByIdAndUpdate(id, { status: newStatus }, { new: true })
      .populate<{ category: any }>("category", "category status");

    sendSuccessResponse(
      res,
      `Subcategory status ${
        updatedSubcategory?.status ? "activated" : "deactivated"
      } successfully`,
      updatedSubcategory,
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
// Delete subcategory
export const kitchenDeleteSubcategory = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const subcategory = await kitchenSubcategory.findById(id);
    if (!subcategory) {
      throw new CustomError(
        "Subcategory not found",
        HTTP_STATUS_CODE.NOT_FOUND,
        ERROR_TYPES.NOT_FOUND_ERROR,
        false
      );
    }

    await kitchenSubcategory.findByIdAndDelete(id);

    sendSuccessResponse(
      res,
      "Subcategory deleted successfully",
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


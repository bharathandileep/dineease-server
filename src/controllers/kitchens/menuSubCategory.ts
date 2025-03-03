import { Request, Response } from "express";
import { CustomError } from "../../lib/errors/customError";
import { HTTP_STATUS_CODE } from "../../lib/constants/httpStatusCodes";
import { ERROR_TYPES } from "../../lib/constants/errorType";
import MenuCategory from "../../models/items/MenuCategory";
import MenuSubcategory from "../../models/items/MenuSubcategory";
import {
  sendErrorResponse,
  sendSuccessResponse,
} from "../../lib/helpers/responseHelper";
import { validateMogooseObjectId } from "../../lib/helpers/validateObjectid";



export const getAllSubCategories = async (req: Request, res: Response) => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10;
    const search = (req.query.search as string)?.trim() || '';
    const status = req.query.status as string;
    const startIndex = (page - 1) * limit;

    // Build query object
    const query: any = {};
    if (search) {
      query.subcategoryName = { $regex: search, $options: "i" }; // Case-insensitive search on subcategoryName
    }
    if (status && status !== "all") {
      query.status = status === "active" ? true : false; // Boolean status filter
    }

  

    const total = await MenuSubcategory.countDocuments(query);
    const categories = await MenuSubcategory.find(query)
      .populate("category", "category status") // Populate category details
      .skip(startIndex)
      .limit(limit)
      .sort({ createdAt: -1 });

    console.log("Fetched Subcategories:", categories);

    const pagination = {
      currentPage: page,
      totalItems: total,
      totalPages: Math.ceil(total / limit),
      itemsPerPage: limit,
    };

    sendSuccessResponse(
      res,
      "Subcategories retrieved successfully",
      { categories, pagination },
      HTTP_STATUS_CODE.OK
    );
  } catch (error) {
    console.error("Backend error:", error);
    sendErrorResponse(
      res,
      error,
      HTTP_STATUS_CODE.INTERNAL_SERVER_ERROR,
      ERROR_TYPES.INTERNAL_SERVER_ERROR_TYPE
    );
  }
};

// Create subcategory
export const createSubcategory = async (req: Request, res: Response) => {
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

    const existingCategory = await MenuCategory.findById(category);
    if (!existingCategory) {
      throw new CustomError(
        "Category not found",
        HTTP_STATUS_CODE.NOT_FOUND,
        ERROR_TYPES.NOT_FOUND_ERROR,
        false
      );
    }
    const existingSubcategory = await MenuSubcategory.findOne({
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

    const newSubcategory = new MenuSubcategory({
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
export const getSubcategoriesByCategory = async (
  req: Request,
  res: Response
) => {
  try {
    const { categoryId } = req.params;
    validateMogooseObjectId(categoryId);

    const category = await MenuCategory.findOne({
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
    const subcategories = await MenuSubcategory.find({
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
export const updateSubcategory = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { subcategoryName, category } = req.body;

    const existingSubcategory = await MenuSubcategory.findById(id);
    if (!existingSubcategory) {
      throw new CustomError(
        "Subcategory not found",
        HTTP_STATUS_CODE.NOT_FOUND,
        ERROR_TYPES.NOT_FOUND_ERROR,
        false
      );
    }

    if (category) {
      const categoryExists = await MenuCategory.findById(category);
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
      const duplicateSubcategory = await MenuSubcategory.findOne({
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

    const updatedSubcategory = await MenuSubcategory.findByIdAndUpdate(
      id,
      { subcategoryName, category },
      { new: true }
    ).populate("category", "category status");

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


export const toggleSubcategoryStatus = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    console.log(id)
    const subcategory = await MenuSubcategory.findById(id).populate<{
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

    const updatedSubcategory = await MenuSubcategory.findByIdAndUpdate(
      id,
      { status: !subcategory.status },
      { new: true }
    ).populate("category", "category status");

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

export const deleteSubcategory = async (req: Request, res: Response) => {
  try {
    const { id } = req.params; 

    const subcategory = await MenuSubcategory.findById(id);
    if (!subcategory) {
      throw new CustomError(
        "Subcategory not found",
        HTTP_STATUS_CODE.NOT_FOUND,
        ERROR_TYPES.NOT_FOUND_ERROR,
        false
      );
    }

    await MenuSubcategory.findByIdAndDelete(id);

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

// Get all categories
export const getAllCategoriesByStatus = async (req: Request, res: Response) => {
  try {
    const categories = await MenuCategory.find({ status: true });
    sendSuccessResponse(
      res,
      "Categories retrieved successfully",
      categories,
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

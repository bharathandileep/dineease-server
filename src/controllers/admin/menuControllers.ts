import { Request, Response } from "express";
import { ERROR_TYPES } from "../../lib/constants/errorType";
import { HTTP_STATUS_CODE } from "../../lib/constants/httpStatusCodes";
import {
  sendErrorResponse,
  sendSuccessResponse,
} from "../../lib/helpers/responseHelper";
import Tag from "../../models/items/TagsModel";
import { CustomError } from "../../lib/errors/customError";
import MenuCategory from "../../models/items/MenuCategory";
import mongoose from "mongoose";
import MenuSubcategory from "../../models/items/MenuSubcategory";
import { validateMogooseObjectId } from "../../lib/helpers/validateObjectid";

//--------menutags-------------
export const createNewTags = async (req: Request, res: Response) => {
  try {
    const tags: string[] = req.body;

    if (!Array.isArray(tags) || tags.length === 0) {
      return sendErrorResponse(
        res,
        "Invalid tag list",
        HTTP_STATUS_CODE.BAD_REQUEST,
        ERROR_TYPES.BAD_REQUEST_ERROR
      );
    }
    const normalizedTags = tags
      .map((tag) => tag.trim().toLowerCase())
      .filter((tag) => tag.length > 0);
    const uniqueTags = [...new Set(normalizedTags)];

    const existingTags = await Tag.find({ name: { $in: uniqueTags } }).select(
      "name"
    );

    const existingNames = new Set(existingTags.map((tag) => tag.name));
    const tagsToInsert = uniqueTags
      .filter((tag) => !existingNames.has(tag))
      .map((tag) => ({
        name: tag,
        is_active: true,
        is_deleted: false,
      }));

    if (tagsToInsert.length === 0) {
      throw new CustomError(
        "No new tags to create ,tags already present",
        HTTP_STATUS_CODE.BAD_REQUEST,
        ERROR_TYPES.BAD_REQUEST_ERROR,
        false
      );
    }
    await Tag.insertMany(tagsToInsert);

    sendSuccessResponse(res, "Tags created successfully", HTTP_STATUS_CODE.OK);
  } catch (error) {
    sendErrorResponse(
      res,
      error,
      HTTP_STATUS_CODE.INTERNAL_SERVER_ERROR,
      ERROR_TYPES.INTERNAL_SERVER_ERROR_TYPE
    );
  }
};
export const getAllTags = async (req: Request, res: Response) => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10;
    const search = (req.query.search as string)?.trim() || "";
    const status = req.query.status as string;

    const query: any = { is_deleted: false };

    if (search) {
      query.name = { $regex: search, $options: "i" };
    }

    if (status && status !== "all") {
      query.is_active = status === "active";
    }

    const total = await Tag.countDocuments(query);
    const tags = await Tag.find(query)
      .skip((page - 1) * limit)
      .limit(limit)
      .sort({ created_at: -1 });

    const pagination = {
      currentPage: page,
      totalItems: total,
      totalPages: Math.ceil(total / limit),
      itemsPerPage: limit,
    };

    sendSuccessResponse(
      res,
      "Tags retrieved successfully",
      { tags, pagination },
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
export const toggleTagStatus = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const tag = await Tag.findById(id);
    if (!tag) {
      throw new CustomError(
        "Tag not found",
        HTTP_STATUS_CODE.NOT_FOUND,
        ERROR_TYPES.NOT_FOUND_ERROR,
        false
      );
    }

    tag.is_active = !tag.is_active;
    tag.updated_at = new Date();
    await tag.save();

    sendSuccessResponse(
      res,
      `Tag ${tag.is_active ? "activated" : "deactivated"} successfully`,
      tag,
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
export const updateTag = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { name } = req.body;
    const tag = await Tag.findById(id);
    if (!tag) {
      throw new CustomError(
        "Tag not found",
        HTTP_STATUS_CODE.NOT_FOUND,
        ERROR_TYPES.NOT_FOUND_ERROR,
        false
      );
    }

    if (name && name.toLowerCase() !== tag.name.toLowerCase()) {
      const duplicate = await Tag.findOne({
        name: { $regex: `^${name}$`, $options: "i" },
        _id: { $ne: id },
      });
      if (duplicate) {
        throw new CustomError(
          "Tag with this name already exists",
          HTTP_STATUS_CODE.BAD_REQUEST,
          ERROR_TYPES.BAD_REQUEST_ERROR,
          false
        );
      }
    }

    tag.name = name || tag.name;
    tag.updated_at = new Date();

    await tag.save();

    sendSuccessResponse(
      res,
      "Tag updated successfully",
      tag,
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
export const deleteTag = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const tag = await Tag.findById(id);
    if (!tag) {
      throw new CustomError(
        "Tag not found",
        HTTP_STATUS_CODE.NOT_FOUND,
        ERROR_TYPES.NOT_FOUND_ERROR,
        false
      );
    }

    tag.is_deleted = true;
    tag.updated_at = new Date();
    await tag.save();

    sendSuccessResponse(
      res,
      "Tag deleted successfully",
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

//--------- menu category---------

export const createCategory = async (req: Request, res: Response) => {
  try {
    const { category } = req.body;
    if (!category) {
      throw new CustomError(
        "Category name is required",
        HTTP_STATUS_CODE.BAD_REQUEST,
        ERROR_TYPES.BAD_GATEWAY_ERROR,
        false
      );
    }
    const existingCategory = await MenuCategory.findOne({ category });
    if (existingCategory) {
      throw new CustomError(
        "Category already exists",
        HTTP_STATUS_CODE.BAD_REQUEST,
        ERROR_TYPES.BAD_GATEWAY_ERROR,
        false
      );
    }

    const newCategory = new MenuCategory({
      category,
      status: true,
    });

    await newCategory.save();

    sendSuccessResponse(
      res,
      "Category created successfully",
      newCategory,
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

export const getAllCategories = async (req: Request, res: Response) => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10;
    const search = (req.query.search as string)?.trim() || "";
    const status = req.query.status as string;

    // Build query object
    const query: any = {};
    if (search) {
      query.category = { $regex: search, $options: "i" };
    }
    if (status && status !== "all") {
      query.status = status === "active" ? true : false;
    }

    const total = await MenuCategory.countDocuments(query);
    const categories = await MenuCategory.find(query)
      .skip((page - 1) * limit)
      .limit(limit)
      .sort({ createdAt: -1 });

    const pagination = {
      currentPage: page,
      totalItems: total,
      totalPages: Math.ceil(total / limit),
      itemsPerPage: limit,
    };

    sendSuccessResponse(
      res,
      "Categories retrieved successfully",
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

export const toggleCategoryStatus = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const category = await MenuCategory.findById(id);
    if (!category) {
      throw new CustomError(
        "Category not found",
        HTTP_STATUS_CODE.NOT_FOUND,
        ERROR_TYPES.NOT_FOUND_ERROR,
        false
      );
    }

    const newStatus = !category.status;
    const session = await mongoose.startSession();
    let updatedCategory;

    await session.withTransaction(async () => {
      updatedCategory = await MenuCategory.findByIdAndUpdate(
        id,
        { status: newStatus },
        { new: true, session }
      );
      await MenuSubcategory.updateMany(
        { category: id },
        { status: newStatus },
        { session }
      );
    });

    await session.endSession();
    const updatedSubcategoriesCount = await MenuSubcategory.countDocuments({
      category: id,
    });

    sendSuccessResponse(
      res,
      `Category and ${updatedSubcategoriesCount} subcategories ${
        newStatus ? "activated" : "deactivated"
      } successfully`,
      updatedCategory,
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

export const updateCategory = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { category } = req.body;
    const existingCategory = await MenuCategory.findById(id);
    if (!existingCategory) {
      throw new CustomError(
        "Category not found",
        HTTP_STATUS_CODE.NOT_FOUND,
        ERROR_TYPES.NOT_FOUND_ERROR,
        false
      );
    }

    if (category) {
      const duplicateCategory = await MenuCategory.findOne({
        category,
        _id: { $ne: id },
      });

      if (duplicateCategory) {
        throw new CustomError(
          "Category name already exists",
          HTTP_STATUS_CODE.BAD_REQUEST,
          ERROR_TYPES.BAD_GATEWAY_ERROR,
          false
        );
      }
    }

    const updatedCategory = await MenuCategory.findByIdAndUpdate(
      id,
      { category },
      { new: true }
    );

    sendSuccessResponse(
      res,
      "Category updated successfully",
      updatedCategory,
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
export const deleteCategory = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const category = await MenuCategory.findById(id);
    if (!category) {
      throw new CustomError(
        "Category not found",
        HTTP_STATUS_CODE.NOT_FOUND,
        ERROR_TYPES.NOT_FOUND_ERROR,
        false
      );
    }

    await MenuCategory.findByIdAndDelete(id);

    sendSuccessResponse(
      res,
      "Category deleted successfully",
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

//-------- menu sub category --------

export const getAllSubCategories = async (req: Request, res: Response) => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10;
    const search = (req.query.search as string)?.trim() || "";
    const status = req.query.status as string;
    const startIndex = (page - 1) * limit;

    // Build query object
    const query: any = {};
    if (search) {
      query.subcategoryName = { $regex: search, $options: "i" };
    }
    if (status && status !== "all") {
      query.status = status === "active" ? true : false;
    }

    const total = await MenuSubcategory.countDocuments(query);
    const categories = await MenuSubcategory.find(query)
      .populate("category", "category status")
      .skip(startIndex)
      .limit(limit)
      .sort({ createdAt: -1 });

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

import { Request, Response } from 'express';
import Item, { IItem } from '../../models/items/ItemTableModel';
import { CustomError } from '../../lib/errors/customError';
import { HTTP_STATUS_CODE } from '../../lib/constants/httpStatusCodes';
import { ERROR_TYPES } from '../../lib/constants/errorType';
import { sendErrorResponse, sendSuccessResponse } from '../../lib/helpers/responseHelper';
import { uploadFileToCloudinary } from '../../lib/utils/cloudFileManager';
import mongoose from 'mongoose';


export const createItem = async (req: Request, res: Response) => {
    try {
      const { item_name, category, subcategory, item_description} =
        req.body;
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
        item_image:itemImageUrl,
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
      
      const items = await Item.find({ is_deleted: false })
      .populate("category", "category") 
      .populate("subcategory", "subcategoryName"); 
      
  
      if (!items.length) {
        throw new CustomError(
          "No items found",
          HTTP_STATUS_CODE.NOT_FOUND,
          ERROR_TYPES.NOT_FOUND_ERROR,
          false
        );
      }
  
      
      sendSuccessResponse(
        res,
        "Items fetched successfully",
        items,
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

        sendSuccessResponse(res, "Item fetched successfully", item, HTTP_STATUS_CODE.OK);
    } catch (error) {
        sendErrorResponse(res, error, HTTP_STATUS_CODE.INTERNAL_SERVER_ERROR, ERROR_TYPES.INTERNAL_SERVER_ERROR_TYPE);
    }
};



export const updateItem = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const files = req.files as { [fieldname: string]: Express.Multer.File[] };
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return sendErrorResponse(res, "Invalid item ID", HTTP_STATUS_CODE.BAD_REQUEST, ERROR_TYPES.VALIDATION_ERROR);
    }

    const { item_name, category, subcategory, item_description } = req.body;
    const existingItem = await Item.findById(id);

    if (!existingItem) {
      return sendErrorResponse(res, "Item not found", HTTP_STATUS_CODE.NOT_FOUND, ERROR_TYPES.NOT_FOUND_ERROR);
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
      return sendErrorResponse(res, "Failed to update item", HTTP_STATUS_CODE.INTERNAL_SERVER_ERROR, ERROR_TYPES.INTERNAL_SERVER_ERROR_TYPE);
    }

    return sendSuccessResponse(res, "Item updated successfully", updatedItem, HTTP_STATUS_CODE.OK);
  } catch (error) {
    console.error("Error updating item:", error);
    return sendErrorResponse(res, "Internal server error", HTTP_STATUS_CODE.INTERNAL_SERVER_ERROR, ERROR_TYPES.INTERNAL_SERVER_ERROR_TYPE);
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

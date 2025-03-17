import { Request, Response } from "express";
import mongoose from "mongoose";
import { CustomError } from "../../lib/errors/customError";
import { HTTP_STATUS_CODE } from "../../lib/constants/httpStatusCodes";
import { ERROR_TYPES } from "../../lib/constants/errorType";
import Kitchen from "../../models/kitchen/KitchenModel";
import Item from "../../models/items/ItemTableModel";
import Menu from "../../models/items/MenuModel";
import {
  sendErrorResponse,
  sendSuccessResponse,
} from "../../lib/helpers/responseHelper";
import { uploadFileToCloudinary } from "../../lib/utils/cloudFileManager";
import { Console } from "console";



export const addMenuItems = async (req: Request, res: Response) => {
  try {
    const kitchen_id = req.params.id;
    const items = req.body;
    if (!kitchen_id || !Array.isArray(items) || items.length === 0) {
      throw new CustomError(
        "Kitchen ID and at least one item are required",
        HTTP_STATUS_CODE.BAD_REQUEST,
        ERROR_TYPES.BAD_GATEWAY_ERROR,
        false
      );
    }

    const existingKitchen = await Kitchen.findById(kitchen_id);
    if (!existingKitchen) {
      throw new CustomError(
        "Kitchen not found",
        HTTP_STATUS_CODE.NOT_FOUND,
        ERROR_TYPES.NOT_FOUND_ERROR,
        false
      );
    }

    let existingMenu = await Menu.findOne({ kitchen_id, is_deleted: false });

    if (!existingMenu) {
      existingMenu = new Menu({
        kitchen_id,
        items_id: [],
        is_deleted: false,
        menu_image: "", // Default value for menu_image
        delivery_time: 0, // Default value for delivery_time
        reviews_id: [], // Default value for reviews_id
      });
    }

    for (const item of items) {
      const { itemId, image, description, name, price_user, price_organization, ingredients } = item;

      if (!itemId) {
        throw new CustomError(
          "Each item must have an itemId",
          HTTP_STATUS_CODE.BAD_REQUEST,
          ERROR_TYPES.BAD_GATEWAY_ERROR,
          false
        );
      }

      const existingItem = await Item.findById(itemId);
      if (!existingItem) {
        throw new CustomError(
          `Item not found: ${itemId}`,
          HTTP_STATUS_CODE.NOT_FOUND,
          ERROR_TYPES.NOT_FOUND_ERROR,
          false
        );
      }

      const itemExists = existingMenu.items_id.some(
        (menuItem) => menuItem.item_id.toString() === itemId
      );

      if (!itemExists) {
        existingMenu.items_id.push({
          item_id: new mongoose.Types.ObjectId(itemId),
          item_name: name,
          custom_image: image,
          isAvailable: true,
          description,
          ingredients: ingredients || [],
          price_user: price_user || 0, 
          price_organization: price_organization || 0, 
          reviews_id: [], 
        });
      }
    }

    await existingMenu.save();

    return sendSuccessResponse(
      res,
      "Items added to menu successfully",
      existingMenu,
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

export const getAllMenus = async (req: Request, res: Response) => {
  try {
    const { kitchenId } = req.params;
    if (!mongoose.Types.ObjectId.isValid(kitchenId)) {
      return sendErrorResponse(
        res,
        new Error("Invalid kitchen ID format"),
        HTTP_STATUS_CODE.BAD_REQUEST,
        ERROR_TYPES.BAD_REQUEST_ERROR
      );
    }

    const menus = await Menu.find({
      kitchen_id: kitchenId,
      is_deleted: false,
    })
      .populate({
        path: "kitchen_id",
        select: "_id name location contact_details",
      })
      .populate({
        path: "items_id.item_id",
        select:
          "item_name item_description category subcategory status item_image",
        populate: [
          {
            path: "category",
            select: "category",
            model: "MenuCategory",
          },
          {
            path: "subcategory",
            select: "subcategory",
            model: "MenuSubcategory",
          },
        ],
      });

    if (!menus || menus.length === 0) {
      sendSuccessResponse(
        res,
        "No menus found for this kitchen",
        [],
        HTTP_STATUS_CODE.OK
      );
    }

    const timestamp = new Date().toISOString();

    res.status(HTTP_STATUS_CODE.OK).json({
      status: true,
      message: "Menus retrieved successfully",
      data: menus,
      statusCode: HTTP_STATUS_CODE.OK,
      timestamp,
    });
  } catch (error) {
    sendErrorResponse(
      res,
      error,
      HTTP_STATUS_CODE.INTERNAL_SERVER_ERROR,
      ERROR_TYPES.INTERNAL_SERVER_ERROR_TYPE
    );
  }
};

export const removeMenuItem = async (req: Request, res: Response) => {
  try {
    const { kitchen_id, item_id } = req.params;

    if (!kitchen_id || !item_id) {
      throw new CustomError(
        "Kitchen ID and Item ID are required",
        HTTP_STATUS_CODE.BAD_REQUEST,
        ERROR_TYPES.BAD_REQUEST_ERROR,
        false
      );
    }

    // Find the menu for the given kitchen
    const existingMenu = await Menu.findOne({ kitchen_id, is_deleted: false });

    if (!existingMenu) {
      throw new CustomError(
        "Menu not found for the given kitchen",
        HTTP_STATUS_CODE.NOT_FOUND,
        ERROR_TYPES.NOT_FOUND_ERROR,
        false
      );
    }

    // Filter out the item to remove it
    const updatedItems = existingMenu.items_id.filter(
      (menuItem) => menuItem.item_id.toString() !== item_id
    );

    // If no changes, item was not found in menu
    if (updatedItems.length === existingMenu.items_id.length) {
      throw new CustomError(
        "Item not found in the menu",
        HTTP_STATUS_CODE.NOT_FOUND,
        ERROR_TYPES.NOT_FOUND_ERROR,
        false
      );
    }

    // Update the menu items
    existingMenu.items_id = updatedItems;

    // Save the updated menu
    await existingMenu.save();

    return sendSuccessResponse(
      res,
      "Item removed from menu successfully",
      existingMenu,
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

export const getMenuItemDetails = async (req: Request, res: Response) => {
  try {
    const { kitchenId, itemId } = req.params;
    if (
      !mongoose.Types.ObjectId.isValid(kitchenId) ||
      !mongoose.Types.ObjectId.isValid(itemId)
    ) {
      return sendErrorResponse(
        res,
        new Error("Invalid kitchen ID or item ID format"),
        HTTP_STATUS_CODE.BAD_REQUEST,
        ERROR_TYPES.BAD_REQUEST_ERROR
      );
    }

    const menuItem = await Menu.findOne(
      {
        kitchen_id: kitchenId,
        is_deleted: false,
        "items_id.item_id": itemId,
      },
      {
        "items_id.$": 1,
      }
    ).lean();

    if (!menuItem || !menuItem.items_id[0]) {
      return sendErrorResponse(
        res,
        new Error("Item not found in the kitchen's menu"),
        HTTP_STATUS_CODE.NOT_FOUND,
        ERROR_TYPES.NOT_FOUND_ERROR
      );
    }

    // Extract the item details
    const itemDetails = menuItem.items_id[0];

    res.status(HTTP_STATUS_CODE.OK).json({
      status: true,
      message: "Item details retrieved successfully",
      data: {
        item_id: itemDetails.item_id,
        //item_price: itemDetails.item_price,
        item_name: itemDetails.item_name,
        isAvailable: itemDetails.isAvailable,
        price_user:itemDetails.price_user,
        price_organization:itemDetails.price_organization,
        description: itemDetails.description,
        ingredients: itemDetails.ingredients,
        custom_image: itemDetails.custom_image,
        reviews_id: itemDetails.reviews_id,
      },
      statusCode: HTTP_STATUS_CODE.OK,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    return sendErrorResponse(
      res,
      error,
      HTTP_STATUS_CODE.INTERNAL_SERVER_ERROR,
      ERROR_TYPES.INTERNAL_SERVER_ERROR_TYPE
    );
  }
};

export const updateMenuItem = async (req: Request, res: Response) => {
  try {
    const { kitchenId, itemId } = req.params;
    const updatedItemData = req.body;
    const files = req.files as { [fieldname: string]: Express.Multer.File[] };
    let custom_image = updatedItemData.custom_image;
   
    if (files?.custom_image?.[0]) {
      custom_image = await uploadFileToCloudinary(files.custom_image[0].buffer);
    }

    if (!kitchenId || !itemId || !updatedItemData) {
      throw new CustomError(
        "Kitchen ID, Item ID, and updated item data are required",
        HTTP_STATUS_CODE.BAD_REQUEST,
        ERROR_TYPES.BAD_REQUEST_ERROR,
        false
      );
    }

    const existingKitchen = await Kitchen.findById(kitchenId);
    if (!existingKitchen) {
      throw new CustomError(
        "Kitchen not found",
        HTTP_STATUS_CODE.NOT_FOUND,
        ERROR_TYPES.NOT_FOUND_ERROR,
        false
      );
    }

    const existingMenu = await Menu.findOne({
      kitchen_id: kitchenId,
      is_deleted: false,
    });

    if (!existingMenu) {
      throw new CustomError(
        "Menu not found for this kitchen",
        HTTP_STATUS_CODE.NOT_FOUND,
        ERROR_TYPES.NOT_FOUND_ERROR,
        false
      );
    }
    const itemIndex = existingMenu.items_id.findIndex(
      (menuItem) => menuItem.item_id.toString() === itemId
    );

    if (itemIndex === -1) {
      throw new CustomError(
        "Item not found in the menu",
        HTTP_STATUS_CODE.NOT_FOUND,
        ERROR_TYPES.NOT_FOUND_ERROR,
        false
      );
    }

    const updatedIngredients =
      updatedItemData.ingredients ||
      existingMenu.items_id[itemIndex].ingredients;

    existingMenu.items_id[itemIndex] = {
      ...existingMenu.items_id[itemIndex],
      ...updatedItemData,
      custom_image,
      ingredients: updatedIngredients,
    };

    await existingMenu.save();

    return sendSuccessResponse(
      res,
      "Item updated successfully",
      existingMenu,
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

// export const getMenuItemsByKitchen = async (req: Request, res: Response) => {
//   try {
//     const { kitchenId } = req.params;
    
//     // Validate kitchen ID
//     if (!mongoose.Types.ObjectId.isValid(kitchenId)) {
//       return sendErrorResponse(
//         res,
//         new Error("Invalid kitchen ID format"),
//         HTTP_STATUS_CODE.BAD_REQUEST,
//         ERROR_TYPES.BAD_REQUEST_ERROR
//       );
//     }

//    const menu = await Menu.findOne({
//       kitchen_id: new mongoose.Types.ObjectId(kitchenId),
//       is_deleted: false,
//     })
//       .populate({
//         path: "items_id.item_id",
//         select: "item_name item_price description ingredients isAvailable custom_image reviews_id",
//       })
//       .lean();

//     if (!menu) {
//       return sendSuccessResponse(
//         res,
//         "No menu found for this kitchen",
//         [],
//         HTTP_STATUS_CODE.OK
//       );
//     }
//    res.status(HTTP_STATUS_CODE.OK).json({
//       status: true,
//       message: "Menu items retrieved successfully",
//       data: {
//         _id: menu._id,
//         kitchen_id: menu.kitchen_id,
//         items_id: menu.items_id, 
//         is_deleted: menu.is_deleted,
//         createdAt: menu.createdAt,
//         updatedAt: menu.updatedAt,
//         __v: menu.__v,
//       },
//       statusCode: HTTP_STATUS_CODE.OK,
//       timestamp: new Date().toISOString(),
//     });
//   } catch (error) {
//     return sendErrorResponse(
//       res,
//       error,
//       HTTP_STATUS_CODE.INTERNAL_SERVER_ERROR,
//       ERROR_TYPES.INTERNAL_SERVER_ERROR_TYPE
//     );
//   }
// };



export const getMenuItemsByKitchen = async (req: Request, res: Response) => {
  try {
    const { kitchenId } = req.params;
    
    // Validate kitchen ID
    if (!mongoose.Types.ObjectId.isValid(kitchenId)) {
      return sendErrorResponse(
        res,
        new Error("Invalid kitchen ID format"),
        HTTP_STATUS_CODE.BAD_REQUEST,
        ERROR_TYPES.BAD_REQUEST_ERROR
      );
    }

   
    const userType = (req as any).user?.type || 'User'; 

    const menu = await Menu.findOne({
      kitchen_id: new mongoose.Types.ObjectId(kitchenId),
      is_deleted: false,
    })
      .populate({
        path: "items_id.item_id",
        select: "item_name item_price description ingredients isAvailable custom_image reviews_id",
      })
      .lean();

    if (!menu) {
      return sendSuccessResponse(
        res,
        "No menu found for this kitchen",
        [],
        HTTP_STATUS_CODE.OK
      );
    }

    // Transform the items to include only the relevant price based on user type
    const transformedItems = menu.items_id.map(item => {
      const price = userType === 'Organization' ? item.price_organization : item.price_user;
      
      return {
        ...item,
        display_price: price, // Add a new field that contains the appropriate price
        price_user: undefined,
        price_organization: undefined
      };
    });
    
    res.status(HTTP_STATUS_CODE.OK).json({
      status: true,
      message: "Menu items retrieved successfully",
      data: {
        _id: menu._id,
        kitchen_id: menu.kitchen_id,
        items_id: transformedItems, // Use the transformed items
        is_deleted: menu.is_deleted,
        createdAt: menu.createdAt,
        updatedAt: menu.updatedAt,
        __v: menu.__v,
      },
      statusCode: HTTP_STATUS_CODE.OK,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    return sendErrorResponse(
      res,
      error,
      HTTP_STATUS_CODE.INTERNAL_SERVER_ERROR,
      ERROR_TYPES.INTERNAL_SERVER_ERROR_TYPE
    );
  }
};



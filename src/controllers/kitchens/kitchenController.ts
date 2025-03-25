import { query, Request, Response } from "express";
import {
  sendErrorResponse,
  sendSuccessResponse,
} from "../../lib/helpers/responseHelper";
import { HTTP_STATUS_CODE } from "../../lib/constants/httpStatusCodes";
import { ERROR_TYPES } from "../../lib/constants/errorType";
import Kitchen from "../../models/kitchen/KitchenModel";
import mongoose from "mongoose";
import { CustomError } from "../../lib/errors/customError";
import {
  createAddressAndUpdateModel,
  updateAddress,
} from "../../lib/helpers/addressUpdater";
import PanCardDetails from "../../models/documentations/PanModel";
import GstCertificateDetails from "../../models/documentations/GstModel";
import FssaiCertificateDetails from "../../models/documentations/FfsaiModel";
import { validateMogooseObjectId } from "../../lib/helpers/validateObjectid";
import { uploadFileToCloudinary } from "../../lib/utils/cloudFileManager";
import { generateKitchenNotification } from "../notification/notificationController";
import User from "../../models/users/UserModel";

import Address from "../../models/address/AddressModel";

const validateKitchenDetails = (data: any) => {
  const errors: { field: string; message: string }[] = [];
  if (!data.pan_card_number) {
    errors.push({
      field: "pan_card_number",
      message: "PAN card number is required.",
    });
  } else if (!/^[A-Z]{5}[0-9]{4}[A-Z]{1}$/.test(data.pan_card_number)) {
    errors.push({
      field: "pan_card_number",
      message: "Invalid PAN card number.",
    });
  }
  if (!data.pan_card_user_name) {
    errors.push({
      field: "pan_card_user_name",
      message: "PAN card user name is required.",
    });
  }
  // GST Validation
  if (!data.gst_number) {
    errors.push({ field: "gst_number", message: "GST number is required." });
  } else if (
    !/^\d{2}[A-Z]{5}\d{4}[A-Z]{1}[A-Z\d]{1}[Z]{1}[A-Z\d]{1}$/.test(
      data.gst_number
    )
  ) {
    errors.push({ field: "gst_number", message: "Invalid GST number." });
  }

  if (!data.gst_expiry_date) {
    errors.push({
      field: "gst_expiry_date",
      message: "GST expiry date is required.",
    });
  }

  if (!data.ffsai_certificate_number) {
    errors.push({
      field: "ffsai_certificate_number",
      message: "FSSAI certificate number is required.",
    });
  } else if (!/^1\d{13}$/.test(data.ffsai_certificate_number)) {
    errors.push({
      field: "ffsai_certificate_number",
      message: "Invalid FSSAI number. It must be 14 digits and start with '1'.",
    });
  }

  if (!data.ffsai_card_owner_name) {
    errors.push({
      field: "ffsai_card_owner_name",
      message: "FSSAI card owner name is required.",
    });
  }

  return errors;
};
export const handleCreateNewKitchens = async (
  req: Request,
  res: Response
): Promise<any> => {
  try {
    const errors = validateKitchenDetails(req.body);
    if (errors.length > 0) {
      return sendErrorResponse(
        res,
        errors,
        HTTP_STATUS_CODE.BAD_REQUEST,
        ERROR_TYPES.BAD_REQUEST_ERROR
      );
    }
    const {
      kitchen_name,
      payload,
      kitchen_status,
      kitchen_owner_name,
      owner_email,
      owner_phone_number,
      restaurant_type,
      kitchen_type,
      kitchen_phone_number,
      address_type,
      street_address,
      district,
      category,
      subcategoryName,
      city,
      state,
      pincode,
      country,
      pan_card_number,
      pan_card_user_name,
      gst_number,
      gst_expiry_date,
      ffsai_certificate_number,
      ffsai_card_owner_name,
      ffsai_expiry_date,
      working_days,
      pre_ordering_options,
    } = req.body;
    let userId = payload.id;
    if (payload.role === "Admin") {
      const user = await User.findOne({ email: owner_email });
      userId = user?._id;
      if (!user) {
        throw new CustomError(
          "User does not exist.",
          HTTP_STATUS_CODE.NOT_FOUND,
          ERROR_TYPES.NOT_FOUND_ERROR
        );
      }
    }
    validateMogooseObjectId(userId);
    const existingGst = await GstCertificateDetails.findOne({
      gst_number: gst_number,
    });

    if (existingGst) {
      throw new CustomError(
        "GST number already exists",
        HTTP_STATUS_CODE.BAD_REQUEST,
        ERROR_TYPES.BAD_REQUEST_ERROR
      );
    }
    const existingFssai = await FssaiCertificateDetails.findOne({
      ffsai_certificate_number: ffsai_certificate_number,
    });

    if (existingFssai) {
      throw new CustomError(
        "FSSAI certificate number already exists",
        HTTP_STATUS_CODE.BAD_REQUEST,
        ERROR_TYPES.BAD_REQUEST_ERROR
      );
    }
    let parsedWorkingDays = [];
    if (typeof working_days === "string") {
      try {
        parsedWorkingDays = JSON.parse(working_days);
        parsedWorkingDays = parsedWorkingDays.map(
          (day: {
            day: any;
            is_open: undefined;
            open_time: any;
            close_time: any;
            status: undefined;
          }) => ({
            day: day.day || "",
            is_open: day.is_open !== undefined ? day.is_open : false,
            open_time: day.open_time || "",
            close_time: day.close_time || "",
            status: day.status !== undefined ? day.status : true,
          })
        );
        if (parsedWorkingDays.some((day: { day: any }) => !day.day)) {
          throw new Error("All working days must have a 'day' field");
        }
      } catch (e) {
        return sendErrorResponse(
          res,
          `Invalid format for working_days: ${(e as Error).message}`,
          HTTP_STATUS_CODE.BAD_REQUEST,
          ERROR_TYPES.BAD_REQUEST_ERROR
        );
      }
    } else if (Array.isArray(working_days)) {
      parsedWorkingDays = working_days.map((day) => ({
        day: day.day || "",
        is_open: day.is_open !== undefined ? day.is_open : false,
        open_time: day.open_time || "",
        close_time: day.close_time || "",
        status: day.status !== undefined ? day.status : true,
      }));
      if (parsedWorkingDays.some((day) => !day.day)) {
        return sendErrorResponse(
          res,
          "All working days must have a 'day' field",
          HTTP_STATUS_CODE.BAD_REQUEST,
          ERROR_TYPES.BAD_REQUEST_ERROR
        );
      }
    }
    let parsedPreOrderingOptions = [];
    const validMealTypes = ["breakfast", "lunch", "tea", "dinner"];
    if (typeof pre_ordering_options === "string") {
      try {
        parsedPreOrderingOptions = JSON.parse(pre_ordering_options);
        parsedPreOrderingOptions = parsedPreOrderingOptions.map(
          (option: {
            meal_type: string;
            day: any;
            pre_order_start_time: any;
            pre_order_close_time: any;
            delivery_time: any;
            status: undefined;
          }) => {
            if (
              !option.meal_type ||
              !validMealTypes.includes(option.meal_type)
            ) {
              throw new Error(
                `Invalid meal_type. Must be one of: ${validMealTypes.join(
                  ", "
                )}`
              );
            }
            return {
              day: option.day || "",
              meal_type: option.meal_type,
              pre_order_start_time: option.pre_order_start_time || "",
              pre_order_close_time: option.pre_order_close_time || "",
              delivery_time: option.delivery_time || "",
              status: option.status !== undefined ? option.status : false,
            };
          }
        );
        if (
          parsedPreOrderingOptions.some((option: { day: any }) => !option.day)
        ) {
          throw new Error("All pre-ordering options must have a 'day' field");
        }
      } catch (e) {
        return sendErrorResponse(
          res,
          `Invalid format for pre_ordering_options: ${(e as Error).message}`,
          HTTP_STATUS_CODE.BAD_REQUEST,
          ERROR_TYPES.BAD_REQUEST_ERROR
        );
      }
    } else if (Array.isArray(pre_ordering_options)) {
      parsedPreOrderingOptions = pre_ordering_options.map((option) => {
        if (!option.meal_type || !validMealTypes.includes(option.meal_type)) {
          throw new Error(
            `Invalid meal_type. Must be one of: ${validMealTypes.join(", ")}`
          );
        }
        return {
          day: option.day || "",
          meal_type: option.meal_type,
          pre_order_start_time: option.pre_order_start_time || "",
          pre_order_close_time: option.pre_order_close_time || "",
          delivery_time: option.delivery_time || "",
          status: option.status !== undefined ? option.status : false,
        };
      });
      if (parsedPreOrderingOptions.some((option) => !option.day)) {
        return sendErrorResponse(
          res,
          "All pre-ordering options must have a 'day' field",
          HTTP_STATUS_CODE.BAD_REQUEST,
          ERROR_TYPES.BAD_REQUEST_ERROR
        );
      }
    }
    const categoryId = category ? new mongoose.Types.ObjectId(category) : null;
    const subcategoryId = subcategoryName
      ? new mongoose.Types.ObjectId(subcategoryName)
      : null;
    const files = req.files as { [fieldname: string]: Express.Multer.File[] };

    const kitchenImageUrl = files?.kitchen_image?.[0]?.buffer
      ? await uploadFileToCloudinary(files.kitchen_image[0].buffer)
      : null;
    const newKitchen = await Kitchen.create({
      kitchen_name,
      user_id: userId,
      kitchen_owner_name,
      owner_email,
      owner_phone_number,
      category: categoryId,
      subcategoryName: subcategoryId,
      restaurant_type,
      kitchen_type,
      kitchen_phone_number,
      kitchen_image: kitchenImageUrl,
      role: "User",
      isapproved: payload.role === "Admin" ? "approved" : "processing",
      is_deleted: false,
      working_days: [],
      pre_ordering_options: [],
    });

    const kitchenId = newKitchen._id;

    await createAddressAndUpdateModel(Kitchen, kitchenId, {
      street_address,
      city,
      state,
      district,
      pincode,
      country,
      address_type,
      prepared_by_id: kitchenId,
      entity_type: "Kitchen",
    });

    if (files?.ffsai_certificate_image?.[0]?.buffer) {
      const fssaiImageUrl = await uploadFileToCloudinary(
        files.ffsai_certificate_image[0].buffer
      );
      await FssaiCertificateDetails.create({
        kitchen_id: kitchenId,
        ffsai_certificate_number,
        ffsai_card_owner_name,
        ffsai_certificate_image: fssaiImageUrl,
        expiry_date: ffsai_expiry_date,
      });
    }

    if (files?.gst_certificate_image?.[0]?.buffer) {
      const gstImageUrl = await uploadFileToCloudinary(
        files.gst_certificate_image[0].buffer
      );
      await GstCertificateDetails.create({
        prepared_by_id: kitchenId,
        entity_type: "Kitchen",
        gst_number,
        gst_certificate_image: gstImageUrl,
        expiry_date: gst_expiry_date,
      });
    }

    if (files?.pan_card_image?.[0]?.buffer) {
      const panImageUrl = await uploadFileToCloudinary(
        files.pan_card_image[0].buffer
      );
      await PanCardDetails.create({
        prepared_by_id: kitchenId,
        entity_type: "Kitchen",
        pan_card_number,
        pan_card_user_name,
        pan_card_image: panImageUrl,
      });
    }
    await generateKitchenNotification(payload.id, kitchen_name);

    return sendSuccessResponse(
      res,
      "Kitchen and associated details created successfully",
      {
        kitchen: newKitchen,
        role: "user",
      },
      HTTP_STATUS_CODE.OK
    );
  } catch (error) {
    console.error("Error creating kitchen:", error);
    sendErrorResponse(
      res,
      error,
      HTTP_STATUS_CODE.INTERNAL_SERVER_ERROR,
      ERROR_TYPES.INTERNAL_SERVER_ERROR_TYPE
    );
  }
};
export const handleGetKitchens = async (
  req: Request,
  res: Response
): Promise<any> => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 4;
    const skip = (page - 1) * limit;
    const { search, kitchen_type, category, subcategory } = req.query;

    const matchQuery: any = {
      is_deleted: false,
      isapproved: "approved",
    };
    if (category) {
      matchQuery.category = new mongoose.Types.ObjectId(category as string);
    }

    if (subcategory) {
      matchQuery.subcategoryName = new mongoose.Types.ObjectId(
        subcategory as string
      );
    }

    if (kitchen_type) matchQuery.kitchen_type = kitchen_type;
    if (search && typeof search === "string" && search.trim() !== "") {
      const searchRegex = new RegExp(search.trim(), "i");
      matchQuery.$or = [
        { kitchen_name: { $regex: searchRegex } },
        { owner_email: { $regex: searchRegex } },
        { owner_phone_number: { $regex: searchRegex } },
      ];
      const addressMatch = await Address.find({
        is_deleted: false,
        $or: [
          { street_address: { $regex: searchRegex } },
          { city: { $regex: searchRegex } },
          { state: { $regex: searchRegex } },
          { district: { $regex: searchRegex } },
          { country: { $regex: searchRegex } },
          { pincode: { $regex: searchRegex } },
          { landmark: { $regex: searchRegex } },
        ],
      }).select("_id");

      const addressIds = addressMatch.map(
        (addr) => addr._id
      ) as mongoose.Types.ObjectId[];

      if (addressIds.length > 0) {
        if (matchQuery.$or) {
          matchQuery.$or.push({ address_id: { $in: addressIds } });
        } else {
          matchQuery.address_id = { $in: addressIds };
        }
      }
    }

    const totalKitchens = await Kitchen.countDocuments(matchQuery);
    const kitchens = await Kitchen.aggregate([
      { $match: matchQuery },
      { $sort: { _id: 1 } },
      {
        $lookup: {
          from: "addresses",
          localField: "address_id",
          foreignField: "_id",
          as: "addresses",
        },
      },
      { $unwind: { path: "$addresses", preserveNullAndEmptyArrays: true } },
      {
        $lookup: {
          from: "orgcategories",
          localField: "category",
          foreignField: "_id",
          as: "categoryInfo",
        },
      },
      {
        $lookup: {
          from: "orgsubcategories",
          localField: "subcategoryName",
          foreignField: "_id",
          as: "subcategoryInfo",
        },
      },
      {
        $lookup: {
          from: "cities",
          let: { cityId: { $toInt: "$addresses.city" } },
          pipeline: [{ $match: { $expr: { $eq: ["$id", "$$cityId"] } } }],
          as: "cityInfo",
        },
      },
      {
        $lookup: {
          from: "states",
          let: { stateId: { $toInt: "$addresses.state" } },
          pipeline: [{ $match: { $expr: { $eq: ["$id", "$$stateId"] } } }],
          as: "stateInfo",
        },
      },
      {
        $lookup: {
          from: "districts",
          let: { districtId: { $toInt: "$addresses.district" } },
          pipeline: [{ $match: { $expr: { $eq: ["$id", "$$districtId"] } } }],
          as: "districtInfo",
        },
      },
      {
        $lookup: {
          from: "countries",
          let: { countryId: { $toInt: "$addresses.country" } },
          pipeline: [{ $match: { $expr: { $eq: ["$id", "$$countryId"] } } }],
          as: "countryInfo",
        },
      },
      {
        $project: {
          _id: 1,
          kitchen_name: 1,
          kitchen_type: 1,
          slug: 1,
          kitchen_phone_number: 1,
          owner_email: 1,
          kitchen_image: 1,
          category: 1,
          subcategoryName: 1,
          categoryInfo: {
            $arrayElemAt: ["$categoryInfo", 0],
          },
          subcategoryInfo: {
            $arrayElemAt: ["$subcategoryInfo", 0],
          },
          addresses: {
            street_address: "$addresses.street_address",
            city_id: "$addresses.city",
            city_name: { $arrayElemAt: ["$cityInfo.name", 0] },
            state_id: "$addresses.state",
            state_name: { $arrayElemAt: ["$stateInfo.name", 0] },
            district_id: "$addresses.district",
            district_name: { $arrayElemAt: ["$districtInfo.name", 0] },
            pincode: "$addresses.pincode",
            country_id: "$addresses.country",
            country_name: { $arrayElemAt: ["$countryInfo.name", 0] },
            landmark: "$addresses.landmark",
          },
        },
      },
      { $skip: skip },
      { $limit: limit },
    ]);

    const hasMore = skip + limit < totalKitchens;
    sendSuccessResponse(
      res,
      "Kitchens retrieved successfully!",
      {
        kitchens,
        totalPages: Math.ceil(totalKitchens / limit),
        currentPage: page,
        totalKitchens,
        hasMore,
      },
      HTTP_STATUS_CODE.OK
    );
  } catch (error) {
    console.error("Error in handleGetKitchens:", error);
    sendErrorResponse(
      res,
      error,
      HTTP_STATUS_CODE.INTERNAL_SERVER_ERROR,
      ERROR_TYPES.INTERNAL_SERVER_ERROR_TYPE
    );
  }
};
export const handleGetKitchensById = async (
  req: Request,
  res: Response
): Promise<any> => {
  try {
    const { kitchenId } = req.params;
    const kitchen = await Kitchen.aggregate([
      {
        $match: {
          slug: kitchenId,
          is_deleted: false,
        },
      },
      {
        $lookup: {
          from: "addresses",
          localField: "address_id",
          foreignField: "_id",
          as: "addresses",
        },
      },
      {
        $lookup: {
          from: "kitchencategories",
          localField: "category",
          foreignField: "_id",
          as: "categoryDetails",
        },
      },

      {
        $lookup: {
          from: "kitchensubcategories",
          localField: "subcategoryName",
          foreignField: "_id",
          as: "subcategoryDetails",
        },
      },

      {
        $lookup: {
          from: "kitchenfssaicertificatedetails",
          localField: "_id",
          foreignField: "kitchen_id",
          as: "fssaiDetails",
        },
      },
      {
        $lookup: {
          from: "pancarddetails",
          let: { entityId: "$_id" },
          pipeline: [
            {
              $match: {
                $expr: {
                  $and: [
                    { $eq: ["$prepared_by_id", "$$entityId"] },
                    { $eq: ["$entity_type", "Kitchen"] },
                  ],
                },
              },
            },
          ],
          as: "panDetails",
        },
      },
      {
        $lookup: {
          from: "gstcertificatedetails",
          let: { kitchenId: "$_id" },
          pipeline: [
            {
              $match: {
                $expr: {
                  $and: [
                    { $eq: ["$prepared_by_id", "$$kitchenId"] },
                    { $eq: ["$entity_type", "Kitchen"] },
                  ],
                },
              },
            },
          ],
          as: "gstDetails",
        },
      },
      { $unwind: { path: "$addresses", preserveNullAndEmptyArrays: true } },
      {
        $lookup: {
          from: "states",
          let: { stateId: { $toInt: "$addresses.state" } },
          pipeline: [{ $match: { $expr: { $eq: ["$id", "$$stateId"] } } }],
          as: "stateInfo",
        },
      },
      {
        $lookup: {
          from: "cities",
          let: { cityId: { $toInt: "$addresses.city" } },
          pipeline: [{ $match: { $expr: { $eq: ["$id", "$$cityId"] } } }],
          as: "cityInfo",
        },
      },
      {
        $lookup: {
          from: "districts",
          let: { districtId: { $toInt: "$addresses.district" } },
          pipeline: [{ $match: { $expr: { $eq: ["$id", "$$districtId"] } } }],
          as: "districtInfo",
        },
      },
      {
        $lookup: {
          from: "countries",
          let: { countryId: { $toInt: "$addresses.country" } },
          pipeline: [{ $match: { $expr: { $eq: ["$id", "$$countryId"] } } }],
          as: "countryInfo",
        },
      },
      {
        $group: {
          _id: "$_id",
          kitchen_name: { $first: "$kitchen_name" },
          kitchen_status: { $first: "$kitchen_status" },
          kitchen_owner_name: { $first: "$kitchen_owner_name" },
          owner_email: { $first: "$owner_email" },
          status: { $first: "$status" },
          owner_phone_number: { $first: "$owner_phone_number" },
          restaurant_type: { $first: "$restaurant_type" },

          // Get both ID and name for category
          category: {
            $first: {
              $cond: {
                if: { $gt: [{ $size: "$categoryDetails" }, 0] },
                then: {
                  _id: { $arrayElemAt: ["$categoryDetails._id", 0] },
                  category_name: {
                    $arrayElemAt: ["$categoryDetails.category", 0],
                  },
                },
                else: { _id: "$category", category_name: null }, // Fall back to just the ID
              },
            },
          },

          // Get both ID and name for subcategory
          subcategoryName: {
            $first: {
              $cond: {
                if: { $gt: [{ $size: "$subcategoryDetails" }, 0] },
                then: {
                  _id: { $arrayElemAt: ["$subcategoryDetails._id", 0] },
                  subcategory_name: {
                    $arrayElemAt: ["$subcategoryDetails.subcategoryName", 0],
                  },
                },
                else: { _id: "$subcategoryName", subcategory_name: null }, // Fall back to just the ID
              },
            },
          },

          kitchen_type: { $first: "$kitchen_type" },
          kitchen_phone_number: { $first: "$kitchen_phone_number" },
          kitchen_document_verification: {
            $first: "$kitchen_document_verification",
          },
          kitchen_image: { $first: "$kitchen_image" },
          working_days: { $first: "$working_days" },
          pre_ordering_options: { $first: "$pre_ordering_options" },
          panDetails: { $first: "$panDetails" },
          gstDetails: { $first: "$gstDetails" },
          fssaiDetails: { $first: "$fssaiDetails" },
          addresses: {
            $push: {
              _id: "$addresses._id",
              street_address: "$addresses.street_address",
              city_id: "$addresses.city",
              city_name: { $arrayElemAt: ["$cityInfo.name", 0] },
              state_id: "$addresses.state",
              state_name: { $arrayElemAt: ["$stateInfo.name", 0] },
              district_id: "$addresses.district",
              district_name: { $arrayElemAt: ["$districtInfo.name", 0] },
              pincode: "$addresses.pincode",
              country_id: "$addresses.country",
              country_name: { $arrayElemAt: ["$countryInfo.name", 0] },
              landmark: "$addresses.landmark",
              address_type: "$addresses.address_type",
            },
          },
        },
      },
    ]);

    if (!kitchen || kitchen.length === 0) {
      throw new CustomError(
        "Kitchen not found",
        HTTP_STATUS_CODE.BAD_REQUEST,
        ERROR_TYPES.BAD_REQUEST_ERROR,
        false
      );
    }
    sendSuccessResponse(
      res,
      "Kitchen retrieved successfully!",
      kitchen[0],
      HTTP_STATUS_CODE.OK
    );
  } catch (error: any) {
    sendErrorResponse(
      res,
      error,
      HTTP_STATUS_CODE.INTERNAL_SERVER_ERROR,
      ERROR_TYPES.INTERNAL_SERVER_ERROR_TYPE
    );
  }
};
export const handleUpdateKitchensById = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const errors = validateKitchenDetails(req.body);
    if (errors.length > 0) {
      return sendErrorResponse(
        res,
        errors,
        HTTP_STATUS_CODE.BAD_REQUEST,
        ERROR_TYPES.BAD_REQUEST_ERROR
      );
    }

    const kitchenId = req.params.id;

    const files = req.files as { [fieldname: string]: Express.Multer.File[] };
    const {
      kitchen_name,
      kitchen_status,
      kitchen_owner_name,
      owner_email,
      owner_phone_number,
      restaurant_type,
      kitchen_type,
      category,
      subcategoryName,
      kitchen_phone_number,
      address_type,
      street_address,
      district,
      city,
      state,
      pincode,
      country,
      pan_card_number,
      pan_card_user_name,
      gst_number,
      gst_expiry_date,
      ffsai_certificate_number,
      ffsai_card_owner_name,
      ffsai_expiry_date,
      working_days,
      pre_ordering_options,
    } = req.body;
    const existingKitchen = await Kitchen.findOne({
      slug: kitchenId,
      is_deleted: false,
    })
      .populate("category")
      .populate("subcategoryName");
    if (!existingKitchen) {
      throw new CustomError(
        "Kitchen not found",
        HTTP_STATUS_CODE.BAD_REQUEST,
        ERROR_TYPES.BAD_REQUEST_ERROR,
        false
      );
    }
    let parsedWorkingDays = [];
    if (typeof working_days === "string") {
      try {
        parsedWorkingDays = JSON.parse(working_days);
        parsedWorkingDays = parsedWorkingDays.map(
          (day: {
            day: any;
            is_open: undefined;
            open_time: any;
            close_time: any;
            status: undefined;
          }) => ({
            day: day.day || "",
            is_open: day.is_open !== undefined ? day.is_open : false,
            open_time: day.open_time || "",
            close_time: day.close_time || "",
            status: day.status !== undefined ? day.status : true,
          })
        );
        if (parsedWorkingDays.some((day: { day: any }) => !day.day)) {
          throw new Error("All working days must have a 'day' field");
        }
      } catch (e) {
        return sendErrorResponse(
          res,
          `Invalid format for working_days: ${(e as Error).message}`,
          HTTP_STATUS_CODE.BAD_REQUEST,
          ERROR_TYPES.BAD_REQUEST_ERROR
        );
      }
    } else if (Array.isArray(working_days)) {
      parsedWorkingDays = working_days.map((day) => ({
        day: day.day || "",
        is_open: day.is_open !== undefined ? day.is_open : false,
        open_time: day.open_time || "",
        close_time: day.close_time || "",
        status: day.status !== undefined ? day.status : true,
      }));
      if (parsedWorkingDays.some((day) => !day.day)) {
        return sendErrorResponse(
          res,
          "All working days must have a 'day' field",
          HTTP_STATUS_CODE.BAD_REQUEST,
          ERROR_TYPES.BAD_REQUEST_ERROR
        );
      }
    }

    // Parse pre_ordering_options
    let parsedPreOrderingOptions = [];
    if (typeof pre_ordering_options === "string") {
      try {
        parsedPreOrderingOptions = JSON.parse(pre_ordering_options);
        parsedPreOrderingOptions = parsedPreOrderingOptions.map(
          (option: {
            day: any;
            meal_type: any;
            pre_order_start_time: any;
            pre_order_close_time: any;
            delivery_time: any;
            status: undefined;
          }) => ({
            day: option.day || "",
            meal_type: option.meal_type || "",
            pre_order_start_time: option.pre_order_start_time || "",
            pre_order_close_time: option.pre_order_close_time || "",
            delivery_time: option.delivery_time || "",
            status: option.status !== undefined ? option.status : false,
          })
        );
      } catch (e) {
        return sendErrorResponse(
          res,
          `Invalid format for pre_ordering_options: ${(e as Error).message}`,
          HTTP_STATUS_CODE.BAD_REQUEST,
          ERROR_TYPES.BAD_REQUEST_ERROR
        );
      }
    } else if (Array.isArray(pre_ordering_options)) {
      parsedPreOrderingOptions = pre_ordering_options.map((option) => ({
        day: option.day || "",
        meal_type: option.meal_type || "",
        pre_order_start_time: option.pre_order_start_time || "",
        pre_order_close_time: option.pre_order_close_time || "",
        delivery_time: option.delivery_time || "",
        status: option.status !== undefined ? option.status : false,
      }));
    }

    // Handle file uploads to Cloudinary
    const kitchenImageUrl = files?.kitchen_image?.[0]?.buffer
      ? await uploadFileToCloudinary(files.kitchen_image[0].buffer)
      : existingKitchen.kitchen_image;

    const panImageUrl = files?.pan_card_image?.[0]?.buffer
      ? await uploadFileToCloudinary(files.pan_card_image[0].buffer)
      : req.body.pan_card_image;

    const gstImageUrl = files?.gst_certificate_image?.[0]?.buffer
      ? await uploadFileToCloudinary(files.gst_certificate_image[0].buffer)
      : req.body.gst_certificate_image;

    const fssaiImageUrl = files?.ffsai_certificate_image?.[0]?.buffer
      ? await uploadFileToCloudinary(files.ffsai_certificate_image[0].buffer)
      : req.body.ffsai_certificate_image;

    const categoryId =
      category && mongoose.Types.ObjectId.isValid(category)
        ? new mongoose.Types.ObjectId(category)
        : existingKitchen.category;
    const subcategoryId =
      subcategoryName && mongoose.Types.ObjectId.isValid(subcategoryName)
        ? new mongoose.Types.ObjectId(subcategoryName)
        : existingKitchen.subcategoryName;
    const updatedKitchen = await Kitchen.findByIdAndUpdate(
      existingKitchen._id,
      {
        $set: {
          kitchen_name,
          kitchen_status,
          kitchen_owner_name,
          owner_email,
          owner_phone_number,
          category: categoryId,
          subcategoryName: subcategoryId,
          restaurant_type,
          kitchen_type,
          kitchen_phone_number,
          kitchen_image: kitchenImageUrl,
          working_days: parsedWorkingDays,
          pre_ordering_options: parsedPreOrderingOptions,
        },
      },
      { new: true }
    );
    // Update address
    await updateAddress(Kitchen, existingKitchen?._id, {
      street_address,
      city,
      state,
      district,
      pincode,
      country,
      address_type,
      prepared_by_id: existingKitchen?._id,
      entity_type: "Kitchen",
    });
    // Update or create PAN details
    if (pan_card_number) {
      const panData = {
        pan_card_number,
        pan_card_user_name,
        pan_card_image: panImageUrl,
        prepared_by_id: existingKitchen?._id,
        entity_type: "Kitchen",
      };
      await PanCardDetails.findOneAndUpdate(
        { prepared_by_id: existingKitchen?._id, entity_type: "Kitchen" },
        panData,
        { upsert: true, new: true }
      );
    }
    // Update or create GST details
    if (gst_number) {
      const gstData = {
        gst_number,
        gst_certificate_image: gstImageUrl,
        expiry_date: gst_expiry_date,
        prepared_by_id: existingKitchen?._id,
        entity_type: "Kitchen",
      };
      await GstCertificateDetails.findOneAndUpdate(
        { prepared_by_id: existingKitchen?._id, entity_type: "Kitchen" },
        gstData,
        { upsert: true, new: true }
      );
    }
    // Update or create FSSAI details
    if (ffsai_certificate_number) {
      const fssaiData = {
        ffsai_certificate_number,
        ffsai_card_owner_name,
        ffsai_certificate_image: fssaiImageUrl,
        expiry_date: ffsai_expiry_date,
        kitchen_id: existingKitchen?._id,
      };
      await FssaiCertificateDetails.findOneAndUpdate(
        { kitchen_id: existingKitchen?._id },
        fssaiData,
        { upsert: true, new: true }
      );
    }
    const populatedKitchen = await Kitchen.findById(existingKitchen?._id)
      .populate("category")
      .populate("subcategoryName");
    sendSuccessResponse(
      res,
      "Kitchen updated successfully!",
      { kitchen: updatedKitchen },
      HTTP_STATUS_CODE.OK
    );
  } catch (error: any) {
    console.error("Error updating kitchen:", error);
    sendErrorResponse(
      res,
      error,
      HTTP_STATUS_CODE.INTERNAL_SERVER_ERROR,
      ERROR_TYPES.INTERNAL_SERVER_ERROR_TYPE
    );
  }
};
export const handleDeleteKitchens = async (
  req: Request,
  res: Response
): Promise<any> => {
  try {
    const { kitchenId } = req.params;

    const updatedKitchen = await Kitchen.findOneAndUpdate(
      { slug: kitchenId },
      { $set: { is_deleted: true } },
      { new: true }
    );
    if (!updatedKitchen) {
      throw new CustomError(
        "Kitchen not found",
        HTTP_STATUS_CODE.BAD_REQUEST,
        ERROR_TYPES.BAD_REQUEST_ERROR,
        false
      );
    }
    sendSuccessResponse(
      res,
      "Kitchen soft deleted successfully!",
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
export const kitchenToggleStatus = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const kitchen = await Kitchen.findOne({ slug: id });

    if (!kitchen) {
      throw new CustomError(
        "Kitchen not found",
        HTTP_STATUS_CODE.NOT_FOUND,
        ERROR_TYPES.NOT_FOUND_ERROR,
        false
      );
    }
    const newStatus = !kitchen.status;
    const updatedKitchen = await Kitchen.findOneAndUpdate(
      { slug: id },
      { status: newStatus },
      { new: true }
    );

    sendSuccessResponse(
      res,
      `Kitchen status ${
        updatedKitchen?.status ? "activated" : "deactivated"
      } successfully`,
      updatedKitchen,
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
export const handleGetUnapprovedKitchens = async (
  req: Request,
  res: Response
): Promise<any> => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 4;
    const skip = (page - 1) * limit;
    const { search } = req.query;

    const matchQuery: any = { is_deleted: false, isapproved: "processing" };

    if (search) {
      matchQuery.kitchen_name = { $regex: new RegExp(search as string, "i") };
    }

    const kitchens = await Kitchen.aggregate([
      { $match: matchQuery },
      { $skip: skip },
      { $limit: limit },
      {
        $lookup: {
          from: "addresses",
          localField: "address_id",
          foreignField: "_id",
          as: "addresses",
        },
      },
      {
        $lookup: {
          from: "categories",
          localField: "category",
          foreignField: "_id",
          as: "categoryDetails",
        },
      },
      {
        $lookup: {
          from: "subcategories",
          localField: "subcategoryName",
          foreignField: "_id",
          as: "subcategoryDetails",
        },
      },
      { $unwind: { path: "$addresses", preserveNullAndEmptyArrays: true } },
      {
        $lookup: {
          from: "states",
          let: { stateId: { $toInt: "$addresses.state" } },
          pipeline: [{ $match: { $expr: { $eq: ["$id", "$$stateId"] } } }],
          as: "stateInfo",
        },
      },
      {
        $lookup: {
          from: "cities",
          let: { cityId: { $toInt: "$addresses.city" } },
          pipeline: [{ $match: { $expr: { $eq: ["$id", "$$cityId"] } } }],
          as: "cityInfo",
        },
      },
      {
        $lookup: {
          from: "districts",
          let: { districtId: { $toInt: "$addresses.district" } },
          pipeline: [{ $match: { $expr: { $eq: ["$id", "$$districtId"] } } }],
          as: "districtInfo",
        },
      },
      {
        $lookup: {
          from: "countries",
          let: { countryId: { $toInt: "$addresses.country" } },
          pipeline: [{ $match: { $expr: { $eq: ["$id", "$$countryId"] } } }],
          as: "countryInfo",
        },
      },
      {
        $group: {
          _id: "$_id",
          kitchen_name: { $first: "$kitchen_name" },
          slug: { $first: "$slug" },
          kitchen_owner_name: { $first: "$kitchen_owner_name" },
          kitchen_type: { $first: "$kitchen_type" },
          kitchen_phone_number: { $first: "$kitchen_phone_number" },
          kitchen_image: { $first: "$kitchen_image" },
          categoryDetails: { $first: "$categoryDetails" },
          subcategoryDetails: { $first: "$subcategoryDetails" },
          owner_email: { $first: "$owner_email" },
          kitchen_status: { $first: "$kitchen_status" },
          addresses: {
            $push: {
              _id: "$addresses._id",
              street_address: "$addresses.street_address",
              city_id: "$addresses.city",
              city_name: { $arrayElemAt: ["$cityInfo.name", 0] },
              state_id: "$addresses.state",
              state_name: { $arrayElemAt: ["$stateInfo.name", 0] },
              district_id: "$addresses.district",
              district_name: { $arrayElemAt: ["$districtInfo.name", 0] },
              pincode: "$addresses.pincode",
              country_id: "$addresses.country",
              country_name: { $arrayElemAt: ["$countryInfo.name", 0] },
              landmark: "$addresses.landmark",
              address_type: "$addresses.address_type",
            },
          },
        },
      },
    ]);

    const totalKitchens = await Kitchen.countDocuments(matchQuery);

    sendSuccessResponse(
      res,
      "Unapproved organizations retrieved successfully!",
      {
        kitchens,
        totalPages: Math.ceil(totalKitchens / limit),
        currentPage: page,
        totalKitchens,
      },
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
export const handleGetUserApprovedKitchens = async (
  req: Request,
  res: Response
): Promise<any> => {
  try {
    const userId = req.body.payload.id;
    if (!mongoose.Types.ObjectId.isValid(userId)) {
      return sendErrorResponse(
        res,
        "Invalid user ID format",
        HTTP_STATUS_CODE.BAD_REQUEST,
        ERROR_TYPES.BAD_REQUEST_ERROR
      );
    }

    const kitchens = await Kitchen.aggregate([
      {
        $match: {
          user_id: new mongoose.Types.ObjectId(userId),
          is_deleted: false,
        },
      },
      {
        $lookup: {
          from: "addresses",
          localField: "address_id",
          foreignField: "_id",
          as: "addresses",
        },
      },
      {
        $lookup: {
          from: "categories",
          localField: "category",
          foreignField: "_id",
          as: "categoryDetails",
        },
      },
      {
        $lookup: {
          from: "subcategories",
          localField: "subcategoryName",
          foreignField: "_id",
          as: "subcategoryDetails",
        },
      },
      { $unwind: { path: "$addresses", preserveNullAndEmptyArrays: true } },
      {
        $lookup: {
          from: "states",
          let: { stateId: { $toInt: "$addresses.state" } },
          pipeline: [{ $match: { $expr: { $eq: ["$id", "$$stateId"] } } }],
          as: "stateInfo",
        },
      },
      {
        $lookup: {
          from: "cities",
          let: { cityId: { $toInt: "$addresses.city" } },
          pipeline: [{ $match: { $expr: { $eq: ["$id", "$$cityId"] } } }],
          as: "cityInfo",
        },
      },
      {
        $lookup: {
          from: "countries",
          let: { countryId: { $toInt: "$addresses.country" } },
          pipeline: [{ $match: { $expr: { $eq: ["$id", "$$countryId"] } } }],
          as: "countryInfo",
        },
      },
      {
        $project: {
          id: "$_id",
          name: "$kitchen_name",
          address: {
            $cond: {
              if: { $eq: ["$addresses", null] },
              then: "Address not available",
              else: {
                $concat: [
                  { $ifNull: ["$addresses.street_address", ""] },
                  ", ",
                  { $ifNull: [{ $arrayElemAt: ["$cityInfo.name", 0] }, ""] },
                  ", ",
                  { $ifNull: [{ $arrayElemAt: ["$stateInfo.name", 0] }, ""] },
                  ", ",
                  { $ifNull: ["$addresses.pincode", ""] },
                  ", ",
                  { $ifNull: [{ $arrayElemAt: ["$countryInfo.name", 0] }, ""] },
                ],
              },
            },
          },
          profilePic: "$kitchen_image",
          isapproved: "$isapproved",
          slug: "$slug",
          rating: { $literal: 4.5 },
          cuisine: {
            $concatArrays: [
              { $ifNull: [{ $arrayElemAt: ["$categoryDetails.name", 0] }, []] },
              {
                $ifNull: [
                  { $arrayElemAt: ["$subcategoryDetails.name", 0] },
                  [],
                ],
              },
            ],
          },
          specialty: "$kitchen_type",
        },
      },
    ]);

    sendSuccessResponse(
      res,
      "User's approved kitchens retrieved successfully!",
      { kitchens },
      HTTP_STATUS_CODE.OK
    );
  } catch (error) {
    console.error("Error in handleGetUserApprovedKitchens:", error); // Add logging for debugging
    sendErrorResponse(
      res,
      (error as any).message || "Failed to retrieve user's approved kitchens",
      HTTP_STATUS_CODE.INTERNAL_SERVER_ERROR,
      ERROR_TYPES.INTERNAL_SERVER_ERROR_TYPE
    );
  }
};
export const handleAdminApproveKitchen = async (
  req: Request,
  res: Response
) => {
  try {
    const { id } = req.params;
    const kitchen = await Kitchen.findById(id);
    if (!kitchen) {
      throw new CustomError(
        "kitchen not found",
        HTTP_STATUS_CODE.NOT_FOUND,
        ERROR_TYPES.NOT_FOUND_ERROR,
        false
      );
    }
    if (kitchen.isapproved === "approved") {
      throw new CustomError(
        "kitchen already approved",
        HTTP_STATUS_CODE.BAD_REQUEST,
        ERROR_TYPES.BAD_REQUEST_ERROR,
        false
      );
    }
    await Kitchen.findByIdAndUpdate(
      id,
      { isapproved: "approved" },
      { new: true }
    );
    sendSuccessResponse(
      res,
      "approve Kitchen created successfully",
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

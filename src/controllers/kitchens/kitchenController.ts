import { Request, Response } from "express";
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
  console.log(req.body);

  try {
    // Validate request body
    const errors = validateKitchenDetails(req.body);
    if (errors.length > 0) {
      return sendErrorResponse(
        res,
        errors,
        HTTP_STATUS_CODE.BAD_REQUEST,
        ERROR_TYPES.BAD_REQUEST_ERROR
      );
    }

    // Extract fields from request
    const {
      kitchen_name,
      user_id,
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
    } = req.body;

    // Validate category and subcategory before converting to ObjectId
    const categoryId = category ? new mongoose.Types.ObjectId(category) : null;
    const subcategoryId = subcategoryName
      ? new mongoose.Types.ObjectId(subcategoryName)
      : null;

    // Handle file uploads safely
    const files = req.files as { [fieldname: string]: Express.Multer.File[] };

    const kitchenImageUrl = files?.kitchen_image?.[0]?.buffer
      ? await uploadFileToCloudinary(files.kitchen_image[0].buffer)
      : null;

    // Create new Kitchen entry
    const newKitchen = await Kitchen.create({
      kitchen_name,
      user_id: new mongoose.Types.ObjectId(user_id),
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
      working_days: [],
      pre_ordering_options: [],
    });

    const kitchenId = newKitchen._id;

    // Create Address
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

    // Upload FSSAI Certificate Image
    if (files?.ffsai_certificate_image?.[0]?.buffer) {
      const FsssaiImageUrl = await uploadFileToCloudinary(
        files.ffsai_certificate_image[0].buffer
      );
      await FssaiCertificateDetails.create({
        kitchen_id: kitchenId,
        ffsai_certificate_number,
        ffsai_card_owner_name,
        ffsai_certificate_image: FsssaiImageUrl,
        expiry_date: ffsai_expiry_date,
      });
    }

    // Upload GST Certificate Image
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

    // Upload PAN Card Image
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

    return sendSuccessResponse(
      res,
      "Kitchen and associated details created successfully",
      null,
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
    const { search, kitchen_status, kitchen_type } = req.query;

    console.log(req.query);
    const matchQuery: any = { is_deleted: false };
    
    if (kitchen_status) matchQuery.kitchen_status = kitchen_status;
    if (kitchen_type) matchQuery.kitchen_type = kitchen_type;
    
    // Implement search functionality on kitchen_name
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
      "Kitchens retrieved successfully!",
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


export const handleGetKitchensById = async (
  req: Request,
  res: Response
): Promise<any> => {
  try {
    const { kitchenId } = req.params;
    validateMogooseObjectId(kitchenId);
     
    const kitchen = await Kitchen.aggregate([
      {
        $match: {
          _id: new mongoose.Types.ObjectId(kitchenId),
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
      // Unwind addresses for easier processing
      { $unwind: { path: "$addresses", preserveNullAndEmptyArrays: true } },
      // Look up state information
      {
        $lookup: {
          from: "states",
          let: { stateId: { $toInt: "$addresses.state" } },
          pipeline: [{ $match: { $expr: { $eq: ["$id", "$$stateId"] } } }],
          as: "stateInfo",
        },
      },
      // Look up city information
      {
        $lookup: {
          from: "cities",
          let: { cityId: { $toInt: "$addresses.city" } },
          pipeline: [{ $match: { $expr: { $eq: ["$id", "$$cityId"] } } }],
          as: "cityInfo",
        },
      },
      // Look up district information
      {
        $lookup: {
          from: "districts",
          let: { districtId: { $toInt: "$addresses.district" } },
          pipeline: [{ $match: { $expr: { $eq: ["$id", "$$districtId"] } } }],
          as: "districtInfo",
        },
      },
      // Look up country information
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
          category: { $first: { $arrayElemAt: ["$categoryDetails", 0] } },
          subcategoryName: {
            $first: { $arrayElemAt: ["$subcategoryDetails", 0] },
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
      pan_card_image,
      gst_certificate_image,
      ffsai_certificate_image,
    } = req.body;

    validateMogooseObjectId(kitchenId);
    const existingKitchen = await Kitchen.findOne({
      _id: kitchenId,
      is_deleted: false,
    });

    if (!existingKitchen) {
      throw new CustomError(
        "Kitchen not found",
        HTTP_STATUS_CODE.BAD_REQUEST,
        ERROR_TYPES.BAD_REQUEST_ERROR,
        false
      );
    }

    const kitchen_image = files.kitchen_image
      ? await uploadFileToCloudinary(files.kitchen_image[0].buffer)
      : existingKitchen.kitchen_image;
    const pan_image = files.pan_card_image
      ? await uploadFileToCloudinary(files.pan_card_image[0].buffer)
      : pan_card_image;
    const gst_image = files.gst_certificate_image
      ? await uploadFileToCloudinary(files.gst_certificate_image[0].buffer)
      : gst_certificate_image;
    const fssai_image = files.ffsai_certificate_image
      ? await uploadFileToCloudinary(files.ffsai_certificate_image[0].buffer)
      : ffsai_certificate_image;

    await Kitchen.findByIdAndUpdate(
      kitchenId,
      {
        $set: {
          kitchen_name,
          kitchen_status,
          kitchen_owner_name,
          owner_email,
          owner_phone_number,
          category: category
            ? new mongoose.Types.ObjectId(category)
            : existingKitchen.category,
          subcategoryName: subcategoryName
            ? new mongoose.Types.ObjectId(subcategoryName)
            : existingKitchen.subcategoryName,
          restaurant_type,
          kitchen_type,
          kitchen_phone_number,
          kitchen_image,
        },
      },
      { new: true }
    );

    await updateAddress(Kitchen, kitchenId, {
      street_address: street_address,
      city,
      state,
      district,
      pincode,
      country,
      address_type,
      prepared_by_id: kitchenId,
      entity_type: "Kitchen",
    });

    // Update or create PAN details
    if (pan_card_number) {
      const panData = {
        pan_card_number,
        pan_card_user_name,
        pan_card_image: pan_image,
        prepared_by_id: kitchenId,
        entity_type: "Kitchen",
      };

      await PanCardDetails.findOneAndUpdate(
        {
          prepared_by_id: kitchenId,
          entity_type: "Kitchen",
        },
        panData,
        { upsert: true, new: true }
      );
    }

    // Update or create GST details
    if (gst_number) {
      const gstData = {
        gst_number,
        gst_certificate_image: gst_image,
        expiry_date: gst_expiry_date,
        prepared_by_id: kitchenId,
        entity_type: "Kitchen",
      };

      await GstCertificateDetails.findOneAndUpdate(
        {
          prepared_by_id: kitchenId,
          entity_type: "Kitchen",
        },
        gstData,
        { upsert: true, new: true }
      );
    }

    // Update or create FSSAI details
    if (ffsai_certificate_number) {
      const fssaiData = {
        ffsai_certificate_number,
        ffsai_card_owner_name,
        ffsai_certificate_image: fssai_image,
        expiry_date: ffsai_expiry_date,
        kitchen_id: kitchenId,
      };

      await FssaiCertificateDetails.findOneAndUpdate(
        { kitchen_id: kitchenId },
        fssaiData,
        { upsert: true, new: true }
      );
    }
    const updatedKitchen = await Kitchen.findById(kitchenId)
      .populate("category")
      .populate("subcategoryName");
    sendSuccessResponse(
      res,
      "Kitchen updated successfully!",
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

export const handleDeleteKitchens = async (
  req: Request,
  res: Response
): Promise<any> => {
  try {
    const { kitchenId } = req.params;
    validateMogooseObjectId(kitchenId);

    const updatedKitchen = await Kitchen.findByIdAndUpdate(
      kitchenId,
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

export const kitchenToggleStatus = async (
  req: Request,
  res: Response
) => {
  try {
    const { id } = req.params;
    const kitchen = await Kitchen.findById(id);

    if (!kitchen) {
      throw new CustomError(
        "Kitchen not found",
        HTTP_STATUS_CODE.NOT_FOUND,
        ERROR_TYPES.NOT_FOUND_ERROR,
        false
      );
    }
    const newStatus = !kitchen.status;
    const updatedKitchen = await Kitchen.findByIdAndUpdate(
      id, 
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
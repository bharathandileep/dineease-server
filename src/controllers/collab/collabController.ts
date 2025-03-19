import { NextFunction, Request, Response } from "express";
import Kitchen from "../../models/kitchen/KitchenModel";
import Organization from "../../models/organisations/OrgModel";
import Collaboration from "../../models/collab/Collab"; // Ensure this import is correct
import {
  sendErrorResponse,
  sendSuccessResponse,
} from "../../lib/helpers/responseHelper";
import { HTTP_STATUS_CODE } from "../../lib/constants/httpStatusCodes";
import { ERROR_TYPES } from "../../lib/constants/errorType";
import { CustomError } from "../../lib/errors/customError";
import { generateColloborationNotification } from "../notification/notificationController";

export const collaborateKitchen = async (req: Request, res: Response) => {
  try {
    const { organization_id, kitchen_id, organizationName } = req.body;

    const organization = await Organization.findById(organization_id);
    if (!organization) {
      throw new CustomError(
        "Organization not found",
        HTTP_STATUS_CODE.NOT_FOUND,
        ERROR_TYPES.NOT_FOUND_ERROR, 
        false
      );
    }

    const kitchen = await Kitchen.findById(kitchen_id);
    if (!kitchen) {
      throw new CustomError(
        "Kitchen not found",
        HTTP_STATUS_CODE.NOT_FOUND,
        ERROR_TYPES.NOT_FOUND_ERROR,
        false
      );
    }

    const existingCollaboration = await Collaboration.findOne({
      organization_id,
      kitchen_id,
    });
    if (existingCollaboration) {
      throw new CustomError(
        "Collaboration already exists",
        HTTP_STATUS_CODE.BAD_REQUEST,
        ERROR_TYPES.BAD_REQUEST_ERROR,
        false
      );
    }

    const collaboration = new Collaboration({
      organization_id,
      kitchen_id,
      status: "Pending",
    });

    await collaboration.save(); 

    // Generate notification for the collaboration
    await generateColloborationNotification(organization_id, kitchen_id, organizationName, "organizationName");

    sendSuccessResponse(
      res,
      "Collaboration request created successfully",
      collaboration,
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

export const listCollaboratedKitchens = async (req: Request, res: Response) => {
  try {
    const { organization_id } = req.params;

    // Find all collaborations for the organization
    const collaborations = await Collaboration.find({ organization_id }).select("kitchen_id status");

    if (!collaborations || collaborations.length === 0) {
      throw new CustomError(
        "No collaborations found",
        HTTP_STATUS_CODE.NOT_FOUND,
        ERROR_TYPES.NOT_FOUND_ERROR,
        false
      );
    }

    const kitchenIds = collaborations.map((collab) => collab.kitchen_id);

    // Fetch kitchen details with aggregation
    const kitchens = await Kitchen.aggregate([
      {
        $match: {
          _id: { $in: kitchenIds },
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
                else: { _id: "$category", category_name: null },
              },
            },
          },

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
                else: { _id: "$subcategoryName", subcategory_name: null },
              },
            },
          },

          kitchen_type: { $first: "$kitchen_type" },
          kitchen_phone_number: { $first: "$kitchen_phone_number" },
          kitchen_document_verification: { $first: "$kitchen_document_verification" },
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

    if (!kitchens || kitchens.length === 0) {
      throw new CustomError(
        "No kitchen details found for collaborations",
        HTTP_STATUS_CODE.NOT_FOUND,
        ERROR_TYPES.NOT_FOUND_ERROR,
        false
      );
    }

   
    sendSuccessResponse(
      res,
      "Collaborated kitchens retrieved successfully",
      kitchens,
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

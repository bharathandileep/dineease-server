import { NextFunction, Request, Response } from "express";
import Kitchen, { IKitchen } from "../../models/kitchen/KitchenModel";
import Organization, { IOrganization } from "../../models/organisations/OrgModel";
import Collaboration from "../../models/collab/Collab"; // Ensure this import is correct
import CollaborationModel,{ICollaboration} from "../../models/collab/Collab"
import {
  sendErrorResponse,
  sendSuccessResponse,
} from "../../lib/helpers/responseHelper";
import { HTTP_STATUS_CODE } from "../../lib/constants/httpStatusCodes";
import { ERROR_TYPES } from "../../lib/constants/errorType";
import { CustomError } from "../../lib/errors/customError";
import { generateColloborationNotification } from "../notification/notificationController";
import { promises } from "dns";
import { fromJS } from "immutable";



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
      is_deleted: false
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
      // status: "Pending",
    });

    await collaboration.save();  

    await generateColloborationNotification(organization_id, kitchen_id, kitchen.kitchen_name,organization.organizationName);

    const responseData = {
      _id: collaboration._id,
      organization: {
        _id: organization._id,
        name: organization.organizationName
      },
      kitchen: {
        _id: kitchen._id,
        name: kitchen.kitchen_name
      },
      createdAt: collaboration.createdAt
    };

    sendSuccessResponse(
      res,
      "Collaboration request created successfully",
      responseData,
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
// Try this approach which is more resilient
export const getAllColloborations = async(req: Request, res: Response): Promise<void> => {
  try {
    // First get the basic collaboration documents
    const collaborations = await CollaborationModel.find({ is_deleted: false })
      .sort({ createdAt: -1 })
      .lean();
    
    // Then separately fetch the related organizations and kitchens
    const organizationIds = collaborations.map(c => c.organization_id);
    const kitchenIds = collaborations.map(c => c.kitchen_id);
    
    const organizations = await Organization.find({
      _id: { $in: organizationIds },
      is_deleted: false
    }).select('organizationName organizationLogo').lean();
    
    const kitchens = await Kitchen.find({
      _id: { $in: kitchenIds },
      is_deleted: false
    }).select('kitchen_name kitchen_image').lean();
    
    // Create lookup maps for easier access
    const orgMap = new Map();
    organizations.forEach(org => {
      orgMap.set(org._id.toString(), org);
    });
    
    const kitchenMap = new Map();
    kitchens.forEach(kitchen => {
      kitchenMap.set(kitchen._id.toString(), kitchen);
    });
    
    // Map the data together
    const formattedCollaborations = collaborations.map(collab => {
      const orgId = collab.organization_id.toString();
      const kitchenId = collab.kitchen_id.toString();
      
      const org = orgMap.get(orgId);
      const kitchen = kitchenMap.get(kitchenId);
      
      return {
        _id: collab._id,
        organization: org ? {
          _id: org._id,
          name: org.organizationName || 'Unknown Organization',
          logo: org.organizationLogo || null
        } : {
          _id: collab.organization_id,
          name: 'Unknown Organization',
          logo: null
        },
        kitchen: kitchen ? {
          _id: kitchen._id,
          name: kitchen.kitchen_name || 'Unknown Kitchen',
          image: kitchen.kitchen_image || null
        } : {
          _id: collab.kitchen_id,
          name: 'Unknown Kitchen',
          image: null
        },
        // status: collab.status,
        createdAt: collab.createdAt,
        updatedAt: collab.updatedAt
      };
    });
    
    res.status(200).json(formattedCollaborations);
  }
  catch(error: any) {
    console.error("Error fetching all collaborations:", error);
    console.error(error.stack);
    res.status(500).json({  
      message: "Internal server error", 
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  } 
};
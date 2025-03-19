import { Request, Response } from "express";
import {
  sendErrorResponse,
  sendSuccessResponse,
} from "../../lib/helpers/responseHelper";
import { HTTP_STATUS_CODE } from "../../lib/constants/httpStatusCodes";
import { ERROR_TYPES } from "../../lib/constants/errorType";
import { CustomError } from "../../lib/errors/customError";
import {
  createAddressAndUpdateModel,
  updateAddress,
} from "../../lib/helpers/addressUpdater";
import Organization from "../../models/organisations/OrgModel";
import PanCardDetails from "../../models/documentations/PanModel";
import GstCertificateDetails from "../../models/documentations/GstModel";
import mongoose from "mongoose";
import Kitchen from "../../models/kitchen/KitchenModel";
import { validateMogooseObjectId } from "../../lib/helpers/validateObjectid";
import { uploadFileToCloudinary } from "../../lib/utils/cloudFileManager";
import { generateOrganizationNotification } from "../notification/notificationController";
import User from "../../models/users/UserModel";
import Address from "../../models/address/AddressModel";
// import { generateOrganizationNotification } from "../notification/notificationController";

const validateOrganizationDetails = (data: any) => {
  const errors: { field: string; message: string }[] = [];

  // PAN Card Validation
  if (!data.panNumber) {
    errors.push({
      field: "panNumber",
      message: "PAN card number is required.",
    });
  } else if (!/^[A-Z]{5}[0-9]{4}[A-Z]{1}$/.test(data.panNumber)) {
    errors.push({
      field: "panNumber",
      message: "Invalid PAN card number.",
    });
  }

  if (!data.panCardUserName) {
    errors.push({
      field: "panCardUserName",
      message: "PAN card user name is required.",
    });
  }

  // GST Validation
  if (!data.gstNumber) {
    errors.push({ field: "gstNumber", message: "GST number is required." });
  } else if (
    !/^\d{2}[A-Z]{5}\d{4}[A-Z]{1}[A-Z\d]{1}[Z]{1}[A-Z\d]{1}$/.test(
      data.gstNumber
    )
  ) {
    errors.push({ field: "gstNumber", message: "Invalid GST number." });
  }

  if (!data.expiryDate) {
    errors.push({
      field: "expiryDate",
      message: "GST expiry date is required.",
    });
  }

  return errors;
};

export const handleCreateNewOrganisation = async (
  req: Request,
  res: Response
): Promise<any> => {
  try {
    const errors = validateOrganizationDetails(req.body);
    if (errors.length > 0) {
      return sendErrorResponse(
        res,
        errors,
        HTTP_STATUS_CODE.BAD_REQUEST,
        ERROR_TYPES.BAD_REQUEST_ERROR
      );
    }

    const {
      organizationName,
      payload,
      managerName,
      registerNumber,
      contactNumber,
      email,
      numberOfEmployees,
      addressType,
      streetAddress,
      district,
      city,
      state,
      pincode,
      country,
      panNumber,
      panCardUserName,
      gstNumber,
      expiryDate,
      category,
      subcategoryName,
    } = req.body;
    let userId = payload.id;
    if (payload.role === "Admin") {
      const user = await User.findOne({ email });
      userId = user?._id;
      if (!user) {
        throw new CustomError(
          "User does not exist.",
          HTTP_STATUS_CODE.NOT_FOUND,
          ERROR_TYPES.NOT_FOUND_ERROR
        );
      }
    }

    const categoryId = category ? new mongoose.Types.ObjectId(category) : null;
    const subcategoryId = subcategoryName
      ? new mongoose.Types.ObjectId(subcategoryName)
      : null;

    // Handle file uploads safely
    const files = req.files as { [fieldname: string]: Express.Multer.File[] };

    const organizationLogoUrl = files?.organizationLogo?.[0]?.buffer
      ? await uploadFileToCloudinary(files.organizationLogo[0].buffer)
      : null;

    // Create new organization with isapproved explicitly set to false
    const newOrg = await Organization.create({
      organizationName,
      user_id: userId,
      managerName,
      register_number: registerNumber,
      contact_number: contactNumber,
      email,
      isapproved: payload.role === "Admin" ? "approved" : "processing",
      no_of_employees: Number(numberOfEmployees),
      category: categoryId,
      subcategoryName: subcategoryId,
      organizationLogo: organizationLogoUrl,
      role: "user",
      is_deleted: false,
    });

    const newOrgId = newOrg._id;

    await createAddressAndUpdateModel(Organization, newOrgId, {
      street_address: streetAddress,
      city,
      state,
      district,
      pincode,
      country,
      address_type: addressType,
      prepared_by_id: newOrgId,
      entity_type: "Organization",
    });

    // Upload GST Certificate Image
    if (files?.gstCertificateImage?.[0]?.buffer) {
      const gstImageUrl = await uploadFileToCloudinary(
        files.gstCertificateImage[0].buffer
      );
      await GstCertificateDetails.create({
        prepared_by_id: newOrgId,
        entity_type: "Organization",
        gst_number: gstNumber,
        gst_certificate_image: gstImageUrl,
        expiry_date: expiryDate,
      });
    }

    // Upload PAN Card Image
    if (files?.panCardImage?.[0]?.buffer) {
      const panImageUrl = await uploadFileToCloudinary(
        files.panCardImage[0].buffer
      );
      await PanCardDetails.create({
        prepared_by_id: newOrgId,
        entity_type: "Organization",
        pan_card_number: panNumber,
        pan_card_user_name: panCardUserName,
        pan_card_image: panImageUrl,
      });
    }
    await generateOrganizationNotification(payload.id, organizationName);

    return sendSuccessResponse(
      res,
      "Organization and associated details created successfully",
      {
        kitchen: newOrg,
      },
      HTTP_STATUS_CODE.OK
    );
  } catch (error) {
    console.error("Error creating organization:", error);
    sendErrorResponse(
      res,
      error,
      HTTP_STATUS_CODE.INTERNAL_SERVER_ERROR,
      ERROR_TYPES.INTERNAL_SERVER_ERROR_TYPE
    );
  }
};

export const handleGetOrganisations = async (
  req: Request,
  res: Response
): Promise<any> => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10;
    const skip = (page - 1) * limit;
    const { search, category, subcategory } = req.query;
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

    // Search organization fields
    if (search && typeof search === "string" && search.trim() !== "") {
      const searchRegex = new RegExp(search.trim(), "i");
      const searchNumber = parseInt(search.trim(), 10);
      matchQuery.$or = [
        { organizationName: { $regex: searchRegex } },
        { managerName: { $regex: searchRegex } },
        { register_number: { $regex: searchRegex } },
        { contact_number: { $regex: searchRegex } },
        { email: { $regex: searchRegex } },
      ];

      if (!isNaN(searchNumber)) {
        matchQuery.$or.push({ no_of_employees: searchNumber });
      }
    }
    // Search address fields by pre-querying Address
    let addressIds: mongoose.Types.ObjectId[] = [];
    if (search && typeof search === "string" && search.trim() !== "") {
      const searchRegex = new RegExp(search.trim(), "i");

      // Query Addresses directly with string fields
      const addressMatch = await Address.find({
        is_deleted: false, // Match your Address model's default
        $or: [
          { street_address: { $regex: searchRegex } },
          { city: { $regex: searchRegex } },
          { state: { $regex: searchRegex } },
          { district: { $regex: searchRegex } },
          { country: { $regex: searchRegex } },
          { pincode: { $regex: searchRegex } },
          { landmark: { $regex: searchRegex } },
          { address_type: { $regex: searchRegex } },
        ],
      }).select("_id");

      addressIds = addressMatch.map(
        (addr) => addr._id as mongoose.Types.ObjectId
      );
      if (addressIds.length > 0) {
        if (matchQuery.$or) {
          matchQuery.$or.push({ address_id: { $in: addressIds } });
        } else {
          matchQuery.address_id = { $in: addressIds };
        }
      }
    }
    const totalOrganizationsBefore = await Organization.countDocuments({
      is_deleted: false,
      isapproved: "approved",
    });
    const totalOrganizations = await Organization.countDocuments(matchQuery);
    const organizations = await Organization.aggregate([
      { $match: matchQuery },
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
          from: "orgcategories",
          localField: "category",
          foreignField: "_id",
          as: "categoryDetails",
        },
      },
      {
        $lookup: {
          from: "orgsubcategories",
          localField: "subcategoryName",
          foreignField: "_id",
          as: "subcategoryDetails",
        },
      },
      {
        $unwind: { path: "$addresses", preserveNullAndEmptyArrays: true },
      },

      {
        $lookup: {
          from: "countries",
          let: { countryName: "$addresses.country" },
          pipeline: [
            { $match: { $expr: { $eq: ["$name", "$$countryName"] } } },
          ],
          as: "countryInfo",
        },
      },
      {
        $lookup: {
          from: "states",
          let: { stateName: "$addresses.state" },
          pipeline: [{ $match: { $expr: { $eq: ["$name", "$$stateName"] } } }],
          as: "stateInfo",
        },
      },
      {
        $lookup: {
          from: "cities",
          let: { cityName: "$addresses.city" },
          pipeline: [{ $match: { $expr: { $eq: ["$name", "$$cityName"] } } }],
          as: "cityInfo",
        },
      },
      {
        $lookup: {
          from: "districts",
          let: { districtName: "$addresses.district" },
          pipeline: [
            { $match: { $expr: { $eq: ["$name", "$$districtName"] } } },
          ],
          as: "districtInfo",
        },
      },
      {
        $group: {
          _id: "$_id",
          user_id: { $first: "$user_id" },
          organizationName: { $first: "$organizationName" },
          managerName: { $first: "$managerName" },
          register_number: { $first: "$register_number" },
          contact_number: { $first: "$contact_number" },
          email: { $first: "$email" },
          organizationLogo: { $first: "$organizationLogo" },
          no_of_employees: { $first: "$no_of_employees" },
          slug: { $first: "$slug" },
          status: { $first: "$status" },
          categoryDetails: {
            $first: {
              $mergeObjects: [
                { $arrayElemAt: ["$categoryDetails", 0] },
                { category_name: "$categoryDetails.category" },
              ],
            },
          },
          subcategoryDetails: {
            $first: {
              $mergeObjects: [
                { $arrayElemAt: ["$subcategoryDetails", 0] },
                { subcategory_name: "$subcategoryDetails.subcategoryName" },
              ],
            },
          },
          addresses: {
            $push: {
              _id: "$addresses._id",
              street_address: "$addresses.street_address",
              city: "$addresses.city", // Keep as string
              city_name: { $arrayElemAt: ["$cityInfo.name", 0] },
              state: "$addresses.state", // Keep as string
              state_name: { $arrayElemAt: ["$stateInfo.name", 0] },
              district: "$addresses.district", // Keep as string
              district_name: { $arrayElemAt: ["$districtInfo.name", 0] },
              pincode: "$addresses.pincode",
              country: "$addresses.country", // Keep as string
              country_name: { $arrayElemAt: ["$countryInfo.name", 0] },
              landmark: "$addresses.landmark",
              address_type: "$addresses.address_type",
            },
          },
        },
      },
      { $skip: skip },
      { $limit: limit },
    ]);

    sendSuccessResponse(
      res,
      "Organizations retrieved successfully!",
      {
        organizations,
        totalPages: Math.ceil(totalOrganizations / limit),
        currentPage: page,
        totalOrganizations,
        hasMore:
          organizations.length === limit &&
          page < Math.ceil(totalOrganizations / limit),
      },
      HTTP_STATUS_CODE.OK
    );
  } catch (error) {
    console.error("Error in handleGetOrganisations:", error);
    sendErrorResponse(
      res,
      error,
      HTTP_STATUS_CODE.INTERNAL_SERVER_ERROR,
      ERROR_TYPES.INTERNAL_SERVER_ERROR_TYPE
    );
  }
};

export const handleGetByIdOrganisations = async (req: Request, res: Response): Promise<any> => {
  try {
    const { orgId } = req.params;
    validateMogooseObjectId(orgId);

    // Fetch raw organization for debugging
    const rawOrg = await Organization.findOne({
      _id: new mongoose.Types.ObjectId(orgId),
      is_deleted: false,
    });
    if (!rawOrg) {
      throw new CustomError(
        "Organization not found",
        HTTP_STATUS_CODE.BAD_REQUEST,
        ERROR_TYPES.BAD_REQUEST_ERROR,
        false
      );
    }

    const organization = await Organization.aggregate([
      {
        $match: {
          _id: new mongoose.Types.ObjectId(orgId),
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
          from: "orgcategories",
          localField: "category",
          foreignField: "_id",
          as: "categoryDetails",
        },
      },
      {
        $lookup: {
          from: "orgsubcategories",
          localField: "subcategoryName",
          foreignField: "_id",
          as: "subcategoryDetails",
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
                    { $eq: ["$entity_type", "Organization"] },
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
          let: { orgId: "$_id" },
          pipeline: [
            {
              $match: {
                $expr: {
                  $and: [
                    { $eq: ["$prepared_by_id", "$$orgId"] },
                    { $eq: ["$entity_type", "Organization"] },
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
      // Debug intermediate results
      {
        $project: {
          organizationName: 1,
          status: 1,
          managerName: 1,
          register_number: 1,
          contact_number: 1,
          email: 1,
          organizationLogo: 1,
          no_of_employees: 1,
          category: 1,
          subcategoryName: 1,
          categoryDetails: 1,
          subcategoryDetails: 1,
          panDetails: 1,
          gstDetails: 1,
          addresses: 1,
          stateInfo: 1,
          cityInfo: 1,
          districtInfo: 1,
          countryInfo: 1,
        },
      },
      {
        $group: {
          _id: "$_id",
          organizationName: { $first: "$organizationName" },
          status: { $first: "$status" },
          managerName: { $first: "$managerName" },
          register_number: { $first: "$register_number" },
          contact_number: { $first: "$contact_number" },
          email: { $first: "$email" },
          organizationLogo: { $first: "$organizationLogo" },
          no_of_employees: { $first: "$no_of_employees" },
          category: {
            $first: {
              $cond: {
                if: { $gt: [{ $size: "$categoryDetails" }, 0] },
                then: {
                  _id: { $arrayElemAt: ["$categoryDetails._id", 0] },
                  category_name: { $arrayElemAt: ["$categoryDetails.category", 0] },
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
                  subcategory_name: { $arrayElemAt: ["$subcategoryDetails.subcategoryName", 0] },
                },
                else: { _id: "$subcategoryName", subcategory_name: null },
              },
            },
          },
          panDetails: { $first: "$panDetails" },
          gstDetails: { $first: "$gstDetails" },
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

    if (!organization || organization.length === 0) {
      throw new CustomError(
        "Organization not found",
        HTTP_STATUS_CODE.BAD_REQUEST,
        ERROR_TYPES.BAD_REQUEST_ERROR,
        false
      );
    }

    sendSuccessResponse(
      res,
      "Organization retrieved successfully!",
      organization[0],
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
export const handleUpdateOrganisations = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const errors = validateOrganizationDetails(req.body);
    if (errors.length > 0) {
      return sendErrorResponse(
        res,
        errors,
        HTTP_STATUS_CODE.BAD_REQUEST,
        ERROR_TYPES.BAD_REQUEST_ERROR
      );
    }
    const orgId = req.params.id;
    const files = req.files as { [fieldname: string]: Express.Multer.File[] };
    const {
      organizationName,
      managerName,
      registerNumber,
      contactNumber,
      email,
      numberOfEmployees,
      addressType,
      streetAddress,
      district,
      city,
      state,
      pincode,
      country,
      panNumber,
      panCardUserName,
      gstNumber,
      expiryDate,
      category,
      subcategoryName,
    } = req.body;

    validateMogooseObjectId(orgId);
    const existingOrg = await Organization.findOne({
      _id: orgId,
      is_deleted: false,
    });

    if (!existingOrg) {
      throw new CustomError(
        "Organization not found",
        HTTP_STATUS_CODE.BAD_REQUEST,
        ERROR_TYPES.BAD_REQUEST_ERROR,
        false
      );
    }

    const organizationLogoUrl = files.organizationLogo
      ? await uploadFileToCloudinary(files.organizationLogo[0].buffer)
      : existingOrg.organizationLogo;

    const panImageUrl = files.panCardImage
      ? await uploadFileToCloudinary(files.panCardImage[0].buffer)
      : req.body.panCardImage;

    const gstImageUrl = files.gstCertificateImage
      ? await uploadFileToCloudinary(files.gstCertificateImage[0].buffer)
      : req.body.gstCertificateImage;

    await Organization.findByIdAndUpdate(
      orgId,
      {
        $set: {
          organizationName,
          managerName,
          register_number: registerNumber,
          contact_number: contactNumber,
          email,
          no_of_employees: Number(numberOfEmployees),
          category: category
            ? new mongoose.Types.ObjectId(category)
            : existingOrg.category,
          subcategoryName: subcategoryName
            ? new mongoose.Types.ObjectId(subcategoryName)
            : existingOrg.subcategoryName,
          organizationLogo: organizationLogoUrl,
        },
      },
      { new: true }
    );

    await updateAddress(Organization, orgId, {
      street_address: streetAddress,
      city,
      state,
      district,
      pincode,
      country,
      address_type: addressType,
      prepared_by_id: orgId,
      entity_type: "Organization",
    });

    // Update or create PAN details
    if (panNumber) {
      const panData = {
        pan_card_number: panNumber,
        pan_card_user_name: panCardUserName,
        pan_card_image: panImageUrl,
        prepared_by_id: orgId,
        entity_type: "Organization",
      };

      await PanCardDetails.findOneAndUpdate(
        {
          prepared_by_id: orgId,
          entity_type: "Organization",
        },
        panData,
        { upsert: true, new: true }
      );
    }

    // Update or create GST details
    if (gstNumber) {
      const gstData = {
        gst_number: gstNumber,
        gst_certificate_image: gstImageUrl,
        expiry_date: expiryDate,
        prepared_by_id: orgId,
        entity_type: "Organization",
      };

      await GstCertificateDetails.findOneAndUpdate(
        {
          prepared_by_id: orgId,
          entity_type: "Organization",
        },
        gstData,
        { upsert: true, new: true }
      );
    }

    const updatedOrg = await Organization.findById(orgId)
      .populate("category")
      .populate("subcategoryName");

    sendSuccessResponse(
      res,
      "Organization updated successfully!",
      updatedOrg,
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

export const handledDeleteOrganisations = async (
  req: Request,
  res: Response
): Promise<any> => {
  try {
    const { orgId } = req.params;
    validateMogooseObjectId(orgId);

    const updatedOrg = await Organization.findByIdAndUpdate(
      orgId,
      { $set: { is_deleted: true } },
      { new: true }
    );
    if (!updatedOrg) {
      throw new CustomError(
        "Organization not found",
        HTTP_STATUS_CODE.BAD_REQUEST,
        ERROR_TYPES.BAD_REQUEST_ERROR,
        false
      );
    }
    sendSuccessResponse(
      res,
      "Organization deleted successfully!",
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

export const organizationToggleStatus = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const organization = await Organization.findById(id);
    if (!organization) {
      throw new CustomError(
        "Organization not found",
        HTTP_STATUS_CODE.NOT_FOUND,
        ERROR_TYPES.NOT_FOUND_ERROR,
        false
      );
    }
    const newStatus = !organization.status;
    const updatedOrganization = await Organization.findByIdAndUpdate(
      id,
      { status: newStatus },
      { new: true }
    );
    sendSuccessResponse(
      res,
      `Organization status ${
        updatedOrganization?.status ? "activated" : "deactivated"
      } successfully`,
      updatedOrganization,
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

export const handleGetUnapprovedOrganisations = async (
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
      matchQuery.organizationName = {
        $regex: new RegExp(search as string, "i"),
      };
    }

    const organizations = await Organization.aggregate([
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
          organizationName: { $first: "$organizationName" },
          managerName: { $first: "$managerName" },
          register_number: { $first: "$register_number" },
          contact_number: { $first: "$contact_number" },
          email: { $first: "$email" },
          organizationLogo: { $first: "$organizationLogo" },
          no_of_employees: { $first: "$no_of_employees" },
          categoryDetails: { $first: "$categoryDetails" },
          subcategoryDetails: { $first: "$subcategoryDetails" },
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

    const totalOrganizations = await Organization.countDocuments(matchQuery);

    sendSuccessResponse(
      res,
      "Unapproved organizations retrieved successfully!",
      {
        organizations,
        totalPages: Math.ceil(totalOrganizations / limit),
        currentPage: page,
        totalOrganizations,
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

export const handleGetUserOrganizations = async (
  req: Request,
  res: Response
): Promise<any> => {
  try {
    const userId = req.body.payload.id;
    const organizations = await Organization.aggregate([
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
          name: "$organizationName",
          address: {
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
          profilePic: "$organizationLogo",
          employees: "$no_of_employees",
          isapproved: "$isapproved",
          slug: "$slug",
          industry: {
            $concatArrays: [
              {
                $ifNull: [
                  { $arrayElemAt: ["$categoryDetails.category", 0] },
                  [],
                ],
              },
              {
                $ifNull: [
                  { $arrayElemAt: ["$subcategoryDetails.subcategoryName", 0] },
                  [],
                ],
              },
            ],
          },
        },
      },
    ]);

    sendSuccessResponse(
      res,
      "User's approved organizations retrieved successfully!",
      { organizations },
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

export const handleAdminApproveOgaisation = async (
  req: Request,
  res: Response
) => {
  try {
    const { id } = req.params;
    const organization = await Organization.findById(id);
    if (!organization) {
      throw new CustomError(
        "Organization not found",
        HTTP_STATUS_CODE.NOT_FOUND,
        ERROR_TYPES.NOT_FOUND_ERROR,
        false
      );
    }
    if (organization.isapproved === "approved") {
      throw new CustomError(
        "Organization already approved",
        HTTP_STATUS_CODE.BAD_REQUEST,
        ERROR_TYPES.BAD_REQUEST_ERROR,
        false
      );
    }
    await Organization.findByIdAndUpdate(
      id,
      { isapproved: "approved" },
      { new: true }
    );
    sendSuccessResponse(
      res,
      "approve Organization created successfully",
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

export const handleSelectKitchen = async (
  req: Request,
  res: Response
): Promise<any> => {
  try {
    const { orgId, kitchenId } = req.body;

    // Validate IDs
    validateMogooseObjectId(orgId);
    validateMogooseObjectId(kitchenId);

    // Check if the organization exists
    const organization = await Organization.findById(orgId);
    if (!organization || organization.is_deleted) {
      throw new CustomError(
        "Organization not found",
        HTTP_STATUS_CODE.NOT_FOUND,
        ERROR_TYPES.NOT_FOUND_ERROR,
        false
      );
    }

    // Check if the kitchen exists
    const kitchen = await Kitchen.findById(kitchenId);
    if (!kitchen || kitchen.is_deleted) {
      throw new CustomError(
        "Kitchen not found",
        HTTP_STATUS_CODE.NOT_FOUND,
        ERROR_TYPES.NOT_FOUND_ERROR,
        false
      );
    }

    // Update the organization with the selected kitchen
    organization.selected_kitchen_id = kitchenId;
    await organization.save();

    sendSuccessResponse(
      res,
      "Kitchen selected successfully!",
      { organization },
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

export const handleGetSelectedKitchen = async (
  req: Request,
  res: Response
): Promise<any> => {
  try {
    const { orgId } = req.params;

    // Validate ID
    validateMogooseObjectId(orgId);

    // Check if the organization exists
    const organization = await Organization.findById(orgId);
    if (!organization || organization.is_deleted) {
      throw new CustomError(
        "Organization not found",
        HTTP_STATUS_CODE.NOT_FOUND,
        ERROR_TYPES.NOT_FOUND_ERROR,
        false
      );
    }

    // Check if a kitchen is selected
    if (!organization.selected_kitchen_id) {
      throw new CustomError(
        "No kitchen selected for this organization",
        HTTP_STATUS_CODE.BAD_REQUEST,
        ERROR_TYPES.BAD_REQUEST_ERROR,
        false
      );
    }

    // Fetch the selected kitchen
    const kitchen = await Kitchen.findById(organization.selected_kitchen_id);
    if (!kitchen || kitchen.is_deleted) {
      throw new CustomError(
        "Selected kitchen not found",
        HTTP_STATUS_CODE.NOT_FOUND,
        ERROR_TYPES.NOT_FOUND_ERROR,
        false
      );
    }

    sendSuccessResponse(
      res,
      "Selected kitchen retrieved successfully!",
      { kitchen },
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

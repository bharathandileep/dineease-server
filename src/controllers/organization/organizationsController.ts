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
import { validateMogooseObjectId } from "../../lib/helpers/validateObjectid";
import { uploadFileToCloudinary } from "../../lib/utils/cloudFileManager";


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
      user_id,
      category,
      subcategoryName,
    } = req.body;

    const categoryId = category ? new mongoose.Types.ObjectId(category) : null;
    const subcategoryId = subcategoryName
      ? new mongoose.Types.ObjectId(subcategoryName)
      : null;

    // Handle file uploads safely
    const files = req.files as { [fieldname: string]: Express.Multer.File[] };

    const organizationLogoUrl = files?.organizationLogo?.[0]?.buffer
      ? await uploadFileToCloudinary(files.organizationLogo[0].buffer)
      : null;

    // Create new Organization entry
    const newOrg = await Organization.create({
      organizationName,
      user_id: new mongoose.Types.ObjectId(user_id),
      managerName,
      register_number: registerNumber,
      contact_number: contactNumber,
      email,
      no_of_employees: Number(numberOfEmployees),
      category: categoryId,
      subcategoryName: subcategoryId,
      organizationLogo: organizationLogoUrl,
      is_deleted: false,
    });

    const newOrgId = newOrg._id;

    // Create Address
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

    return sendSuccessResponse(
      res,
      "Organization and associated details created successfully",
      null,
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
    const { search } = req.query;

    const matchQuery: any = { is_deleted: false };

    if (search) {
      matchQuery.organizationName = { $regex: new RegExp(search as string, "i") };
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
      "Organizations retrieved successfully!",
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


export const handleGetByIdOrganisations = async (
  req: Request,
  res: Response
): Promise<any> => {
  try {
    const { orgId } = req.params;
    validateMogooseObjectId(orgId);

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
      // Group everything back together
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
          category: { $first: { $arrayElemAt: ["$categoryDetails", 0] } },
          subcategoryName: {
            $first: { $arrayElemAt: ["$subcategoryDetails", 0] },
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
    console.log(orgId)
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

export const organizationToggleStatus = async (
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

  
import { Request, Response } from "express";
import { CustomError } from "../../lib/errors/customError";
import { HTTP_STATUS_CODE } from "../../lib/constants/httpStatusCodes";
import { ERROR_TYPES } from "../../lib/constants/errorType";
import {
  sendErrorResponse,
  sendSuccessResponse,
} from "../../lib/helpers/responseHelper";
import { validateMogooseObjectId } from "../../lib/helpers/validateObjectid";
import Designation from "../../models/designation/DesignationModel";
import Address from "../../models/address/AddressModel";
import {
  createAddressAndUpdateModel,
  updateAddress,
} from "../../lib/helpers/addressUpdater";
import { uploadFileToCloudinary } from "../../lib/utils/cloudFileManager";
import mongoose from "mongoose";
import OrgEmployeeManagement from "../../models/empmanagment/OrgEmployeeManagementModel";
import { registerUser } from "../auth/loginsController";
import Role from "../../models/users/RolesModels";


export const getAllEmployeesOfOrg = async (req: Request, res: Response) => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 8;
    const skip = (page - 1) * limit;

    const matchQuery: any = { is_deleted: false };

    // Optional filters for designation and status
    if (req.query.designation) {
      matchQuery.designation = req.query.designation;
    }
    if (req.query.status) {
      matchQuery.status = req.query.status;
    }

    const pipeline: any[] = [
      { $match: matchQuery },
      {
        $lookup: {
          from: "designations",
          localField: "designation",
          foreignField: "_id",
          as: "designation",
        },
      },
      { $unwind: { path: "$designation", preserveNullAndEmptyArrays: true } },
      {
        $lookup: {
          from: "addresses",
          localField: "address_id",
          foreignField: "_id",
          as: "address",
        },
      },
    ];

    // Add search functionality
    if (req.query.search) {
      const searchRegex = new RegExp(req.query.search as string, "i");
      pipeline.push({
        $match: {
          $or: [
            { username: searchRegex },
            { email: searchRegex },
            { phone_number: searchRegex },
            { "designation.designation_name": searchRegex },
          ],
        },
      });
    }

    // Pagination stages
    pipeline.push({ $skip: skip }, { $limit: limit });

    const orgEmployees = await OrgEmployeeManagement.aggregate(pipeline);

    // Count total employees with the same search criteria
    const totalPipeline = [...pipeline];
    totalPipeline.pop(); // Remove $limit
    totalPipeline.pop(); // Remove $skip
    totalPipeline.push({ $count: "total" });

    const totalDocs = await OrgEmployeeManagement.aggregate(totalPipeline);
    const totalEmployees = totalDocs.length > 0 ? totalDocs[0].total : 0;

    sendSuccessResponse(
      res,
      "Employees retrieved successfully",
      {
        orgEmployees,
        totalPages: Math.ceil(totalEmployees / limit),
        currentPage: page,
        totalEmployees,
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

// Create new employee
export const createOrgEmployee = async (req: Request, res: Response) => {
  try {
    const {
      entity_id,
      entity_type = "Admin",
      designation,
      username,
      email,
      phone_number,
      city,
      state,
      district = "",
      pincode,
      country,
      street_address,
      employee_status = "Active",
      aadhar_number,
      pan_number,
    } = req.body;

    const files = req.files as { [fieldname: string]: Express.Multer.File[] };

    // Validate required fields
    if (
      !entity_id ||
      !entity_type ||
      !designation ||
      !username ||
      !email ||
      !phone_number ||
      !employee_status ||
      !aadhar_number ||
      !pan_number
    ) {
      throw new CustomError(
        "All required fields must be provided",
        HTTP_STATUS_CODE.BAD_REQUEST,
        ERROR_TYPES.VALIDATION_ERROR,
        false
      );
    }

    validateMogooseObjectId(entity_id);

    // Fetch and validate designation
    const existingDesignation = await Designation.findById(designation);
    if (!existingDesignation) {
      throw new CustomError(
        "Designation not found",
        HTTP_STATUS_CODE.NOT_FOUND,
        ERROR_TYPES.NOT_FOUND_ERROR,
        false
      );
    }

    // Fetch and validate role based on designation
    const existingRole = await Role.findOne({
      role_name: existingDesignation.role_name,
    });
    if (!existingRole) {
      throw new CustomError(
        "Role not found for the given designation",
        HTTP_STATUS_CODE.NOT_FOUND,
        ERROR_TYPES.NOT_FOUND_ERROR,
        false
      );
    }

    // Check for existing employee
    const existingEmployee = await OrgEmployeeManagement.findOne({ email });
    if (existingEmployee) {
      throw new CustomError(
        "Employee with this email already exists",
        HTTP_STATUS_CODE.BAD_REQUEST,
        ERROR_TYPES.VALIDATION_ERROR,
        false
      );
    }

    // Upload files to Cloudinary
    const profile_picture = await uploadFileToCloudinary(
      files.profile_picture?.[0]?.buffer
    );
    const pan_image = await uploadFileToCloudinary(
      files.pan_image?.[0]?.buffer
    );
    const aadhar_image = await uploadFileToCloudinary(
      files.aadhar_image?.[0]?.buffer
    );

    // Create new employee
    const newEmployee = new OrgEmployeeManagement({
      entity_id,
      entity_type,
      designation,
      username,
      email,
      phone_number,
      role: existingRole.role_id,
      employee_status,
      aadhar_number,
      pan_number,
      profile_picture,
      pan_image,
      aadhar_image,
    });

    const empDetails = await newEmployee.save();
    await createAddressAndUpdateModel(OrgEmployeeManagement, empDetails._id, {
      street_address,
      city,
      state,
      district,
      pincode,
      country,
    });
    await registerUser(email, username, existingRole.role_id, existingRole._id);
    sendSuccessResponse(
      res,
      "Employee created successfully",
      newEmployee,
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

export const getOrgEmployeeById = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    validateMogooseObjectId(id);

    const orgemployees = await OrgEmployeeManagement.aggregate([
      {
        $match: {
          _id: new mongoose.Types.ObjectId(id),
          is_deleted: false,
        },
      },
      {
        $lookup: {
          from: "addresses",
          localField: "address_id",
          foreignField: "_id",
          as: "address",
        },
      },
      {
        $unwind: {
          path: "$address",
          preserveNullAndEmptyArrays: true,
        },
      },
      {
        $lookup: {
          from: "designations",
          localField: "designation",
          foreignField: "_id",
          as: "designation",
        },
      },
      {
        $unwind: {
          path: "$designation",
          preserveNullAndEmptyArrays: true,
        },
      },
    ]);

    if (!orgemployees || orgemployees.length === 0) {
      throw new CustomError(
        "Employee not found",
        HTTP_STATUS_CODE.NOT_FOUND,
        ERROR_TYPES.NOT_FOUND_ERROR,
        false
      );
    }

    sendSuccessResponse(
      res,
      "Employee retrieved successfully",
      orgemployees[0], // Accessing the first element since aggregate returns an array
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

// Update employee
export const updateOrgEmployee = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const updateData = req.body;
    const files = req.files as { [fieldname: string]: Express.Multer.File[] }; 
    validateMogooseObjectId(id);

    // Check if designation exists
    if (updateData.designation) {
      // validateMogooseObjectId(updateData.designation);
      const designationExists = await Designation.findById(
        updateData.designation
      );
      if (!designationExists) {
        throw new CustomError(
          "Designation not found",
          HTTP_STATUS_CODE.NOT_FOUND,
          ERROR_TYPES.NOT_FOUND_ERROR,
          false
        );
      }
    }

    // Fetch the existing employee
    const existingEmployee = await OrgEmployeeManagement.findById(id);
    if (!existingEmployee || existingEmployee.is_deleted) {
      throw new CustomError(
        "Employee not found",
        HTTP_STATUS_CODE.NOT_FOUND,
        ERROR_TYPES.NOT_FOUND_ERROR,
        false
      );
    }

    // Handle profile picture upload (if updated)
    if (files && files.profile_picture) {
      const profile_picture = await uploadFileToCloudinary(
        files.profile_picture[0].buffer
      );
      updateData.profile_picture = profile_picture;
    }
    if (files && files.pan_image) {
      const pan_image = await uploadFileToCloudinary(files.pan_image[0].buffer);
      updateData.pan_image = pan_image;
    }
    if (files && files.aadhar_image) {
      const aadhar_image = await uploadFileToCloudinary(
        files.aadhar_image[0].buffer
      );
      updateData.aadhar_image = aadhar_image;
    }

    // Update address fields (if provided)
    if (
      updateData.street_address ||
      updateData.city ||
      updateData.state ||
      updateData.district ||
      updateData.pincode ||
      updateData.country
    ) {
      await updateAddress(OrgEmployeeManagement, id, {
        street_address: updateData.street_address,
        city: updateData.city,
        state: updateData.state,
        district: updateData.district,
        pincode: updateData.pincode,
        country: updateData.country,
      });
    }

    // Update employee details
    const updatedEmployee = await OrgEmployeeManagement.findByIdAndUpdate(
      id,
      updateData,
      { new: true }
    )
      .populate("designation", "designation_name")
      .populate("address_id", "street city state country");

    if (!updatedEmployee) {
      throw new CustomError(
        "Employee not found",
        HTTP_STATUS_CODE.NOT_FOUND,
        ERROR_TYPES.NOT_FOUND_ERROR,
        false
      );
    }

    sendSuccessResponse(
      res,
      "Employee updated successfully",
      updatedEmployee,
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

// Toggle employee status
export const toggleOrgEmployeeStatus = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    validateMogooseObjectId(id);

    const orgemployees = await OrgEmployeeManagement.findById(id);
    if (!orgemployees) {
      throw new CustomError(
        "Employee not found",
        HTTP_STATUS_CODE.NOT_FOUND,
        ERROR_TYPES.NOT_FOUND_ERROR,
        false
      );
    }

    orgemployees.employee_status =
      orgemployees.employee_status === "Active" ? "Inactive" : "Active";
    await orgemployees.save();

    sendSuccessResponse(
      res,
      `Employee status changed to ${orgemployees.employee_status}`,
      orgemployees,
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

// Soft delete employee
export const deleteOrgEmployee = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    validateMogooseObjectId(id);

    const orgemployees = await OrgEmployeeManagement.findById(id);
    if (!orgemployees) {
      throw new CustomError(
        "Employee not found",
        HTTP_STATUS_CODE.NOT_FOUND,
        ERROR_TYPES.NOT_FOUND_ERROR,
        false
      );
    }

    orgemployees.is_deleted = true;
    await orgemployees.save();

    sendSuccessResponse(
      res,
      "Employee deleted successfully",
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

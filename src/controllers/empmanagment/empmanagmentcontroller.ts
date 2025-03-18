import { Request, Response } from "express";
import { CustomError } from "../../lib/errors/customError";
import { HTTP_STATUS_CODE } from "../../lib/constants/httpStatusCodes";
import { ERROR_TYPES } from "../../lib/constants/errorType";
import {
  sendErrorResponse,
  sendSuccessResponse,
} from "../../lib/helpers/responseHelper";
import { validateMogooseObjectId } from "../../lib/helpers/validateObjectid";
import EmployeeManagement from "../../models/empmanagment/EmployeeManagementModel";
import Designation from "../../models/designation/DesignationModel";
import {
  createAddressAndUpdateModel,
  updateAddress,
} from "../../lib/helpers/addressUpdater";
import { uploadFileToCloudinary } from "../../lib/utils/cloudFileManager";
import mongoose from "mongoose";
import Role from "../../models/users/RolesModels";
import { registerUser } from "../auth/loginsController";

// Get all employees
export const getAllEmployees = async (req: Request, res: Response) => {
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

    pipeline.push({ $skip: skip }, { $limit: limit });

    const employees = await EmployeeManagement.aggregate(pipeline);
    const totalPipeline = [...pipeline];
    totalPipeline.pop();
    totalPipeline.pop();
    totalPipeline.push({ $count: "total" });

    const totalDocs = await EmployeeManagement.aggregate(totalPipeline);
    const totalEmployees = totalDocs.length > 0 ? totalDocs[0].total : 0;

    sendSuccessResponse(
      res,
      "Employees retrieved successfully",
      {
        employees,
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
export const createEmployee = async (req: Request, res: Response) => {
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

    // Fetch Designation
    const existingDesignation = await Designation.findById(designation);
    if (!existingDesignation) {
      throw new CustomError(
        "Designation not found",
        HTTP_STATUS_CODE.NOT_FOUND,
        ERROR_TYPES.NOT_FOUND_ERROR,
        false
      );
    }

    // Fetch Role using the role_name from the Designation
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

    // Check if employee already exists
    const existingEmployee = await EmployeeManagement.findOne({ email });
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

 
    const newEmployee = new EmployeeManagement({
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

    await createAddressAndUpdateModel(EmployeeManagement, empDetails._id, {
      street_address,
      city,
      state,
      district,
      pincode,
      country,
    });
    await registerUser(email,username,existingRole.role_id,existingRole._id)
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

export const getEmployeeById = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    validateMogooseObjectId(id);

    const employee = await EmployeeManagement.aggregate([
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
      {
        $lookup: {
          from: "states",
          let: { stateId: { $toInt: "$address.state" } },
          pipeline: [{ $match: { $expr: { $eq: ["$id", "$$stateId"] } } }],
          as: "stateInfo",
        },
      },
      {
        $lookup: {
          from: "cities",
          let: { cityId: { $toInt: "$address.city" } },
          pipeline: [{ $match: { $expr: { $eq: ["$id", "$$cityId"] } } }],
          as: "cityInfo",
        },
      },
      {
        $lookup: {
          from: "districts",
          let: { districtId: { $toInt: "$address.district" } },
          pipeline: [{ $match: { $expr: { $eq: ["$id", "$$districtId"] } } }],
          as: "districtInfo",
        },
      },
      {
        $lookup: {
          from: "countries",
          let: { countryId: { $toInt: "$address.country" } },
          pipeline: [{ $match: { $expr: { $eq: ["$id", "$$countryId"] } } }],
          as: "countryInfo",
        },
      },
      {
        $project: {
          _id: 1,
          entity_id: 1,
          entity_type: 1,
          designation: "$designation.designation_name",
          username: 1,
          email: 1,
          phone_number: 1,
          employee_status: 1,
          aadhar_number: 1,
          pan_number: 1,
          profile_picture: 1,
          pan_image: 1,
          aadhar_image: 1,
          address: {
            _id: "$address._id",
            street_address: "$address.street_address",
            city: { $arrayElemAt: ["$cityInfo.name", 0] },
            state: { $arrayElemAt: ["$stateInfo.name", 0] },
            district: { $arrayElemAt: ["$districtInfo.name", 0] },
            pincode: "$address.pincode",
            country: { $arrayElemAt: ["$countryInfo.name", 0] },
          },
        },
      },
    ]);

    if (!employee || employee.length === 0) {
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
      employee[0], 
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
export const updateEmployee = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const updateData = req.body;
    const files = req.files as { [fieldname: string]: Express.Multer.File[] };
    validateMogooseObjectId(id);

    // Check if designation exists
    if (updateData.designation) {
      const designationExists = await Designation.findById(updateData.designation);
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
    const existingEmployee = await EmployeeManagement.findById(id);
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
      const profile_picture = await uploadFileToCloudinary(files.profile_picture[0].buffer);
      updateData.profile_picture = profile_picture;
    }
    if (files && files.pan_image) {
      const pan_image = await uploadFileToCloudinary(files.pan_image[0].buffer);
      updateData.pan_image = pan_image;
    }
    if (files && files.aadhar_image) {
      const aadhar_image = await uploadFileToCloudinary(files.aadhar_image[0].buffer);
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
      await updateAddress(EmployeeManagement, id, {
        street_address: updateData.street_address,
        city: updateData.city,
        state: updateData.state,
        district: updateData.district,
        pincode: updateData.pincode,
        country: updateData.country,
      });
    }

    // Update employee details
    const updatedEmployee = await EmployeeManagement.findByIdAndUpdate(
      id,
      updateData,
      { new: true }
    )
      .populate("designation", "designation_name")
      .populate({
        path: "address_id",
        select: "street_address city state district pincode country",
      });

    if (!updatedEmployee) {
      throw new CustomError(
        "Employee not found",
        HTTP_STATUS_CODE.NOT_FOUND,
        ERROR_TYPES.NOT_FOUND_ERROR,
        false
      );
    }

    // Fetch address details with names for city, state, district, and country
    const employeeWithAddress = await EmployeeManagement.aggregate([
      {
        $match: {
          _id: new mongoose.Types.ObjectId(id),
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
          from: "states",
          let: { stateId: { $toInt: "$address.state" } },
          pipeline: [{ $match: { $expr: { $eq: ["$id", "$$stateId"] } } }],
          as: "stateInfo",
        },
      },
      {
        $lookup: {
          from: "cities",
          let: { cityId: { $toInt: "$address.city" } },
          pipeline: [{ $match: { $expr: { $eq: ["$id", "$$cityId"] } } }],
          as: "cityInfo",
        },
      },
      {
        $lookup: {
          from: "districts",
          let: { districtId: { $toInt: "$address.district" } },
          pipeline: [{ $match: { $expr: { $eq: ["$id", "$$districtId"] } } }],
          as: "districtInfo",
        },
      },
      {
        $lookup: {
          from: "countries",
          let: { countryId: { $toInt: "$address.country" } },
          pipeline: [{ $match: { $expr: { $eq: ["$id", "$$countryId"] } } }],
          as: "countryInfo",
        },
      },
      {
        $project: {
          _id: 1,
          entity_id: 1,
          entity_type: 1,
          designation: 1,
          username: 1,
          email: 1,
          phone_number: 1,
          employee_status: 1,
          aadhar_number: 1,
          pan_number: 1,
          profile_picture: 1,
          pan_image: 1,
          aadhar_image: 1,
          address: {
            _id: "$address._id",
            street_address: "$address.street_address",
            city: { $arrayElemAt: ["$cityInfo.name", 0] },
            state: { $arrayElemAt: ["$stateInfo.name", 0] },
            district: { $arrayElemAt: ["$districtInfo.name", 0] },
            pincode: "$address.pincode",
            country: { $arrayElemAt: ["$countryInfo.name", 0] },
          },
        },
      },
    ]);

    if (!employeeWithAddress || employeeWithAddress.length === 0) {
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
      employeeWithAddress[0], // Send the first element of the array
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
export const toggleEmployeeStatus = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    validateMogooseObjectId(id);

    const employee = await EmployeeManagement.findById(id);
    if (!employee) {
      throw new CustomError(
        "Employee not found",
        HTTP_STATUS_CODE.NOT_FOUND,
        ERROR_TYPES.NOT_FOUND_ERROR,
        false
      );
    }

    employee.employee_status =
      employee.employee_status === "Active" ? "Inactive" : "Active";
    await employee.save();

    sendSuccessResponse(
      res,
      `Employee status changed to ${employee.employee_status}`,
      employee,
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
export const deleteEmployee = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    validateMogooseObjectId(id);

    const employee = await EmployeeManagement.findById(id);
    if (!employee) {
      throw new CustomError(
        "Employee not found",
        HTTP_STATUS_CODE.NOT_FOUND,
        ERROR_TYPES.NOT_FOUND_ERROR,
        false
      );
    }

    employee.is_deleted = true;
    await employee.save();

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

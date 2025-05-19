import { Request, Response } from "express";
import { CustomError } from "../../lib/errors/customError";
import { HTTP_STATUS_CODE } from "../../lib/constants/httpStatusCodes";
import { ERROR_TYPES } from "../../lib/constants/errorType";
import {
  sendErrorResponse,
  sendSuccessResponse,
} from "../../lib/helpers/responseHelper";
import { validateMogooseObjectId } from "../../lib/helpers/validateObjectid";
import Designation from "../../models/designation/designationModel";
import {
  createAddressAndUpdateModel,
  getFullAddressById,
  updateAddress,
} from "../../lib/helpers/addressUpdater";
import {
  deleteFromCloudinary,
  uploadFileToCloudinary,
} from "../../lib/utils/cloudFileManager";
import mongoose from "mongoose";
import RolesAndAccess from "../../models/users/rolesAndAccessModel";
import AdminEmployeeManagement from "../../models/empmanagment/AdminEmployeeModel";
import { registerUser } from "../auth/loginsController";
import User from "../../models/users/UserModel";

export const handleGetAdminAllEmployees = async (
  req: Request,
  res: Response
) => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 8;
    const skip = (page - 1) * limit;

    const matchQuery: any = { is_deleted: false };

    if (req.query.designation) {
      matchQuery.designation = new mongoose.Types.ObjectId(
        req.query.designation as string
      );
    }

    if (req.query.status) {
      matchQuery.status = req.query.status === "true";
    }
    const pipeline: any[] = [{ $match: matchQuery }];
    if (req.query.search) {
      const searchRegex = new RegExp(req.query.search as string, "i");
      pipeline.push({
        $match: {
          $or: [
            { fullName: searchRegex },
            { email: searchRegex },
            { phone_number: searchRegex },
            { roleName: searchRegex },
          ],
        },
      });
    }

    pipeline.push({ $skip: skip }, { $limit: limit });

    const employees = await AdminEmployeeManagement.aggregate(pipeline);

    const employeesWithAddresses = employees.map((emp) => ({
      ...emp,
      addresses: emp.address || [],
    }));

    const totalPipeline = pipeline.slice(0, -2);
    totalPipeline.push({ $count: "total" });

    const totalDocs = await AdminEmployeeManagement.aggregate(totalPipeline);
    const totalEmployees = totalDocs.length > 0 ? totalDocs[0].total : 0;

    sendSuccessResponse(
      res,
      "Employees retrieved successfully",
      {
        employees: employeesWithAddresses,
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
export const createAdminEmployee = async (req: Request, res: Response) => {
  try {
    const {
      entity_id,
      entity_type,
      roleName,
      roleId,
      fullName,
      email,
      phone_number,
      city,
      state,
      district,
      pincode,
      country,
      street_address,
      aadhar_number,
      pan_number,
    } = req.body;

    const files = req.files as { [fieldname: string]: Express.Multer.File[] };

    if (
      !roleName ||
      !fullName ||
      !email ||
      !phone_number ||
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

    const existingEmployee = await AdminEmployeeManagement.findOne({ email });
    if (existingEmployee) {
      throw new CustomError(
        "Employee with this email already exists",
        HTTP_STATUS_CODE.BAD_REQUEST,
        ERROR_TYPES.VALIDATION_ERROR,
        false
      );
    }

    const profile_picture = await uploadFileToCloudinary(
      files.profile_picture?.[0]?.buffer
    );
    const pan_image = await uploadFileToCloudinary(
      files.pan_image?.[0]?.buffer
    );
    const aadhar_image = await uploadFileToCloudinary(
      files.aadhar_image?.[0]?.buffer
    );

    const existingRole = await RolesAndAccess.findById(roleId);
    if (!existingRole) {
      throw new CustomError(
        "Role not found",
        HTTP_STATUS_CODE.NOT_FOUND,
        ERROR_TYPES.NOT_FOUND_ERROR,
        false
      );
    }

    const newEmployee = new AdminEmployeeManagement({
      entity_id,
      entity_type,
      roleName,
      fullName,
      email,
      phone_number,
      roleId,
      aadhar_number,
      pan_number,
      profile_picture,
      pan_image,
      aadhar_image,
    });

    const empDetails = await newEmployee.save();

    await createAddressAndUpdateModel(AdminEmployeeManagement, empDetails._id, {
      street_address,
      city,
      state,
      district,
      pincode,
      country,
    });

    await registerUser(email, fullName, roleId);

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
export const getAdminEmployeeById = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    validateMogooseObjectId(id);

    const employee = await AdminEmployeeManagement.findById(id).lean();

    if (!employee || employee?.is_deleted) {
      throw new CustomError(
        "Employee not found",
        HTTP_STATUS_CODE.NOT_FOUND,
        ERROR_TYPES.NOT_FOUND_ERROR,
        false
      );
    }

    const address = await getFullAddressById(employee?.address_id?.[0]);

    const employeeWithAddress = {
      ...employee,
      address,
    };

    sendSuccessResponse(
      res,
      "Employee retrieved successfully",
      employeeWithAddress,
      HTTP_STATUS_CODE.OK
    );
  } catch (error) {
    console.error("Error in getEmployeeById:", error);
    sendErrorResponse(
      res,
      error,
      HTTP_STATUS_CODE.INTERNAL_SERVER_ERROR,
      ERROR_TYPES.INTERNAL_SERVER_ERROR_TYPE
    );
  }
};
export const updateAdminEmployee = async (req: Request, res: Response) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const { id } = req.params;
    const updateData = req.body;
    const files = req.files as { [fieldname: string]: Express.Multer.File[] };

    validateMogooseObjectId(id);

    const existingEmployee = await AdminEmployeeManagement.findById(id);
    if (!existingEmployee || existingEmployee.is_deleted) {
      throw new CustomError(
        "Employee not found",
        HTTP_STATUS_CODE.NOT_FOUND,
        ERROR_TYPES.NOT_FOUND_ERROR,
        false
      );
    }

    // Handle designation & role change
    if (
      updateData.designation &&
      existingEmployee.roleName !== updateData.designation
    ) {
      const matchingRole = await RolesAndAccess.findOne({
        entityId: updateData.entity_id,
        entityType: updateData.entity_type,
        roleName: updateData.designation,
      });

      if (!matchingRole) {
        throw new CustomError(
          "Role not found for given designation",
          HTTP_STATUS_CODE.NOT_FOUND,
          ERROR_TYPES.NOT_FOUND_ERROR,
          false
        );
      }

      updateData.roleName = matchingRole.roleName;
      updateData.roleId = matchingRole._id;
    }

    // Handle file uploads (not in DB transaction)
    if (files?.profile_picture) {
      if (existingEmployee.profile_picture) {
        await deleteFromCloudinary(existingEmployee.profile_picture);
      }
      updateData.profile_picture = await uploadFileToCloudinary(
        files.profile_picture[0].buffer
      );
    }

    if (files?.pan_image) {
      if (existingEmployee.pan_image) {
        await deleteFromCloudinary(existingEmployee.pan_image);
      }
      updateData.pan_image = await uploadFileToCloudinary(
        files.pan_image[0].buffer
      );
    }

    if (files?.aadhar_image) {
      if (existingEmployee.aadhar_image) {
        await deleteFromCloudinary(existingEmployee.aadhar_image);
      }
      updateData.aadhar_image = await uploadFileToCloudinary(
        files.aadhar_image[0].buffer
      );
    }

    // Update address (outside DB transaction)
    if (
      updateData.street_address ||
      updateData.city ||
      updateData.state ||
      updateData.district ||
      updateData.pincode ||
      updateData.country
    ) {
      if (existingEmployee.address_id?.length > 0) {
        await updateAddress(AdminEmployeeManagement, id, {
          street_address: updateData.street_address,
          city: updateData.city,
          state: updateData.state,
          district: updateData.district,
          pincode: updateData.pincode,
          country: updateData.country,
        });
      }
    }
    const updatedEmployee = await AdminEmployeeManagement.findByIdAndUpdate(
      id,
      updateData,
      { new: true, session }
    );

    if (!updatedEmployee) {
      throw new CustomError(
        "Employee not found after update",
        HTTP_STATUS_CODE.NOT_FOUND,
        ERROR_TYPES.NOT_FOUND_ERROR,
        false
      );
    }
    const userData = await User.findOne({
      email: updatedEmployee.email,
    }).session(session);
    if (updateData.roleId) {
      await User.findOneAndUpdate(
        userData?._id,
        { role_id: updateData.roleId },
        { session }
      );
    }

    await session.commitTransaction();
    session.endSession();

    sendSuccessResponse(
      res,
      "Employee updated successfully",
      updatedEmployee,
      HTTP_STATUS_CODE.OK
    );
  } catch (error) {
    await session.abortTransaction();
    session.endSession();
    console.error("Error in updateAdminEmployee:", error);
    sendErrorResponse(
      res,
      error,
      HTTP_STATUS_CODE.INTERNAL_SERVER_ERROR,
      ERROR_TYPES.INTERNAL_SERVER_ERROR_TYPE
    );
  }
};
export const toggleAdminEmployeeStatus = async (
  req: Request,
  res: Response
) => {
  try {
    const { id } = req.params;
    validateMogooseObjectId(id);

    const employee = await AdminEmployeeManagement.findById(id);
    if (!employee) {
      throw new CustomError(
        "Employee not found",
        HTTP_STATUS_CODE.NOT_FOUND,
        ERROR_TYPES.NOT_FOUND_ERROR,
        false
      );
    }

    employee.employee_status = !employee.employee_status;
    await employee.save();

    sendSuccessResponse(
      res,
      `Employee status changed to ${
        employee.employee_status ? "Active" : "Inactive"
      }`,
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
export const deleteAdminEmployee = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    validateMogooseObjectId(id);

    const employee = await AdminEmployeeManagement.findById(id);
    if (!employee || employee.is_deleted) {
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

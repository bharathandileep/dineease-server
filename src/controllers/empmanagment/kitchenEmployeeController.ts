import { Request, Response } from "express";
import {
  sendErrorResponse,
  sendSuccessResponse,
} from "../../lib/helpers/responseHelper";
import { HTTP_STATUS_CODE } from "../../lib/constants/httpStatusCodes";
import { ERROR_TYPES } from "../../lib/constants/errorType";
import { registerUser } from "../auth/loginsController";
import {
  createAddressAndUpdateModel,
  getFullAddressById,
  updateAddress,
} from "../../lib/helpers/addressUpdater";
import {
  deleteFromCloudinary,
  uploadFileToCloudinary,
} from "../../lib/utils/cloudFileManager";
import { CustomError } from "../../lib/errors/customError";
import kitchenEmployeeManagement from "../../models/empmanagment/KitchenEmployeeModel";
import RolesAndAccess from "../../models/users/rolesAndAccessModel";
import { validateMogooseObjectId } from "../../lib/helpers/validateObjectid";
import mongoose from "mongoose";
import { Console } from "console";

export const handleCreateNewKitchenEmployee = async (
  req: Request,
  res: Response
) => {
  try {
    const {
      kitchen_id,
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
    const existingEmployee = await kitchenEmployeeManagement.findOne({ email });
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
    const newEmployee = new kitchenEmployeeManagement({
      kitchen_id,
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
    await createAddressAndUpdateModel(
      kitchenEmployeeManagement,
      empDetails._id,
      {
        street_address,
        city,
        state,
        district,
        pincode,
        country,
      }
    );
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
export const getkitchenEmployeeById = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    validateMogooseObjectId(id);
    const employee = await kitchenEmployeeManagement.findById(id);
    const address = await getFullAddressById(employee?.address_id[0]);

    if (!employee) {
      throw new CustomError(
        "Employee not found",
        HTTP_STATUS_CODE.NOT_FOUND,
        ERROR_TYPES.NOT_FOUND_ERROR,
        false
      );
    }
    const employeeWithAddress = {
      ...employee.toObject(),
      address,
    };

    sendSuccessResponse(
      res,
      "Employee retrieved successfully",
      employeeWithAddress,
      HTTP_STATUS_CODE.OK
    );
  } catch (error) {
    console.error("Error in getOrgEmployeeById:", error);
    sendErrorResponse(
      res,
      error,
      HTTP_STATUS_CODE.INTERNAL_SERVER_ERROR,
      ERROR_TYPES.INTERNAL_SERVER_ERROR_TYPE
    );
  }
};
export const getKitchenAllEmployees = async (req: Request, res: Response) => {
  try {
    const { kitchenId } = req.params;
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 8;
    const skip = (page - 1) * limit;

    const matchQuery: any = {
      kitchen_id: new mongoose.Types.ObjectId(kitchenId),
      is_deleted: false,
    };

    if (req.query.status) {
      matchQuery.employee_status = req.query.status === "true";
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

    const kitchenEmployees = await kitchenEmployeeManagement.aggregate(
      pipeline
    );
    const employeesWithAddresses = await Promise.all(
      kitchenEmployees.map(async (emp) => {
        const resolvedAddresses = await Promise.all(
          (emp.address_id || []).map(
            async (addrId: mongoose.Types.ObjectId) => {
              try {
                return await getFullAddressById(addrId.toString());
              } catch {
                return null;
              }
            }
          )
        );

        return {
          ...emp,
          addresses: resolvedAddresses.filter(Boolean),
        };
      })
    );

    const totalPipeline = pipeline.slice(0, -2);
    totalPipeline.push({ $count: "total" });

    const totalDocs = await kitchenEmployeeManagement.aggregate(totalPipeline);
    const totalEmployees = totalDocs.length > 0 ? totalDocs[0].total : 0;

    sendSuccessResponse(
      res,
      "Employees retrieved successfully",
      {
        kitchenEmployees: employeesWithAddresses,
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
export const updateKitchenEmployee = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const updateData = req.body;
    const files = req.files as { [fieldname: string]: Express.Multer.File[] };

    validateMogooseObjectId(id);

    const existingEmployee = await kitchenEmployeeManagement.findById(id);
    if (!existingEmployee || existingEmployee.is_deleted) {
      throw new CustomError(
        "Employee not found",
        HTTP_STATUS_CODE.NOT_FOUND,
        ERROR_TYPES.NOT_FOUND_ERROR,
        false
      );
    }

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

    // Profile Picture
    if (files?.profile_picture) {
      if (existingEmployee.profile_picture) {
        await deleteFromCloudinary(existingEmployee.profile_picture);
      }
      updateData.profile_picture = await uploadFileToCloudinary(
        files.profile_picture[0].buffer
      );
    }

    // PAN Image
    if (files?.pan_image) {
      if (existingEmployee.pan_image) {
        await deleteFromCloudinary(existingEmployee.pan_image);
      }
      updateData.pan_image = await uploadFileToCloudinary(
        files.pan_image[0].buffer
      );
    }

    // Aadhar Image
    if (files?.aadhar_image) {
      if (existingEmployee.aadhar_image) {
        await deleteFromCloudinary(existingEmployee.aadhar_image);
      }
      updateData.aadhar_image = await uploadFileToCloudinary(
        files.aadhar_image[0].buffer
      );
    }

    // Address update (first address only)
    if (
      updateData.street_address ||
      updateData.city ||
      updateData.state ||
      updateData.district ||
      updateData.pincode ||
      updateData.country
    ) {
      if (existingEmployee.address_id?.length > 0) {
        const firstAddressId = existingEmployee.address_id[0].toString();
        await updateAddress(kitchenEmployeeManagement, id, {
          street_address: updateData.street_address,
          city: updateData.city,
          state: updateData.state,
          district: updateData.district,
          pincode: updateData.pincode,
          country: updateData.country,
        });
      }
    }

    const updatedEmployee = await kitchenEmployeeManagement
      .findByIdAndUpdate(id, updateData, { new: true })
      .populate("address_id", "street city state country");

    if (!updatedEmployee) {
      throw new CustomError(
        "Employee not found after update",
        HTTP_STATUS_CODE.NOT_FOUND,
        ERROR_TYPES.NOT_FOUND_ERROR,
        false
      );
    }

    sendSuccessResponse(
      res,
      "Kitchen employee updated successfully",
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
export const deleteKitchenEmployee = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    validateMogooseObjectId(id);

    const kitchenEmployee = await kitchenEmployeeManagement.findById(id);
    if (!kitchenEmployee || kitchenEmployee.is_deleted) {
      throw new CustomError(
        "Kitchen employee not found",
        HTTP_STATUS_CODE.NOT_FOUND,
        ERROR_TYPES.NOT_FOUND_ERROR,
        false
      );
    }

    kitchenEmployee.is_deleted = true;
    await kitchenEmployee.save();

    sendSuccessResponse(
      res,
      "Kitchen employee deleted successfully",
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
export const toggleKitchenEmployeeStatus = async (
  req: Request,
  res: Response
) => {
  try {
    const { id } = req.params;
    validateMogooseObjectId(id);

    const kitchenEmployee = await kitchenEmployeeManagement.findById(id);
    if (!kitchenEmployee) {
      throw new CustomError(
        "Employee not found",
        HTTP_STATUS_CODE.NOT_FOUND,
        ERROR_TYPES.NOT_FOUND_ERROR,
        false
      );
    }

    kitchenEmployee.employee_status = !kitchenEmployee.employee_status;
    await kitchenEmployee.save();

    sendSuccessResponse(
      res,
      `Employee status changed to ${
        kitchenEmployee.employee_status ? "Active" : "Inactive"
      }`,
      kitchenEmployee,
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

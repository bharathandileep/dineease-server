import { Request, Response } from "express";
import { CustomError } from "../../lib/errors/customError";
import { HTTP_STATUS_CODE } from "../../lib/constants/httpStatusCodes";
import { ERROR_TYPES } from "../../lib/constants/errorType";
import {
  sendErrorResponse,
  sendSuccessResponse,
} from "../../lib/helpers/responseHelper";
import mongoose from "mongoose";
import RolesAndAccess from "../../models/users/rolesAndAccessModel";

export const getRolesByEntity = async (req: Request, res: Response) => {
  try {
    const { entity_id, entity_type } = req.query;

    if (!entity_id || !entity_type) {
      throw new CustomError(
        "Entity ID and Entity Type are required",
        HTTP_STATUS_CODE.BAD_REQUEST,
        ERROR_TYPES.BAD_REQUEST_ERROR,
        false
      );
    }
    const roles = await RolesAndAccess.find({
      entityId: entity_id,
      entityType: entity_type,
    }).sort({ createdAt: -1 });

    sendSuccessResponse(
      res,
      "Roles fetched successfully",
      roles,
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
export const getRoleAndAccessById = async (req: Request, res: Response) => {
  try {
    const { roleId } = req.params;

    if (!roleId) {
      throw new CustomError(
        "Entity ID and Entity Type are required",
        HTTP_STATUS_CODE.BAD_REQUEST,
        ERROR_TYPES.BAD_REQUEST_ERROR,
        false
      );
    }
    const roles = await RolesAndAccess.findById(roleId);
    if (!roles) {
      throw new CustomError(
        "No role found",
        HTTP_STATUS_CODE.BAD_REQUEST,
        ERROR_TYPES.BAD_REQUEST_ERROR,
        false
      );
    }

    sendSuccessResponse(
      res,
      "Roles fetched successfully",
      roles,
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
export const createRoleAndAccess = async (req: Request, res: Response) => {
  try {
    const {
      entityId,
      entityType,
      roleName,
      permissions = {},
      hasFullAccess = false,
      isDefault = false,
    } = req.body;
    const createdBy = "67a1083b3c9f01a384e9683c";
    if (!entityType || !entityId || !roleName) {
      throw new CustomError(
        "entityType, entityId, and roleName are required",
        HTTP_STATUS_CODE.BAD_REQUEST,
        ERROR_TYPES.BAD_GATEWAY_ERROR,
        false
      );
    }

    if (!["Admin", "Organization", "Kitchen"].includes(entityType)) {
      throw new CustomError(
        "Invalid entityType. Must be one of Admin, Organization, or Kitchen.",
        HTTP_STATUS_CODE.BAD_REQUEST,
        ERROR_TYPES.BAD_GATEWAY_ERROR,
        false
      );
    }
    for (const [resource, actions] of Object.entries(permissions)) {
      if (!Array.isArray(actions)) {
        throw new CustomError(
          `Permissions for ${resource} must be an array`,
          HTTP_STATUS_CODE.BAD_REQUEST,
          ERROR_TYPES.BAD_GATEWAY_ERROR,
          false
        );
      }

      for (const action of actions) {
        if (!["view", "add", "edit", "delete"].includes(action)) {
          throw new CustomError(
            `Invalid action '${action}' for ${resource}. Must be one of view, add, edit, delete.`,
            HTTP_STATUS_CODE.BAD_REQUEST,
            ERROR_TYPES.BAD_GATEWAY_ERROR,
            false
          );
        }
      }
    }
    const existingRole = await RolesAndAccess.findOne({
      entityType,
      entityId: new mongoose.Types.ObjectId(entityId),
      roleName: roleName.trim(),
    });

    if (existingRole) {
      const arePermissionsSame =
        JSON.stringify(existingRole.permissions) ===
        JSON.stringify(permissions);

      if (arePermissionsSame) {
        throw new CustomError(
          `Role '${roleName}' already exists with the same permissions for this entity.`,
          HTTP_STATUS_CODE.BAD_REQUEST,
          ERROR_TYPES.CONFLICT_ERROR,
          false
        );
      } else {
        existingRole.permissions = permissions;
        existingRole.hasFullAccess = hasFullAccess;
        existingRole.isDefault = isDefault;
        await existingRole.save();

        return sendSuccessResponse(
          res,
          `Role '${roleName}' permissions updated successfully`,
          existingRole,
          HTTP_STATUS_CODE.OK
        );
      }
    }

    const newRole = await RolesAndAccess.create({
      entityType,
      entityId: new mongoose.Types.ObjectId(entityId),
      createdBy,
      roleName: roleName.trim(),
      permissions,
      hasFullAccess,
      isDefault,
    });

    sendSuccessResponse(
      res,
      "Role created successfully",
      newRole,
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
export const updateRoleName = async (req: Request, res: Response) => {
  try {
    const { roleName } = req.body;
    const { roleId } = req.params;
    const existingRole = await RolesAndAccess.findById(roleId);

    if (!existingRole) {
      sendSuccessResponse(
        res,
        `Role '${roleName}' can't find, try after sometime!`,
        existingRole,
        HTTP_STATUS_CODE.OK
      );
    }
    if (existingRole) {
      existingRole.roleName = roleName;
      await existingRole.save();
    }
    return sendSuccessResponse(
      res,
      `Role '${roleName}'updated successfully`,
      existingRole,
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

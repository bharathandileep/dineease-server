import mongoose, { Document, Model, Schema } from "mongoose";

export type EntityType = "Admin" | "Organization" | "Kitchen";
export type PermissionType = "view" | "add" | "edit" | "delete";
export type Permissions = Record<string, PermissionType[]>;

export interface IRolesAndAccess extends Document {
  entityType: EntityType;
  entityId: mongoose.Types.ObjectId;
  createdBy: mongoose.Types.ObjectId;
  roleName: string;
  permissions: Permissions; // Changed to object format
  hasFullAccess: boolean;
  isDefault: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const rolesAndAccessSchema: Schema<IRolesAndAccess> =
  new Schema<IRolesAndAccess>(
    {
      entityType: {
        type: String,
        enum: ["Admin", "SuperAdmin", "Organization", "Kitchen"],
        required: true,
      },
      entityId: {
        type: mongoose.Schema.Types.ObjectId,
        refPath: "entityType",
      },
      createdBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
      },
      roleName: {
        type: String,
        required: true,
        trim: true,
      },
      permissions: {
        type: Schema.Types.Mixed,
        default: {},
      },
      hasFullAccess: {
        type: Boolean,
        default: false,
      },
      isDefault: {
        type: Boolean,
        default: false,
      },
    },
    { timestamps: true }
  );

const RolesAndAccess: Model<IRolesAndAccess> = mongoose.model<IRolesAndAccess>(
  "RolesAndAccess",
  rolesAndAccessSchema
);

export default RolesAndAccess;

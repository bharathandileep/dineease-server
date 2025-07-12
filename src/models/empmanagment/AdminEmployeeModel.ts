import mongoose, { Document, Model, Schema } from "mongoose";
import { CommonDBInterface } from "../../lib/interfaces/DBinterfaces";
import { boolean } from "joi";

export interface IAdminEmployeeManagement extends Document, CommonDBInterface {
  entity_id: mongoose.Types.ObjectId;
  employee_id: mongoose.Types.ObjectId;
  roleName: string;
  slug: string;
  entity_type: string;
  fullName: string;
  email: string;
  phone_number: string;
  address_id: mongoose.Types.ObjectId[];
  role: string;
  employee_status: boolean;
  aadhar_number: string;
  pan_number: string;
  profile_picture: string;
  pan_image: string;
  aadhar_image: string;
  roleId: mongoose.Types.ObjectId;
}

export const AdminEmployeeManagementSchema: Schema =
  new Schema<IAdminEmployeeManagement>(
    {
      entity_id: {
        type: mongoose.Schema.Types.ObjectId,
        required: true,
        refPath: "entity_type",
      },
      entity_type: {
        type: String,
        required: true,
        enum: ["Kitchen", "Organization", "Admin"],
      },
      fullName: { type: String, required: true },
      email: { type: String, required: true, unique: true },
      phone_number: { type: String, required: true },
      roleName: {
        type: String,
        required: true,
      },
      address_id: [
        {
          type: mongoose.Schema.Types.ObjectId,
          ref: "Address",
          required: true,
        },
      ],
      roleId: {
        type: mongoose.Schema.Types.ObjectId,
        required: true,
        ref: "rolesandaccesses",
      },
      employee_status: { type: Boolean, required: true, default: true },
      aadhar_number: { type: String, required: true },
      pan_image: { type: String, default: null },
      pan_number: { type: String, required: true },
      profile_picture: { type: String, default: null },
      aadhar_image: { type: String, default: null },
      is_deleted: {
        type: Boolean,
        default: false,
      },
    },
    { timestamps: true }
  );

const AdminEmployeeManagement: Model<IAdminEmployeeManagement> =
  mongoose.model<IAdminEmployeeManagement>(
    "AdminEmployeeManagement",
    AdminEmployeeManagementSchema
  );

export default AdminEmployeeManagement;

import mongoose, { Document, Model, Schema } from "mongoose";
import { CommonDBInterface } from "../../lib/interfaces/DBinterfaces";

export interface IOrgEmployeeManagement extends Document, CommonDBInterface {
  entity_id: mongoose.Types.ObjectId;
  employee_id: mongoose.Types.ObjectId;
  roleName: string;
  slug: string;

  entity_type: string;
  fullName: string;
  email: string;
  phone_number: string;
  address_id: mongoose.Types.ObjectId[];
  roleId: mongoose.Types.ObjectId;
  employee_status: string;
  aadhar_number: string;
  pan_number: string;
  profile_picture: string;
  pan_image: string;
  aadhar_image: string;
}
export const OrgEmployeeManagementSchema: Schema =
  new Schema<IOrgEmployeeManagement>(
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
      roleName: {
        type: String,
        required: true,
      },
      fullName: { type: String, required: true },
      email: { type: String, required: true, unique: true },
      phone_number: { type: String, required: true },
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
      employee_status: { type: String, required: true },
      aadhar_number: { type: String, required: true },
      pan_number: { type: String, required: true },
      pan_image: { type: String, default: null },
      aadhar_image: { type: String, required: true },
      profile_picture: { type: String, default: null },
      is_deleted: {
        type: Boolean,
        default: false,
      },
    },
    { timestamps: true }
  );
const   OrgEmployeeManagement: Model<IOrgEmployeeManagement> =
  mongoose.model<IOrgEmployeeManagement>(
    "OrgEmployeeManagement",
    OrgEmployeeManagementSchema
  );

export default OrgEmployeeManagement;

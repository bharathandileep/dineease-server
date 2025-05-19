import mongoose, { Document, Model, Schema } from "mongoose";
import { CommonDBInterface } from "../../lib/interfaces/DBinterfaces";

export interface IKitchenEmployeeManagement
  extends Document,
    CommonDBInterface {
  kitchen_id: mongoose.Types.ObjectId;
  employee_id: mongoose.Types.ObjectId;
  roleName: string;
  slug: string;

  entity_type: string;
  fullName: string;
  email: string;
  phone_number: string;
  address_id: mongoose.Types.ObjectId[];
  roleId: mongoose.Types.ObjectId;
  employee_status: boolean;
  aadhar_number: string;
  pan_number: string;
  profile_picture: string;
  pan_image: string;
  aadhar_image: string;
}
export const kitchenEmployeeManagementSchema: Schema =
  new Schema<IKitchenEmployeeManagement>(
    {
      kitchen_id: {
        type: mongoose.Schema.Types.ObjectId,
        required: true,
        refPath: "Kitchen",
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
      employee_status: { type: Boolean, required: true, default: true },
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
const kitchenEmployeeManagement: Model<IKitchenEmployeeManagement> =
  mongoose.model<IKitchenEmployeeManagement>(
    "kitchenEmployeeManagement",
    kitchenEmployeeManagementSchema
  );

export default kitchenEmployeeManagement;

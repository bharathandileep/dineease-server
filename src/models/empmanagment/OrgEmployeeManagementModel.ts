import mongoose, { Document, Model, Schema } from "mongoose";
import { CommonDBInterface } from "../../lib/interfaces/DBinterfaces";

export interface IOrgEmployeeManagement extends Document, CommonDBInterface {
  entity_id: mongoose.Types.ObjectId;
  employee_id: mongoose.Types.ObjectId;
  designation: mongoose.Types.ObjectId;
  entity_type: String;
  username: string;
  email: string;
  phone_number: string;
  address_id: mongoose.Types.ObjectId;
  role: string;
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
      designation: {
        type: mongoose.Schema.Types.ObjectId,
        required: true,
        ref: "designation",
      },
      username: { type: String, required: true },
      email: { type: String, required: true, unique: true },
      phone_number: { type: String, required: true },
      address_id: [
        {
          type: mongoose.Schema.Types.ObjectId,
          ref: "Address",
          required: true,
        },
      ],
      role: { type: String },
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

const OrgEmployeeManagement: Model<IOrgEmployeeManagement> =
  mongoose.model<IOrgEmployeeManagement>(
    "OrgEmployeeManagement",
    OrgEmployeeManagementSchema
  );
export default OrgEmployeeManagement;

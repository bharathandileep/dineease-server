import mongoose, { Model, Schema, Document } from "mongoose";
import { CommonDBInterface } from "../../lib/interfaces/DBinterfaces";

export interface IRole extends Document, CommonDBInterface {
  role_id: number;
  role_name: string;
  created_by: mongoose.Schema.Types.ObjectId;
  permission: number;
}

export const RoleSchema: Schema = new Schema<IRole>(
  {
    role_id: { type: Number, required: true, unique: true },
    role_name: { type: String, required: true },
    created_by: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
    permission: { type: Number, required: true, default: 0 },
    
  },
  { timestamps: true }
);

const Role: Model<IRole> = mongoose.model<IRole>("Role", RoleSchema);
export default Role;  

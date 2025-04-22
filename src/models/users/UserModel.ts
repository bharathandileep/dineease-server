import mongoose, { Model, Schema } from "mongoose";
import { CommonDBInterface } from "../../lib/interfaces/DBinterfaces";

export interface IUser extends Document, CommonDBInterface {
  fullName: string;
  userName: string;
  email: string;
  phone_number: string;
  profile_photo?: string;
  is_email_verified: boolean;
  role_id: mongoose.Types.ObjectId;
}

export const UserSchema: Schema = new Schema<IUser>(
  {
    fullName: { type: String, required: true },
    email: { type: String, unique: true, sparse: true },
    phone_number: { type: String, unique: true, sparse: true },
    profile_photo: { type: String, default: null },
    is_deleted: { type: Boolean, default: false },
    is_email_verified: { type: Boolean, default: false },
    role_id: { type: mongoose.Schema.Types.ObjectId, ref: "Role" },
  },
  { timestamps: true }
);

const User: Model<IUser> = mongoose.model<IUser>("User", UserSchema);
export default User;

import mongoose, { Model, Schema, Document } from "mongoose";
import { CommonDBInterface } from "../../lib/interfaces/DBinterfaces";
import { boolean } from "joi";

export interface ILogin extends Document, CommonDBInterface {
  fullName: string;
  username: string;
  email: string;
  profile_photo?: string;
  password: string;
  role_id: mongoose.Schema.Types.ObjectId;
  status:boolean
  role:string
}

export const LoginSchema: Schema = new Schema<ILogin>(
  {
    username: { type: String, required: true },
    email: { type: String, required: true },
    password: { type: String, required: true },
    status:{type:Boolean,default:true},
    role_id:{type:mongoose.Schema.Types.ObjectId,ref:"Role"},
    is_deleted: { type: Boolean, default: false },
  },
  { timestamps: true }
);

const Logins: Model<ILogin> = mongoose.model<ILogin>("Logins", LoginSchema);
export default Logins;

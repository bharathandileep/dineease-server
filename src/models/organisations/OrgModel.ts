import mongoose, { Schema, Document, Model } from "mongoose";
import { CommonDBInterface } from "../../lib/interfaces/DBinterfaces";
import { string } from "joi";

export interface IOrganization extends Document, CommonDBInterface {
  user_id: mongoose.Types.ObjectId;
  address_id: mongoose.Types.ObjectId;
  organizationName: string;
  category:mongoose.Schema.Types.ObjectId;
  subcategoryName:mongoose.Schema.Types.ObjectId;
  managerName: string;
  register_number: string;
  location: string;
  contact_number: string;
  email: string;
  no_of_employees: number;
  organizationLogo: string;
  status:boolean  
}

export const OrganizationSchema: Schema<IOrganization> =
  new Schema<IOrganization>(
    {
      user_id: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        required: true,
      },
      address_id: [
        {
          type: mongoose.Schema.Types.ObjectId,
          ref: "Address",
          required: true,
        },
      ],
      category:{
        type:mongoose.Schema.Types.ObjectId,
        ref:"OrgCategory",
        required:true,
      },
      subcategoryName:{
        type:mongoose.Schema.Types.ObjectId,
        ref:"OrgSubcategory",
        required:true,
      },
      organizationName: {
        type: String,
        required: true,
      },
      organizationLogo: {
        type: String,
      },
      managerName: {
        type: String,
      },
      register_number: {
        type: String,
        required: true,
        unique: true,
      },
      contact_number: {
        type: String,
        required: true,
      },
      email: {
        type: String,
        required: true,
        unique: true,
      },
      no_of_employees: {
        type: Number,
        required: true,
      },
      is_deleted: {
        type: Boolean,
        default: false,
      },
      status:{
        type:Boolean,
        default:true
      }
    },
    { timestamps: true }
  );

const Organization: Model<IOrganization> = mongoose.model<IOrganization>(
  "Organization",
  OrganizationSchema
);
export default Organization;

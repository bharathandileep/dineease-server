import mongoose, { Schema, Document, Model } from "mongoose";
import { CommonDBInterface } from "../../lib/interfaces/DBinterfaces";
import { string } from "joi";
import { strict } from "assert";


export interface IOrganization extends Document, CommonDBInterface {
  user_id: mongoose.Types.ObjectId;
  address_id: mongoose.Types.ObjectId;
  organizationName: string;
  category: mongoose.Schema.Types.ObjectId;
  subcategoryName: mongoose.Schema.Types.ObjectId;
  managerName: string;
  register_number: string;
  location: string;
  isapproved: string;
  contact_number: string;
  email: string;
  no_of_employees: number;
  organizationLogo: string;
  status: boolean;
  slug: string; 
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
      category: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "OrgCategory",
        required: true,
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
      slug: {
        type: String,
        unique: true,
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
      status: {
        type: Boolean,
        default: true,
      },
      isapproved: {
        type: String,
        enum: ["processing", "rejected", "approved"],
        default: "processing",
      },
    },
    { timestamps: true }
  );

// Pre-save middleware to generate unique slug
OrganizationSchema.pre<IOrganization>("save", async function(next) {
  if (!this.isModified("organizationName") && this.slug) {
    return next();
  }
  let baseSlug = this.organizationName
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
  
  let slug = baseSlug;
  let count = 0;
  let slugExists = true;
  
  while (slugExists) {
    const slugToCheck = count === 0 ? slug : `${baseSlug}-${count}`;
    const Organization = mongoose.model("Organization");
    const existing = await Organization.findOne({
      slug: slugToCheck,
      user_id: this.user_id,
      _id: { $ne: this._id }
    });
    
    if (!existing) {
      slug = slugToCheck;
      slugExists = false;
    } else {
      count++;
    }
  }
  
  this.slug = slug;
  next();
});

const Organization: Model<IOrganization> = mongoose.model<IOrganization>(
  "Organization",
  OrganizationSchema
);
export default Organization; 

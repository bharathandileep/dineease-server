import mongoose, { Document, Model, Schema } from "mongoose";
import { CommonDBInterface } from "../../lib/interfaces/DBinterfaces";

export interface IKitchen extends Document, CommonDBInterface {
  kitchen_name: string;
  isapproved: string;
  kitchen_owner_name: string;
  address_id: mongoose.Types.ObjectId;
  owner_email: string;
  category: mongoose.Schema.Types.ObjectId;
  subcategoryName: mongoose.Schema.Types.ObjectId;
  owner_phone_number: string;
  restaurant_type: string;
  kitchen_type: "Veg" | "Non-Veg" | "Both";
  kitchen_phone_number: string;
  kitchen_document_verification: boolean;
  opens_at: string;
  closes_at: string;
  working_days: string[];
  kitchen_image: string;
  pre_ordering_options: string[];
  user_id: mongoose.Types.ObjectId;
  status: boolean;
  slug: string;
}

export const KitchenSchema: Schema = new Schema<IKitchen>({
  kitchen_name: { type: String, required: true },
  slug: { type: String, unique: true },
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
  isapproved: {
    type: String,
    enum: ["processing", "rejected", "approved"],
    default: "processing",
  },
  kitchen_owner_name: { type: String, required: true },
  owner_email: { type: String, required: true },
  category: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "KitchenCategory",
    required: true,
  },
  subcategoryName: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "KitchenSubcategory",
    required: true,
  },
  owner_phone_number: { type: String, required: true },
  restaurant_type: { type: String, required: true },
  kitchen_type: {
    type: String,
    required: true,
    enum: ["Veg", "Non-Veg", "Both"],
  },
  kitchen_phone_number: { type: String, required: true },
  kitchen_document_verification: {
    type: Boolean,
    default: false,
  },
  is_deleted: {
    type: Boolean,
    default: false,
  },
  kitchen_image: { type: String, required: true },
  working_days: [
    {
      day: { type: String, required: true },
      is_open: { type: Boolean, required: true, default: false },
      open_time: { type: String }, 
      close_time: { type: String }, 
      status: { type: Boolean, required: true, default: true },
    },
  ],
  pre_ordering_options: [
    {
      day: { type: String }, 
      meal_type: {
        type: String,
        enum: ["breakfast", "lunch", "tea", "dinner"],
        required: true,
      },
      pre_order_start_time: { type: String, required: true }, 
      pre_order_close_time: { type: String, required: true }, 
      delivery_time: { type: String, required: false }, 
      status: { type: Boolean, required: true, default: true },
    },
  ],
  status: {
    type: Boolean,
    default: true,
  },
});


KitchenSchema.pre<IKitchen>("save", async function(next) {
  if (!this.isModified("kitchen_name") && this.slug) {
    return next();
  }
  let baseSlug = this.kitchen_name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
  
  let slug = baseSlug;
  let count = 0;
  let slugExists = true;
  
  while (slugExists) {
    const slugToCheck = count === 0 ? slug : `${baseSlug}-${count}`;
    const Kitchen = mongoose.model("Kitchen");
    const existing = await Kitchen.findOne({
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

const Kitchen: Model<IKitchen> = mongoose.model<IKitchen>(
  "Kitchen",
  KitchenSchema
);
export default Kitchen;
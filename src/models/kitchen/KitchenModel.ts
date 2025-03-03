import mongoose, { Document, Model, Schema } from "mongoose";
import { CommonDBInterface } from "../../lib/interfaces/DBinterfaces";

export interface IKitchen extends Document, CommonDBInterface {
  kitchen_name: string;
  kitchen_status: string;
  kitchen_owner_name: string;
  address_id: mongoose.Types.ObjectId;
  owner_email: string;
  category:mongoose.Schema.Types.ObjectId;
  subcategoryName:mongoose.Schema.Types.ObjectId;
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
  status:boolean
}

export const KitchenSchema: Schema = new Schema<IKitchen>({
  kitchen_name: { type: String, required: true },
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
  kitchen_status: { type: String, required: true },
  kitchen_owner_name: { type: String, required: true },
  owner_email: { type: String, required: true },
  category:{
    type:mongoose.Schema.Types.ObjectId,
    ref:"KitchenCategory",
    required:true,
  },
  subcategoryName:{
     type:mongoose.Schema.Types.ObjectId,
     ref:"KitchenSubcategory",
     required:true,
  },
  owner_phone_number: { type: String, required: true },
  restaurant_type: { type: String, required: true },
  kitchen_type: {
    type: String, 
    required: true,   
    enum: ["Veg", "Non-Veg","Both"],
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
    },
  ],
  pre_ordering_options: [
    {
      meal_type: { type: String, required: true },
      pre_order_start_time: { type: String, required: true },
      pre_order_close_time: { type: String, required: true },
      delivery_time: { type: String, required: true },
    },
  ],
  status:{
    type:Boolean,
    default:true
  }
});

const Kitchen: Model<IKitchen> = mongoose.model<IKitchen>(
  "Kitchen",
  KitchenSchema
);
export default Kitchen;

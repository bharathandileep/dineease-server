import mongoose, { Schema, Document, model, Model } from "mongoose";

interface IAddOn extends Document {
  id: string;
  title: string;
  items: string[];
  required: boolean;
  multiSelect: boolean;
}

export interface IMenuItem extends Document {
  kitchen_id: mongoose.Types.ObjectId;
  category: string;
  name: string;
  mealTypes: string[];
  foodType: "veg" | "non-veg" | "egg";
  image: string;
  description: string;
  ingredients: string[];
  basicprice: number;
  orgPirce: number;
  tags: string[];
  addOns: IAddOn[];
  status: "approved" | "rejected" | "pending";
}

const AddOnSchema = new Schema<IAddOn>({
  id: { type: String, required: true },
  title: { type: String, required: true },
  items: { type: [String], default: [] },
  required: { type: Boolean, default: false },
  multiSelect: { type: Boolean, default: false },
});

const MenuItemSchema = new Schema<IMenuItem>(
  {
    kitchen_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Kitchen",
      required: true,
    },
    category: { type: String, required: true },
    name: { type: String, required: true },
    mealTypes: [{ type: String, required: true }],
    foodType: {
      type: String,
      enum: ["veg", "non-veg", "egg"],
      required: true,
    },
    image: { type: String, required: true },
    description: { type: String },
    ingredients: [{ type: String }],
    basicprice: { type: Number, required: true },
    orgPirce: { type: Number, required: true },
    tags: [{ type: String }],
    addOns: [AddOnSchema],
    status: {
      type: String,
      enum: ["approved", "rejected", "pending"],
    },
  },
  { timestamps: true }
);

const MenuItem = model<IMenuItem>("MenuItem", MenuItemSchema);
export default MenuItem;

import mongoose, { Schema, Document, Model } from "mongoose";

export interface IKitchenMenuItem extends Document {
  kitchen_id: mongoose.Types.ObjectId;
  base_menu_item: mongoose.Types.ObjectId;

  name?: string;
  price_for_org: number;
  price_for_user: number;
  image?: string;
  ingredients?: string[];

  category?: mongoose.Types.ObjectId;
  subcategory?: mongoose.Types.ObjectId;

  is_active: boolean;
  created_at: Date;
  updated_at: Date;
  tags: string[];
}

const KitchenMenuItemSchema: Schema = new Schema<IKitchenMenuItem>(
  {
    kitchen_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Kitchen",
      required: true,
    },
    base_menu_item: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "MenuItem",
      required: true,
    },

    name: { type: String },
    price_for_org: { type: Number, required: true },
    price_for_user: { type: Number, required: true },
    image: { type: String },
    ingredients: [{ type: String }],
    category: { type: mongoose.Schema.Types.ObjectId, ref: "MenuCategory" },
    subcategory: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "MenuSubcategory",
    },
    tags: [{ type: String }],
    is_active: { type: Boolean, default: true },
  },
  { timestamps: { createdAt: "created_at", updatedAt: "updated_at" } }
);

const KitchenMenuItem: Model<IKitchenMenuItem> =
  mongoose.model<IKitchenMenuItem>("KitchenMenuItem", KitchenMenuItemSchema);

export default KitchenMenuItem;

import mongoose, { Schema, Document, Model } from "mongoose";

export interface IMenuItem extends Document {
  name: string;
  description?: string;
  type: "veg" | "non-veg";
  tags: string[];
  created_by: "admin";
  is_active: boolean;
  created_at: Date;
  updated_at: Date;
}

const MenuItemSchema: Schema = new Schema<IMenuItem>(
  {
    name: { type: String, required: true },
    description: { type: String },
    type: { type: String, enum: ["veg", "non-veg"], required: true },
    tags: [{ type: String }],
    created_by: { type: String, enum: ["admin"], default: "admin" },
    is_active: { type: Boolean, default: true }, 
  },
  { timestamps: { createdAt: "created_at", updatedAt: "updated_at" } }
);

const MenuItem: Model<IMenuItem> = mongoose.model<IMenuItem>(
  "MenuItem",
  MenuItemSchema
);
export default MenuItem;

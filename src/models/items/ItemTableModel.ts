import mongoose, { Document, Model, Schema } from "mongoose";
import { CommonDBInterface } from "../../lib/interfaces/DBinterfaces";
import slugify from "slugify";

export interface IItem extends Document, CommonDBInterface {
  item_name: string;
  category: mongoose.Schema.Types.ObjectId;
  slug: string; // Add slug field
  subcategory: mongoose.Schema.Types.ObjectId;
  status: boolean;
  item_image: string;
  item_description: string;
}
export const ItemSchema: Schema = new Schema<IItem>(
  {
    item_name: { type: String, required: true },
    category: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "MenuCategory",
      required: true,
    },
    slug: { type: String, unique: true }, // Slug field

    subcategory: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "MenuSubcategory",
      required: true,
    },
    status: { type: Boolean, required: true, default: true },
    item_image: { type: String, default: null },
    item_description: { type: String, required: true },
    is_deleted: {
      type: Boolean,
      default: false,
    },
  },
  { timestamps: true }
);

ItemSchema.pre<IItem>("save", async function (next) {
  if (!this.isModified("item_name") && this.slug) {
    return next();
  }

  let baseSlug = this.item_name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");

  let slug = baseSlug;
  let count = 0;
  let slugExists = true;

  while (slugExists) {
    const slugToCheck = count === 0 ? slug : `${baseSlug}-${count}`;
    const Item = mongoose.model("Item");
    const existing = await Item.findOne({
      slug: slugToCheck,
      _id: { $ne: this._id }, // Ensure we're not checking against itself
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

const Item: Model<IItem> = mongoose.model<IItem>("Item", ItemSchema);
export default Item;

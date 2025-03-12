import mongoose, { Schema, Document, Model } from "mongoose";
import { CommonDBInterface } from "../../lib/interfaces/DBinterfaces";
import { boolean } from "joi";
import slugify from "slugify";

export interface IMenu extends Document, CommonDBInterface {
  kitchen_id: mongoose.Types.ObjectId;
  items_id: {
    item_id: mongoose.Types.ObjectId;
    item_name: string;
    item_price?: string;
    slug?: string;
    custom_image?: string;
    isAvailable: boolean;
    reviews_id: any[];
    description: string;
    ingredients?: string;
  }[];
  slug: string; // Add slug field
  menu_image: string;
  // item_type: "vegetarian" | "non-vegetarian" | "vegan" | "mixed";
  delivery_time: number;
  reviews_id: mongoose.Types.ObjectId[];
  is_deleted: boolean;
}

export const MenuSchema: Schema<IMenu> = new Schema(
  {
    kitchen_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Kitchen",
      required: true,
    },
    items_id: [
      {
        item_id: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "Item",
          required: true,
        },
        item_name: {
          type: String,
        },
        slug: { type: String, unique: true }, // Slug field

        item_price: {
          type: String,
        },
        isAvailable: {
          type: Boolean,
          default: true,
        },
        description: {
          type: String,
        },
        ingredients: {
          type: [String],
          default: [],
        },
        custom_image: {
          type: String,
        },
        reviews_id: [
          {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Review",
          },
        ],
      },
    ],
    menu_image: {
      type: String,
    },
    is_deleted: {
      type: Boolean,
      default: false,
    },
  },
  { timestamps: true }
);
MenuSchema.pre<IMenu>("save", async function (next) {
  if (this.isModified("items_id")) {
    for (const item of this.items_id) {
      if (item.item_name) {
        let slug = slugify(item.item_name, { lower: true, strict: true });

        // Check if the slug already exists
        const count = await (this.constructor as typeof mongoose.Model).countDocuments({ "items_id.slug": slug });
        if (count > 0) {
          slug = `${slug}-${Math.random().toString(36).substring(2, 7)}`; // Append a random string to make it unique
        }

        item.slug = slug;
      }
    }
  }
  next();
});

const Menu: Model<IMenu> = mongoose.model<IMenu>("Menu", MenuSchema);
export default Menu;

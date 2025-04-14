import mongoose, { Document, Model, Schema } from "mongoose";
import { CommonDBInterface } from "../../lib/interfaces/DBinterfaces";

export interface ICollaborationMethods {
  softDelete(): Promise<void>;
}

export interface ICollaboration extends Document, CommonDBInterface {
  organization_id: mongoose.Types.ObjectId;
  kitchen_id: mongoose.Types.ObjectId;
  is_deleted: boolean;

  // Quotation fields
  quotation_date?: Date;
  meal_type?: string;
  meal_count?: number;
  rate_per_meal?: number;
  discount_offer?: string;
  payment_terms?: string;
  contract_duration?: string;
  additional_notes?: string;
  terms_and_conditions?: string;
}

interface CollaborationModel extends Model<ICollaboration, {}, ICollaborationMethods> {}

const CollaborationSchema = new Schema<ICollaboration, CollaborationModel, ICollaborationMethods>(
  {
    organization_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Organization",
      required: true,
    },
    kitchen_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Kitchen",
      required: true,
    },
    is_deleted: {
      type: Boolean,
      default: false,
    },

    // Appended quotation fields
    quotation_date: { type: Date },
    meal_type: { type: String },
    meal_count: { type: Number },
    rate_per_meal: { type: Number },
    discount_offer: { type: String },
    payment_terms: { type: String },
    contract_duration: { type: String },
    additional_notes: { type: String },
    terms_and_conditions: { type: String },
  },
  { timestamps: true }
);

CollaborationSchema.method("softDelete", async function () {
  this.is_deleted = true;
  await this.save();
});

const Collaboration = mongoose.model<ICollaboration, CollaborationModel>(
  "Collaboration",
  CollaborationSchema
);

export default Collaboration;

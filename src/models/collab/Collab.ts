import mongoose, { Document, Model, Schema } from "mongoose";
import { CommonDBInterface } from "../../lib/interfaces/DBinterfaces";

export interface ICollaboration extends Document, CommonDBInterface {
  organization_id: mongoose.Types.ObjectId; // Reference to the Organization
  kitchen_id: mongoose.Types.ObjectId; // Reference to the Kitchen
//   start_date: Date; // Start date of the collaboration
//   end_date: Date; // End date of the collaboration
  status: string; // Status of the collaboration (e.g., "Pending", "Active", "Completed", "Cancelled")
}

export const CollaborationSchema: Schema<ICollaboration> = new Schema(
  {
    organization_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Organization", // Reference to the Organization model
      required: true,
    },
    kitchen_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Kitchen", // Reference to the Kitchen model
      required: true,
    },
    // start_date: {
    //   type: Date,
    //   required: true,
    // },
    // end_date: {
    //   type: Date,
    //   required: true,
    // },
    status: {
      type: String,
      enum: ["Pending", "Active", "Completed", "Cancelled"], // Allowed status values
      default: "Pending", // Default status
    },
    is_deleted: {
      type: Boolean,
      default: false, // Soft delete flag
    },
  },
  { timestamps: true } // Automatically add createdAt and updatedAt fields
);

const Collaboration: Model<ICollaboration> = mongoose.model<ICollaboration>(
  "Collaboration",
  CollaborationSchema
);

export default Collaboration;
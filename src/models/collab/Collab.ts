


import mongoose, { Document, Model, Schema } from "mongoose";
import { CommonDBInterface } from "../../lib/interfaces/DBinterfaces";

export interface ICollaborationMethods {
  softDelete(): Promise<void>;
}

export interface ICollaboration extends Document, CommonDBInterface {
  organization_id: mongoose.Types.ObjectId;
  kitchen_id: mongoose.Types.ObjectId;
  // status: "Pending" | "Active" | "Completed" | "Cancelled";
  is_deleted: boolean;
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
    // status: {
    //   type: String,
    //   enum: ["Pending", "Active", "Completed", "Cancelled"],
    //   default: "Active", 
    // },
    is_deleted: {
      type: Boolean,
      default: false,
    },
  },
  { timestamps: true }
);

CollaborationSchema.method("softDelete", async function () {
  this.is_deleted = true;
  await this.save();
});

const Collaboration = mongoose.model<ICollaboration, CollaborationModel>("Collaboration", CollaborationSchema);

export default Collaboration;

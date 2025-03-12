import mongoose, { Document, Model, Schema } from "mongoose";
import { CommonDBInterface } from "../../lib/interfaces/DBinterfaces";

export interface INotificationMethods {
  viewAndSoftDelete(): Promise<void>;
}

export interface INotification extends Document, CommonDBInterface {
  user_id: mongoose.Types.ObjectId;
  message: string;
  type: string;
  status: "unread" | "read";
  viewed_at?: Date; 
  is_deleted: boolean; 
}

interface NotificationModel extends Model<INotification, {}, INotificationMethods> {}

const NotificationSchema = new Schema<INotification, NotificationModel, INotificationMethods>(
  {
    user_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    message: { type: String, required: true },
    type: {
      type: String,
      required: true,
      enum: ["kitchen", "organization", "general", "order", "payment"],
    },
    status: { type: String, enum: ["unread", "read"], default: "unread" },
    viewed_at: { type: Date, default: null },
    is_deleted: { type: Boolean, default: false }, 
  },
  { timestamps: true } 
);


NotificationSchema.method("viewAndSoftDelete", async function () {
  this.status = "read";
  this.viewed_at = new Date();
  this.is_deleted = true; 
  await this.save();
});

const Notification = mongoose.model<INotification, NotificationModel>("Notification", NotificationSchema);

export default Notification; 

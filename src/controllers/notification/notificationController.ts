import { Request, Response } from "express";
import NotificationModel, { INotification } from "../../models/notification/Notification";
import mongoose from "mongoose";

export const generateKitchenNotification = async (userId: any, kitchenName: string) => {
    try {
      const notification: INotification = new NotificationModel({
        user_id: new mongoose.Types.ObjectId(userId),
        message: `A new kitchen '${kitchenName}' has been created!`,
        type: "kitchen",
      });
  
      await notification.save();
      console.log("Notification generated successfully.");
    } catch (error: any) {
      console.error("Error generating notification:", error.message);
    }
  };

export const getUserNotifications = async (req: Request, res: Response):Promise<void> => {
  try {
    const { userId } = req.params;

    if (!mongoose.Types.ObjectId.isValid(userId)) {
      res.status(400).json({ message: "Invalid user ID" });
    }

    const notifications = await NotificationModel.find({ user_id: userId }).sort({ createdAt: -1 });

     res.status(200).json(notifications);
  } catch (error: any) {
    console.error("Error fetching notifications:", error.message);
     res.status(500).json({ message: "Internal server error" });
  }
};

export const getNotificationById = async (req: Request, res: Response): Promise<void> => {
    try {
        const { notificationId } = req.params;
        console.log("Notification ID:", notificationId);
       if (!mongoose.Types.ObjectId.isValid(notificationId)) {
            res.status(400).json({ message: "Invalid notification ID" });
            return;
        } 
        const notification = await NotificationModel.findById(notificationId);
        console.log("Notification:", notification);

        if (!notification) {
            res.status(404).json({ message: "Notification not found" });
            return;
        }
        res.status(200).json(notification);
    } catch (error: any) {
        console.error("Error fetching notification:", error);
        res.status(500).json({ message: "Internal server error" });
    } 
}; 

export const getAllNotifications = async (req: Request, res: Response): Promise<void> => {
    try {
        const notifications = await NotificationModel.find().sort({ createdAt: -1 });
        res.status(200).json(notifications);
    } catch (error: any) {
        console.error("Error fetching all notifications:", error.message);
        res.status(500).json({ message: "Internal server error" });
    }
};


export const generateOrganizationNotification = async (userId: any, organizationName: string) => {
  try {
    const notification: INotification = new NotificationModel({
      user_id: new mongoose.Types.ObjectId(userId),
      message: `A new organization '${organizationName}' has been created!`,
      type: "organization",
    });

    await notification.save();
    console.log("Notification generated successfully.");
  } catch (error: any) {
    console.error("Error generating notification:", error.message);
  }
};



import express,{Application,Router}from "express";
import { apiConfig } from "../../config/endpoint ";
import upload from "../../lib/helpers/uploadMiddleware";
import { authorizationAccess } from "../../middleware/TokenValidation";

import { getAllNotifications, getNotificationById, getUserNotifications} from "../../controllers/notification/notificationController";

const router = express.Router();
router.get(`${apiConfig.notification.getUserNotifications}`,getUserNotifications);
router.get(`${apiConfig.notification.getNotificationById
}`,getNotificationById);
router.get(`${apiConfig.notification.getAllNotifications}`,
    authorizationAccess,
    getAllNotifications)

export default router; 
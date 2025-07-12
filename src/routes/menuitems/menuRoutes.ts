import express from "express";
import { apiConfig } from "../../config/endpoint ";
import upload from "../../lib/helpers/uploadMiddleware";
import { createMenuItem } from "../../controllers/menu/menuController";
const router = express.Router();

router.post(
  apiConfig.kitchenMenu.createMenuItem,
  upload.fields([{ name: "image", maxCount: 1 }]),
  createMenuItem
);

export default router;

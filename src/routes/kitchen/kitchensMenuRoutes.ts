import express, { Application, Router } from "express";
import { apiConfig } from "../../config/endpoint ";
import {
  kitchenCreateCategory,
  kitchenDeleteCategory,
  kitchenGetAllCategories,
  kitchenToggleCategoryStatus,
  kitchenUpdateCategory,
} from "../../controllers/kitchens/kitchenCategory";
import {
  addMenuItems,
  getAllMenus,
  getMenuItemDetails,
  removeMenuItem,
  updateMenuItem,
} from "../../controllers/kitchens/menuController";
import upload from "../../lib/helpers/uploadMiddleware";

const router = express.Router();

//kitchen category routes
router.get(`${apiConfig.kitchenMenu.getKitchenMenu}`, getAllMenus);
router.get(`${apiConfig.kitchenMenu.removekitchenMenu}`, removeMenuItem);
router.post(`${apiConfig.kitchenMenu.createkitchenMenu}`, addMenuItems);
router.get(
  `${apiConfig.kitchenMenu.getkitchenMenuItemDetail}`,
  getMenuItemDetails
);
router.put(
  `${apiConfig.kitchenMenu.updateKitchenMenu}`,
  upload.fields([{ name: "custom_image", maxCount: 1 }]),
  updateMenuItem
);

export default router;
              
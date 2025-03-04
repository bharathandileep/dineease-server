import express from "express";
import {
  createSubcategory,
  deleteSubcategory,
  getAllCategoriesByStatus,
  getAllSubCategories,
  getSubcategoriesByCategory,
  toggleSubcategoryStatus,
  updateSubcategory,
} from "../../controllers/kitchens/menuSubCategory";
import { apiConfig } from "../../config/endpoint ";
import { kitchenToggleSubcategoryStatus } from "../../controllers/kitchens/kitchenSubCategory";

const router = express.Router();

// Public routes
router.get(
  `${apiConfig.menu.getSubcategoriesByCategory}`,
  getSubcategoriesByCategory
);
router.post(`${apiConfig.menu.createSubcategory}`, createSubcategory);
router.put(`${apiConfig.menu.updateSubcategory}`, updateSubcategory);
router.delete(`${apiConfig.menu.deleteSubcategory}`, deleteSubcategory);
router.patch(
  `${apiConfig.menu.toggleSubcategoryStatus}`,
  toggleSubcategoryStatus
);
router.get(`${apiConfig.menu.getAllSubCategories}`, getAllSubCategories);
router.get(
  `${apiConfig.menu.getAllCategoriesByStatus}`,
  getAllCategoriesByStatus
);

export default router;

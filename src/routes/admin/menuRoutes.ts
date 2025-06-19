import express, { Application, Router } from "express";
import { apiConfig } from "../../config/endpoint ";
import {
  createCategory,
  createNewTags,
  createSubcategory,
  deleteCategory,
  deleteSubcategory,
  deleteTag,
  getAllCategories,
  getAllCategoriesByStatus,
  getAllSubCategories,
  getAllTags,
  getSubcategoriesByCategory,
  toggleCategoryStatus,
  toggleSubcategoryStatus,
  toggleTagStatus,
  updateCategory,
  updateSubcategory,
  updateTag,
} from "../../controllers/admin/menuControllers";
const router = express.Router();

router.get(`${apiConfig.menu.getAllCategories}`, getAllCategories);
router.post(`${apiConfig.menu.createCategory}`, createCategory);
router.put(`${apiConfig.menu.updateCategory}`, updateCategory);
router.delete(`${apiConfig.menu.deleteCategory}`, deleteCategory);
router.patch(`${apiConfig.menu.toggleCategoryStatus}`, toggleCategoryStatus);

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

router.post(`${apiConfig.menu.createNewMenuTags}`, createNewTags);
router.get(`${apiConfig.menu.getAllTags}`, getAllTags);
router.patch(`${apiConfig.menu.toggleStatus}`, toggleTagStatus);
router.put(`${apiConfig.menu.updateTag}`, updateTag);
router.delete(`${apiConfig.menu.deleteTag}`, deleteTag);

export default router;

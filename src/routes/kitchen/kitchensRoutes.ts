import express, { Application, Router } from "express";
import { apiConfig } from "../../config/endpoint ";
import upload from "../../lib/helpers/uploadMiddleware";
import {
 
  handleCreateNewKitchens,
  handleDeleteKitchens,
  handleGetKitchens,
  handleGetKitchensById,
  handleUpdateKitchensById,
  kitchenToggleStatus,
} from "../../controllers/kitchens/kitchenController";
import {
  kitchenCreateCategory,
  kitchenDeleteCategory,
  kitchenGetAllCategories,
  kitchenToggleCategoryStatus,
  kitchenUpdateCategory,
} from "../../controllers/kitchens/kitchenCategory";
import {
  kitchenCreateSubcategory,
  kitchenDeleteSubcategory,
  kitchenGetAllSubCategories,
  kitchenGetSubcategoriesByCategory,
  kitchenToggleSubcategoryStatus,
  kitchenUpdateSubcategory,
} from "../../controllers/kitchens/kitchenSubCategory";

const router = express.Router();

router.post(
  `${apiConfig.kitchens.newkitchens}`,
  upload.fields([
    { name: "kitchen_image", maxCount: 1 },
    { name: "pan_card_image", maxCount: 1 },
    { name: "gst_certificate_image", maxCount: 1 },
    { name: "ffsai_certificate_image", maxCount: 1 },
  ]),
  handleCreateNewKitchens
);
router.get(`${apiConfig.kitchens.getAllkitchens}`, handleGetKitchens);
router.get(`${apiConfig.kitchens.getkitchensById}`, handleGetKitchensById);
router.put(
  `${apiConfig.kitchens.updatekitchens}`,
  upload.fields([
    { name: "kitchen_image", maxCount: 1 },
    { name: "pan_card_image", maxCount: 1 },
    { name: "gst_certificate_image", maxCount: 1 },
    { name: "ffsai_certificate_image", maxCount: 1 },
  ]),
  handleUpdateKitchensById
);

router.delete(`${apiConfig.kitchens.deletekitchens}`, handleDeleteKitchens);
router.get(`${apiConfig.kitchens.toggleKitchensStatus}`, kitchenToggleStatus);





//kitchen category routes
router.get(`${apiConfig.kitchens.getAllCategories}`, kitchenGetAllCategories);
router.post(`${apiConfig.kitchens.createCategory}`, kitchenCreateCategory);
router.put(`${apiConfig.kitchens.updateCategory}`, kitchenUpdateCategory);
router.delete(`${apiConfig.kitchens.deleteCategory}`, kitchenDeleteCategory);
router.patch(
  `${apiConfig.menu.toggleCategoryStatus}`,
  kitchenToggleCategoryStatus
);

//kitchen subcategory
router.get(
  `${apiConfig.kitchens.getSubcategoriesByCategory}`,
  kitchenGetSubcategoriesByCategory
);
router.post(
  `${apiConfig.kitchens.createSubcategory}`,
  kitchenCreateSubcategory
);
router.put(`${apiConfig.kitchens.updateSubcategory}`, kitchenUpdateSubcategory);
router.delete(
  `${apiConfig.kitchens.deleteSubcategory}`,
  kitchenDeleteSubcategory
);
router.patch(
  `${apiConfig.kitchens.toggleSubcategoryStatus}`,
  kitchenToggleSubcategoryStatus
);
router.patch(`${apiConfig.kitchens.toggleSubcategoryStatus}`);
router.get(
  `${apiConfig.kitchens.getAllSubCategories}`,
  kitchenGetAllSubCategories
);

export default router;


import express, { Application, Router } from "express";
import { apiConfig } from "../../config/endpoint ";
import upload from "../../lib/helpers/uploadMiddleware";
import {
  handleCreateNewKitchens,
  handleDeleteKitchens,
  handleGetKitchens,
  handleGetKitchensById,
  handleGetUnapprovedKitchens,
  // handleGetUnapprovedKitchens,
  handleGetUserApprovedKitchens,
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
import { getMenuItemsByKitchen } from "../../controllers/kitchens/menuController";
import { authorizationAccess } from "../../middleware/TokenValidation";
 
const router = express.Router();
 
router.post(
  `${apiConfig.kitchens.newkitchens}`,
  upload.fields([
    { name: "kitchen_image", maxCount: 1 },
    { name: "pan_card_image", maxCount: 1 },
    { name: "gst_certificate_image", maxCount: 1 },
    { name: "ffsai_certificate_image", maxCount: 1 },
  ]),
  authorizationAccess,
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
  authorizationAccess,
  handleUpdateKitchensById
);
 
router.delete(`${apiConfig.kitchens.deletekitchens}`, handleDeleteKitchens);
router.get(`${apiConfig.kitchens.toggleKitchensStatus}`, kitchenToggleStatus);
router.get(`${apiConfig.kitchens.handleGetUserApprovedKitchens}`,authorizationAccess, handleGetUserApprovedKitchens);





//kitchen category routes
router.get(`${apiConfig.kitchens.getallCategories}`, kitchenGetAllCategories);
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
  `${apiConfig.kitchens.getallSubCategories}`,
  kitchenGetAllSubCategories
);

router.get(`${apiConfig.kitchens.getUnapprovedKitchens}`,handleGetUnapprovedKitchens)


export default router;
 
 
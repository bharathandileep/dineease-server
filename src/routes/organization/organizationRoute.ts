import express, { Application, Router } from "express";
import { apiConfig } from "../../config/endpoint ";
import upload from "../../lib/helpers/uploadMiddleware";
import {
  handleCreateNewOrganisation,
  handledDeleteOrganisations,
  handleGetByIdOrganisations,
  handleGetOrganisations,
  handleUpdateOrganisations,
  organizationToggleStatus,
} from "../../controllers/organization/organizationsController";
import {
  orgCreateCategory,
  orgDeleteCategory,
  orgGetAllCategories,
  orgToggleCategoryStatus,
  orgUpdateCategory,
} from "../../controllers/organization/orgCategory";
import {
  getAllCategoriesByStatus,
  orgCreateSubcategory,
  orgDeleteSubcategory,
  orgGetAllSubCategories,
  orgGetSubcategoriesByCategory,
  orgToggleSubcategoryStatus,
  orgUpdateSubcategory,
} from "../../controllers/organization/orgSubCategory";

const router = express.Router();
router.post(
  apiConfig.organization.newOrganization,
  upload.fields([
    { name: "organizationLogo", maxCount: 1 },
    { name: "panCardImage", maxCount: 1 },
    { name: "gstCertificateImage", maxCount: 1 },
  ]),
  handleCreateNewOrganisation
);
router.get(
  `${apiConfig.organization.getAllOrganization}`,
  handleGetOrganisations
);
router.get(
  `${apiConfig.organization.getOrganizationById}`,
  handleGetByIdOrganisations
);
router.put(
  `${apiConfig.organization.updateOrganization}`,
  upload.fields([
    { name: "organizationLogo", maxCount: 1 },
    { name: "panCardImage", maxCount: 1 },
    { name: "gstCertificateImage", maxCount: 1 },
  ]),
  handleUpdateOrganisations
);
router.delete(
  `${apiConfig.organization.deleteOrganization}`,
  handledDeleteOrganisations
);
router.get(
  `${apiConfig.organization.toggleOrganizationStatus}`,
  organizationToggleStatus
);


//kitchen category routes
router.get(`${apiConfig.organization.getAllCategories}`, orgGetAllCategories);
router.post(`${apiConfig.organization.createCategory}`, orgCreateCategory);
router.put(`${apiConfig.organization.updateCategory}`, orgUpdateCategory);
router.delete(`${apiConfig.organization.deleteCategory}`, orgDeleteCategory);
router.patch(
  `${apiConfig.organization.toggleCategoryStatus}`,
  orgToggleCategoryStatus
);

//kitchen subcategory
router.get(
  `${apiConfig.organization.getSubcategoriesByCategory}`,
  orgGetSubcategoriesByCategory
);
router.post(
  `${apiConfig.organization.createSubcategory}`,
  orgCreateSubcategory
);
router.put(`${apiConfig.organization.updateSubcategory}`, orgUpdateSubcategory);
router.delete(
  `${apiConfig.organization.deleteSubcategory}`,
  orgDeleteSubcategory
);
router.patch(
  `${apiConfig.organization.toggleSubcategoryStatus}`,
  orgToggleSubcategoryStatus
);

router.get(
  `${apiConfig.organization.getAllSubCategories}`,
  orgGetAllSubCategories
);
router.get(
  `${apiConfig.organization.getAllCategoriesByStatus}`,
  getAllCategoriesByStatus
);

export default router;

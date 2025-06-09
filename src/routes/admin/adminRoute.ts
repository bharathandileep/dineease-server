import express, { Application, Router } from "express";
import { apiConfig } from "../../config/endpoint ";
import { handleAdminApproveOgaisation } from "../../controllers/organization/organizationsController";
import { handleAdminApproveKitchen } from "../../controllers/kitchens/kitchenController";
import { verifyDocuments } from "../../controllers/admin/adminController";
const router = express.Router();

router.patch(
  `${apiConfig.admin.adminApproveOrganization}`,
  handleAdminApproveOgaisation
);
router.patch(
  `${apiConfig.admin.adminApproveKitchen}`,
  handleAdminApproveKitchen
);
router.patch(`${apiConfig.admin.adminVerifyDoc}`, verifyDocuments);

// //---tags---
// router.post(`${apiConfig.admin.createNewMenuTags}`, createNewTags);
// router.get(`${apiConfig.admin.getAllTags}`, getAllTags);
// router.patch(`${apiConfig.admin.toggleStatus}`, toggleTagStatus);
// router.put(`${apiConfig.admin.updateTag}`, updateTag);
// router.delete(`${apiConfig.admin.deleteTag}`, deleteTag);

export default router;

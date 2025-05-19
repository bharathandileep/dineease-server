import express, { Application, Router } from "express";
import { apiConfig } from "../../config/endpoint ";
import { handleAdminApproveOgaisation } from "../../controllers/organization/organizationsController";
import { handleAdminApproveKitchen } from "../../controllers/kitchens/kitchenController";
import { verifyDocuments } from "../../controllers/auth/adminController";
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

export default router;

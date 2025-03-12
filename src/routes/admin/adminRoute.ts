import express, { Application, Router } from "express";
import { apiConfig } from "../../config/endpoint ";
import { handleAdminApproveOgaisation } from "../../controllers/organization/organizationsController";
import { handleAdminApproveKitchen } from "../../controllers/kitchens/kitchenController";
const router = express.Router();

router.patch(
  `${apiConfig.admin.adminApproveOrganization}`,
  handleAdminApproveOgaisation
);
router.patch(
  `${apiConfig.admin.adminApproveKitchen}`,
  handleAdminApproveKitchen
);

export default router;

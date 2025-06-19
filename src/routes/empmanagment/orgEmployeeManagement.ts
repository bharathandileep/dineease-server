import express from "express";

import { apiConfig } from "../../config/endpoint ";
import upload from "../../lib/helpers/uploadMiddleware";
import { authorizationAccess } from "../../middleware/TokenValidation";
import {
  createOrgEmployee,
  deleteOrgEmployee,
  getAllEmployeesOfOrg,
  getOrgEmployeeById,
  handleGetEmployeeOrganizations,
  toggleOrgEmployeeStatus,
  updateOrgEmployee,
} from "../../controllers/empmanagment/orgEmployeeController";

const router = express.Router();

router.get(
  `${apiConfig.orgemployee.getAllEmployeesOfOrg}`,
  getAllEmployeesOfOrg
);
router.get(`${apiConfig.orgemployee.getOrgEmployeeById}`, getOrgEmployeeById);
router.post(
  `${apiConfig.orgemployee.createOrgEmployee}`,
  upload.fields([
    { name: "profile_picture", maxCount: 1 },
    { name: "pan_image", maxCount: 1 },
    { name: "aadhar_image", maxCount: 1 },
  ]),
  authorizationAccess,
  createOrgEmployee
);
router.put(
  `${apiConfig.orgemployee.updateOrgEmployee}`,
  upload.fields([
    { name: "profile_picture", maxCount: 1 },
    { name: "pan_image", maxCount: 1 },
    { name: "aadhar_image", maxCount: 1 },
  ]),
  updateOrgEmployee
);
router.delete(`${apiConfig.orgemployee.deleteOrgEmployee}`, deleteOrgEmployee);
router.patch(
  `${apiConfig.orgemployee.toggleOrgEmployeeStatus}`,
  toggleOrgEmployeeStatus
);

// emp view routes
router.get(
  `${apiConfig.orgemployee.getEmployeesOrg}`,
  handleGetEmployeeOrganizations
);

export default router;

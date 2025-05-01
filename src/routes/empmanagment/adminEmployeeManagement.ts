import express from "express";
import { apiConfig } from "../../config/endpoint ";
import upload from "../../lib/helpers/uploadMiddleware";
import { authorizationAccess } from "../../middleware/TokenValidation";
import {
  createAdminEmployee,
  deleteAdminEmployee,
  getAdminEmployeeById,
  handleGetAdminAllEmployees,
  toggleAdminEmployeeStatus,
  updateAdminEmployee,
} from "../../controllers/empmanagment/adminEmployeeController";

const router = express.Router();

router.get(
  `${apiConfig.employee.getAllEmployees}`,
  upload.fields([{ name: "profile_picture", maxCount: 1 }]),
  handleGetAdminAllEmployees
);
router.get(`${apiConfig.employee.getEmployeeById}`, getAdminEmployeeById);
router.post(
  `${apiConfig.employee.createEmployee}`,
  upload.fields([
    { name: "profile_picture", maxCount: 1 },
    { name: "pan_image", maxCount: 1 },
    { name: "aadhar_image", maxCount: 1 },
  ]),
  authorizationAccess,
  createAdminEmployee
);

router.put(
  `${apiConfig.employee.updateEmployee}`,
  upload.fields([
    { name: "profile_picture", maxCount: 1 },
    { name: "pan_image", maxCount: 1 },
    { name: "aadhar_image", maxCount: 1 },
  ]),
  updateAdminEmployee
);
router.delete(`${apiConfig.employee.deleteEmployee}`, deleteAdminEmployee);
router.patch(
  `${apiConfig.employee.toggleEmployeeStatus}`,
  toggleAdminEmployeeStatus
);

export default router;

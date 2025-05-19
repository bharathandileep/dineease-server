import express from "express";
import {
  deleteKitchenEmployee,
  getKitchenAllEmployees,
  getkitchenEmployeeById,
  handleCreateNewKitchenEmployee,
  toggleKitchenEmployeeStatus,
  updateKitchenEmployee,
} from "../../controllers/empmanagment/kitchenEmployeeController";
import { apiConfig } from "../../config/endpoint ";
import upload from "../../lib/helpers/uploadMiddleware";

const router = express.Router();

router.post(
  `${apiConfig.kitchenEmployee.createEmployee}`,
  upload.fields([
    { name: "profile_picture", maxCount: 1 },
    { name: "pan_image", maxCount: 1 },
    { name: "aadhar_image", maxCount: 1 },
  ]),
  handleCreateNewKitchenEmployee
);
router.get(
  `${apiConfig.kitchenEmployee.getEmployeeById}`,
  getkitchenEmployeeById
);
router.get(
  `${apiConfig.kitchenEmployee.getAllEmployees}`,
  getKitchenAllEmployees
);
router.put(
  `${apiConfig.kitchenEmployee.updateEmployee}`,
  upload.fields([
    { name: "profile_picture", maxCount: 1 },
    { name: "pan_image", maxCount: 1 },
    { name: "aadhar_image", maxCount: 1 },
  ]),
  updateKitchenEmployee
);
router.patch(
  `${apiConfig.kitchenEmployee.toggleEmployeeStatus}`,
  toggleKitchenEmployeeStatus
);
router.delete(`${apiConfig.employee.deleteEmployee}`, deleteKitchenEmployee);

export default router;

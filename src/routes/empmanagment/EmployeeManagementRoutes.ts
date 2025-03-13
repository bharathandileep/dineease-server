import express from "express";
import {
  createEmployee,
  deleteEmployee,
  getAllEmployees,
  getEmployeeById,
  toggleEmployeeStatus,
  updateEmployee,
} from "../../controllers/empmanagment/empmanagmentcontroller";
import { apiConfig } from "../../config/endpoint ";
import upload from "../../lib/helpers/uploadMiddleware";

const router = express.Router();

router.get(`${apiConfig.employee.getAllEmployees}`,
  upload.fields([
    { name: "profile_picture", maxCount: 1 },
  ]), getAllEmployees);
router.get(`${apiConfig.employee.getEmployeeById}`, 
  upload.fields([
    { name: "profile_picture", maxCount: 1 },
  ]), getEmployeeById);
router.post(`${apiConfig.employee.createEmployee}`, 
  upload.fields([
    { name: "profile_picture", maxCount: 1},  { name: "pan_image", maxCount: 1 },
    { name: "aadhar_image", maxCount: 1 }, 
  ]),createEmployee);
router.put(`${apiConfig.employee.updateEmployee}`, 
  upload.fields([
    { name: "profile_picture", maxCount: 1},  { name: "pan_image", maxCount: 1 },
    { name: "aadhar_image", maxCount: 1 }, 
  ]), updateEmployee);
router.delete(`${apiConfig.employee.deleteEmployee}`, deleteEmployee);
router.patch(`${apiConfig.employee.toggleEmployeeStatus}`, toggleEmployeeStatus);

export default router;

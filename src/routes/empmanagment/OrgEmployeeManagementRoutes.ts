import express from "express";
import {
    createOrgEmployee,
    deleteOrgEmployee,
    getAllEmployeesOfOrg,
    getOrgEmployeeById,
  toggleOrgEmployeeStatus,
  updateOrgEmployee,
} from "../../controllers/empmanagment/orgempmanagmentcontroller";
import { apiConfig } from "../../config/endpoint ";
import upload from "../../lib/helpers/uploadMiddleware";

const router = express.Router();

router.get(`${apiConfig.orgemployee.getAllEmployeesOfOrg}`,
  upload.fields([
    { name: "profile_picture", maxCount: 1 },
  ]), getAllEmployeesOfOrg);
router.get(`${apiConfig.orgemployee.getOrgEmployeeById}`, getOrgEmployeeById);
router.post(`${apiConfig.orgemployee.createOrgEmployee}`, 
  upload.fields([
    { name: "profile_picture", maxCount: 1 },{ name: "pan_image", maxCount: 1 },
    { name: "aadhar_image", maxCount: 1 }, 
  ]),createOrgEmployee);
router.put(`${apiConfig.orgemployee.updateOrgEmployee}`, 
  upload.fields([
    { name: "profile_picture", maxCount: 1 },{ name: "pan_image", maxCount: 1 },
    { name: "aadhar_image", maxCount: 1 }, 
  ]), updateOrgEmployee);
router.delete(`${apiConfig.orgemployee.deleteOrgEmployee}`, deleteOrgEmployee);
router.patch(`${apiConfig.orgemployee.toggleOrgEmployeeStatus}`, toggleOrgEmployeeStatus);

export default router;

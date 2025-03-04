import express from "express";
import {
  createDesignation,
  deleteDesignation,
  getAllDesignations,
  getDesignationById,
  toggleDesignationStatus,
  updateDesignation,
} from "../../controllers/designation/designationController";
import { apiConfig } from "../../config/endpoint ";

const router = express.Router();

router.get(`${apiConfig.designation.getAllDesignations}`, getAllDesignations);
router.get(`${apiConfig.designation.getDesignationById}`, getDesignationById);
router.post(`${apiConfig.designation.createDesignation}`, createDesignation);
router.put(`${apiConfig.designation.updateDesignation}`, updateDesignation);
router.delete(`${apiConfig.designation.deleteDesignation}`, deleteDesignation);
router.patch(`${apiConfig.designation.toggleDesignationStatus}`, toggleDesignationStatus);

export default router;

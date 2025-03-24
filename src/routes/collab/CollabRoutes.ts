import express, { Router } from "express";
import { apiConfig } from "../../config/endpoint ";
import { collaborateKitchen, getAllColloborations, getCollaborationById, listCollaboratedKitchens } from "../../controllers/collab/collabController";

const router: Router = express.Router();

router.post(`${apiConfig.collab.collaborateKitchen}`, collaborateKitchen);
router.get(`${apiConfig.collab.listCollaboratedKitchens}`, listCollaboratedKitchens);
router.get(`${apiConfig.collab.getAllColloborations}`,getAllColloborations);
router.get(`${apiConfig.collab.getCollaborationById}`,getCollaborationById);
export default router; 

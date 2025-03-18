import express, { Router } from "express";
import { apiConfig } from "../../config/endpoint ";
import { collaborateKitchen, listCollaboratedKitchens } from "../../controllers/collab/collabController";

const router: Router = express.Router();

router.post(apiConfig.collab.collaborateKitchen, collaborateKitchen);
router.get(apiConfig.collab.listCollaboratedKitchens, listCollaboratedKitchens);

export default router;

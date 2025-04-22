import express from "express";
import { apiConfig } from "../../config/endpoint ";
import {
  createRoleAndAccess,
  getRoleAndAccessById,
  getRolesByEntity,
} from "../../controllers/designation/roleAccessController";

const router = express.Router();

router.post(`${apiConfig.designation.newRoleAndAccess}`, createRoleAndAccess);
router.get(`${apiConfig.designation.getRoleAndAccess}`, getRolesByEntity);
router.get(
  `${apiConfig.designation.getRoleAndAccessById}`,
  getRoleAndAccessById
);

export default router;
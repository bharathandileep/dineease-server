import express, { Application, Router } from "express";
import { apiConfig } from "../../config/endpoint ";
import { getAllCountries,   getCitiesByState,    getDistrictsByState, getStatesByCountry } from "../../controllers/addressDetails/addressDetails";

const router = express.Router();

router.get(`${apiConfig.addressDetails.getAllCountries}`, getAllCountries);
router.get(`${apiConfig.addressDetails.getStatesByCountry}`, getStatesByCountry);
router.get(`${apiConfig.addressDetails.getDistrictsByState}`, getDistrictsByState);
router.get(`${apiConfig.addressDetails.getCitiesByState}`,getCitiesByState)
export default router;
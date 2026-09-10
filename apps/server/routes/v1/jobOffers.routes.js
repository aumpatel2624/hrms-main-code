/**
 * Job Offer (ADR-019, HRMS module 3): Job Offer, Job Offer Term Template.
 */
import express from "express";
import { authMiddleware } from "../../middlewares/authMiddleware.js";
import { checkPermission } from "../../middlewares/checkPermission.js";
import { ANY_ROLE } from "@demo-panel/shared/roles";
import {
  createJobOffer, updateJobOffer, deleteJobOffer,
  getJobOfferById, listJobOffers, listJobOffersByParams, makeEmployeeFromJobOffer,
} from "../../controllers/v1/jobOffer.controller.js";
import {
  createJobOfferTermTemplate, updateJobOfferTermTemplate, deleteJobOfferTermTemplate,
  getJobOfferTermTemplateById, listJobOfferTermTemplates, listJobOfferTermTemplatesByParams,
} from "../../controllers/v1/recruitmentMasters.controller.js";

const router = express.Router();

// ---- Job Offer ----
router.post("/job-offers", authMiddleware(ANY_ROLE), checkPermission("/job-offer", "write"), createJobOffer);
router.get("/job-offers", authMiddleware(ANY_ROLE), listJobOffers);
router.get("/job-offers/:offerId", authMiddleware(ANY_ROLE), checkPermission("/job-offer", "read"), getJobOfferById);
router.put("/job-offers/:offerId", authMiddleware(ANY_ROLE), checkPermission("/job-offer", "edit"), updateJobOffer);
router.delete("/job-offers/:offerId", authMiddleware(ANY_ROLE), checkPermission("/job-offer", "delete"), deleteJobOffer);
router.post("/job-offers/search", authMiddleware(ANY_ROLE), checkPermission("/job-offer", "read"), listJobOffersByParams);
router.post("/job-offers/:offerId/make-employee", authMiddleware(ANY_ROLE), checkPermission("/job-offer", "read"), makeEmployeeFromJobOffer);

// ---- Job Offer Term Template ----
router.post("/job-offer-term-templates", authMiddleware(ANY_ROLE), checkPermission("/job-offer-term-template", "write"), createJobOfferTermTemplate);
router.get("/job-offer-term-templates", authMiddleware(ANY_ROLE), listJobOfferTermTemplates);
router.get("/job-offer-term-templates/:templateId", authMiddleware(ANY_ROLE), checkPermission("/job-offer-term-template", "read"), getJobOfferTermTemplateById);
router.put("/job-offer-term-templates/:templateId", authMiddleware(ANY_ROLE), checkPermission("/job-offer-term-template", "edit"), updateJobOfferTermTemplate);
router.delete("/job-offer-term-templates/:templateId", authMiddleware(ANY_ROLE), checkPermission("/job-offer-term-template", "delete"), deleteJobOfferTermTemplate);
router.post("/job-offer-term-templates/search", authMiddleware(ANY_ROLE), checkPermission("/job-offer-term-template", "read"), listJobOfferTermTemplatesByParams);

export default router;

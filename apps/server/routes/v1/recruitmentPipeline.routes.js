/**
 * Recruitment pipeline (ADR-019, HRMS module 3): Job Requisition, Job
 * Opening, Job Applicant, Job Applicant Source. Grouped the way
 * organizationSetup.routes.js groups its masters — a domain router, not
 * one file per model (30-api.md).
 */
import express from "express";
import { authMiddleware } from "../../middlewares/authMiddleware.js";
import { checkPermission } from "../../middlewares/checkPermission.js";
import { ANY_ROLE } from "@demo-panel/shared/roles";
import {
  createJobRequisition, updateJobRequisition, deleteJobRequisition,
  getJobRequisitionById, listJobRequisitions, listJobRequisitionsByParams,
  makeJobOpeningFromRequisition,
} from "../../controllers/v1/jobRequisition.controller.js";
import {
  createJobOpening, updateJobOpening, deleteJobOpening,
  getJobOpeningById, listJobOpenings, listJobOpeningsByParams,
} from "../../controllers/v1/jobOpening.controller.js";
import {
  createJobApplicant, updateJobApplicant, deleteJobApplicant,
  getJobApplicantById, listJobApplicants, listJobApplicantsByParams,
} from "../../controllers/v1/jobApplicant.controller.js";
import {
  createJobApplicantSource, updateJobApplicantSource, deleteJobApplicantSource,
  getJobApplicantSourceById, listJobApplicantSources, listJobApplicantSourcesByParams,
} from "../../controllers/v1/recruitmentMasters.controller.js";

const router = express.Router();

// ---- Job Requisition ----
router.post("/job-requisitions", authMiddleware(ANY_ROLE), checkPermission("/job-requisition", "write"), createJobRequisition);
router.get("/job-requisitions", authMiddleware(ANY_ROLE), listJobRequisitions);
router.get("/job-requisitions/:requisitionId", authMiddleware(ANY_ROLE), checkPermission("/job-requisition", "read"), getJobRequisitionById);
router.put("/job-requisitions/:requisitionId", authMiddleware(ANY_ROLE), checkPermission("/job-requisition", "edit"), updateJobRequisition);
router.delete("/job-requisitions/:requisitionId", authMiddleware(ANY_ROLE), checkPermission("/job-requisition", "delete"), deleteJobRequisition);
router.post("/job-requisitions/search", authMiddleware(ANY_ROLE), checkPermission("/job-requisition", "read"), listJobRequisitionsByParams);
router.post("/job-requisitions/:requisitionId/make-job-opening", authMiddleware(ANY_ROLE), checkPermission("/job-requisition", "read"), makeJobOpeningFromRequisition);

// ---- Job Opening ----
router.post("/job-openings", authMiddleware(ANY_ROLE), checkPermission("/job-opening", "write"), createJobOpening);
router.get("/job-openings", authMiddleware(ANY_ROLE), listJobOpenings);
router.get("/job-openings/:openingId", authMiddleware(ANY_ROLE), checkPermission("/job-opening", "read"), getJobOpeningById);
router.put("/job-openings/:openingId", authMiddleware(ANY_ROLE), checkPermission("/job-opening", "edit"), updateJobOpening);
router.delete("/job-openings/:openingId", authMiddleware(ANY_ROLE), checkPermission("/job-opening", "delete"), deleteJobOpening);
router.post("/job-openings/search", authMiddleware(ANY_ROLE), checkPermission("/job-opening", "read"), listJobOpeningsByParams);

// ---- Job Applicant ----
router.post("/job-applicants", authMiddleware(ANY_ROLE), checkPermission("/job-applicant", "write"), createJobApplicant);
router.get("/job-applicants", authMiddleware(ANY_ROLE), listJobApplicants);
router.get("/job-applicants/:applicantId", authMiddleware(ANY_ROLE), checkPermission("/job-applicant", "read"), getJobApplicantById);
router.put("/job-applicants/:applicantId", authMiddleware(ANY_ROLE), checkPermission("/job-applicant", "edit"), updateJobApplicant);
router.delete("/job-applicants/:applicantId", authMiddleware(ANY_ROLE), checkPermission("/job-applicant", "delete"), deleteJobApplicant);
router.post("/job-applicants/search", authMiddleware(ANY_ROLE), checkPermission("/job-applicant", "read"), listJobApplicantsByParams);

// ---- Job Applicant Source ----
router.post("/job-applicant-sources", authMiddleware(ANY_ROLE), checkPermission("/job-applicant-source", "write"), createJobApplicantSource);
router.get("/job-applicant-sources", authMiddleware(ANY_ROLE), listJobApplicantSources);
router.get("/job-applicant-sources/:sourceId", authMiddleware(ANY_ROLE), checkPermission("/job-applicant-source", "read"), getJobApplicantSourceById);
router.put("/job-applicant-sources/:sourceId", authMiddleware(ANY_ROLE), checkPermission("/job-applicant-source", "edit"), updateJobApplicantSource);
router.delete("/job-applicant-sources/:sourceId", authMiddleware(ANY_ROLE), checkPermission("/job-applicant-source", "delete"), deleteJobApplicantSource);
router.post("/job-applicant-sources/search", authMiddleware(ANY_ROLE), checkPermission("/job-applicant-source", "read"), listJobApplicantSourcesByParams);

export default router;

/**
 * Employee Onboarding + Employee Onboarding Template (ADR-020, HRMS module 4).
 */
import express from "express";
import { authMiddleware } from "../../middlewares/authMiddleware.js";
import { checkPermission } from "../../middlewares/checkPermission.js";
import { ANY_ROLE } from "@demo-panel/shared/roles";
import {
  createEmployeeOnboarding, updateEmployeeOnboarding, deleteEmployeeOnboarding,
  getEmployeeOnboardingById, listEmployeeOnboardings, listEmployeeOnboardingsByParams,
  markOnboardingAsCompleted, makeEmployeeFromOnboarding,
  createEmployeeOnboardingTemplate, updateEmployeeOnboardingTemplate, deleteEmployeeOnboardingTemplate,
  getEmployeeOnboardingTemplateById, listEmployeeOnboardingTemplates, listEmployeeOnboardingTemplatesByParams,
} from "../../controllers/v1/employeeOnboarding.controller.js";

const router = express.Router();

// ---- Employee Onboarding ----
router.post("/employee-onboardings", authMiddleware(ANY_ROLE), checkPermission("/employee-onboarding", "write"), createEmployeeOnboarding);
router.get("/employee-onboardings", authMiddleware(ANY_ROLE), listEmployeeOnboardings);
router.get("/employee-onboardings/:onboardingId", authMiddleware(ANY_ROLE), checkPermission("/employee-onboarding", "read"), getEmployeeOnboardingById);
router.put("/employee-onboardings/:onboardingId", authMiddleware(ANY_ROLE), checkPermission("/employee-onboarding", "edit"), updateEmployeeOnboarding);
router.delete("/employee-onboardings/:onboardingId", authMiddleware(ANY_ROLE), checkPermission("/employee-onboarding", "delete"), deleteEmployeeOnboarding);
router.post("/employee-onboardings/search", authMiddleware(ANY_ROLE), checkPermission("/employee-onboarding", "read"), listEmployeeOnboardingsByParams);
router.post("/employee-onboardings/:onboardingId/mark-as-completed", authMiddleware(ANY_ROLE), checkPermission("/employee-onboarding", "edit"), markOnboardingAsCompleted);
router.post("/employee-onboardings/:onboardingId/make-employee", authMiddleware(ANY_ROLE), checkPermission("/employee-onboarding", "read"), makeEmployeeFromOnboarding);

// ---- Employee Onboarding Template ----
router.post("/employee-onboarding-templates", authMiddleware(ANY_ROLE), checkPermission("/employee-onboarding-template", "write"), createEmployeeOnboardingTemplate);
router.get("/employee-onboarding-templates", authMiddleware(ANY_ROLE), listEmployeeOnboardingTemplates);
router.get("/employee-onboarding-templates/:templateId", authMiddleware(ANY_ROLE), checkPermission("/employee-onboarding-template", "read"), getEmployeeOnboardingTemplateById);
router.put("/employee-onboarding-templates/:templateId", authMiddleware(ANY_ROLE), checkPermission("/employee-onboarding-template", "edit"), updateEmployeeOnboardingTemplate);
router.delete("/employee-onboarding-templates/:templateId", authMiddleware(ANY_ROLE), checkPermission("/employee-onboarding-template", "delete"), deleteEmployeeOnboardingTemplate);
router.post("/employee-onboarding-templates/search", authMiddleware(ANY_ROLE), checkPermission("/employee-onboarding-template", "read"), listEmployeeOnboardingTemplatesByParams);

export default router;

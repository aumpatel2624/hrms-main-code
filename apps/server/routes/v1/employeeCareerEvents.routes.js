/**
 * Grievance Type, Employee Grievance, Employee Transfer, Employee
 * Promotion, Employee Referral, Staffing Plan (ADR-021, HRMS module 5).
 */
import express from "express";
import { authMiddleware } from "../../middlewares/authMiddleware.js";
import { checkPermission } from "../../middlewares/checkPermission.js";
import { ANY_ROLE } from "@demo-panel/shared/roles";
import {
  createGrievanceType, updateGrievanceType, deleteGrievanceType,
  getGrievanceTypeById, listGrievanceTypes, listGrievanceTypesByParams,
  createEmployeeGrievance, updateEmployeeGrievance, deleteEmployeeGrievance,
  getEmployeeGrievanceById, listEmployeeGrievances, listEmployeeGrievancesByParams,
} from "../../controllers/v1/grievance.controller.js";
import {
  createEmployeeTransfer, deleteEmployeeTransfer, getEmployeeTransferById,
  listEmployeeTransfers, listEmployeeTransfersByParams,
  createEmployeePromotion, deleteEmployeePromotion, getEmployeePromotionById,
  listEmployeePromotions, listEmployeePromotionsByParams,
  listEmployeePropertyChangesByParams,
} from "../../controllers/v1/employeeCareerEvents.controller.js";
import {
  createEmployeeReferral, updateEmployeeReferral, deleteEmployeeReferral,
  getEmployeeReferralById, listEmployeeReferrals, listEmployeeReferralsByParams,
  createJobApplicantFromReferral,
} from "../../controllers/v1/employeeReferral.controller.js";
import {
  createStaffingPlan, updateStaffingPlan, deleteStaffingPlan,
  getStaffingPlanById, listStaffingPlans, listStaffingPlansByParams,
} from "../../controllers/v1/staffingPlan.controller.js";

const router = express.Router();

// ---- Grievance Type ----
router.post("/grievance-types", authMiddleware(ANY_ROLE), checkPermission("/grievance-type", "write"), createGrievanceType);
router.get("/grievance-types", authMiddleware(ANY_ROLE), listGrievanceTypes);
router.get("/grievance-types/:grievanceTypeId", authMiddleware(ANY_ROLE), checkPermission("/grievance-type", "read"), getGrievanceTypeById);
router.put("/grievance-types/:grievanceTypeId", authMiddleware(ANY_ROLE), checkPermission("/grievance-type", "edit"), updateGrievanceType);
router.delete("/grievance-types/:grievanceTypeId", authMiddleware(ANY_ROLE), checkPermission("/grievance-type", "delete"), deleteGrievanceType);
router.post("/grievance-types/search", authMiddleware(ANY_ROLE), checkPermission("/grievance-type", "read"), listGrievanceTypesByParams);

// ---- Employee Grievance ----
router.post("/employee-grievances", authMiddleware(ANY_ROLE), checkPermission("/employee-grievance", "write"), createEmployeeGrievance);
router.get("/employee-grievances", authMiddleware(ANY_ROLE), listEmployeeGrievances);
router.get("/employee-grievances/:grievanceId", authMiddleware(ANY_ROLE), checkPermission("/employee-grievance", "read"), getEmployeeGrievanceById);
router.put("/employee-grievances/:grievanceId", authMiddleware(ANY_ROLE), checkPermission("/employee-grievance", "edit"), updateEmployeeGrievance);
router.delete("/employee-grievances/:grievanceId", authMiddleware(ANY_ROLE), checkPermission("/employee-grievance", "delete"), deleteEmployeeGrievance);
router.post("/employee-grievances/search", authMiddleware(ANY_ROLE), checkPermission("/employee-grievance", "read"), listEmployeeGrievancesByParams);

// ---- Employee Transfer ----
router.post("/employee-transfers", authMiddleware(ANY_ROLE), checkPermission("/employee-transfer", "write"), createEmployeeTransfer);
router.get("/employee-transfers", authMiddleware(ANY_ROLE), listEmployeeTransfers);
router.get("/employee-transfers/:transferId", authMiddleware(ANY_ROLE), checkPermission("/employee-transfer", "read"), getEmployeeTransferById);
router.delete("/employee-transfers/:transferId", authMiddleware(ANY_ROLE), checkPermission("/employee-transfer", "delete"), deleteEmployeeTransfer);
router.post("/employee-transfers/search", authMiddleware(ANY_ROLE), checkPermission("/employee-transfer", "read"), listEmployeeTransfersByParams);

// ---- Employee Promotion ----
router.post("/employee-promotions", authMiddleware(ANY_ROLE), checkPermission("/employee-promotion", "write"), createEmployeePromotion);
router.get("/employee-promotions", authMiddleware(ANY_ROLE), listEmployeePromotions);
router.get("/employee-promotions/:promotionId", authMiddleware(ANY_ROLE), checkPermission("/employee-promotion", "read"), getEmployeePromotionById);
router.delete("/employee-promotions/:promotionId", authMiddleware(ANY_ROLE), checkPermission("/employee-promotion", "delete"), deleteEmployeePromotion);
router.post("/employee-promotions/search", authMiddleware(ANY_ROLE), checkPermission("/employee-promotion", "read"), listEmployeePromotionsByParams);

// ---- Employee Property Change (read-only audit log; no menu row, viewed from the Employee record) ----
router.post("/employee-property-changes/search", authMiddleware(ANY_ROLE), listEmployeePropertyChangesByParams);

// ---- Employee Referral ----
router.post("/employee-referrals", authMiddleware(ANY_ROLE), checkPermission("/employee-referral", "write"), createEmployeeReferral);
router.get("/employee-referrals", authMiddleware(ANY_ROLE), listEmployeeReferrals);
router.get("/employee-referrals/:referralId", authMiddleware(ANY_ROLE), checkPermission("/employee-referral", "read"), getEmployeeReferralById);
router.put("/employee-referrals/:referralId", authMiddleware(ANY_ROLE), checkPermission("/employee-referral", "edit"), updateEmployeeReferral);
router.delete("/employee-referrals/:referralId", authMiddleware(ANY_ROLE), checkPermission("/employee-referral", "delete"), deleteEmployeeReferral);
router.post("/employee-referrals/search", authMiddleware(ANY_ROLE), checkPermission("/employee-referral", "read"), listEmployeeReferralsByParams);
router.post("/employee-referrals/:referralId/create-job-applicant", authMiddleware(ANY_ROLE), checkPermission("/employee-referral", "edit"), createJobApplicantFromReferral);

// ---- Staffing Plan ----
router.post("/staffing-plans", authMiddleware(ANY_ROLE), checkPermission("/staffing-plan", "write"), createStaffingPlan);
router.get("/staffing-plans", authMiddleware(ANY_ROLE), listStaffingPlans);
router.get("/staffing-plans/:planId", authMiddleware(ANY_ROLE), checkPermission("/staffing-plan", "read"), getStaffingPlanById);
router.put("/staffing-plans/:planId", authMiddleware(ANY_ROLE), checkPermission("/staffing-plan", "edit"), updateStaffingPlan);
router.delete("/staffing-plans/:planId", authMiddleware(ANY_ROLE), checkPermission("/staffing-plan", "delete"), deleteStaffingPlan);
router.post("/staffing-plans/search", authMiddleware(ANY_ROLE), checkPermission("/staffing-plan", "read"), listStaffingPlansByParams);

export default router;

/**
 * Staffing Plan (ADR-021, HRMS module 5). Source's parent/subsidiary-
 * company validation layer is dropped — this project's Company is flat,
 * not a tree — only the same-company overlap guard survives.
 * currentCount/currentOpenings/numberOfPositions/totalEstimatedCost are
 * recomputed server-side on every save from live Employee/JobOpening
 * counts, exported as `getDesignationCounts` for the Recruitment retrofit
 * (jobOpening.controller.js/jobOffer.controller.js) to reuse.
 */
import { runListQuery } from "../../utils/listQuery.js";
import StaffingPlan from "../../models/StaffingPlan.js";
import Employee from "../../models/Employee.js";
import JobOpening from "../../models/JobOpening.js";
import {
  getReferencingCounts,
  formatReferenceMessage,
} from "../../utils/referenceHelper.js";

export const getDesignationCounts = async (designationId, companyId, excludeJobOpeningId = null) => {
  const employeeCount = await Employee.countDocuments({ designationId, companyId, status: "Active" });
  const openingFilter = { designationId, companyId, status: "Open" };
  if (excludeJobOpeningId) openingFilter._id = { $ne: excludeJobOpeningId };
  const jobOpenings = await JobOpening.countDocuments(openingFilter);
  return { employeeCount, jobOpenings };
};

// Finds the active Staffing Plan (if any) covering this designation+company
// on the given date — used both to compute this plan's own rows and by the
// Recruitment retrofit's vacancy-cap check.
export const findActivePlanDetail = async (designationId, companyId, onDate) => {
  const plans = await StaffingPlan.find({
    companyId, fromDate: { $lte: onDate }, toDate: { $gte: onDate },
  });
  for (const plan of plans) {
    const detail = plan.staffingDetails.find((d) => String(d.designationId) === String(designationId));
    if (detail) return { plan, detail };
  }
  return null;
};

const recomputePlan = async (doc) => {
  let totalEstimatedBudget = 0;
  for (const detail of doc.staffingDetails) {
    const { employeeCount, jobOpenings } = await getDesignationCounts(detail.designationId, doc.companyId);
    detail.currentCount = employeeCount;
    detail.currentOpenings = jobOpenings;
    detail.numberOfPositions = Number(detail.vacancies || 0) + employeeCount;
    detail.totalEstimatedCost =
      detail.numberOfPositions > 0 && detail.vacancies && detail.estimatedCostPerPosition
        ? Number(detail.vacancies) * Number(detail.estimatedCostPerPosition)
        : 0;
    totalEstimatedBudget += detail.totalEstimatedCost;
  }
  doc.totalEstimatedBudget = totalEstimatedBudget;
};

// Same-company + same-designation + overlapping date range blocks a second
// active plan. No parent/subsidiary-company logic (ADR-021).
const validateOverlap = async (doc) => {
  const others = await StaffingPlan.find({
    _id: { $ne: doc._id }, companyId: doc.companyId,
    fromDate: { $lte: doc.toDate }, toDate: { $gte: doc.fromDate },
  });
  for (const other of others) {
    for (const detail of doc.staffingDetails) {
      if (other.staffingDetails.some((d) => String(d.designationId) === String(detail.designationId))) {
        return `A Staffing Plan already exists for this designation and company in an overlapping date range (${other._id})`;
      }
    }
  }
  return null;
};

const REQUIRED_FIELDS = ["companyId", "fromDate", "toDate"];
const OPTIONAL_FIELDS = ["departmentId", "staffingDetails", "isActive"];
const pickFields = (body) =>
  Object.fromEntries(
    [...REQUIRED_FIELDS, ...OPTIONAL_FIELDS].filter((k) => body[k] !== undefined).map((k) => [k, body[k]]),
  );

export const createStaffingPlan = async (req, res) => {
  try {
    const missing = REQUIRED_FIELDS.filter((k) => !req.body[k]);
    if (missing.length) {
      return res.status(400).json({ isOk: false, status: 400, message: `Missing required field(s): ${missing.join(", ")}` });
    }
    if (new Date(req.body.fromDate) > new Date(req.body.toDate)) {
      return res.status(400).json({ isOk: false, status: 400, message: "From Date cannot be greater than To Date" });
    }
    const doc = new StaffingPlan(pickFields(req.body));

    const overlapError = await validateOverlap(doc);
    if (overlapError) {
      return res.status(409).json({ isOk: false, status: 409, message: overlapError });
    }

    await recomputePlan(doc);
    await doc.save();
    return res.status(201).json({ isOk: true, status: 201, message: "Staffing Plan created successfully" });
  } catch (error) {
    console.log("Error in createStaffingPlan", error);
    return res.status(500).json({ isOk: false, status: 500, message: "Internal server error" });
  }
};

export const updateStaffingPlan = async (req, res) => {
  try {
    const { planId } = req.params;
    const doc = await StaffingPlan.findById(planId);
    if (!doc) {
      return res.status(404).json({ isOk: false, status: 404, message: "Staffing Plan not found" });
    }
    Object.assign(doc, pickFields(req.body));
    if (new Date(doc.fromDate) > new Date(doc.toDate)) {
      return res.status(400).json({ isOk: false, status: 400, message: "From Date cannot be greater than To Date" });
    }
    const overlapError = await validateOverlap(doc);
    if (overlapError) {
      return res.status(409).json({ isOk: false, status: 409, message: overlapError });
    }
    await recomputePlan(doc);
    await doc.save();
    return res.status(200).json({ isOk: true, status: 200, message: "Staffing Plan updated successfully" });
  } catch (error) {
    console.log("Error in updateStaffingPlan", error);
    return res.status(500).json({ isOk: false, status: 500, message: "Internal server error" });
  }
};

export const deleteStaffingPlan = async (req, res) => {
  try {
    const { planId } = req.params;
    const doc = await StaffingPlan.findById(planId);
    if (!doc) {
      return res.status(404).json({ isOk: false, status: 404, message: "Staffing Plan not found" });
    }
    const referenceInfo = await getReferencingCounts("StaffingPlan", planId);
    if (referenceInfo.totalReferences > 0) {
      return res.status(409).json({
        isOk: false, status: 409, message: "Cannot delete Staffing Plan. It is being used by other records.",
        totalReferences: referenceInfo.totalReferences, references: referenceInfo.details,
        formattedMessage: formatReferenceMessage(referenceInfo.details),
      });
    }
    await StaffingPlan.findByIdAndUpdate(planId, { isDeleted: true });
    return res.status(200).json({ isOk: true, status: 200, message: "Staffing Plan deleted successfully" });
  } catch (error) {
    console.log("Error in deleteStaffingPlan", error);
    return res.status(500).json({ isOk: false, status: 500, message: "Internal server error" });
  }
};

export const getStaffingPlanById = async (req, res) => {
  try {
    const doc = await StaffingPlan.findById(req.params.planId);
    if (!doc) {
      return res.status(404).json({ isOk: false, status: 404, message: "Staffing Plan not found" });
    }
    return res.status(200).json({ isOk: true, status: 200, data: doc });
  } catch (error) {
    console.log("Error in getStaffingPlanById", error);
    return res.status(500).json({ isOk: false, status: 500, message: "Internal server error" });
  }
};

export const listStaffingPlans = async (_req, res) => {
  try {
    const docs = await StaffingPlan.find({ isActive: true }).select("companyId fromDate toDate");
    return res.status(200).json({ isOk: true, status: 200, data: docs });
  } catch (error) {
    console.log("Error in listStaffingPlans", error);
    return res.status(500).json({ isOk: false, status: 500, message: "Internal server error" });
  }
};

export const listStaffingPlansByParams = async (req, res) => {
  try {
    const list = await runListQuery(StaffingPlan, req.body, {
      searchFields: [],
      filterable: {
        companyId: "objectId", departmentId: "objectId",
        fromDate: "date", toDate: "date", isActive: "boolean", createdAt: "date",
      },
    });
    return res.status(200).json({ isOk: true, status: 200, data: list });
  } catch (error) {
    console.log(error);
    return res.status(500).json({ isOk: false, status: 500, message: "Internal server error" });
  }
};

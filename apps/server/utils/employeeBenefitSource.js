import EmployeeBenefitApplication from "../models/EmployeeBenefitApplication.js";
import PayrollSettings from "../models/PayrollSettings.js";
import { getCurrentSalaryStructureAssignment } from "./payrollAssignment.js";

/**
 * ADR-029 (Payroll — Benefits).
 *
 * Resolves the authoritative flexible benefit configuration for an employee in a given
 * payroll period:
 * 1. If an approved/submitted EmployeeBenefitApplication exists, it governs.
 * 2. If none exists and PayrollSettings.mandatoryBenefitApplication is false, falls back
 *    to the employee's current SalaryStructureAssignment.employeeBenefits[].
 * 3. If mandatoryBenefitApplication is true and no application exists, returns null
 *    (no benefits claimable).
 */
export const getBenefitsDetailsParent = async (employeeId, payrollPeriodId, asOfDate = new Date()) => {
  if (!employeeId || !payrollPeriodId) return null;

  const app = await EmployeeBenefitApplication.findOne({
    employeeId,
    payrollPeriodId,
    status: "submitted",
  }).lean();

  if (app) {
    return {
      source: "EmployeeBenefitApplication",
      doc: app,
      benefits: app.employeeBenefits || [],
      currency: app.currency,
      maxBenefits: app.maxBenefits,
    };
  }

  const settings = await PayrollSettings.findOne({ key: "default" }).lean();
  if (settings?.mandatoryBenefitApplication) {
    return null;
  }

  const assignment = await getCurrentSalaryStructureAssignment(employeeId, asOfDate);
  if (assignment && assignment.employeeBenefits && assignment.employeeBenefits.length > 0) {
    return {
      source: "SalaryStructureAssignment",
      doc: assignment,
      benefits: assignment.employeeBenefits,
      currency: assignment.currency,
      maxBenefits: assignment.maxBenefits,
    };
  }

  return null;
};

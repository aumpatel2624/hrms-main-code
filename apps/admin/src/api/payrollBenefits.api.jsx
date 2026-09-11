import api from "./index";
import { ENDPOINTS } from "./endpoints";

// ADR-029 (Payroll — Benefits).

// Employee Benefit Application
export const createEmployeeBenefitApplication = async (data) => api.post(ENDPOINTS.EMPLOYEE_BENEFIT_APPLICATIONS.BASE, data);
export const getAllEmployeeBenefitApplications = async () => api.get(ENDPOINTS.EMPLOYEE_BENEFIT_APPLICATIONS.BASE);
export const getEmployeeBenefitApplicationById = async (id) => api.get(ENDPOINTS.EMPLOYEE_BENEFIT_APPLICATIONS.BY_ID(id));
export const updateEmployeeBenefitApplication = async (id, data) => api.put(ENDPOINTS.EMPLOYEE_BENEFIT_APPLICATIONS.BY_ID(id), data);
export const searchEmployeeBenefitApplications = async (data) => api.post(ENDPOINTS.EMPLOYEE_BENEFIT_APPLICATIONS.SEARCH, data);
export const submitEmployeeBenefitApplication = async (id) => api.post(ENDPOINTS.EMPLOYEE_BENEFIT_APPLICATIONS.SUBMIT(id));
export const cancelEmployeeBenefitApplication = async (id) => api.post(ENDPOINTS.EMPLOYEE_BENEFIT_APPLICATIONS.CANCEL(id));
export const deleteEmployeeBenefitApplication = async (id) => api.delete(ENDPOINTS.EMPLOYEE_BENEFIT_APPLICATIONS.BY_ID(id));

// Employee Benefit Claim
export const createEmployeeBenefitClaim = async (data) => api.post(ENDPOINTS.EMPLOYEE_BENEFIT_CLAIMS.BASE, data);
export const getAllEmployeeBenefitClaims = async () => api.get(ENDPOINTS.EMPLOYEE_BENEFIT_CLAIMS.BASE);
export const getEmployeeBenefitClaimById = async (id) => api.get(ENDPOINTS.EMPLOYEE_BENEFIT_CLAIMS.BY_ID(id));
export const updateEmployeeBenefitClaim = async (id, data) => api.put(ENDPOINTS.EMPLOYEE_BENEFIT_CLAIMS.BY_ID(id), data);
export const searchEmployeeBenefitClaims = async (data) => api.post(ENDPOINTS.EMPLOYEE_BENEFIT_CLAIMS.SEARCH, data);
export const calculateClaimEligibility = async (data) => api.post(ENDPOINTS.EMPLOYEE_BENEFIT_CLAIMS.CALCULATE_ELIGIBILITY, data);
export const submitEmployeeBenefitClaim = async (id) => api.post(ENDPOINTS.EMPLOYEE_BENEFIT_CLAIMS.SUBMIT(id));
export const cancelEmployeeBenefitClaim = async (id) => api.post(ENDPOINTS.EMPLOYEE_BENEFIT_CLAIMS.CANCEL(id));
export const deleteEmployeeBenefitClaim = async (id) => api.delete(ENDPOINTS.EMPLOYEE_BENEFIT_CLAIMS.BY_ID(id));

// Employee Benefit Ledger (read-only)
export const getAllEmployeeBenefitLedgers = async () => api.get(ENDPOINTS.EMPLOYEE_BENEFIT_LEDGERS.BASE);
export const getEmployeeBenefitLedgerById = async (id) => api.get(ENDPOINTS.EMPLOYEE_BENEFIT_LEDGERS.BY_ID(id));
export const searchEmployeeBenefitLedgers = async (data) => api.post(ENDPOINTS.EMPLOYEE_BENEFIT_LEDGERS.SEARCH, data);

// Payroll Correction
export const createPayrollCorrection = async (data) => api.post(ENDPOINTS.PAYROLL_CORRECTIONS.BASE, data);
export const getAllPayrollCorrections = async () => api.get(ENDPOINTS.PAYROLL_CORRECTIONS.BASE);
export const getPayrollCorrectionById = async (id) => api.get(ENDPOINTS.PAYROLL_CORRECTIONS.BY_ID(id));
export const updatePayrollCorrection = async (id, data) => api.put(ENDPOINTS.PAYROLL_CORRECTIONS.BY_ID(id), data);
export const searchPayrollCorrections = async (data) => api.post(ENDPOINTS.PAYROLL_CORRECTIONS.SEARCH, data);
export const calculateCorrectionBreakup = async (data) => api.post(ENDPOINTS.PAYROLL_CORRECTIONS.CALCULATE_BREAKUP, data);
export const submitPayrollCorrection = async (id) => api.post(ENDPOINTS.PAYROLL_CORRECTIONS.SUBMIT(id));
export const cancelPayrollCorrection = async (id) => api.post(ENDPOINTS.PAYROLL_CORRECTIONS.CANCEL(id));
export const deletePayrollCorrection = async (id) => api.delete(ENDPOINTS.PAYROLL_CORRECTIONS.BY_ID(id));

import api from "./index";
import { ENDPOINTS } from "./endpoints";

// ADR-027 (Payroll — Run, foundation half).
export const createPayrollPeriod = async (data) => api.post(ENDPOINTS.PAYROLL_PERIODS.BASE, data);
export const getAllPayrollPeriods = async () => api.get(ENDPOINTS.PAYROLL_PERIODS.BASE);
export const getPayrollPeriodById = async (id) => api.get(ENDPOINTS.PAYROLL_PERIODS.BY_ID(id));
export const updatePayrollPeriod = async (id, data) => api.put(ENDPOINTS.PAYROLL_PERIODS.BY_ID(id), data);
export const deletePayrollPeriod = async (id) => api.delete(ENDPOINTS.PAYROLL_PERIODS.BY_ID(id));
export const searchPayrollPeriods = async (data) => api.post(ENDPOINTS.PAYROLL_PERIODS.SEARCH, data);

// Singleton — no id, no list/search.
export const getPayrollSettings = async () => api.get(ENDPOINTS.PAYROLL_SETTINGS.BASE);
export const updatePayrollSettings = async (data) => api.put(ENDPOINTS.PAYROLL_SETTINGS.BASE, data);

export const createSalarySlip = async (data) => api.post(ENDPOINTS.SALARY_SLIPS.BASE, data);
export const getAllSalarySlips = async () => api.get(ENDPOINTS.SALARY_SLIPS.BASE);
export const getSalarySlipById = async (id) => api.get(ENDPOINTS.SALARY_SLIPS.BY_ID(id));
// No field can actually change through this — a Salary Slip is a read-only
// snapshot (Submit/Cancel are the real actions). Exists only so the admin's
// generic edit screen has something to call.
export const updateSalarySlip = async (id, data) => api.put(ENDPOINTS.SALARY_SLIPS.BY_ID(id), data);
export const deleteSalarySlip = async (id) => api.delete(ENDPOINTS.SALARY_SLIPS.BY_ID(id));
export const searchSalarySlips = async (data) => api.post(ENDPOINTS.SALARY_SLIPS.SEARCH, data);
export const submitSalarySlip = async (id) => api.post(ENDPOINTS.SALARY_SLIPS.SUBMIT(id));
export const cancelSalarySlip = async (id) => api.post(ENDPOINTS.SALARY_SLIPS.CANCEL(id));

export const createPayrollEntry = data => api.post(ENDPOINTS.PAYROLL_ENTRIES.BASE, data);
export const searchPayrollEntries = data => api.post(ENDPOINTS.PAYROLL_ENTRIES.SEARCH, data);
export const getPayrollEntry = id => api.get(ENDPOINTS.PAYROLL_ENTRIES.BY_ID(id));
export const createPayrollSlips = id => api.post(ENDPOINTS.PAYROLL_ENTRIES.CREATE_SLIPS(id), {});
export const submitPayrollSlips = id => api.post(ENDPOINTS.PAYROLL_ENTRIES.SUBMIT_SLIPS(id), {});
export const cancelPayrollEntry = id => api.post(ENDPOINTS.PAYROLL_ENTRIES.CANCEL(id), {});
export const createSalaryWithholding = data => api.post(ENDPOINTS.SALARY_WITHHOLDINGS.BASE, data);
export const searchSalaryWithholdings = data => api.post(ENDPOINTS.SALARY_WITHHOLDINGS.SEARCH, data);
export const getSalaryWithholding = id => api.get(ENDPOINTS.SALARY_WITHHOLDINGS.BY_ID(id));
export const releaseWithholdingCycle = (id, data) => api.post(ENDPOINTS.SALARY_WITHHOLDINGS.RELEASE_CYCLE(id), data);
export const releaseAllWithholdingCycles = (id, data = {}) => api.post(ENDPOINTS.SALARY_WITHHOLDINGS.RELEASE_ALL(id), data);
export const cancelSalaryWithholding = id => api.post(ENDPOINTS.SALARY_WITHHOLDINGS.CANCEL(id), {});

export const updateSalaryWithholding = (id, data) => api.put(ENDPOINTS.SALARY_WITHHOLDINGS.BY_ID(id), data);
export const deleteSalaryWithholding = id => api.delete(ENDPOINTS.SALARY_WITHHOLDINGS.BY_ID(id));
export const deletePayrollEntry = id => api.delete(ENDPOINTS.PAYROLL_ENTRIES.BY_ID(id));

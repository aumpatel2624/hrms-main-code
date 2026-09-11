import api from "./index";
import { ENDPOINTS } from "./endpoints";

// ADR-028 (Payroll — Adjustments & Incentives).

// Additional Salary
export const createAdditionalSalary = async (data) => api.post(ENDPOINTS.ADDITIONAL_SALARIES.BASE, data);
export const getAllAdditionalSalaries = async () => api.get(ENDPOINTS.ADDITIONAL_SALARIES.BASE);
export const getAdditionalSalaryById = async (id) => api.get(ENDPOINTS.ADDITIONAL_SALARIES.BY_ID(id));
export const searchAdditionalSalaries = async (data) => api.post(ENDPOINTS.ADDITIONAL_SALARIES.SEARCH, data);
export const cancelAdditionalSalary = async (id) => api.post(ENDPOINTS.ADDITIONAL_SALARIES.CANCEL(id));
export const deleteAdditionalSalary = async (id) => api.delete(ENDPOINTS.ADDITIONAL_SALARIES.BY_ID(id));

// Arrear
export const createArrear = async (data) => api.post(ENDPOINTS.ARREARS.BASE, data);
export const getAllArrears = async () => api.get(ENDPOINTS.ARREARS.BASE);
export const getArrearById = async (id) => api.get(ENDPOINTS.ARREARS.BY_ID(id));
export const updateArrear = async (id, data) => api.put(ENDPOINTS.ARREARS.BY_ID(id), data);
export const searchArrears = async (data) => api.post(ENDPOINTS.ARREARS.SEARCH, data);
export const calculateArrearPreview = async (data) => api.post(ENDPOINTS.ARREARS.CALCULATE, data);
export const submitArrear = async (id) => api.post(ENDPOINTS.ARREARS.SUBMIT(id));
export const cancelArrear = async (id) => api.post(ENDPOINTS.ARREARS.CANCEL(id));
export const deleteArrear = async (id) => api.delete(ENDPOINTS.ARREARS.BY_ID(id));

// Retention Bonus
export const createRetentionBonus = async (data) => api.post(ENDPOINTS.RETENTION_BONUSES.BASE, data);
export const getAllRetentionBonuses = async () => api.get(ENDPOINTS.RETENTION_BONUSES.BASE);
export const getRetentionBonusById = async (id) => api.get(ENDPOINTS.RETENTION_BONUSES.BY_ID(id));
export const updateRetentionBonus = async (id, data) => api.put(ENDPOINTS.RETENTION_BONUSES.BY_ID(id), data);
export const searchRetentionBonuses = async (data) => api.post(ENDPOINTS.RETENTION_BONUSES.SEARCH, data);
export const submitRetentionBonus = async (id) => api.post(ENDPOINTS.RETENTION_BONUSES.SUBMIT(id));
export const cancelRetentionBonus = async (id) => api.post(ENDPOINTS.RETENTION_BONUSES.CANCEL(id));
export const deleteRetentionBonus = async (id) => api.delete(ENDPOINTS.RETENTION_BONUSES.BY_ID(id));

// Employee Incentive
export const createEmployeeIncentive = async (data) => api.post(ENDPOINTS.EMPLOYEE_INCENTIVES.BASE, data);
export const getAllEmployeeIncentives = async () => api.get(ENDPOINTS.EMPLOYEE_INCENTIVES.BASE);
export const getEmployeeIncentiveById = async (id) => api.get(ENDPOINTS.EMPLOYEE_INCENTIVES.BY_ID(id));
export const updateEmployeeIncentive = async (id, data) => api.put(ENDPOINTS.EMPLOYEE_INCENTIVES.BY_ID(id), data);
export const searchEmployeeIncentives = async (data) => api.post(ENDPOINTS.EMPLOYEE_INCENTIVES.SEARCH, data);
export const submitEmployeeIncentive = async (id) => api.post(ENDPOINTS.EMPLOYEE_INCENTIVES.SUBMIT(id));
export const cancelEmployeeIncentive = async (id) => api.post(ENDPOINTS.EMPLOYEE_INCENTIVES.CANCEL(id));
export const deleteEmployeeIncentive = async (id) => api.delete(ENDPOINTS.EMPLOYEE_INCENTIVES.BY_ID(id));

// Employee Other Income
export const createEmployeeOtherIncome = async (data) => api.post(ENDPOINTS.EMPLOYEE_OTHER_INCOMES.BASE, data);
export const getAllEmployeeOtherIncomes = async () => api.get(ENDPOINTS.EMPLOYEE_OTHER_INCOMES.BASE);
export const getEmployeeOtherIncomeById = async (id) => api.get(ENDPOINTS.EMPLOYEE_OTHER_INCOMES.BY_ID(id));
export const updateEmployeeOtherIncome = async (id, data) => api.put(ENDPOINTS.EMPLOYEE_OTHER_INCOMES.BY_ID(id), data);
export const searchEmployeeOtherIncomes = async (data) => api.post(ENDPOINTS.EMPLOYEE_OTHER_INCOMES.SEARCH, data);
export const submitEmployeeOtherIncome = async (id) => api.post(ENDPOINTS.EMPLOYEE_OTHER_INCOMES.SUBMIT(id));
export const cancelEmployeeOtherIncome = async (id) => api.post(ENDPOINTS.EMPLOYEE_OTHER_INCOMES.CANCEL(id));
export const deleteEmployeeOtherIncome = async (id) => api.delete(ENDPOINTS.EMPLOYEE_OTHER_INCOMES.BY_ID(id));

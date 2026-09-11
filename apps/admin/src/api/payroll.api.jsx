import api from "./index";
import { ENDPOINTS } from "./endpoints";

// ADR-026 (Payroll — Structure & Assignment).
export const createSalaryComponent = async (data) => api.post(ENDPOINTS.SALARY_COMPONENTS.BASE, data);
export const getAllSalaryComponents = async () => api.get(ENDPOINTS.SALARY_COMPONENTS.BASE);
export const getSalaryComponentById = async (id) => api.get(ENDPOINTS.SALARY_COMPONENTS.BY_ID(id));
export const updateSalaryComponent = async (id, data) => api.put(ENDPOINTS.SALARY_COMPONENTS.BY_ID(id), data);
export const deleteSalaryComponent = async (id) => api.delete(ENDPOINTS.SALARY_COMPONENTS.BY_ID(id));
export const searchSalaryComponents = async (data) => api.post(ENDPOINTS.SALARY_COMPONENTS.SEARCH, data);

export const createSalaryStructure = async (data) => api.post(ENDPOINTS.SALARY_STRUCTURES.BASE, data);
export const getAllSalaryStructures = async () => api.get(ENDPOINTS.SALARY_STRUCTURES.BASE);
export const getSalaryStructureById = async (id) => api.get(ENDPOINTS.SALARY_STRUCTURES.BY_ID(id));
export const updateSalaryStructure = async (id, data) => api.put(ENDPOINTS.SALARY_STRUCTURES.BY_ID(id), data);
export const deleteSalaryStructure = async (id) => api.delete(ENDPOINTS.SALARY_STRUCTURES.BY_ID(id));
export const searchSalaryStructures = async (data) => api.post(ENDPOINTS.SALARY_STRUCTURES.SEARCH, data);

export const createSalaryStructureAssignment = async (data) => api.post(ENDPOINTS.SALARY_STRUCTURE_ASSIGNMENTS.BASE, data);
export const getAllSalaryStructureAssignments = async () => api.get(ENDPOINTS.SALARY_STRUCTURE_ASSIGNMENTS.BASE);
export const getSalaryStructureAssignmentById = async (id) => api.get(ENDPOINTS.SALARY_STRUCTURE_ASSIGNMENTS.BY_ID(id));
export const updateSalaryStructureAssignment = async (id, data) => api.put(ENDPOINTS.SALARY_STRUCTURE_ASSIGNMENTS.BY_ID(id), data);
export const deleteSalaryStructureAssignment = async (id) => api.delete(ENDPOINTS.SALARY_STRUCTURE_ASSIGNMENTS.BY_ID(id));
export const searchSalaryStructureAssignments = async (data) => api.post(ENDPOINTS.SALARY_STRUCTURE_ASSIGNMENTS.SEARCH, data);

// Bulk Salary Structure Assignment — stateless bulk-action tool, no stored
// model (same shape as Leave Control Panel / Shift Assignment Tool).
export const getEligibleEmployeesForBulkAssignment = async (data) => api.post(ENDPOINTS.BULK_SALARY_STRUCTURE_ASSIGNMENT.ELIGIBLE_EMPLOYEES, data);
export const bulkAssignSalaryStructure = async (data) => api.post(ENDPOINTS.BULK_SALARY_STRUCTURE_ASSIGNMENT.ASSIGN, data);

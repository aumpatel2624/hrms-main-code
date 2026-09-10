/**
 * Organization Setup API (ADR-017): Company, Branch, Designation,
 * Employment Type, Employee Grade — grouped in one file the way
 * locations.api.jsx groups Country/State/City. Department stays in
 * departments.api.jsx since it predates this module.
 */
import api from "./index";
import { ENDPOINTS } from "./endpoints";

// ---------------------------------------------------------------- Company --
export const createCompany = async (data) => api.post(ENDPOINTS.COMPANIES.BASE, data);
export const getAllCompanies = async () => api.get(ENDPOINTS.COMPANIES.BASE);
export const getCompanyById = async (id) => api.get(ENDPOINTS.COMPANIES.BY_ID(id));
export const updateCompany = async (id, data) => api.put(ENDPOINTS.COMPANIES.BY_ID(id), data);
export const deleteCompany = async (id) => api.delete(ENDPOINTS.COMPANIES.BY_ID(id));
export const searchCompanies = async (params) => api.post(ENDPOINTS.COMPANIES.SEARCH, params);

// ----------------------------------------------------------------- Branch --
export const createBranch = async (data) => api.post(ENDPOINTS.BRANCHES.BASE, data);
export const getAllBranches = async (companyId) =>
    api.get(ENDPOINTS.BRANCHES.BASE, { params: companyId ? { companyId } : {} });
export const getBranchById = async (id) => api.get(ENDPOINTS.BRANCHES.BY_ID(id));
export const updateBranch = async (id, data) => api.put(ENDPOINTS.BRANCHES.BY_ID(id), data);
export const deleteBranch = async (id) => api.delete(ENDPOINTS.BRANCHES.BY_ID(id));
export const searchBranches = async (params) => api.post(ENDPOINTS.BRANCHES.SEARCH, params);

// ------------------------------------------------------------- Designation --
export const createDesignation = async (data) => api.post(ENDPOINTS.DESIGNATIONS.BASE, data);
export const getAllDesignations = async (companyId) =>
    api.get(ENDPOINTS.DESIGNATIONS.BASE, { params: companyId ? { companyId } : {} });
export const getDesignationById = async (id) => api.get(ENDPOINTS.DESIGNATIONS.BY_ID(id));
export const updateDesignation = async (id, data) => api.put(ENDPOINTS.DESIGNATIONS.BY_ID(id), data);
export const deleteDesignation = async (id) => api.delete(ENDPOINTS.DESIGNATIONS.BY_ID(id));
export const searchDesignations = async (params) => api.post(ENDPOINTS.DESIGNATIONS.SEARCH, params);

// --------------------------------------------------------- Employment Type --
export const createEmploymentType = async (data) => api.post(ENDPOINTS.EMPLOYMENT_TYPES.BASE, data);
export const getAllEmploymentTypes = async () => api.get(ENDPOINTS.EMPLOYMENT_TYPES.BASE);
export const getEmploymentTypeById = async (id) => api.get(ENDPOINTS.EMPLOYMENT_TYPES.BY_ID(id));
export const updateEmploymentType = async (id, data) => api.put(ENDPOINTS.EMPLOYMENT_TYPES.BY_ID(id), data);
export const deleteEmploymentType = async (id) => api.delete(ENDPOINTS.EMPLOYMENT_TYPES.BY_ID(id));
export const searchEmploymentTypes = async (params) => api.post(ENDPOINTS.EMPLOYMENT_TYPES.SEARCH, params);

// ---------------------------------------------------------- Employee Grade --
export const createEmployeeGrade = async (data) => api.post(ENDPOINTS.EMPLOYEE_GRADES.BASE, data);
export const getAllEmployeeGrades = async () => api.get(ENDPOINTS.EMPLOYEE_GRADES.BASE);
export const getEmployeeGradeById = async (id) => api.get(ENDPOINTS.EMPLOYEE_GRADES.BY_ID(id));
export const updateEmployeeGrade = async (id, data) => api.put(ENDPOINTS.EMPLOYEE_GRADES.BY_ID(id), data);
export const deleteEmployeeGrade = async (id) => api.delete(ENDPOINTS.EMPLOYEE_GRADES.BY_ID(id));
export const searchEmployeeGrades = async (params) => api.post(ENDPOINTS.EMPLOYEE_GRADES.SEARCH, params);

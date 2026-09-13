/**
 * Departments API Service
 * Handles all department-related API calls
 */
import api from "./index";
import { ENDPOINTS } from "./endpoints";
import { cachedQuery, invalidateQuery } from "../queryClient";

const departmentKey = ["reference-data", "departments"];
const invalidateDepartments = () => invalidateQuery(departmentKey);

/**
 * Create a new department
 * @param {Object} data - Department data
 * @returns {Promise}
 */
export const createDepartment = async (data) => {
    const response = await api.post(ENDPOINTS.DEPARTMENTS.BASE, data); invalidateDepartments(); return response;
};

/**
 * Get all departments
 * @returns {Promise}
 */
export const getAllDepartments = async () => {
    return cachedQuery(departmentKey, () => api.get(ENDPOINTS.DEPARTMENTS.BASE));
};

/**
 * Get department by ID
 * @param {string} id - Department ID
 * @returns {Promise}
 */
export const getDepartmentById = async (id) => {
    return api.get(ENDPOINTS.DEPARTMENTS.BY_ID(id));
};

/**
 * Update department
 * @param {string} id - Department ID
 * @param {Object} data - Updated department data
 * @returns {Promise}
 */
export const updateDepartment = async (id, data) => {
    const response = await api.put(ENDPOINTS.DEPARTMENTS.BY_ID(id), data); invalidateDepartments(); return response;
};

/**
 * Delete department
 * @param {string} id - Department ID
 * @returns {Promise}
 */
export const deleteDepartment = async (id) => {
    const response = await api.delete(ENDPOINTS.DEPARTMENTS.BY_ID(id)); invalidateDepartments(); return response;
};

/**
 * Search departments with filters
 * @param {Object} params - Search parameters
 * @returns {Promise}
 */
export const searchDepartments = async (params) => {
    return api.post(ENDPOINTS.DEPARTMENTS.SEARCH, params);
};

export default {
    createDepartment,
    getAllDepartments,
    getDepartmentById,
    updateDepartment,
    deleteDepartment,
    searchDepartments,
};

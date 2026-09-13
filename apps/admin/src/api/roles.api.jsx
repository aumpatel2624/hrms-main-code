/**
 * Roles API Service
 * Handles all role-related API calls
 */
import api from "./index";
import { ENDPOINTS } from "./endpoints";
import { cachedQuery, invalidateQuery } from "../queryClient";

const roleKey = ["reference-data", "roles"];
const invalidateRoles = () => invalidateQuery(roleKey);

/**
 * Create a new role
 * @param {Object} data - Role data
 * @returns {Promise}
 */
export const createRole = async (data) => {
    const response = await api.post(ENDPOINTS.ROLES.BASE, data); invalidateRoles(); return response;
};

/**
 * Get all roles
 * @returns {Promise}
 */
export const getAllRoles = async () => {
    return cachedQuery(roleKey, () => api.get(ENDPOINTS.ROLES.BASE));
};

/**
 * Get role by ID
 * @param {string} id - Role ID
 * @returns {Promise}
 */
export const getRoleById = async (id) => {
    return api.get(ENDPOINTS.ROLES.BY_ID(id));
};

/**
 * Update role
 * @param {string} id - Role ID
 * @param {Object} data - Updated role data
 * @returns {Promise}
 */
export const updateRole = async (id, data) => {
    const response = await api.put(ENDPOINTS.ROLES.BY_ID(id), data); invalidateRoles(); return response;
};

/**
 * Delete role
 * @param {string} id - Role ID
 * @returns {Promise}
 */
export const deleteRole = async (id) => {
    const response = await api.delete(ENDPOINTS.ROLES.BY_ID(id)); invalidateRoles(); return response;
};

/**
 * Search roles with filters
 * @param {Object} params - Search parameters
 * @returns {Promise}
 */
export const searchRoles = async (params) => {
    return api.post(ENDPOINTS.ROLES.SEARCH, params);
};

export default {
    createRole,
    getAllRoles,
    getRoleById,
    updateRole,
    deleteRole,
    searchRoles,
};

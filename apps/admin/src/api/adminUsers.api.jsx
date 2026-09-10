/**
 * Admin Users API Service
 * Admin users are the panel owners - they bypass role-based menu permissions.
 */
import api from "./index";
import { ENDPOINTS } from "./endpoints";

export const createAdminUser = async (data) => {
    return api.post(ENDPOINTS.ADMIN_USERS.BASE, data);
};

export const getAllAdminUsers = async () => {
    return api.get(ENDPOINTS.ADMIN_USERS.BASE);
};

export const getAdminUserById = async (id) => {
    return api.get(ENDPOINTS.ADMIN_USERS.BY_ID(id));
};

export const updateAdminUser = async (id, data) => {
    return api.put(ENDPOINTS.ADMIN_USERS.BY_ID(id), data);
};

export const deleteAdminUser = async (id) => {
    return api.delete(ENDPOINTS.ADMIN_USERS.BY_ID(id));
};

export const searchAdminUsers = async (params) => {
    return api.post(ENDPOINTS.ADMIN_USERS.SEARCH, params);
};

export const resetAdminUserPassword = async (id, data) => {
    return api.post(ENDPOINTS.ADMIN_USERS.RESET_PASSWORD(id), data);
};

export default {
    createAdminUser,
    getAllAdminUsers,
    getAdminUserById,
    updateAdminUser,
    deleteAdminUser,
    searchAdminUsers,
    resetAdminUserPassword,
};

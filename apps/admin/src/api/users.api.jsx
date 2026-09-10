/**
 * Users API Service
 * Users log into the same panel but only see menus their role grants them.
 */
import api from "./index";
import { ENDPOINTS } from "./endpoints";

export const createUser = async (data) => {
    return api.post(ENDPOINTS.USERS.BASE, data);
};

export const getAllUsers = async () => {
    return api.get(ENDPOINTS.USERS.BASE);
};

export const getUserById = async (id) => {
    return api.get(ENDPOINTS.USERS.BY_ID(id));
};

export const updateUser = async (id, data) => {
    return api.put(ENDPOINTS.USERS.BY_ID(id), data);
};

export const deleteUser = async (id) => {
    return api.delete(ENDPOINTS.USERS.BY_ID(id));
};

export const searchUsers = async (params) => {
    return api.post(ENDPOINTS.USERS.SEARCH, params);
};

export const resetUserPassword = async (id, data) => {
    return api.post(ENDPOINTS.USERS.RESET_PASSWORD(id), data);
};

export default {
    createUser,
    getAllUsers,
    getUserById,
    updateUser,
    deleteUser,
    searchUsers,
    resetUserPassword,
};

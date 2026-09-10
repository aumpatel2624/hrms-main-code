/**
 * User Roles API Service
 * Maps a role to its menu-level read/write/edit/delete/print/mail permissions.
 */
import api from "./index";
import { ENDPOINTS } from "./endpoints";

export const createUserRoles = async (data) => {
    return api.post(ENDPOINTS.USER_ROLES.BASE, data);
};

export const getUserRolesByRoleId = async (roleId) => {
    return api.get(ENDPOINTS.USER_ROLES.BY_ID(roleId));
};

export const updateUserRoles = async (roleId, data) => {
    return api.put(ENDPOINTS.USER_ROLES.BY_ID(roleId), data);
};

export default {
    createUserRoles,
    getUserRolesByRoleId,
    updateUserRoles,
};

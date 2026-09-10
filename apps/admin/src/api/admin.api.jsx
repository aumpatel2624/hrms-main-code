/**
 * Admin API Service
 * Handles all admin-related API calls
 */
import api from "./index";
import { ENDPOINTS } from "./endpoints";

/**
 * Get all login attempts with pagination
 * @param {Object} params - { skip, per_page, match, sorton, sortdir }
 * @returns {Promise}
 */
export const getLoginAttempts = async (params) => {
    return api.post(ENDPOINTS.ADMIN.LOGIN_ATTEMPTS, params);
};

/**
 * Reset login attempts for a user
 * @param {string} userId - User ID to reset attempts for
 * @returns {Promise}
 */
export const resetLoginAttempts = async (userId) => {
    return api.post(ENDPOINTS.ADMIN.RESET_ATTEMPTS, { userId });
};

/**
 * Unlock a locked user account
 * @param {string} userId - User ID to unlock
 * @returns {Promise}
 */
export const unlockAccount = async (userId) => {
    return api.post(ENDPOINTS.ADMIN.UNLOCK_ACCOUNT, { userId });
};

/**
 * Block a user account
 * @param {string} userId - User ID to block
 * @returns {Promise}
 */
export const blockUser = async (userId) => {
    return api.post(ENDPOINTS.ADMIN.BLOCK_USER, { userId });
};

/**
 * Unblock a user account
 * @param {string} userId - User ID to unblock
 * @returns {Promise}
 */
export const unblockUser = async (userId) => {
    return api.post(ENDPOINTS.ADMIN.UNBLOCK_USER, { userId });
};

export default {
    getLoginAttempts,
    resetLoginAttempts,
    unlockAccount,
    blockUser,
    unblockUser,
};

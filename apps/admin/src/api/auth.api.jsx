/**
 * Auth API Service
 * Handles all authentication-related API calls
 *
 * Uses cookie-based session authentication (express-session)
 */
import api from "./index";
import { ENDPOINTS } from "./endpoints";
import { queryClient } from "../queryClient";

/**
 * Log in. One endpoint for both admin users and users - the server works out
 * which entity the email belongs to and returns the role.
 * @param {Object} credentials - { email, password, locationConsent, ipConsent, clientLatitude, clientLongitude }
 * @param {Object} customHeaders - Custom headers with client location info
 * @returns {Promise}
 */
export const login = async (credentials, customHeaders = {}) => {
    return api.post(ENDPOINTS.AUTH.LOGIN, credentials, {
        headers: {
            ...customHeaders,
        },
        validateStatus: function (status) {
            // Accept all 2xx, 4xx for proper handling of login attempts
            return (status >= 200 && status < 300) || (status >= 400 && status < 500);
        },
    });
};

/**
 * Get current logged-in account
 * @returns {Promise}
 */
export const getCurrentUser = async () => {
    return api.get(ENDPOINTS.AUTH.ME);
};

/**
 * Verify if session is valid
 * @returns {Promise}
 */
export const verifySession = async () => {
    return api.get(ENDPOINTS.AUTH.VERIFY_SESSION);
};

/**
 * Send OTP for password reset
 * @param {Object} data - { email }
 * @returns {Promise}
 */
export const sendOtp = async (data) => {
    return api.post(ENDPOINTS.AUTH.OTP_SEND, data, {
        validateStatus: function (status) {
            return status >= 200 && status <= 500;
        },
    });
};

/**
 * Verify OTP
 * @param {Object} data - { email, otp }
 * @returns {Promise}
 */
export const verifyOtp = async (data) => {
    return api.post(ENDPOINTS.AUTH.OTP_VERIFY, data, {
        validateStatus: function (status) {
            return status >= 200 && status <= 500;
        },
    });
};

/**
 * Reset password with OTP
 * @param {Object} data - { email, otp, newPassword }
 * @returns {Promise}
 */
export const resetPassword = async (data) => {
    return api.post(ENDPOINTS.AUTH.PASSWORD_RESET, data, {
        validateStatus: function (status) {
            return status >= 200 && status <= 500;
        },
    });
};

/**
 * Change the signed-in person's own password. A wrong current password or a
 * new one that breaks the rule answers 400 with the reason in `message`.
 * @param {Object} data - { currentPassword, newPassword }
 * @returns {Promise}
 */
export const changePassword = async (data) => {
    return api.post(ENDPOINTS.AUTH.CHANGE_PASSWORD, data, {
        validateStatus: function (status) {
            return status >= 200 && status <= 500;
        },
    });
};

/**
 * Logout - invalidates the session on the server and clears local storage
 */
export const logout = async () => {
    try {
        // Call server to invalidate session (cookie will be cleared by server)
        await api.post(ENDPOINTS.AUTH.LOGOUT);
    } catch (error) {
        console.error("Logout API error:", error);
    } finally {
        queryClient.clear();
        // Always clear local storage regardless of API result
        localStorage.removeItem("role");
        window.location.href = "/";
    }
};

export default {
    login,
    getCurrentUser,
    verifySession,
    sendOtp,
    verifyOtp,
    resetPassword,
    changePassword,
    logout,
};

/**
 * Emails API Service
 * Handles all email-related API calls (Email Setup, Email For, Email Templates)
 */
import api from "./index";
import { ENDPOINTS } from "./endpoints";

// ============ EMAIL SETUP OPERATIONS ============

/**
 * Create a new email setup
 * @param {Object} data - Email setup data
 * @returns {Promise}
 */
export const createEmailSetup = async (data) => {
    return api.post(ENDPOINTS.EMAIL_SETUPS.BASE, data);
};

/**
 * Get all email setups
 * @returns {Promise}
 */
export const getAllEmailSetups = async () => {
    return api.get(ENDPOINTS.EMAIL_SETUPS.BASE);
};

/**
 * Get email setup by ID
 * @param {string} id - Email setup ID
 * @returns {Promise}
 */
export const getEmailSetupById = async (id) => {
    return api.get(ENDPOINTS.EMAIL_SETUPS.BY_ID(id));
};

/**
 * Update email setup
 * @param {string} id - Email setup ID
 * @param {Object} data - Updated email setup data
 * @returns {Promise}
 */
export const updateEmailSetup = async (id, data) => {
    return api.put(ENDPOINTS.EMAIL_SETUPS.BY_ID(id), data);
};

/**
 * Delete email setup
 * @param {string} id - Email setup ID
 * @returns {Promise}
 */
export const deleteEmailSetup = async (id) => {
    return api.delete(ENDPOINTS.EMAIL_SETUPS.BY_ID(id));
};

/**
 * Search email setups with filters
 * @param {Object} params - Search parameters
 * @returns {Promise}
 */
export const searchEmailSetups = async (params) => {
    return api.post(ENDPOINTS.EMAIL_SETUPS.SEARCH, params);
};

// ============ EMAIL FOR OPERATIONS ============

/**
 * Create a new email for
 * @param {Object} data - Email for data
 * @returns {Promise}
 */
export const createEmailFor = async (data) => {
    return api.post(ENDPOINTS.EMAIL_FOR.BASE, data);
};

/**
 * Get all email for
 * @returns {Promise}
 */
export const getAllEmailFor = async () => {
    return api.get(ENDPOINTS.EMAIL_FOR.BASE);
};

/**
 * Get email for by ID
 * @param {string} id - Email for ID
 * @returns {Promise}
 */
export const getEmailForById = async (id) => {
    return api.get(ENDPOINTS.EMAIL_FOR.BY_ID(id));
};

/**
 * Update email for
 * @param {string} id - Email for ID
 * @param {Object} data - Updated email for data
 * @returns {Promise}
 */
export const updateEmailFor = async (id, data) => {
    return api.put(ENDPOINTS.EMAIL_FOR.BY_ID(id), data);
};

/**
 * Delete email for
 * @param {string} id - Email for ID
 * @returns {Promise}
 */
export const deleteEmailFor = async (id) => {
    return api.delete(ENDPOINTS.EMAIL_FOR.BY_ID(id));
};

/**
 * Search email for with filters
 * @param {Object} params - Search parameters
 * @returns {Promise}
 */
export const searchEmailFor = async (params) => {
    return api.post(ENDPOINTS.EMAIL_FOR.SEARCH, params);
};

/**
 * Get the email trigger registry (ADR-015) — each entry flagged with the
 * Email For that already claims it, if any. Feeds both the trigger picker on
 * the Email For form and the merge-field hint on the Email Template form.
 * @returns {Promise}
 */
export const getEmailTriggers = async () => {
    return api.get(ENDPOINTS.EMAIL_FOR.TRIGGERS);
};

// ============ EMAIL TEMPLATE OPERATIONS ============

/**
 * Create a new email template
 * @param {Object} data - Email template data
 * @returns {Promise}
 */
export const createEmailTemplate = async (data) => {
    return api.post(ENDPOINTS.EMAIL_TEMPLATES.BASE, data);
};

/**
 * Get all email templates
 * @returns {Promise}
 */
export const getAllEmailTemplates = async () => {
    return api.get(ENDPOINTS.EMAIL_TEMPLATES.BASE);
};

/**
 * Get email template by ID
 * @param {string} id - Email template ID
 * @returns {Promise}
 */
export const getEmailTemplateById = async (id) => {
    return api.get(ENDPOINTS.EMAIL_TEMPLATES.BY_ID(id));
};

/**
 * Update email template
 * @param {string} id - Email template ID
 * @param {Object} data - Updated email template data
 * @returns {Promise}
 */
export const updateEmailTemplate = async (id, data) => {
    return api.put(ENDPOINTS.EMAIL_TEMPLATES.BY_ID(id), data);
};

/**
 * Delete email template
 * @param {string} id - Email template ID
 * @returns {Promise}
 */
export const deleteEmailTemplate = async (id) => {
    return api.delete(ENDPOINTS.EMAIL_TEMPLATES.BY_ID(id));
};

/**
 * Search email templates with filters
 * @param {Object} params - Search parameters
 * @returns {Promise}
 */
export const searchEmailTemplates = async (params) => {
    return api.post(ENDPOINTS.EMAIL_TEMPLATES.SEARCH, params);
};

/**
 * Upload signature image for email template
 * @param {FormData} formData - Form data with signature image
 * @returns {Promise}
 */
export const uploadSignatureImage = async (formData) => {
    return api.post(ENDPOINTS.EMAIL_TEMPLATES.UPLOAD_SIGNATURE, formData, {
        headers: {
            "Content-Type": "multipart/form-data",
        },
    });
};

export default {
    // Email Setup
    createEmailSetup,
    getAllEmailSetups,
    getEmailSetupById,
    updateEmailSetup,
    deleteEmailSetup,
    searchEmailSetups,
    // Email For
    createEmailFor,
    getAllEmailFor,
    getEmailForById,
    updateEmailFor,
    deleteEmailFor,
    searchEmailFor,
    getEmailTriggers,
    // Email Templates
    createEmailTemplate,
    getAllEmailTemplates,
    getEmailTemplateById,
    updateEmailTemplate,
    deleteEmailTemplate,
    searchEmailTemplates,
    uploadSignatureImage,
};

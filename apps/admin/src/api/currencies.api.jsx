/**
 * Currencies API Service
 * Handles all currency-related API calls
 */
import api from "./index";
import { ENDPOINTS } from "./endpoints";

/**
 * Create a new currency
 * @param {Object} data - Currency data
 * @returns {Promise}
 */
export const createCurrency = async (data) => {
    return api.post(ENDPOINTS.CURRENCIES.BASE, data);
};

/**
 * Get all currencies
 * @returns {Promise}
 */
export const getAllCurrencies = async () => {
    return api.get(ENDPOINTS.CURRENCIES.BASE);
};

/**
 * Get currency by ID
 * @param {string} id - Currency ID
 * @returns {Promise}
 */
export const getCurrencyById = async (id) => {
    return api.get(ENDPOINTS.CURRENCIES.BY_ID(id));
};

/**
 * Update currency
 * @param {string} id - Currency ID
 * @param {Object} data - Updated currency data
 * @returns {Promise}
 */
export const updateCurrency = async (id, data) => {
    return api.put(ENDPOINTS.CURRENCIES.BY_ID(id), data);
};

/**
 * Delete currency
 * @param {string} id - Currency ID
 * @returns {Promise}
 */
export const deleteCurrency = async (id) => {
    return api.delete(ENDPOINTS.CURRENCIES.BY_ID(id));
};

/**
 * Search currencies with filters
 * @param {Object} params - Search parameters
 * @returns {Promise}
 */
export const searchCurrencies = async (params) => {
    return api.post(ENDPOINTS.CURRENCIES.SEARCH, params);
};

export default {
    createCurrency,
    getAllCurrencies,
    getCurrencyById,
    updateCurrency,
    deleteCurrency,
    searchCurrencies,
};

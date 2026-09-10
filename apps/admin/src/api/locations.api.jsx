/**
 * Locations API Service
 * Handles all location-related API calls (Countries, States, Cities)
 */
import api from "./index";
import { ENDPOINTS } from "./endpoints";

// ============ COUNTRY OPERATIONS ============

/**
 * Create a new country
 * @param {Object} data - Country data
 * @returns {Promise}
 */
export const createCountry = async (data) => {
    return api.post(ENDPOINTS.COUNTRIES.BASE, data);
};

/**
 * Get all countries
 * @returns {Promise}
 */
export const getAllCountries = async () => {
    return api.get(ENDPOINTS.COUNTRIES.BASE);
};

/**
 * Get country by ID
 * @param {string} id - Country ID
 * @returns {Promise}
 */
export const getCountryById = async (id) => {
    return api.get(ENDPOINTS.COUNTRIES.BY_ID(id));
};

/**
 * Update country
 * @param {string} id - Country ID
 * @param {Object} data - Updated country data
 * @returns {Promise}
 */
export const updateCountry = async (id, data) => {
    return api.put(ENDPOINTS.COUNTRIES.BY_ID(id), data);
};

/**
 * Delete country
 * @param {string} id - Country ID
 * @returns {Promise}
 */
export const deleteCountry = async (id) => {
    return api.delete(ENDPOINTS.COUNTRIES.BY_ID(id));
};

/**
 * Search countries with filters
 * @param {Object} params - Search parameters
 * @returns {Promise}
 */
export const searchCountries = async (params) => {
    return api.post(ENDPOINTS.COUNTRIES.SEARCH, params);
};

/**
 * Get states by country ID
 * @param {string} countryId - Country ID
 * @returns {Promise}
 */
export const getStatesByCountry = async (countryId) => {
    return api.get(ENDPOINTS.COUNTRIES.STATES(countryId));
};

// ============ STATE OPERATIONS ============

/**
 * Create a new state
 * @param {Object} data - State data
 * @returns {Promise}
 */
export const createState = async (data) => {
    return api.post(ENDPOINTS.STATES.BASE, data);
};

/**
 * Get all states
 * @returns {Promise}
 */
export const getAllStates = async () => {
    return api.get(ENDPOINTS.STATES.BASE);
};

/**
 * Get state by ID
 * @param {string} id - State ID
 * @returns {Promise}
 */
export const getStateById = async (id) => {
    return api.get(ENDPOINTS.STATES.BY_ID(id));
};

/**
 * Update state
 * @param {string} id - State ID
 * @param {Object} data - Updated state data
 * @returns {Promise}
 */
export const updateState = async (id, data) => {
    return api.put(ENDPOINTS.STATES.BY_ID(id), data);
};

/**
 * Delete state
 * @param {string} id - State ID
 * @returns {Promise}
 */
export const deleteState = async (id) => {
    return api.delete(ENDPOINTS.STATES.BY_ID(id));
};

/**
 * Search states with filters
 * @param {Object} params - Search parameters
 * @returns {Promise}
 */
export const searchStates = async (params) => {
    return api.post(ENDPOINTS.STATES.SEARCH, params);
};

/**
 * Get cities by state ID
 * @param {string} stateId - State ID
 * @returns {Promise}
 */
export const getCitiesByState = async (stateId) => {
    return api.get(ENDPOINTS.STATES.CITIES(stateId));
};

// ============ CITY OPERATIONS ============

/**
 * Create a new city
 * @param {Object} data - City data
 * @returns {Promise}
 */
export const createCity = async (data) => {
    return api.post(ENDPOINTS.CITIES.BASE, data);
};

/**
 * Get all cities
 * @returns {Promise}
 */
export const getAllCities = async () => {
    return api.get(ENDPOINTS.CITIES.BASE);
};

/**
 * Get city by ID
 * @param {string} id - City ID
 * @returns {Promise}
 */
export const getCityById = async (id) => {
    return api.get(ENDPOINTS.CITIES.BY_ID(id));
};

/**
 * Update city
 * @param {string} id - City ID
 * @param {Object} data - Updated city data
 * @returns {Promise}
 */
export const updateCity = async (id, data) => {
    return api.put(ENDPOINTS.CITIES.BY_ID(id), data);
};

/**
 * Delete city
 * @param {string} id - City ID
 * @returns {Promise}
 */
export const deleteCity = async (id) => {
    return api.delete(ENDPOINTS.CITIES.BY_ID(id));
};

/**
 * Search cities with filters
 * @param {Object} params - Search parameters
 * @returns {Promise}
 */
export const searchCities = async (params) => {
    return api.post(ENDPOINTS.CITIES.SEARCH, params);
};

// ============ COMBINED LOCATION OPERATIONS ============

/**
 * Get all locations (countries, states, cities combined)
 * @returns {Promise}
 */
export const getAllLocations = async () => {
    return api.get(ENDPOINTS.LOCATIONS.BASE);
};

export default {
    // Countries
    createCountry,
    getAllCountries,
    getCountryById,
    updateCountry,
    deleteCountry,
    searchCountries,
    getStatesByCountry,
    // States
    createState,
    getAllStates,
    getStateById,
    updateState,
    deleteState,
    searchStates,
    getCitiesByState,
    // Cities
    createCity,
    getAllCities,
    getCityById,
    updateCity,
    deleteCity,
    searchCities,
    // Combined
    getAllLocations,
};

/**
 * Menus API Service
 * Handles all menu-related API calls (Menu Groups and Menu Master)
 */
import api from "./index";
import { ENDPOINTS } from "./endpoints";
import { cachedQuery, invalidateQuery } from "../queryClient";

const menuTreeKey = ["menus", "tree"];
const invalidateMenus = () => invalidateQuery(menuTreeKey);

// ============ MENU GROUP OPERATIONS ============

/**
 * Create a new menu group
 * @param {Object} data - Menu group data
 * @returns {Promise}
 */
export const createMenuGroup = async (data) => {
    const response = await api.post(ENDPOINTS.MENU_GROUPS.BASE, data); invalidateMenus(); return response;
};

/**
 * Get all menu groups
 * @returns {Promise}
 */
export const getAllMenuGroups = async () => {
    return api.get(ENDPOINTS.MENU_GROUPS.BASE);
};

/**
 * Get menu group by ID
 * @param {string} id - Menu group ID
 * @returns {Promise}
 */
export const getMenuGroupById = async (id) => {
    return api.get(ENDPOINTS.MENU_GROUPS.BY_ID(id));
};

/**
 * Update menu group
 * @param {string} id - Menu group ID
 * @param {Object} data - Updated menu group data
 * @returns {Promise}
 */
export const updateMenuGroup = async (id, data) => {
    const response = await api.put(ENDPOINTS.MENU_GROUPS.BY_ID(id), data); invalidateMenus(); return response;
};

/**
 * Delete menu group
 * @param {string} id - Menu group ID
 * @returns {Promise}
 */
export const deleteMenuGroup = async (id) => {
    const response = await api.delete(ENDPOINTS.MENU_GROUPS.BY_ID(id)); invalidateMenus(); return response;
};

/**
 * Search menu groups with filters
 * @param {Object} params - Search parameters
 * @returns {Promise}
 */
export const searchMenuGroups = async (params) => {
    return api.post(ENDPOINTS.MENU_GROUPS.SEARCH, params);
};

// ============ MENU MASTER OPERATIONS ============

/**
 * Create a new menu
 * @param {Object} data - Menu data
 * @returns {Promise}
 */
export const createMenu = async (data) => {
    const response = await api.post(ENDPOINTS.MENUS.BASE, data); invalidateMenus(); return response;
};

/**
 * Get all menus
 * @returns {Promise}
 */
export const getAllMenus = async () => {
    return api.get(ENDPOINTS.MENUS.BASE);
};

/**
 * Get menu by ID
 * @param {string} id - Menu ID
 * @returns {Promise}
 */
export const getMenuById = async (id) => {
    return api.get(ENDPOINTS.MENUS.BY_ID(id));
};

/**
 * Update menu
 * @param {string} id - Menu ID
 * @param {Object} data - Updated menu data
 * @returns {Promise}
 */
export const updateMenu = async (id, data) => {
    const response = await api.put(ENDPOINTS.MENUS.BY_ID(id), data); invalidateMenus(); return response;
};

/**
 * Delete menu
 * @param {string} id - Menu ID
 * @returns {Promise}
 */
export const deleteMenu = async (id) => {
    const response = await api.delete(ENDPOINTS.MENUS.BY_ID(id)); invalidateMenus(); return response;
};

/**
 * Search menus with filters
 * @param {Object} params - Search parameters
 * @returns {Promise}
 */
export const searchMenus = async (params) => {
    return api.post(ENDPOINTS.MENUS.SEARCH, params);
};

/**
 * Get menus grouped by menu groups
 * @returns {Promise}
 */
export const getMenusByGroups = async () => {
    return cachedQuery(menuTreeKey, () => api.get(ENDPOINTS.MENUS.BY_GROUPS));
};

export const fetchMenusByGroups = async () => api.get(ENDPOINTS.MENUS.BY_GROUPS);

export default {
    // Menu Groups
    createMenuGroup,
    getAllMenuGroups,
    getMenuGroupById,
    updateMenuGroup,
    deleteMenuGroup,
    searchMenuGroups,
    // Menus
    createMenu,
    getAllMenus,
    getMenuById,
    updateMenu,
    deleteMenu,
    searchMenus,
    getMenusByGroups,
};

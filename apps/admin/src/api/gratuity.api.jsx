// ADR-031 (Payroll — Gratuity, module 15).
import api from "./index";
import { ENDPOINTS } from "./endpoints";

// ---- Gratuity Rule ---------------------------------------------------------
export const createGratuityRule = async (data) => api.post(ENDPOINTS.GRATUITY_RULES.BASE, data);
export const getAllGratuityRules = async () => api.get(ENDPOINTS.GRATUITY_RULES.BASE);
export const getGratuityRuleById = async (id) => api.get(ENDPOINTS.GRATUITY_RULES.BY_ID(id));
export const updateGratuityRule = async (id, data) => api.put(ENDPOINTS.GRATUITY_RULES.BY_ID(id), data);
export const searchGratuityRules = async (data) => api.post(ENDPOINTS.GRATUITY_RULES.SEARCH, data);
export const deleteGratuityRule = async (id) => api.delete(ENDPOINTS.GRATUITY_RULES.BY_ID(id));

// ---- Gratuity ---------------------------------------------------------------
export const createGratuity = async (data) => api.post(ENDPOINTS.GRATUITIES.BASE, data);
export const getAllGratuities = async () => api.get(ENDPOINTS.GRATUITIES.BASE);
export const getGratuityById = async (id) => api.get(ENDPOINTS.GRATUITIES.BY_ID(id));
export const updateGratuity = async (id, data) => api.put(ENDPOINTS.GRATUITIES.BY_ID(id), data);
export const searchGratuities = async (data) => api.post(ENDPOINTS.GRATUITIES.SEARCH, data);
export const submitGratuity = async (id) => api.post(ENDPOINTS.GRATUITIES.SUBMIT(id));
export const cancelGratuity = async (id) => api.post(ENDPOINTS.GRATUITIES.CANCEL(id));
export const deleteGratuity = async (id) => api.delete(ENDPOINTS.GRATUITIES.BY_ID(id));

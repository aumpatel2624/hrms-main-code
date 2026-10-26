/**
 * Global search API — the header search box (ADR-044).
 */
import api from "./index";
import { ENDPOINTS } from "./endpoints";

export const globalSearch = async (match, config) => api.post(ENDPOINTS.GLOBAL_SEARCH, { match }, config);

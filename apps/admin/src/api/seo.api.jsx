import api from "./index";
import { ENDPOINTS } from "./endpoints";

// SEO pages
export const searchSeoPages = async (params) => api.post(ENDPOINTS.SEO.PAGE_SEARCH, params);
export const listSeoPages = async () => api.get(ENDPOINTS.SEO.PAGES);
export const getSeoPageById = async (id) => api.get(ENDPOINTS.SEO.PAGE_BY_ID(id));
export const createSeoPage = async (data) => api.post(ENDPOINTS.SEO.PAGES, data);
export const updateSeoPage = async (id, data) => api.put(ENDPOINTS.SEO.PAGE_BY_ID(id), data);
export const deleteSeoPage = async (id) => api.delete(ENDPOINTS.SEO.PAGE_BY_ID(id));

export const uploadSeoImage = async (file) => {
    const form = new FormData();
    form.append("image", file);
    return api.post(ENDPOINTS.SEO.PAGE_UPLOAD_IMAGE, form, {
        headers: { "Content-Type": "multipart/form-data" },
    });
};

// Site-wide defaults. The plain GET never returns the site key — that has its
// own permission-gated endpoint so the page editor can read the defaults
// without also being handed a secret.
export const getSeoSettings = async () => api.get(ENDPOINTS.SEO.SETTINGS);
export const updateSeoSettings = async (data) => api.put(ENDPOINTS.SEO.SETTINGS, data);
export const getSiteKey = async () => api.get(ENDPOINTS.SEO.SITE_KEY);
export const rotateSiteKey = async () => api.post(ENDPOINTS.SEO.SITE_KEY);

// Redirects
export const searchSeoRedirects = async (params) => api.post(ENDPOINTS.SEO.REDIRECT_SEARCH, params);
export const listSeoRedirects = async () => api.get(ENDPOINTS.SEO.REDIRECTS);
export const getSeoRedirectById = async (id) => api.get(ENDPOINTS.SEO.REDIRECT_BY_ID(id));
export const createSeoRedirect = async (data) => api.post(ENDPOINTS.SEO.REDIRECTS, data);
export const updateSeoRedirect = async (id, data) => api.put(ENDPOINTS.SEO.REDIRECT_BY_ID(id), data);
export const deleteSeoRedirect = async (id) => api.delete(ENDPOINTS.SEO.REDIRECT_BY_ID(id));
export const importSeoRedirects = async (rows) => api.post(ENDPOINTS.SEO.REDIRECT_IMPORT, { rows });

// 404 log
export const searchSeoNotFound = async (params) => api.post(ENDPOINTS.SEO.NOT_FOUND_SEARCH, params);
export const deleteSeoNotFound = async (id) => api.delete(ENDPOINTS.SEO.NOT_FOUND_BY_ID(id));
export const redirectSeoNotFound = async (id, data) => api.post(ENDPOINTS.SEO.NOT_FOUND_REDIRECT(id), data);

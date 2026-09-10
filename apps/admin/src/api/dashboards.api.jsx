import api from "./index";
import { ENDPOINTS } from "./endpoints";

// Widget library (Dashboard Builder screen)
export const getWidgetSources = async () => api.get(ENDPOINTS.DASHBOARDS.WIDGET_SOURCES);
export const listWidgets = async () => api.get(ENDPOINTS.DASHBOARDS.WIDGETS);
export const searchWidgets = async (params) => api.post(ENDPOINTS.DASHBOARDS.WIDGET_SEARCH, params);
export const getWidgetById = async (id) => api.get(ENDPOINTS.DASHBOARDS.WIDGET_BY_ID(id));
export const createWidget = async (data) => api.post(ENDPOINTS.DASHBOARDS.WIDGETS, data);
export const updateWidget = async (id, data) => api.put(ENDPOINTS.DASHBOARDS.WIDGET_BY_ID(id), data);
export const deleteWidget = async (id) => api.delete(ENDPOINTS.DASHBOARDS.WIDGET_BY_ID(id));
export const previewWidget = async (data) => api.post(ENDPOINTS.DASHBOARDS.WIDGET_PREVIEW, data);

// Running (dashboard renderer)
export const runWidget = async (id) => api.post(ENDPOINTS.DASHBOARDS.WIDGET_RUN(id));
export const getMyDashboard = async () => api.get(ENDPOINTS.DASHBOARDS.MY_DASHBOARD);

// Per-role assembly ("default" = the admin/default dashboard)
export const getRoleDashboard = async (roleId) => api.get(ENDPOINTS.DASHBOARDS.ROLE_DASHBOARD_BY_ID(roleId ?? "default"));
export const saveRoleDashboard = async (data) => api.post(ENDPOINTS.DASHBOARDS.ROLE_DASHBOARDS, data);

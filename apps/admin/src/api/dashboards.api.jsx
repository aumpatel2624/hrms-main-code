import api from "./index";
import { ENDPOINTS } from "./endpoints";
import { invalidateQuery } from "../queryClient";

const invalidateDashboards = () => invalidateQuery(["dashboards"]);

// Widget library (Dashboard Builder screen)
export const getWidgetSources = async () => api.get(ENDPOINTS.DASHBOARDS.WIDGET_SOURCES);
export const listWidgets = async () => api.get(ENDPOINTS.DASHBOARDS.WIDGETS);
export const searchWidgets = async (params) => api.post(ENDPOINTS.DASHBOARDS.WIDGET_SEARCH, params);
export const getWidgetById = async (id) => api.get(ENDPOINTS.DASHBOARDS.WIDGET_BY_ID(id));
export const createWidget = async (data) => { const response = await api.post(ENDPOINTS.DASHBOARDS.WIDGETS, data); invalidateDashboards(); return response; };
export const updateWidget = async (id, data) => { const response = await api.put(ENDPOINTS.DASHBOARDS.WIDGET_BY_ID(id), data); invalidateDashboards(); return response; };
export const deleteWidget = async (id) => { const response = await api.delete(ENDPOINTS.DASHBOARDS.WIDGET_BY_ID(id)); invalidateDashboards(); return response; };
export const previewWidget = async (data) => api.post(ENDPOINTS.DASHBOARDS.WIDGET_PREVIEW, data);

// Running (dashboard renderer)
export const runWidget = async (id) => api.post(ENDPOINTS.DASHBOARDS.WIDGET_RUN(id));
export const getMyDashboard = async () => api.get(ENDPOINTS.DASHBOARDS.MY_DASHBOARD);

// Per-role assembly ("default" = the admin/default dashboard)
export const getRoleDashboard = async (roleId) => api.get(ENDPOINTS.DASHBOARDS.ROLE_DASHBOARD_BY_ID(roleId ?? "default"));
export const saveRoleDashboard = async (data) => { const response = await api.post(ENDPOINTS.DASHBOARDS.ROLE_DASHBOARDS, data); invalidateDashboards(); return response; };

import api from "./index";
import { ENDPOINTS } from "./endpoints";

// Read-only by design. The audit trail is written by the server's Mongoose
// plugin; there is no create, update or delete endpoint to wrap.
export const searchAuditLogs = async (params) => api.post(ENDPOINTS.AUDIT_LOGS.SEARCH, params);
export const getAuditLogById = async (id) => api.get(ENDPOINTS.AUDIT_LOGS.BY_ID(id));
export const getAuditedModels = async () => api.get(ENDPOINTS.AUDIT_LOGS.MODELS);
export const getRecordHistory = async (model, documentId) =>
    api.get(ENDPOINTS.AUDIT_LOGS.RECORD_HISTORY(model, documentId));

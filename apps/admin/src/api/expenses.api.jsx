import api from "./index";
import { ENDPOINTS } from "./endpoints";
const crud = (endpoint) => ({
  create: (data) => api.post(endpoint.BASE, data), get: (id) => api.get(endpoint.BY_ID(id)),
  update: (id, data) => api.put(endpoint.BY_ID(id), data), remove: (id) => api.delete(endpoint.BY_ID(id)), search: (data) => api.post(endpoint.SEARCH, data),
});
const types = crud(ENDPOINTS.EXPENSE_CLAIM_TYPES); const claims = crud(ENDPOINTS.EXPENSE_CLAIMS);
export const createExpenseClaimType = types.create; export const getExpenseClaimTypeById = types.get; export const updateExpenseClaimType = types.update; export const deleteExpenseClaimType = types.remove; export const searchExpenseClaimTypes = types.search;
export const getAllExpenseClaimTypes = async () => (await api.get(ENDPOINTS.EXPENSE_CLAIM_TYPES.BASE)).data.data;
export const createExpenseClaim = claims.create; export const getExpenseClaimById = claims.get; export const updateExpenseClaim = claims.update; export const deleteExpenseClaim = claims.remove; export const searchExpenseClaims = claims.search;
export const approveExpenseClaim = (id) => api.post(ENDPOINTS.EXPENSE_CLAIMS.APPROVE(id)); export const rejectExpenseClaim = (id) => api.post(ENDPOINTS.EXPENSE_CLAIMS.REJECT(id)); export const submitExpenseClaim = (id) => api.post(ENDPOINTS.EXPENSE_CLAIMS.SUBMIT(id)); export const cancelExpenseClaim = (id) => api.post(ENDPOINTS.EXPENSE_CLAIMS.CANCEL(id)); export const markExpenseClaimAsPaid = (id) => api.post(ENDPOINTS.EXPENSE_CLAIMS.MARK_PAID(id));

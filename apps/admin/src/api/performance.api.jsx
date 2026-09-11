// ADR-032 (Performance, module 16, foundation half).
import api from "./index";
import { ENDPOINTS } from "./endpoints";

// ---- KRA --------------------------------------------------------------------
export const createKRA = async (data) => api.post(ENDPOINTS.KRAS.BASE, data);
export const getAllKRAs = async () => api.get(ENDPOINTS.KRAS.BASE);
export const getKRAById = async (id) => api.get(ENDPOINTS.KRAS.BY_ID(id));
export const updateKRA = async (id, data) => api.put(ENDPOINTS.KRAS.BY_ID(id), data);
export const searchKRAs = async (data) => api.post(ENDPOINTS.KRAS.SEARCH, data);
export const deleteKRA = async (id) => api.delete(ENDPOINTS.KRAS.BY_ID(id));

// ---- Employee Feedback Criteria ----------------------------------------------
export const createEmployeeFeedbackCriteria = async (data) => api.post(ENDPOINTS.EMPLOYEE_FEEDBACK_CRITERIA.BASE, data);
export const getAllEmployeeFeedbackCriteria = async () => api.get(ENDPOINTS.EMPLOYEE_FEEDBACK_CRITERIA.BASE);
export const getEmployeeFeedbackCriteriaById = async (id) => api.get(ENDPOINTS.EMPLOYEE_FEEDBACK_CRITERIA.BY_ID(id));
export const updateEmployeeFeedbackCriteria = async (id, data) => api.put(ENDPOINTS.EMPLOYEE_FEEDBACK_CRITERIA.BY_ID(id), data);
export const searchEmployeeFeedbackCriteria = async (data) => api.post(ENDPOINTS.EMPLOYEE_FEEDBACK_CRITERIA.SEARCH, data);
export const deleteEmployeeFeedbackCriteria = async (id) => api.delete(ENDPOINTS.EMPLOYEE_FEEDBACK_CRITERIA.BY_ID(id));

// ---- Appraisal Template -------------------------------------------------------
export const createAppraisalTemplate = async (data) => api.post(ENDPOINTS.APPRAISAL_TEMPLATES.BASE, data);
export const getAllAppraisalTemplates = async () => api.get(ENDPOINTS.APPRAISAL_TEMPLATES.BASE);
export const getAppraisalTemplateById = async (id) => api.get(ENDPOINTS.APPRAISAL_TEMPLATES.BY_ID(id));
export const updateAppraisalTemplate = async (id, data) => api.put(ENDPOINTS.APPRAISAL_TEMPLATES.BY_ID(id), data);
export const searchAppraisalTemplates = async (data) => api.post(ENDPOINTS.APPRAISAL_TEMPLATES.SEARCH, data);
export const deleteAppraisalTemplate = async (id) => api.delete(ENDPOINTS.APPRAISAL_TEMPLATES.BY_ID(id));

// ---- Appraisal Cycle ----------------------------------------------------------
export const createAppraisalCycle = async (data) => api.post(ENDPOINTS.APPRAISAL_CYCLES.BASE, data);
export const getAllAppraisalCycles = async () => api.get(ENDPOINTS.APPRAISAL_CYCLES.BASE);
export const getAppraisalCycleById = async (id) => api.get(ENDPOINTS.APPRAISAL_CYCLES.BY_ID(id));
export const updateAppraisalCycle = async (id, data) => api.put(ENDPOINTS.APPRAISAL_CYCLES.BY_ID(id), data);
export const searchAppraisalCycles = async (data) => api.post(ENDPOINTS.APPRAISAL_CYCLES.SEARCH, data);
export const deleteAppraisalCycle = async (id) => api.delete(ENDPOINTS.APPRAISAL_CYCLES.BY_ID(id));
export const getEligibleEmployeesForCycle = async (id) => api.post(ENDPOINTS.APPRAISAL_CYCLES.ELIGIBLE_EMPLOYEES(id));
export const createAppraisalsForCycle = async (id, data) => api.post(ENDPOINTS.APPRAISAL_CYCLES.CREATE_APPRAISALS(id), data);
export const completeAppraisalCycle = async (id) => api.post(ENDPOINTS.APPRAISAL_CYCLES.COMPLETE(id));

// ---- Appraisal ------------------------------------------------------------------
export const createAppraisal = async (data) => api.post(ENDPOINTS.APPRAISALS.BASE, data);
export const getAllAppraisals = async () => api.get(ENDPOINTS.APPRAISALS.BASE);
export const getAppraisalById = async (id) => api.get(ENDPOINTS.APPRAISALS.BY_ID(id));
export const updateAppraisal = async (id, data) => api.put(ENDPOINTS.APPRAISALS.BY_ID(id), data);
export const searchAppraisals = async (data) => api.post(ENDPOINTS.APPRAISALS.SEARCH, data);
export const submitAppraisal = async (id) => api.post(ENDPOINTS.APPRAISALS.SUBMIT(id));
export const cancelAppraisal = async (id) => api.post(ENDPOINTS.APPRAISALS.CANCEL(id));
export const deleteAppraisal = async (id) => api.delete(ENDPOINTS.APPRAISALS.BY_ID(id));

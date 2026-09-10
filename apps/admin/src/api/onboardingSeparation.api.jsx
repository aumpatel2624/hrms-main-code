/**
 * Onboarding & Separation API (ADR-020): Employee Onboarding(+Template),
 * Employee Separation(+Template), Exit Interview, Full and Final Statement.
 */
import api from "./index";
import { ENDPOINTS } from "./endpoints";

export const createEmployeeOnboarding = async (data) => api.post(ENDPOINTS.EMPLOYEE_ONBOARDINGS.BASE, data);
export const getAllEmployeeOnboardings = async (params) => api.get(ENDPOINTS.EMPLOYEE_ONBOARDINGS.BASE, { params: params ?? {} });
export const getEmployeeOnboardingById = async (id) => api.get(ENDPOINTS.EMPLOYEE_ONBOARDINGS.BY_ID(id));
export const updateEmployeeOnboarding = async (id, data) => api.put(ENDPOINTS.EMPLOYEE_ONBOARDINGS.BY_ID(id), data);
export const deleteEmployeeOnboarding = async (id) => api.delete(ENDPOINTS.EMPLOYEE_ONBOARDINGS.BY_ID(id));
export const searchEmployeeOnboardings = async (params) => api.post(ENDPOINTS.EMPLOYEE_ONBOARDINGS.SEARCH, params);
export const markOnboardingAsCompleted = async (id) => api.post(ENDPOINTS.EMPLOYEE_ONBOARDINGS.MARK_AS_COMPLETED(id));
export const makeEmployeeFromOnboarding = async (id) => api.post(ENDPOINTS.EMPLOYEE_ONBOARDINGS.MAKE_EMPLOYEE(id));

export const createEmployeeOnboardingTemplate = async (data) => api.post(ENDPOINTS.EMPLOYEE_ONBOARDING_TEMPLATES.BASE, data);
export const getAllEmployeeOnboardingTemplates = async (params) => api.get(ENDPOINTS.EMPLOYEE_ONBOARDING_TEMPLATES.BASE, { params: params ?? {} });
export const getEmployeeOnboardingTemplateById = async (id) => api.get(ENDPOINTS.EMPLOYEE_ONBOARDING_TEMPLATES.BY_ID(id));
export const updateEmployeeOnboardingTemplate = async (id, data) => api.put(ENDPOINTS.EMPLOYEE_ONBOARDING_TEMPLATES.BY_ID(id), data);
export const deleteEmployeeOnboardingTemplate = async (id) => api.delete(ENDPOINTS.EMPLOYEE_ONBOARDING_TEMPLATES.BY_ID(id));
export const searchEmployeeOnboardingTemplates = async (params) => api.post(ENDPOINTS.EMPLOYEE_ONBOARDING_TEMPLATES.SEARCH, params);

export const createEmployeeSeparation = async (data) => api.post(ENDPOINTS.EMPLOYEE_SEPARATIONS.BASE, data);
export const getAllEmployeeSeparations = async (params) => api.get(ENDPOINTS.EMPLOYEE_SEPARATIONS.BASE, { params: params ?? {} });
export const getEmployeeSeparationById = async (id) => api.get(ENDPOINTS.EMPLOYEE_SEPARATIONS.BY_ID(id));
export const updateEmployeeSeparation = async (id, data) => api.put(ENDPOINTS.EMPLOYEE_SEPARATIONS.BY_ID(id), data);
export const deleteEmployeeSeparation = async (id) => api.delete(ENDPOINTS.EMPLOYEE_SEPARATIONS.BY_ID(id));
export const searchEmployeeSeparations = async (params) => api.post(ENDPOINTS.EMPLOYEE_SEPARATIONS.SEARCH, params);

export const createEmployeeSeparationTemplate = async (data) => api.post(ENDPOINTS.EMPLOYEE_SEPARATION_TEMPLATES.BASE, data);
export const getAllEmployeeSeparationTemplates = async (params) => api.get(ENDPOINTS.EMPLOYEE_SEPARATION_TEMPLATES.BASE, { params: params ?? {} });
export const getEmployeeSeparationTemplateById = async (id) => api.get(ENDPOINTS.EMPLOYEE_SEPARATION_TEMPLATES.BY_ID(id));
export const updateEmployeeSeparationTemplate = async (id, data) => api.put(ENDPOINTS.EMPLOYEE_SEPARATION_TEMPLATES.BY_ID(id), data);
export const deleteEmployeeSeparationTemplate = async (id) => api.delete(ENDPOINTS.EMPLOYEE_SEPARATION_TEMPLATES.BY_ID(id));
export const searchEmployeeSeparationTemplates = async (params) => api.post(ENDPOINTS.EMPLOYEE_SEPARATION_TEMPLATES.SEARCH, params);

export const createExitInterview = async (data) => api.post(ENDPOINTS.EXIT_INTERVIEWS.BASE, data);
export const getAllExitInterviews = async (params) => api.get(ENDPOINTS.EXIT_INTERVIEWS.BASE, { params: params ?? {} });
export const getExitInterviewById = async (id) => api.get(ENDPOINTS.EXIT_INTERVIEWS.BY_ID(id));
export const updateExitInterview = async (id, data) => api.put(ENDPOINTS.EXIT_INTERVIEWS.BY_ID(id), data);
export const deleteExitInterview = async (id) => api.delete(ENDPOINTS.EXIT_INTERVIEWS.BY_ID(id));
export const searchExitInterviews = async (params) => api.post(ENDPOINTS.EXIT_INTERVIEWS.SEARCH, params);

export const createFullAndFinalStatement = async (data) => api.post(ENDPOINTS.FULL_AND_FINAL_STATEMENTS.BASE, data);
export const getAllFullAndFinalStatements = async (params) => api.get(ENDPOINTS.FULL_AND_FINAL_STATEMENTS.BASE, { params: params ?? {} });
export const getFullAndFinalStatementById = async (id) => api.get(ENDPOINTS.FULL_AND_FINAL_STATEMENTS.BY_ID(id));
export const updateFullAndFinalStatement = async (id, data) => api.put(ENDPOINTS.FULL_AND_FINAL_STATEMENTS.BY_ID(id), data);
export const deleteFullAndFinalStatement = async (id) => api.delete(ENDPOINTS.FULL_AND_FINAL_STATEMENTS.BY_ID(id));
export const searchFullAndFinalStatements = async (params) => api.post(ENDPOINTS.FULL_AND_FINAL_STATEMENTS.SEARCH, params);
export const markStatementAsPaid = async (id) => api.post(ENDPOINTS.FULL_AND_FINAL_STATEMENTS.MARK_AS_PAID(id));

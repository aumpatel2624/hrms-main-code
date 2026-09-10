/**
 * Employee Career Events API (ADR-021): Grievance Type, Employee Grievance,
 * Employee Transfer, Employee Promotion, Employee Referral, Staffing Plan.
 */
import api from "./index";
import { ENDPOINTS } from "./endpoints";

export const createGrievanceType = async (data) => api.post(ENDPOINTS.GRIEVANCE_TYPES.BASE, data);
export const getAllGrievanceTypes = async (params) => api.get(ENDPOINTS.GRIEVANCE_TYPES.BASE, { params: params ?? {} });
export const getGrievanceTypeById = async (id) => api.get(ENDPOINTS.GRIEVANCE_TYPES.BY_ID(id));
export const updateGrievanceType = async (id, data) => api.put(ENDPOINTS.GRIEVANCE_TYPES.BY_ID(id), data);
export const deleteGrievanceType = async (id) => api.delete(ENDPOINTS.GRIEVANCE_TYPES.BY_ID(id));
export const searchGrievanceTypes = async (params) => api.post(ENDPOINTS.GRIEVANCE_TYPES.SEARCH, params);

export const createEmployeeGrievance = async (data) => api.post(ENDPOINTS.EMPLOYEE_GRIEVANCES.BASE, data);
export const getAllEmployeeGrievances = async (params) => api.get(ENDPOINTS.EMPLOYEE_GRIEVANCES.BASE, { params: params ?? {} });
export const getEmployeeGrievanceById = async (id) => api.get(ENDPOINTS.EMPLOYEE_GRIEVANCES.BY_ID(id));
export const updateEmployeeGrievance = async (id, data) => api.put(ENDPOINTS.EMPLOYEE_GRIEVANCES.BY_ID(id), data);
export const deleteEmployeeGrievance = async (id) => api.delete(ENDPOINTS.EMPLOYEE_GRIEVANCES.BY_ID(id));
export const searchEmployeeGrievances = async (params) => api.post(ENDPOINTS.EMPLOYEE_GRIEVANCES.SEARCH, params);

export const createEmployeeTransfer = async (data) => api.post(ENDPOINTS.EMPLOYEE_TRANSFERS.BASE, data);
export const getAllEmployeeTransfers = async (params) => api.get(ENDPOINTS.EMPLOYEE_TRANSFERS.BASE, { params: params ?? {} });
export const getEmployeeTransferById = async (id) => api.get(ENDPOINTS.EMPLOYEE_TRANSFERS.BY_ID(id));
export const deleteEmployeeTransfer = async (id) => api.delete(ENDPOINTS.EMPLOYEE_TRANSFERS.BY_ID(id));
export const searchEmployeeTransfers = async (params) => api.post(ENDPOINTS.EMPLOYEE_TRANSFERS.SEARCH, params);

export const createEmployeePromotion = async (data) => api.post(ENDPOINTS.EMPLOYEE_PROMOTIONS.BASE, data);
export const getAllEmployeePromotions = async (params) => api.get(ENDPOINTS.EMPLOYEE_PROMOTIONS.BASE, { params: params ?? {} });
export const getEmployeePromotionById = async (id) => api.get(ENDPOINTS.EMPLOYEE_PROMOTIONS.BY_ID(id));
export const deleteEmployeePromotion = async (id) => api.delete(ENDPOINTS.EMPLOYEE_PROMOTIONS.BY_ID(id));
export const searchEmployeePromotions = async (params) => api.post(ENDPOINTS.EMPLOYEE_PROMOTIONS.SEARCH, params);

export const searchEmployeePropertyChanges = async (params) => api.post(ENDPOINTS.EMPLOYEE_PROPERTY_CHANGES.SEARCH, params);

export const createEmployeeReferral = async (data) => api.post(ENDPOINTS.EMPLOYEE_REFERRALS.BASE, data);
export const getAllEmployeeReferrals = async (params) => api.get(ENDPOINTS.EMPLOYEE_REFERRALS.BASE, { params: params ?? {} });
export const getEmployeeReferralById = async (id) => api.get(ENDPOINTS.EMPLOYEE_REFERRALS.BY_ID(id));
export const updateEmployeeReferral = async (id, data) => api.put(ENDPOINTS.EMPLOYEE_REFERRALS.BY_ID(id), data);
export const deleteEmployeeReferral = async (id) => api.delete(ENDPOINTS.EMPLOYEE_REFERRALS.BY_ID(id));
export const searchEmployeeReferrals = async (params) => api.post(ENDPOINTS.EMPLOYEE_REFERRALS.SEARCH, params);
export const createJobApplicantFromReferral = async (id) => api.post(ENDPOINTS.EMPLOYEE_REFERRALS.CREATE_JOB_APPLICANT(id));

export const createStaffingPlan = async (data) => api.post(ENDPOINTS.STAFFING_PLANS.BASE, data);
export const getAllStaffingPlans = async (params) => api.get(ENDPOINTS.STAFFING_PLANS.BASE, { params: params ?? {} });
export const getStaffingPlanById = async (id) => api.get(ENDPOINTS.STAFFING_PLANS.BY_ID(id));
export const updateStaffingPlan = async (id, data) => api.put(ENDPOINTS.STAFFING_PLANS.BY_ID(id), data);
export const deleteStaffingPlan = async (id) => api.delete(ENDPOINTS.STAFFING_PLANS.BY_ID(id));
export const searchStaffingPlans = async (params) => api.post(ENDPOINTS.STAFFING_PLANS.SEARCH, params);

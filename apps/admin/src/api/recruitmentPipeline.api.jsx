/**
 * Recruitment pipeline API (ADR-019): Job Requisition, Job Opening, Job
 * Applicant, Job Applicant Source. Grouped the way organizationSetup.api.jsx
 * groups its masters, mirroring the server's route grouping.
 */
import api from "./index";
import { ENDPOINTS } from "./endpoints";

export const createJobRequisition = async (data) => api.post(ENDPOINTS.JOB_REQUISITIONS.BASE, data);
export const getAllJobRequisitions = async (params) => api.get(ENDPOINTS.JOB_REQUISITIONS.BASE, { params: params ?? {} });
export const getJobRequisitionById = async (id) => api.get(ENDPOINTS.JOB_REQUISITIONS.BY_ID(id));
export const updateJobRequisition = async (id, data) => api.put(ENDPOINTS.JOB_REQUISITIONS.BY_ID(id), data);
export const deleteJobRequisition = async (id) => api.delete(ENDPOINTS.JOB_REQUISITIONS.BY_ID(id));
export const searchJobRequisitions = async (params) => api.post(ENDPOINTS.JOB_REQUISITIONS.SEARCH, params);
export const makeJobOpeningFromRequisition = async (id) => api.post(ENDPOINTS.JOB_REQUISITIONS.MAKE_JOB_OPENING(id));

export const createJobOpening = async (data) => api.post(ENDPOINTS.JOB_OPENINGS.BASE, data);
export const getAllJobOpenings = async (params) => api.get(ENDPOINTS.JOB_OPENINGS.BASE, { params: params ?? {} });
export const getJobOpeningById = async (id) => api.get(ENDPOINTS.JOB_OPENINGS.BY_ID(id));
export const updateJobOpening = async (id, data) => api.put(ENDPOINTS.JOB_OPENINGS.BY_ID(id), data);
export const deleteJobOpening = async (id) => api.delete(ENDPOINTS.JOB_OPENINGS.BY_ID(id));
export const searchJobOpenings = async (params) => api.post(ENDPOINTS.JOB_OPENINGS.SEARCH, params);

export const createJobApplicant = async (data) => api.post(ENDPOINTS.JOB_APPLICANTS.BASE, data);
export const getAllJobApplicants = async (params) => api.get(ENDPOINTS.JOB_APPLICANTS.BASE, { params: params ?? {} });
export const getJobApplicantById = async (id) => api.get(ENDPOINTS.JOB_APPLICANTS.BY_ID(id));
export const updateJobApplicant = async (id, data) => api.put(ENDPOINTS.JOB_APPLICANTS.BY_ID(id), data);
export const deleteJobApplicant = async (id) => api.delete(ENDPOINTS.JOB_APPLICANTS.BY_ID(id));
export const searchJobApplicants = async (params) => api.post(ENDPOINTS.JOB_APPLICANTS.SEARCH, params);

export const createJobApplicantSource = async (data) => api.post(ENDPOINTS.JOB_APPLICANT_SOURCES.BASE, data);
export const getAllJobApplicantSources = async (params) => api.get(ENDPOINTS.JOB_APPLICANT_SOURCES.BASE, { params: params ?? {} });
export const getJobApplicantSourceById = async (id) => api.get(ENDPOINTS.JOB_APPLICANT_SOURCES.BY_ID(id));
export const updateJobApplicantSource = async (id, data) => api.put(ENDPOINTS.JOB_APPLICANT_SOURCES.BY_ID(id), data);
export const deleteJobApplicantSource = async (id) => api.delete(ENDPOINTS.JOB_APPLICANT_SOURCES.BY_ID(id));
export const searchJobApplicantSources = async (params) => api.post(ENDPOINTS.JOB_APPLICANT_SOURCES.SEARCH, params);

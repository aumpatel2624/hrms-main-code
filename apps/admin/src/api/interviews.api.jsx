/**
 * Interview pipeline API (ADR-019): Interview Type, Interview, Interview
 * Feedback.
 */
import api from "./index";
import { ENDPOINTS } from "./endpoints";

export const createInterviewType = async (data) => api.post(ENDPOINTS.INTERVIEW_TYPES.BASE, data);
export const getAllInterviewTypes = async (params) => api.get(ENDPOINTS.INTERVIEW_TYPES.BASE, { params: params ?? {} });
export const getInterviewTypeById = async (id) => api.get(ENDPOINTS.INTERVIEW_TYPES.BY_ID(id));
export const updateInterviewType = async (id, data) => api.put(ENDPOINTS.INTERVIEW_TYPES.BY_ID(id), data);
export const deleteInterviewType = async (id) => api.delete(ENDPOINTS.INTERVIEW_TYPES.BY_ID(id));
export const searchInterviewTypes = async (params) => api.post(ENDPOINTS.INTERVIEW_TYPES.SEARCH, params);

export const createInterview = async (data) => api.post(ENDPOINTS.INTERVIEWS.BASE, data);
export const getAllInterviews = async (params) => api.get(ENDPOINTS.INTERVIEWS.BASE, { params: params ?? {} });
export const getInterviewById = async (id) => api.get(ENDPOINTS.INTERVIEWS.BY_ID(id));
export const updateInterview = async (id, data) => api.put(ENDPOINTS.INTERVIEWS.BY_ID(id), data);
export const deleteInterview = async (id) => api.delete(ENDPOINTS.INTERVIEWS.BY_ID(id));
export const searchInterviews = async (params) => api.post(ENDPOINTS.INTERVIEWS.SEARCH, params);
export const rescheduleInterview = async (id, data) => api.post(ENDPOINTS.INTERVIEWS.RESCHEDULE(id), data);

export const createInterviewFeedback = async (data) => api.post(ENDPOINTS.INTERVIEW_FEEDBACKS.BASE, data);
export const getAllInterviewFeedbacks = async (params) => api.get(ENDPOINTS.INTERVIEW_FEEDBACKS.BASE, { params: params ?? {} });
export const getInterviewFeedbackById = async (id) => api.get(ENDPOINTS.INTERVIEW_FEEDBACKS.BY_ID(id));
export const updateInterviewFeedback = async (id, data) => api.put(ENDPOINTS.INTERVIEW_FEEDBACKS.BY_ID(id), data);
export const deleteInterviewFeedback = async (id) => api.delete(ENDPOINTS.INTERVIEW_FEEDBACKS.BY_ID(id));
export const searchInterviewFeedbacks = async (params) => api.post(ENDPOINTS.INTERVIEW_FEEDBACKS.SEARCH, params);

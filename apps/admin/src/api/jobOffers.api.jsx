/**
 * Job Offer API (ADR-019): Job Offer, Job Offer Term Template.
 */
import api from "./index";
import { ENDPOINTS } from "./endpoints";

export const createJobOffer = async (data) => api.post(ENDPOINTS.JOB_OFFERS.BASE, data);
export const getAllJobOffers = async (params) => api.get(ENDPOINTS.JOB_OFFERS.BASE, { params: params ?? {} });
export const getJobOfferById = async (id) => api.get(ENDPOINTS.JOB_OFFERS.BY_ID(id));
export const updateJobOffer = async (id, data) => api.put(ENDPOINTS.JOB_OFFERS.BY_ID(id), data);
export const deleteJobOffer = async (id) => api.delete(ENDPOINTS.JOB_OFFERS.BY_ID(id));
export const searchJobOffers = async (params) => api.post(ENDPOINTS.JOB_OFFERS.SEARCH, params);
export const makeEmployeeFromJobOffer = async (id) => api.post(ENDPOINTS.JOB_OFFERS.MAKE_EMPLOYEE(id));

export const createJobOfferTermTemplate = async (data) => api.post(ENDPOINTS.JOB_OFFER_TERM_TEMPLATES.BASE, data);
export const getAllJobOfferTermTemplates = async (params) => api.get(ENDPOINTS.JOB_OFFER_TERM_TEMPLATES.BASE, { params: params ?? {} });
export const getJobOfferTermTemplateById = async (id) => api.get(ENDPOINTS.JOB_OFFER_TERM_TEMPLATES.BY_ID(id));
export const updateJobOfferTermTemplate = async (id, data) => api.put(ENDPOINTS.JOB_OFFER_TERM_TEMPLATES.BY_ID(id), data);
export const deleteJobOfferTermTemplate = async (id) => api.delete(ENDPOINTS.JOB_OFFER_TERM_TEMPLATES.BY_ID(id));
export const searchJobOfferTermTemplates = async (params) => api.post(ENDPOINTS.JOB_OFFER_TERM_TEMPLATES.SEARCH, params);

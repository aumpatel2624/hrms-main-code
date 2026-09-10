/**
 * Travel API (ADR-023): Travel Request, Purpose of Travel, Identification
 * Document Type.
 */
import api from "./index";
import { ENDPOINTS } from "./endpoints";

export const createPurposeOfTravel = async (data) => api.post(ENDPOINTS.PURPOSE_OF_TRAVELS.BASE, data);
export const getAllPurposeOfTravels = async (params) => api.get(ENDPOINTS.PURPOSE_OF_TRAVELS.BASE, { params: params ?? {} });
export const getPurposeOfTravelById = async (id) => api.get(ENDPOINTS.PURPOSE_OF_TRAVELS.BY_ID(id));
export const updatePurposeOfTravel = async (id, data) => api.put(ENDPOINTS.PURPOSE_OF_TRAVELS.BY_ID(id), data);
export const deletePurposeOfTravel = async (id) => api.delete(ENDPOINTS.PURPOSE_OF_TRAVELS.BY_ID(id));
export const searchPurposeOfTravels = async (params) => api.post(ENDPOINTS.PURPOSE_OF_TRAVELS.SEARCH, params);

export const createIdentificationDocumentType = async (data) => api.post(ENDPOINTS.IDENTIFICATION_DOCUMENT_TYPES.BASE, data);
export const getAllIdentificationDocumentTypes = async (params) => api.get(ENDPOINTS.IDENTIFICATION_DOCUMENT_TYPES.BASE, { params: params ?? {} });
export const getIdentificationDocumentTypeById = async (id) => api.get(ENDPOINTS.IDENTIFICATION_DOCUMENT_TYPES.BY_ID(id));
export const updateIdentificationDocumentType = async (id, data) => api.put(ENDPOINTS.IDENTIFICATION_DOCUMENT_TYPES.BY_ID(id), data);
export const deleteIdentificationDocumentType = async (id) => api.delete(ENDPOINTS.IDENTIFICATION_DOCUMENT_TYPES.BY_ID(id));
export const searchIdentificationDocumentTypes = async (params) => api.post(ENDPOINTS.IDENTIFICATION_DOCUMENT_TYPES.SEARCH, params);

export const createTravelRequest = async (data) => api.post(ENDPOINTS.TRAVEL_REQUESTS.BASE, data);
export const getAllTravelRequests = async (params) => api.get(ENDPOINTS.TRAVEL_REQUESTS.BASE, { params: params ?? {} });
export const getTravelRequestById = async (id) => api.get(ENDPOINTS.TRAVEL_REQUESTS.BY_ID(id));
export const updateTravelRequest = async (id, data) => api.put(ENDPOINTS.TRAVEL_REQUESTS.BY_ID(id), data);
export const deleteTravelRequest = async (id) => api.delete(ENDPOINTS.TRAVEL_REQUESTS.BY_ID(id));
export const searchTravelRequests = async (params) => api.post(ENDPOINTS.TRAVEL_REQUESTS.SEARCH, params);

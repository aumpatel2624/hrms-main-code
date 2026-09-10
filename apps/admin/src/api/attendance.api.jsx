/** Attendance API (ADR-024) — minimal, module 9 extends this properly. */
import api from "./index";
import { ENDPOINTS } from "./endpoints";

export const createAttendance = async (data) => api.post(ENDPOINTS.ATTENDANCES.BASE, data);
export const getAllAttendances = async (params) => api.get(ENDPOINTS.ATTENDANCES.BASE, { params: params ?? {} });
export const getAttendanceById = async (id) => api.get(ENDPOINTS.ATTENDANCES.BY_ID(id));
export const updateAttendance = async (id, data) => api.put(ENDPOINTS.ATTENDANCES.BY_ID(id), data);
export const deleteAttendance = async (id) => api.delete(ENDPOINTS.ATTENDANCES.BY_ID(id));
export const searchAttendances = async (params) => api.post(ENDPOINTS.ATTENDANCES.SEARCH, params);

/**
 * Employee Records API (ADR-018): the Employee master itself. Its own file,
 * same reasoning as employee.controller.js on the server — substantially
 * bigger than the grouped Organization Setup masters.
 */
import api from "./index";
import { ENDPOINTS } from "./endpoints";

export const createEmployee = async (data) => api.post(ENDPOINTS.EMPLOYEES.BASE, data);
export const getAllEmployees = async (params) => api.get(ENDPOINTS.EMPLOYEES.BASE, { params: params ?? {} });
export const getEmployeeById = async (id) => api.get(ENDPOINTS.EMPLOYEES.BY_ID(id));
export const updateEmployee = async (id, data) => api.put(ENDPOINTS.EMPLOYEES.BY_ID(id), data);
export const deleteEmployee = async (id) => api.delete(ENDPOINTS.EMPLOYEES.BY_ID(id));
export const searchEmployees = async (params) => api.post(ENDPOINTS.EMPLOYEES.SEARCH, params);

/**
 * Training & Skills API (ADR-022): Training Program, Training Event,
 * Training Feedback, Skill, Employee Skill Map.
 */
import api from "./index";
import { ENDPOINTS } from "./endpoints";

export const createTrainingProgram = async (data) => api.post(ENDPOINTS.TRAINING_PROGRAMS.BASE, data);
export const getAllTrainingPrograms = async (params) => api.get(ENDPOINTS.TRAINING_PROGRAMS.BASE, { params: params ?? {} });
export const getTrainingProgramById = async (id) => api.get(ENDPOINTS.TRAINING_PROGRAMS.BY_ID(id));
export const updateTrainingProgram = async (id, data) => api.put(ENDPOINTS.TRAINING_PROGRAMS.BY_ID(id), data);
export const deleteTrainingProgram = async (id) => api.delete(ENDPOINTS.TRAINING_PROGRAMS.BY_ID(id));
export const searchTrainingPrograms = async (params) => api.post(ENDPOINTS.TRAINING_PROGRAMS.SEARCH, params);

export const createTrainingEvent = async (data) => api.post(ENDPOINTS.TRAINING_EVENTS.BASE, data);
export const getAllTrainingEvents = async (params) => api.get(ENDPOINTS.TRAINING_EVENTS.BASE, { params: params ?? {} });
export const getTrainingEventById = async (id) => api.get(ENDPOINTS.TRAINING_EVENTS.BY_ID(id));
export const updateTrainingEvent = async (id, data) => api.put(ENDPOINTS.TRAINING_EVENTS.BY_ID(id), data);
export const deleteTrainingEvent = async (id) => api.delete(ENDPOINTS.TRAINING_EVENTS.BY_ID(id));
export const searchTrainingEvents = async (params) => api.post(ENDPOINTS.TRAINING_EVENTS.SEARCH, params);
export const markTrainingEventCompleted = async (id) => api.post(ENDPOINTS.TRAINING_EVENTS.MARK_COMPLETED(id));
export const markTrainingEventScheduled = async (id) => api.post(ENDPOINTS.TRAINING_EVENTS.MARK_SCHEDULED(id));

export const createTrainingFeedback = async (data) => api.post(ENDPOINTS.TRAINING_FEEDBACKS.BASE, data);
export const getAllTrainingFeedbacks = async (params) => api.get(ENDPOINTS.TRAINING_FEEDBACKS.BASE, { params: params ?? {} });
export const getTrainingFeedbackById = async (id) => api.get(ENDPOINTS.TRAINING_FEEDBACKS.BY_ID(id));
export const deleteTrainingFeedback = async (id) => api.delete(ENDPOINTS.TRAINING_FEEDBACKS.BY_ID(id));
export const searchTrainingFeedbacks = async (params) => api.post(ENDPOINTS.TRAINING_FEEDBACKS.SEARCH, params);

export const createSkill = async (data) => api.post(ENDPOINTS.SKILLS.BASE, data);
export const getAllSkills = async (params) => api.get(ENDPOINTS.SKILLS.BASE, { params: params ?? {} });
export const getSkillById = async (id) => api.get(ENDPOINTS.SKILLS.BY_ID(id));
export const updateSkill = async (id, data) => api.put(ENDPOINTS.SKILLS.BY_ID(id), data);
export const deleteSkill = async (id) => api.delete(ENDPOINTS.SKILLS.BY_ID(id));
export const searchSkills = async (params) => api.post(ENDPOINTS.SKILLS.SEARCH, params);

export const createEmployeeSkillMap = async (data) => api.post(ENDPOINTS.EMPLOYEE_SKILL_MAPS.BASE, data);
export const getAllEmployeeSkillMaps = async (params) => api.get(ENDPOINTS.EMPLOYEE_SKILL_MAPS.BASE, { params: params ?? {} });
export const getEmployeeSkillMapById = async (id) => api.get(ENDPOINTS.EMPLOYEE_SKILL_MAPS.BY_ID(id));
export const updateEmployeeSkillMap = async (id, data) => api.put(ENDPOINTS.EMPLOYEE_SKILL_MAPS.BY_ID(id), data);
export const deleteEmployeeSkillMap = async (id) => api.delete(ENDPOINTS.EMPLOYEE_SKILL_MAPS.BY_ID(id));
export const searchEmployeeSkillMaps = async (params) => api.post(ENDPOINTS.EMPLOYEE_SKILL_MAPS.SEARCH, params);
export const populateEmployeeSkillMapFromDesignation = async (id) => api.post(ENDPOINTS.EMPLOYEE_SKILL_MAPS.POPULATE_FROM_DESIGNATION(id));

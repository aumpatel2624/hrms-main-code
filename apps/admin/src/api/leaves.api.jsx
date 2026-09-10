/**
 * Leaves API (ADR-024, module 8 foundation): LeaveType, LeavePeriod,
 * HolidayList, HolidayListAssignment, LeavePolicy, LeavePolicyAssignment,
 * LeaveAllocation, LeaveLedgerEntry (read-only).
 */
import api from "./index";
import { ENDPOINTS } from "./endpoints";

export const createLeaveType = async (data) => api.post(ENDPOINTS.LEAVE_TYPES.BASE, data);
export const getAllLeaveTypes = async (params) => api.get(ENDPOINTS.LEAVE_TYPES.BASE, { params: params ?? {} });
export const getLeaveTypeById = async (id) => api.get(ENDPOINTS.LEAVE_TYPES.BY_ID(id));
export const updateLeaveType = async (id, data) => api.put(ENDPOINTS.LEAVE_TYPES.BY_ID(id), data);
export const deleteLeaveType = async (id) => api.delete(ENDPOINTS.LEAVE_TYPES.BY_ID(id));
export const searchLeaveTypes = async (params) => api.post(ENDPOINTS.LEAVE_TYPES.SEARCH, params);

export const createLeavePeriod = async (data) => api.post(ENDPOINTS.LEAVE_PERIODS.BASE, data);
export const getAllLeavePeriods = async (params) => api.get(ENDPOINTS.LEAVE_PERIODS.BASE, { params: params ?? {} });
export const getLeavePeriodById = async (id) => api.get(ENDPOINTS.LEAVE_PERIODS.BY_ID(id));
export const updateLeavePeriod = async (id, data) => api.put(ENDPOINTS.LEAVE_PERIODS.BY_ID(id), data);
export const deleteLeavePeriod = async (id) => api.delete(ENDPOINTS.LEAVE_PERIODS.BY_ID(id));
export const searchLeavePeriods = async (params) => api.post(ENDPOINTS.LEAVE_PERIODS.SEARCH, params);

export const createHolidayList = async (data) => api.post(ENDPOINTS.HOLIDAY_LISTS.BASE, data);
export const getAllHolidayLists = async (params) => api.get(ENDPOINTS.HOLIDAY_LISTS.BASE, { params: params ?? {} });
export const getHolidayListById = async (id) => api.get(ENDPOINTS.HOLIDAY_LISTS.BY_ID(id));
export const updateHolidayList = async (id, data) => api.put(ENDPOINTS.HOLIDAY_LISTS.BY_ID(id), data);
export const deleteHolidayList = async (id) => api.delete(ENDPOINTS.HOLIDAY_LISTS.BY_ID(id));
export const searchHolidayLists = async (params) => api.post(ENDPOINTS.HOLIDAY_LISTS.SEARCH, params);

export const createHolidayListAssignment = async (data) => api.post(ENDPOINTS.HOLIDAY_LIST_ASSIGNMENTS.BASE, data);
export const getAllHolidayListAssignments = async (params) => api.get(ENDPOINTS.HOLIDAY_LIST_ASSIGNMENTS.BASE, { params: params ?? {} });
export const getHolidayListAssignmentById = async (id) => api.get(ENDPOINTS.HOLIDAY_LIST_ASSIGNMENTS.BY_ID(id));
export const updateHolidayListAssignment = async (id, data) => api.put(ENDPOINTS.HOLIDAY_LIST_ASSIGNMENTS.BY_ID(id), data);
export const deleteHolidayListAssignment = async (id) => api.delete(ENDPOINTS.HOLIDAY_LIST_ASSIGNMENTS.BY_ID(id));
export const searchHolidayListAssignments = async (params) => api.post(ENDPOINTS.HOLIDAY_LIST_ASSIGNMENTS.SEARCH, params);

export const createLeavePolicy = async (data) => api.post(ENDPOINTS.LEAVE_POLICIES.BASE, data);
export const getAllLeavePolicies = async (params) => api.get(ENDPOINTS.LEAVE_POLICIES.BASE, { params: params ?? {} });
export const getLeavePolicyById = async (id) => api.get(ENDPOINTS.LEAVE_POLICIES.BY_ID(id));
export const updateLeavePolicy = async (id, data) => api.put(ENDPOINTS.LEAVE_POLICIES.BY_ID(id), data);
export const deleteLeavePolicy = async (id) => api.delete(ENDPOINTS.LEAVE_POLICIES.BY_ID(id));
export const searchLeavePolicies = async (params) => api.post(ENDPOINTS.LEAVE_POLICIES.SEARCH, params);

export const createLeavePolicyAssignment = async (data) => api.post(ENDPOINTS.LEAVE_POLICY_ASSIGNMENTS.BASE, data);
export const getAllLeavePolicyAssignments = async (params) => api.get(ENDPOINTS.LEAVE_POLICY_ASSIGNMENTS.BASE, { params: params ?? {} });
export const getLeavePolicyAssignmentById = async (id) => api.get(ENDPOINTS.LEAVE_POLICY_ASSIGNMENTS.BY_ID(id));
export const updateLeavePolicyAssignment = async (id, data) => api.put(ENDPOINTS.LEAVE_POLICY_ASSIGNMENTS.BY_ID(id), data);
export const deleteLeavePolicyAssignment = async (id) => api.delete(ENDPOINTS.LEAVE_POLICY_ASSIGNMENTS.BY_ID(id));
export const searchLeavePolicyAssignments = async (params) => api.post(ENDPOINTS.LEAVE_POLICY_ASSIGNMENTS.SEARCH, params);
export const grantLeavePolicyAssignmentAllocations = async (id) => api.post(ENDPOINTS.LEAVE_POLICY_ASSIGNMENTS.GRANT_ALLOCATIONS(id));

export const createLeaveAllocation = async (data) => api.post(ENDPOINTS.LEAVE_ALLOCATIONS.BASE, data);
export const getAllLeaveAllocations = async (params) => api.get(ENDPOINTS.LEAVE_ALLOCATIONS.BASE, { params: params ?? {} });
export const getLeaveAllocationById = async (id) => api.get(ENDPOINTS.LEAVE_ALLOCATIONS.BY_ID(id));
export const updateLeaveAllocation = async (id, data) => api.put(ENDPOINTS.LEAVE_ALLOCATIONS.BY_ID(id), data);
export const deleteLeaveAllocation = async (id) => api.delete(ENDPOINTS.LEAVE_ALLOCATIONS.BY_ID(id));
export const searchLeaveAllocations = async (params) => api.post(ENDPOINTS.LEAVE_ALLOCATIONS.SEARCH, params);
export const adjustLeaveAllocation = async (id, data) => api.post(ENDPOINTS.LEAVE_ALLOCATIONS.ADJUST(id), data);

export const getLeaveLedgerEntryById = async (id) => api.get(ENDPOINTS.LEAVE_LEDGER_ENTRIES.BY_ID(id));
export const searchLeaveLedgerEntries = async (params) => api.post(ENDPOINTS.LEAVE_LEDGER_ENTRIES.SEARCH, params);

export const getLeaveBalance = async (employeeId, leaveTypeId) =>
    api.get(ENDPOINTS.LEAVE_BALANCE, { params: { employeeId, leaveTypeId } });

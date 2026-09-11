import { searchPayrollEntries, searchSalaryWithholdings, createSalaryWithholding, getSalaryWithholding, releaseWithholdingCycle, releaseAllWithholdingCycles, cancelSalaryWithholding, updateSalaryWithholding, deleteSalaryWithholding, deletePayrollEntry } from "../api/payrollRun.api";
import { createShiftType, getAllShiftTypes, getShiftTypeById, updateShiftType, deleteShiftType, searchShiftTypes, createShiftLocation, getAllShiftLocations, getShiftLocationById, updateShiftLocation, deleteShiftLocation, searchShiftLocations, createShiftAssignment, getAllShiftAssignments, getShiftAssignmentById, updateShiftAssignment, deleteShiftAssignment, searchShiftAssignments, createShiftSchedule, getAllShiftSchedules, getShiftScheduleById, updateShiftSchedule, deleteShiftSchedule, searchShiftSchedules, createShiftScheduleAssignment, getAllShiftScheduleAssignments, getShiftScheduleAssignmentById, updateShiftScheduleAssignment, deleteShiftScheduleAssignment, searchShiftScheduleAssignments, createEmployeeCheckin, getAllEmployeeCheckins, getEmployeeCheckinById, updateEmployeeCheckin, deleteEmployeeCheckin, searchEmployeeCheckins,
    createShiftRequest, getShiftRequestById, updateShiftRequest, searchShiftRequests, approveShiftRequest, rejectShiftRequest,
    createAttendanceRequest, getAttendanceRequestById, updateAttendanceRequest, searchAttendanceRequests, cancelAttendanceRequest,
} from "../api/shiftAttendance.api";
import {
    createSalaryComponent, getSalaryComponentById, updateSalaryComponent, deleteSalaryComponent, searchSalaryComponents, getAllSalaryComponents,
    createSalaryStructure, getSalaryStructureById, updateSalaryStructure, deleteSalaryStructure, searchSalaryStructures, getAllSalaryStructures,
    createSalaryStructureAssignment, getSalaryStructureAssignmentById, updateSalaryStructureAssignment, deleteSalaryStructureAssignment, searchSalaryStructureAssignments,
    getAllSalaryStructureAssignments,
} from "../api/payroll.api";
import {
    createPayrollPeriod, getPayrollPeriodById, updatePayrollPeriod, deletePayrollPeriod, searchPayrollPeriods, getAllPayrollPeriods,
    createSalarySlip, getAllSalarySlips, getSalarySlipById, updateSalarySlip, deleteSalarySlip, searchSalarySlips,
    submitSalarySlip, cancelSalarySlip,
} from "../api/payrollRun.api";
import {
    createAdditionalSalary, getAdditionalSalaryById, cancelAdditionalSalary, deleteAdditionalSalary, searchAdditionalSalaries,
    createArrear, getArrearById, updateArrear, deleteArrear, searchArrears, submitArrear, cancelArrear,
    createRetentionBonus, getRetentionBonusById, updateRetentionBonus, deleteRetentionBonus, searchRetentionBonuses, submitRetentionBonus, cancelRetentionBonus,
    createEmployeeIncentive, getEmployeeIncentiveById, updateEmployeeIncentive, deleteEmployeeIncentive, searchEmployeeIncentives, submitEmployeeIncentive, cancelEmployeeIncentive,
    createEmployeeOtherIncome, getEmployeeOtherIncomeById, updateEmployeeOtherIncome, deleteEmployeeOtherIncome, searchEmployeeOtherIncomes, submitEmployeeOtherIncome, cancelEmployeeOtherIncome,
} from "../api/payrollAdjustments.api";
import {
    createEmployeeBenefitApplication, getEmployeeBenefitApplicationById, updateEmployeeBenefitApplication, deleteEmployeeBenefitApplication, searchEmployeeBenefitApplications, submitEmployeeBenefitApplication, cancelEmployeeBenefitApplication,
    createEmployeeBenefitClaim, getEmployeeBenefitClaimById, updateEmployeeBenefitClaim, deleteEmployeeBenefitClaim, searchEmployeeBenefitClaims, submitEmployeeBenefitClaim, cancelEmployeeBenefitClaim,
    getEmployeeBenefitLedgerById, searchEmployeeBenefitLedgers,
    createPayrollCorrection, getPayrollCorrectionById, updatePayrollCorrection, deletePayrollCorrection, searchPayrollCorrections, submitPayrollCorrection, cancelPayrollCorrection,
} from "../api/payrollBenefits.api";
import {
    createIncomeTaxSlab, getIncomeTaxSlabById, updateIncomeTaxSlab, deleteIncomeTaxSlab, searchIncomeTaxSlabs, getAllIncomeTaxSlabs,
    createEmployeeTaxExemptionCategory, getEmployeeTaxExemptionCategoryById, updateEmployeeTaxExemptionCategory, deleteEmployeeTaxExemptionCategory, searchEmployeeTaxExemptionCategories, getAllEmployeeTaxExemptionCategories,
    createEmployeeTaxExemptionSubCategory, getEmployeeTaxExemptionSubCategoryById, updateEmployeeTaxExemptionSubCategory, deleteEmployeeTaxExemptionSubCategory, searchEmployeeTaxExemptionSubCategories, getAllEmployeeTaxExemptionSubCategories,
    createEmployeeTaxExemptionDeclaration, getEmployeeTaxExemptionDeclarationById, updateEmployeeTaxExemptionDeclaration, deleteEmployeeTaxExemptionDeclaration, searchEmployeeTaxExemptionDeclarations, submitEmployeeTaxExemptionDeclaration, cancelEmployeeTaxExemptionDeclaration,
    createEmployeeTaxExemptionProofSubmission, getEmployeeTaxExemptionProofSubmissionById, updateEmployeeTaxExemptionProofSubmission, deleteEmployeeTaxExemptionProofSubmission, searchEmployeeTaxExemptionProofSubmissions, submitEmployeeTaxExemptionProofSubmission, cancelEmployeeTaxExemptionProofSubmission,
} from "../api/payrollTax.api";
import { GenerateShiftsPanel } from "../components/hrms/generate-shifts-panel";
import { Building07, Hash02, Link01, Mail01, MarkerPin01, Phone, Shield01, Tag01, Type01, User01 } from "@untitledui/icons";
import { isStrongPassword, isValidEmail, PASSWORD } from "@demo-panel/shared/validation";
import api from "../api/index";
import { ENDPOINTS } from "../api/endpoints";
import {
    createDepartment, deleteDepartment, getDepartmentById, updateDepartment, searchDepartments, getAllDepartments,
} from "../api/departments.api";
import {
    createBranch, deleteBranch, getBranchById, updateBranch, searchBranches, getAllBranches,
    createDesignation, deleteDesignation, getDesignationById, updateDesignation, searchDesignations, getAllDesignations,
    getAllCompanies, getAllEmploymentTypes, getAllEmployeeGrades, getAllEmployeeHealthInsurances,
} from "../api/organizationSetup.api";
import {
    createEmployee, deleteEmployee, getEmployeeById, updateEmployee, searchEmployees, getAllEmployees,
} from "../api/employees.api";
import { getAllRoles } from "../api/roles.api";
import { getAllCountries, getStatesByCountry, getCitiesByState } from "../api/locations.api";
import {
    createAdminUser, deleteAdminUser, getAdminUserById, updateAdminUser, searchAdminUsers, resetAdminUserPassword,
} from "../api/adminUsers.api";
import { createUser, deleteUser, getUserById, updateUser, searchUsers, resetUserPassword, getAllUsers } from "../api/users.api";
import {
    createMenu, deleteMenu, getMenuById, updateMenu, searchMenus, getAllMenuGroups, getAllMenus,
} from "../api/menus.api";
import {
    getAllEmailSetups, getAllEmailFor, searchEmailTemplates, createEmailTemplate,
    deleteEmailTemplate, getEmailTemplateById, updateEmailTemplate,
} from "../api/emails.api";
import { deleteSeoPage, getSeoPageById, searchSeoPages } from "../api/seo.api";
import {
    createJobRequisition, deleteJobRequisition, getJobRequisitionById, updateJobRequisition,
    searchJobRequisitions, getAllJobRequisitions, makeJobOpeningFromRequisition,
    createJobOpening, deleteJobOpening, getJobOpeningById, updateJobOpening, searchJobOpenings, getAllJobOpenings,
    createJobApplicant, deleteJobApplicant, getJobApplicantById, updateJobApplicant, searchJobApplicants, getAllJobApplicants,
    createJobApplicantSource, deleteJobApplicantSource, getJobApplicantSourceById, updateJobApplicantSource,
    searchJobApplicantSources, getAllJobApplicantSources,
} from "../api/recruitmentPipeline.api";
import {
    createInterviewType, deleteInterviewType, getInterviewTypeById, updateInterviewType, searchInterviewTypes, getAllInterviewTypes,
    createInterview, deleteInterview, getInterviewById, updateInterview, searchInterviews, getAllInterviews,
    createInterviewFeedback, deleteInterviewFeedback, getInterviewFeedbackById, updateInterviewFeedback, searchInterviewFeedbacks,
} from "../api/interviews.api";
import {
    createJobOffer, deleteJobOffer, getJobOfferById, updateJobOffer, searchJobOffers, makeEmployeeFromJobOffer, getAllJobOffers,
    createJobOfferTermTemplate, deleteJobOfferTermTemplate, getJobOfferTermTemplateById, updateJobOfferTermTemplate,
    searchJobOfferTermTemplates, getAllJobOfferTermTemplates,
} from "../api/jobOffers.api";
import {
    createEmployeeOnboarding, deleteEmployeeOnboarding, getEmployeeOnboardingById, updateEmployeeOnboarding,
    searchEmployeeOnboardings, markOnboardingAsCompleted, makeEmployeeFromOnboarding,
    createEmployeeOnboardingTemplate, deleteEmployeeOnboardingTemplate, getEmployeeOnboardingTemplateById,
    updateEmployeeOnboardingTemplate, searchEmployeeOnboardingTemplates, getAllEmployeeOnboardingTemplates,
    createEmployeeSeparation, deleteEmployeeSeparation, getEmployeeSeparationById, updateEmployeeSeparation,
    searchEmployeeSeparations,
    createEmployeeSeparationTemplate, deleteEmployeeSeparationTemplate, getEmployeeSeparationTemplateById,
    updateEmployeeSeparationTemplate, searchEmployeeSeparationTemplates, getAllEmployeeSeparationTemplates,
    createExitInterview, deleteExitInterview, getExitInterviewById, updateExitInterview, searchExitInterviews,
    createFullAndFinalStatement, deleteFullAndFinalStatement, getFullAndFinalStatementById,
    updateFullAndFinalStatement, searchFullAndFinalStatements, markStatementAsPaid,
} from "../api/onboardingSeparation.api";
import {
    createGrievanceType, deleteGrievanceType, getGrievanceTypeById, updateGrievanceType, searchGrievanceTypes, getAllGrievanceTypes,
    createEmployeeGrievance, deleteEmployeeGrievance, getEmployeeGrievanceById, updateEmployeeGrievance, searchEmployeeGrievances,
    createEmployeeTransfer, deleteEmployeeTransfer, getEmployeeTransferById, searchEmployeeTransfers,
    createEmployeePromotion, deleteEmployeePromotion, getEmployeePromotionById, searchEmployeePromotions,
    createEmployeeReferral, deleteEmployeeReferral, getEmployeeReferralById, updateEmployeeReferral,
    searchEmployeeReferrals, createJobApplicantFromReferral,
    createStaffingPlan, deleteStaffingPlan, getStaffingPlanById, updateStaffingPlan, searchStaffingPlans,
} from "../api/employeeCareerEvents.api";
import {
    createTrainingProgram, deleteTrainingProgram, getTrainingProgramById, updateTrainingProgram, searchTrainingPrograms, getAllTrainingPrograms,
    createTrainingEvent, deleteTrainingEvent, getTrainingEventById, updateTrainingEvent, searchTrainingEvents, getAllTrainingEvents,
    markTrainingEventCompleted, markTrainingEventScheduled,
    createTrainingFeedback, deleteTrainingFeedback, getTrainingFeedbackById, searchTrainingFeedbacks,
    createSkill, deleteSkill, getSkillById, updateSkill, searchSkills, getAllSkills,
    createEmployeeSkillMap, deleteEmployeeSkillMap, getEmployeeSkillMapById, updateEmployeeSkillMap,
    searchEmployeeSkillMaps, populateEmployeeSkillMapFromDesignation,
} from "../api/trainingSkills.api";
import {
    createPurposeOfTravel, deletePurposeOfTravel, getPurposeOfTravelById, updatePurposeOfTravel,
    searchPurposeOfTravels, getAllPurposeOfTravels,
    createIdentificationDocumentType, deleteIdentificationDocumentType, getIdentificationDocumentTypeById,
    updateIdentificationDocumentType, searchIdentificationDocumentTypes, getAllIdentificationDocumentTypes,
    createTravelRequest, deleteTravelRequest, getTravelRequestById, updateTravelRequest, searchTravelRequests,
} from "../api/travel.api";
import {
    createLeaveType, deleteLeaveType, getLeaveTypeById, updateLeaveType, searchLeaveTypes, getAllLeaveTypes,
    createLeavePeriod, deleteLeavePeriod, getLeavePeriodById, updateLeavePeriod, searchLeavePeriods, getAllLeavePeriods,
    createHolidayList, deleteHolidayList, getHolidayListById, updateHolidayList, searchHolidayLists, getAllHolidayLists,
    createHolidayListAssignment, deleteHolidayListAssignment, getHolidayListAssignmentById,
    updateHolidayListAssignment, searchHolidayListAssignments,
    createLeavePolicy, deleteLeavePolicy, getLeavePolicyById, updateLeavePolicy, searchLeavePolicies, getAllLeavePolicies,
    createLeavePolicyAssignment, deleteLeavePolicyAssignment, getLeavePolicyAssignmentById,
    updateLeavePolicyAssignment, searchLeavePolicyAssignments, grantLeavePolicyAssignmentAllocations,
    createLeaveAllocation, deleteLeaveAllocation, getAllLeaveAllocations, getLeaveAllocationById, updateLeaveAllocation,
    searchLeaveAllocations, adjustLeaveAllocation,
    createLeaveAdjustment, getLeaveAdjustmentById, searchLeaveAdjustments,
    createCompensatoryLeaveRequest, updateCompensatoryLeaveRequest, deleteCompensatoryLeaveRequest,
    getCompensatoryLeaveRequestById, searchCompensatoryLeaveRequests,
    approveCompensatoryLeaveRequest, rejectCompensatoryLeaveRequest,
    createLeaveApplication, updateLeaveApplication, getLeaveApplicationById, searchLeaveApplications,
    approveLeaveApplication, rejectLeaveApplication, cancelLeaveApplication,
    createLeaveEncashment, updateLeaveEncashment, getLeaveEncashmentById, searchLeaveEncashments, markLeaveEncashmentPaid,
    createLeaveBlockList, updateLeaveBlockList, deleteLeaveBlockList, getLeaveBlockListById, searchLeaveBlockLists,
} from "../api/leaves.api";
import {
    createAttendance, deleteAttendance, getAttendanceById, updateAttendance, searchAttendances,
} from "../api/attendance.api";
import PasswordResetSection from "@/components/crud/password-reset-section";
import EmailTemplateMergeFields from "@/components/crud/email-template-merge-fields";
import SimpleArrayField from "@/components/crud/simple-array-field";
import SimpleActionButton from "@/components/crud/simple-action-button";
import AdjustAllocationPanel from "@/components/crud/adjust-allocation-panel";
import MarkEncashmentPaidPanel from "@/components/crud/mark-encashment-paid-panel";

const ACTIVE = { name: "isActive", label: "Is Active", type: "checkbox", section: "status", default: false };
const asOptions = (loader, labelKey) => () =>
    loader().then((res) => (res.data?.data ?? []).map((x) => ({ value: x._id, label: x[labelKey] })));

/**
 * The id of a relation, however it arrived.
 *
 * The single-record endpoints `populate()` their refs, so on an edit form the
 * first lookup pass sees the whole referenced document rather than its id. Sent
 * to the API that way it stringifies to "[object Object]" and the request fails
 * its ObjectId cast, leaving the dependent dropdown empty — which is how a
 * user's existing state and city became invisible on the edit screen.
 */
const refId = (value) =>
    value && typeof value === "object" && !Array.isArray(value) ? (value._id ?? value.id) : value;

const mobileRule = (v) => (v && v.length !== 10 ? "Phone number should be 10 digits" : undefined);
const emailRule = (v) => (v && !isValidEmail(v) ? "Invalid email address" : undefined);
const passwordRule = (v, _values, mode) =>
    mode === "add" && v && !isStrongPassword(v) ? PASSWORD.MESSAGE : undefined;

export const adminUserConfig = {
    filterFields: [
        { name: "adminName", label: "Name", type: "string" },
        { name: "email", label: "Email", type: "string" },
        { name: "mobileNumber", label: "Mobile", type: "string" },
        { name: "isActive", label: "Active", type: "boolean" },
        { name: "createdAt", label: "Created", type: "date" },
    ],
    key: "admin-user",
    path: "/admin-user",
    section: "Setup",
    singular: "Admin User",
    plural: "Admin Users",
    description: "Accounts with access to this admin panel.",
    api: {
        search: searchAdminUsers, getById: getAdminUserById, create: createAdminUser,
        update: updateAdminUser, remove: deleteAdminUser,
    },
    sections: [
        { id: "details", title: "Account details", description: "Who this administrator is and how to reach them." },
        { id: "security", title: "Security", description: "Password used to sign in." },
        { id: "status", title: "Status" },
    ],
    fields: [
        { name: "adminName", icon: User01, label: "Name", required: true, section: "details", placeholder: "Enter name", error: "Name is required" },
        { name: "email", type: "email", label: "Email", required: true, section: "details", error: "Email is required", validate: emailRule },
        { name: "mobileNumber", icon: Phone, label: "Mobile Number", section: "details", placeholder: "10-digit number", validate: mobileRule },
        {
            name: "password", type: "password", label: "Password", required: true, section: "security",
            placeholder: "Enter password", hint: PASSWORD.MESSAGE, hideIn: ["edit"],
            error: "Password is required", validate: passwordRule,
        },
        { ...ACTIVE, default: true },
    ],
    // The update endpoint takes the profile only; passwords go through their
    // own reset endpoint.
    toPayload: (values, mode) =>
        mode === "edit"
            ? { adminName: values.adminName, email: values.email, mobileNumber: values.mobileNumber, isActive: values.isActive }
            : values,
    renderExtra: ({ mode, id }) =>
        mode === "edit" ? <PasswordResetSection id={id} resetApi={resetAdminUserPassword} /> : null,
    columns: [
        { name: "Name", selector: (row) => row.adminName, sortable: true, sortField: "adminName", minWidth: "170px" },
        { name: "Email", selector: (row) => row.email, sortable: true, sortField: "email", minWidth: "220px" },
        { name: "Mobile", selector: (row) => row.mobileNumber, minWidth: "140px" },
    ],
    recordTitle: (r) => r.adminName,
};

export const userConfig = {
    filterFields: [
        { name: "userName", label: "User Name", type: "string" },
        { name: "email", label: "Email", type: "string" },
        { name: "mobileNumber", label: "Mobile", type: "string" },
        { name: "address", label: "Address", type: "string" },
        { name: "departmentId", label: "Department", type: "objectId", optionsFrom: "departments" },
        { name: "roleId", label: "Role", type: "objectId", optionsFrom: "roles" },
        { name: "isActive", label: "Active", type: "boolean" },
        { name: "createdAt", label: "Created", type: "date" },
    ],
    filterLookups: {
        departments: asOptions(getAllDepartments, "departmentName"),
        roles: asOptions(getAllRoles, "roleName"),
    },
    key: "user",
    path: "/user",
    section: "Setup",
    singular: "User",
    plural: "Users",
    description: "People who use the application, and where they are based.",
    api: { search: searchUsers, getById: getUserById, create: createUser, update: updateUser, remove: deleteUser },
    lookups: {
        departments: asOptions(getAllDepartments, "departmentName"),
        roles: asOptions(getAllRoles, "roleName"),
        countries: asOptions(getAllCountries, "countryName"),
        // Cascade: each level reloads when the level above it changes.
        states: (values) =>
            refId(values.countryId)
                ? getStatesByCountry(refId(values.countryId)).then((res) => (res.data?.data ?? []).map((x) => ({ value: x._id, label: x.stateName })))
                : Promise.resolve([]),
        cities: (values) =>
            refId(values.stateId)
                ? getCitiesByState(refId(values.stateId)).then((res) => (res.data?.data ?? []).map((x) => ({ value: x._id, label: x.cityName })))
                : Promise.resolve([]),
    },
    lookupDeps: ["countryId", "stateId"],
    sections: [
        { id: "details", title: "User details", description: "Name, contact details and where they sit in the organisation." },
        { id: "location", title: "Location", description: "Country, state and city. Each list narrows the next." },
        { id: "security", title: "Security" },
        { id: "status", title: "Status" },
    ],
    fields: [
        { name: "userName", icon: User01, label: "User Name", required: true, section: "details", placeholder: "Enter user name", error: "Name is required" },
        { name: "departmentId", icon: Building07, label: "Department", type: "select", optionsFrom: "departments", required: true, section: "details", placeholder: "Search department...", error: "Department is required" },
        { name: "roleId", icon: Shield01, label: "Role", type: "select", optionsFrom: "roles", required: true, section: "details", placeholder: "Search role...", error: "Role is required" },
        { name: "email", type: "email", label: "Email", required: true, section: "details", error: "Email is required", validate: emailRule },
        { name: "mobileNumber", icon: Phone, label: "Mobile Number", section: "details", placeholder: "10-digit number", validate: mobileRule },
        { name: "countryId", label: "Country", type: "select", optionsFrom: "countries", required: true, section: "location", placeholder: "Search country...", error: "Country is required", clears: ["stateId", "cityId"] },
        { name: "stateId", label: "State", type: "select", optionsFrom: "states", required: true, section: "location", placeholder: "Search state...", error: "State is required", clears: ["cityId"], disabled: (v) => !v.countryId },
        { name: "cityId", icon: MarkerPin01, label: "City", type: "select", optionsFrom: "cities", required: true, section: "location", placeholder: "Search city...", error: "City is required", disabled: (v) => !v.stateId },
        { name: "address", type: "textarea", label: "Address", required: true, section: "location", placeholder: "Enter address", error: "Address is required" },
        {
            name: "password", type: "password", label: "Password", required: true, section: "security",
            placeholder: "Enter password", hint: PASSWORD.MESSAGE, hideIn: ["edit"],
            error: "Password is required", validate: passwordRule,
        },
        { ...ACTIVE, default: true },
    ],
    toForm: (d) => ({
        userName: d.userName ?? "",
        departmentId: d.departmentId?._id ?? d.departmentId ?? "",
        roleId: d.roleId?._id ?? d.roleId ?? "",
        email: d.email ?? "",
        mobileNumber: d.mobileNumber ?? "",
        countryId: d.countryId?._id ?? d.countryId ?? "",
        stateId: d.stateId?._id ?? d.stateId ?? "",
        cityId: d.cityId?._id ?? d.cityId ?? "",
        address: d.address ?? "",
        password: "",
        isActive: d.isActive ?? true,
    }),
    toPayload: (values, mode) => {
        const { password, ...rest } = values;
        return mode === "edit" ? rest : values;
    },
    renderExtra: ({ mode, id }) => (mode === "edit" ? <PasswordResetSection id={id} resetApi={resetUserPassword} /> : null),
    columns: [
        { name: "User Name", selector: (row) => row.userName, minWidth: "160px" },
        { name: "Department", selector: (row) => row.department?.departmentName ?? row.departmentId?.departmentName, minWidth: "160px" },
        { name: "Email", selector: (row) => row.email, minWidth: "220px" },
        { name: "Phone", selector: (row) => row.mobileNumber, minWidth: "140px" },
    ],
    recordTitle: (r) => r.userName,
};

export const menuMasterConfig = {
    filterFields: [
        { name: "menuName", label: "Menu Name", type: "string" },
        { name: "menuUrl", label: "Menu URL", type: "string" },
        { name: "sequence", label: "Sequence", type: "number" },
        { name: "isParent", label: "Is Parent", type: "boolean" },
        { name: "isActive", label: "Active", type: "boolean" },
        { name: "createdAt", label: "Created", type: "date" },
    ],
    key: "menu-master",
    path: "/menu-master",
    section: "Master",
    singular: "Menu",
    plural: "Menu Master",
    description: "Individual sidebar entries and their nesting.",
    api: { search: searchMenus, getById: getMenuById, create: createMenu, update: updateMenu, remove: deleteMenu },
    lookups: {
        menuGroups: asOptions(getAllMenuGroups, "menuGroupName"),
        /**
         * Parent candidates are the isParent menus inside the selected group,
         * labelled with their full "Parent > Child" path. A menu can never be
         * its own parent, hence the route id.
         */
        parentMenus: async (values, ctx) => {
            if (!values.menuGroup) return [];
            const res = await getAllMenus();
            const all = res.data?.data ?? [];
            const inGroup = (m) => m.menuGroup?._id === values.menuGroup || m.menuGroup === values.menuGroup;

            const byId = new Map();
            all.forEach((m) => inGroup(m) && byId.set(m._id.toString(), { ...m, path: m.menuName }));
            all.forEach((m) => {
                if (!inGroup(m)) return;
                const parent = m.parentMenu && byId.get(m.parentMenu.toString());
                if (!parent) return;
                const self = byId.get(m._id.toString());
                self.path = `${parent.path} > ${self.path}`;
            });

            return [...byId.values()]
                .filter((m) => m.isParent === true && (!ctx?.id || m._id.toString() !== ctx.id.toString()))
                .map((m) => ({ value: m._id, label: m.path }));
        },
    },
    lookupDeps: ["menuGroup"],
    sections: [
        { id: "details", title: "Menu details", description: "Name, group and the icon shown in the sidebar." },
        { id: "nesting", title: "Nesting", description: "A parent menu holds submenus and has no URL of its own." },
        { id: "status", title: "Status" },
    ],
    fields: [
        { name: "menuName", icon: Type01, label: "Menu Name", required: true, section: "details", placeholder: "Enter menu name", error: "Menu Name is required!" },
        { name: "menuGroup", icon: Tag01, label: "Menu Group", type: "select", optionsFrom: "menuGroups", required: true, section: "details", placeholder: "Search menu group...", error: "Menu Group is required!", clears: ["parentMenu"] },
        { name: "sequence", icon: Hash02, type: "number", min: 1, label: "Sequence", required: true, section: "details", placeholder: "Enter sequence", error: "Sequence is required!" },
        { name: "icon", type: "icon", label: "Menu Icon", section: "details" },
        { name: "isParent", type: "checkbox", label: "Is Parent Menu (holds submenus)", section: "nesting", default: false },
        {
            name: "menuUrl", icon: Link01, label: "Menu URL", section: "nesting", placeholder: "/example",
            disabled: (v) => v.isParent,
            validate: (v, values) => (!values.isParent && !v ? "Menu URL is required for non-parent menus!" : undefined),
        },
        { name: "parentMenu", label: "Parent Menu", type: "select", optionsFrom: "parentMenus", section: "nesting", placeholder: "Search parent menu...", disabled: (v) => !v.menuGroup },
        ACTIVE,
    ],
    toForm: (d) => ({
        menuName: d.menuName ?? "",
        menuGroup: d.menuGroup?._id ?? d.menuGroup ?? "",
        menuUrl: d.menuUrl ?? "",
        sequence: d.sequence ?? "",
        isActive: d.isActive ?? false,
        isParent: d.isParent ?? false,
        parentMenu: d.parentMenu ?? "",
        icon: d.icon ?? "",
    }),
    toPayload: (values) => ({ ...values, parentMenu: values.parentMenu || null }),
    columns: [
        { name: "Menu Name", selector: (row) => row.menuName, sortable: true, sortField: "menuName", minWidth: "160px" },
        { name: "Menu Group", selector: (row) => row.menuGroup?.menuGroupName ?? row.menuGroup, sortable: true, sortField: "menuGroup.menuGroupName", minWidth: "160px" },
        { name: "Menu URL", selector: (row) => row.menuUrl, minWidth: "150px" },
        { name: "Sequence", selector: (row) => row.sequence, sortable: true, sortField: "sequence", minWidth: "110px" },
    ],
    recordTitle: (r) => r.menuName,
};

// Jodit uploads signature images straight to the template endpoint.
const editorConfig = {
    uploader: {
        url: `${api.defaults.baseURL}${ENDPOINTS.EMAIL_TEMPLATES.UPLOAD_SIGNATURE}`,
        method: "POST",
        withCredentials: true,
        filesVariableName: () => "signatureImage",
        format: "json",
        isSuccess: (resp) => resp.data.isOk,
        getMessage: (resp) => resp.data.message,
        process: (resp) => ({
            files: [resp.data.url],
            path: resp.data.url,
            baseurl: "",
            error: resp.data.isOk ? 0 : 1,
            message: resp.data.message,
        }),
        defaultHandlerSuccess: function (data) {
            if (data.files?.length) this.selection.insertImage(data.files[0]);
        },
    },
};

export const emailTemplateConfig = {
    filterFields: [
        { name: "templateName", label: "Template Name", type: "string" },
        { name: "mailerName", label: "Mailer Name", type: "string" },
        { name: "emailSubject", label: "Email Subject", type: "string" },
        { name: "emailCC", label: "Email CC", type: "string" },
        { name: "emailBCC", label: "Email BCC", type: "string" },
        { name: "isActive", label: "Active", type: "boolean" },
        { name: "createdAt", label: "Created", type: "date" },
    ],
    key: "email-template",
    path: "/email-template",
    section: "CMS",
    singular: "Email Template",
    plural: "Email Templates",
    description: "The content sent for each email event.",
    api: {
        search: searchEmailTemplates, getById: getEmailTemplateById, create: createEmailTemplate,
        update: updateEmailTemplate, remove: deleteEmailTemplate,
    },
    lookups: {
        emailFrom: asOptions(getAllEmailSetups, "email"),
        emailForList: asOptions(getAllEmailFor, "emailFor"),
    },
    sections: [
        { id: "details", title: "Template details", description: "What this template is called and which event it serves." },
        { id: "recipients", title: "Recipients", description: "Who receives a copy of every message." },
        { id: "content", title: "Content", description: "Subject line and the signature appended to the message." },
        { id: "status", title: "Status" },
    ],
    fields: [
        { name: "templateName", icon: Type01, label: "Template Name", required: true, section: "details", placeholder: "Enter template name", error: "Template Name is required" },
        { name: "mailerName", icon: User01, label: "Mailer Name", required: true, section: "details", placeholder: "Name shown as the sender", error: "Mailer Name is required" },
        { name: "emailFrom", icon: Mail01, label: "Email From", type: "select", optionsFrom: "emailFrom", required: true, section: "details", placeholder: "Search sender...", error: "Email From is required" },
        { name: "emailFor", label: "Email For", type: "select", optionsFrom: "emailForList", required: true, section: "details", placeholder: "Search event...", error: "Email For is required" },
        { name: "emailCC", icon: Mail01, label: "Email CC", section: "recipients", placeholder: "cc@company.com" },
        { name: "emailBCC", icon: Mail01, label: "Email BCC", section: "recipients", placeholder: "bcc@company.com" },
        { name: "emailSubject", label: "Email Subject", required: true, section: "content", full: true, placeholder: "Enter email subject", error: "Email Subject is required" },
        { name: "emailSignature", type: "richtext", label: "Email Signature", required: true, section: "content", editorConfig, error: "Email Signature is required" },
        ACTIVE,
    ],
    toForm: (d) => ({
        templateName: d.templateName ?? "",
        mailerName: d.mailerName ?? "",
        emailFrom: d.emailFrom?._id ?? d.emailFrom ?? "",
        emailFor: d.emailFor?._id ?? d.emailFor ?? "",
        emailCC: d.emailCC ?? "",
        emailBCC: d.emailBCC ?? "",
        emailSubject: d.emailSubject ?? "",
        emailSignature: d.emailSignature ?? "",
        isActive: d.isActive ?? false,
    }),
    renderExtra: ({ values }) => <EmailTemplateMergeFields values={values} />,
    columns: [
        { name: "Template Name", selector: (row) => row.templateName, minWidth: "180px" },
        { name: "Email From", selector: (row) => row.emailFrom?.email, minWidth: "200px" },
        { name: "Email For", selector: (row) => row.emailFor?.emailFor, minWidth: "160px" },
        { name: "Mailer Name", selector: (row) => row.mailerName, minWidth: "160px" },
    ],
    recordTitle: (r) => r.templateName,
};


/**
 * SEO pages — list, view and delete only.
 *
 * NOT in ADVANCED_ENTITIES on purpose. crudRoutes would generate an add/edit
 * form from `fields`, and this is the one screen where a generated form is the
 * wrong answer: its whole value is the live Google preview, share card and
 * health checklist beside the inputs, which no config can express. allRoutes
 * takes the list route from here and points the rest at SeoPageEditor.
 *
 * `create`/`update` are deliberately absent — the editor calls the API itself.
 */
export const seoPageConfig = {
    filterFields: [
        { name: "path", label: "URL", type: "string" },
        { name: "pageName", label: "Page Name", type: "string" },
        { name: "title", label: "Title", type: "string" },
        { name: "description", label: "Description", type: "string" },
        { name: "focusKeyword", label: "Focus Keyword", type: "string" },
        { name: "robots.index", label: "Shown in search", type: "boolean" },
        { name: "sitemap.include", label: "In sitemap", type: "boolean" },
        { name: "isActive", label: "Active", type: "boolean" },
        { name: "createdAt", label: "Created", type: "date" },
        { name: "updatedAt", label: "Updated", type: "date" },
    ],
    key: "seo-page",
    path: "/seo-pages",
    section: "Setup",
    singular: "SEO Page",
    plural: "SEO Pages",
    description: "How each fixed URL of your website appears in search results and when shared.",
    api: { search: searchSeoPages, getById: getSeoPageById, remove: deleteSeoPage },
    columns: [
        { name: "URL", selector: (row) => row.path, sortable: true, sortField: "path", minWidth: "200px" },
        { name: "Page Name", selector: (row) => row.pageName, sortable: true, sortField: "pageName", minWidth: "180px" },
        { name: "Title", selector: (row) => row.title || "Uses the site template", minWidth: "220px" },
        { name: "In Search", selector: (row) => (row.robots?.index === false ? "Hidden" : "Yes"), maxWidth: "120px" },
        { name: "In Sitemap", selector: (row) => (row.sitemap?.include === false ? "No" : "Yes"), maxWidth: "130px" },
        {
            name: "Updated",
            selector: (row) => (row.updatedAt ? new Date(row.updatedAt).toLocaleDateString() : "-"),
            sortable: true, sortField: "updatedAt", minWidth: "130px",
        },
    ],
    recordTitle: (r) => r.pageName,
};

// ADR-017 (Organization Setup): Department, Branch and Designation each need
// a companyId select (a `lookups` entry), which is why they live here rather
// than in entities/index.js's UNIFORM_ENTITIES.

export const departmentConfig = {
    filterFields: [
        { name: "departmentName", label: "Department Name", type: "string" },
        { name: "departmentCode", label: "Department Code", type: "string" },
        { name: "companyId", label: "Company", type: "objectId" },
        { name: "isActive", label: "Active", type: "boolean" },
        { name: "createdAt", label: "Created", type: "date" },
    ],
    key: "department",
    path: "/department",
    section: "HR Setup",
    singular: "Department",
    plural: "Departments",
    description: "Departments users can be assigned to.",
    api: { search: searchDepartments, getById: getDepartmentById, create: createDepartment, update: updateDepartment, remove: deleteDepartment },
    lookups: {
        companyId: asOptions(getAllCompanies, "companyName"),
        // ADR-024 (Department Approver): a department's own approver-chain
        // parent. leaveApprovers/expenseApprovers/shiftRequestApprovers
        // (plain User-ref arrays) are schema-ready and API-accessible but,
        // like Recruitment's interviewers/defaultInterviewers before them,
        // not given a form field — this admin has no multi-select field
        // type yet (a known simplification, not an oversight).
        parentDepartmentId: asOptions(getAllDepartments, "departmentName"),
    },
    sections: [
        { id: "details", title: "Department details" },
        { id: "status", title: "Status" },
    ],
    fields: [
        { name: "companyId", icon: Building07, label: "Company", type: "select", required: true, section: "details", error: "Company is required!", optionsFrom: "companyId" },
        { name: "departmentName", icon: Building07, label: "Department Name", required: true, section: "details", error: "Department Name is required!", placeholder: "Enter department name" },
        { name: "departmentCode", icon: Hash02, label: "Department Code", section: "details", placeholder: "Enter department code (optional)" },
        { name: "parentDepartmentId", icon: Building07, label: "Parent Department", type: "select", section: "details", optionsFrom: "parentDepartmentId", hint: "Used to resolve a Leave/Expense/Shift Request approver when the employee's own department has none set." },
        ACTIVE,
    ],
    columns: [
        { name: "Department Name", selector: (row) => row.departmentName, minWidth: "180px" },
        { name: "Code", selector: (row) => row.departmentCode, minWidth: "130px" },
        { name: "Status", selector: (row) => (row.isActive ? "Active" : "Inactive"), minWidth: "130px" },
    ],
    recordTitle: (r) => r.departmentName,
    toForm: (data) => ({ ...data, companyId: refId(data.companyId), parentDepartmentId: refId(data.parentDepartmentId) }),
};

export const branchConfig = {
    filterFields: [
        { name: "branchName", label: "Branch Name", type: "string" },
        { name: "companyId", label: "Company", type: "objectId" },
        { name: "isActive", label: "Active", type: "boolean" },
        { name: "createdAt", label: "Created", type: "date" },
    ],
    key: "branch",
    path: "/branch",
    section: "HR Setup",
    singular: "Branch",
    plural: "Branches",
    description: "Sites/locations under a company (e.g. Vadodara, USA).",
    api: { search: searchBranches, getById: getBranchById, create: createBranch, update: updateBranch, remove: deleteBranch },
    lookups: { companyId: asOptions(getAllCompanies, "companyName") },
    sections: [
        { id: "details", title: "Branch details" },
        { id: "status", title: "Status" },
    ],
    fields: [
        { name: "companyId", icon: Building07, label: "Company", type: "select", required: true, section: "details", error: "Company is required!", optionsFrom: "companyId" },
        { name: "branchName", icon: MarkerPin01, label: "Branch Name", required: true, section: "details", error: "Branch Name is required!", placeholder: "Enter branch name" },
        ACTIVE,
    ],
    columns: [
        { name: "Branch Name", selector: (row) => row.branchName, minWidth: "180px" },
        { name: "Status", selector: (row) => (row.isActive ? "Active" : "Inactive"), minWidth: "130px" },
    ],
    recordTitle: (r) => r.branchName,
    toForm: (data) => ({ ...data, companyId: refId(data.companyId) }),
};

export const designationConfig = {
    filterFields: [
        { name: "designationName", label: "Designation Name", type: "string" },
        { name: "companyId", label: "Company", type: "objectId" },
        { name: "isActive", label: "Active", type: "boolean" },
        { name: "createdAt", label: "Created", type: "date" },
    ],
    key: "designation",
    path: "/designation",
    section: "HR Setup",
    singular: "Designation",
    plural: "Designations",
    description: "Job titles assignable to an employee.",
    api: { search: searchDesignations, getById: getDesignationById, create: createDesignation, update: updateDesignation, remove: deleteDesignation },
    lookups: { companyId: asOptions(getAllCompanies, "companyName") },
    sections: [
        { id: "details", title: "Designation details" },
        { id: "status", title: "Status" },
    ],
    fields: [
        { name: "companyId", icon: Building07, label: "Company", type: "select", required: true, section: "details", error: "Company is required!", optionsFrom: "companyId" },
        { name: "designationName", icon: User01, label: "Designation Name", required: true, section: "details", error: "Designation Name is required!", placeholder: "Enter designation name" },
        ACTIVE,
    ],
    columns: [
        { name: "Designation Name", selector: (row) => row.designationName, minWidth: "180px" },
        { name: "Status", selector: (row) => (row.isActive ? "Active" : "Inactive"), minWidth: "130px" },
    ],
    recordTitle: (r) => r.designationName,
    toForm: (data) => ({ ...data, companyId: refId(data.companyId) }),
};

// Reports-to needs a combined "code — name" label, unlike asOptions' single
// labelKey — a small custom loader instead of reusing that helper.
const employeeOptionsLoader = () =>
    getAllEmployees().then((res) =>
        (res.data?.data ?? []).map((x) => ({ value: x._id, label: `${x.employeeCode} — ${x.employeeName}` })));

export const employeeConfig = {
    filterFields: [
        { name: "employeeCode", label: "Employee Code", type: "string" },
        { name: "employeeName", label: "Employee Name", type: "string" },
        { name: "companyId", label: "Company", type: "objectId" },
        { name: "departmentId", label: "Department", type: "objectId" },
        { name: "designationId", label: "Designation", type: "objectId" },
        { name: "branchId", label: "Branch", type: "objectId" },
        { name: "status", label: "Status", type: "enum" },
        { name: "dateOfJoining", label: "Date of Joining", type: "date" },
        { name: "isActive", label: "Active", type: "boolean" },
        { name: "createdAt", label: "Created", type: "date" },
    ],
    key: "employee",
    path: "/employee",
    section: "HR Core",
    singular: "Employee",
    plural: "Employees",
    description: "The employee master — the hub every other HRMS record links to.",
    api: { search: searchEmployees, getById: getEmployeeById, create: createEmployee, update: updateEmployee, remove: deleteEmployee },
    lookups: {
        companyId: asOptions(getAllCompanies, "companyName"),
        departmentId: asOptions(getAllDepartments, "departmentName"),
        designationId: asOptions(getAllDesignations, "designationName"),
        branchId: asOptions(getAllBranches, "branchName"),
        reportsToId: employeeOptionsLoader,
        employmentTypeId: asOptions(getAllEmploymentTypes, "employmentTypeName"),
        gradeId: asOptions(getAllEmployeeGrades, "gradeName"),
        healthInsuranceProviderId: asOptions(getAllEmployeeHealthInsurances, "providerName"),
    },
    sections: [
        { id: "identity", title: "Identity" },
        { id: "organization", title: "Organization" },
        { id: "employment", title: "Employment" },
        { id: "other", title: "Other" },
        { id: "status", title: "Status" },
    ],
    fields: [
        { name: "employeeCode", icon: Hash02, label: "Employee Code", required: true, section: "identity", error: "Employee Code is required!", placeholder: "e.g. A005" },
        { name: "employeeName", icon: User01, label: "Employee Name", required: true, section: "identity", error: "Employee Name is required!", placeholder: "Enter employee name" },
        { name: "gender", label: "Gender", type: "select", section: "identity", options: [{ value: "Male", label: "Male" }, { value: "Female", label: "Female" }, { value: "Other", label: "Other" }] },
        { name: "dateOfBirth", label: "Date of Birth", type: "date", section: "identity" },

        { name: "companyId", icon: Building07, label: "Company", type: "select", required: true, section: "organization", error: "Company is required!", optionsFrom: "companyId" },
        { name: "departmentId", icon: Building07, label: "Department", type: "select", required: true, section: "organization", error: "Department is required!", optionsFrom: "departmentId" },
        { name: "designationId", icon: User01, label: "Designation", type: "select", required: true, section: "organization", error: "Designation is required!", optionsFrom: "designationId" },
        { name: "branchId", icon: MarkerPin01, label: "Branch", type: "select", required: true, section: "organization", error: "Branch is required!", optionsFrom: "branchId" },
        { name: "reportsToId", icon: User01, label: "Reports To", type: "select", section: "organization", optionsFrom: "reportsToId" },

        { name: "status", label: "Status", type: "select", section: "employment", options: [{ value: "Active", label: "Active" }, { value: "Inactive", label: "Inactive" }, { value: "Suspended", label: "Suspended" }, { value: "Left", label: "Left" }] },
        { name: "dateOfJoining", label: "Date of Joining", type: "date", required: true, section: "employment", error: "Date of Joining is required!" },
        { name: "relievingDate", label: "Relieving Date", type: "date", section: "employment" },
        { name: "employmentTypeId", icon: Tag01, label: "Employment Type", type: "select", section: "employment", optionsFrom: "employmentTypeId" },
        { name: "gradeId", icon: Tag01, label: "Employee Grade", type: "select", section: "employment", optionsFrom: "gradeId" },
        { name: "workMode", label: "Work Mode", type: "select", section: "employment", options: [{ value: "WFO", label: "Work From Office" }, { value: "WFH", label: "Work From Home" }] },
        { name: "shiftPreference", label: "Shift", type: "select", section: "employment", options: [{ value: "Day", label: "Day" }, { value: "Night", label: "Night" }, { value: "UK", label: "UK" }] },

        { name: "healthInsuranceProviderId", icon: Tag01, label: "Health Insurance Provider", type: "select", section: "other", optionsFrom: "healthInsuranceProviderId" },
        { name: "healthInsuranceNo", label: "Health Insurance No.", section: "other", placeholder: "Enter policy/member number" },

        ACTIVE,
    ],
    columns: [
        { name: "Employee Code", selector: (row) => row.employeeCode, minWidth: "130px" },
        { name: "Employee Name", selector: (row) => row.employeeName, minWidth: "180px" },
        { name: "Department", selector: (row) => row.departmentName ?? "—", minWidth: "160px" },
        { name: "Designation", selector: (row) => row.designationName ?? "—", minWidth: "160px" },
        { name: "Status", selector: (row) => row.status, minWidth: "120px" },
    ],
    recordTitle: (r) => `${r.employeeCode} — ${r.employeeName}`,
    toForm: (data) => ({
        ...data,
        companyId: refId(data.companyId),
        departmentId: refId(data.departmentId),
        designationId: refId(data.designationId),
        branchId: refId(data.branchId),
        reportsToId: refId(data.reportsToId),
        employmentTypeId: refId(data.employmentTypeId),
        gradeId: refId(data.gradeId),
        healthInsuranceProviderId: refId(data.healthInsuranceProviderId),
    }),
};

// ---------------------------------------------------------- Recruitment (ADR-019) --
// Interviewers/defaultInterviewers (arrays of User refs) are schema-ready but
// not exposed on these quick-entry forms — this admin has no multi-select
// field type precedent to build against yet; a known simplification, not an
// oversight.

export const jobApplicantSourceConfig = {
    filterFields: [
        { name: "sourceName", label: "Source Name", type: "string" },
        { name: "isActive", label: "Active", type: "boolean" },
        { name: "createdAt", label: "Created", type: "date" },
    ],
    key: "job-applicant-source",
    path: "/job-applicant-source",
    section: "Recruitment",
    singular: "Job Applicant Source",
    plural: "Job Applicant Sources",
    description: "Where a candidate came from (referral, job board, ...).",
    api: { search: searchJobApplicantSources, getById: getJobApplicantSourceById, create: createJobApplicantSource, update: updateJobApplicantSource, remove: deleteJobApplicantSource },
    sections: [{ id: "details", title: "Details" }, { id: "status", title: "Status" }],
    fields: [
        { name: "sourceName", icon: Link01, label: "Source Name", required: true, section: "details", error: "Source Name is required!", placeholder: "Enter source name" },
        ACTIVE,
    ],
    columns: [
        { name: "Source Name", selector: (row) => row.sourceName, minWidth: "180px" },
        { name: "Status", selector: (row) => (row.isActive ? "Active" : "Inactive"), minWidth: "130px" },
    ],
    recordTitle: (r) => r.sourceName,
};

export const interviewTypeConfig = {
    filterFields: [
        { name: "interviewTypeName", label: "Interview Type", type: "string" },
        { name: "designationId", label: "Designation", type: "objectId" },
        { name: "isActive", label: "Active", type: "boolean" },
        { name: "createdAt", label: "Created", type: "date" },
    ],
    key: "interview-type",
    path: "/interview-type",
    section: "Recruitment",
    singular: "Interview Type",
    plural: "Interview Types",
    description: "A reusable interview round definition.",
    api: { search: searchInterviewTypes, getById: getInterviewTypeById, create: createInterviewType, update: updateInterviewType, remove: deleteInterviewType },
    lookups: { designationId: asOptions(getAllDesignations, "designationName") },
    sections: [{ id: "details", title: "Details" }, { id: "status", title: "Status" }],
    fields: [
        { name: "interviewTypeName", icon: Type01, label: "Interview Type Name", required: true, section: "details", error: "Interview Type Name is required!", placeholder: "e.g. Technical Round 1" },
        { name: "designationId", icon: User01, label: "Designation", type: "select", section: "details", optionsFrom: "designationId" },
        { name: "expectedAverageRating", label: "Expected Average Rating", type: "number", section: "details", placeholder: "0-5" },
        ACTIVE,
    ],
    columns: [
        { name: "Interview Type", selector: (row) => row.interviewTypeName, minWidth: "180px" },
        { name: "Status", selector: (row) => (row.isActive ? "Active" : "Inactive"), minWidth: "130px" },
    ],
    recordTitle: (r) => r.interviewTypeName,
    toForm: (data) => ({ ...data, designationId: refId(data.designationId) }),
};

export const jobOfferTermTemplateConfig = {
    filterFields: [
        { name: "templateName", label: "Template Name", type: "string" },
        { name: "isActive", label: "Active", type: "boolean" },
        { name: "createdAt", label: "Created", type: "date" },
    ],
    key: "job-offer-term-template",
    path: "/job-offer-term-template",
    section: "Recruitment",
    singular: "Job Offer Term Template",
    plural: "Job Offer Term Templates",
    description: "A reusable set of Job Offer terms.",
    api: { search: searchJobOfferTermTemplates, getById: getJobOfferTermTemplateById, create: createJobOfferTermTemplate, update: updateJobOfferTermTemplate, remove: deleteJobOfferTermTemplate },
    sections: [{ id: "details", title: "Details" }, { id: "status", title: "Status" }],
    fields: [
        { name: "templateName", icon: Type01, label: "Template Name", required: true, section: "details", error: "Template Name is required!", placeholder: "Enter template name" },
        ACTIVE,
    ],
    columns: [
        { name: "Template Name", selector: (row) => row.templateName, minWidth: "180px" },
        { name: "Status", selector: (row) => (row.isActive ? "Active" : "Inactive"), minWidth: "130px" },
    ],
    recordTitle: (r) => r.templateName,
};

export const jobRequisitionConfig = {
    filterFields: [
        { name: "designationId", label: "Designation", type: "objectId" },
        { name: "departmentId", label: "Department", type: "objectId" },
        { name: "companyId", label: "Company", type: "objectId" },
        { name: "status", label: "Status", type: "enum" },
        { name: "requestedById", label: "Requested By", type: "objectId" },
        { name: "postingDate", label: "Posting Date", type: "date" },
        { name: "isActive", label: "Active", type: "boolean" },
        { name: "createdAt", label: "Created", type: "date" },
    ],
    key: "job-requisition",
    path: "/job-requisition",
    section: "Recruitment",
    singular: "Job Requisition",
    plural: "Job Requisitions",
    description: "A headcount request — the first stage of the hiring funnel.",
    api: { search: searchJobRequisitions, getById: getJobRequisitionById, create: createJobRequisition, update: updateJobRequisition, remove: deleteJobRequisition },
    lookups: {
        designationId: asOptions(getAllDesignations, "designationName"),
        departmentId: asOptions(getAllDepartments, "departmentName"),
        companyId: asOptions(getAllCompanies, "companyName"),
        requestedById: employeeOptionsLoader,
    },
    sections: [{ id: "details", title: "Details" }, { id: "timeline", title: "Timeline" }, { id: "status", title: "Status" }],
    fields: [
        { name: "designationId", icon: User01, label: "Designation", type: "select", required: true, section: "details", error: "Designation is required!", optionsFrom: "designationId" },
        { name: "departmentId", icon: Building07, label: "Department", type: "select", section: "details", optionsFrom: "departmentId" },
        { name: "companyId", icon: Building07, label: "Company", type: "select", required: true, section: "details", error: "Company is required!", optionsFrom: "companyId" },
        { name: "requestedById", icon: User01, label: "Requested By", type: "select", required: true, section: "details", error: "Requested By is required!", optionsFrom: "requestedById" },
        { name: "noOfPositions", icon: Hash02, label: "No. of Positions", type: "number", required: true, section: "details", error: "No. of Positions is required!" },
        { name: "expectedCompensation", label: "Expected Compensation", type: "number", required: true, section: "details", error: "Expected Compensation is required!" },
        { name: "description", label: "Job Description", type: "textarea", section: "details" },
        { name: "reasonForRequesting", label: "Reason for Requesting", type: "textarea", section: "details" },

        { name: "postingDate", label: "Posting Date", type: "date", section: "timeline" },
        { name: "expectedBy", label: "Expected By", type: "date", section: "timeline" },
        { name: "completedOn", label: "Completed On", type: "date", section: "timeline" },

        {
            name: "status", label: "Status", type: "select", section: "status",
            options: ["Pending", "Open & Approved", "Rejected", "Filled", "On Hold", "Cancelled"].map((v) => ({ value: v, label: v })),
        },
        ACTIVE,
    ],
    columns: [
        { name: "Designation", selector: (row) => row.designationName ?? "—", minWidth: "160px" },
        { name: "Company", selector: (row) => row.companyName ?? "—", minWidth: "160px" },
        { name: "Positions", selector: (row) => row.noOfPositions, minWidth: "100px" },
        { name: "Status", selector: (row) => row.status, minWidth: "140px" },
    ],
    recordTitle: (r) => `Requisition — ${r.designationName ?? r.designationId}`,
    toForm: (data) => ({
        ...data,
        designationId: refId(data.designationId), departmentId: refId(data.departmentId),
        companyId: refId(data.companyId), requestedById: refId(data.requestedById),
    }),
};

export const jobOpeningConfig = {
    filterFields: [
        { name: "jobTitle", label: "Job Title", type: "string" },
        { name: "designationId", label: "Designation", type: "objectId" },
        { name: "status", label: "Status", type: "enum" },
        { name: "companyId", label: "Company", type: "objectId" },
        { name: "departmentId", label: "Department", type: "objectId" },
        { name: "employmentTypeId", label: "Employment Type", type: "objectId" },
        { name: "branchId", label: "Location", type: "objectId" },
        { name: "publish", label: "Published", type: "boolean" },
        { name: "postedOn", label: "Posted On", type: "date" },
        { name: "isActive", label: "Active", type: "boolean" },
        { name: "createdAt", label: "Created", type: "date" },
    ],
    key: "job-opening",
    path: "/job-opening",
    section: "Recruitment",
    singular: "Job Opening",
    plural: "Job Openings",
    description: "A vacancy posting — publish it to list it on the public job board.",
    api: { search: searchJobOpenings, getById: getJobOpeningById, create: createJobOpening, update: updateJobOpening, remove: deleteJobOpening },
    lookups: {
        designationId: asOptions(getAllDesignations, "designationName"),
        companyId: asOptions(getAllCompanies, "companyName"),
        departmentId: asOptions(getAllDepartments, "departmentName"),
        employmentTypeId: asOptions(getAllEmploymentTypes, "employmentTypeName"),
        branchId: asOptions(getAllBranches, "branchName"),
    },
    sections: [{ id: "details", title: "Details" }, { id: "publishing", title: "Publishing" }, { id: "pay", title: "Pay details" }, { id: "status", title: "Status" }],
    fields: [
        { name: "jobTitle", icon: Type01, label: "Job Title", required: true, section: "details", error: "Job Title is required!", placeholder: "Enter job title" },
        { name: "designationId", icon: User01, label: "Designation", type: "select", required: true, section: "details", error: "Designation is required!", optionsFrom: "designationId" },
        { name: "companyId", icon: Building07, label: "Company", type: "select", required: true, section: "details", error: "Company is required!", optionsFrom: "companyId" },
        { name: "departmentId", icon: Building07, label: "Department", type: "select", section: "details", optionsFrom: "departmentId" },
        { name: "employmentTypeId", icon: Tag01, label: "Employment Type", type: "select", section: "details", optionsFrom: "employmentTypeId" },
        { name: "branchId", icon: MarkerPin01, label: "Location", type: "select", section: "details", optionsFrom: "branchId" },
        { name: "description", label: "Job Description", type: "textarea", section: "details" },
        {
            name: "status", label: "Status", type: "select", section: "details",
            options: [{ value: "Open", label: "Open" }, { value: "Closed", label: "Closed" }],
        },
        { name: "closesOn", label: "Closes On", type: "date", section: "details" },

        { name: "publish", label: "Publish on job board", type: "checkbox", section: "publishing" },
        { name: "preventDuplicateApplicant", label: "Prevent duplicate applications", type: "checkbox", section: "publishing" },
        { name: "publishSalaryRange", label: "Publish salary range", type: "checkbox", section: "publishing" },
        { name: "publishApplicationsReceived", label: "Publish applications-received count", type: "checkbox", section: "publishing" },

        { name: "currency", label: "Currency", section: "pay", placeholder: "e.g. USD" },
        { name: "lowerRange", label: "Lower Range", type: "number", section: "pay" },
        { name: "upperRange", label: "Upper Range", type: "number", section: "pay" },
        { name: "salaryPer", label: "Salary Per", type: "select", section: "pay", options: [{ value: "Month", label: "Month" }, { value: "Year", label: "Year" }] },

        ACTIVE,
    ],
    columns: [
        { name: "Job Title", selector: (row) => row.jobTitle, minWidth: "180px" },
        { name: "Company", selector: (row) => row.companyName ?? "—", minWidth: "150px" },
        { name: "Status", selector: (row) => row.status, minWidth: "110px" },
        { name: "Published", selector: (row) => (row.publish ? "Yes" : "No"), minWidth: "100px" },
    ],
    recordTitle: (r) => r.jobTitle,
    toForm: (data) => ({
        ...data,
        designationId: refId(data.designationId), companyId: refId(data.companyId),
        departmentId: refId(data.departmentId), employmentTypeId: refId(data.employmentTypeId),
        branchId: refId(data.branchId),
    }),
};

export const jobApplicantConfig = {
    filterFields: [
        { name: "applicantName", label: "Applicant Name", type: "string" },
        { name: "emailId", label: "Email", type: "string" },
        { name: "jobOpeningId", label: "Job Opening", type: "objectId" },
        { name: "designationId", label: "Designation", type: "objectId" },
        { name: "status", label: "Status", type: "enum" },
        { name: "sourceId", label: "Source", type: "objectId" },
        { name: "isActive", label: "Active", type: "boolean" },
        { name: "createdAt", label: "Created", type: "date" },
    ],
    key: "job-applicant",
    path: "/job-applicant",
    section: "Recruitment",
    singular: "Job Applicant",
    plural: "Job Applicants",
    description: "A candidate's application.",
    api: { search: searchJobApplicants, getById: getJobApplicantById, create: createJobApplicant, update: updateJobApplicant, remove: deleteJobApplicant },
    lookups: {
        jobOpeningId: asOptions(getAllJobOpenings, "jobTitle"),
        designationId: asOptions(getAllDesignations, "designationName"),
        sourceId: asOptions(getAllJobApplicantSources, "sourceName"),
    },
    sections: [{ id: "details", title: "Details" }, { id: "resume", title: "Resume" }, { id: "salary", title: "Salary Expectation" }, { id: "status", title: "Status" }],
    fields: [
        { name: "applicantName", icon: User01, label: "Applicant Name", section: "details", placeholder: "Auto-filled from email if left blank" },
        { name: "emailId", icon: Mail01, label: "Email Address", required: true, section: "details", error: "Email Address is required!", placeholder: "candidate@example.com" },
        { name: "phoneNumber", icon: Phone, label: "Phone Number", section: "details" },
        { name: "jobOpeningId", icon: Building07, label: "Job Opening", type: "select", section: "details", optionsFrom: "jobOpeningId" },
        { name: "designationId", icon: User01, label: "Designation", type: "select", section: "details", optionsFrom: "designationId" },
        { name: "sourceId", icon: Link01, label: "Source", type: "select", section: "details", optionsFrom: "sourceId" },
        {
            name: "status", label: "Status", type: "select", section: "status",
            options: ["Open", "Replied", "Shortlisted", "Rejected", "Hold", "Accepted"].map((v) => ({ value: v, label: v })),
        },
        { name: "applicantRating", label: "Applicant Rating", type: "number", section: "status", placeholder: "0-5" },

        { name: "resumeLink", label: "Resume Link", section: "resume", placeholder: "https://..." },
        { name: "coverLetter", label: "Cover Letter", type: "textarea", section: "resume" },
        { name: "notes", label: "Notes", type: "textarea", section: "resume" },

        { name: "currency", label: "Currency", section: "salary", placeholder: "e.g. USD" },
        { name: "lowerRange", label: "Lower Range", type: "number", section: "salary" },
        { name: "upperRange", label: "Upper Range", type: "number", section: "salary" },

        ACTIVE,
    ],
    columns: [
        { name: "Applicant Name", selector: (row) => row.applicantName, minWidth: "180px" },
        { name: "Email", selector: (row) => row.emailId, minWidth: "200px" },
        { name: "Job Opening", selector: (row) => row.jobOpeningTitle ?? "—", minWidth: "160px" },
        { name: "Status", selector: (row) => row.status, minWidth: "120px" },
    ],
    recordTitle: (r) => r.applicantName,
    toForm: (data) => ({ ...data, jobOpeningId: refId(data.jobOpeningId), designationId: refId(data.designationId), sourceId: refId(data.sourceId) }),
};

export const interviewConfig = {
    filterFields: [
        { name: "interviewTypeId", label: "Interview Type", type: "objectId" },
        { name: "jobApplicantId", label: "Job Applicant", type: "objectId" },
        { name: "designationId", label: "Designation", type: "objectId" },
        { name: "status", label: "Status", type: "enum" },
        { name: "scheduledOn", label: "Scheduled On", type: "date" },
        { name: "isActive", label: "Active", type: "boolean" },
        { name: "createdAt", label: "Created", type: "date" },
    ],
    key: "interview",
    path: "/interview",
    section: "Recruitment",
    singular: "Interview",
    plural: "Interviews",
    description: "A scheduled interview round for a candidate.",
    api: { search: searchInterviews, getById: getInterviewById, create: createInterview, update: updateInterview, remove: deleteInterview },
    lookups: {
        interviewTypeId: asOptions(getAllInterviewTypes, "interviewTypeName"),
        jobApplicantId: asOptions(getAllJobApplicants, "applicantName"),
        designationId: asOptions(getAllDesignations, "designationName"),
    },
    sections: [{ id: "details", title: "Details" }, { id: "schedule", title: "Schedule" }, { id: "status", title: "Status" }],
    fields: [
        { name: "interviewTypeId", icon: Type01, label: "Interview Type", type: "select", required: true, section: "details", error: "Interview Type is required!", optionsFrom: "interviewTypeId" },
        { name: "jobApplicantId", icon: User01, label: "Job Applicant", type: "select", required: true, section: "details", error: "Job Applicant is required!", optionsFrom: "jobApplicantId" },
        { name: "designationId", icon: User01, label: "Designation", type: "select", section: "details", optionsFrom: "designationId" },
        { name: "interviewSummary", label: "Interview Summary", type: "textarea", section: "details" },

        { name: "scheduledOn", label: "Scheduled On", type: "date", required: true, section: "schedule", error: "Scheduled On is required!" },
        { name: "fromTime", label: "From Time", required: true, section: "schedule", error: "From Time is required!", placeholder: "HH:MM" },
        { name: "toTime", label: "To Time", required: true, section: "schedule", error: "To Time is required!", placeholder: "HH:MM" },

        {
            name: "status", label: "Status", type: "select", section: "status",
            options: ["Pending", "Under Review", "Cleared", "Rejected", "Cancelled"].map((v) => ({ value: v, label: v })),
        },
        ACTIVE,
    ],
    columns: [
        { name: "Job Applicant", selector: (row) => row.jobApplicantName ?? "—", minWidth: "170px" },
        { name: "Interview Type", selector: (row) => row.interviewTypeName ?? "—", minWidth: "170px" },
        { name: "Scheduled On", selector: (row) => row.scheduledOn?.slice?.(0, 10) ?? "—", minWidth: "130px" },
        { name: "Status", selector: (row) => row.status, minWidth: "120px" },
    ],
    recordTitle: (r) => `${r.jobApplicantName ?? "Interview"} — ${r.interviewTypeName ?? ""}`,
    toForm: (data) => ({ ...data, interviewTypeId: refId(data.interviewTypeId), jobApplicantId: refId(data.jobApplicantId), designationId: refId(data.designationId) }),
};

// Interview's own list rows carry no human-readable label (jobApplicantId
// is an id, not a name) — a small custom loader instead of asOptions.
const interviewOptionsLoader = () =>
    getAllInterviews().then((res) =>
        (res.data?.data ?? []).map((x) => ({ value: x._id, label: `Interview — ${x.scheduledOn?.slice?.(0, 10) ?? ""} (${x.status})` })));

export const interviewFeedbackConfig = {
    filterFields: [
        { name: "interviewId", label: "Interview", type: "objectId" },
        { name: "interviewerId", label: "Interviewer", type: "objectId" },
        { name: "result", label: "Result", type: "enum" },
        { name: "isActive", label: "Active", type: "boolean" },
        { name: "createdAt", label: "Created", type: "date" },
    ],
    key: "interview-feedback",
    path: "/interview-feedback",
    section: "Recruitment",
    singular: "Interview Feedback",
    plural: "Interview Feedback",
    description: "A per-interviewer scorecard for one Interview.",
    api: { search: searchInterviewFeedbacks, getById: getInterviewFeedbackById, create: createInterviewFeedback, update: updateInterviewFeedback, remove: deleteInterviewFeedback },
    lookups: {
        interviewId: interviewOptionsLoader,
        interviewerId: asOptions(getAllUsers, "userName"),
    },
    sections: [{ id: "details", title: "Details" }, { id: "status", title: "Status" }],
    fields: [
        { name: "interviewId", icon: Type01, label: "Interview", type: "select", required: true, section: "details", error: "Interview is required!", optionsFrom: "interviewId" },
        { name: "interviewerId", icon: User01, label: "Interviewer", type: "select", required: true, section: "details", error: "Interviewer is required!", optionsFrom: "interviewerId" },
        {
            name: "result", label: "Result", type: "select", required: true, section: "details", error: "Result is required!",
            options: [{ value: "Cleared", label: "Cleared" }, { value: "Rejected", label: "Rejected" }],
        },
        { name: "feedback", label: "Feedback", type: "textarea", section: "details" },
        ACTIVE,
    ],
    columns: [
        { name: "Interviewer", selector: (row) => row.interviewerId, minWidth: "160px" },
        { name: "Result", selector: (row) => row.result, minWidth: "120px" },
    ],
    recordTitle: (r) => `Feedback — ${r.result ?? ""}`,
    toForm: (data) => ({ ...data, interviewId: refId(data.interviewId), interviewerId: refId(data.interviewerId) }),
};

export const jobOfferConfig = {
    filterFields: [
        { name: "jobApplicantId", label: "Job Applicant", type: "objectId" },
        { name: "companyId", label: "Company", type: "objectId" },
        { name: "designationId", label: "Designation", type: "objectId" },
        { name: "status", label: "Status", type: "enum" },
        { name: "offerDate", label: "Offer Date", type: "date" },
        { name: "isActive", label: "Active", type: "boolean" },
        { name: "createdAt", label: "Created", type: "date" },
    ],
    key: "job-offer",
    path: "/job-offer",
    section: "Recruitment",
    singular: "Job Offer",
    plural: "Job Offers",
    description: "A compensation/terms offer extended to a candidate.",
    api: { search: searchJobOffers, getById: getJobOfferById, create: createJobOffer, update: updateJobOffer, remove: deleteJobOffer },
    lookups: {
        jobApplicantId: asOptions(getAllJobApplicants, "applicantName"),
        companyId: asOptions(getAllCompanies, "companyName"),
        designationId: asOptions(getAllDesignations, "designationName"),
        jobOfferTermTemplateId: asOptions(getAllJobOfferTermTemplates, "templateName"),
    },
    sections: [{ id: "details", title: "Details" }, { id: "terms", title: "Terms" }, { id: "status", title: "Status" }],
    fields: [
        { name: "jobApplicantId", icon: User01, label: "Job Applicant", type: "select", required: true, section: "details", error: "Job Applicant is required!", optionsFrom: "jobApplicantId" },
        { name: "companyId", icon: Building07, label: "Company", type: "select", required: true, section: "details", error: "Company is required!", optionsFrom: "companyId" },
        { name: "designationId", icon: User01, label: "Designation", type: "select", section: "details", optionsFrom: "designationId" },
        { name: "offerDate", label: "Offer Date", type: "date", required: true, section: "details", error: "Offer Date is required!" },
        {
            name: "status", label: "Status", type: "select", section: "status",
            options: ["Awaiting Response", "Accepted", "Rejected", "Cancelled"].map((v) => ({ value: v, label: v })),
        },

        { name: "jobOfferTermTemplateId", icon: Type01, label: "Term Template", type: "select", section: "terms", optionsFrom: "jobOfferTermTemplateId" },
        { name: "terms", label: "Terms and Conditions", type: "textarea", section: "terms" },

        ACTIVE,
    ],
    columns: [
        { name: "Applicant", selector: (row) => row.applicantName ?? "—", minWidth: "170px" },
        { name: "Company", selector: (row) => row.companyName ?? "—", minWidth: "150px" },
        { name: "Offer Date", selector: (row) => row.offerDate?.slice?.(0, 10) ?? "—", minWidth: "120px" },
        { name: "Status", selector: (row) => row.status ?? "—", minWidth: "140px" },
    ],
    recordTitle: (r) => `Offer — ${r.applicantName ?? r.jobApplicantId}`,
    toForm: (data) => ({
        ...data, jobApplicantId: refId(data.jobApplicantId), companyId: refId(data.companyId),
        designationId: refId(data.designationId), jobOfferTermTemplateId: refId(data.jobOfferTermTemplateId),
    }),
};

// ---------------------------------------------------------------------------
// Onboarding & Separation (ADR-020). Activities/payables/receivables/assets
// are embedded arrays with no generic grid-field precedent in this admin —
// SimpleArrayField/SimpleActionButton (both new, module 4) fill that gap via
// the same `renderExtra` hook EmailTemplateMergeFields already uses.
// ---------------------------------------------------------------------------

const ACTIVITY_COLUMNS = [
    { name: "activityName", label: "Activity", type: "text" },
    { name: "description", label: "Description", type: "text" },
    { name: "status", label: "Status", type: "select", options: ["Pending", "Completed", "Cancelled"] },
    { name: "requiredForEmployeeCreation", label: "Required for hire", type: "checkbox" },
    { name: "beginOnDays", label: "Begin on (days)", type: "number" },
    { name: "durationDays", label: "Duration (days)", type: "number" },
];

export const employeeOnboardingTemplateConfig = {
    filterFields: [
        { name: "title", label: "Title", type: "string" },
        { name: "companyId", label: "Company", type: "objectId" },
        { name: "isActive", label: "Active", type: "boolean" },
        { name: "createdAt", label: "Created", type: "date" },
    ],
    key: "employee-onboarding-template",
    path: "/employee-onboarding-template",
    section: "Onboarding & Separation",
    singular: "Onboarding Template",
    plural: "Onboarding Templates",
    description: "Reusable activity checklist for onboarding a new hire.",
    api: {
        search: searchEmployeeOnboardingTemplates, getById: getEmployeeOnboardingTemplateById,
        create: createEmployeeOnboardingTemplate, update: updateEmployeeOnboardingTemplate, remove: deleteEmployeeOnboardingTemplate,
    },
    lookups: {
        companyId: asOptions(getAllCompanies, "companyName"),
        departmentId: asOptions(getAllDepartments, "departmentName"),
        designationId: asOptions(getAllDesignations, "designationName"),
        employeeGradeId: asOptions(getAllEmployeeGrades, "gradeName"),
    },
    sections: [{ id: "details", title: "Details" }, { id: "activities", title: "Activities" }, { id: "status", title: "Status" }],
    fields: [
        { name: "title", icon: Type01, label: "Title", type: "text", required: true, section: "details", error: "Title is required!" },
        { name: "companyId", icon: Building07, label: "Company", type: "select", section: "details", optionsFrom: "companyId" },
        { name: "departmentId", label: "Department", type: "select", section: "details", optionsFrom: "departmentId" },
        { name: "designationId", label: "Designation", type: "select", section: "details", optionsFrom: "designationId" },
        { name: "employeeGradeId", label: "Employee Grade", type: "select", section: "details", optionsFrom: "employeeGradeId" },
        ACTIVE,
    ],
    renderExtra: ({ values, setValues }) => (
        <SimpleArrayField
            title="Activities" description="Copied into every Employee Onboarding created from this template."
            fieldName="activities" columns={ACTIVITY_COLUMNS} values={values} setValues={setValues}
        />
    ),
    columns: [
        { name: "Title", selector: (row) => row.title, minWidth: "220px" },
        { name: "Activities", selector: (row) => row.activities?.length ?? 0, minWidth: "100px" },
    ],
    recordTitle: (r) => r.title,
    toForm: (data) => ({
        ...data, companyId: refId(data.companyId), departmentId: refId(data.departmentId),
        designationId: refId(data.designationId), employeeGradeId: refId(data.employeeGradeId),
    }),
};

export const employeeOnboardingConfig = {
    filterFields: [
        { name: "jobApplicantId", label: "Job Applicant", type: "objectId" },
        { name: "companyId", label: "Company", type: "objectId" },
        { name: "departmentId", label: "Department", type: "objectId" },
        { name: "boardingStatus", label: "Status", type: "enum" },
        { name: "dateOfJoining", label: "Date of Joining", type: "date" },
        { name: "isActive", label: "Active", type: "boolean" },
        { name: "createdAt", label: "Created", type: "date" },
    ],
    key: "employee-onboarding",
    path: "/employee-onboarding",
    section: "Onboarding & Separation",
    singular: "Employee Onboarding",
    plural: "Employee Onboardings",
    description: "Checklist-driven process for bringing a new hire to Active status.",
    api: {
        search: searchEmployeeOnboardings, getById: getEmployeeOnboardingById,
        create: createEmployeeOnboarding, update: updateEmployeeOnboarding, remove: deleteEmployeeOnboarding,
    },
    lookups: {
        jobApplicantId: asOptions(getAllJobApplicants, "applicantName"),
        jobOfferId: asOptions(getAllJobOffers, "status"),
        employeeOnboardingTemplateId: asOptions(getAllEmployeeOnboardingTemplates, "title"),
        companyId: asOptions(getAllCompanies, "companyName"),
        departmentId: asOptions(getAllDepartments, "departmentName"),
        designationId: asOptions(getAllDesignations, "designationName"),
        employeeGradeId: asOptions(getAllEmployeeGrades, "gradeName"),
    },
    sections: [{ id: "details", title: "Details" }, { id: "activities", title: "Activities" }, { id: "actions", title: "Actions" }],
    fields: [
        { name: "jobApplicantId", icon: User01, label: "Job Applicant", type: "select", required: true, section: "details", error: "Job Applicant is required!", optionsFrom: "jobApplicantId" },
        { name: "jobOfferId", label: "Job Offer", type: "select", required: true, section: "details", error: "Job Offer is required!", optionsFrom: "jobOfferId" },
        { name: "employeeOnboardingTemplateId", label: "Template", type: "select", section: "details", optionsFrom: "employeeOnboardingTemplateId" },
        { name: "companyId", icon: Building07, label: "Company", type: "select", section: "details", optionsFrom: "companyId" },
        { name: "departmentId", label: "Department", type: "select", section: "details", optionsFrom: "departmentId" },
        { name: "designationId", label: "Designation", type: "select", section: "details", optionsFrom: "designationId" },
        { name: "employeeGradeId", label: "Employee Grade", type: "select", section: "details", optionsFrom: "employeeGradeId" },
        { name: "dateOfJoining", label: "Date of Joining", type: "date", required: true, section: "details", error: "Date of Joining is required!" },
        { name: "boardingBeginsOn", label: "Onboarding Begins On", type: "date", required: true, section: "details", error: "Onboarding Begins On is required!" },
        ACTIVE,
    ],
    renderExtra: ({ mode, id, values, setValues }) => (
        <>
            <SimpleArrayField
                title="Activities" description={`Status: ${values.boardingStatus ?? "Pending"} (derived from the activities below).`}
                fieldName="activities" columns={ACTIVITY_COLUMNS} values={values} setValues={setValues}
            />
            {mode === "edit" && id && (
                <>
                    <SimpleActionButton
                        label="Mark as Completed" description="Marks every activity, and this onboarding, Completed."
                        onRun={() => markOnboardingAsCompleted(id)}
                        onResult={() => window.location.reload()}
                    />
                    <SimpleActionButton
                        label="Create Employee" description="Builds a prefilled Employee record from this onboarding (once every required activity is Completed) — review and save it on the Employee screen."
                        onRun={() => makeEmployeeFromOnboarding(id)}
                    />
                </>
            )}
        </>
    ),
    columns: [
        { name: "Applicant", selector: (row) => row.employeeName ?? "—", minWidth: "170px" },
        { name: "Status", selector: (row) => row.boardingStatus ?? "—", minWidth: "120px" },
        { name: "Date of Joining", selector: (row) => row.dateOfJoining?.slice?.(0, 10) ?? "—", minWidth: "130px" },
    ],
    recordTitle: (r) => `Onboarding — ${r.employeeName ?? r.jobApplicantId}`,
    toForm: (data) => ({
        ...data, jobApplicantId: refId(data.jobApplicantId), jobOfferId: refId(data.jobOfferId),
        employeeOnboardingTemplateId: refId(data.employeeOnboardingTemplateId), companyId: refId(data.companyId),
        departmentId: refId(data.departmentId), designationId: refId(data.designationId), employeeGradeId: refId(data.employeeGradeId),
    }),
};

export const employeeSeparationTemplateConfig = {
    filterFields: [
        { name: "title", label: "Title", type: "string" },
        { name: "companyId", label: "Company", type: "objectId" },
        { name: "isActive", label: "Active", type: "boolean" },
        { name: "createdAt", label: "Created", type: "date" },
    ],
    key: "employee-separation-template",
    path: "/employee-separation-template",
    section: "Onboarding & Separation",
    singular: "Separation Template",
    plural: "Separation Templates",
    description: "Reusable activity checklist for relieving an employee.",
    api: {
        search: searchEmployeeSeparationTemplates, getById: getEmployeeSeparationTemplateById,
        create: createEmployeeSeparationTemplate, update: updateEmployeeSeparationTemplate, remove: deleteEmployeeSeparationTemplate,
    },
    lookups: {
        companyId: asOptions(getAllCompanies, "companyName"),
        departmentId: asOptions(getAllDepartments, "departmentName"),
        designationId: asOptions(getAllDesignations, "designationName"),
        employeeGradeId: asOptions(getAllEmployeeGrades, "gradeName"),
    },
    sections: [{ id: "details", title: "Details" }, { id: "activities", title: "Activities" }, { id: "status", title: "Status" }],
    fields: [
        { name: "title", icon: Type01, label: "Title", type: "text", required: true, section: "details", error: "Title is required!" },
        { name: "companyId", icon: Building07, label: "Company", type: "select", section: "details", optionsFrom: "companyId" },
        { name: "departmentId", label: "Department", type: "select", section: "details", optionsFrom: "departmentId" },
        { name: "designationId", label: "Designation", type: "select", section: "details", optionsFrom: "designationId" },
        { name: "employeeGradeId", label: "Employee Grade", type: "select", section: "details", optionsFrom: "employeeGradeId" },
        ACTIVE,
    ],
    renderExtra: ({ values, setValues }) => (
        <SimpleArrayField
            title="Activities" description="Copied into every Employee Separation created from this template."
            fieldName="activities" columns={ACTIVITY_COLUMNS} values={values} setValues={setValues}
        />
    ),
    columns: [
        { name: "Title", selector: (row) => row.title, minWidth: "220px" },
        { name: "Activities", selector: (row) => row.activities?.length ?? 0, minWidth: "100px" },
    ],
    recordTitle: (r) => r.title,
    toForm: (data) => ({
        ...data, companyId: refId(data.companyId), departmentId: refId(data.departmentId),
        designationId: refId(data.designationId), employeeGradeId: refId(data.employeeGradeId),
    }),
};

export const employeeSeparationConfig = {
    filterFields: [
        { name: "employeeId", label: "Employee", type: "objectId" },
        { name: "boardingStatus", label: "Status", type: "enum" },
        { name: "isActive", label: "Active", type: "boolean" },
        { name: "createdAt", label: "Created", type: "date" },
    ],
    key: "employee-separation",
    path: "/employee-separation",
    section: "Onboarding & Separation",
    singular: "Employee Separation",
    plural: "Employee Separations",
    description: "Checklist-driven process for relieving an employee.",
    api: {
        search: searchEmployeeSeparations, getById: getEmployeeSeparationById,
        create: createEmployeeSeparation, update: updateEmployeeSeparation, remove: deleteEmployeeSeparation,
    },
    lookups: {
        employeeId: asOptions(getAllEmployees, "employeeName"),
        employeeSeparationTemplateId: asOptions(getAllEmployeeSeparationTemplates, "title"),
    },
    sections: [{ id: "details", title: "Details" }, { id: "activities", title: "Activities" }],
    fields: [
        { name: "employeeId", icon: User01, label: "Employee", type: "select", required: true, section: "details", error: "Employee is required!", optionsFrom: "employeeId" },
        { name: "employeeSeparationTemplateId", label: "Template", type: "select", section: "details", optionsFrom: "employeeSeparationTemplateId" },
        { name: "boardingBeginsOn", label: "Separation Begins On", type: "date", required: true, section: "details", error: "Separation Begins On is required!" },
        { name: "exitInterviewSummary", label: "Exit Interview Summary (notes only — not linked to Exit Interview records)", type: "textarea", section: "details" },
        ACTIVE,
    ],
    renderExtra: ({ values, setValues }) => (
        <SimpleArrayField
            title="Activities" description={`Status: ${values.boardingStatus ?? "Pending"} (derived from the activities below).`}
            fieldName="activities" columns={ACTIVITY_COLUMNS} values={values} setValues={setValues}
        />
    ),
    columns: [
        { name: "Employee", selector: (row) => row.employeeName ?? "—", minWidth: "170px" },
        { name: "Status", selector: (row) => row.boardingStatus ?? "—", minWidth: "120px" },
    ],
    recordTitle: (r) => `Separation — ${r.employeeName ?? r.employeeId}`,
    toForm: (data) => ({
        ...data, employeeId: refId(data.employeeId), employeeSeparationTemplateId: refId(data.employeeSeparationTemplateId),
    }),
};

export const exitInterviewConfig = {
    filterFields: [
        { name: "employeeId", label: "Employee", type: "objectId" },
        { name: "status", label: "Status", type: "enum" },
        { name: "date", label: "Date", type: "date" },
        { name: "isActive", label: "Active", type: "boolean" },
        { name: "createdAt", label: "Created", type: "date" },
    ],
    key: "exit-interview",
    path: "/exit-interview",
    section: "Onboarding & Separation",
    singular: "Exit Interview",
    plural: "Exit Interviews",
    description: "Standalone exit feedback capture — the linked Employee must have a Relieving Date set first.",
    api: {
        search: searchExitInterviews, getById: getExitInterviewById,
        create: createExitInterview, update: updateExitInterview, remove: deleteExitInterview,
    },
    lookups: {
        employeeId: asOptions(getAllEmployees, "employeeName"),
        interviewers: asOptions(getAllEmployees, "employeeName"),
    },
    sections: [{ id: "details", title: "Details" }],
    fields: [
        { name: "employeeId", icon: User01, label: "Employee", type: "select", required: true, section: "details", error: "Employee is required!", optionsFrom: "employeeId" },
        {
            name: "status", label: "Status", type: "select", section: "details",
            options: ["Pending", "Scheduled", "Completed", "Cancelled"].map((v) => ({ value: v, label: v })),
        },
        { name: "date", label: "Date", type: "date", section: "details" },
        { name: "interviewSummary", label: "Interview Summary", type: "textarea", section: "details" },
        {
            name: "employeeStatus", label: "Final Decision", type: "select", section: "details",
            options: ["Employee Retained", "Exit Confirmed"].map((v) => ({ value: v, label: v })),
        },
        ACTIVE,
    ],
    columns: [
        { name: "Employee", selector: (row) => row.employeeName ?? "—", minWidth: "170px" },
        { name: "Status", selector: (row) => row.status ?? "—", minWidth: "120px" },
        { name: "Date", selector: (row) => row.date?.slice?.(0, 10) ?? "—", minWidth: "120px" },
    ],
    recordTitle: (r) => `Exit Interview — ${r.employeeName ?? r.employeeId}`,
    toForm: (data) => ({ ...data, employeeId: refId(data.employeeId) }),
};

const OUTSTANDING_LINE_COLUMNS = [
    { name: "component", label: "Component", type: "text" },
    { name: "description", label: "Description", type: "text" },
    { name: "amount", label: "Amount", type: "number" },
    { name: "status", label: "Status", type: "select", options: ["Settled", "Unsettled"] },
];
const ASSET_COLUMNS = [
    { name: "assetName", label: "Asset", type: "text" },
    { name: "action", label: "Action", type: "select", options: ["Return", "Recover Cost"] },
    { name: "cost", label: "Cost (Recover Cost only)", type: "number" },
    { name: "status", label: "Status", type: "select", options: ["Owned", "Returned"] },
];

export const fullAndFinalStatementConfig = {
    filterFields: [
        { name: "employeeId", label: "Employee", type: "objectId" },
        { name: "companyId", label: "Company", type: "objectId" },
        { name: "status", label: "Status", type: "enum" },
        { name: "transactionDate", label: "Transaction Date", type: "date" },
        { name: "isActive", label: "Active", type: "boolean" },
        { name: "createdAt", label: "Created", type: "date" },
    ],
    key: "full-and-final-statement",
    path: "/full-and-final-statement",
    section: "Onboarding & Separation",
    singular: "Full and Final Statement",
    plural: "Full and Final Statements",
    description: "A manually entered final-settlement worksheet — not an accounting document (ADR-020). The Employee must have a Relieving Date set first.",
    api: {
        search: searchFullAndFinalStatements, getById: getFullAndFinalStatementById,
        create: createFullAndFinalStatement, update: updateFullAndFinalStatement, remove: deleteFullAndFinalStatement,
    },
    lookups: { employeeId: asOptions(getAllEmployees, "employeeName") },
    sections: [
        { id: "details", title: "Details" }, { id: "payables", title: "Payables" },
        { id: "receivables", title: "Receivables" }, { id: "assets", title: "Assets" }, { id: "actions", title: "Actions" },
    ],
    fields: [
        { name: "employeeId", icon: User01, label: "Employee", type: "select", required: true, section: "details", error: "Employee is required!", optionsFrom: "employeeId" },
        { name: "transactionDate", label: "Transaction Date", type: "date", required: true, section: "details", error: "Transaction Date is required!" },
    ],
    renderExtra: ({ mode, id, values, setValues }) => (
        <>
            <SimpleArrayField title="Payables" description={`Total payable: ${values.totalPayableAmount ?? 0}`} fieldName="payables" columns={OUTSTANDING_LINE_COLUMNS} values={values} setValues={setValues} />
            <SimpleArrayField title="Receivables" description={`Total receivable: ${values.totalReceivableAmount ?? 0} (includes asset recovery cost)`} fieldName="receivables" columns={OUTSTANDING_LINE_COLUMNS} values={values} setValues={setValues} />
            <SimpleArrayField title="Assets Allocated" description={`Total asset recovery cost: ${values.totalAssetRecoveryCost ?? 0}`} fieldName="assetsAllocated" columns={ASSET_COLUMNS} values={values} setValues={setValues} />
            {mode === "edit" && id && (
                <SimpleActionButton
                    label="Mark as Paid" description={`Status: ${values.status ?? "Unpaid"}. Blocked until every payable/receivable is Settled and every returned asset is Returned.`}
                    onRun={() => markStatementAsPaid(id)}
                    onResult={() => window.location.reload()}
                />
            )}
        </>
    ),
    columns: [
        { name: "Employee", selector: (row) => row.employeeName ?? "—", minWidth: "170px" },
        { name: "Status", selector: (row) => row.status ?? "—", minWidth: "110px" },
        { name: "Payable", selector: (row) => row.totalPayableAmount ?? 0, minWidth: "100px" },
        { name: "Receivable", selector: (row) => row.totalReceivableAmount ?? 0, minWidth: "100px" },
    ],
    recordTitle: (r) => `F&F Statement — ${r.employeeName ?? r.employeeId}`,
    toForm: (data) => ({ ...data, employeeId: refId(data.employeeId) }),
};

// ---------------------------------------------------------- HRMS module 5 (ADR-021) --

export const grievanceTypeConfig = {
    filterFields: [
        { name: "grievanceTypeName", label: "Name", type: "string" },
        { name: "isActive", label: "Active", type: "boolean" },
        { name: "createdAt", label: "Created", type: "date" },
    ],
    key: "grievance-type",
    path: "/grievance-type",
    section: "Employee Career Events",
    singular: "Grievance Type",
    plural: "Grievance Types",
    api: {
        search: searchGrievanceTypes, getById: getGrievanceTypeById,
        create: createGrievanceType, update: updateGrievanceType, remove: deleteGrievanceType,
    },
    fields: [
        { name: "grievanceTypeName", icon: Tag01, label: "Name", type: "text", required: true, section: "details", error: "Name is required!" },
        { name: "description", label: "Description", type: "textarea", section: "details" },
        ACTIVE,
    ],
    columns: [
        { name: "Name", selector: (row) => row.grievanceTypeName, minWidth: "200px" },
        { name: "Active", selector: (row) => (row.isActive ? "Yes" : "No"), minWidth: "90px" },
    ],
    recordTitle: (r) => r.grievanceTypeName,
};

export const employeeGrievanceConfig = {
    filterFields: [
        { name: "raisedByEmployeeId", label: "Raised By", type: "objectId" },
        { name: "grievanceTypeId", label: "Grievance Type", type: "objectId" },
        { name: "status", label: "Status", type: "enum" },
        { name: "date", label: "Date", type: "date" },
        { name: "isActive", label: "Active", type: "boolean" },
        { name: "createdAt", label: "Created", type: "date" },
    ],
    key: "employee-grievance",
    path: "/employee-grievance",
    section: "Employee Career Events",
    singular: "Employee Grievance",
    plural: "Employee Grievances",
    description: "Cause of Grievance is required once Investigated/Resolved; Resolved By, Resolution Date and Resolution Detail are required once Resolved.",
    api: {
        search: searchEmployeeGrievances, getById: getEmployeeGrievanceById,
        create: createEmployeeGrievance, update: updateEmployeeGrievance, remove: deleteEmployeeGrievance,
    },
    lookups: {
        raisedByEmployeeId: asOptions(getAllEmployees, "employeeName"),
        grievanceAgainstEmployeeId: asOptions(getAllEmployees, "employeeName"),
        employeeResponsibleId: asOptions(getAllEmployees, "employeeName"),
        grievanceTypeId: asOptions(getAllGrievanceTypes, "grievanceTypeName"),
    },
    sections: [{ id: "details", title: "Details" }, { id: "investigation", title: "Investigation & Resolution" }],
    fields: [
        { name: "subject", icon: Type01, label: "Subject", type: "text", required: true, section: "details", error: "Subject is required!" },
        { name: "raisedByEmployeeId", icon: User01, label: "Raised By", type: "select", required: true, section: "details", error: "Raised By is required!", optionsFrom: "raisedByEmployeeId" },
        { name: "date", label: "Date", type: "date", required: true, section: "details", error: "Date is required!" },
        { name: "status", label: "Status", type: "select", options: ["Open", "Investigated", "Resolved", "Invalid", "Cancelled"], default: "Open", section: "details" },
        { name: "grievanceTypeId", label: "Grievance Type", type: "select", required: true, section: "details", error: "Grievance Type is required!", optionsFrom: "grievanceTypeId" },
        { name: "grievanceAgainstEmployeeId", label: "Grievance Against (Employee)", type: "select", section: "details", optionsFrom: "grievanceAgainstEmployeeId" },
        { name: "grievanceAgainstText", label: "Grievance Against (free text, if not a specific employee)", type: "text", section: "details" },
        { name: "description", label: "Description", type: "textarea", required: true, section: "details", error: "Description is required!" },
        { name: "causeOfGrievance", label: "Cause of Grievance", type: "textarea", section: "investigation" },
        { name: "resolvedByUserId", label: "Resolved By (User id)", type: "text", section: "investigation" },
        { name: "resolutionDate", label: "Resolution Date", type: "date", section: "investigation" },
        { name: "resolutionDetail", label: "Resolution Detail", type: "textarea", section: "investigation" },
        { name: "employeeResponsibleId", label: "Employee Responsible", type: "select", section: "investigation", optionsFrom: "employeeResponsibleId" },
        ACTIVE,
    ],
    columns: [
        { name: "Subject", selector: (row) => row.subject, minWidth: "200px" },
        { name: "Status", selector: (row) => row.status, minWidth: "110px" },
        { name: "Date", selector: (row) => row.date?.slice?.(0, 10) ?? "—", minWidth: "110px" },
    ],
    recordTitle: (r) => r.subject,
    toForm: (data) => ({
        ...data,
        raisedByEmployeeId: refId(data.raisedByEmployeeId),
        grievanceAgainstEmployeeId: refId(data.grievanceAgainstEmployeeId),
        grievanceTypeId: refId(data.grievanceTypeId),
        employeeResponsibleId: refId(data.employeeResponsibleId),
    }),
};

const PROPERTY_CHANGE_NOTE = "Any changes you set below are applied to the Employee record and logged on creation — this record cannot be edited afterward, only deleted.";

export const employeeTransferConfig = {
    filterFields: [
        { name: "employeeId", label: "Employee", type: "objectId" },
        { name: "transferDate", label: "Transfer Date", type: "date" },
        { name: "isActive", label: "Active", type: "boolean" },
        { name: "createdAt", label: "Created", type: "date" },
    ],
    key: "employee-transfer",
    path: "/employee-transfer",
    section: "Employee Career Events",
    singular: "Employee Transfer",
    plural: "Employee Transfers",
    description: `Only Active employees can be transferred. Same-company only — inter-company transfer is not supported. ${PROPERTY_CHANGE_NOTE}`,
    api: {
        search: searchEmployeeTransfers, getById: getEmployeeTransferById,
        create: createEmployeeTransfer, remove: deleteEmployeeTransfer,
    },
    lookups: {
        employeeId: asOptions(getAllEmployees, "employeeName"),
        newDepartmentId: asOptions(getAllDepartments, "departmentName"),
        newDesignationId: asOptions(getAllDesignations, "designationName"),
        newBranchId: asOptions(getAllBranches, "branchName"),
    },
    fields: [
        { name: "employeeId", icon: User01, label: "Employee", type: "select", required: true, section: "details", error: "Employee is required!", optionsFrom: "employeeId" },
        { name: "transferDate", label: "Transfer Date", type: "date", required: true, section: "details", error: "Transfer Date is required!" },
        { name: "newDepartmentId", label: "New Department", type: "select", section: "details", optionsFrom: "newDepartmentId" },
        { name: "newDesignationId", label: "New Designation", type: "select", section: "details", optionsFrom: "newDesignationId" },
        { name: "newBranchId", label: "New Branch", type: "select", section: "details", optionsFrom: "newBranchId" },
        ACTIVE,
    ],
    columns: [
        { name: "Transfer Date", selector: (row) => row.transferDate?.slice?.(0, 10) ?? "—", minWidth: "130px" },
    ],
    recordTitle: (r) => `Transfer — ${r._id}`,
    toForm: (data) => ({ ...data, employeeId: refId(data.employeeId) }),
};

export const employeePromotionConfig = {
    filterFields: [
        { name: "employeeId", label: "Employee", type: "objectId" },
        { name: "promotionDate", label: "Promotion Date", type: "date" },
        { name: "isActive", label: "Active", type: "boolean" },
        { name: "createdAt", label: "Created", type: "date" },
    ],
    key: "employee-promotion",
    path: "/employee-promotion",
    section: "Employee Career Events",
    singular: "Employee Promotion",
    plural: "Employee Promotions",
    description: `Blocked for Inactive employees. Current CTC is fetched from the Employee once, and never overwritten by a later fetch once entered. ${PROPERTY_CHANGE_NOTE}`,
    api: {
        search: searchEmployeePromotions, getById: getEmployeePromotionById,
        create: createEmployeePromotion, remove: deleteEmployeePromotion,
    },
    lookups: {
        employeeId: asOptions(getAllEmployees, "employeeName"),
        newDepartmentId: asOptions(getAllDepartments, "departmentName"),
        newDesignationId: asOptions(getAllDesignations, "designationName"),
        newGradeId: asOptions(getAllEmployeeGrades, "gradeName"),
    },
    fields: [
        { name: "employeeId", icon: User01, label: "Employee", type: "select", required: true, section: "details", error: "Employee is required!", optionsFrom: "employeeId" },
        { name: "promotionDate", label: "Promotion Date", type: "date", required: true, section: "details", error: "Promotion Date is required!" },
        { name: "newDepartmentId", label: "New Department", type: "select", section: "details", optionsFrom: "newDepartmentId" },
        { name: "newDesignationId", label: "New Designation", type: "select", section: "details", optionsFrom: "newDesignationId" },
        { name: "newGradeId", label: "New Grade", type: "select", section: "details", optionsFrom: "newGradeId" },
        { name: "currentCtc", label: "Current CTC (leave blank to fetch from Employee)", type: "number", section: "details" },
        { name: "revisedCtc", label: "Revised CTC", type: "number", section: "details" },
        ACTIVE,
    ],
    columns: [
        { name: "Promotion Date", selector: (row) => row.promotionDate?.slice?.(0, 10) ?? "—", minWidth: "130px" },
        { name: "Revised CTC", selector: (row) => row.revisedCtc ?? "—", minWidth: "110px" },
    ],
    recordTitle: (r) => `Promotion — ${r._id}`,
    toForm: (data) => ({ ...data, employeeId: refId(data.employeeId) }),
};

export const employeeReferralConfig = {
    filterFields: [
        { name: "status", label: "Status", type: "enum" },
        { name: "referrerId", label: "Referrer", type: "objectId" },
        { name: "forDesignationId", label: "For Designation", type: "objectId" },
        { name: "date", label: "Date", type: "date" },
        { name: "isActive", label: "Active", type: "boolean" },
        { name: "createdAt", label: "Created", type: "date" },
    ],
    key: "employee-referral",
    path: "/employee-referral",
    section: "Employee Career Events",
    singular: "Employee Referral",
    plural: "Employee Referrals",
    api: {
        search: searchEmployeeReferrals, getById: getEmployeeReferralById,
        create: createEmployeeReferral, update: updateEmployeeReferral, remove: deleteEmployeeReferral,
    },
    lookups: {
        referrerId: asOptions(getAllEmployees, "employeeName"),
        forDesignationId: asOptions(getAllDesignations, "designationName"),
    },
    sections: [{ id: "details", title: "Details" }, { id: "actions", title: "Actions" }],
    fields: [
        { name: "firstName", icon: User01, label: "First Name", type: "text", required: true, section: "details", error: "First Name is required!" },
        { name: "lastName", label: "Last Name", type: "text", required: true, section: "details", error: "Last Name is required!" },
        { name: "email", icon: Mail01, label: "Email", type: "text", required: true, section: "details", error: "Email is required!", validate: (v) => (isValidEmail(v) ? undefined : "Enter a valid email") },
        { name: "contactNo", icon: Phone, label: "Contact No.", type: "text", section: "details" },
        { name: "currentEmployer", label: "Current Employer", type: "text", section: "details" },
        { name: "currentJobTitle", label: "Current Job Title", type: "text", section: "details" },
        { name: "date", label: "Date", type: "date", required: true, section: "details", error: "Date is required!" },
        { name: "status", label: "Status", type: "select", options: ["Pending", "In Process", "Accepted", "Rejected", "Cancelled"], default: "Pending", section: "details" },
        { name: "forDesignationId", label: "For Designation", type: "select", required: true, section: "details", error: "Designation is required!", optionsFrom: "forDesignationId" },
        { name: "referrerId", label: "Referrer", type: "select", required: true, section: "details", error: "Referrer is required!", optionsFrom: "referrerId" },
        { name: "resumeLink", label: "Resume Link", type: "text", section: "details" },
        { name: "workReferences", label: "Work References", type: "textarea", section: "details" },
        { name: "qualificationReason", label: "Why is this candidate qualified?", type: "textarea", section: "details" },
        { name: "isApplicableForReferralBonus", label: "Applicable for Referral Bonus", type: "checkbox", default: true, section: "details" },
        ACTIVE,
    ],
    renderExtra: ({ mode, id, values }) => (
        mode === "edit" && id && (
            <SimpleActionButton
                label="Create Job Applicant" description={`Status: ${values.status ?? "Pending"}. Creates a real Job Applicant from this referral and sets this record to In Process.`}
                onRun={() => createJobApplicantFromReferral(id)}
                onResult={() => window.location.reload()}
            />
        )
    ),
    columns: [
        { name: "Name", selector: (row) => row.fullName ?? `${row.firstName} ${row.lastName}`, minWidth: "170px" },
        { name: "Status", selector: (row) => row.status, minWidth: "110px" },
        { name: "Email", selector: (row) => row.email, minWidth: "180px" },
    ],
    recordTitle: (r) => r.fullName ?? `${r.firstName} ${r.lastName}`,
    toForm: (data) => ({ ...data, referrerId: refId(data.referrerId), forDesignationId: refId(data.forDesignationId) }),
};

const STAFFING_DETAIL_COLUMNS = [
    { name: "designationId", label: "Designation (id)", type: "text" },
    { name: "vacancies", label: "Vacancies", type: "number" },
    { name: "estimatedCostPerPosition", label: "Est. Cost / Position", type: "number" },
];

export const staffingPlanConfig = {
    filterFields: [
        { name: "companyId", label: "Company", type: "objectId" },
        { name: "departmentId", label: "Department", type: "objectId" },
        { name: "fromDate", label: "From Date", type: "date" },
        { name: "toDate", label: "To Date", type: "date" },
        { name: "isActive", label: "Active", type: "boolean" },
        { name: "createdAt", label: "Created", type: "date" },
    ],
    key: "staffing-plan",
    path: "/staffing-plan",
    section: "Employee Career Events",
    singular: "Staffing Plan",
    plural: "Staffing Plans",
    description: "Blocks a second active plan for the same company + designation in an overlapping date range. Designation rows use the Designation's id (no company-hierarchy validation — this project's companies are a flat list, not a tree, per ADR-021).",
    api: {
        search: searchStaffingPlans, getById: getStaffingPlanById,
        create: createStaffingPlan, update: updateStaffingPlan, remove: deleteStaffingPlan,
    },
    lookups: {
        companyId: asOptions(getAllCompanies, "companyName"),
        departmentId: asOptions(getAllDepartments, "departmentName"),
    },
    fields: [
        { name: "companyId", icon: Building07, label: "Company", type: "select", required: true, section: "details", error: "Company is required!", optionsFrom: "companyId" },
        { name: "departmentId", label: "Department", type: "select", section: "details", optionsFrom: "departmentId" },
        { name: "fromDate", label: "From Date", type: "date", required: true, section: "details", error: "From Date is required!" },
        { name: "toDate", label: "To Date", type: "date", required: true, section: "details", error: "To Date is required!" },
        ACTIVE,
    ],
    renderExtra: ({ values, setValues }) => (
        <SimpleArrayField
            title="Staffing Details" description={`Total estimated budget: ${values.totalEstimatedBudget ?? 0}. Paste a Designation's id into each row — current count/openings/positions/cost are computed on save.`}
            fieldName="staffingDetails" columns={STAFFING_DETAIL_COLUMNS} values={values} setValues={setValues}
        />
    ),
    columns: [
        { name: "From", selector: (row) => row.fromDate?.slice?.(0, 10) ?? "—", minWidth: "110px" },
        { name: "To", selector: (row) => row.toDate?.slice?.(0, 10) ?? "—", minWidth: "110px" },
        { name: "Budget", selector: (row) => row.totalEstimatedBudget ?? 0, minWidth: "110px" },
    ],
    recordTitle: (r) => `Staffing Plan — ${r._id}`,
    toForm: (data) => ({ ...data, companyId: refId(data.companyId), departmentId: refId(data.departmentId) }),
};

// ---------------------------------------------------------------------------
// Training & Skills (ADR-022). Training Result folds into TrainingEvent's
// own `employees[]` rows — markCompleted/markScheduled reproduce source's
// real on_update_after_submit cascade explicitly (no docstatus to trigger
// it). Designation/InterviewType/InterviewFeedback's Skill-ref retrofits
// (own commit) aren't given form fields here — no multi-select precedent in
// this admin beyond SimpleArrayField's row editor, which doesn't fit a bare
// ref array; left API-only, a follow-up if a screen actually needs it.
// ---------------------------------------------------------------------------

const TRAINING_EVENT_ATTENDEE_COLUMNS = [
    { name: "employeeId", label: "Employee id", type: "text" },
    { name: "isMandatory", label: "Mandatory", type: "checkbox" },
    { name: "attendance", label: "Attendance", type: "select", options: ["Present", "Absent"] },
    { name: "status", label: "Status", type: "select", options: ["Open", "Completed", "Feedback Submitted"] },
    { name: "hours", label: "Hours", type: "number" },
    { name: "grade", label: "Grade", type: "text" },
    { name: "comments", label: "Comments", type: "text" },
];

export const trainingProgramConfig = {
    filterFields: [
        { name: "trainingProgramName", label: "Name", type: "string" },
        { name: "companyId", label: "Company", type: "objectId" },
        { name: "status", label: "Status", type: "enum" },
        { name: "isActive", label: "Active", type: "boolean" },
        { name: "createdAt", label: "Created", type: "date" },
    ],
    key: "training-program",
    path: "/training-program",
    section: "Training & Skills",
    singular: "Training Program",
    plural: "Training Programs",
    api: {
        search: searchTrainingPrograms, getById: getTrainingProgramById,
        create: createTrainingProgram, update: updateTrainingProgram, remove: deleteTrainingProgram,
    },
    lookups: { companyId: asOptions(getAllCompanies, "companyName") },
    fields: [
        { name: "trainingProgramName", icon: Tag01, label: "Training Program Name", type: "string", required: true, section: "details", error: "Training Program Name is required!" },
        { name: "companyId", icon: Building07, label: "Company", type: "select", required: true, section: "details", error: "Company is required!", optionsFrom: "companyId" },
        { name: "status", label: "Status", type: "select", section: "details", options: ["Scheduled", "Completed", "Cancelled"] },
        { name: "trainerName", label: "Trainer Name", type: "string", section: "details" },
        { name: "trainerEmail", label: "Trainer Email", type: "string", section: "details" },
        { name: "supplierName", label: "Supplier", type: "string", section: "details" },
        { name: "contactNumber", label: "Contact Number", type: "string", section: "details" },
        { name: "description", label: "Description", type: "textarea", required: true, section: "details", error: "Description is required!" },
        ACTIVE,
    ],
    columns: [
        { name: "Name", selector: (row) => row.trainingProgramName, minWidth: "220px" },
        { name: "Status", selector: (row) => row.status, minWidth: "120px" },
    ],
    recordTitle: (r) => r.trainingProgramName,
    toForm: (data) => ({ ...data, companyId: refId(data.companyId) }),
};

export const trainingEventConfig = {
    filterFields: [
        { name: "eventName", label: "Event Name", type: "string" },
        { name: "eventStatus", label: "Status", type: "enum" },
        { name: "type", label: "Type", type: "enum" },
        { name: "companyId", label: "Company", type: "objectId" },
        { name: "trainingProgramId", label: "Training Program", type: "objectId" },
        { name: "isActive", label: "Active", type: "boolean" },
        { name: "createdAt", label: "Created", type: "date" },
    ],
    key: "training-event",
    path: "/training-event",
    section: "Training & Skills",
    singular: "Training Event",
    plural: "Training Events",
    description: "Attendee scoring (attendance/hours/grade/comments) lives on each row below, folding in what source calls Training Result.",
    api: {
        search: searchTrainingEvents, getById: getTrainingEventById,
        create: createTrainingEvent, update: updateTrainingEvent, remove: deleteTrainingEvent,
    },
    lookups: {
        companyId: asOptions(getAllCompanies, "companyName"),
        trainingProgramId: asOptions(getAllTrainingPrograms, "trainingProgramName"),
    },
    fields: [
        { name: "eventName", icon: Tag01, label: "Event Name", type: "string", required: true, section: "details", error: "Event Name is required!" },
        { name: "trainingProgramId", label: "Training Program", type: "select", section: "details", optionsFrom: "trainingProgramId" },
        { name: "eventStatus", label: "Status", type: "select", section: "details", options: ["Scheduled", "Completed", "Cancelled"] },
        { name: "type", label: "Type", type: "select", required: true, section: "details", error: "Type is required!", options: ["Seminar", "Theory", "Workshop", "Conference", "Exam", "Internet", "Self-Study"] },
        { name: "level", label: "Level", type: "select", section: "details", options: ["Beginner", "Intermediate", "Advance"] },
        { name: "companyId", icon: Building07, label: "Company", type: "select", section: "details", optionsFrom: "companyId" },
        { name: "trainerName", label: "Trainer Name", type: "string", section: "details" },
        { name: "trainerEmail", label: "Trainer Email", type: "string", section: "details" },
        { name: "supplierName", label: "Supplier", type: "string", section: "details" },
        { name: "contactNumber", label: "Contact Number", type: "string", section: "details" },
        { name: "course", label: "Course", type: "string", section: "details" },
        { name: "location", label: "Location", type: "string", required: true, section: "details", error: "Location is required!" },
        { name: "startTime", label: "Start Time", type: "datetime-local", required: true, section: "details", error: "Start Time is required!" },
        { name: "endTime", label: "End Time", type: "datetime-local", required: true, section: "details", error: "End Time is required!" },
        { name: "introduction", label: "Introduction", type: "textarea", required: true, section: "details", error: "Introduction is required!" },
        ACTIVE,
    ],
    sections: [{ id: "details", title: "Details" }, { id: "attendees", title: "Attendees" }, { id: "actions", title: "Actions" }],
    renderExtra: ({ mode, id, values, setValues }) => (
        <>
            <SimpleArrayField
                title="Attendees" description="Paste an Employee's id into each row."
                fieldName="employees" columns={TRAINING_EVENT_ATTENDEE_COLUMNS} values={values} setValues={setValues}
            />
            {mode === "edit" && id && (
                <>
                    <SimpleActionButton
                        label="Mark as Completed" description="Present, not-yet-feedback-submitted attendees move to Completed; the event moves to Completed."
                        onRun={() => markTrainingEventCompleted(id)}
                        onResult={() => window.location.reload()}
                    />
                    <SimpleActionButton
                        label="Reopen as Scheduled" description="Resets every attendee row to Open; the event moves back to Scheduled."
                        onRun={() => markTrainingEventScheduled(id)}
                        onResult={() => window.location.reload()}
                    />
                </>
            )}
        </>
    ),
    columns: [
        { name: "Event", selector: (row) => row.eventName, minWidth: "200px" },
        { name: "Status", selector: (row) => row.eventStatus, minWidth: "120px" },
        { name: "Type", selector: (row) => row.type, minWidth: "120px" },
    ],
    recordTitle: (r) => r.eventName,
    toForm: (data) => ({ ...data, companyId: refId(data.companyId), trainingProgramId: refId(data.trainingProgramId) }),
};

export const trainingFeedbackConfig = {
    filterFields: [
        { name: "employeeId", label: "Employee", type: "objectId" },
        { name: "trainingEventId", label: "Training Event", type: "objectId" },
        { name: "isActive", label: "Active", type: "boolean" },
        { name: "createdAt", label: "Created", type: "date" },
    ],
    key: "training-feedback",
    path: "/training-feedback",
    section: "Training & Skills",
    singular: "Training Feedback",
    plural: "Training Feedback",
    description: "Only allowed once the Training Event is Completed, the employee was an attendee, and they weren't marked Absent.",
    api: {
        search: searchTrainingFeedbacks, getById: getTrainingFeedbackById,
        create: createTrainingFeedback, remove: deleteTrainingFeedback,
    },
    lookups: {
        employeeId: asOptions(getAllEmployees, "employeeName"),
        trainingEventId: asOptions(getAllTrainingEvents, "eventName"),
    },
    fields: [
        { name: "employeeId", icon: User01, label: "Employee", type: "select", required: true, section: "details", error: "Employee is required!", optionsFrom: "employeeId" },
        { name: "trainingEventId", label: "Training Event", type: "select", required: true, section: "details", error: "Training Event is required!", optionsFrom: "trainingEventId" },
        { name: "feedback", label: "Feedback", type: "textarea", required: true, section: "details", error: "Feedback is required!" },
        ACTIVE,
    ],
    columns: [
        { name: "Employee", selector: (row) => row.employeeId, minWidth: "180px" },
        { name: "Training Event", selector: (row) => row.trainingEventId, minWidth: "180px" },
    ],
    recordTitle: (r) => `Training Feedback — ${r._id}`,
    toForm: (data) => ({ ...data, employeeId: refId(data.employeeId), trainingEventId: refId(data.trainingEventId) }),
};

export const skillConfig = {
    filterFields: [
        { name: "skillName", label: "Skill Name", type: "string" },
        { name: "isActive", label: "Active", type: "boolean" },
        { name: "createdAt", label: "Created", type: "date" },
    ],
    key: "skill",
    path: "/skill",
    section: "Training & Skills",
    singular: "Skill",
    plural: "Skills",
    api: {
        search: searchSkills, getById: getSkillById,
        create: createSkill, update: updateSkill, remove: deleteSkill,
    },
    fields: [
        { name: "skillName", icon: Tag01, label: "Skill Name", type: "string", required: true, section: "details", error: "Skill Name is required!" },
        { name: "description", label: "Description", type: "textarea", section: "details" },
        ACTIVE,
    ],
    columns: [{ name: "Skill", selector: (row) => row.skillName, minWidth: "220px" }],
    recordTitle: (r) => r.skillName,
};

export const employeeSkillMapConfig = {
    filterFields: [
        { name: "employeeId", label: "Employee", type: "objectId" },
        { name: "isActive", label: "Active", type: "boolean" },
        { name: "createdAt", label: "Created", type: "date" },
    ],
    key: "employee-skill-map",
    path: "/employee-skill-map",
    section: "Training & Skills",
    singular: "Employee Skill Map",
    plural: "Employee Skill Maps",
    api: {
        search: searchEmployeeSkillMaps, getById: getEmployeeSkillMapById,
        create: createEmployeeSkillMap, update: updateEmployeeSkillMap, remove: deleteEmployeeSkillMap,
    },
    lookups: { employeeId: asOptions(getAllEmployees, "employeeName") },
    fields: [
        { name: "employeeId", icon: User01, label: "Employee", type: "select", required: true, section: "details", error: "Employee is required!", optionsFrom: "employeeId" },
        ACTIVE,
    ],
    sections: [{ id: "details", title: "Details" }, { id: "skills", title: "Skills" }, { id: "actions", title: "Actions" }],
    renderExtra: ({ mode, id, values, setValues }) => (
        <>
            <SimpleArrayField
                title="Employee Skills" description="Paste a Skill's id into each row; proficiency is 1-5."
                fieldName="employeeSkills"
                columns={[
                    { name: "skillId", label: "Skill id", type: "text" },
                    { name: "proficiency", label: "Proficiency (1-5)", type: "number" },
                ]}
                values={values} setValues={setValues}
            />
            {mode === "edit" && id && (
                <SimpleActionButton
                    label="Populate from Designation" description="Clears and repopulates skills from the Employee's Designation's skill list."
                    onRun={() => populateEmployeeSkillMapFromDesignation(id)}
                    onResult={() => window.location.reload()}
                />
            )}
        </>
    ),
    columns: [{ name: "Employee", selector: (row) => row.employeeId, minWidth: "220px" }],
    recordTitle: (r) => `Employee Skill Map — ${r._id}`,
    toForm: (data) => ({ ...data, employeeId: refId(data.employeeId) }),
};

// ---------------------------------------------------------------------------
// Travel (ADR-023). Two one-field masters (ADMIN-only per RoleMaster — no
// grants seeded for either, matching source's own literal permission table)
// plus Travel Request, whose itinerary/costings arrays reuse SimpleArrayField
// the same way modules 4-6 do. No rollup total and no date-order validation
// here on purpose — source has neither; see DECISIONS.md ADR-023.
// ---------------------------------------------------------------------------

const TRAVEL_ITINERARY_COLUMNS = [
    { name: "travelFrom", label: "From", type: "text" },
    { name: "travelTo", label: "To", type: "text" },
    { name: "modeOfTravel", label: "Mode", type: "select", options: ["Flight", "Train", "Taxi", "Rented Car"] },
    { name: "mealPreference", label: "Meal Preference", type: "select", options: ["Vegetarian", "Non-Vegetarian", "Gluten Free", "Non Diary"] },
    { name: "travelAdvanceRequired", label: "Advance Required", type: "checkbox" },
    { name: "advanceAmount", label: "Advance Amount", type: "number" },
    { name: "departureDate", label: "Departure Date", type: "date" },
    { name: "arrivalDate", label: "Arrival Date", type: "date" },
    { name: "lodgingRequired", label: "Lodging Required", type: "checkbox" },
    { name: "preferredAreaForLodging", label: "Preferred Area for Lodging", type: "text" },
    { name: "checkInDate", label: "Check-in Date", type: "date" },
    { name: "checkOutDate", label: "Check-out Date", type: "date" },
    { name: "otherDetails", label: "Other Details", type: "text" },
];

const TRAVEL_COSTING_COLUMNS = [
    { name: "expenseType", label: "Expense Type", type: "text" },
    { name: "sponsoredAmount", label: "Sponsored Amount", type: "number" },
    { name: "fundedAmount", label: "Funded Amount", type: "number" },
    { name: "totalAmount", label: "Total Amount", type: "number" },
    { name: "comments", label: "Comments", type: "text" },
];

export const purposeOfTravelConfig = {
    filterFields: [
        { name: "purposeOfTravelName", label: "Name", type: "string" },
        { name: "isActive", label: "Active", type: "boolean" },
        { name: "createdAt", label: "Created", type: "date" },
    ],
    key: "purpose-of-travel",
    path: "/purpose-of-travel",
    section: "Travel",
    singular: "Purpose of Travel",
    plural: "Purposes of Travel",
    api: {
        search: searchPurposeOfTravels, getById: getPurposeOfTravelById,
        create: createPurposeOfTravel, update: updatePurposeOfTravel, remove: deletePurposeOfTravel,
    },
    fields: [
        { name: "purposeOfTravelName", icon: Tag01, label: "Purpose of Travel Name", type: "string", required: true, section: "details", error: "Purpose of Travel Name is required!" },
        ACTIVE,
    ],
    columns: [{ name: "Name", selector: (row) => row.purposeOfTravelName, minWidth: "220px" }],
    recordTitle: (r) => r.purposeOfTravelName,
};

export const identificationDocumentTypeConfig = {
    filterFields: [
        { name: "identificationDocumentTypeName", label: "Name", type: "string" },
        { name: "isActive", label: "Active", type: "boolean" },
        { name: "createdAt", label: "Created", type: "date" },
    ],
    key: "identification-document-type",
    path: "/identification-document-type",
    section: "Travel",
    singular: "Identification Document Type",
    plural: "Identification Document Types",
    api: {
        search: searchIdentificationDocumentTypes, getById: getIdentificationDocumentTypeById,
        create: createIdentificationDocumentType, update: updateIdentificationDocumentType, remove: deleteIdentificationDocumentType,
    },
    fields: [
        { name: "identificationDocumentTypeName", icon: Tag01, label: "Identification Document Type Name", type: "string", required: true, section: "details", error: "Identification Document Type Name is required!" },
        ACTIVE,
    ],
    columns: [{ name: "Name", selector: (row) => row.identificationDocumentTypeName, minWidth: "220px" }],
    recordTitle: (r) => r.identificationDocumentTypeName,
};

export const travelRequestConfig = {
    filterFields: [
        { name: "employeeId", label: "Employee", type: "objectId" },
        { name: "travelType", label: "Travel Type", type: "string" },
        { name: "status", label: "Status", type: "string" },
        { name: "companyId", label: "Company", type: "objectId" },
        { name: "createdAt", label: "Created", type: "date" },
    ],
    key: "travel-request",
    path: "/travel-request",
    section: "Travel",
    singular: "Travel Request",
    plural: "Travel Requests",
    description: "Total Amount is not auto-summed from Sponsored/Funded — source has no rollup formula despite the field names.",
    api: {
        search: searchTravelRequests, getById: getTravelRequestById,
        create: createTravelRequest, update: updateTravelRequest, remove: deleteTravelRequest,
    },
    lookups: {
        employeeId: asOptions(getAllEmployees, "employeeName"),
        purposeOfTravelId: asOptions(getAllPurposeOfTravels, "purposeOfTravelName"),
        personalIdTypeId: asOptions(getAllIdentificationDocumentTypes, "identificationDocumentTypeName"),
        companyId: asOptions(getAllCompanies, "companyName"),
    },
    fields: [
        { name: "employeeId", icon: User01, label: "Employee", type: "select", required: true, section: "details", error: "Employee is required!", optionsFrom: "employeeId" },
        { name: "travelType", label: "Travel Type", type: "select", required: true, section: "details", error: "Travel Type is required!", options: ["Domestic", "International"] },
        { name: "travelFunding", label: "Travel Funding", type: "select", section: "details", options: ["Require Full Funding", "Fully Sponsored", "Partially Sponsored, Require Partial Funding"] },
        { name: "purposeOfTravelId", label: "Purpose of Travel", type: "select", required: true, section: "details", error: "Purpose of Travel is required!", optionsFrom: "purposeOfTravelId" },
        { name: "detailsOfSponsor", label: "Details of Sponsor", type: "string", section: "details" },
        { name: "description", label: "Description", type: "textarea", section: "details" },
        { name: "personalIdTypeId", label: "Identification Document Type", type: "select", section: "details", optionsFrom: "personalIdTypeId" },
        { name: "personalIdNumber", label: "Personal ID Number", type: "string", section: "details" },
        { name: "companyId", icon: Building07, label: "Company", type: "select", section: "details", optionsFrom: "companyId" },
        { name: "status", label: "Status", type: "select", section: "details", options: ["Draft", "Submitted", "Cancelled"] },
        ACTIVE,
    ],
    sections: [{ id: "details", title: "Details" }, { id: "itinerary", title: "Itinerary" }, { id: "costings", title: "Costings" }],
    renderExtra: ({ values, setValues }) => (
        <>
            <SimpleArrayField
                title="Itinerary" description="One row per travel leg."
                fieldName="itinerary" columns={TRAVEL_ITINERARY_COLUMNS} values={values} setValues={setValues}
            />
            <SimpleArrayField
                title="Costings" description="Total Amount is entered manually, not computed."
                fieldName="costings" columns={TRAVEL_COSTING_COLUMNS} values={values} setValues={setValues}
            />
        </>
    ),
    columns: [
        { name: "Employee", selector: (row) => row.employeeName || row.employeeId, minWidth: "200px" },
        { name: "Type", selector: (row) => row.travelType, minWidth: "120px" },
        { name: "Status", selector: (row) => row.status, minWidth: "120px" },
    ],
    recordTitle: (r) => `Travel Request — ${r._id}`,
    toForm: (data) => ({
        ...data,
        employeeId: refId(data.employeeId),
        purposeOfTravelId: refId(data.purposeOfTravelId),
        personalIdTypeId: refId(data.personalIdTypeId),
        companyId: refId(data.companyId),
    }),
};

// ---------------------------------------------------------------------------
// Leaves foundation (ADR-024, HRMS module 8). LeaveAdjustment/
// CompensatoryLeaveRequest/LeaveApplication/LeaveEncashment/LeaveBlockList/
// Leave Control Panel are the second fork's work, stacked on this branch.
// LeaveLedgerEntry has no screen here — read-only/system-written, a custom
// page (pages/Leaves/LeaveLedgerEntries.jsx), same reasoning as AuditLog.
// ---------------------------------------------------------------------------

const HOLIDAY_COLUMNS = [
    { name: "holidayDate", label: "Holiday Date (YYYY-MM-DD)", type: "text" },
    { name: "description", label: "Description", type: "text" },
    { name: "weeklyOff", label: "Weekly Off", type: "checkbox" },
];

const LEAVE_POLICY_DETAIL_COLUMNS = [
    { name: "leaveTypeId", label: "Leave Type (id)", type: "text" },
    { name: "annualAllocation", label: "Annual Allocation", type: "number" },
];

export const leaveTypeConfig = {
    filterFields: [
        { name: "leaveTypeName", label: "Name", type: "string" },
        { name: "isLwp", label: "Leave Without Pay", type: "boolean" },
        { name: "isEarnedLeave", label: "Earned Leave", type: "boolean" },
        { name: "isCompensatory", label: "Compensatory", type: "boolean" },
        { name: "isActive", label: "Active", type: "boolean" },
        { name: "createdAt", label: "Created", type: "date" },
    ],
    key: "leave-type",
    path: "/leave-type",
    section: "Leaves",
    singular: "Leave Type",
    plural: "Leave Types",
    description: "A category of leave (Casual, Sick, Earned, ...) and its rules — paid/unpaid, carry-forward, encashment, earned-leave accrual.",
    api: { search: searchLeaveTypes, getById: getLeaveTypeById, create: createLeaveType, update: updateLeaveType, remove: deleteLeaveType },
    sections: [
        { id: "details", title: "Details" },
        { id: "carryForward", title: "Carry Forward" },
        { id: "encashment", title: "Encashment" },
        { id: "earnedLeave", title: "Earned Leave" },
        { id: "limits", title: "Limits" },
        { id: "status", title: "Status" },
    ],
    fields: [
        { name: "leaveTypeName", icon: Tag01, label: "Leave Type Name", required: true, section: "details", error: "Leave Type Name is required!" },
        { name: "isCompensatory", label: "Is Compensatory", type: "checkbox", section: "details" },
        { name: "isLwp", label: "Is Leave Without Pay", type: "checkbox", section: "details" },
        { name: "isPpl", label: "Is Partially Paid Leave", type: "checkbox", section: "details" },
        { name: "fractionOfDailySalaryPerLeave", label: "Fraction of Daily Salary per Leave", type: "number", section: "details", hint: "Required, 0-1, when Is Partially Paid Leave is set." },
        { name: "allowNegative", label: "Allow Negative Balance", type: "checkbox", section: "details" },
        { name: "allowOverAllocation", label: "Allow Over Allocation", type: "checkbox", section: "details" },
        { name: "includeHoliday", label: "Include holidays within leaves as leaves", type: "checkbox", section: "details" },
        { name: "isOptionalLeave", label: "Leave for optional holiday", type: "checkbox", section: "details" },
        { name: "isCarryForward", label: "Carry Forward", type: "checkbox", section: "carryForward" },
        { name: "maximumCarryForwardedLeaves", label: "Maximum Carry Forwarded Leaves", type: "number", section: "carryForward" },
        { name: "expireCarryForwardedLeavesAfterDays", label: "Expire Carry Forwarded Leaves (Days)", type: "number", section: "carryForward" },
        { name: "allowEncashment", label: "Allow Encashment", type: "checkbox", section: "encashment" },
        { name: "maxEncashableLeaves", label: "Maximum Encashable Leaves", type: "number", section: "encashment" },
        { name: "nonEncashableLeaves", label: "Non-Encashable Leaves", type: "number", section: "encashment" },
        { name: "isEarnedLeave", label: "Is Earned Leave", type: "checkbox", section: "earnedLeave" },
        { name: "earnedLeaveFrequency", label: "Earned Leave Frequency", type: "select", section: "earnedLeave", options: ["Monthly", "Quarterly", "Half-Yearly", "Yearly"] },
        { name: "allocateOnDay", label: "Allocate on Day", type: "select", section: "earnedLeave", options: ["First Day", "Last Day", "Date of Joining"] },
        { name: "rounding", label: "Rounding", type: "select", section: "earnedLeave", options: ["0.25", "0.5", "1.0"] },
        { name: "maxLeavesAllowed", label: "Maximum Leave Allocation Allowed per Leave Period", type: "number", section: "limits" },
        { name: "maxContinuousDaysAllowed", label: "Maximum Consecutive Leaves Allowed", type: "number", section: "limits" },
        { name: "applicableAfter", label: "Allow Leave Application After (Calendar Days)", type: "number", section: "limits" },
        ACTIVE,
    ],
    columns: [
        { name: "Name", selector: (row) => row.leaveTypeName, minWidth: "200px" },
        { name: "LWP", selector: (row) => (row.isLwp ? "Yes" : "No"), minWidth: "80px" },
        { name: "Earned", selector: (row) => (row.isEarnedLeave ? "Yes" : "No"), minWidth: "90px" },
        { name: "Carry Fwd", selector: (row) => (row.isCarryForward ? "Yes" : "No"), minWidth: "100px" },
    ],
    recordTitle: (r) => r.leaveTypeName,
};

export const leavePeriodConfig = {
    filterFields: [
        { name: "companyId", label: "Company", type: "objectId" },
        { name: "fromDate", label: "From Date", type: "date" },
        { name: "toDate", label: "To Date", type: "date" },
        { name: "isActive", label: "Active", type: "boolean" },
        { name: "createdAt", label: "Created", type: "date" },
    ],
    key: "leave-period",
    path: "/leave-period",
    section: "Leaves",
    singular: "Leave Period",
    plural: "Leave Periods",
    description: "A named date range (e.g. a fiscal year) leave policies and allocations scope to. No two periods for the same company may overlap.",
    api: { search: searchLeavePeriods, getById: getLeavePeriodById, create: createLeavePeriod, update: updateLeavePeriod, remove: deleteLeavePeriod },
    lookups: {
        companyId: asOptions(getAllCompanies, "companyName"),
        optionalHolidayListId: asOptions(getAllHolidayLists, "holidayListName"),
    },
    fields: [
        { name: "companyId", icon: Building07, label: "Company", type: "select", required: true, section: "details", error: "Company is required!", optionsFrom: "companyId" },
        { name: "fromDate", label: "From Date", type: "date", required: true, section: "details", error: "From Date is required!" },
        { name: "toDate", label: "To Date", type: "date", required: true, section: "details", error: "To Date is required!" },
        { name: "optionalHolidayListId", label: "Holiday List for Optional Leave", type: "select", section: "details", optionsFrom: "optionalHolidayListId" },
        ACTIVE,
    ],
    columns: [
        { name: "From", selector: (row) => row.fromDate?.slice?.(0, 10) ?? "—", minWidth: "110px" },
        { name: "To", selector: (row) => row.toDate?.slice?.(0, 10) ?? "—", minWidth: "110px" },
        { name: "Active", selector: (row) => (row.isActive ? "Yes" : "No"), minWidth: "90px" },
    ],
    recordTitle: (r) => `Leave Period — ${r.fromDate?.slice?.(0, 10) ?? ""} to ${r.toDate?.slice?.(0, 10) ?? ""}`,
    toForm: (data) => ({ ...data, companyId: refId(data.companyId), optionalHolidayListId: refId(data.optionalHolidayListId) }),
};

export const holidayListConfig = {
    filterFields: [
        { name: "holidayListName", label: "Name", type: "string" },
        { name: "companyId", label: "Company", type: "objectId" },
        { name: "isActive", label: "Active", type: "boolean" },
        { name: "createdAt", label: "Created", type: "date" },
    ],
    key: "holiday-list",
    path: "/holiday-list",
    section: "Leaves",
    singular: "Holiday List",
    plural: "Holiday Lists",
    description: "A calendar of holidays for a company/date range. Total Holidays is computed automatically from the rows below.",
    api: { search: searchHolidayLists, getById: getHolidayListById, create: createHolidayList, update: updateHolidayList, remove: deleteHolidayList },
    lookups: { companyId: asOptions(getAllCompanies, "companyName") },
    sections: [{ id: "details", title: "Details" }, { id: "holidays", title: "Holidays" }],
    fields: [
        { name: "holidayListName", icon: Tag01, label: "Holiday List Name", required: true, section: "details", error: "Holiday List Name is required!" },
        { name: "companyId", icon: Building07, label: "Company", type: "select", required: true, section: "details", error: "Company is required!", optionsFrom: "companyId" },
        { name: "fromDate", label: "From Date", type: "date", required: true, section: "details", error: "From Date is required!" },
        { name: "toDate", label: "To Date", type: "date", required: true, section: "details", error: "To Date is required!" },
        ACTIVE,
    ],
    renderExtra: ({ values, setValues }) => (
        <SimpleArrayField
            title="Holidays" description={`Total: ${values.totalHolidays ?? (values.holidays?.length ?? 0)} (computed on save).`}
            fieldName="holidays" columns={HOLIDAY_COLUMNS} values={values} setValues={setValues}
        />
    ),
    columns: [
        { name: "Name", selector: (row) => row.holidayListName, minWidth: "200px" },
        { name: "From", selector: (row) => row.fromDate?.slice?.(0, 10) ?? "—", minWidth: "110px" },
        { name: "To", selector: (row) => row.toDate?.slice?.(0, 10) ?? "—", minWidth: "110px" },
        { name: "Holidays", selector: (row) => row.totalHolidays ?? 0, minWidth: "100px" },
    ],
    recordTitle: (r) => r.holidayListName,
    toForm: (data) => ({ ...data, companyId: refId(data.companyId) }),
};

export const holidayListAssignmentConfig = {
    filterFields: [
        { name: "holidayListId", label: "Holiday List", type: "objectId" },
        { name: "applicableFor", label: "Applicable For", type: "string" },
        { name: "employeeId", label: "Employee", type: "objectId" },
        { name: "companyId", label: "Company", type: "objectId" },
        { name: "fromDate", label: "From Date", type: "date" },
        { name: "isActive", label: "Active", type: "boolean" },
        { name: "createdAt", label: "Created", type: "date" },
    ],
    key: "holiday-list-assignment",
    path: "/holiday-list-assignment",
    section: "Leaves",
    singular: "Holiday List Assignment",
    plural: "Holiday List Assignments",
    description: "Assigns a Holiday List to an Employee or a Company from a given date onward.",
    api: {
        search: searchHolidayListAssignments, getById: getHolidayListAssignmentById,
        create: createHolidayListAssignment, update: updateHolidayListAssignment, remove: deleteHolidayListAssignment,
    },
    lookups: {
        holidayListId: asOptions(getAllHolidayLists, "holidayListName"),
        employeeId: asOptions(getAllEmployees, "employeeName"),
        companyId: asOptions(getAllCompanies, "companyName"),
    },
    fields: [
        { name: "holidayListId", icon: Tag01, label: "Holiday List", type: "select", required: true, section: "details", error: "Holiday List is required!", optionsFrom: "holidayListId" },
        { name: "applicableFor", label: "Applicable For", type: "select", required: true, section: "details", error: "Applicable For is required!", options: ["Employee", "Company"], clears: ["employeeId", "companyId"] },
        { name: "employeeId", icon: User01, label: "Employee", type: "select", section: "details", optionsFrom: "employeeId", disabled: (values) => values.applicableFor !== "Employee" },
        { name: "companyId", icon: Building07, label: "Company", type: "select", section: "details", optionsFrom: "companyId", disabled: (values) => values.applicableFor !== "Company" },
        { name: "fromDate", label: "Assignment Starts From", type: "date", required: true, section: "details", error: "From Date is required!" },
        ACTIVE,
    ],
    columns: [
        { name: "Holiday List", selector: (row) => row.holidayListId, minWidth: "180px" },
        { name: "Applicable For", selector: (row) => row.applicableFor, minWidth: "130px" },
        { name: "From", selector: (row) => row.fromDate?.slice?.(0, 10) ?? "—", minWidth: "110px" },
    ],
    recordTitle: (r) => `Holiday List Assignment — ${r._id}`,
    toForm: (data) => ({ ...data, holidayListId: refId(data.holidayListId), employeeId: refId(data.employeeId), companyId: refId(data.companyId) }),
};

export const leavePolicyConfig = {
    filterFields: [
        { name: "title", label: "Title", type: "string" },
        { name: "isActive", label: "Active", type: "boolean" },
        { name: "createdAt", label: "Created", type: "date" },
    ],
    key: "leave-policy",
    path: "/leave-policy",
    section: "Leaves",
    singular: "Leave Policy",
    plural: "Leave Policies",
    description: "A named bundle of (Leave Type, annual allocation) pairs, assigned to employees via Leave Policy Assignment.",
    api: { search: searchLeavePolicies, getById: getLeavePolicyById, create: createLeavePolicy, update: updateLeavePolicy, remove: deleteLeavePolicy },
    fields: [
        { name: "title", icon: Tag01, label: "Title", required: true, section: "details", error: "Title is required!" },
        ACTIVE,
    ],
    renderExtra: ({ values, setValues }) => (
        <SimpleArrayField
            title="Leave Policy Details" description="One row per Leave Type this policy covers. Paste a Leave Type's id into each row; annual allocation is capped at that Leave Type's own Maximum Leave Allocation Allowed, when set."
            fieldName="leavePolicyDetails" columns={LEAVE_POLICY_DETAIL_COLUMNS} values={values} setValues={setValues}
        />
    ),
    columns: [
        { name: "Title", selector: (row) => row.title, minWidth: "220px" },
        { name: "Leave Types", selector: (row) => row.leavePolicyDetails?.length ?? 0, minWidth: "110px" },
    ],
    recordTitle: (r) => r.title,
};

export const leavePolicyAssignmentConfig = {
    filterFields: [
        { name: "employeeId", label: "Employee", type: "objectId" },
        { name: "leavePolicyId", label: "Leave Policy", type: "objectId" },
        { name: "leavePeriodId", label: "Leave Period", type: "objectId" },
        { name: "companyId", label: "Company", type: "objectId" },
        { name: "status", label: "Status", type: "string" },
        { name: "createdAt", label: "Created", type: "date" },
    ],
    key: "leave-policy-assignment",
    path: "/leave-policy-assignment",
    section: "Leaves",
    singular: "Leave Policy Assignment",
    plural: "Leave Policy Assignments",
    description: "Assigns a Leave Policy to an Employee for a period. Use \"Grant Allocations\" once saved to create the actual Leave Allocations — idempotent, safe to click only once per assignment.",
    api: {
        search: searchLeavePolicyAssignments, getById: getLeavePolicyAssignmentById,
        create: createLeavePolicyAssignment, update: updateLeavePolicyAssignment, remove: deleteLeavePolicyAssignment,
    },
    lookups: {
        employeeId: asOptions(getAllEmployees, "employeeName"),
        leavePolicyId: asOptions(getAllLeavePolicies, "title"),
        leavePeriodId: () => getAllLeavePeriods().then((res) => (res.data?.data ?? []).map((row) => ({ value: row._id, label: `${row.fromDate?.slice?.(0, 10)} – ${row.toDate?.slice?.(0, 10)}` }))),
    },
    sections: [{ id: "details", title: "Details" }, { id: "status", title: "Status" }],
    fields: [
        { name: "employeeId", icon: User01, label: "Employee", type: "select", required: true, section: "details", error: "Employee is required!", optionsFrom: "employeeId" },
        { name: "leavePolicyId", icon: Tag01, label: "Leave Policy", type: "select", required: true, section: "details", error: "Leave Policy is required!", optionsFrom: "leavePolicyId" },
        { name: "assignmentBasedOn", label: "Assignment based on", type: "select", section: "details", options: ["Leave Period", "Joining Date"], clears: ["leavePeriodId"] },
        { name: "leavePeriodId", label: "Leave Period", type: "select", section: "details", optionsFrom: "leavePeriodId", disabled: (values) => values.assignmentBasedOn !== "Leave Period" },
        { name: "effectiveFrom", label: "Effective From", type: "date", section: "details", disabled: (values) => Boolean(values.assignmentBasedOn) },
        { name: "effectiveTo", label: "Effective To", type: "date", section: "details", disabled: (values) => values.assignmentBasedOn === "Leave Period" },
        { name: "carryForward", label: "Add unused leaves from previous allocations", type: "checkbox", section: "details" },
        { name: "status", label: "Status", type: "select", section: "status", options: ["pending", "allocated"], disabled: () => true, hint: "Set automatically by Grant Allocations." },
        ACTIVE,
    ],
    renderExtra: ({ mode, id, values }) => (
        mode === "edit" && id && (
            <AdjustAllocationPanel
                currentValue={undefined}
                onAdjust={() => grantLeavePolicyAssignmentAllocations(id)}
                onResult={() => window.location.reload()}
            />
        )
    ),
    columns: [
        { name: "Employee", selector: (row) => row.employeeName || row.employeeId, minWidth: "200px" },
        { name: "Status", selector: (row) => row.status, minWidth: "110px" },
        { name: "From", selector: (row) => row.effectiveFrom?.slice?.(0, 10) ?? "—", minWidth: "110px" },
        { name: "To", selector: (row) => row.effectiveTo?.slice?.(0, 10) ?? "—", minWidth: "110px" },
    ],
    recordTitle: (r) => `Leave Policy Assignment — ${r._id}`,
    toForm: (data) => ({
        ...data,
        employeeId: refId(data.employeeId),
        leavePolicyId: refId(data.leavePolicyId),
        leavePeriodId: refId(data.leavePeriodId),
    }),
};

export const leaveAllocationConfig = {
    filterFields: [
        { name: "employeeId", label: "Employee", type: "objectId" },
        { name: "leaveTypeId", label: "Leave Type", type: "objectId" },
        { name: "companyId", label: "Company", type: "objectId" },
        { name: "leavePolicyAssignmentId", label: "Leave Policy Assignment", type: "objectId" },
        { name: "status", label: "Status", type: "string" },
        { name: "createdAt", label: "Created", type: "date" },
    ],
    key: "leave-allocation",
    path: "/leave-allocation",
    section: "Leaves",
    singular: "Leave Allocation",
    plural: "Leave Allocations",
    description: "The actual per-employee, per-leave-type grant of N days. Total Leaves Allocated is a cached snapshot — the balance is always the sum of the Leave Ledger. Use Adjust to change the allocated amount once active.",
    api: {
        search: searchLeaveAllocations, getById: getLeaveAllocationById,
        create: createLeaveAllocation, update: updateLeaveAllocation, remove: deleteLeaveAllocation,
    },
    lookups: {
        employeeId: asOptions(getAllEmployees, "employeeName"),
        leaveTypeId: asOptions(getAllLeaveTypes, "leaveTypeName"),
        companyId: asOptions(getAllCompanies, "companyName"),
        leavePeriodId: () => getAllLeavePeriods().then((res) => (res.data?.data ?? []).map((row) => ({ value: row._id, label: `${row.fromDate?.slice?.(0, 10)} – ${row.toDate?.slice?.(0, 10)}` }))),
        leavePolicyId: asOptions(getAllLeavePolicies, "title"),
    },
    sections: [{ id: "details", title: "Details" }, { id: "status", title: "Status" }],
    fields: [
        { name: "employeeId", icon: User01, label: "Employee", type: "select", required: true, section: "details", error: "Employee is required!", optionsFrom: "employeeId" },
        { name: "leaveTypeId", icon: Tag01, label: "Leave Type", type: "select", required: true, section: "details", error: "Leave Type is required!", optionsFrom: "leaveTypeId" },
        { name: "companyId", icon: Building07, label: "Company", type: "select", section: "details", optionsFrom: "companyId" },
        { name: "fromDate", label: "From Date", type: "date", required: true, section: "details", error: "From Date is required!" },
        { name: "toDate", label: "To Date", type: "date", required: true, section: "details", error: "To Date is required!" },
        { name: "newLeavesAllocated", label: "New Leaves Allocated", type: "number", section: "details", hint: "Only used on create — use Adjust below to change it afterward.", disabled: (values) => Boolean(values?._id) },
        { name: "unusedLeaves", label: "Unused Leaves (carried forward)", type: "number", section: "details", disabled: (values) => Boolean(values?._id) },
        { name: "carryForward", label: "Add unused leaves from previous allocations", type: "checkbox", section: "details" },
        { name: "leavePeriodId", label: "Leave Period", type: "select", section: "details", optionsFrom: "leavePeriodId" },
        { name: "leavePolicyId", label: "Leave Policy", type: "select", section: "details", optionsFrom: "leavePolicyId" },
        { name: "status", label: "Status", type: "select", section: "status", options: ["active", "expired", "cancelled"] },
        ACTIVE,
    ],
    renderExtra: ({ mode, id, values }) => (
        mode === "edit" && id && (
            <AdjustAllocationPanel
                currentValue={values.newLeavesAllocated}
                onAdjust={(newLeavesAllocated) => adjustLeaveAllocation(id, { newLeavesAllocated })}
                onResult={() => window.location.reload()}
            />
        )
    ),
    columns: [
        { name: "Employee", selector: (row) => row.employeeName || row.employeeId, minWidth: "200px" },
        { name: "New Leaves", selector: (row) => row.newLeavesAllocated, minWidth: "110px" },
        { name: "Total (cached)", selector: (row) => row.totalLeavesAllocated, minWidth: "120px" },
        { name: "Status", selector: (row) => row.status, minWidth: "100px" },
    ],
    recordTitle: (r) => `Leave Allocation — ${r._id}`,
    toForm: (data) => ({
        ...data,
        employeeId: refId(data.employeeId),
        leaveTypeId: refId(data.leaveTypeId),
        companyId: refId(data.companyId),
        leavePeriodId: refId(data.leavePeriodId),
        leavePolicyId: refId(data.leavePolicyId),
    }),
};

export const attendanceConfig = {
    filterFields: [
        { name: "departmentId", label: "Department id", type: "objectId" },
        { name: "shiftId", label: "Shift id", type: "objectId" },
        { name: "workingHours", label: "Working hours", type: "number" },
        { name: "standardWorkingHours", label: "Standard working hours", type: "number" },
        { name: "actualOvertimeDuration", label: "Actual overtime duration", type: "number" },
        { name: "lateEntry", label: "Late entry", type: "boolean" },
        { name: "earlyExit", label: "Early exit", type: "boolean" },
        { name: "inTime", label: "In time", type: "date" },
        { name: "outTime", label: "Out time", type: "date" },
        { name: "halfDayStatus", label: "Half day status", type: "string" },

        { name: "employeeId", label: "Employee", type: "objectId" },
        { name: "companyId", label: "Company", type: "objectId" },
        { name: "status", label: "Status", type: "string" },
        { name: "attendanceDate", label: "Attendance Date", type: "date" },
        { name: "isActive", label: "Active", type: "boolean" },
        { name: "createdAt", label: "Created", type: "date" },
    ],
    key: "attendance",
    path: "/attendance",
    section: "Shift & Attendance",
    singular: "Attendance",
    plural: "Attendance",
    description: "One row per employee per day, including shift hours, punches and overtime.",
    api: { search: searchAttendances, getById: getAttendanceById, create: createAttendance, update: updateAttendance, remove: deleteAttendance },
    lookups: {
        employeeId: asOptions(getAllEmployees, "employeeName"),
        companyId: asOptions(getAllCompanies, "companyName"),
        leaveTypeId: asOptions(getAllLeaveTypes, "leaveTypeName"),
        shiftId: asOptions(getAllShiftTypes, "shiftTypeName"),
        departmentId: asOptions(getAllDepartments, "departmentName"),
    },
    fields: [
        { name: "employeeId", icon: User01, label: "Employee", type: "select", required: true, section: "details", error: "Employee is required!", optionsFrom: "employeeId" },
        { name: "companyId", icon: Building07, label: "Company", type: "select", section: "details", optionsFrom: "companyId" },
        { name: "attendanceDate", label: "Attendance Date", type: "date", required: true, section: "details", error: "Attendance Date is required!" },
        { name: "status", label: "Status", type: "select", required: true, section: "details", error: "Status is required!", options: ["Present", "Absent", "On Leave", "Half Day", "Work From Home"] },
        { name: "leaveTypeId", label: "Leave Type", type: "select", section: "details", optionsFrom: "leaveTypeId" },
        {"name": "departmentId", "label": "Department", "type": "select", "section": "details", "optionsFrom": "departmentId" },
        {"name": "shiftId", "label": "Shift", "type": "select", "section": "details", "optionsFrom": "shiftId" },
        {"name": "workingHours", "label": "Working hours", "type": "number", "section": "details" },
        {"name": "standardWorkingHours", "label": "Standard working hours", "type": "number", "section": "details" },
        {"name": "actualOvertimeDuration", "label": "Overtime hours", "type": "number", "section": "details" },
        {"name": "lateEntry", "label": "Late entry", "type": "checkbox", "section": "details" },
        {"name": "earlyExit", "label": "Early exit", "type": "checkbox", "section": "details" },
        {"name": "inTime", "label": "In time (UTC)", "type": "datetime-local", "section": "details" },
        {"name": "outTime", "label": "Out time (UTC)", "type": "datetime-local", "section": "details" },
        {"name": "halfDayStatus", "label": "Other half status", "type": "select", "section": "details", "options": ["", "Present", "Absent"]},
        ACTIVE,
    ],
    columns: [
        { name: "Employee", selector: (row) => row.employeeName || row.employeeIdLabel || "—", minWidth: "200px" },
        { name: "Date", selector: (row) => row.attendanceDate?.slice?.(0, 10) ?? "—", minWidth: "110px" },
        { name: "Status", selector: (row) => row.status, minWidth: "130px" },
    ],
    recordTitle: (r) => `Attendance — ${r._id}`,
    toPayload: (values) => Object.fromEntries(Object.entries(values).filter(([key]) => ["employeeId", "companyId", "attendanceDate", "status", "leaveTypeId", "isActive", "departmentId", "shiftId", "workingHours", "standardWorkingHours", "actualOvertimeDuration", "lateEntry", "earlyExit", "inTime", "outTime", "halfDayStatus"].includes(key)).map(([key, value]) => [key, value === "" ? null : value])),
    toForm: (data) => ({
        ...data,
        shiftId: refId(data.shiftId),
        departmentId: refId(data.departmentId),
        inTime: data.inTime?.slice(0, 16) || "", outTime: data.outTime?.slice(0, 16) || "",
        employeeId: refId(data.employeeId),
        companyId: refId(data.companyId),
        leaveTypeId: refId(data.leaveTypeId),
    }),
};

// ---------------------------------------------------------------------------
// Leaves — transactional fork (ADR-024, module complete). LeaveAdjustment/
// LeaveEncashment are create-only from this admin (no update/remove in
// `api` — the ledger they write is immutable once posted, matching
// LeaveLedgerEntry's own append-only precedent); the seed roles never grant
// edit/delete on either menu row, so the missing api.update/api.remove is
// never actually reached from the UI.
// ---------------------------------------------------------------------------

const BLOCK_DATE_COLUMNS = [
    { name: "blockDate", label: "Block Date (YYYY-MM-DD)", type: "text" },
    { name: "reason", label: "Reason", type: "text" },
];
const ALLOW_LIST_COLUMNS = [
    { name: "allowUserId", label: "Allowed User (id)", type: "text" },
];

export const leaveAdjustmentConfig = {
    filterFields: [
        { name: "employeeId", label: "Employee", type: "objectId" },
        { name: "leaveTypeId", label: "Leave Type", type: "objectId" },
        { name: "leaveAllocationId", label: "Leave Allocation", type: "objectId" },
        { name: "adjustmentType", label: "Adjustment Type", type: "string" },
        { name: "companyId", label: "Company", type: "objectId" },
        { name: "createdAt", label: "Created", type: "date" },
    ],
    key: "leave-adjustment",
    path: "/leave-adjustment",
    section: "Leaves",
    singular: "Leave Adjustment",
    plural: "Leave Adjustments",
    description: "A one-off manual correction to an employee's leave balance. Create is the action — saving writes one signed entry to the Leave Ledger immediately; there is nothing to edit or delete afterward.",
    api: { search: searchLeaveAdjustments, getById: getLeaveAdjustmentById, create: createLeaveAdjustment },
    lookups: {
        employeeId: asOptions(getAllEmployees, "employeeName"),
        leaveTypeId: asOptions(getAllLeaveTypes, "leaveTypeName"),
        leaveAllocationId: () => getAllLeaveAllocations().then((res) => (res.data?.data ?? []).map((row) => ({ value: row._id, label: `${row.fromDate?.slice?.(0, 10)} – ${row.toDate?.slice?.(0, 10)}` }))),
    },
    fields: [
        { name: "employeeId", icon: User01, label: "Employee", type: "select", required: true, section: "details", error: "Employee is required!", optionsFrom: "employeeId" },
        { name: "leaveTypeId", icon: Tag01, label: "Leave Type", type: "select", required: true, section: "details", error: "Leave Type is required!", optionsFrom: "leaveTypeId" },
        { name: "leaveAllocationId", label: "Allocation to Adjust (optional)", type: "select", section: "details", optionsFrom: "leaveAllocationId" },
        { name: "postingDate", label: "Posting Date", type: "date", section: "details" },
        { name: "leavesToAdjust", label: "Leaves to Adjust", type: "number", required: true, section: "details", error: "Leaves to Adjust is required!" },
        { name: "adjustmentType", label: "Adjustment Type", type: "select", required: true, section: "details", error: "Adjustment Type is required!", options: ["Allocate", "Reduce"] },
        { name: "reasonForAdjustment", label: "Reason for Adjustment", type: "textarea", section: "details" },
    ],
    columns: [
        { name: "Employee", selector: (row) => row.employeeName || row.employeeId, minWidth: "180px" },
        { name: "Type", selector: (row) => row.adjustmentType, minWidth: "100px" },
        { name: "Leaves", selector: (row) => row.leavesToAdjust, minWidth: "90px" },
        { name: "Posting Date", selector: (row) => row.postingDate?.slice?.(0, 10) ?? "—", minWidth: "110px" },
    ],
    recordTitle: (r) => `Leave Adjustment — ${r._id}`,
    toForm: (data) => ({ ...data, employeeId: refId(data.employeeId), leaveTypeId: refId(data.leaveTypeId), leaveAllocationId: refId(data.leaveAllocationId) }),
};

export const compensatoryLeaveRequestConfig = {
    filterFields: [
        { name: "employeeId", label: "Employee", type: "objectId" },
        { name: "leaveTypeId", label: "Leave Type", type: "objectId" },
        { name: "status", label: "Status", type: "string" },
        { name: "companyId", label: "Company", type: "objectId" },
        { name: "workFromDate", label: "Work From Date", type: "date" },
        { name: "workEndDate", label: "Work End Date", type: "date" },
        { name: "createdAt", label: "Created", type: "date" },
    ],
    key: "compensatory-leave-request",
    path: "/compensatory-leave-request",
    section: "Leaves",
    singular: "Compensatory Leave Request",
    plural: "Compensatory Leave Requests",
    description: "A request for comp-off leave for a day (or range) worked on a holiday. Approving validates the worked range against the employee's Holiday List and matching Attendance records, then grants the leave.",
    api: {
        search: searchCompensatoryLeaveRequests, getById: getCompensatoryLeaveRequestById,
        create: createCompensatoryLeaveRequest, update: updateCompensatoryLeaveRequest, remove: deleteCompensatoryLeaveRequest,
    },
    lookups: {
        employeeId: asOptions(getAllEmployees, "employeeName"),
        leaveTypeId: asOptions(getAllLeaveTypes, "leaveTypeName"),
    },
    sections: [{ id: "details", title: "Details" }, { id: "status", title: "Status" }, { id: "actions", title: "Actions" }],
    fields: [
        { name: "employeeId", icon: User01, label: "Employee", type: "select", required: true, section: "details", error: "Employee is required!", optionsFrom: "employeeId" },
        { name: "leaveTypeId", icon: Tag01, label: "Leave Type (must be Is Compensatory)", type: "select", required: true, section: "details", error: "Leave Type is required!", optionsFrom: "leaveTypeId" },
        { name: "workFromDate", label: "Work From Date", type: "date", required: true, section: "details", error: "Work From Date is required!" },
        { name: "workEndDate", label: "Work End Date", type: "date", required: true, section: "details", error: "Work End Date is required!" },
        { name: "halfDay", label: "Half Day", type: "checkbox", section: "details" },
        { name: "halfDayDate", label: "Half Day Date", type: "date", section: "details", disabled: (values) => !values.halfDay },
        { name: "reason", label: "Reason", type: "textarea", required: true, section: "details", error: "Reason is required!" },
        { name: "status", label: "Status", type: "select", section: "status", options: ["open", "approved", "rejected"], disabled: () => true, hint: "Set by the Approve/Reject actions below." },
    ],
    renderExtra: ({ mode, id, values }) => (
        mode === "edit" && id && values.status === "open" && (
            <>
                <SimpleActionButton
                    label="Approve" description="Validates the worked range against the Holiday List and Attendance, then grants the resulting leave."
                    onRun={() => approveCompensatoryLeaveRequest(id)}
                    onResult={() => window.location.reload()}
                />
                <SimpleActionButton
                    label="Reject" description="No side effects — nothing was granted yet."
                    onRun={() => rejectCompensatoryLeaveRequest(id)}
                    onResult={() => window.location.reload()}
                />
            </>
        )
    ),
    columns: [
        { name: "Employee", selector: (row) => row.employeeName || row.employeeId, minWidth: "180px" },
        { name: "Work From", selector: (row) => row.workFromDate?.slice?.(0, 10) ?? "—", minWidth: "110px" },
        { name: "Work End", selector: (row) => row.workEndDate?.slice?.(0, 10) ?? "—", minWidth: "110px" },
        { name: "Status", selector: (row) => row.status, minWidth: "100px" },
    ],
    recordTitle: (r) => `Compensatory Leave Request — ${r._id}`,
    toForm: (data) => ({ ...data, employeeId: refId(data.employeeId), leaveTypeId: refId(data.leaveTypeId) }),
};

export const leaveApplicationConfig = {
    filterFields: [
        { name: "employeeId", label: "Employee", type: "objectId" },
        { name: "leaveTypeId", label: "Leave Type", type: "objectId" },
        { name: "status", label: "Status", type: "string" },
        { name: "companyId", label: "Company", type: "objectId" },
        { name: "leaveApproverId", label: "Leave Approver", type: "objectId" },
        { name: "fromDate", label: "From Date", type: "date" },
        { name: "toDate", label: "To Date", type: "date" },
        { name: "createdAt", label: "Created", type: "date" },
    ],
    key: "leave-application",
    path: "/leave-application",
    section: "Leaves",
    singular: "Leave Application",
    plural: "Leave Applications",
    description: "The centerpiece of Leaves. Total Leave Days and the Leave Approver (when left blank) are computed/resolved automatically on save. An Employee sees only their own applications; a Leave Approver sees their own plus everyone they approve for.",
    api: {
        search: searchLeaveApplications, getById: getLeaveApplicationById,
        create: createLeaveApplication, update: updateLeaveApplication,
    },
    lookups: {
        employeeId: asOptions(getAllEmployees, "employeeName"),
        leaveTypeId: asOptions(getAllLeaveTypes, "leaveTypeName"),
        leaveApproverId: asOptions(getAllUsers, "userName"),
    },
    sections: [{ id: "details", title: "Details" }, { id: "approval", title: "Approval" }, { id: "status", title: "Status" }, { id: "actions", title: "Actions" }],
    fields: [
        { name: "employeeId", icon: User01, label: "Employee", type: "select", required: true, section: "details", error: "Employee is required!", optionsFrom: "employeeId" },
        { name: "leaveTypeId", icon: Tag01, label: "Leave Type", type: "select", required: true, section: "details", error: "Leave Type is required!", optionsFrom: "leaveTypeId" },
        { name: "fromDate", label: "From Date", type: "date", required: true, section: "details", error: "From Date is required!" },
        { name: "toDate", label: "To Date", type: "date", required: true, section: "details", error: "To Date is required!" },
        { name: "halfDay", label: "Half Day", type: "checkbox", section: "details" },
        { name: "halfDayDate", label: "Half Day Date", type: "date", section: "details", disabled: (values) => !values.halfDay },
        { name: "description", label: "Reason", type: "textarea", section: "details" },
        { name: "totalLeaveDays", label: "Total Leave Days (computed)", type: "number", section: "details", disabled: () => true, hint: "Always recomputed server-side on save — never trust a typed value here." },
        { name: "leaveApproverId", label: "Leave Approver (leave blank to auto-resolve)", type: "select", section: "approval", optionsFrom: "leaveApproverId" },
        { name: "postingDate", label: "Posting Date", type: "date", section: "approval" },
        { name: "status", label: "Status", type: "select", section: "status", options: ["open", "approved", "rejected", "cancelled"], disabled: () => true, hint: "Set by the Approve/Reject/Cancel actions below." },
    ],
    renderExtra: ({ mode, id, values }) => (
        mode === "edit" && id && (
            <>
                {values.status === "open" && (
                    <>
                        <SimpleActionButton
                            label="Approve" description="Re-checks the leave balance, creates/updates Attendance rows for the range, and writes 1-2 Leave Ledger Entry rows."
                            onRun={() => approveLeaveApplication(id)}
                            onResult={() => window.location.reload()}
                        />
                        <SimpleActionButton
                            label="Reject" description="No side effects — nothing was ever consumed."
                            onRun={() => rejectLeaveApplication(id)}
                            onResult={() => window.location.reload()}
                        />
                    </>
                )}
                {values.status === "approved" && (
                    <SimpleActionButton
                        label="Cancel" description="Reverses the Leave Ledger Entry rows (soft-deleted, never hard-removed) and the Attendance rows this application created."
                        onRun={() => cancelLeaveApplication(id)}
                        onResult={() => window.location.reload()}
                    />
                )}
            </>
        )
    ),
    columns: [
        { name: "Employee", selector: (row) => row.employeeName || row.employeeId, minWidth: "180px" },
        { name: "From", selector: (row) => row.fromDate?.slice?.(0, 10) ?? "—", minWidth: "110px" },
        { name: "To", selector: (row) => row.toDate?.slice?.(0, 10) ?? "—", minWidth: "110px" },
        { name: "Days", selector: (row) => row.totalLeaveDays, minWidth: "80px" },
        { name: "Status", selector: (row) => row.status, minWidth: "100px" },
    ],
    recordTitle: (r) => `Leave Application — ${r._id}`,
    toForm: (data) => ({ ...data, employeeId: refId(data.employeeId), leaveTypeId: refId(data.leaveTypeId), leaveApproverId: refId(data.leaveApproverId) }),
};

export const leaveEncashmentConfig = {
    filterFields: [
        { name: "employeeId", label: "Employee", type: "objectId" },
        { name: "leaveTypeId", label: "Leave Type", type: "objectId" },
        { name: "leaveAllocationId", label: "Leave Allocation", type: "objectId" },
        { name: "status", label: "Status", type: "string" },
        { name: "companyId", label: "Company", type: "objectId" },
        { name: "encashmentDate", label: "Encashment Date", type: "date" },
        { name: "createdAt", label: "Created", type: "date" },
    ],
    key: "leave-encashment",
    path: "/leave-encashment",
    section: "Leaves",
    singular: "Leave Encashment",
    plural: "Leave Encashments",
    description: "Cashes out unused leave for a Leave Type with Allow Encashment set. Create is the action — saving computes the balance/eligible days and writes the debiting Leave Ledger Entry immediately. Per Day Encashment Amount is entered manually — this project has no Payroll module yet to derive it from.",
    api: { search: searchLeaveEncashments, getById: getLeaveEncashmentById, create: createLeaveEncashment, update: updateLeaveEncashment },
    lookups: {
        employeeId: asOptions(getAllEmployees, "employeeName"),
        leaveTypeId: asOptions(getAllLeaveTypes, "leaveTypeName"),
        leaveAllocationId: () => getAllLeaveAllocations().then((res) => (res.data?.data ?? []).map((row) => ({ value: row._id, label: `${row.fromDate?.slice?.(0, 10)} – ${row.toDate?.slice?.(0, 10)}` }))),
    },
    sections: [{ id: "details", title: "Details" }, { id: "computed", title: "Computed (read-only)" }, { id: "payment", title: "Payment" }],
    fields: [
        { name: "employeeId", icon: User01, label: "Employee", type: "select", required: true, section: "details", error: "Employee is required!", optionsFrom: "employeeId" },
        { name: "leaveTypeId", icon: Tag01, label: "Leave Type (must Allow Encashment)", type: "select", required: true, section: "details", error: "Leave Type is required!", optionsFrom: "leaveTypeId" },
        { name: "leaveAllocationId", label: "Leave Allocation (optional — auto-resolved by date if blank)", type: "select", section: "details", optionsFrom: "leaveAllocationId" },
        { name: "encashmentDate", label: "Encashment Date", type: "date", section: "details" },
        { name: "encashmentDays", label: "Encashment Days (blank = full eligible balance)", type: "number", section: "details" },
        { name: "perDayEncashmentAmount", label: "Per Day Encashment Amount", type: "number", required: true, section: "details", error: "Per Day Encashment Amount is required!" },
        { name: "leaveBalance", label: "Leave Balance (at encashment time)", type: "number", section: "computed", disabled: () => true },
        { name: "actualEncashableDays", label: "Actual Encashable Days", type: "number", section: "computed", disabled: () => true },
        { name: "encashmentAmount", label: "Encashment Amount", type: "number", section: "computed", disabled: () => true },
        { name: "status", label: "Status", type: "select", section: "payment", options: ["pending", "paid"], disabled: () => true },
        { name: "paymentDate", label: "Payment Date", type: "date", section: "payment", disabled: () => true },
        { name: "paymentReference", label: "Payment Reference", type: "text", section: "payment", disabled: () => true },
    ],
    renderExtra: ({ mode, id, values }) => (
        mode === "edit" && id && values.status === "pending" && (
            <MarkEncashmentPaidPanel
                defaultAmount={values.encashmentAmount}
                onMarkPaid={(data) => markLeaveEncashmentPaid(id, data)}
                onResult={() => window.location.reload()}
            />
        )
    ),
    columns: [
        { name: "Employee", selector: (row) => row.employeeName || row.employeeId, minWidth: "180px" },
        { name: "Date", selector: (row) => row.encashmentDate?.slice?.(0, 10) ?? "—", minWidth: "110px" },
        { name: "Days", selector: (row) => row.encashmentDays, minWidth: "80px" },
        { name: "Amount", selector: (row) => row.encashmentAmount, minWidth: "100px" },
        { name: "Status", selector: (row) => row.status, minWidth: "90px" },
    ],
    recordTitle: (r) => `Leave Encashment — ${r._id}`,
    toForm: (data) => ({ ...data, employeeId: refId(data.employeeId), leaveTypeId: refId(data.leaveTypeId), leaveAllocationId: refId(data.leaveAllocationId) }),
};

export const leaveBlockListConfig = {
    filterFields: [
        { name: "leaveBlockListName", label: "Name", type: "string" },
        { name: "companyId", label: "Company", type: "objectId" },
        { name: "departmentId", label: "Department", type: "objectId" },
        { name: "leaveTypeId", label: "Leave Type", type: "objectId" },
        { name: "appliesToAllDepartments", label: "Applies to All Departments", type: "boolean" },
        { name: "isActive", label: "Active", type: "boolean" },
        { name: "createdAt", label: "Created", type: "date" },
    ],
    key: "leave-block-list",
    path: "/leave-block-list",
    section: "Leaves",
    singular: "Leave Block List",
    plural: "Leave Block Lists",
    description: "Dates on which leave applications are blocked, for a company (and optionally one department and/or one Leave Type). Users on the Allow list bypass the block.",
    api: {
        search: searchLeaveBlockLists, getById: getLeaveBlockListById,
        create: createLeaveBlockList, update: updateLeaveBlockList, remove: deleteLeaveBlockList,
    },
    lookups: {
        companyId: asOptions(getAllCompanies, "companyName"),
        departmentId: asOptions(getAllDepartments, "departmentName"),
        leaveTypeId: asOptions(getAllLeaveTypes, "leaveTypeName"),
    },
    sections: [{ id: "details", title: "Details" }, { id: "dates", title: "Block Days" }, { id: "allow", title: "Allow Users" }],
    fields: [
        { name: "leaveBlockListName", icon: Tag01, label: "Name", required: true, section: "details", error: "Name is required!" },
        { name: "companyId", icon: Building07, label: "Company", type: "select", required: true, section: "details", error: "Company is required!", optionsFrom: "companyId" },
        { name: "appliesToAllDepartments", label: "Applies to All Departments", type: "checkbox", section: "details", clears: ["departmentId"] },
        { name: "departmentId", label: "Department", type: "select", section: "details", optionsFrom: "departmentId", disabled: (values) => Boolean(values.appliesToAllDepartments) },
        { name: "leaveTypeId", label: "Leave Type (blank = blocks every type)", type: "select", section: "details", optionsFrom: "leaveTypeId" },
        ACTIVE,
    ],
    renderExtra: ({ values, setValues }) => (
        <>
            <SimpleArrayField
                title="Block Dates" description="At least one row is required. Stop users from making Leave Applications on these dates."
                fieldName="blockDates" columns={BLOCK_DATE_COLUMNS} values={values} setValues={setValues}
            />
            <SimpleArrayField
                title="Allow Users" description="Paste a User's id into each row — these users may still approve/apply for leave on the block dates above."
                fieldName="allowList" columns={ALLOW_LIST_COLUMNS} values={values} setValues={setValues}
            />
        </>
    ),
    columns: [
        { name: "Name", selector: (row) => row.leaveBlockListName, minWidth: "200px" },
        { name: "Applies to All", selector: (row) => (row.appliesToAllDepartments ? "Yes" : "No"), minWidth: "110px" },
        { name: "Block Dates", selector: (row) => row.blockDates?.length ?? 0, minWidth: "100px" },
    ],
    recordTitle: (r) => r.leaveBlockListName,
    toForm: (data) => ({ ...data, companyId: refId(data.companyId), departmentId: refId(data.departmentId), leaveTypeId: refId(data.leaveTypeId) }),
};


export const shiftTypeConfig = {
    key: "shift-type", path: "/shift-type", section: "Shift & Attendance", singular: "Shift Type", plural: "Shift Types",
    description: "Set shift hours, buffers and attendance calculation rules.",
    api: { search: searchShiftTypes, getById: getShiftTypeById, create: createShiftType, update: updateShiftType, remove: deleteShiftType },
    lookups: {
        holidayListId: asOptions(getAllHolidayLists, "holidayListName"),
        companyId: asOptions(getAllCompanies, "companyName"),
    },
    sections: [{ id: "details", title: "Details" }],
    fields: [
        { name: "shiftTypeName", label: "Shift type name", section: "details", type: "text", required: true, error: "Shift type name is required" },
        { name: "startTime", label: "Start time", section: "details", type: "text", required: true, error: "Start time is required", hint: "24-hour time, HH:mm (UTC)." },
        { name: "endTime", label: "End time", section: "details", type: "text", required: true, error: "End time is required", hint: "24-hour time, HH:mm (UTC)." },
        { name: "holidayListId", label: "Holiday list", section: "details", type: "select", optionsFrom: "holidayListId" },
        { name: "determineCheckInAndCheckOut", label: "Determine check in and check out", section: "details", type: "select", options: ["alternating-entries", "strict-in-out"], default: "alternating-entries" },
        { name: "workingHoursCalculationBasis", label: "Working hours calculation basis", section: "details", type: "select", options: ["first-and-last", "every-valid-pair"], default: "first-and-last" },
        { name: "color", label: "Color", section: "details", type: "select", options: ["Blue", "Cyan", "Fuchsia", "Green", "Lime", "Orange", "Pink", "Red", "Violet", "Yellow"], default: "Blue" },
        { name: "processAttendanceAfter", label: "Process attendance after", section: "details", type: "date" },
        { name: "lastSyncOfCheckin", label: "Last sync of checkin", section: "details", type: "datetime-local" },
        { name: "workingHoursThresholdForHalfDay", label: "Working hours threshold for half day", section: "details", type: "number", default: 0},
        { name: "workingHoursThresholdForAbsent", label: "Working hours threshold for absent", section: "details", type: "number", default: 0},
        { name: "beginCheckInBeforeShiftStartTime", label: "Begin check in before shift start time", section: "details", type: "number", default: 60},
        { name: "allowCheckOutAfterShiftEndTime", label: "Allow check out after shift end time", section: "details", type: "number", default: 60},
        { name: "lateEntryGracePeriod", label: "Late entry grace period", section: "details", type: "number", default: 0},
        { name: "earlyExitGracePeriod", label: "Early exit grace period", section: "details", type: "number", default: 0},
        { name: "enableAutoAttendance", label: "Enable auto attendance", section: "details", type: "checkbox", default: false },
        { name: "markAutoAttendanceOnHolidays", label: "Mark auto attendance on holidays", section: "details", type: "checkbox", default: false },
        { name: "enableLateEntryMarking", label: "Enable late entry marking", section: "details", type: "checkbox", default: false },
        { name: "enableEarlyExitMarking", label: "Enable early exit marking", section: "details", type: "checkbox", default: false },
        { name: "autoUpdateLastSync", label: "Auto update last sync", section: "details", type: "checkbox", default: false },
        { name: "allowOvertime", label: "Allow overtime", section: "details", type: "checkbox", default: false },
        { name: "companyId", label: "Company", section: "details", type: "select", optionsFrom: "companyId", required: true, error: "Company is required" },
        { name: "isActive", label: "Is active", section: "details", type: "checkbox", default: true, required: true, error: "Is active is required" },
    ],
    filterFields: [
        { name: "shiftTypeName", label: "Shift type name", type: "string" },
        { name: "holidayListId", label: "Holiday list id", type: "objectId" },
        { name: "enableAutoAttendance", label: "Enable auto attendance", type: "boolean" },
        { name: "companyId", label: "Company id", type: "objectId" },
        { name: "isActive", label: "Is active", type: "boolean" },
        { name: "createdAt", label: "Created at", type: "date" },
    ],
    columns: [
        { name: "Shift type name", selector: (row) => String(row.shiftTypeName ?? "—"), sortable: true, sortField: "shiftTypeName" },
    ],
    recordTitle: (r) => r.shiftTypeName || r.locationName || "Shift Type",
    toForm: (data) => ({ ...data, processAttendanceAfter: data.processAttendanceAfter?.slice(0, 10) || "", lastSyncOfCheckin: data.lastSyncOfCheckin?.slice(0, 16) || "",  holidayListId: refId(data.holidayListId), companyId: refId(data.companyId) }),
    toPayload: (values) => Object.fromEntries(Object.entries(values).filter(([key]) => ["shiftTypeName", "startTime", "endTime", "holidayListId", "determineCheckInAndCheckOut", "workingHoursCalculationBasis", "color", "processAttendanceAfter", "lastSyncOfCheckin", "workingHoursThresholdForHalfDay", "workingHoursThresholdForAbsent", "beginCheckInBeforeShiftStartTime", "allowCheckOutAfterShiftEndTime", "lateEntryGracePeriod", "earlyExitGracePeriod", "enableAutoAttendance", "markAutoAttendanceOnHolidays", "enableLateEntryMarking", "enableEarlyExitMarking", "autoUpdateLastSync", "allowOvertime", "companyId", "isActive"].includes(key)).map(([key, value]) => [key, value === "" ? (key.endsWith("Id") ? null : undefined) : value])),
};

export const shiftLocationConfig = {
    key: "shift-location", path: "/shift-location", section: "Shift & Attendance", singular: "Shift Location", plural: "Shift Locations",
    description: "Set an optional checkin radius in meters. A zero radius disables enforcement.",
    api: { search: searchShiftLocations, getById: getShiftLocationById, create: createShiftLocation, update: updateShiftLocation, remove: deleteShiftLocation },
    lookups: {
        companyId: asOptions(getAllCompanies, "companyName"),
    },
    sections: [{ id: "details", title: "Details" }],
    fields: [
        { name: "locationName", label: "Location name", section: "details", type: "text", required: true, error: "Location name is required" },
        { name: "checkinRadius", label: "Checkin radius", section: "details", type: "number", default: 0},
        { name: "latitude", label: "Latitude", section: "details", type: "number" },
        { name: "longitude", label: "Longitude", section: "details", type: "number" },
        { name: "companyId", label: "Company", section: "details", type: "select", optionsFrom: "companyId", required: true, error: "Company is required" },
        { name: "isActive", label: "Is active", section: "details", type: "checkbox", default: true, required: true, error: "Is active is required" },
    ],
    filterFields: [
        { name: "locationName", label: "Location name", type: "string" },
        { name: "companyId", label: "Company id", type: "objectId" },
        { name: "isActive", label: "Is active", type: "boolean" },
        { name: "createdAt", label: "Created at", type: "date" },
    ],
    columns: [
        { name: "Location name", selector: (row) => String(row.locationName ?? "—"), sortable: true, sortField: "locationName" },
    ],
    recordTitle: (r) => r.shiftTypeName || r.locationName || "Shift Location",
    toForm: (data) => ({ ...data,  companyId: refId(data.companyId) }),
    toPayload: (values) => Object.fromEntries(Object.entries(values).filter(([key]) => ["locationName", "checkinRadius", "latitude", "longitude", "companyId", "isActive"].includes(key)).map(([key, value]) => [key, value === "" ? (key.endsWith("Id") ? null : undefined) : value])),
};

export const shiftAssignmentConfig = {
    key: "shift-assignment", path: "/shift-assignment", section: "Shift & Attendance", singular: "Shift Assignment", plural: "Shift Assignments",
    description: "Assign one employee to a shift over a date range. Active ranges cannot overlap.",
    api: { search: searchShiftAssignments, getById: getShiftAssignmentById, create: createShiftAssignment, update: updateShiftAssignment, remove: deleteShiftAssignment },
    lookups: {
        employeeId: asOptions(getAllEmployees, "employeeName"),
        shiftTypeId: asOptions(getAllShiftTypes, "shiftTypeName"),
        shiftLocationId: asOptions(getAllShiftLocations, "locationName"),
        companyId: asOptions(getAllCompanies, "companyName"),
    },
    sections: [{ id: "details", title: "Details" }],
    fields: [
        { name: "employeeId", label: "Employee", section: "details", type: "select", optionsFrom: "employeeId", required: true, error: "Employee is required" },
        { name: "shiftTypeId", label: "Shift type", section: "details", type: "select", optionsFrom: "shiftTypeId", required: true, error: "Shift type is required" },
        { name: "shiftLocationId", label: "Shift location", section: "details", type: "select", optionsFrom: "shiftLocationId" },
        { name: "startDate", label: "Start date", section: "details", type: "date", required: true, error: "Start date is required" },
        { name: "endDate", label: "End date", section: "details", type: "date" },
        { name: "status", label: "Status", section: "details", type: "select", options: ["active", "inactive", "cancelled"], default: "active" },
        { name: "companyId", label: "Company", section: "details", type: "select", optionsFrom: "companyId" },
        { name: "isActive", label: "Is active", section: "details", type: "checkbox", default: true, required: true, error: "Is active is required" },
    ],
    filterFields: [
        { name: "employeeId", label: "Employee id", type: "objectId" },
        { name: "shiftTypeId", label: "Shift type id", type: "objectId" },
        { name: "shiftLocationId", label: "Shift location id", type: "objectId" },
        { name: "shiftScheduleAssignmentId", label: "Shift schedule assignment id", type: "objectId" },
        { name: "startDate", label: "Start date", type: "date" },
        { name: "endDate", label: "End date", type: "date" },
        { name: "status", label: "Status", type: "string" },
        { name: "companyId", label: "Company id", type: "objectId" },
        { name: "isActive", label: "Is active", type: "boolean" },
        { name: "createdAt", label: "Created at", type: "date" },
    ],
    columns: [
        { name: "Employee", selector: (row) => row.employeeIdLabel || "—", sortable: true, sortField: "employeeId" },
        { name: "Shift type", selector: (row) => row.shiftTypeIdLabel || "—", sortable: true, sortField: "shiftTypeId" },
        { name: "Start date", selector: (row) => String(row.startDate ?? "—"), sortable: true, sortField: "startDate" },
        { name: "End date", selector: (row) => String(row.endDate ?? "—"), sortable: true, sortField: "endDate" },
        { name: "Status", selector: (row) => String(row.status ?? "—"), sortable: true, sortField: "status" },
    ],
    recordTitle: (r) => r.shiftTypeName || r.locationName || "Shift Assignment",
    toForm: (data) => ({ ...data, startDate: data.startDate?.slice(0, 10) || "", endDate: data.endDate?.slice(0, 10) || "",  employeeId: refId(data.employeeId), shiftTypeId: refId(data.shiftTypeId), shiftLocationId: refId(data.shiftLocationId), companyId: refId(data.companyId) }),
    toPayload: (values) => Object.fromEntries(Object.entries(values).filter(([key]) => ["employeeId", "shiftTypeId", "shiftLocationId", "startDate", "endDate", "status", "companyId", "isActive"].includes(key)).map(([key, value]) => [key, value === "" ? (key.endsWith("Id") ? null : undefined) : value])),
};

export const shiftScheduleConfig = {
    key: "shift-schedule", path: "/shift-schedule", section: "Shift & Attendance", singular: "Shift Schedule", plural: "Shift Schedules",
    description: "Choose weekdays and how often their weekly pattern repeats.",
    api: { search: searchShiftSchedules, getById: getShiftScheduleById, create: createShiftSchedule, update: updateShiftSchedule, remove: deleteShiftSchedule },
    lookups: {
        shiftTypeId: asOptions(getAllShiftTypes, "shiftTypeName"),
        companyId: asOptions(getAllCompanies, "companyName"),
    },
    sections: [{ id: "details", title: "Details" }],
    fields: [
        { name: "frequency", label: "Frequency", section: "details", type: "select", options: ["every-1-week", "every-2-weeks", "every-3-weeks", "every-4-weeks"], default: "every-1-week" },
        { name: "shiftTypeId", label: "Shift type", section: "details", type: "select", optionsFrom: "shiftTypeId", required: true, error: "Shift type is required" },
        { name: "companyId", label: "Company", section: "details", type: "select", optionsFrom: "companyId", required: true, error: "Company is required" },
        { name: "isActive", label: "Is active", section: "details", type: "checkbox", default: true, required: true, error: "Is active is required" },
    ],
    filterFields: [
        { name: "frequency", label: "Frequency", type: "string" },
        { name: "shiftTypeId", label: "Shift type id", type: "objectId" },
        { name: "companyId", label: "Company id", type: "objectId" },
        { name: "isActive", label: "Is active", type: "boolean" },
        { name: "createdAt", label: "Created at", type: "date" },
    ],
    renderExtra: ({ values, setValues }) => (
        <fieldset className="rounded-xl border border-secondary p-4 text-primary">
            <legend>Repeat on days</legend>
            {["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"].map(day => (
                <label key={day} className="mr-4 inline-flex gap-2"><input type="checkbox" checked={(values.repeatOnDays || []).includes(day)}
                    onChange={event => setValues(previous => ({ ...previous, repeatOnDays: event.target.checked ? [...(previous.repeatOnDays || []), day] : (previous.repeatOnDays || []).filter(value => value !== day) }))} />{day}</label>
            ))}
        </fieldset>
    ),
    columns: [
        { name: "Frequency", selector: (row) => String(row.frequency ?? "—"), sortable: true, sortField: "frequency" },
        { name: "Shift type", selector: (row) => row.shiftTypeIdLabel || "—", sortable: true, sortField: "shiftTypeId" },
    ],
    toView: (data) => ({ ...data, repeatOnDaysText: (data.repeatOnDays || []).join(", ") }),
    viewFields: [{ section: "details", name: "frequency", label: "Frequency" }, { section: "details", name: "shiftTypeId", label: "Shift", type: "select", optionsFrom: "shiftTypeId" }, { section: "details", name: "companyId", label: "Company", type: "select", optionsFrom: "companyId" }, { section: "details", name: "repeatOnDaysText", label: "Repeat on days" }, { section: "details", name: "isActive", label: "Active", type: "checkbox" }],
    recordTitle: (r) => r.shiftTypeName || r.locationName || "Shift Schedule",
    toForm: (data) => ({ ...data,  repeatOnDays: data.repeatOnDays || [], shiftTypeId: refId(data.shiftTypeId), companyId: refId(data.companyId) }),
    toPayload: (values) => Object.fromEntries(Object.entries(values).filter(([key]) => ["frequency", "repeatOnDays", "shiftTypeId", "companyId", "isActive"].includes(key)).map(([key, value]) => [key, value === "" ? (key.endsWith("Id") ? null : undefined) : value])),
};

export const shiftScheduleAssignmentConfig = {
    key: "shift-schedule-assignment", path: "/shift-schedule-assignment", section: "Shift & Attendance", singular: "Shift Schedule Assignment", plural: "Shift Schedule Assignments",
    description: "Generate shift assignments from a recurring schedule. The next generation date advances after successful ranges.",
    api: { search: searchShiftScheduleAssignments, getById: getShiftScheduleAssignmentById, create: createShiftScheduleAssignment, update: updateShiftScheduleAssignment, remove: deleteShiftScheduleAssignment },
    lookups: {
        employeeId: asOptions(getAllEmployees, "employeeName"),
        shiftScheduleId: asOptions(getAllShiftSchedules, "frequency"),
        shiftLocationId: asOptions(getAllShiftLocations, "locationName"),
        companyId: asOptions(getAllCompanies, "companyName"),
    },
    sections: [{ id: "details", title: "Details" }],
    fields: [
        { name: "employeeId", label: "Employee", section: "details", type: "select", optionsFrom: "employeeId", required: true, error: "Employee is required" },
        { name: "shiftScheduleId", label: "Shift schedule", section: "details", type: "select", optionsFrom: "shiftScheduleId", required: true, error: "Shift schedule is required" },
        { name: "shiftLocationId", label: "Shift location", section: "details", type: "select", optionsFrom: "shiftLocationId" },
        { name: "enabled", label: "Enabled", section: "details", type: "checkbox", default: true },
        { name: "createShiftsAfter", label: "Create shifts after", section: "details", type: "date" },
        { name: "status", label: "Status", section: "details", type: "select", options: ["active", "inactive"], default: "active" },
        { name: "companyId", label: "Company", section: "details", type: "select", optionsFrom: "companyId" },
        { name: "isActive", label: "Is active", section: "details", type: "checkbox", default: true, required: true, error: "Is active is required" },
    ],
    filterFields: [
        { name: "employeeId", label: "Employee id", type: "objectId" },
        { name: "shiftScheduleId", label: "Shift schedule id", type: "objectId" },
        { name: "shiftLocationId", label: "Shift location id", type: "objectId" },
        { name: "enabled", label: "Enabled", type: "boolean" },
        { name: "createShiftsAfter", label: "Create shifts after", type: "date" },
        { name: "status", label: "Status", type: "string" },
        { name: "companyId", label: "Company id", type: "objectId" },
        { name: "isActive", label: "Is active", type: "boolean" },
        { name: "createdAt", label: "Created at", type: "date" },
    ],
    columns: [
        { name: "Employee", selector: (row) => row.employeeIdLabel || "—", sortable: true, sortField: "employeeId" },
        { name: "Enabled", selector: (row) => String(row.enabled ?? "—"), sortable: true, sortField: "enabled" },
        { name: "Status", selector: (row) => String(row.status ?? "—"), sortable: true, sortField: "status" },
    ],
    recordTitle: (r) => r.shiftTypeName || r.locationName || "Shift Schedule Assignment",
    toForm: (data) => ({ ...data, createShiftsAfter: data.createShiftsAfter?.slice(0, 10) || "",  employeeId: refId(data.employeeId), shiftScheduleId: refId(data.shiftScheduleId), shiftLocationId: refId(data.shiftLocationId), companyId: refId(data.companyId) }),
    toPayload: (values) => Object.fromEntries(Object.entries(values).filter(([key]) => ["employeeId", "shiftScheduleId", "shiftLocationId", "enabled", "createShiftsAfter", "status", "companyId", "isActive"].includes(key)).map(([key, value]) => [key, value === "" ? (key.endsWith("Id") ? null : undefined) : value])),
    renderExtra: ({ mode, id }) => mode === "edit" && id ? <GenerateShiftsPanel id={id} /> : null,
};

export const employeeCheckinConfig = {
    key: "employee-checkin", path: "/employee-checkin", section: "Shift & Attendance", singular: "Employee Checkin", plural: "Employee Checkins",
    description: "Record an employee punch. The assigned shift and optional location determine whether it counts.",
    api: { search: searchEmployeeCheckins, getById: getEmployeeCheckinById, create: createEmployeeCheckin, update: updateEmployeeCheckin, remove: deleteEmployeeCheckin },
    lookups: {
        employeeId: asOptions(getAllEmployees, "employeeName"),
        companyId: asOptions(getAllCompanies, "companyName"),
    },
    sections: [{ id: "details", title: "Details" }],
    fields: [
        { name: "shiftId", label: "Resolved shift", type: "select", optionsFrom: "shiftId", section: "details", hideIn: ["add", "edit"] },
        { name: "offshift", label: "Off shift", type: "checkbox", section: "details", hideIn: ["add", "edit"] },
        { name: "attendanceLinked", label: "Linked to attendance", type: "checkbox", section: "details", hideIn: ["add", "edit"] },
        { name: "employeeId", label: "Employee", section: "details", type: "select", optionsFrom: "employeeId", required: true, error: "Employee is required" },
        { name: "time", label: "Time", section: "details", type: "datetime-local", disabled: (values) => Boolean(values.attendanceId), hint: "UTC timestamp. Leave blank to use the current time." },
        { name: "logType", label: "Log type", section: "details", type: "select", options: ["IN", "OUT", null]},
        { name: "skipAutoAttendance", label: "Skip auto attendance", section: "details", type: "checkbox", default: false },
        { name: "latitude", label: "Latitude", section: "details", type: "number" },
        { name: "longitude", label: "Longitude", section: "details", type: "number" },
        { name: "companyId", label: "Company", section: "details", type: "select", optionsFrom: "companyId" },
        { name: "isActive", label: "Is active", section: "details", type: "checkbox", default: true, required: true, error: "Is active is required" },
    ],
    filterFields: [
        { name: "employeeId", label: "Employee id", type: "objectId" },
        { name: "shiftId", label: "Shift id", type: "objectId" },
        { name: "attendanceId", label: "Attendance id", type: "objectId" },
        { name: "time", label: "Time", type: "date" },
        { name: "logType", label: "Log type", type: "string" },
        { name: "deviceId", label: "Device id", type: "objectId" },
        { name: "skipAutoAttendance", label: "Skip auto attendance", type: "boolean" },
        { name: "offshift", label: "Offshift", type: "boolean" },
        { name: "companyId", label: "Company id", type: "objectId" },
        { name: "isActive", label: "Is active", type: "boolean" },
        { name: "createdAt", label: "Created at", type: "date" },
    ],
    columns: [
        { name: "Employee", selector: (row) => row.employeeIdLabel || "—", sortable: true, sortField: "employeeId" },
        { name: "Shift", selector: (row) => row.shiftIdLabel || "—", sortable: true, sortField: "shiftId" },
        { name: "Time", selector: (row) => String(row.time ?? "—"), sortable: true, sortField: "time" },
        { name: "Offshift", selector: (row) => String(row.offshift ?? "—"), sortable: true, sortField: "offshift" },
    ],
    toView: (data) => ({ ...data, attendanceLinked: Boolean(data.attendanceId) }),
    recordTitle: (r) => r.shiftTypeName || r.locationName || "Employee Checkin",
    toForm: (data) => ({ ...data, time: data.time?.slice(0, 16) || "",  employeeId: refId(data.employeeId), shiftId: refId(data.shiftId), companyId: refId(data.companyId) }),
    toPayload: (values) => Object.fromEntries(Object.entries(values).filter(([key]) => ["employeeId", "time", "logType", "deviceId", "skipAutoAttendance", "latitude", "longitude", "companyId", "isActive"].includes(key)).map(([key, value]) => [key, value === "" ? (key.endsWith("Id") ? null : undefined) : value])),
};

export const shiftRequestConfig = {
    key: "shift-request", path: "/shift-request", section: "Shift & Attendance", singular: "Shift Request", plural: "Shift Requests",
    description: "Request a shift change for a date range. The Shift Approver is resolved automatically (your own Shift Approver, else your Department's) unless you set one explicitly. Approving creates the real Shift Assignment; rejecting has no side effects.",
    api: { search: searchShiftRequests, getById: getShiftRequestById, create: createShiftRequest, update: updateShiftRequest },
    lookups: {
        employeeId: asOptions(getAllEmployees, "employeeName"),
        shiftTypeId: asOptions(getAllShiftTypes, "shiftTypeName"),
        approverId: asOptions(getAllUsers, "userName"),
    },
    sections: [{ id: "details", title: "Details" }, { id: "status", title: "Status" }],
    fields: [
        { name: "employeeId", icon: User01, label: "Employee", section: "details", type: "select", optionsFrom: "employeeId", required: true, error: "Employee is required" },
        { name: "shiftTypeId", icon: Tag01, label: "Shift type", section: "details", type: "select", optionsFrom: "shiftTypeId", required: true, error: "Shift type is required" },
        { name: "fromDate", label: "From date", section: "details", type: "date", required: true, error: "From date is required" },
        { name: "toDate", label: "To date (leave blank for open-ended)", section: "details", type: "date" },
        { name: "approverId", label: "Shift approver (leave blank to auto-resolve)", section: "details", type: "select", optionsFrom: "approverId" },
        { name: "status", label: "Status", section: "status", type: "select", options: ["open", "approved", "rejected"], disabled: () => true, hint: "Set by the Approve/Reject actions below." },
    ],
    renderExtra: ({ mode, id, values }) => (
        mode === "edit" && id && values.status === "open" && (
            <>
                <SimpleActionButton
                    label="Approve" description="Creates the real Shift Assignment for this employee, date range and shift type — through the same write-locked path as a manual assignment."
                    onRun={() => approveShiftRequest(id)}
                    onResult={() => window.location.reload()}
                />
                <SimpleActionButton
                    label="Reject" description="No side effects."
                    onRun={() => rejectShiftRequest(id)}
                    onResult={() => window.location.reload()}
                />
            </>
        )
    ),
    filterFields: [
        { name: "employeeId", label: "Employee id", type: "objectId" },
        { name: "shiftTypeId", label: "Shift type id", type: "objectId" },
        { name: "companyId", label: "Company id", type: "objectId" },
        { name: "approverId", label: "Approver id", type: "objectId" },
        { name: "status", label: "Status", type: "string" },
        { name: "fromDate", label: "From date", type: "date" },
        { name: "toDate", label: "To date", type: "date" },
        { name: "createdAt", label: "Created at", type: "date" },
    ],
    columns: [
        { name: "Employee", selector: (row) => row.employeeIdLabel || "—", sortable: true, sortField: "employeeId" },
        { name: "Shift type", selector: (row) => row.shiftTypeIdLabel || "—", sortable: true, sortField: "shiftTypeId" },
        { name: "From date", selector: (row) => String(row.fromDate ?? "—"), sortable: true, sortField: "fromDate" },
        { name: "To date", selector: (row) => row.toDate ? String(row.toDate) : "open-ended", sortable: true, sortField: "toDate" },
        { name: "Status", selector: (row) => String(row.status ?? "—"), sortable: true, sortField: "status" },
    ],
    recordTitle: (r) => `Shift Request — ${r._id}`,
    toForm: (data) => ({ ...data, fromDate: data.fromDate?.slice(0, 10) || "", toDate: data.toDate?.slice(0, 10) || "", employeeId: refId(data.employeeId), shiftTypeId: refId(data.shiftTypeId), approverId: refId(data.approverId) }),
    toPayload: (values) => Object.fromEntries(Object.entries(values).filter(([key]) => ["shiftTypeId", "employeeId", "companyId", "approverId", "fromDate", "toDate"].includes(key)).map(([key, value]) => [key, value === "" ? (key.endsWith("Id") ? null : undefined) : value])),
};

export const attendanceRequestConfig = {
    key: "attendance-request", path: "/attendance-request", section: "Shift & Attendance", singular: "Attendance Request", plural: "Attendance Requests",
    description: "Create is the action — saving writes or updates one Attendance record per day in the range (skipping holidays unless Include Holidays is checked, and skipping any day already covered by an approved leave). Cancel reverses exactly the Attendance rows this request created.",
    api: { search: searchAttendanceRequests, getById: getAttendanceRequestById, create: createAttendanceRequest, update: updateAttendanceRequest },
    lookups: {
        employeeId: asOptions(getAllEmployees, "employeeName"),
    },
    sections: [{ id: "details", title: "Details" }, { id: "status", title: "Status" }],
    fields: [
        { name: "employeeId", icon: User01, label: "Employee", section: "details", type: "select", optionsFrom: "employeeId", required: true, error: "Employee is required" },
        { name: "fromDate", label: "From date", section: "details", type: "date", required: true, error: "From date is required" },
        { name: "toDate", label: "To date", section: "details", type: "date", required: true, error: "To date is required" },
        { name: "reason", icon: Type01, label: "Reason", section: "details", type: "select", options: ["Work From Home", "On Duty"], required: true, error: "Reason is required" },
        { name: "halfDay", label: "Half day", section: "details", type: "checkbox" },
        { name: "halfDayDate", label: "Half day date", section: "details", type: "date", disabled: (values) => !values.halfDay },
        { name: "includeHolidays", label: "Include holidays", section: "details", type: "checkbox", hint: "Select if any of the days in this request are holidays." },
        { name: "explanation", label: "Explanation", section: "details", type: "textarea" },
        { name: "status", label: "Status", section: "status", type: "select", options: ["active", "cancelled"], disabled: () => true, hint: "Set by the Cancel action below." },
    ],
    renderExtra: ({ mode, id, values }) => (
        mode === "edit" && id && values.status === "active" && (
            <SimpleActionButton
                label="Cancel" description="Soft-deletes the specific Attendance rows this request created."
                onRun={() => cancelAttendanceRequest(id)}
                onResult={() => window.location.reload()}
            />
        )
    ),
    filterFields: [
        { name: "employeeId", label: "Employee id", type: "objectId" },
        { name: "companyId", label: "Company id", type: "objectId" },
        { name: "status", label: "Status", type: "string" },
        { name: "reason", label: "Reason", type: "string" },
        { name: "fromDate", label: "From date", type: "date" },
        { name: "toDate", label: "To date", type: "date" },
        { name: "createdAt", label: "Created at", type: "date" },
    ],
    columns: [
        { name: "Employee", selector: (row) => row.employeeIdLabel || "—", sortable: true, sortField: "employeeId" },
        { name: "From date", selector: (row) => String(row.fromDate ?? "—"), sortable: true, sortField: "fromDate" },
        { name: "To date", selector: (row) => String(row.toDate ?? "—"), sortable: true, sortField: "toDate" },
        { name: "Reason", selector: (row) => String(row.reason ?? "—"), sortable: true, sortField: "reason" },
        { name: "Status", selector: (row) => String(row.status ?? "—"), sortable: true, sortField: "status" },
    ],
    recordTitle: (r) => `Attendance Request — ${r._id}`,
    toForm: (data) => ({ ...data, fromDate: data.fromDate?.slice(0, 10) || "", toDate: data.toDate?.slice(0, 10) || "", halfDayDate: data.halfDayDate?.slice(0, 10) || "", employeeId: refId(data.employeeId) }),
    toPayload: (values) => Object.fromEntries(Object.entries(values).filter(([key]) => ["employeeId", "companyId", "fromDate", "toDate", "halfDay", "includeHolidays", "halfDayDate", "reason", "explanation"].includes(key)).map(([key, value]) => [key, value === "" ? (key.endsWith("Id") ? null : undefined) : value])),
};

// ---------------------------------------------------------------------------
// Payroll — Structure & Assignment (ADR-026). SalaryComponent is a plain
// master; SalaryStructure's three component tables (earnings/deductions/
// employerContributions) reuse SimpleArrayField the same way modules 4-6's
// nested-row screens do (AGENTS.md #2). The row-level flag fields
// (statisticalComponent, isTaxApplicable, ...) copied from the referenced
// SalaryComponent at row-creation time (ADR-026: a one-time snapshot, not a
// live join) are NOT exposed as editable checkboxes here — SimpleArrayField
// defaults every checkbox column to false on a new row, which would silently
// override a component's real default (e.g. statisticalComponent: true)
// unless a user remembered to tick it — so this screen only edits the truly
// author-facing fields per row (salaryComponentId, amount, formula,
// condition, amountBasedOnFormula); the flags themselves remain ordinary
// schema fields any direct API caller can still set explicitly.
// totalEarning/totalDeduction/netPay (Structure) and annualGrossEarning/ctc
// (Assignment) are server-computed and shown read-only via viewFields.
// ---------------------------------------------------------------------------

const SALARY_DETAIL_COLUMNS = [
    { name: "salaryComponentId", label: "Salary Component id", type: "text" },
    { name: "amount", label: "Amount", type: "number" },
    { name: "amountBasedOnFormula", label: "Amount based on formula", type: "checkbox" },
    { name: "formula", label: "Formula", type: "text" },
    { name: "condition", label: "Condition", type: "text" },
];

export const salaryComponentConfig = {
    key: "salary-component",
    path: "/salary-component",
    section: "Payroll",
    singular: "Salary Component",
    plural: "Salary Components",
    description: "A reusable pay line item (Basic Salary, HRA, PF, TDS, ...) addable to any Salary Structure.",
    api: { search: searchSalaryComponents, getById: getSalaryComponentById, create: createSalaryComponent, update: updateSalaryComponent, remove: deleteSalaryComponent },
    lookups: { companyId: asOptions(getAllCompanies, "companyName") },
    sections: [{ id: "details", title: "Component details" }, { id: "flags", title: "Flags" }, { id: "status", title: "Status" }],
    fields: [
        { name: "salaryComponentName", label: "Name", icon: Tag01, section: "details", type: "text", required: true, error: "Name is required" },
        { name: "abbreviation", label: "Abbreviation", section: "details", type: "text", hint: "Leave blank to auto-derive from the name's initials (e.g. \"Basic Salary\" -> \"BS\"), de-duplicated within the company." },
        { name: "type", label: "Type", section: "details", type: "select", options: ["Earning", "Deduction", "Employer Contribution"], required: true, error: "Type is required" },
        { name: "companyId", label: "Company", section: "details", type: "select", optionsFrom: "companyId", required: true, error: "Company is required" },
        { name: "isTaxApplicable", label: "Is tax applicable", section: "flags", type: "checkbox", default: false },
        { name: "dependsOnPaymentDays", label: "Depends on payment days", section: "flags", type: "checkbox", default: false },
        { name: "doNotIncludeInTotal", label: "Do not include in total", section: "flags", type: "checkbox", default: false },
        { name: "statisticalComponent", label: "Statistical component", section: "flags", type: "checkbox", default: false, hint: "Value is referenceable by other components' formulas but never contributes to earnings/deductions totals." },
        { name: "roundToNearestInteger", label: "Round to nearest integer", section: "flags", type: "checkbox", default: false },
        { name: "exemptedFromIncomeTax", label: "Exempted from income tax", section: "flags", type: "checkbox", default: false },
        { name: "removeIfZeroValued", label: "Remove if zero valued", section: "flags", type: "checkbox", default: false },
        { name: "variableBasedOnTaxableSalary", label: "Variable based on taxable salary", section: "flags", type: "checkbox", default: false, hint: "Mutually exclusive with Arrear Component." },
        { name: "arrearComponent", label: "Arrear component", section: "flags", type: "checkbox", default: false, hint: "Mutually exclusive with Variable Based On Taxable Salary." },
        { name: "accrualComponent", label: "Accrual component", section: "flags", type: "checkbox", default: false, hint: "Only valid when Type is Earning." },
        ACTIVE,
    ],
    filterFields: [
        { name: "salaryComponentName", label: "Name", type: "string" },
        { name: "abbreviation", label: "Abbreviation", type: "string" },
        { name: "type", label: "Type", type: "string" },
        { name: "companyId", label: "Company", type: "objectId" },
        { name: "isActive", label: "Active", type: "boolean" },
        { name: "createdAt", label: "Created", type: "date" },
    ],
    columns: [
        { name: "Name", selector: (row) => row.salaryComponentName, sortable: true, sortField: "salaryComponentName", minWidth: "200px" },
        { name: "Abbreviation", selector: (row) => row.abbreviation, sortable: true, sortField: "abbreviation" },
        { name: "Type", selector: (row) => row.type, sortable: true, sortField: "type" },
        { name: "Status", selector: (row) => (row.isActive ? "Active" : "Inactive") },
    ],
    recordTitle: (r) => r.salaryComponentName,
    toForm: (data) => ({ ...data, companyId: refId(data.companyId) }),
};

export const salaryStructureConfig = {
    key: "salary-structure",
    path: "/salary-structure",
    section: "Payroll",
    singular: "Salary Structure",
    plural: "Salary Structures",
    description: "A pay template — earnings, deductions and employer contributions — assignable to employees.",
    api: { search: searchSalaryStructures, getById: getSalaryStructureById, create: createSalaryStructure, update: updateSalaryStructure, remove: deleteSalaryStructure },
    lookups: { companyId: asOptions(getAllCompanies, "companyName") },
    sections: [
        { id: "details", title: "Structure details" },
        { id: "earnings", title: "Earnings" },
        { id: "deductions", title: "Deductions" },
        { id: "employerContributions", title: "Employer Contributions" },
        { id: "totals", title: "Totals (computed)" },
        { id: "status", title: "Status" },
    ],
    fields: [
        { name: "companyId", label: "Company", section: "details", type: "select", optionsFrom: "companyId", required: true, error: "Company is required" },
        { name: "payrollFrequency", label: "Payroll frequency", section: "details", type: "select", options: ["Monthly", "Fortnightly", "Bimonthly", "Weekly", "Daily"], required: true, error: "Payroll frequency is required" },
        { name: "currency", label: "Currency", section: "details", type: "text", required: true, error: "Currency is required", placeholder: "e.g. INR" },
        { name: "leaveEncashmentAmountPerDay", label: "Leave encashment amount per day", section: "details", type: "number", hint: "Optional — carried onto every Salary Structure Assignment referencing this structure unless overridden there." },
        ACTIVE,
    ],
    viewFields: [
        { name: "companyId", label: "Company", section: "details", type: "select", optionsFrom: "companyId" },
        { name: "payrollFrequency", label: "Payroll frequency", section: "details", type: "text" },
        { name: "currency", label: "Currency", section: "details", type: "text" },
        { name: "leaveEncashmentAmountPerDay", label: "Leave encashment amount per day", section: "details", type: "number" },
        { name: "totalEarning", label: "Total earning", section: "totals", type: "number" },
        { name: "totalDeduction", label: "Total deduction", section: "totals", type: "number" },
        { name: "netPay", label: "Net pay", section: "totals", type: "number" },
        ACTIVE,
    ],
    renderExtra: ({ values, setValues }) => (
        <>
            <SimpleArrayField title="Earnings" description="Paste a Salary Component's id into each row." fieldName="earnings" columns={SALARY_DETAIL_COLUMNS} values={values} setValues={setValues} />
            <SimpleArrayField title="Deductions" description="Paste a Salary Component's id into each row." fieldName="deductions" columns={SALARY_DETAIL_COLUMNS} values={values} setValues={setValues} />
            <SimpleArrayField title="Employer Contributions" description="Paste a Salary Component's id into each row." fieldName="employerContributions" columns={SALARY_DETAIL_COLUMNS} values={values} setValues={setValues} />
        </>
    ),
    filterFields: [
        { name: "companyId", label: "Company", type: "objectId" },
        { name: "payrollFrequency", label: "Payroll frequency", type: "string" },
        { name: "isActive", label: "Active", type: "boolean" },
        { name: "createdAt", label: "Created", type: "date" },
    ],
    columns: [
        { name: "Company", selector: (row) => row.companyIdLabel || "—", sortable: true, sortField: "companyId" },
        { name: "Payroll frequency", selector: (row) => row.payrollFrequency, sortable: true, sortField: "payrollFrequency" },
        { name: "Net pay", selector: (row) => row.netPay ?? "—" },
        { name: "Status", selector: (row) => (row.isActive ? "Active" : "Inactive") },
    ],
    recordTitle: (r) => `Salary Structure — ${r.payrollFrequency || r._id}`,
    toForm: (data) => ({
        ...data,
        companyId: refId(data.companyId),
        earnings: (data.earnings || []).map((row) => ({ ...row, salaryComponentId: refId(row.salaryComponentId) })),
        deductions: (data.deductions || []).map((row) => ({ ...row, salaryComponentId: refId(row.salaryComponentId) })),
        employerContributions: (data.employerContributions || []).map((row) => ({ ...row, salaryComponentId: refId(row.salaryComponentId) })),
    }),
};

export const salaryStructureAssignmentConfig = {
    key: "salary-structure-assignment",
    path: "/salary-structure-assignment",
    section: "Payroll",
    singular: "Salary Structure Assignment",
    plural: "Salary Structure Assignments",
    description: "Assigns a Salary Structure to one employee from a given date.",
    api: {
        search: searchSalaryStructureAssignments, getById: getSalaryStructureAssignmentById,
        create: createSalaryStructureAssignment, update: updateSalaryStructureAssignment, remove: deleteSalaryStructureAssignment,
    },
    lookups: {
        employeeId: asOptions(getAllEmployees, "employeeName"),
        salaryStructureId: asOptions(getAllSalaryStructures, "currency"),
        incomeTaxSlabId: asOptions(getAllIncomeTaxSlabs, "name"),
    },
    sections: [{ id: "details", title: "Assignment details" }, { id: "computed", title: "Computed (read-only)" }],
    fields: [
        { name: "employeeId", label: "Employee", section: "details", type: "select", optionsFrom: "employeeId", required: true, error: "Employee is required" },
        { name: "salaryStructureId", label: "Salary Structure", section: "details", type: "select", optionsFrom: "salaryStructureId", required: true, error: "Salary Structure is required" },
        { name: "fromDate", label: "From date", section: "details", type: "date", required: true, error: "From date is required" },
        { name: "incomeTaxSlabId", label: "Income Tax Slab", section: "details", type: "select", optionsFrom: "incomeTaxSlabId", hint: "Required if structure contains a tax deduction component." },
        { name: "base", label: "Base", section: "details", type: "number", hint: "Used by any formula referencing \"base\"." },
        { name: "variable", label: "Variable", section: "details", type: "number", hint: "Used by any formula referencing \"variable\"." },
        { name: "taxDeductedTillDate", label: "Tax Deducted Till Date", section: "details", type: "number", hint: "Opening balance of tax paid this fiscal year." },
        { name: "taxableEarningsTillDate", label: "Taxable Earnings Till Date", section: "details", type: "number", hint: "Opening balance of taxable earnings this fiscal year." },
        { name: "leaveEncashmentAmountPerDay", label: "Leave encashment amount per day", section: "details", type: "number", hint: "Leave blank to use the Salary Structure's own rate." },
    ],
    viewFields: [
        { name: "employeeId", label: "Employee", section: "details", type: "select", optionsFrom: "employeeId" },
        { name: "salaryStructureId", label: "Salary Structure", section: "details", type: "select", optionsFrom: "salaryStructureId" },
        { name: "incomeTaxSlabId", label: "Income Tax Slab", section: "details", type: "select", optionsFrom: "incomeTaxSlabId" },
        { name: "fromDate", label: "From date", section: "details", type: "date" },
        { name: "base", label: "Base", section: "details", type: "number" },
        { name: "variable", label: "Variable", section: "details", type: "number" },
        { name: "taxDeductedTillDate", label: "Tax Deducted Till Date", section: "details", type: "number" },
        { name: "taxableEarningsTillDate", label: "Taxable Earnings Till Date", section: "details", type: "number" },
        { name: "currency", label: "Currency", section: "computed", type: "text" },
        { name: "leaveEncashmentAmountPerDay", label: "Leave encashment amount per day", section: "computed", type: "number" },
        { name: "annualGrossEarning", label: "Annual gross earning", section: "computed", type: "number" },
        { name: "ctc", label: "CTC", section: "computed", type: "number" },
    ],
    filterFields: [
        { name: "employeeId", label: "Employee", type: "objectId" },
        { name: "salaryStructureId", label: "Salary Structure", type: "objectId" },
        { name: "incomeTaxSlabId", label: "Income Tax Slab", type: "objectId" },
        { name: "fromDate", label: "From date", type: "date" },
        { name: "companyId", label: "Company", type: "objectId" },
        { name: "createdAt", label: "Created", type: "date" },
    ],
    columns: [
        { name: "Employee", selector: (row) => row.employeeIdLabel || "—", sortable: true, sortField: "employeeId" },
        { name: "From date", selector: (row) => String(row.fromDate ?? "—"), sortable: true, sortField: "fromDate" },
        { name: "CTC", selector: (row) => row.ctc ?? "—" },
    ],
    recordTitle: (r) => `Salary Structure Assignment — ${r._id}`,
    toForm: (data) => ({ ...data, fromDate: data.fromDate?.slice(0, 10) || "", employeeId: refId(data.employeeId), salaryStructureId: refId(data.salaryStructureId), incomeTaxSlabId: refId(data.incomeTaxSlabId) }),
};

// ---------------------------------------------------------------------------
// Payroll — Run, foundation half (ADR-027). PayrollPeriod is plain CRUD.
// SalarySlip is create-only from the admin's point of view — every figure on
// it (payment days, the three component tables, the leave snapshot, the
// totals) is server-computed once at creation and never edited afterward
// (a point-in-time snapshot, matching ADR-026's own "historical rows don't
// retroactively change" reasoning). Submit/Cancel are the only two actions,
// the same SimpleActionButton pattern Shift Request/Leave Encashment use.
// Its `update` endpoint accepts no fields at all (toPayload always sends
// `{}`) — it exists only so the admin's generic edit route has something to
// call; there is no real edit-in-place.
// ---------------------------------------------------------------------------

export const payrollPeriodConfig = {
    key: "payroll-period",
    path: "/payroll-period",
    section: "Payroll",
    singular: "Payroll Period",
    plural: "Payroll Periods",
    description: "A company-scoped date range payroll runs against — also used to resolve which dates are holidays for a Salary Slip.",
    api: {
        search: searchPayrollPeriods, getById: getPayrollPeriodById,
        create: createPayrollPeriod, update: updatePayrollPeriod, remove: deletePayrollPeriod,
    },
    lookups: { companyId: asOptions(getAllCompanies, "companyName") },
    sections: [{ id: "details", title: "Period details" }, { id: "status", title: "Status" }],
    fields: [
        { name: "companyId", label: "Company", section: "details", type: "select", optionsFrom: "companyId", required: true, error: "Company is required" },
        { name: "startDate", label: "Start date", section: "details", type: "date", required: true, error: "Start date is required" },
        { name: "endDate", label: "End date", section: "details", type: "date", required: true, error: "End date is required" },
        ACTIVE,
    ],
    filterFields: [
        { name: "companyId", label: "Company", type: "objectId" },
        { name: "startDate", label: "Start date", type: "date" },
        { name: "endDate", label: "End date", type: "date" },
        { name: "isActive", label: "Active", type: "boolean" },
        { name: "createdAt", label: "Created", type: "date" },
    ],
    columns: [
        { name: "Company", selector: (row) => row.companyIdLabel || "—", sortable: true, sortField: "companyId" },
        { name: "Start date", selector: (row) => String(row.startDate ?? "—").slice(0, 10), sortable: true, sortField: "startDate" },
        { name: "End date", selector: (row) => String(row.endDate ?? "—").slice(0, 10), sortable: true, sortField: "endDate" },
        { name: "Status", selector: (row) => (row.isActive ? "Active" : "Inactive") },
    ],
    recordTitle: (r) => `Payroll Period — ${String(r.startDate ?? "").slice(0, 10)} to ${String(r.endDate ?? "").slice(0, 10)}`,
    toForm: (data) => ({ ...data, companyId: refId(data.companyId), startDate: data.startDate?.slice(0, 10) || "", endDate: data.endDate?.slice(0, 10) || "" }),
};

const ReadOnlyRows = ({ title, rows, columns }) => (
    <div className="border-b border-secondary p-5 last:border-b-0">
        <h3 className="text-sm font-semibold text-primary">{title}</h3>
        {(!rows || rows.length === 0) ? (
            <p className="mt-2 text-xs text-tertiary">No rows.</p>
        ) : (
            <div className="mt-2 overflow-x-auto">
                <table className="w-full text-left text-xs">
                    <thead>
                        <tr className="border-b border-secondary text-tertiary">
                            {columns.map((col) => <th key={col.label} className="py-1.5 pr-4 font-medium">{col.label}</th>)}
                        </tr>
                    </thead>
                    <tbody>
                        {rows.map((row, idx) => (
                            <tr key={row._id || idx} className="border-b border-secondary/50">
                                {columns.map((col) => <td key={col.label} className="py-1.5 pr-4 text-primary">{col.value(row)}</td>)}
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        )}
    </div>
);

const componentLabel = (row) => row.abbreviation || row.salaryComponentId?.abbreviation || row.salaryComponentId?.salaryComponentName || row.salaryComponentId || "—";
const SALARY_DETAIL_VIEW_COLUMNS = [
    { label: "Component", value: componentLabel },
    { label: "Amount", value: (row) => row.defaultAmount ?? row.amount ?? 0 },
    { label: "Skipped (condition false)", value: (row) => (row._skipped ? "Yes" : "No") },
];

export const salarySlipConfig = {
    key: "salary-slip",
    path: "/salary-slip",
    section: "Payroll",
    singular: "Salary Slip",
    plural: "Salary Slips",
    description: "One payslip for one employee for one period, computed once from their current Salary Structure Assignment plus their actual attendance/leave for that period. Create is the action — every figure below is server-computed and never edited afterward; Submit and Cancel are the only two actions.",
    api: {
        search: searchSalarySlips, getById: getSalarySlipById,
        create: createSalarySlip, update: updateSalarySlip, remove: deleteSalarySlip,
    },
    lookups: {
        employeeId: asOptions(getAllEmployees, "employeeName"),
        salaryStructureAssignmentId: asOptions(getAllSalaryStructureAssignments, "currency"),
    },
    sections: [
        { id: "details", title: "Slip details" },
        { id: "payment-days", title: "Payment days (computed)" },
        { id: "totals", title: "Totals (computed)" },
        { id: "status", title: "Status" },
    ],
    fields: [
        { name: "employeeId", label: "Employee", section: "details", type: "select", optionsFrom: "employeeId", required: true, error: "Employee is required" },
        { name: "startDate", label: "Start date", section: "details", type: "date", required: true, error: "Start date is required" },
        { name: "endDate", label: "End date", section: "details", type: "date", required: true, error: "End date is required" },
        { name: "salaryStructureAssignmentId", label: "Salary Structure Assignment (blank = auto-resolve the employee's current one)", section: "details", type: "select", optionsFrom: "salaryStructureAssignmentId" },
    ],
    viewFields: [
        { name: "employeeId", label: "Employee", section: "details", type: "select", optionsFrom: "employeeId" },
        { name: "startDate", label: "Start date", section: "details", type: "date" },
        { name: "endDate", label: "End date", section: "details", type: "date" },
        { name: "workingDays", label: "Working days", section: "payment-days", type: "number" },
        { name: "totalWorkingDays", label: "Total working days", section: "payment-days", type: "number" },
        { name: "paymentDays", label: "Payment days", section: "payment-days", type: "number" },
        { name: "lwpDays", label: "LWP days", section: "payment-days", type: "number" },
        { name: "absentDays", label: "Absent days", section: "payment-days", type: "number" },
        { name: "halfDayDays", label: "Half days", section: "payment-days", type: "number" },
        { name: "grossPay", label: "Gross pay", section: "totals", type: "number" },
        { name: "totalDeduction", label: "Total deduction", section: "totals", type: "number" },
        { name: "netPay", label: "Net pay", section: "totals", type: "number" },
        { name: "displayStatus", label: "Status", section: "status", type: "text" },
    ],
    renderExtra: ({ mode, id, values }) => (
        <>
            {mode !== "add" && (
                <>
                    <ReadOnlyRows title="Earnings" rows={values.earnings} columns={SALARY_DETAIL_VIEW_COLUMNS} />
                    <ReadOnlyRows title="Deductions" rows={values.deductions} columns={SALARY_DETAIL_VIEW_COLUMNS} />
                    <ReadOnlyRows title="Employer Contributions" rows={values.employerContributions} columns={SALARY_DETAIL_VIEW_COLUMNS} />
                    <ReadOnlyRows
                        title="Leave balances (as of end date)"
                        rows={values.leaves}
                        columns={[
                            { label: "Leave Type", value: (row) => row.leaveTypeId?.leaveTypeName || row.leaveTypeId || "—" },
                            { label: "Allocated", value: (row) => row.allocated ?? 0 },
                            { label: "Used", value: (row) => row.used ?? 0 },
                            { label: "Available", value: (row) => row.available ?? 0 },
                        ]}
                    />
                </>
            )}
            {mode === "edit" && id && values.status === "draft" && (
                <>
                    <SimpleActionButton
                        label="Submit" description="Re-validates Net Pay >= 0 (a draft may be negative; submitting is what enforces it) and flips status to Submitted."
                        onRun={() => submitSalarySlip(id)}
                        onResult={() => window.location.reload()}
                    />
                    <SimpleActionButton
                        label="Cancel" description="Status flip only — no GL or ledger reversal."
                        onRun={() => cancelSalarySlip(id)}
                        onResult={() => window.location.reload()}
                    />
                </>
            )}
        </>
    ),
    filterFields: [
        { name: "employeeId", label: "Employee", type: "objectId" },
        { name: "companyId", label: "Company", type: "objectId" },
        { name: "startDate", label: "Start date", type: "date" },
        { name: "endDate", label: "End date", type: "date" },
        { name: "status", label: "Status", type: "string" },
        { name: "createdAt", label: "Created", type: "date" },
    ],
    columns: [
        { name: "Employee", selector: (row) => row.employeeIdLabel || "—", sortable: true, sortField: "employeeId" },
        { name: "Start date", selector: (row) => String(row.startDate ?? "—").slice(0, 10), sortable: true, sortField: "startDate" },
        { name: "End date", selector: (row) => String(row.endDate ?? "—").slice(0, 10), sortable: true, sortField: "endDate" },
        { name: "Net pay", selector: (row) => row.netPay ?? "—" },
        { name: "Status", selector: (row) => row.displayStatus || row.status, sortable: true, sortField: "status" },
    ],
    recordTitle: (r) => `Salary Slip — ${String(r.startDate ?? "").slice(0, 10)} to ${String(r.endDate ?? "").slice(0, 10)}`,
    toForm: (data) => ({
        ...data,
        employeeId: refId(data.employeeId),
        salaryStructureAssignmentId: refId(data.salaryStructureAssignmentId),
        startDate: data.startDate?.slice(0, 10) || "",
        endDate: data.endDate?.slice(0, 10) || "",
    }),
    toPayload: (values, mode) => (mode === "edit"
        ? {} // read-only snapshot — no field can actually change through Save
        : Object.fromEntries(Object.entries(values).filter(([key]) => ["employeeId", "startDate", "endDate", "salaryStructureAssignmentId"].includes(key)).map(([key, value]) => [key, value === "" ? (key.endsWith("Id") ? null : undefined) : value]))),
};

export const payrollEntryConfig = {
    key: "payroll-entry", path: "/payroll-entry", section: "Payroll", singular: "Payroll Entry", plural: "Payroll Entries",
    description: "Stored payroll batches with an outcome for every employee.",
    api: { search: searchPayrollEntries, remove: deletePayrollEntry },
    columns: [
        { name: "Company", selector: row => row.recordLabel },
        { name: "Start date", selector: row => row.startDate?.slice(0, 10), sortable: true, sortField: "startDate" },
        { name: "End date", selector: row => row.endDate?.slice(0, 10) },
        { name: "Frequency", selector: row => row.payrollFrequency },
        { name: "Status", selector: row => row.status },
    ],
    filterFields: [
        { name: "companyId", label: "Company", type: "objectId" },
        { name: "startDate", label: "Start date", type: "date" },
        { name: "endDate", label: "End date", type: "date" },
        { name: "payrollFrequency", label: "Frequency", type: "string" },
        { name: "status", label: "Status", type: "string" },
        { name: "createdAt", label: "Created", type: "date" },
    ],
    filterLookups: { companyId: asOptions(getAllCompanies, "companyName") },
};

export const salaryWithholdingConfig = {
    key: "salary-withholding", path: "/salary-withholding", section: "Payroll", singular: "Salary Withholding", plural: "Salary Withholdings",
    description: "Withhold salary for frequency-sized cycles, then manually record each release.",
    api: { search: searchSalaryWithholdings, create: createSalaryWithholding, getById: getSalaryWithholding, update: updateSalaryWithholding, remove: deleteSalaryWithholding },
    lookups: { employeeId: asOptions(getAllEmployees, "employeeName") },
    sections: [{ id: "details", title: "Withholding details" }],
    fields: [
        { name: "employeeId", label: "Employee", section: "details", type: "select", optionsFrom: "employeeId", required: true, hideIn: ["edit"] },
        { name: "fromDate", label: "From date", section: "details", type: "date", required: true, hideIn: ["edit"] },
        { name: "numberOfWithholdingCycles", label: "Number of cycles", section: "details", type: "number", required: true, min: 1, hideIn: ["edit"] },
    ],
    viewFields: [
        { name: "employeeId", label: "Employee", section: "details", type: "select", optionsFrom: "employeeId" },
        { name: "fromDate", label: "From date", section: "details", type: "date" },
        { name: "payrollFrequency", label: "Frequency", section: "details" },
        { name: "numberOfWithholdingCycles", label: "Cycles", section: "details", type: "number" },
        { name: "status", label: "Status", section: "details" },
    ],
    columns: [{ name: "Employee", selector: row => row.recordLabel }, { name: "From date", selector: row => row.fromDate?.slice(0, 10), sortable: true, sortField: "fromDate" }, { name: "Cycles", selector: row => row.numberOfWithholdingCycles }, { name: "Status", selector: row => row.status }],
    filterFields: [
        { name: "employeeId", label: "Employee", type: "objectId" }, { name: "companyId", label: "Company", type: "objectId" },
        { name: "fromDate", label: "From date", type: "date" }, { name: "payrollFrequency", label: "Frequency", type: "string" },
        { name: "numberOfWithholdingCycles", label: "Cycles", type: "number" },
        { name: "status", label: "Status", type: "string" }, { name: "createdAt", label: "Created", type: "date" },
    ],
    filterLookups: { employeeId: asOptions(getAllEmployees, "employeeName"), companyId: asOptions(getAllCompanies, "companyName") },
    recordTitle: row => `Salary Withholding — ${row.fromDate?.slice(0, 10)}`,
    toForm: data => ({ ...data, employeeId: refId(data.employeeId), fromDate: data.fromDate?.slice(0, 10) }),
    toPayload: (values, mode) => mode === "edit" ? {} : { employeeId: values.employeeId, fromDate: values.fromDate, numberOfWithholdingCycles: Number(values.numberOfWithholdingCycles) },
    renderExtra: ({ mode, id, values }) => mode !== "add" && <>
        <ReadOnlyRows title={`Cycles — ${values.status}`} rows={values.cycles} columns={[
            { label: "From", value: row => row.fromDate?.slice(0, 10) }, { label: "To", value: row => row.toDate?.slice(0, 10) },
            { label: "Released", value: row => row.isReleased ? "Yes" : "No" }, { label: "Released at", value: row => row.releasedAt?.slice(0, 10) || "—" },
            { label: "Reference", value: row => row.releaseReference || "—" },
        ]} />
        {mode === "edit" && values.status === "withheld" && <>
            {(values.cycles || []).filter(row => !row.isReleased).map(row => <SimpleActionButton key={row._id} label={`Release ${row.fromDate.slice(0, 10)} to ${row.toDate.slice(0, 10)}`} description="Manually record this salary release." onRun={() => releaseWithholdingCycle(id, { cycleId: row._id })} onResult={() => window.location.reload()} />)}
            <SimpleActionButton label="Release all cycles" description="Manually release every remaining cycle." onRun={() => releaseAllWithholdingCycles(id)} onResult={() => window.location.reload()} />
        </>}
        {mode === "edit" && values.status !== "cancelled" && <SimpleActionButton label="Cancel withholding" onRun={() => cancelSalaryWithholding(id)} onResult={() => window.location.reload()} />}
    </>,
};

// ============================================================================
// ADR-028 (Payroll — Adjustments & Incentives)
// ============================================================================

export const additionalSalaryConfig = {
    key: "additional-salary",
    path: "/additional-salary",
    section: "Payroll",
    singular: "Additional Salary",
    plural: "Additional Salaries",
    description: "Ad-hoc or recurring earnings/deductions that sit outside an employee's base Salary Structure Assignment.",
    api: {
        search: searchAdditionalSalaries,
        getById: getAdditionalSalaryById,
        create: createAdditionalSalary,
        remove: deleteAdditionalSalary,
    },
    lookups: {
        employeeId: asOptions(getAllEmployees, "employeeName"),
        salaryComponentId: asOptions(getAllSalaryComponents, "salaryComponentName"),
    },
    sections: [
        { id: "details", title: "Adjustment details" },
        { id: "dates", title: "Schedule / Dates" },
        { id: "settings", title: "Settings & Status" },
    ],
    fields: [
        { name: "employeeId", label: "Employee", section: "details", type: "select", optionsFrom: "employeeId", required: true, error: "Employee is required" },
        { name: "salaryComponentId", label: "Salary Component", section: "details", type: "select", optionsFrom: "salaryComponentId", required: true, error: "Salary Component is required" },
        { name: "amount", label: "Amount", section: "details", type: "number", required: true, error: "Amount is required" },
        { name: "isRecurring", label: "Is Recurring", section: "dates", type: "checkbox", default: false },
        { name: "payrollDate", label: "Payroll Date (one-off)", section: "dates", type: "date" },
        { name: "fromDate", label: "From Date (recurring)", section: "dates", type: "date" },
        { name: "toDate", label: "To Date (recurring)", section: "dates", type: "date" },
        { name: "overwriteSalaryStructureAmount", label: "Overwrite Salary Structure Amount", section: "settings", type: "checkbox", default: false },
        { name: "deductFullTaxOnSelectedPayrollDate", label: "Deduct Full Tax on Selected Payroll Date", section: "settings", type: "checkbox", default: false },
    ],
    columns: [
        { name: "Employee", selector: (r) => r.employeeId?.employeeName || r.employeeIdLabel || "—", sortable: true, sortField: "employeeId" },
        { name: "Component", selector: (r) => r.salaryComponentId?.salaryComponentName || r.salaryComponentIdLabel || "—" },
        { name: "Type", selector: (r) => r.type || "—" },
        { name: "Amount", selector: (r) => r.amount ?? "—" },
        { name: "Recurring", selector: (r) => (r.isRecurring ? "Yes" : "No") },
        { name: "Date", selector: (r) => (r.isRecurring ? `${String(r.fromDate ?? "").slice(0, 10)} to ${String(r.toDate ?? "").slice(0, 10)}` : String(r.payrollDate ?? "").slice(0, 10)) },
        { name: "Status", selector: (r) => r.status, sortable: true, sortField: "status" },
    ],
    renderExtra: ({ mode, id, values }) => (
        <>
            {mode === "edit" && id && values.status === "active" && (
                <SimpleActionButton
                    label="Cancel"
                    description="Cancels this additional salary adjustment so it will no longer be included in salary slips."
                    onRun={() => cancelAdditionalSalary(id)}
                    onResult={() => window.location.reload()}
                />
            )}
        </>
    ),
    filterFields: [
        { name: "employeeId", label: "Employee", type: "objectId" },
        { name: "salaryComponentId", label: "Salary Component", type: "objectId" },
        { name: "type", label: "Type", type: "string" },
        { name: "status", label: "Status", type: "string" },
        { name: "payrollDate", label: "Payroll date", type: "date" },
        { name: "createdAt", label: "Created", type: "date" },
    ],
    recordTitle: (r) => `Additional Salary — ${r.amount ?? ""}`,
    toForm: (data) => ({
        ...data,
        employeeId: refId(data.employeeId),
        salaryComponentId: refId(data.salaryComponentId),
        payrollDate: data.payrollDate?.slice(0, 10) || "",
        fromDate: data.fromDate?.slice(0, 10) || "",
        toDate: data.toDate?.slice(0, 10) || "",
    }),
    toPayload: (values, mode) => (mode === "edit"
        ? {}
        : {
            employeeId: values.employeeId,
            salaryComponentId: values.salaryComponentId,
            amount: Number(values.amount),
            isRecurring: Boolean(values.isRecurring),
            payrollDate: values.isRecurring ? null : (values.payrollDate || null),
            fromDate: values.isRecurring ? (values.fromDate || null) : null,
            toDate: values.isRecurring ? (values.toDate || null) : null,
            overwriteSalaryStructureAmount: Boolean(values.overwriteSalaryStructureAmount),
            deductFullTaxOnSelectedPayrollDate: Boolean(values.deductFullTaxOnSelectedPayrollDate),
        }),
};

export const arrearConfig = {
    key: "arrear",
    path: "/arrear",
    section: "Payroll",
    singular: "Arrear",
    plural: "Arrears",
    description: "Calculates retroactive salary differential pay when a Salary Structure Assignment is backdated over historical slips.",
    api: {
        search: searchArrears,
        getById: getArrearById,
        create: createArrear,
        update: updateArrear,
        remove: deleteArrear,
    },
    lookups: {
        employeeId: asOptions(getAllEmployees, "employeeName"),
    },
    sections: [
        { id: "details", title: "Arrear Window" },
        { id: "status", title: "Status" },
    ],
    fields: [
        { name: "employeeId", label: "Employee", section: "details", type: "select", optionsFrom: "employeeId", required: true, error: "Employee is required" },
        { name: "startDate", label: "Start Date (Retroactive)", section: "details", type: "date", required: true, error: "Start date is required" },
        { name: "endDate", label: "End Date (Retroactive)", section: "details", type: "date", required: true, error: "End date is required" },
        { name: "payrollDate", label: "Payroll Date (Payout)", section: "details", type: "date", required: true, error: "Payroll date is required" },
    ],
    columns: [
        { name: "Employee", selector: (r) => r.employeeId?.employeeName || r.employeeIdLabel || "—", sortable: true, sortField: "employeeId" },
        { name: "Period", selector: (r) => `${String(r.startDate ?? "").slice(0, 10)} to ${String(r.endDate ?? "").slice(0, 10)}` },
        { name: "Payroll Date", selector: (r) => String(r.payrollDate ?? "").slice(0, 10), sortable: true, sortField: "payrollDate" },
        { name: "Status", selector: (r) => r.status, sortable: true, sortField: "status" },
    ],
    renderExtra: ({ mode, id, values }) => (
        <>
            {mode !== "add" && (
                <>
                    <ReadOnlyRows
                        title="Earning Arrears"
                        rows={values.earningArrears}
                        columns={[
                            { label: "Component", value: (row) => row.salaryComponentId?.salaryComponentName || row.salaryComponentId?.abbreviation || row.salaryComponentId || "—" },
                            { label: "Amount", value: (row) => row.amount ?? 0 },
                        ]}
                    />
                    <ReadOnlyRows
                        title="Deduction Arrears"
                        rows={values.deductionArrears}
                        columns={[
                            { label: "Component", value: (row) => row.salaryComponentId?.salaryComponentName || row.salaryComponentId?.abbreviation || row.salaryComponentId || "—" },
                            { label: "Amount", value: (row) => row.amount ?? 0 },
                        ]}
                    />
                </>
            )}
            {mode === "edit" && id && values.status === "draft" && (
                <SimpleActionButton
                    label="Submit"
                    description="Generates active Additional Salary records for each arrear item and marks Arrear as submitted."
                    onRun={() => submitArrear(id)}
                    onResult={() => window.location.reload()}
                />
            )}
            {mode === "edit" && id && values.status === "submitted" && (
                <SimpleActionButton
                    label="Cancel"
                    description="Cancels this Arrear and all generated Additional Salary records."
                    onRun={() => cancelArrear(id)}
                    onResult={() => window.location.reload()}
                />
            )}
        </>
    ),
    filterFields: [
        { name: "employeeId", label: "Employee", type: "objectId" },
        { name: "status", label: "Status", type: "string" },
        { name: "payrollDate", label: "Payroll date", type: "date" },
        { name: "createdAt", label: "Created", type: "date" },
    ],
    recordTitle: (r) => `Arrear — ${String(r.startDate ?? "").slice(0, 10)} to ${String(r.endDate ?? "").slice(0, 10)}`,
    toForm: (data) => ({
        ...data,
        employeeId: refId(data.employeeId),
        startDate: data.startDate?.slice(0, 10) || "",
        endDate: data.endDate?.slice(0, 10) || "",
        payrollDate: data.payrollDate?.slice(0, 10) || "",
    }),
    toPayload: (values, mode) => (mode === "edit"
        ? { payrollDate: values.payrollDate }
        : {
            employeeId: values.employeeId,
            startDate: values.startDate,
            endDate: values.endDate,
            payrollDate: values.payrollDate,
        }),
};

export const retentionBonusConfig = {
    key: "retention-bonus",
    path: "/retention-bonus",
    section: "Payroll",
    singular: "Retention Bonus",
    plural: "Retention Bonuses",
    description: "Tracks retention bonus agreements payable to an active employee on a future payment date.",
    api: {
        search: searchRetentionBonuses,
        getById: getRetentionBonusById,
        create: createRetentionBonus,
        update: updateRetentionBonus,
        remove: deleteRetentionBonus,
    },
    lookups: {
        employeeId: asOptions(getAllEmployees, "employeeName"),
        salaryComponentId: asOptions(getAllSalaryComponents, "salaryComponentName"),
    },
    sections: [
        { id: "details", title: "Bonus details" },
        { id: "status", title: "Status" },
    ],
    fields: [
        { name: "employeeId", label: "Employee", section: "details", type: "select", optionsFrom: "employeeId", required: true, error: "Employee is required" },
        { name: "salaryComponentId", label: "Salary Component (Earning)", section: "details", type: "select", optionsFrom: "salaryComponentId", required: true, error: "Salary Component is required" },
        { name: "bonusAmount", label: "Bonus Amount", section: "details", type: "number", required: true, error: "Bonus Amount is required" },
        { name: "bonusPaymentDate", label: "Bonus Payment Date", section: "details", type: "date", required: true, error: "Payment Date is required" },
    ],
    columns: [
        { name: "Employee", selector: (r) => r.employeeId?.employeeName || r.employeeIdLabel || "—", sortable: true, sortField: "employeeId" },
        { name: "Component", selector: (r) => r.salaryComponentId?.salaryComponentName || r.salaryComponentIdLabel || "—" },
        { name: "Amount", selector: (r) => r.bonusAmount ?? "—" },
        { name: "Payment Date", selector: (r) => String(r.bonusPaymentDate ?? "").slice(0, 10), sortable: true, sortField: "bonusPaymentDate" },
        { name: "Status", selector: (r) => r.status, sortable: true, sortField: "status" },
    ],
    renderExtra: ({ mode, id, values }) => (
        <>
            {mode === "edit" && id && values.status === "draft" && (
                <SimpleActionButton
                    label="Submit"
                    description="Generates an active Additional Salary record and marks Retention Bonus submitted."
                    onRun={() => submitRetentionBonus(id)}
                    onResult={() => window.location.reload()}
                />
            )}
            {mode === "edit" && id && values.status === "submitted" && (
                <SimpleActionButton
                    label="Cancel"
                    description="Cancels the Retention Bonus and its linked Additional Salary."
                    onRun={() => cancelRetentionBonus(id)}
                    onResult={() => window.location.reload()}
                />
            )}
        </>
    ),
    filterFields: [
        { name: "employeeId", label: "Employee", type: "objectId" },
        { name: "salaryComponentId", label: "Salary Component", type: "objectId" },
        { name: "status", label: "Status", type: "string" },
        { name: "bonusPaymentDate", label: "Payment date", type: "date" },
        { name: "createdAt", label: "Created", type: "date" },
    ],
    recordTitle: (r) => `Retention Bonus — ${r.bonusAmount ?? ""}`,
    toForm: (data) => ({
        ...data,
        employeeId: refId(data.employeeId),
        salaryComponentId: refId(data.salaryComponentId),
        bonusPaymentDate: data.bonusPaymentDate?.slice(0, 10) || "",
    }),
    toPayload: (values, mode) => (mode === "edit"
        ? { bonusAmount: Number(values.bonusAmount), bonusPaymentDate: values.bonusPaymentDate, salaryComponentId: values.salaryComponentId }
        : {
            employeeId: values.employeeId,
            salaryComponentId: values.salaryComponentId,
            bonusAmount: Number(values.bonusAmount),
            bonusPaymentDate: values.bonusPaymentDate,
        }),
};

export const employeeIncentiveConfig = {
    key: "employee-incentive",
    path: "/employee-incentive",
    section: "Payroll",
    singular: "Employee Incentive",
    plural: "Employee Incentives",
    description: "Tracks one-time performance bonuses or sales incentives.",
    api: {
        search: searchEmployeeIncentives,
        getById: getEmployeeIncentiveById,
        create: createEmployeeIncentive,
        update: updateEmployeeIncentive,
        remove: deleteEmployeeIncentive,
    },
    lookups: {
        employeeId: asOptions(getAllEmployees, "employeeName"),
        salaryComponentId: asOptions(getAllSalaryComponents, "salaryComponentName"),
    },
    sections: [
        { id: "details", title: "Incentive details" },
        { id: "status", title: "Status" },
    ],
    fields: [
        { name: "employeeId", label: "Employee", section: "details", type: "select", optionsFrom: "employeeId", required: true, error: "Employee is required" },
        { name: "salaryComponentId", label: "Salary Component (Earning)", section: "details", type: "select", optionsFrom: "salaryComponentId", required: true, error: "Salary Component is required" },
        { name: "incentiveAmount", label: "Incentive Amount", section: "details", type: "number", required: true, error: "Incentive Amount is required" },
        { name: "incentiveDate", label: "Incentive Date", section: "details", type: "date", required: true, error: "Incentive Date is required" },
    ],
    columns: [
        { name: "Employee", selector: (r) => r.employeeId?.employeeName || r.employeeIdLabel || "—", sortable: true, sortField: "employeeId" },
        { name: "Component", selector: (r) => r.salaryComponentId?.salaryComponentName || r.salaryComponentIdLabel || "—" },
        { name: "Amount", selector: (r) => r.incentiveAmount ?? "—" },
        { name: "Incentive Date", selector: (r) => String(r.incentiveDate ?? "").slice(0, 10), sortable: true, sortField: "incentiveDate" },
        { name: "Status", selector: (r) => r.status, sortable: true, sortField: "status" },
    ],
    renderExtra: ({ mode, id, values }) => (
        <>
            {mode === "edit" && id && values.status === "draft" && (
                <SimpleActionButton
                    label="Submit"
                    description="Generates an active Additional Salary record and marks Incentive submitted."
                    onRun={() => submitEmployeeIncentive(id)}
                    onResult={() => window.location.reload()}
                />
            )}
            {mode === "edit" && id && values.status === "submitted" && (
                <SimpleActionButton
                    label="Cancel"
                    description="Cancels the Incentive and its linked Additional Salary."
                    onRun={() => cancelEmployeeIncentive(id)}
                    onResult={() => window.location.reload()}
                />
            )}
        </>
    ),
    filterFields: [
        { name: "employeeId", label: "Employee", type: "objectId" },
        { name: "salaryComponentId", label: "Salary Component", type: "objectId" },
        { name: "status", label: "Status", type: "string" },
        { name: "incentiveDate", label: "Incentive date", type: "date" },
        { name: "createdAt", label: "Created", type: "date" },
    ],
    recordTitle: (r) => `Employee Incentive — ${r.incentiveAmount ?? ""}`,
    toForm: (data) => ({
        ...data,
        employeeId: refId(data.employeeId),
        salaryComponentId: refId(data.salaryComponentId),
        incentiveDate: data.incentiveDate?.slice(0, 10) || "",
    }),
    toPayload: (values, mode) => (mode === "edit"
        ? { incentiveAmount: Number(values.incentiveAmount), incentiveDate: values.incentiveDate, salaryComponentId: values.salaryComponentId }
        : {
            employeeId: values.employeeId,
            salaryComponentId: values.salaryComponentId,
            incentiveAmount: Number(values.incentiveAmount),
            incentiveDate: values.incentiveDate,
        }),
};

export const employeeOtherIncomeConfig = {
    key: "employee-other-income",
    path: "/employee-other-income",
    section: "Payroll",
    singular: "Employee Other Income",
    plural: "Employee Other Incomes",
    description: "Captures externally-declared income sources (rental income, bank interest, freelance, or housing loan loss) for tax computation.",
    api: {
        search: searchEmployeeOtherIncomes,
        getById: getEmployeeOtherIncomeById,
        create: createEmployeeOtherIncome,
        update: updateEmployeeOtherIncome,
        remove: deleteEmployeeOtherIncome,
    },
    lookups: {
        employeeId: asOptions(getAllEmployees, "employeeName"),
        payrollPeriodId: asOptions(getAllPayrollPeriods, "startDate"),
    },
    sections: [
        { id: "details", title: "External Income Details" },
        { id: "status", title: "Status" },
    ],
    fields: [
        { name: "employeeId", label: "Employee", section: "details", type: "select", optionsFrom: "employeeId", required: true, error: "Employee is required" },
        { name: "payrollPeriodId", label: "Payroll Period", section: "details", type: "select", optionsFrom: "payrollPeriodId", required: true, error: "Payroll Period is required" },
        { name: "source", label: "Source", section: "details", type: "text", required: true, error: "Source is required", placeholder: "e.g. Income from House Property, Interest Income, Other Income" },
        { name: "amount", label: "Amount (can be negative for loss)", section: "details", type: "number", required: true, error: "Amount is required" },
        { name: "date", label: "Date", section: "details", type: "date" },
    ],
    columns: [
        { name: "Employee", selector: (r) => r.employeeId?.employeeName || r.employeeIdLabel || "—", sortable: true, sortField: "employeeId" },
        { name: "Source", selector: (r) => r.source || "—" },
        { name: "Amount", selector: (r) => r.amount ?? "—" },
        { name: "Date", selector: (r) => String(r.date ?? "").slice(0, 10), sortable: true, sortField: "date" },
        { name: "Status", selector: (r) => r.status, sortable: true, sortField: "status" },
    ],
    renderExtra: ({ mode, id, values }) => (
        <>
            {mode === "edit" && id && values.status === "draft" && (
                <SimpleActionButton
                    label="Submit"
                    description="Submits this income declaration."
                    onRun={() => submitEmployeeOtherIncome(id)}
                    onResult={() => window.location.reload()}
                />
            )}
            {mode === "edit" && id && values.status === "submitted" && (
                <SimpleActionButton
                    label="Cancel"
                    description="Cancels this income declaration."
                    onRun={() => cancelEmployeeOtherIncome(id)}
                    onResult={() => window.location.reload()}
                />
            )}
        </>
    ),
    filterFields: [
        { name: "employeeId", label: "Employee", type: "objectId" },
        { name: "payrollPeriodId", label: "Payroll Period", type: "objectId" },
        { name: "source", label: "Source", type: "string" },
        { name: "status", label: "Status", type: "string" },
        { name: "date", label: "Date", type: "date" },
        { name: "createdAt", label: "Created", type: "date" },
    ],
    recordTitle: (r) => `Employee Other Income — ${r.source ?? ""}: ${r.amount ?? ""}`,
    toForm: (data) => ({
        ...data,
        employeeId: refId(data.employeeId),
        payrollPeriodId: refId(data.payrollPeriodId),
        date: data.date?.slice(0, 10) || "",
    }),
    toPayload: (values, mode) => (mode === "edit"
        ? { amount: Number(values.amount), source: values.source, date: values.date, payrollPeriodId: values.payrollPeriodId }
        : {
            employeeId: values.employeeId,
            payrollPeriodId: values.payrollPeriodId,
            source: values.source,
            amount: Number(values.amount),
            date: values.date || new Date().toISOString().slice(0, 10),
        }),
};

const EMPLOYEE_BENEFIT_DETAIL_COLUMNS = [
    { key: "salaryComponentId", label: "Salary Component ID", type: "text", placeholder: "Component ObjectId" },
    { key: "amount", label: "Amount", type: "number", placeholder: "0.00" },
];

export const employeeBenefitApplicationConfig = {
    key: "employee-benefit-application",
    path: "/employee-benefit-application",
    section: "Payroll",
    singular: "Employee Benefit Application",
    plural: "Employee Benefit Applications",
    description: "Annual or periodic flexible benefit election by an employee allocating allowance across eligible flexible benefit components.",
    api: {
        search: searchEmployeeBenefitApplications,
        getById: getEmployeeBenefitApplicationById,
        create: createEmployeeBenefitApplication,
        update: updateEmployeeBenefitApplication,
        remove: deleteEmployeeBenefitApplication,
    },
    lookups: {
        employeeId: asOptions(getAllEmployees, "employeeName"),
        payrollPeriodId: asOptions(getAllPayrollPeriods, "startDate"),
    },
    sections: [
        { id: "details", title: "Application Details" },
        { id: "status", title: "Status & Totals" },
    ],
    fields: [
        { name: "employeeId", label: "Employee", section: "details", type: "select", optionsFrom: "employeeId", required: true, error: "Employee is required" },
        { name: "payrollPeriodId", label: "Payroll Period", section: "details", type: "select", optionsFrom: "payrollPeriodId", required: true, error: "Payroll Period is required" },
        { name: "date", label: "Application Date", section: "details", type: "date" },
        { name: "remarks", label: "Remarks", section: "details", type: "text" },
    ],
    viewFields: [
        { name: "employeeId", label: "Employee", section: "details", type: "select", optionsFrom: "employeeId" },
        { name: "payrollPeriodId", label: "Payroll Period", section: "details", type: "select", optionsFrom: "payrollPeriodId" },
        { name: "currency", label: "Currency", section: "status", type: "text" },
        { name: "maxBenefits", label: "Max Benefits", section: "status", type: "number" },
        { name: "totalAmount", label: "Total Amount", section: "status", type: "number" },
        { name: "remainingBenefit", label: "Remaining Benefit", section: "status", type: "number" },
        { name: "status", label: "Status", section: "status", type: "text" },
        { name: "date", label: "Date", section: "details", type: "date" },
    ],
    renderExtra: ({ mode, id, values, setValues }) => (
        <>
            <SimpleArrayField
                title="Benefit Components"
                description="Specify salary component ID and elected amount for each flexible benefit."
                fieldName="employeeBenefits"
                columns={EMPLOYEE_BENEFIT_DETAIL_COLUMNS}
                values={values}
                setValues={setValues}
            />
            {mode === "edit" && id && values.status === "draft" && (
                <SimpleActionButton
                    label="Submit"
                    description="Finalizes and approves this benefit election."
                    onRun={() => submitEmployeeBenefitApplication(id)}
                    onResult={() => window.location.reload()}
                />
            )}
            {mode === "edit" && id && values.status === "submitted" && (
                <SimpleActionButton
                    label="Cancel"
                    description="Cancels this benefit election."
                    onRun={() => cancelEmployeeBenefitApplication(id)}
                    onResult={() => window.location.reload()}
                />
            )}
        </>
    ),
    filterFields: [
        { name: "employeeId", label: "Employee", type: "objectId" },
        { name: "payrollPeriodId", label: "Payroll Period", type: "objectId" },
        { name: "status", label: "Status", type: "string" },
        { name: "createdAt", label: "Created", type: "date" },
    ],
    columns: [
        { name: "Employee", selector: (r) => r.employeeId?.employeeName || r.employeeIdLabel || "—", sortable: true, sortField: "employeeId" },
        { name: "Payroll Period", selector: (r) => (r.payrollPeriodId?.startDate ? String(r.payrollPeriodId.startDate).slice(0, 10) : "—") },
        { name: "Total Amount", selector: (r) => r.totalAmount ?? "—" },
        { name: "Remaining", selector: (r) => r.remainingBenefit ?? "—" },
        { name: "Status", selector: (r) => r.status, sortable: true, sortField: "status" },
        { name: "Date", selector: (r) => String(r.date ?? "").slice(0, 10), sortable: true, sortField: "date" },
    ],
    recordTitle: (r) => `Employee Benefit Application — ${r.totalAmount ?? ""}`,
    toForm: (data) => ({
        ...data,
        employeeId: refId(data.employeeId),
        payrollPeriodId: refId(data.payrollPeriodId),
        date: data.date?.slice(0, 10) || "",
        employeeBenefits: (data.employeeBenefits || []).map((row) => ({ ...row, salaryComponentId: refId(row.salaryComponentId) })),
    }),
    toPayload: (values, mode) => ({
        employeeId: values.employeeId,
        payrollPeriodId: values.payrollPeriodId,
        date: values.date,
        remarks: values.remarks,
        employeeBenefits: (values.employeeBenefits || []).map((b) => ({
            salaryComponentId: refId(b.salaryComponentId),
            amount: Number(b.amount),
        })),
    }),
};

export const employeeBenefitClaimConfig = {
    key: "employee-benefit-claim",
    path: "/employee-benefit-claim",
    section: "Payroll",
    singular: "Employee Benefit Claim",
    plural: "Employee Benefit Claims",
    description: "Disbursement claim against an accrued or annual flexible benefit allowance.",
    api: {
        search: searchEmployeeBenefitClaims,
        getById: getEmployeeBenefitClaimById,
        create: createEmployeeBenefitClaim,
        update: updateEmployeeBenefitClaim,
        remove: deleteEmployeeBenefitClaim,
    },
    lookups: {
        employeeId: asOptions(getAllEmployees, "employeeName"),
        salaryComponentId: asOptions(getAllSalaryComponents, "salaryComponentName"),
    },
    sections: [
        { id: "details", title: "Claim Details" },
        { id: "status", title: "Status" },
    ],
    fields: [
        { name: "employeeId", label: "Employee", section: "details", type: "select", optionsFrom: "employeeId", required: true, error: "Employee is required" },
        { name: "salaryComponentId", label: "Salary Component", section: "details", type: "select", optionsFrom: "salaryComponentId", required: true, error: "Salary Component is required" },
        { name: "claimedAmount", label: "Claimed Amount", section: "details", type: "number", required: true, error: "Claimed Amount is required" },
        { name: "claimDate", label: "Claim Date", section: "details", type: "date", required: true, error: "Claim Date is required" },
        { name: "remarks", label: "Remarks", section: "details", type: "text" },
    ],
    columns: [
        { name: "Employee", selector: (r) => r.employeeId?.employeeName || r.employeeIdLabel || "—", sortable: true, sortField: "employeeId" },
        { name: "Component", selector: (r) => r.salaryComponentId?.salaryComponentName || r.salaryComponentIdLabel || "—" },
        { name: "Claimed Amount", selector: (r) => r.claimedAmount ?? "—" },
        { name: "Claim Date", selector: (r) => String(r.claimDate ?? "").slice(0, 10), sortable: true, sortField: "claimDate" },
        { name: "Status", selector: (r) => r.status, sortable: true, sortField: "status" },
    ],
    renderExtra: ({ mode, id, values }) => (
        <>
            {mode === "edit" && id && values.status === "draft" && (
                <SimpleActionButton
                    label="Submit"
                    description="Approves claim and generates an active Additional Salary row."
                    onRun={() => submitEmployeeBenefitClaim(id)}
                    onResult={() => window.location.reload()}
                />
            )}
            {mode === "edit" && id && values.status === "submitted" && (
                <SimpleActionButton
                    label="Cancel"
                    description="Cancels claim and its linked Additional Salary."
                    onRun={() => cancelEmployeeBenefitClaim(id)}
                    onResult={() => window.location.reload()}
                />
            )}
        </>
    ),
    filterFields: [
        { name: "employeeId", label: "Employee", type: "objectId" },
        { name: "salaryComponentId", label: "Salary Component", type: "objectId" },
        { name: "status", label: "Status", type: "string" },
        { name: "claimDate", label: "Claim date", type: "date" },
        { name: "createdAt", label: "Created", type: "date" },
    ],
    recordTitle: (r) => `Employee Benefit Claim — ${r.claimedAmount ?? ""}`,
    toForm: (data) => ({
        ...data,
        employeeId: refId(data.employeeId),
        salaryComponentId: refId(data.salaryComponentId),
        claimDate: data.claimDate?.slice(0, 10) || "",
    }),
    toPayload: (values, mode) => (mode === "edit"
        ? { claimedAmount: Number(values.claimedAmount), claimDate: values.claimDate, salaryComponentId: values.salaryComponentId, remarks: values.remarks }
        : {
            employeeId: values.employeeId,
            salaryComponentId: values.salaryComponentId,
            claimedAmount: Number(values.claimedAmount),
            claimDate: values.claimDate,
            remarks: values.remarks,
        }),
};

export const employeeBenefitLedgerConfig = {
    key: "employee-benefit-ledger",
    path: "/employee-benefit-ledger",
    section: "Payroll",
    singular: "Employee Benefit Ledger Entry",
    plural: "Employee Benefit Ledger",
    description: "Append-only operational running balance of flexible benefit accruals and payouts per employee and component.",
    api: {
        search: searchEmployeeBenefitLedgers,
        getById: getEmployeeBenefitLedgerById,
    },
    sections: [
        { id: "details", title: "Ledger Transaction" },
    ],
    fields: [
        { name: "postingDate", label: "Posting Date", section: "details", type: "date" },
        { name: "transactionType", label: "Transaction Type", section: "details", type: "text" },
        { name: "amount", label: "Amount", section: "details", type: "number" },
        { name: "yearlyBenefit", label: "Yearly Benefit", section: "details", type: "number" },
        { name: "remarks", label: "Remarks", section: "details", type: "text" },
    ],
    columns: [
        { name: "Posting Date", selector: (r) => String(r.postingDate ?? "").slice(0, 10), sortable: true, sortField: "postingDate" },
        { name: "Employee", selector: (r) => r.employeeId?.employeeName || r.employeeIdLabel || "—", sortable: true, sortField: "employeeId" },
        { name: "Component", selector: (r) => r.salaryComponentId?.salaryComponentName || r.salaryComponentIdLabel || "—" },
        { name: "Type", selector: (r) => r.transactionType, sortable: true, sortField: "transactionType" },
        { name: "Amount", selector: (r) => r.amount ?? "—" },
        { name: "Ref Doctype", selector: (r) => r.refDoctype || "—" },
    ],
    filterFields: [
        { name: "employeeId", label: "Employee", type: "objectId" },
        { name: "salaryComponentId", label: "Salary Component", type: "objectId" },
        { name: "payrollPeriodId", label: "Payroll Period", type: "objectId" },
        { name: "transactionType", label: "Transaction Type", type: "string" },
        { name: "postingDate", label: "Posting Date", type: "date" },
        { name: "createdAt", label: "Created", type: "date" },
    ],
    recordTitle: (r) => `Benefit Ledger — ${r.transactionType}: ${r.amount}`,
    toForm: (data) => ({
        ...data,
        postingDate: data.postingDate?.slice(0, 10) || "",
    }),
};

export const payrollCorrectionConfig = {
    key: "payroll-correction",
    path: "/payroll-correction",
    section: "Payroll",
    singular: "Payroll Correction",
    plural: "Payroll Corrections",
    description: "Reverses mistaken LWP days on submitted Salary Slips, generating earning/deduction arrears and benefit accrual top-ups.",
    api: {
        search: searchPayrollCorrections,
        getById: getPayrollCorrectionById,
        create: createPayrollCorrection,
        update: updatePayrollCorrection,
        remove: deletePayrollCorrection,
    },
    lookups: {
        salarySlipId: asOptions(getAllSalarySlips, "employeeId"),
    },
    sections: [
        { id: "details", title: "Correction Details" },
        { id: "status", title: "Status" },
    ],
    fields: [
        { name: "salarySlipId", label: "Salary Slip ID", section: "details", type: "text", required: true, error: "Salary Slip ID is required", placeholder: "Paste target submitted SalarySlip ObjectId" },
        { name: "daysToReverse", label: "Days to Reverse", section: "details", type: "number", required: true, error: "Days to reverse is required" },
        { name: "remarks", label: "Remarks", section: "details", type: "text" },
    ],
    columns: [
        { name: "Employee", selector: (r) => r.employeeId?.employeeName || r.employeeIdLabel || "—", sortable: true, sortField: "employeeId" },
        { name: "Salary Slip", selector: (r) => (r.salarySlipId?._id ? String(r.salarySlipId._id) : String(r.salarySlipId || "—")) },
        { name: "Days Reversed", selector: (r) => r.daysToReverse ?? "—" },
        { name: "Status", selector: (r) => r.status, sortable: true, sortField: "status" },
        { name: "Created", selector: (r) => String(r.createdAt ?? "").slice(0, 10), sortable: true, sortField: "createdAt" },
    ],
    renderExtra: ({ mode, id, values }) => (
        <>
            {mode === "edit" && id && values.status === "draft" && (
                <SimpleActionButton
                    label="Submit"
                    description="Generates Additional Salary arrears and Benefit Ledger accruals."
                    onRun={() => submitPayrollCorrection(id)}
                    onResult={() => window.location.reload()}
                />
            )}
            {mode === "edit" && id && values.status === "submitted" && (
                <SimpleActionButton
                    label="Cancel"
                    description="Cancels linked Additional Salary arrears and reverses Benefit Ledger accruals."
                    onRun={() => cancelPayrollCorrection(id)}
                    onResult={() => window.location.reload()}
                />
            )}
        </>
    ),
    filterFields: [
        { name: "salarySlipId", label: "Salary Slip", type: "objectId" },
        { name: "employeeId", label: "Employee", type: "objectId" },
        { name: "status", label: "Status", type: "string" },
        { name: "createdAt", label: "Created", type: "date" },
    ],
    recordTitle: (r) => `Payroll Correction — ${r.daysToReverse ?? ""} days`,
    toForm: (data) => ({
        ...data,
        salarySlipId: refId(data.salarySlipId),
    }),
    toPayload: (values, mode) => (mode === "edit"
        ? { daysToReverse: Number(values.daysToReverse), remarks: values.remarks }
        : {
            salarySlipId: values.salarySlipId,
            daysToReverse: Number(values.daysToReverse),
            remarks: values.remarks,
        }),
};

// ============================================================================
// ADR-030 (Payroll — Tax & Exemptions)
// ============================================================================

const TAXABLE_SALARY_SLAB_COLUMNS = [
    { key: "fromAmount", label: "From Amount", type: "number", placeholder: "0" },
    { key: "toAmount", label: "To Amount (blank for open-ended)", type: "number", placeholder: "Optional" },
    { key: "percentDeduction", label: "Percent Deduction (%)", type: "number", placeholder: "0-100" },
    { key: "condition", label: "Condition", type: "text", placeholder: "e.g. age < 60" },
];

const OTHER_TAXES_AND_CHARGES_COLUMNS = [
    { key: "description", label: "Description", type: "text", placeholder: "e.g. Surcharge, Cess" },
    { key: "percent", label: "Percent (%)", type: "number", placeholder: "0" },
    { key: "minTaxableIncome", label: "Min Taxable Income", type: "number", placeholder: "0" },
    { key: "maxTaxableIncome", label: "Max Taxable Income", type: "number", placeholder: "Optional" },
];

export const incomeTaxSlabConfig = {
    key: "income-tax-slab",
    path: "/income-tax-slab",
    section: "Payroll",
    singular: "Income Tax Slab",
    plural: "Income Tax Slabs",
    description: "Defines progressive marginal tax brackets and surcharges for an effective date.",
    api: {
        search: searchIncomeTaxSlabs,
        getById: getIncomeTaxSlabById,
        create: createIncomeTaxSlab,
        update: updateIncomeTaxSlab,
        remove: deleteIncomeTaxSlab,
    },
    lookups: {
        companyId: asOptions(getAllCompanies, "companyName"),
    },
    sections: [
        { id: "details", title: "Slab Details" },
    ],
    fields: [
        { name: "name", label: "Name", section: "details", type: "text", required: true, error: "Name is required" },
        { name: "companyId", label: "Company", section: "details", type: "select", optionsFrom: "companyId", required: true, error: "Company is required" },
        { name: "effectiveFromDate", label: "Effective From Date", section: "details", type: "date", required: true, error: "Effective From Date is required" },
        { name: "allowTaxExemption", label: "Allow Tax Exemption", section: "details", type: "checkbox" },
        { name: "standardDeduction", label: "Standard Deduction", section: "details", type: "number" },
        { name: "taxReliefLimit", label: "Tax Relief Limit", section: "details", type: "number" },
        { name: "disabled", label: "Disabled", section: "details", type: "checkbox" },
        { name: "currency", label: "Currency", section: "details", type: "text" },
    ],
    renderExtra: ({ values, setValues }) => (
        <>
            <SimpleArrayField
                title="Taxable Salary Slabs"
                description="Progressive brackets on half-open ranges [fromAmount, toAmount)."
                fieldName="slabs"
                columns={TAXABLE_SALARY_SLAB_COLUMNS}
                values={values}
                setValues={setValues}
            />
            <SimpleArrayField
                title="Other Taxes and Charges"
                description="Sequential compounding surcharges and cesses."
                fieldName="otherTaxesAndCharges"
                columns={OTHER_TAXES_AND_CHARGES_COLUMNS}
                values={values}
                setValues={setValues}
            />
        </>
    ),
    columns: [
        { name: "Name", selector: (r) => r.name, sortable: true, sortField: "name" },
        { name: "Company", selector: (r) => r.companyId?.companyName || r.companyIdLabel || "—", sortable: true, sortField: "companyId" },
        { name: "Effective From", selector: (r) => String(r.effectiveFromDate ?? "").slice(0, 10), sortable: true, sortField: "effectiveFromDate" },
        { name: "Allow Exemption", selector: (r) => (r.allowTaxExemption ? "Yes" : "No") },
        { name: "Standard Deduction", selector: (r) => r.standardDeduction ?? 0 },
    ],
    filterFields: [
        { name: "companyId", label: "Company", type: "objectId" },
        { name: "name", label: "Name", type: "string" },
        { name: "effectiveFromDate", label: "Effective From Date", type: "date" },
        { name: "allowTaxExemption", label: "Allow Tax Exemption", type: "boolean" },
        { name: "disabled", label: "Disabled", type: "boolean" },
        { name: "createdAt", label: "Created", type: "date" },
    ],
    recordTitle: (r) => r.name,
    toForm: (data) => ({
        ...data,
        companyId: refId(data.companyId),
        effectiveFromDate: data.effectiveFromDate?.slice(0, 10) || "",
    }),
};

export const employeeTaxExemptionCategoryConfig = {
    key: "employee-tax-exemption-category",
    path: "/employee-tax-exemption-category",
    section: "Payroll",
    singular: "Tax Exemption Category",
    plural: "Tax Exemption Categories",
    description: "Defines top-level statutory tax exemption categories and overall ceilings (e.g. Section 80C).",
    api: {
        search: searchEmployeeTaxExemptionCategories,
        getById: getEmployeeTaxExemptionCategoryById,
        create: createEmployeeTaxExemptionCategory,
        update: updateEmployeeTaxExemptionCategory,
        remove: deleteEmployeeTaxExemptionCategory,
    },
    sections: [
        { id: "details", title: "Category Details" },
    ],
    fields: [
        { name: "name", label: "Name", section: "details", type: "text", required: true, error: "Name is required" },
        { name: "maxAmount", label: "Max Amount", section: "details", type: "number", required: true, error: "Max Amount is required" },
        { name: "description", label: "Description", section: "details", type: "text" },
        ACTIVE,
    ],
    columns: [
        { name: "Name", selector: (r) => r.name, sortable: true, sortField: "name" },
        { name: "Max Amount", selector: (r) => r.maxAmount ?? 0, sortable: true, sortField: "maxAmount" },
        { name: "Active", selector: (r) => (r.isActive ? "Yes" : "No") },
        { name: "Description", selector: (r) => r.description || "—" },
    ],
    filterFields: [
        { name: "name", label: "Name", type: "string" },
        { name: "maxAmount", label: "Max Amount", type: "number" },
        { name: "isActive", label: "Active", type: "boolean" },
        { name: "createdAt", label: "Created", type: "date" },
    ],
    recordTitle: (r) => r.name,
};

export const employeeTaxExemptionSubCategoryConfig = {
    key: "employee-tax-exemption-sub-category",
    path: "/employee-tax-exemption-sub-category",
    section: "Payroll",
    singular: "Tax Exemption Sub Category",
    plural: "Tax Exemption Sub Categories",
    description: "Granular tax exemption instrument (e.g. PPF, Life Insurance) mapped to a parent category.",
    api: {
        search: searchEmployeeTaxExemptionSubCategories,
        getById: getEmployeeTaxExemptionSubCategoryById,
        create: createEmployeeTaxExemptionSubCategory,
        update: updateEmployeeTaxExemptionSubCategory,
        remove: deleteEmployeeTaxExemptionSubCategory,
    },
    lookups: {
        exemptionCategoryId: asOptions(getAllEmployeeTaxExemptionCategories, "name"),
    },
    sections: [
        { id: "details", title: "Sub Category Details" },
    ],
    fields: [
        { name: "name", label: "Name", section: "details", type: "text", required: true, error: "Name is required" },
        { name: "exemptionCategoryId", label: "Parent Exemption Category", section: "details", type: "select", optionsFrom: "exemptionCategoryId", required: true, error: "Parent category is required" },
        { name: "maxAmount", label: "Max Amount", section: "details", type: "number", hint: "Cannot exceed parent category max amount." },
        { name: "description", label: "Description", section: "details", type: "text" },
        ACTIVE,
    ],
    columns: [
        { name: "Name", selector: (r) => r.name, sortable: true, sortField: "name" },
        { name: "Parent Category", selector: (r) => r.exemptionCategoryId?.name || r.exemptionCategoryIdLabel || "—" },
        { name: "Max Amount", selector: (r) => r.maxAmount ?? 0, sortable: true, sortField: "maxAmount" },
        { name: "Active", selector: (r) => (r.isActive ? "Yes" : "No") },
    ],
    filterFields: [
        { name: "name", label: "Name", type: "string" },
        { name: "exemptionCategoryId", label: "Exemption Category", type: "objectId" },
        { name: "maxAmount", label: "Max Amount", type: "number" },
        { name: "isActive", label: "Active", type: "boolean" },
        { name: "createdAt", label: "Created", type: "date" },
    ],
    recordTitle: (r) => r.name,
    toForm: (data) => ({
        ...data,
        exemptionCategoryId: refId(data.exemptionCategoryId),
    }),
};

const EXEMPTION_DECLARATION_COLUMNS = [
    { key: "exemptionSubCategoryId", label: "Sub-Category ID", type: "text", placeholder: "Sub-Category ObjectId" },
    { key: "amount", label: "Declared Amount", type: "number", placeholder: "0.00" },
];

export const employeeTaxExemptionDeclarationConfig = {
    key: "employee-tax-exemption-declaration",
    path: "/employee-tax-exemption-declaration",
    section: "Payroll",
    singular: "Tax Exemption Declaration",
    plural: "Tax Exemption Declarations",
    description: "Provisional tax exemption declaration submitted by an employee for a payroll period.",
    api: {
        search: searchEmployeeTaxExemptionDeclarations,
        getById: getEmployeeTaxExemptionDeclarationById,
        create: createEmployeeTaxExemptionDeclaration,
        update: updateEmployeeTaxExemptionDeclaration,
        remove: deleteEmployeeTaxExemptionDeclaration,
    },
    lookups: {
        employeeId: asOptions(getAllEmployees, "employeeName"),
        payrollPeriodId: () => getAllPayrollPeriods().then((res) => (res.data?.data ?? []).map((row) => ({ value: row._id, label: `${row.startDate?.slice?.(0, 10)} – ${row.endDate?.slice?.(0, 10)}` }))),
    },
    sections: [
        { id: "details", title: "Declaration Details" },
        { id: "status", title: "Status" },
    ],
    fields: [
        { name: "employeeId", label: "Employee", section: "details", type: "select", optionsFrom: "employeeId", required: true, error: "Employee is required" },
        { name: "payrollPeriodId", label: "Payroll Period", section: "details", type: "select", optionsFrom: "payrollPeriodId", required: true, error: "Payroll Period is required" },
        { name: "currency", label: "Currency", section: "details", type: "text" },
        { name: "totalDeclaredAmount", label: "Total Declared Amount", section: "details", type: "number", disabled: () => true },
        { name: "totalExemptionAmount", label: "Total Exemption Amount", section: "details", type: "number", disabled: () => true },
        { name: "status", label: "Status", section: "status", type: "text", disabled: () => true },
    ],
    renderExtra: ({ mode, id, values, setValues }) => (
        <>
            <SimpleArrayField
                title="Declarations"
                description="Tax exemption instrument declarations."
                fieldName="declarations"
                columns={EXEMPTION_DECLARATION_COLUMNS}
                values={values}
                setValues={setValues}
            />
            {mode === "edit" && id && values.status === "draft" && (
                <SimpleActionButton
                    label="Submit"
                    description="Submit provisional tax exemption declaration."
                    onRun={() => submitEmployeeTaxExemptionDeclaration(id)}
                    onResult={() => window.location.reload()}
                />
            )}
            {mode === "edit" && id && values.status === "submitted" && (
                <SimpleActionButton
                    label="Cancel"
                    description="Cancel tax exemption declaration."
                    onRun={() => cancelEmployeeTaxExemptionDeclaration(id)}
                    onResult={() => window.location.reload()}
                />
            )}
        </>
    ),
    columns: [
        { name: "Employee", selector: (r) => r.employeeId?.employeeName || r.employeeIdLabel || "—", sortable: true, sortField: "employeeId" },
        { name: "Payroll Period", selector: (r) => r.payrollPeriodIdLabel || (r.payrollPeriodId?.startDate ? `${r.payrollPeriodId.startDate.slice(0, 10)} – ${r.payrollPeriodId.endDate.slice(0, 10)}` : "—") },
        { name: "Declared Amount", selector: (r) => r.totalDeclaredAmount ?? 0 },
        { name: "Exemption Amount", selector: (r) => r.totalExemptionAmount ?? 0 },
        { name: "Status", selector: (r) => r.status, sortable: true, sortField: "status" },
    ],
    filterFields: [
        { name: "employeeId", label: "Employee", type: "objectId" },
        { name: "companyId", label: "Company", type: "objectId" },
        { name: "payrollPeriodId", label: "Payroll Period", type: "objectId" },
        { name: "status", label: "Status", type: "string" },
        { name: "createdAt", label: "Created", type: "date" },
    ],
    recordTitle: (r) => `Tax Declaration — ${r._id}`,
    toForm: (data) => ({
        ...data,
        employeeId: refId(data.employeeId),
        payrollPeriodId: refId(data.payrollPeriodId),
    }),
};

const EXEMPTION_PROOF_COLUMNS = [
    { key: "exemptionSubCategoryId", label: "Sub-Category ID", type: "text", placeholder: "Sub-Category ObjectId" },
    { key: "typeOfProof", label: "Type of Proof", type: "text", placeholder: "Receipt, Statement, etc." },
    { key: "amount", label: "Actual Amount", type: "number", placeholder: "0.00" },
];

export const employeeTaxExemptionProofSubmissionConfig = {
    key: "employee-tax-exemption-proof-submission",
    path: "/employee-tax-exemption-proof-submission",
    section: "Payroll",
    singular: "Tax Exemption Proof Submission",
    plural: "Tax Exemption Proof Submissions",
    description: "Substantiated tax exemption proof submitted by an employee for the final payroll period.",
    api: {
        search: searchEmployeeTaxExemptionProofSubmissions,
        getById: getEmployeeTaxExemptionProofSubmissionById,
        create: createEmployeeTaxExemptionProofSubmission,
        update: updateEmployeeTaxExemptionProofSubmission,
        remove: deleteEmployeeTaxExemptionProofSubmission,
    },
    lookups: {
        employeeId: asOptions(getAllEmployees, "employeeName"),
        payrollPeriodId: () => getAllPayrollPeriods().then((res) => (res.data?.data ?? []).map((row) => ({ value: row._id, label: `${row.startDate?.slice?.(0, 10)} – ${row.endDate?.slice?.(0, 10)}` }))),
    },
    sections: [
        { id: "details", title: "Proof Details" },
        { id: "status", title: "Status" },
    ],
    fields: [
        { name: "employeeId", label: "Employee", section: "details", type: "select", optionsFrom: "employeeId", required: true, error: "Employee is required" },
        { name: "payrollPeriodId", label: "Payroll Period", section: "details", type: "select", optionsFrom: "payrollPeriodId", required: true, error: "Payroll Period is required" },
        { name: "submissionDate", label: "Submission Date", section: "details", type: "date" },
        { name: "currency", label: "Currency", section: "details", type: "text" },
        { name: "totalActualAmount", label: "Total Actual Amount", section: "details", type: "number", disabled: () => true },
        { name: "exemptionAmount", label: "Exemption Amount", section: "details", type: "number", disabled: () => true },
        { name: "attachments", label: "Attachments", section: "details", type: "text" },
        { name: "status", label: "Status", section: "status", type: "text", disabled: () => true },
    ],
    renderExtra: ({ mode, id, values, setValues }) => (
        <>
            <SimpleArrayField
                title="Proof Details"
                description="Substantiated tax exemption proof items."
                fieldName="taxExemptionProofs"
                columns={EXEMPTION_PROOF_COLUMNS}
                values={values}
                setValues={setValues}
            />
            {mode === "edit" && id && values.status === "draft" && (
                <SimpleActionButton
                    label="Submit"
                    description="Submit tax exemption proof."
                    onRun={() => submitEmployeeTaxExemptionProofSubmission(id)}
                    onResult={() => window.location.reload()}
                />
            )}
            {mode === "edit" && id && values.status === "submitted" && (
                <SimpleActionButton
                    label="Cancel"
                    description="Cancel tax exemption proof."
                    onRun={() => cancelEmployeeTaxExemptionProofSubmission(id)}
                    onResult={() => window.location.reload()}
                />
            )}
        </>
    ),
    columns: [
        { name: "Employee", selector: (r) => r.employeeId?.employeeName || r.employeeIdLabel || "—", sortable: true, sortField: "employeeId" },
        { name: "Submission Date", selector: (r) => String(r.submissionDate ?? "").slice(0, 10) || "—" },
        { name: "Actual Amount", selector: (r) => r.totalActualAmount ?? 0 },
        { name: "Exemption Amount", selector: (r) => r.exemptionAmount ?? 0 },
        { name: "Status", selector: (r) => r.status, sortable: true, sortField: "status" },
    ],
    filterFields: [
        { name: "employeeId", label: "Employee", type: "objectId" },
        { name: "companyId", label: "Company", type: "objectId" },
        { name: "payrollPeriodId", label: "Payroll Period", type: "objectId" },
        { name: "status", label: "Status", type: "string" },
        { name: "createdAt", label: "Created", type: "date" },
    ],
    recordTitle: (r) => `Proof Submission — ${r._id}`,
    toForm: (data) => ({
        ...data,
        employeeId: refId(data.employeeId),
        payrollPeriodId: refId(data.payrollPeriodId),
        submissionDate: data.submissionDate?.slice(0, 10) || "",
    }),
};

export const ADVANCED_ENTITIES = [
    shiftTypeConfig, shiftLocationConfig, shiftAssignmentConfig, shiftScheduleConfig, shiftScheduleAssignmentConfig, employeeCheckinConfig,
    shiftRequestConfig, attendanceRequestConfig,
    adminUserConfig, userConfig, menuMasterConfig, emailTemplateConfig,
    departmentConfig, branchConfig, designationConfig, employeeConfig,
    jobApplicantSourceConfig, interviewTypeConfig, jobOfferTermTemplateConfig,
    jobRequisitionConfig, jobOpeningConfig, jobApplicantConfig,
    interviewConfig, interviewFeedbackConfig, jobOfferConfig,
    employeeOnboardingTemplateConfig, employeeOnboardingConfig,
    employeeSeparationTemplateConfig, employeeSeparationConfig,
    exitInterviewConfig, fullAndFinalStatementConfig,
    grievanceTypeConfig, employeeGrievanceConfig, employeeTransferConfig,
    employeePromotionConfig, employeeReferralConfig, staffingPlanConfig,
    trainingProgramConfig, trainingEventConfig, trainingFeedbackConfig,
    skillConfig, employeeSkillMapConfig,
    purposeOfTravelConfig, identificationDocumentTypeConfig, travelRequestConfig,
    leaveTypeConfig, leavePeriodConfig, holidayListConfig, holidayListAssignmentConfig,
    leavePolicyConfig, leavePolicyAssignmentConfig, leaveAllocationConfig, attendanceConfig,
    leaveAdjustmentConfig, compensatoryLeaveRequestConfig, leaveApplicationConfig,
    leaveEncashmentConfig, leaveBlockListConfig,
    salaryComponentConfig, salaryStructureConfig, salaryStructureAssignmentConfig,
    payrollPeriodConfig, salarySlipConfig, salaryWithholdingConfig,
    additionalSalaryConfig, arrearConfig, retentionBonusConfig,
    employeeIncentiveConfig, employeeOtherIncomeConfig,
    employeeBenefitApplicationConfig, employeeBenefitClaimConfig,
    employeeBenefitLedgerConfig, payrollCorrectionConfig,
    incomeTaxSlabConfig, employeeTaxExemptionCategoryConfig,
    employeeTaxExemptionSubCategoryConfig, employeeTaxExemptionDeclarationConfig,
    employeeTaxExemptionProofSubmissionConfig,
];

import api from "./index";
import { ENDPOINTS } from "./endpoints";

// ADR-030 (Payroll — Tax & Exemptions).

// 1. Income Tax Slab
export const createIncomeTaxSlab = async (data) => api.post(ENDPOINTS.INCOME_TAX_SLABS.BASE, data);
export const getAllIncomeTaxSlabs = async () => api.get(ENDPOINTS.INCOME_TAX_SLABS.BASE);
export const getIncomeTaxSlabById = async (id) => api.get(ENDPOINTS.INCOME_TAX_SLABS.BY_ID(id));
export const updateIncomeTaxSlab = async (id, data) => api.put(ENDPOINTS.INCOME_TAX_SLABS.BY_ID(id), data);
export const searchIncomeTaxSlabs = async (data) => api.post(ENDPOINTS.INCOME_TAX_SLABS.SEARCH, data);
export const deleteIncomeTaxSlab = async (id) => api.delete(ENDPOINTS.INCOME_TAX_SLABS.BY_ID(id));

// 2. Employee Tax Exemption Category
export const createEmployeeTaxExemptionCategory = async (data) => api.post(ENDPOINTS.EMPLOYEE_TAX_EXEMPTION_CATEGORIES.BASE, data);
export const getAllEmployeeTaxExemptionCategories = async () => api.get(ENDPOINTS.EMPLOYEE_TAX_EXEMPTION_CATEGORIES.BASE);
export const getEmployeeTaxExemptionCategoryById = async (id) => api.get(ENDPOINTS.EMPLOYEE_TAX_EXEMPTION_CATEGORIES.BY_ID(id));
export const updateEmployeeTaxExemptionCategory = async (id, data) => api.put(ENDPOINTS.EMPLOYEE_TAX_EXEMPTION_CATEGORIES.BY_ID(id), data);
export const searchEmployeeTaxExemptionCategories = async (data) => api.post(ENDPOINTS.EMPLOYEE_TAX_EXEMPTION_CATEGORIES.SEARCH, data);
export const deleteEmployeeTaxExemptionCategory = async (id) => api.delete(ENDPOINTS.EMPLOYEE_TAX_EXEMPTION_CATEGORIES.BY_ID(id));

// 3. Employee Tax Exemption Sub Category
export const createEmployeeTaxExemptionSubCategory = async (data) => api.post(ENDPOINTS.EMPLOYEE_TAX_EXEMPTION_SUB_CATEGORIES.BASE, data);
export const getAllEmployeeTaxExemptionSubCategories = async () => api.get(ENDPOINTS.EMPLOYEE_TAX_EXEMPTION_SUB_CATEGORIES.BASE);
export const getEmployeeTaxExemptionSubCategoryById = async (id) => api.get(ENDPOINTS.EMPLOYEE_TAX_EXEMPTION_SUB_CATEGORIES.BY_ID(id));
export const updateEmployeeTaxExemptionSubCategory = async (id, data) => api.put(ENDPOINTS.EMPLOYEE_TAX_EXEMPTION_SUB_CATEGORIES.BY_ID(id), data);
export const searchEmployeeTaxExemptionSubCategories = async (data) => api.post(ENDPOINTS.EMPLOYEE_TAX_EXEMPTION_SUB_CATEGORIES.SEARCH, data);
export const deleteEmployeeTaxExemptionSubCategory = async (id) => api.delete(ENDPOINTS.EMPLOYEE_TAX_EXEMPTION_SUB_CATEGORIES.BY_ID(id));

// 4. Employee Tax Exemption Declaration
export const createEmployeeTaxExemptionDeclaration = async (data) => api.post(ENDPOINTS.EMPLOYEE_TAX_EXEMPTION_DECLARATIONS.BASE, data);
export const getAllEmployeeTaxExemptionDeclarations = async () => api.get(ENDPOINTS.EMPLOYEE_TAX_EXEMPTION_DECLARATIONS.BASE);
export const getEmployeeTaxExemptionDeclarationById = async (id) => api.get(ENDPOINTS.EMPLOYEE_TAX_EXEMPTION_DECLARATIONS.BY_ID(id));
export const updateEmployeeTaxExemptionDeclaration = async (id, data) => api.put(ENDPOINTS.EMPLOYEE_TAX_EXEMPTION_DECLARATIONS.BY_ID(id), data);
export const searchEmployeeTaxExemptionDeclarations = async (data) => api.post(ENDPOINTS.EMPLOYEE_TAX_EXEMPTION_DECLARATIONS.SEARCH, data);
export const submitEmployeeTaxExemptionDeclaration = async (id) => api.post(ENDPOINTS.EMPLOYEE_TAX_EXEMPTION_DECLARATIONS.SUBMIT(id));
export const cancelEmployeeTaxExemptionDeclaration = async (id) => api.post(ENDPOINTS.EMPLOYEE_TAX_EXEMPTION_DECLARATIONS.CANCEL(id));
export const deleteEmployeeTaxExemptionDeclaration = async (id) => api.delete(ENDPOINTS.EMPLOYEE_TAX_EXEMPTION_DECLARATIONS.BY_ID(id));

// 5. Employee Tax Exemption Proof Submission
export const createEmployeeTaxExemptionProofSubmission = async (data) => api.post(ENDPOINTS.EMPLOYEE_TAX_EXEMPTION_PROOF_SUBMISSIONS.BASE, data);
export const getAllEmployeeTaxExemptionProofSubmissions = async () => api.get(ENDPOINTS.EMPLOYEE_TAX_EXEMPTION_PROOF_SUBMISSIONS.BASE);
export const getEmployeeTaxExemptionProofSubmissionById = async (id) => api.get(ENDPOINTS.EMPLOYEE_TAX_EXEMPTION_PROOF_SUBMISSIONS.BY_ID(id));
export const updateEmployeeTaxExemptionProofSubmission = async (id, data) => api.put(ENDPOINTS.EMPLOYEE_TAX_EXEMPTION_PROOF_SUBMISSIONS.BY_ID(id), data);
export const searchEmployeeTaxExemptionProofSubmissions = async (data) => api.post(ENDPOINTS.EMPLOYEE_TAX_EXEMPTION_PROOF_SUBMISSIONS.SEARCH, data);
export const submitEmployeeTaxExemptionProofSubmission = async (id) => api.post(ENDPOINTS.EMPLOYEE_TAX_EXEMPTION_PROOF_SUBMISSIONS.SUBMIT(id));
export const cancelEmployeeTaxExemptionProofSubmission = async (id) => api.post(ENDPOINTS.EMPLOYEE_TAX_EXEMPTION_PROOF_SUBMISSIONS.CANCEL(id));
export const deleteEmployeeTaxExemptionProofSubmission = async (id) => api.delete(ENDPOINTS.EMPLOYEE_TAX_EXEMPTION_PROOF_SUBMISSIONS.BY_ID(id));

// These edit screens are filled from the whole saved record (its id,
// timestamps, deleted flag, computed totals), and their endpoints refuse any
// field they do not take as "Unexpected fields in request body" — so no edit
// saved, not even ticking Arrear component. Each sends only what its form
// edits; a field left out is left as it is.
const only = (keys) => (values) => Object.fromEntries(Object.entries(values).filter(([key]) => keys.includes(key)));

export const salaryComponentPayload = only([
    "salaryComponentName", "abbreviation", "type", "companyId", "componentType", "isTaxApplicable", "dependsOnPaymentDays",
    "doNotIncludeInTotal", "statisticalComponent", "roundToNearestInteger", "exemptedFromIncomeTax", "removeIfZeroValued",
    "variableBasedOnTaxableSalary", "arrearComponent", "accrualComponent", "isActive",
]);

export const salaryStructurePayload = only([
    "salaryStructureName", "companyId", "payrollFrequency", "currency", "leaveEncashmentAmountPerDay", "isActive",
    "earnings", "deductions", "employerContributions",
]);

export const payrollPeriodPayload = only(["companyId", "startDate", "endDate", "isActive"]);

export const gratuityRulePayload = only([
    "name", "disable", "calculateGratuityAmountBasedOn", "totalWorkingDaysPerYear", "workExperienceCalculationFunction",
    "minimumYearForGratuity", "applicableEarningsComponent", "gratuityRuleSlabs",
]);

export const incomeTaxSlabPayload = only([
    "name", "companyId", "effectiveFromDate", "allowTaxExemption", "standardDeduction", "taxReliefLimit", "marginalReliefLimit",
    "disabled", "currency", "slabs", "otherTaxesAndCharges",
]);

export const taxExemptionSubCategoryPayload = only(["name", "exemptionCategoryId", "maxAmount", "description", "isActive"]);

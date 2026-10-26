/**
 * The screens the header's global search covers (ADR-043), in the order their
 * result groups appear.
 *
 * - screen  the screen's menuUrl — the same string its routes pass to
 *           checkPermission, and the admin entity config's `path`, so a result
 *           opens at `${screen}/${_id}`
 * - route   that screen's own list search route; the global search replays it
 *           as the caller (utils/globalSearch.js), so it inherits the screen's
 *           permission gate, data scope and searchFields exactly
 *
 * Only screens whose list search actually matches text belong here — a list
 * with `searchFields: []` ignores the term and would return every row.
 * globalSearch.test.js fails if a listed route stops applying the term or
 * loses its `checkPermission(screen, "read")` gate.
 *
 * Deliberately left out: system plumbing (menus, roles, email setup and
 * templates, dashboard widgets, audit log, admin users), which are not
 * business records.
 */
export const GLOBAL_SEARCH_SCREENS = Object.freeze([
  // People and their own records
  { screen: "/employee", route: "/employees/search" },
  { screen: "/leave-application", route: "/leave-applications/search" },
  { screen: "/compensatory-leave-request", route: "/compensatory-leave-requests/search" },
  { screen: "/attendance", route: "/attendances/search" },
  { screen: "/attendance-request", route: "/attendance-requests/search" },
  { screen: "/travel-request", route: "/travel-requests/search" },
  { screen: "/employee-grievance", route: "/employee-grievances/search" },
  { screen: "/employee-referral", route: "/employee-referrals/search" },
  { screen: "/employee-onboarding", route: "/employee-onboardings/search" },
  { screen: "/goal", route: "/goals/search" },
  { screen: "/employee-performance-feedback", route: "/employee-performance-feedbacks/search" },
  { screen: "/training-feedback", route: "/training-feedbacks/search" },
  // Recruitment and training
  { screen: "/job-applicant", route: "/job-applicants/search" },
  { screen: "/job-opening", route: "/job-openings/search" },
  { screen: "/training-event", route: "/training-events/search" },
  { screen: "/training-program", route: "/training-programs/search" },
  // Organisation setup
  { screen: "/company", route: "/companies/search" },
  { screen: "/branch", route: "/branches/search" },
  { screen: "/department", route: "/departments/search" },
  { screen: "/designation", route: "/designations/search" },
  { screen: "/employment-type", route: "/employment-types/search" },
  { screen: "/employee-grade", route: "/employee-grades/search" },
  { screen: "/employee-health-insurance", route: "/employee-health-insurances/search" },
  // Leave and shift setup
  { screen: "/leave-type", route: "/leave-types/search" },
  { screen: "/leave-policy", route: "/leave-policies/search" },
  { screen: "/holiday-list", route: "/holiday-lists/search" },
  { screen: "/leave-block-list", route: "/leave-block-lists/search" },
  { screen: "/shift-type", route: "/shift-types/search" },
  { screen: "/shift-location", route: "/shift-locations/search" },
  // Payroll, tax and expense setup
  { screen: "/salary-component", route: "/salary-components/search" },
  { screen: "/income-tax-slab", route: "/income-tax-slabs/search" },
  { screen: "/employee-tax-exemption-category", route: "/employee-tax-exemption-categories/search" },
  { screen: "/employee-tax-exemption-sub-category", route: "/employee-tax-exemption-sub-categories/search" },
  { screen: "/gratuity-rule", route: "/gratuity-rules/search" },
  { screen: "/expense-claim-type", route: "/expense-claim-types/search" },
  // Performance setup
  { screen: "/kra", route: "/kras/search" },
  { screen: "/appraisal-template", route: "/appraisal-templates/search" },
  { screen: "/appraisal-cycle", route: "/appraisal-cycles/search" },
  { screen: "/employee-feedback-criteria", route: "/employee-feedback-criteria/search" },
  // Other reference lists
  { screen: "/job-applicant-source", route: "/job-applicant-sources/search" },
  { screen: "/interview-type", route: "/interview-types/search" },
  { screen: "/job-offer-term-template", route: "/job-offer-term-templates/search" },
  { screen: "/employee-onboarding-template", route: "/employee-onboarding-templates/search" },
  { screen: "/employee-separation-template", route: "/employee-separation-templates/search" },
  { screen: "/skill", route: "/skills/search" },
  { screen: "/grievance-type", route: "/grievance-types/search" },
  { screen: "/purpose-of-travel", route: "/purpose-of-travels/search" },
  { screen: "/identification-document-type", route: "/identification-document-types/search" },
  { screen: "/country", route: "/countries/search" },
  { screen: "/state", route: "/states/search" },
  { screen: "/city", route: "/cities/search" },
  { screen: "/currency-master", route: "/currencies/search" },
]);

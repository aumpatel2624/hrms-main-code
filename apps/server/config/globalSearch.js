/**
 * The screens the header's global search covers (ADR-044), in the order their
 * result groups appear.
 *
 * - screen  the screen's menuUrl — the same string its routes pass to
 *           checkPermission, and the admin entity config's `path`, so a result
 *           opens at `${screen}/${_id}`
 * - route   that screen's own list search route; the global search replays it
 *           as the caller (utils/globalSearch.js), so it inherits the screen's
 *           permission gate, data scope and searchFields exactly
 *
 * Only screens whose list search actually applies the term belong here — its
 * `searchFields`, or `searchRefs` such as the row's employee by name or code.
 * A list that searches nothing ignores the term and would return every row.
 * globalSearch.test.js fails if a listed route stops applying the term or
 * loses its `checkPermission(screen, "read")` gate.
 *
 * Deliberately left out: system plumbing (menus, roles, email setup and
 * templates, dashboard widgets, audit log, admin users), which are not
 * business records; Leave Period, Payroll Period, Payroll Entry and Salary
 * Structure, which carry nothing identifying to match (dates, a company and
 * amounts); and Leave Ledger Entry, which has no view page to open.
 */
export const GLOBAL_SEARCH_SCREENS = Object.freeze([
  // People and their own records
  { screen: "/employee", route: "/employees/search" },
  { screen: "/leave-application", route: "/leave-applications/search" },
  { screen: "/compensatory-leave-request", route: "/compensatory-leave-requests/search" },
  { screen: "/leave-allocation", route: "/leave-allocations/search" },
  { screen: "/leave-adjustment", route: "/leave-adjustments/search" },
  { screen: "/leave-encashment", route: "/leave-encashments/search" },
  { screen: "/leave-policy-assignment", route: "/leave-policy-assignments/search" },
  { screen: "/holiday-list-assignment", route: "/holiday-list-assignments/search" },
  { screen: "/attendance", route: "/attendances/search" },
  { screen: "/attendance-request", route: "/attendance-requests/search" },
  { screen: "/employee-checkin", route: "/employee-checkins/search" },
  { screen: "/shift-assignment", route: "/shift-assignments/search" },
  { screen: "/shift-request", route: "/shift-requests/search" },
  { screen: "/shift-schedule-assignment", route: "/shift-schedule-assignments/search" },
  { screen: "/travel-request", route: "/travel-requests/search" },
  { screen: "/expense-claim", route: "/expense-claims/search" },
  { screen: "/employee-grievance", route: "/employee-grievances/search" },
  { screen: "/employee-referral", route: "/employee-referrals/search" },
  { screen: "/employee-onboarding", route: "/employee-onboardings/search" },
  { screen: "/employee-transfer", route: "/employee-transfers/search" },
  { screen: "/employee-promotion", route: "/employee-promotions/search" },
  { screen: "/employee-separation", route: "/employee-separations/search" },
  { screen: "/exit-interview", route: "/exit-interviews/search" },
  { screen: "/full-and-final-statement", route: "/full-and-final-statements/search" },
  { screen: "/employee-skill-map", route: "/employee-skill-maps/search" },
  { screen: "/goal", route: "/goals/search" },
  { screen: "/appraisal", route: "/appraisals/search" },
  { screen: "/employee-performance-feedback", route: "/employee-performance-feedbacks/search" },
  { screen: "/training-feedback", route: "/training-feedbacks/search" },
  // Pay, benefits and tax
  { screen: "/salary-slip", route: "/salary-slips/search" },
  { screen: "/salary-structure-assignment", route: "/salary-structure-assignments/search" },
  { screen: "/additional-salary", route: "/additional-salaries/search" },
  { screen: "/arrear", route: "/arrears/search" },
  { screen: "/retention-bonus", route: "/retention-bonuses/search" },
  { screen: "/employee-incentive", route: "/employee-incentives/search" },
  { screen: "/employee-other-income", route: "/employee-other-incomes/search" },
  { screen: "/salary-withholding", route: "/salary-withholdings/search" },
  { screen: "/payroll-correction", route: "/payroll-corrections/search" },
  { screen: "/employee-benefit-application", route: "/employee-benefit-applications/search" },
  { screen: "/employee-benefit-claim", route: "/employee-benefit-claims/search" },
  { screen: "/employee-benefit-ledger", route: "/employee-benefit-ledgers/search" },
  { screen: "/employee-tax-exemption-declaration", route: "/employee-tax-exemption-declarations/search" },
  { screen: "/employee-tax-exemption-proof-submission", route: "/employee-tax-exemption-proof-submissions/search" },
  { screen: "/gratuity", route: "/gratuities/search" },
  // Recruitment and training
  { screen: "/job-requisition", route: "/job-requisitions/search" },
  { screen: "/staffing-plan", route: "/staffing-plans/search" },
  { screen: "/job-opening", route: "/job-openings/search" },
  { screen: "/job-applicant", route: "/job-applicants/search" },
  { screen: "/interview", route: "/interviews/search" },
  { screen: "/interview-feedback", route: "/interview-feedbacks/search" },
  { screen: "/job-offer", route: "/job-offers/search" },
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
  { screen: "/shift-schedule", route: "/shift-schedules/search" },
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

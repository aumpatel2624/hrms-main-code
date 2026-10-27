// Dropdown labels for records every company has its own copy of. HR works
// group-wide, so a leave period, salary structure or job offer listed without
// its company looks exactly like the other companies' (the pre-production
// simulation saw five "2026-01-01 – 2026-12-31" periods and every structure
// as "INR", and picked the wrong company's).

const day = (value) => value?.slice?.(0, 10) ?? "";

export const withCompany = (label, companyName) => (companyName ? `${label} (${companyName})` : label);

export const leavePeriodLabel = (row, names) =>
    withCompany(`${day(row.fromDate)} – ${day(row.toDate)}`, names.get(String(row.companyId)));

export const salaryStructureLabel = (row, names) =>
    withCompany(`${row.payrollFrequency} — ${row.currency}`, names.get(String(row.companyId)));

// GET /job-offers populates the applicant and the company.
export const jobOfferLabel = (row) =>
    withCompany(`${row.status ?? "No status"} — ${row.jobApplicantId?.applicantName ?? "Unknown applicant"}`, row.companyId?.companyName);

// GET /interviews populates the applicant.
export const interviewLabel = (row) =>
    `${row.jobApplicantId?.applicantName ?? "Interview"} — ${day(row.scheduledOn)} (${row.status})`;

/**
 * A master record's own name plus its company — "Basic (Apidel)" — for row
 * dropdowns over designations, salary components and employees. `companyId`
 * may arrive as an id or populated.
 */
export const nameWithCompany = (key) => (row, names) =>
    withCompany(row[key], names.get(String(row.companyId?._id ?? row.companyId)));

export const companyNames = (companies = []) => new Map(companies.map((c) => [String(c._id), c.companyName]));

/** A select loader: `loadRows`' rows, each labelled by `labelOf(row, companyNames)`. */
export const companyLabelledOptions = (loadRows, loadCompanies, labelOf) => () =>
    Promise.all([loadRows(), loadCompanies()]).then(([rows, companies]) => {
        const names = companyNames(companies.data?.data);
        return (rows.data?.data ?? []).map((row) => ({ value: row._id, label: labelOf(row, names) }));
    });

/**
 * The Employee form's Department, Designation, Branch and Reports To: only the
 * chosen company's records, and none until a company is chosen. `load` takes
 * the company id.
 */
export const ofChosenCompany = (load, labelOf) => (values) => {
    const companyId = values.companyId?._id ?? values.companyId;
    if (!companyId) return Promise.resolve([]);
    return load(companyId).then((res) => (res.data?.data ?? []).map((row) => ({ value: row._id, label: labelOf(row) })));
};

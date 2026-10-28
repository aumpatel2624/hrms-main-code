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
    withCompany(`${row.salaryStructureName ? `${row.salaryStructureName} — ` : ""}${row.payrollFrequency} — ${row.currency}`, names.get(String(row.companyId)));

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

// Payroll Correction's slip: whose it is and which period, never its raw id.
export const salarySlipLabel = (row, employeeNames) =>
    `${employeeNames.get(String(row.employeeId?._id ?? row.employeeId)) ?? "Unknown employee"} — ${day(row.startDate)} – ${day(row.endDate)}`;

export const companyNames = (companies = []) => new Map(companies.map((c) => [String(c._id), c.companyName]));

const idOf = (value) => String(value?._id ?? value);
const nameOf = (names, value, fallback) => names.get(idOf(value)) ?? fallback;

// A "getAll" response's rows: a flat array, or runListQuery's `[{ count, data }]`.
const listRows = (res) => {
    const rows = res?.data?.data ?? [];
    return rows.length === 1 && Array.isArray(rows[0]?.data) ? rows[0].data : rows;
};

/**
 * A select loader: `loadRows`' rows, each labelled by `labelOf(row, names)`.
 * `names` maps every id in the `[loader, nameKey]` lists to its name, e.g.
 * `[[getAllEmployees, "employeeName"], [getAllCompanies, "companyName"]]`;
 * `nameKey` may instead be a function of the row.
 */
export const labelledOptions = (loadRows, nameLists, labelOf) => () =>
    Promise.all([loadRows(), ...nameLists.map(([load]) => load())]).then(([rows, ...lists]) => {
        const nameIn = (row, key) => (typeof key === "function" ? key(row) : row[key]);
        const names = new Map(lists.flatMap((list, index) => listRows(list).map((row) => [String(row._id), nameIn(row, nameLists[index][1])])));
        return listRows(rows).map((row) => ({ value: row._id, label: labelOf(row, names) }));
    });

/** A select loader: `loadRows`' rows, each labelled by `labelOf(row, companyNames)`. */
export const companyLabelledOptions = (loadRows, loadCompanies, labelOf) =>
    labelledOptions(loadRows, [[loadCompanies, "companyName"]], labelOf);

// "Ekta Bansal — Casual Leave — 2026-01-01 – 2026-12-31": every allocation
// otherwise reads as the same year.
export const leaveAllocationLabel = (row, names) =>
    `${nameOf(names, row.employeeId, "Unknown employee")} — ${nameOf(names, row.leaveTypeId, "Unknown leave type")} — ${day(row.fromDate)} – ${day(row.toDate)}`;

// "Ekta Bansal — from 2026-09-01 — Standard Monthly": not the bare currency.
export const salaryStructureAssignmentLabel = (row, names) =>
    `${nameOf(names, row.employeeId, "Unknown employee")} — from ${day(row.fromDate)} — ${nameOf(names, row.salaryStructureId, "Unknown structure")}`;

// Every company has a "2026-04-01 – 2027-03-31" payroll period.
export const payrollPeriodLabel = (row, names) =>
    withCompany(`${day(row.startDate)} – ${day(row.endDate)}`, names.get(idOf(row.companyId)));

// A parent goal is someone's: two people may both "Ship the billing module".
export const goalLabel = (row, names) =>
    withCompany(`${row.goalName} — ${row.employeeIdLabel ?? nameOf(names, row.employeeId, "Unknown employee")}`, names.get(idOf(row.companyId)));

// "every-2-weeks" → "Every 2 weeks".
export const readableFrequency = (frequency = "") => {
    const weeks = Number(frequency.match(/^every-(\d+)-weeks?$/)?.[1]);
    if (!weeks) return frequency;
    return weeks === 1 ? "Every week" : `Every ${weeks} weeks`;
};

// "Morning Shift — Every 2 weeks on Mon, Wed (Apidel)", not "every-2-weeks".
export const shiftScheduleLabel = (row, names) => {
    const days = (row.repeatOnDays ?? []).map((d) => d.slice(0, 3)).join(", ");
    const schedule = `${readableFrequency(row.frequency)}${days ? ` on ${days}` : ""}`;
    return withCompany(`${nameOf(names, row.shiftTypeId, "Unknown shift")} — ${schedule}`, names.get(idOf(row.companyId)));
};

/** A list cell for a linked record: its name, "(deleted)" once it is gone, never its id. */
export const linkedName = (name, id) => name || (id ? "(deleted)" : "—");

/** "employeeId" → "Employee", "createdAt" → "Created at", "isActive" → "Active". */
export const fieldLabel = (field) => {
    const words = field.replace(/Id$/, "").replace(/^is(?=[A-Z])/, "").replace(/([a-z0-9])([A-Z])/g, "$1 $2").toLowerCase();
    return words.charAt(0).toUpperCase() + words.slice(1);
};

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

/**
 * The Company form's Basic and HRA Salary Components: the company's own
 * components only, and none on a company not yet saved (none can be its own).
 * `id` is the form's record id; `load` lists components with their company.
 */
export const ofThisCompany = (load, labelOf) => (_values, { id } = {}) => {
    if (!id) return Promise.resolve([]);
    return load().then((res) => (res.data?.data ?? [])
        .filter((row) => String(row.companyId?._id ?? row.companyId) === String(id))
        .map((row) => ({ value: row._id, label: labelOf(row) })));
};

/**
 * Approver pickers: the current employees, plus any saved choice who is no
 * longer among them, found in `allRows` (the plain list, which keeps leavers)
 * and labelled "(left)".
 */
export const withSavedLeavers = (currentRows, savedIds, allRows) => {
    const options = currentRows.map((row) => ({ value: row._id, label: row.employeeName }));
    savedIds.filter((savedId) => !options.some((option) => String(option.value) === savedId)).forEach((savedId) => {
        const leaver = allRows.find((row) => String(row._id) === savedId);
        if (leaver) options.push({ value: leaver._id, label: `${leaver.employeeName} (left)` });
    });
    return options;
};

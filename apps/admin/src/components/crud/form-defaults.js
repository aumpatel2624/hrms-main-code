/**
 * The blank values a create form starts from. A multiselect starts empty
 * ([], not "", which the server cannot cast to an id list). Checkboxes start from their
 * `default`, except `isActive`, which starts checked unless a config says
 * otherwise — a new record is almost always meant to be live, and every
 * entity screen (current and future) gets that without repeating it.
 * Edit forms overwrite these with the stored record, so a record saved as
 * inactive still loads unchecked.
 */
export const initialFormValues = (fields) =>
    Object.fromEntries(
        fields.map((f) => [
            f.name,
            f.type === "checkbox"
                ? Boolean(f.default ?? f.name === "isActive")
                : (f.default ?? (f.type === "multiselect" ? [] : "")),
        ]),
    );

/**
 * A stored record as an edit form holds it. The API sends dates as full ISO
 * timestamps ("2026-09-15T00:00:00.000Z"), but a date input reads only
 * "YYYY-MM-DD", so a screen whose config did not trim them showed its saved
 * dates blank (Leave Application's From and To, F14). Dates are stored as
 * the chosen day at UTC midnight, so the day is the timestamp's first ten
 * characters.
 */
export const storedFormValues = (fields, values) => {
    const out = { ...values };
    fields.forEach((field) => {
        const value = out[field.name];
        if (field.type === "date" && typeof value === "string" && /^\d{4}-\d{2}-\d{2}T/.test(value)) {
            out[field.name] = value.slice(0, 10);
        }
    });
    return out;
};

/**
 * A create form opened with values handed over from another screen (an
 * onboarding's Create Employee opens Add Employee with the hire's details).
 * Blank handed-over values keep the form's own defaults.
 */
export const prefilledFormValues = (fields, initial, prefill) => {
    if (!prefill) return initial;
    const given = Object.fromEntries(Object.entries(prefill).filter(([, value]) => value !== null && value !== undefined && value !== ""));
    return storedFormValues(fields, { ...initial, ...given });
};

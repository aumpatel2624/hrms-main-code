/**
 * The blank values a create form starts from. Checkboxes start from their
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
            f.type === "checkbox" ? Boolean(f.default ?? f.name === "isActive") : (f.default ?? ""),
        ]),
    );

// A row dropdown left on "—" is unset, not "": the server cannot store "" as
// an enum value or an id ("TrainingEvent validation failed: employees.0.attendance:
// `` is not a valid enum value"), while an unset one takes the field's default.
export const emptyRow = (columns) =>
    Object.fromEntries(columns.filter((c) => c.type !== "select").map((c) => [c.name, c.type === "checkbox" ? false : ""]));

export const withCell = (row, column, value) => {
    const next = { ...row, [column.name]: value };
    if (column.type === "select" && value === "") delete next[column.name];
    return next;
};

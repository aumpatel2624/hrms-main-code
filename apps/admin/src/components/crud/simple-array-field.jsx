import { FormSection, FullWidth } from "@/components/ui/form";

/**
 * Minimal repeatable-row editor for an embedded array field (ADR-020,
 * Onboarding & Separation module) — this admin has no generic array/table
 * field type yet (module 3's `JobOffer.offerTerms` went unexposed on the
 * form for the same reason, flagged in STATE.md). Onboarding/Separation's
 * `activities` and Full and Final Statement's payables/receivables/assets
 * are central to those screens, not optional flavor text, so this builds
 * the smallest reusable version rather than punting again.
 *
 * `columns`: [{ name, label, type: "text"|"number"|"select"|"checkbox", options? }]
 * Reads/writes `values[fieldName]` as a plain array of row objects via the
 * same `setValues` updater `renderExtra` already receives from crud-form.jsx.
 */
const emptyRow = (columns) =>
    Object.fromEntries(columns.map((c) => [c.name, c.type === "checkbox" ? false : ""]));

const SimpleArrayField = ({ title, description, fieldName, columns, values, setValues }) => {
    const rows = values[fieldName] ?? [];

    const updateRow = (idx, colName, val) => {
        setValues((v) => {
            const next = [...(v[fieldName] ?? [])];
            next[idx] = { ...next[idx], [colName]: val };
            return { ...v, [fieldName]: next };
        });
    };

    const addRow = () => {
        setValues((v) => ({ ...v, [fieldName]: [...(v[fieldName] ?? []), emptyRow(columns)] }));
    };

    const removeRow = (idx) => {
        setValues((v) => ({ ...v, [fieldName]: (v[fieldName] ?? []).filter((_, i) => i !== idx) }));
    };

    return (
        <FormSection title={title} description={description}>
            <FullWidth>
                <div className="flex flex-col gap-2">
                    {rows.length === 0 && (
                        <p className="text-sm text-tertiary">No rows yet.</p>
                    )}
                    {rows.map((row, idx) => (
                        <div key={idx} className="flex flex-wrap items-end gap-2 rounded-lg border border-secondary p-2">
                            {columns.map((col) => (
                                <label key={col.name} className="flex flex-col gap-1 text-xs text-secondary">
                                    {col.label}
                                    {col.type === "select" ? (
                                        <select
                                            className="rounded-md border border-primary bg-primary px-2 py-1 text-sm text-primary"
                                            value={row[col.name] ?? ""}
                                            onChange={(e) => updateRow(idx, col.name, e.target.value)}
                                        >
                                            <option value="">—</option>
                                            {col.options.map((opt) => (
                                                <option key={opt} value={opt}>{opt}</option>
                                            ))}
                                        </select>
                                    ) : col.type === "checkbox" ? (
                                        <input
                                            type="checkbox"
                                            checked={Boolean(row[col.name])}
                                            onChange={(e) => updateRow(idx, col.name, e.target.checked)}
                                        />
                                    ) : (
                                        <input
                                            type={col.type === "number" ? "number" : "text"}
                                            className="rounded-md border border-primary bg-primary px-2 py-1 text-sm text-primary"
                                            value={row[col.name] ?? ""}
                                            onChange={(e) =>
                                                updateRow(idx, col.name, col.type === "number" ? Number(e.target.value) : e.target.value)
                                            }
                                        />
                                    )}
                                </label>
                            ))}
                            <button
                                type="button"
                                className="rounded-md border border-primary px-2 py-1 text-xs text-secondary hover:bg-secondary"
                                onClick={() => removeRow(idx)}
                            >
                                Remove
                            </button>
                        </div>
                    ))}
                    <button
                        type="button"
                        className="w-fit rounded-md border border-primary px-3 py-1.5 text-sm text-secondary hover:bg-secondary"
                        onClick={addRow}
                    >
                        + Add row
                    </button>
                </div>
            </FullWidth>
        </FormSection>
    );
};

export default SimpleArrayField;

import { Plus, Trash01, X as XClose } from "@untitledui/icons";
import { Button } from "@/components/base/buttons/button";
import { ButtonUtility } from "@/components/base/buttons/button-utility";
import { Input } from "@/components/base/input/input";
import { SelectField } from "@/components/ui/field";
import { Select } from "@/components/base/select/select";

/** Operators offered per field type. Mirrors utils/listQuery.js on the server. */
export const OPERATORS_BY_TYPE = {
    string: [
        { value: "contains", label: "contains" },
        { value: "notContains", label: "does not contain" },
        { value: "eq", label: "is" },
        { value: "ne", label: "is not" },
        { value: "startsWith", label: "starts with" },
        { value: "endsWith", label: "ends with" },
        { value: "isEmpty", label: "is empty" },
        { value: "isNotEmpty", label: "is not empty" },
    ],
    number: [
        { value: "eq", label: "=" },
        { value: "ne", label: "≠" },
        { value: "gt", label: ">" },
        { value: "gte", label: "≥" },
        { value: "lt", label: "<" },
        { value: "lte", label: "≤" },
        { value: "between", label: "between" },
    ],
    boolean: [{ value: "eq", label: "is" }],
    date: [
        { value: "eq", label: "on" },
        { value: "gt", label: "after" },
        { value: "lt", label: "before" },
        { value: "between", label: "between" },
    ],
    enum: [
        { value: "eq", label: "is" },
        { value: "ne", label: "is not" },
    ],
    objectId: [
        { value: "eq", label: "is" },
        { value: "ne", label: "is not" },
    ],
};

const NO_VALUE = ["isEmpty", "isNotEmpty"];

const blankRow = (fields) => ({
    field: fields[0]?.name ?? "",
    op: OPERATORS_BY_TYPE[fields[0]?.type ?? "string"][0].value,
    value: "",
});

/** One filter row: field, operator, value. */
const FilterRow = ({ row, fields, lookups, onChange, onRemove }) => {
    const field = fields.find((f) => f.name === row.field) ?? fields[0];
    const type = field?.type ?? "string";
    const operators = OPERATORS_BY_TYPE[type] ?? OPERATORS_BY_TYPE.string;
    const needsValue = !NO_VALUE.includes(row.op);

    const valueInput = () => {
        if (!needsValue) return <div className="hidden sm:block" />;

        if (type === "boolean") {
            return (
                <SelectField
                    aria-label="Value"
                    options={[
                        { value: "true", label: "Yes" },
                        { value: "false", label: "No" },
                    ]}
                    value={String(row.value)}
                    onChange={(o) => onChange({ ...row, value: o ? o.value === "true" : "" })}
                />
            );
        }

        if (type === "enum" || type === "objectId") {
            return (
                <SelectField
                    aria-label="Value"
                    placeholder="Search..."
                    options={lookups?.[field.optionsFrom] ?? field.options ?? []}
                    value={row.value}
                    onChange={(o) => onChange({ ...row, value: o ? o.value : "" })}
                />
            );
        }

        const inputType = type === "date" ? "date" : type === "number" ? "number" : "text";

        if (row.op === "between") {
            const [from = "", to = ""] = Array.isArray(row.value) ? row.value : ["", ""];
            return (
                <div className="flex items-center gap-2">
                    <Input aria-label="From" type={inputType} value={from} onChange={(v) => onChange({ ...row, value: [v, to] })} />
                    <span className="text-sm text-tertiary">and</span>
                    <Input aria-label="To" type={inputType} value={to} onChange={(v) => onChange({ ...row, value: [from, v] })} />
                </div>
            );
        }

        return (
            <Input
                aria-label="Value"
                type={inputType}
                placeholder="Value"
                value={row.value ?? ""}
                onChange={(v) => onChange({ ...row, value: v })}
            />
        );
    };

    return (
        <div className="grid grid-cols-1 items-start gap-2 sm:grid-cols-[minmax(0,1fr)_minmax(0,150px)_minmax(0,1.2fr)_auto]">
            <SelectField
                aria-label="Field"
                options={fields.map((f) => ({ value: f.name, label: f.label }))}
                value={row.field}
                onChange={(o) => {
                    const next = fields.find((f) => f.name === o?.value);
                    const nextType = next?.type ?? "string";
                    onChange({ field: o?.value ?? "", op: OPERATORS_BY_TYPE[nextType][0].value, value: "" });
                }}
            />
            <Select
                aria-label="Operator"
                selectedKey={row.op}
                onSelectionChange={(key) => onChange({ ...row, op: String(key), value: NO_VALUE.includes(String(key)) ? "" : row.value })}
                items={operators.map((o) => ({ id: o.value, label: o.label }))}
            >
                {(item) => <Select.Item id={item.id}>{item.label}</Select.Item>}
            </Select>
            {valueInput()}
            <ButtonUtility size="sm" color="tertiary" icon={Trash01} tooltip="Remove" aria-label="Remove filter" onClick={onRemove} />
        </div>
    );
};

/**
 * Condition builder shown under the page header. Filters are only sent when
 * Apply is pressed, so typing doesn't fire a request per keystroke.
 */
const FilterPanel = ({ fields = [], rows = [], matchType = "all", lookups, onChange, onApply, onReset, onClose }) => {
    if (!fields.length) return null;

    return (
        <div className="mt-4 rounded-xl bg-primary p-4 shadow-xs ring-1 ring-secondary">
            <div className="flex items-center justify-between pb-3">
                <h2 className="text-sm font-semibold text-primary">Filters</h2>
                <ButtonUtility size="sm" color="tertiary" icon={XClose} tooltip="Close" aria-label="Close filters" onClick={onClose} />
            </div>

            <div className="flex flex-col gap-2">
                {rows.length === 0 && <p className="py-2 text-sm text-tertiary">No filters yet. Add one to narrow the list.</p>}
                {rows.map((row, index) => (
                    <FilterRow
                        key={index}
                        row={row}
                        fields={fields}
                        lookups={lookups}
                        onChange={(next) => onChange(rows.map((r, i) => (i === index ? next : r)))}
                        onRemove={() => onChange(rows.filter((_, i) => i !== index))}
                    />
                ))}
            </div>

            <div className="flex flex-col gap-3 pt-4 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex items-center gap-3">
                    <Button size="sm" color="secondary" iconLeading={Plus} onClick={() => onChange([...rows, blankRow(fields)])}>
                        Add filter
                    </Button>
                    {rows.length > 1 && (
                        <div className="flex items-center gap-2">
                            <span className="text-sm text-tertiary">Match</span>
                            <Select
                                aria-label="Match type"
                                size="sm"
                                selectedKey={matchType}
                                onSelectionChange={(key) => onChange(rows, String(key))}
                                items={[
                                    { id: "all", label: "All" },
                                    { id: "any", label: "Any" },
                                ]}
                            >
                                {(item) => <Select.Item id={item.id}>{item.label}</Select.Item>}
                            </Select>
                        </div>
                    )}
                </div>

                <div className="flex items-center gap-3">
                    <Button size="sm" color="tertiary" onClick={onReset}>
                        Reset
                    </Button>
                    <Button size="sm" onClick={onApply}>
                        Apply
                    </Button>
                </div>
            </div>
        </div>
    );
};

export default FilterPanel;

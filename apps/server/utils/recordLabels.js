import mongoose from "mongoose";

/**
 * Names for records a screen only knows by id — a Dashboard Builder filter
 * value, the before/after of a reference field in the Audit Log. Nobody can
 * read a 24-character ObjectId, so each id becomes the record's own name, its
 * employee and dates where it has no name, and its company.
 *
 * Returns names, never pay or personal fields: only the name-like path, the
 * dates and the names of its employee, leave type, shift type, salary
 * structure and company are read.
 *
 * Split like listQuery: pure builders (unit-tested, no database) plus a thin
 * runner.
 */

const OBJECT_ID = /^[0-9a-f]{24}$/i;

// References named alongside a record that has no name of its own.
const CONTEXT_REFS = ["employeeId", "leaveTypeId", "shiftTypeId", "salaryStructureId"];
const DATE_PAIRS = [["fromDate", "toDate"], ["startDate", "endDate"]];

const day = (value) => (value ? new Date(value).toISOString().slice(0, 10) : "");

const pathRef = (schema, field) => {
  const path = schema.path(field);
  return path?.options?.ref ?? path?.caster?.options?.ref ?? null;
};

/**
 * The model a reference field points at: its schema `ref`, or failing that
 * the model its name implies ("payrollPeriodId" → "PayrollPeriod"). Null for a
 * plain string field that only looks like a reference (a check-in's deviceId).
 */
export const refModelName = (schema, field, modelNames = mongoose.modelNames()) => {
  const ref = pathRef(schema, field);
  if (ref) return ref;
  const path = schema.path(field);
  if (path && path.instance !== "ObjectId") return null;
  const guess = field.replace(/Id$/, "");
  const name = guess.charAt(0).toUpperCase() + guess.slice(1);
  return modelNames.includes(name) ? name : null;
};

/** The schema path that names a record: `employeeName`, `title`, `name`… */
export const nameField = (schema) =>
  Object.keys(schema.paths).find((path) => !path.includes(".") && /(^name|Name|^title|Title)$/.test(path)) ?? null;

/**
 * One record's label from its own fields plus the names of what it points at
 * (`names.get(id)`): "Ekta Bansal — Casual Leave — 2026-01-01 – 2026-12-31 (Apidel)".
 */
export const recordLabel = (row, { nameKey = null, names = new Map() } = {}) => {
  const parts = CONTEXT_REFS.map((key) => names.get(String(row[key] ?? ""))).filter(Boolean);
  if (nameKey && row[nameKey]) parts.push(row[nameKey]);
  const dates = DATE_PAIRS.find(([from]) => row[from]);
  if (dates && !(nameKey && row[nameKey])) {
    parts.push(row[dates[1]] ? `${day(row[dates[0]])} – ${day(row[dates[1]])}` : `from ${day(row[dates[0]])}`);
  }
  const label = parts.join(" — ") || "Unnamed record";
  const company = names.get(String(row.companyId ?? ""));
  return company ? `${label} (${company})` : label;
};

/** `{ id → name }` for the records `ids` point at in `modelName`, one level only. */
const namesOf = async (modelName, ids) => {
  if (!ids.length || !mongoose.modelNames().includes(modelName)) return new Map();
  const Model = mongoose.model(modelName);
  const key = nameField(Model.schema);
  if (!key) return new Map();
  const rows = await Model.find({ _id: { $in: ids } }).select(key).lean();
  return new Map(rows.map((row) => [String(row._id), row[key]]));
};

/**
 * `{ id → label }` for `ids` in `modelName`. An id with no record behind it is
 * simply absent — callers show "(deleted)".
 */
export const describeRecords = async (modelName, ids) => {
  const wanted = [...new Set(ids.map(String))].filter((id) => OBJECT_ID.test(id));
  if (!wanted.length || !mongoose.modelNames().includes(modelName)) return new Map();
  const Model = mongoose.model(modelName);
  const { schema } = Model;
  const nameKey = nameField(schema);
  const contextKeys = [...CONTEXT_REFS, "companyId"].filter((key) => pathRef(schema, key));
  const dateKeys = DATE_PAIRS.flat().filter((key) => schema.path(key));
  const rows = await Model.find({ _id: { $in: wanted } })
    .select([nameKey, ...contextKeys, ...dateKeys].filter(Boolean).join(" "))
    .lean();

  const names = new Map();
  for (const key of contextKeys) {
    const found = await namesOf(pathRef(schema, key), rows.map((row) => row[key]).filter(Boolean));
    found.forEach((name, id) => names.set(id, name));
  }
  return new Map(rows.map((row) => [String(row._id), recordLabel(row, { nameKey, names })]));
};

/** The ids an audit value holds: one id, a JSON list of ids, or none. */
export const idsInValue = (value) => {
  if (typeof value !== "string") return [];
  if (OBJECT_ID.test(value)) return [value];
  try {
    const list = JSON.parse(value);
    return Array.isArray(list) && list.length && list.every((id) => OBJECT_ID.test(id)) ? list : [];
  } catch {
    return [];
  }
};

/**
 * The Audit Log's before/after of `modelName`'s reference fields, by name:
 * each such change gains `fromLabel` / `toLabel` ("Engineering (Apidel)",
 * "(deleted)" once the record is gone). Other changes pass through as stored.
 */
export const labelChanges = async (modelName, changes = []) => {
  if (!mongoose.modelNames().includes(modelName)) return changes;
  const { schema } = mongoose.model(modelName);
  const refs = changes.map((change) => refModelName(schema, change.field));
  const labels = new Map();
  for (const ref of new Set(refs.filter(Boolean))) {
    const ids = changes.flatMap((change, index) => (refs[index] === ref ? [...idsInValue(change.from), ...idsInValue(change.to)] : []));
    (await describeRecords(ref, ids)).forEach((label, id) => labels.set(id, label));
  }
  const labelOf = (value) => {
    const ids = idsInValue(value);
    return ids.length ? ids.map((id) => labels.get(id) ?? "(deleted)").join(", ") : undefined;
  };
  return changes.map((change, index) => (refs[index]
    ? { ...change, fromLabel: labelOf(change.from), toLabel: labelOf(change.to) }
    : change));
};

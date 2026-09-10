import {
  IGNORED_FIELDS,
  MAX_CHANGES,
  MAX_VALUE_LENGTH,
  REDACTED_FIELDS,
} from "../config/audit.js";

/**
 * Turning two versions of a document into a list of what changed.
 *
 * Pure — no Mongoose, no database, no request. That is what makes the
 * interesting part of the audit trail testable without a harness, and it is the
 * same split as `listQuery.js` and `seoResolve.js`.
 */

export const REDACTED = "[REDACTED]";

/** Match on the last path segment so `emailFrom.appPassword` is caught too. */
export const isSecret = (field) => {
  const leaf = String(field).split(".").pop().toLowerCase();
  return REDACTED_FIELDS.some((secret) => leaf === secret.toLowerCase());
};

const isIgnored = (field) => {
  const leaf = String(field).split(".").pop();
  return IGNORED_FIELDS.includes(field) || IGNORED_FIELDS.includes(leaf);
};

/**
 * Reduce a stored value to something readable and bounded.
 *
 * ObjectIds and Dates would otherwise serialise as objects nobody can read, and
 * a rich-text email body would put a page of HTML in the log.
 */
export const summarise = (value, maxLength = MAX_VALUE_LENGTH) => {
  if (value === undefined || value === null) return null;
  if (value instanceof Date) return value.toISOString();
  if (typeof value === "boolean" || typeof value === "number") return value;

  // ObjectId and anything else with a meaningful toString, but not a plain
  // object — those stringify to "[object Object]".
  if (typeof value === "object" && !Array.isArray(value)) {
    if (typeof value.toHexString === "function") return value.toHexString();
    const json = JSON.stringify(value);
    return json.length > maxLength ? `${json.slice(0, maxLength)}…` : json;
  }

  if (Array.isArray(value)) {
    const json = JSON.stringify(value.map((entry) => summarise(entry, maxLength)));
    return json.length > maxLength ? `${json.slice(0, maxLength)}…` : json;
  }

  const text = String(value);
  return text.length > maxLength ? `${text.slice(0, maxLength)}…` : text;
};

/**
 * Flatten a document to dot paths so a change inside `robots` reads as
 * `robots.index: true → false` rather than "the whole robots object changed".
 *
 * Arrays stay whole: exploding `roles[47].read` into its own row would bury the
 * one change that matters under forty-six identical ones.
 */
export const flatten = (source, prefix = "", out = {}) => {
  if (source === null || source === undefined) return out;
  const plain = typeof source.toObject === "function" ? source.toObject() : source;

  for (const [key, value] of Object.entries(plain)) {
    const path = prefix ? `${prefix}.${key}` : key;
    if (isIgnored(path)) continue;

    const isPlainObject =
      value !== null &&
      typeof value === "object" &&
      !Array.isArray(value) &&
      !(value instanceof Date) &&
      typeof value.toHexString !== "function";

    if (isPlainObject) flatten(value, path, out);
    else out[path] = value;
  }
  return out;
};

const same = (a, b) => {
  if (a === b) return true;
  if (a === null || a === undefined) return b === null || b === undefined;
  if (b === null || b === undefined) return false;
  return JSON.stringify(a) === JSON.stringify(b);
};

/**
 * @param before  the document as it was, or null for a create
 * @param after   the document as it is, or null for a hard delete
 * @returns [{ field, from, to }], secrets redacted, capped at MAX_CHANGES
 */
export const diffDocuments = (before, after, { maxChanges = MAX_CHANGES } = {}) => {
  const from = flatten(before);
  const to = flatten(after);
  const changes = [];

  for (const field of new Set([...Object.keys(from), ...Object.keys(to)])) {
    if (same(from[field], to[field])) continue;

    // Record that a secret changed, never the value on either side.
    if (isSecret(field)) {
      changes.push({ field, from: from[field] === undefined ? null : REDACTED, to: REDACTED });
      continue;
    }
    changes.push({ field, from: summarise(from[field]), to: summarise(to[field]) });
  }

  changes.sort((a, b) => a.field.localeCompare(b.field));
  return changes.length > maxChanges ? changes.slice(0, maxChanges) : changes;
};

/**
 * The document an update *will* produce, derived from the update payload rather
 * than read back.
 *
 * Re-reading after the write would be a second query on every update. Every
 * controller here updates with `$set`-shaped payloads, so applying them to the
 * before-image is exact. Operators that need the stored value to compute a
 * result — `$inc`, `$push` and friends — cannot be resolved this way and are
 * reported as the operation rather than a wrong value.
 */
/**
 * Deep-copy plain structure only. `structuredClone` would turn an ObjectId into
 * `{ buffer: Uint8Array }` — losing `toHexString`, so every id in the log would
 * render as unreadable bytes. Non-plain values are shared by reference, which is
 * safe here because nothing mutates them.
 */
const clone = (value) => {
  if (Array.isArray(value)) return value.map(clone);
  if (value === null || typeof value !== "object") return value;
  if (value instanceof Date || typeof value.toHexString === "function") return value;
  return Object.fromEntries(Object.entries(value).map(([key, entry]) => [key, clone(entry)]));
};

export const applyUpdate = (before, update = {}) => {
  const after = clone(typeof before?.toObject === "function" ? before.toObject() : (before ?? {}));

  const setAtPath = (target, path, value) => {
    const parts = String(path).split(".");
    let node = target;
    for (const part of parts.slice(0, -1)) {
      if (typeof node[part] !== "object" || node[part] === null) node[part] = {};
      node = node[part];
    }
    node[parts.at(-1)] = value;
  };

  for (const [key, value] of Object.entries(update)) {
    if (key === "$set") {
      for (const [path, next] of Object.entries(value)) setAtPath(after, path, next);
    } else if (key === "$unset") {
      for (const path of Object.keys(value)) setAtPath(after, path, null);
    } else if (key === "$setOnInsert") {
      continue; // only applies when nothing matched, which is not an update
    } else if (key.startsWith("$")) {
      // $inc/$push/$pull — the result depends on the stored value, so flag the
      // field as touched rather than inventing a number.
      for (const path of Object.keys(value ?? {})) setAtPath(after, path, `[${key}]`);
    } else {
      setAtPath(after, key, value);
    }
  }
  return after;
};

/**
 * What kind of change this was.
 *
 * Soft delete arrives as an ordinary update setting `isDeleted`, so it has to be
 * recognised here or every delete in the panel would be logged as an edit.
 */
export const classifyUpdate = (before, after) => {
  const wasDeleted = Boolean(before?.isDeleted);
  const isDeleted = Boolean(after?.isDeleted);
  if (!wasDeleted && isDeleted) return "delete";
  if (wasDeleted && !isDeleted) return "restore";
  return "update";
};

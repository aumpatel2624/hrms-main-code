/**
 * Many entity configs pass a plain enum array (`options: ["Open", "Closed"]`,
 * sometimes with a bare `null` for "unset") rather than the `{ value, label }`
 * shape. Normalise both here, once, rather than rewriting every one of those
 * config fields to the object shape. Every reader of `field.options` — the
 * form's dropdown and the read-only view — goes through this, so a bare `null`
 * or string never reaches code that reads `.value`.
 */
export const normalizeOption = (o) =>
    o === null || o === undefined
        ? { value: null, label: "—" }
        : typeof o === "object"
          ? o
          : { value: o, label: String(o) };

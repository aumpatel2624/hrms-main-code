/**
 * JSON replacer that drops credential fields from every API response.
 *
 * Since ADR-040 the login password hash lives on Employee, and 49 aggregation
 * `$lookup`s across 21 controllers embed the whole looked-up employee (an
 * approver, a manager, a reviewer…) inside list/detail rows. Aggregation does
 * not honour `select: false`, so each of those rows carried the hash. Fixing
 * every lookup individually is easy to miss on the next one; this closes the
 * hole at the one place every response passes through.
 *
 * Wired in with `app.set("json replacer", …)` — Express applies it inside
 * res.json(). No response is meant to carry a `password` key, and no other
 * model has one.
 */
export const stripCredentials = (key, value) => (key === "password" ? undefined : value);

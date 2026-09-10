/**
 * What the audit trail records, and what it deliberately does not.
 *
 * The plugin in `models/auditPlugin.js` reads this. Everything here is a
 * conscious exclusion — an audit log full of machine noise is one nobody reads,
 * and one containing a password is worse than none at all.
 */

/**
 * Collections never audited.
 *
 * - `AuditLog` — auditing the audit log is an infinite loop.
 * - `Otp` — consumed tokens are deleted on purpose; a log of them is a log of
 *   live credentials.
 * - `LoginAttempt` — per-user lock state, rewritten on every login attempt.
 *   Authentication history already has its own screen.
 * - `SeoUrl` / `SeoNotFound` — written by the public website, thousands of rows,
 *   no human decision behind any of them.
 */
export const SKIP_MODELS = Object.freeze([
  "AuditLog",
  "Otp",
  "LoginAttempt",
  "SeoUrl",
  "SeoNotFound",
]);

/**
 * Field names whose values are replaced with "[REDACTED]", matched on the last
 * segment of the path so `emailFrom.appPassword` is caught too.
 *
 * The audit log records *that* a secret changed, never what it changed to or
 * from. A hashed password is still a credential.
 */
export const REDACTED_FIELDS = Object.freeze([
  "password",
  "appPassword",
  "siteKey",
  "otp",
  "token",
  "secret",
  "apiKey",
]);

/**
 * Paths never worth a row: Mongoose bookkeeping, and the two flags whose change
 * is already carried by the action itself.
 */
export const IGNORED_FIELDS = Object.freeze([
  "_id",
  "__v",
  "createdAt",
  "updatedAt",
  "isDeleted",
]);

/** A rich-text email template would otherwise put its whole body in the log. */
export const MAX_VALUE_LENGTH = 500;

/** Guards against a pathological document producing a thousand-row change list. */
export const MAX_CHANGES = 50;

/**
 * Data-scope values stored on UserRoles.dataScope (ADR-002) and, as of
 * ADR-024 (Q-4), optionally overridden per menu row on UserRoles.roles[].
 * The server narrows queries with them and the admin UI offers them in the
 * role permissions screen, so the strings have to match character-for-character.
 *
 * - all        — no narrowing; the role sees every row.
 * - department — rows whose department field matches the user's departmentId.
 * - own        — rows whose owner field matches the user's id.
 * - approver   — rows owned by the user themself OR by anyone the user
 *                resolves as the approver for (ADR-024, utils/approvers.js).
 *                Needs a `scopeable.owner` field and a caller-resolved
 *                `scopeable.approverIds` array — see utils/scope.js.
 *
 * A model opts in per dimension via the `scopeable` map it passes to
 * buildScopeFilter(); a model that does not declare the demanded dimension
 * stays unscoped (master data is readable regardless of scope).
 */
export const SCOPES = Object.freeze({
    ALL: "all",
    DEPARTMENT: "department",
    OWN: "own",
    APPROVER: "approver",
});

/** Enum list for schema validation and dropdowns. */
export const SCOPE_VALUES = Object.freeze(Object.values(SCOPES));

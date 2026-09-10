/**
 * Canonical role strings. The server puts these on the session and the admin UI
 * branches on them, so they have to match character-for-character.
 */
export const ROLES = Object.freeze({
    ADMIN: "ADMIN",
    USER: "USER",
});

/** Route guard lists for authMiddleware(). */
export const ADMIN_ONLY = Object.freeze([ROLES.ADMIN]);
export const ANY_ROLE = Object.freeze([ROLES.ADMIN, ROLES.USER]);

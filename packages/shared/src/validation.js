/**
 * Password policy. Enforced wherever a password is *set* - create and reset -
 * on both the client and the server.
 *
 * Login deliberately does NOT enforce this: accounts created before the rule
 * existed must still be able to sign in, and a 400 at login would lock them out
 * permanently with no reset path from the login screen. Login only checks
 * non-empty and MAX_LENGTH.
 */
export const PASSWORD = Object.freeze({
    MIN_LENGTH: 8,
    MAX_LENGTH: 128,
    PATTERN: /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/,
    MESSAGE:
        "Password must be at least 8 characters and contain an uppercase letter, a lowercase letter and a number",
});

export const isStrongPassword = (value) =>
    typeof value === "string" &&
    value.length >= PASSWORD.MIN_LENGTH &&
    value.length <= PASSWORD.MAX_LENGTH &&
    PASSWORD.PATTERN.test(value);

/**
 * Client-side email pre-check only. The server stays authoritative and keeps
 * using validator.js isEmail(), which is stricter than any regex worth
 * shipping; this just stops obviously-bad input before a round trip.
 */
export const EMAIL = Object.freeze({
    MAX_LENGTH: 254, // RFC 5321
    PATTERN: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
});

export const isValidEmail = (value) =>
    typeof value === "string" &&
    value.length <= EMAIL.MAX_LENGTH &&
    EMAIL.PATTERN.test(value);

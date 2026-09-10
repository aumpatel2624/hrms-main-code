/** Failed-login lockout. The server enforces it, the UI counts down against it. */
export const LOGIN = Object.freeze({
    MAX_ATTEMPTS: 3,
    LOCK_DURATION_MS: 24 * 60 * 60 * 1000,
});

/** One-time password for the forgot-password flow. */
export const OTP = Object.freeze({
    LENGTH: 6,
    TTL_MS: 10 * 60 * 1000,
    RESEND_COOLDOWN_MS: 60 * 1000,
});

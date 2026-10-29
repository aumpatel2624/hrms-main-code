import AuthThrottle from "../models/AuthThrottle.js";

/**
 * Attempt limits for sign-in, forgot-password and change-password (ADR-067).
 *
 * The per-account sign-in lockout (authService.js) stops guessing one
 * person's password; these stop one address guessing across many accounts,
 * and cap forgot-password codes per email. The counts live in MongoDB, so
 * every server process (PM2 can run several) counts against the same limit.
 *
 * Each attempt is counted before it runs, so attempts sent together cannot
 * all slip under the limit, and one that succeeds is given back: an office
 * signing in all its staff from one public address never uses up the
 * address's allowance. Behind nginx `req.ip` is the browser's address only
 * because server.js sets `trust proxy` to 1.
 */
const MINUTE = 60 * 1000;
const HOUR = 60 * MINUTE;

export const LIMITS = Object.freeze({
  // Failed sign-ins from one address — generous, for a shared office address.
  login: { windowMs: 15 * MINUTE, perIp: 100 },
  // Every code request counts: each one may send an email.
  otpSend: { windowMs: HOUR, perEmail: 5, perIp: 30 },
  // Wrong codes, across /otp/verify and /otp/reset-password together.
  otpCheck: { windowMs: HOUR, perEmail: 10, perIp: 50 },
  // Wrong current passwords on Change password, per signed-in account.
  passwordChange: { windowMs: 15 * MINUTE, perAccount: 5 },
});

export const TOO_MANY_ATTEMPTS = Object.freeze({
  isOk: false,
  status: 429,
  error: "Too many attempts",
  message: "Too many attempts. Please wait a while and try again.",
});

/**
 * Count one attempt against `key` and return the count in the current
 * window. A window that has run out starts again at 1.
 */
export const countAttempt = async (key, windowMs) => {
  const now = new Date();
  const inWindow = await AuthThrottle.findOneAndUpdate(
    { key, expiresAt: { $gt: now } },
    { $inc: { count: 1 } },
    { new: true },
  );
  if (inWindow) return inWindow.count;

  const restart = () => AuthThrottle.findOneAndUpdate(
    { key },
    { $set: { count: 1, expiresAt: new Date(now.getTime() + windowMs) } },
    { new: true, upsert: true },
  );
  try {
    return (await restart()).count;
  } catch (error) {
    // Two first attempts raced to insert the row; the loser lands on it.
    if (error?.code !== 11000) throw error;
    return countAttempt(key, windowMs);
  }
};

/** Give back an attempt that succeeded. */
export const releaseAttempt = (key) =>
  AuthThrottle.updateOne({ key, count: { $gt: 0 } }, { $inc: { count: -1 } });

/**
 * Route middleware. `limits(req)` lists `{ key, max }` pairs (a pair whose
 * key is empty is skipped); the request is refused with 429 once any of them
 * is over its max. With `releaseOnSuccess`, a reply below 400 gives every
 * attempt back, so only failures stay counted.
 */
export const limitAttempts = ({ windowMs, limits, releaseOnSuccess = true }) => async (req, res, next) => {
  try {
    const counted = limits(req).filter(({ key }) => key);
    const counts = await Promise.all(counted.map(({ key }) => countAttempt(key, windowMs)));
    if (counts.some((count, i) => count > counted[i].max)) {
      res.setHeader("Retry-After", String(Math.ceil(windowMs / 1000)));
      return res.status(429).json(TOO_MANY_ATTEMPTS);
    }
    if (releaseOnSuccess) {
      res.on("finish", () => {
        if (res.statusCode >= 400) return;
        Promise.all(counted.map(({ key }) => releaseAttempt(key)))
          .catch((error) => console.error("authThrottle: release failed", error));
      });
    }
    return next();
  } catch (error) {
    console.error("authThrottle: count failed", error);
    return res.status(500).json({ isOk: false, status: 500, message: "Internal server error" });
  }
};

const ipKey = (scope, req) => `${scope}:ip:${req.ip || "unknown"}`;
const emailKey = (scope, req) => {
  const email = String(req.body?.email || "").trim().toLowerCase();
  return email && `${scope}:email:${email}`;
};

export const loginLimiter = limitAttempts({
  windowMs: LIMITS.login.windowMs,
  limits: (req) => [{ key: ipKey("login", req), max: LIMITS.login.perIp }],
});

export const otpSendLimiter = limitAttempts({
  windowMs: LIMITS.otpSend.windowMs,
  releaseOnSuccess: false,
  limits: (req) => [
    { key: emailKey("otp-send", req), max: LIMITS.otpSend.perEmail },
    { key: ipKey("otp-send", req), max: LIMITS.otpSend.perIp },
  ],
});

export const otpCheckLimiter = limitAttempts({
  windowMs: LIMITS.otpCheck.windowMs,
  limits: (req) => [
    { key: emailKey("otp-check", req), max: LIMITS.otpCheck.perEmail },
    { key: ipKey("otp-check", req), max: LIMITS.otpCheck.perIp },
  ],
});

export const passwordChangeLimiter = limitAttempts({
  windowMs: LIMITS.passwordChange.windowMs,
  limits: (req) => [{ key: `password-change:account:${req.user.id}`, max: LIMITS.passwordChange.perAccount }],
});

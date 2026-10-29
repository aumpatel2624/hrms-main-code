import mongoose from "mongoose";

// Failed-attempt counters for the sign-in and forgot-password limiter
// (utils/authThrottle.js, ADR-067). Kept in MongoDB rather than process memory
// so every server process counts against the same limit. Machine state, like
// Otp: not audited and not a reporting source.
const authThrottleSchema = new mongoose.Schema({
  // "<limit>:<ip|email|account>:<value>", e.g. "login:ip:203.0.113.7"
  key: { type: String, required: true, unique: true },
  count: { type: Number, default: 0 },
  // End of the counting window; the TTL index removes the row after it.
  expiresAt: { type: Date, required: true },
});

authThrottleSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

const AuthThrottle = mongoose.model("AuthThrottle", authThrottleSchema);

export default AuthThrottle;

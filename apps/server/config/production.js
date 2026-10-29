/**
 * What changes when NODE_ENV=production (ADR-067). server.js and
 * getCorsConfig read these; signinSecurity.test.js checks them. Every setting
 * named here is listed, with a comment, in apps/server/.env.example.
 */

/** Secrets that are public: the old code fallback and the .env.example value. */
const KNOWN_SECRETS = ["your-super-secret-key-change-in-production", "change-me"];
const MIN_SECRET_LENGTH = 32;

export const isProduction = (env = process.env) => env.NODE_ENV === "production";

/**
 * Why the server must not start, or null. Only production is held to it: a
 * session secret anyone can read lets anyone forge a signed-in cookie.
 */
export const productionConfigProblem = (env = process.env) => {
  if (!isProduction(env)) return null;
  const secret = env.SESSION_SECRET || "";
  if (KNOWN_SECRETS.includes(secret) || secret.length < MIN_SECRET_LENGTH) {
    return `SESSION_SECRET must be a private random value of at least ${MIN_SECRET_LENGTH} characters in production — generate one on the server with: openssl rand -hex 32`;
  }
  return null;
};

/**
 * /api-docs and /api-docs.json describe every endpoint and offer a "Try it
 * out" console. Off in production unless API_DOCS_ENABLED=true.
 */
export const apiDocsEnabled = (env = process.env) => !isProduction(env) || env.API_DOCS_ENABLED === "true";

/** Mongoose query logging prints every query, password hashes included. */
export const queryLoggingEnabled = (env = process.env) => !isProduction(env);

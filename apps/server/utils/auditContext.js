import { AsyncLocalStorage } from "node:async_hooks";

/**
 * Who is behind the current request, available anywhere without threading it
 * through every function signature.
 *
 * A Mongoose plugin runs far below the request — it sees the write but not the
 * user. The alternatives were passing a context object into every query (a
 * change to every controller, and forgettable) or an audit call per controller
 * (boilerplate, and forgettable in a different way). `AsyncLocalStorage` is in
 * the standard library and keeps the plugin the only place that knows about
 * auditing at all.
 *
 * **No actor means no audit row**, and that is the safety valve: the seeder,
 * the public SEO endpoints and anything else running outside a logged-in
 * request write nothing to the log. A redirect hit counter firing on every page
 * view of the public site must not produce an audit entry.
 */
const storage = new AsyncLocalStorage();

/** Wrap the rest of a request so anything it triggers can find the actor. */
export const runWithAuditContext = (context, callback) => storage.run(context, callback);

export const getAuditContext = () => storage.getStore() ?? null;

/**
 * Express middleware. Mount it after the session middleware and before the
 * routers — it reads the session directly, so no route has to opt in and a
 * route without `authMiddleware` simply has no actor.
 */
export const auditContextMiddleware = (req, res, next) => {
  const sessionUser = req.session?.user;

  runWithAuditContext(
    {
      actor: sessionUser?.id
        ? {
            userId: sessionUser.id,
            name: sessionUser.name || "",
            email: sessionUser.email || "",
            role: sessionUser.role || "",
          }
        : null,
      ip: req.ip || req.headers["x-forwarded-for"] || "",
    },
    next,
  );
};

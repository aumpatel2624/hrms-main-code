import { GLOBAL_SEARCH_SCREENS } from "../config/globalSearch.js";

/**
 * The header's global search (ADR-044).
 *
 * It does not query any collection itself. For every screen in the registry
 * it replays that screen's own `POST …/search` route in-process — the same
 * authMiddleware → checkPermission → validators → controller chain the list
 * page calls — with `{ match: term }` and a small page size. So a result can
 * only be a row the caller would see on that screen's list today: the matrix
 * gate, the menu row's data scope (own / team / approver / department / all),
 * company confinement and the screen's own `searchFields` all come from the
 * route, never from code here. A 403 from the gate just means the screen
 * contributes nothing.
 */

export const MIN_TERM = 2;
export const MAX_TERM = 100;
export const PER_SCREEN = 5;
const CONCURRENCY = 8;
const SCREEN_TIMEOUT_MS = 5000;

// Defence in depth on top of the app-wide `json replacer` and each list's
// own `select: false` exclusions: no credential, token or lock flag leaves
// through search, however a controller assembled the row.
const SECRET_KEY = /(password|token|secret)$|^(otp|lockUntil|loginAttempts|isLocked)$/i;

export const stripSecrets = (value) => {
  if (Array.isArray(value)) return value.map(stripSecrets);
  if (!value || typeof value !== "object" || value.constructor !== Object) return value;
  return Object.fromEntries(Object.entries(value).filter(([key]) => !SECRET_KEY.test(key)).map(([key, inner]) => [key, stripSecrets(inner)]));
};

/** Every POST route under an Express router: path → its handler functions. */
const collectPostRoutes = (router, out = new Map()) => {
  for (const layer of router?.stack ?? []) {
    if (layer.route) {
      if (layer.route.methods?.post && !out.has(layer.route.path)) {
        out.set(layer.route.path, layer.route.stack.map((routeLayer) => routeLayer.handle));
      }
    } else if (layer.handle?.stack) {
      collectPostRoutes(layer.handle, out);
    }
  }
  return out;
};

/**
 * Resolve the registry against the mounted routes. Throws when a listed route
 * is missing or is not gated by `checkPermission(<screen>, "read")` — a search
 * target without the screen's own gate would be a wider query than the list.
 */
export const buildSearchTargets = (router, screens = GLOBAL_SEARCH_SCREENS) => {
  const routes = collectPostRoutes(router);
  return screens.map(({ screen, route }) => {
    const handlers = routes.get(route);
    if (!handlers) throw new Error(`globalSearch: no POST ${route} route for ${screen}`);
    const gated = handlers.some((handle) => handle.permission?.menuUrl === screen && handle.permission?.action === "read");
    if (!gated) throw new Error(`globalSearch: POST ${route} is not gated by checkPermission("${screen}", "read")`);
    return { screen, route, handlers };
  });
};

/** A response stand-in that records what the route answered. */
const captureResponse = (done) => {
  const res = {
    statusCode: 200,
    headersSent: false,
    locals: {},
    status(code) { res.statusCode = code; return res; },
    json(body) { res.headersSent = true; done({ status: res.statusCode, body }); return res; },
    send(body) { return res.json(body); },
    sendStatus(code) { res.statusCode = code; return res.json(undefined); },
    set() { return res; },
    setHeader() { return res; },
    clearCookie() { return res; },
  };
  return res;
};

/**
 * Run one route's handler chain against a request derived from the caller's.
 * Each run gets its own `user`/`employee` slots, so one screen's data scope
 * (written onto req.user by checkPermission) can never leak into the next.
 */
export const replayRoute = (handlers, req, body) => new Promise((resolve, reject) => {
  const sub = Object.create(req);
  sub.body = body;
  sub.params = {};
  sub.query = {};
  sub.user = undefined;
  sub.employee = undefined;

  let settled = false;
  const finish = (fn) => (value) => { if (!settled) { settled = true; clearTimeout(timer); fn(value); } };
  const ok = finish(resolve);
  const fail = finish(reject);
  const timer = setTimeout(() => fail(new Error("timed out")), SCREEN_TIMEOUT_MS);

  const res = captureResponse(ok);
  let index = 0;
  const next = (error) => {
    if (settled) return;
    if (error) return fail(error);
    const handle = handlers[index++];
    if (!handle) return ok({ status: 404 });
    try {
      const out = handle(sub, res, next);
      if (out && typeof out.catch === "function") out.catch(fail);
    } catch (thrown) {
      fail(thrown);
    }
  };
  next();
});

/** Run `task` over `items`, at most `limit` at a time, keeping order. */
const mapLimited = async (items, limit, task) => {
  const results = new Array(items.length);
  let cursor = 0;
  const worker = async () => {
    while (cursor < items.length) {
      const index = cursor++;
      results[index] = await task(items[index]); // eslint-disable-line no-await-in-loop
    }
  };
  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, worker));
  return results;
};

/**
 * Search every registered screen for `term` as the caller of `req`.
 * Returns `[{ screen, count, rows }]` — only screens that allowed the read and
 * matched something, in registry order — plus how many screens failed.
 */
export const runGlobalSearch = async (req, term, targets) => {
  const body = { match: term, skip: 0, per_page: PER_SCREEN };
  let failed = 0;

  const outcomes = await mapLimited(targets, CONCURRENCY, async ({ screen, handlers }) => {
    try {
      const { status, body: payload } = await replayRoute(handlers, req, body);
      if (status !== 200 || payload?.isOk === false) {
        if (status >= 500) failed += 1;
        return null; // 403: the role cannot read this screen
      }
      const page = Array.isArray(payload?.data) ? payload.data[0] : null;
      if (!page?.count) return null;
      return { screen, count: page.count, rows: stripSecrets(page.data ?? []) };
    } catch (error) {
      console.log(`globalSearch: ${screen} failed`, error?.message);
      failed += 1;
      return null;
    }
  });

  return { groups: outcomes.filter(Boolean), failed };
};

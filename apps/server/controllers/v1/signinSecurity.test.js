// ADR-067: the sign-in and password faults from the 29 Oct security test.
//   S1   One lockout per person, whatever spelling is typed; failed sign-ins
//        from one address are limited, correct ones never count.
//   S2   A forgot-password code dies after 5 wrong tries; code requests and
//        wrong codes are limited per email and per address; codes come from
//        crypto.randomInt.
//   S6   A password change or reset ends the person's other sessions; the
//        session id is renewed at sign-in.
//   S7   Unlock and the admin's password reset clear every lockout row.
//   S8   Production refuses a public session secret, keeps query logging and
//        /api-docs off, and allows only ALLOWED_ORIGINS.
//   S10  The password rule is enforced wherever a password is set, and
//        everyone can change their own.
//   Low  An account's lock state is for admins only.
// Runs the real routes (validators, limiters, authMiddleware, handlers) over
// in-memory stand-ins. Each section reports on its own, so a run against the
// old code names every fault it still has.
import assert from "node:assert/strict";
import crypto from "node:crypto";
import bcrypt from "bcrypt";
import mongoose from "mongoose";
import { LOGIN, OTP } from "@demo-panel/shared/auth";
import { PASSWORD } from "@demo-panel/shared/validation";
import Employee from "../../models/Employee.js";
import AdminUser from "../../models/AdminUser.js";
import LoginAttempt from "../../models/LoginAttempt.js";
import Otp from "../../models/Otp.js";
import EmailFor from "../../models/EmailFor.js";
import authRoutes from "../../routes/v1/auth.routes.js";
import otpRoutes from "../../routes/v1/otp.routes.js";
import employeeRoutes from "../../routes/v1/employee.routes.js";
import adminUsersRoutes from "../../routes/v1/adminUsers.routes.js";
import { getCorsConfig } from "../../middlewares/securityHeaders.js";
import { stripCredentials } from "../../utils/jsonSecrets.js";

// ---------------------------------------------------------------- stand-ins --
const oid = () => new mongoose.Types.ObjectId();
const same = (a, b) => String(a) === String(b);
const isOperators = (cond) => cond?.constructor === Object && Object.keys(cond).every((key) => key.startsWith("$"));
const test = (value, cond) => {
  if (!isOperators(cond)) return same(value, cond);
  return Object.entries(cond).every(([op, arg]) => {
    if (op === "$in") return arg.some((x) => same(value, x));
    if (op === "$gt") return value != null && value > arg;
    if (op === "$lt") return value != null && value < arg;
    throw new Error(`stand-in: unsupported operator ${op}`);
  });
};
const matches = (row, filter = {}) => Object.entries(filter).every(([key, cond]) => {
  if (key === "$or") return cond.some((part) => matches(row, part));
  return test(row[key], cond);
});
const apply = (row, update) => {
  if (!Object.keys(update).some((key) => key.startsWith("$"))) return Object.assign(row, update);
  Object.assign(row, update.$set);
  for (const [key, by] of Object.entries(update.$inc || {})) row[key] = (row[key] || 0) + by;
  for (const [key, value] of Object.entries(update.$min || {})) row[key] = Math.min(row[key], value);
  return row;
};
// A thenable query: populate/select/lean chain onto the one result.
const query = (result) => {
  const chain = {
    populate: () => chain, select: () => chain, lean: () => chain,
    then: (resolve, reject) => Promise.resolve(result).then(resolve, reject),
  };
  return chain;
};
const inMemory = (Model, rows) => {
  Model.find = (filter) => query(rows.filter((row) => matches(row, filter)));
  Model.findOne = (filter) => query(rows.find((row) => matches(row, filter)) ?? null);
  Model.findById = (id) => query(rows.find((row) => same(row._id, id)) ?? null);
  Model.findOneAndUpdate = async (filter, update, options = {}) => {
    let row = rows.find((r) => matches(r, filter));
    if (!row) {
      if (!options.upsert) return null;
      const equalities = Object.fromEntries(Object.entries(filter).filter(([key, cond]) => !key.startsWith("$") && !isOperators(cond)));
      row = { _id: oid(), ...equalities, ...update.$setOnInsert };
      rows.push(row);
    }
    return { ...apply(row, update) };
  };
  Model.updateOne = async (filter, update) => {
    const row = rows.find((r) => matches(r, filter));
    if (row) apply(row, update);
    return { modifiedCount: row ? 1 : 0 };
  };
  Model.updateMany = async (filter, update) => {
    const hit = rows.filter((r) => matches(r, filter));
    hit.forEach((r) => apply(r, update));
    return { modifiedCount: hit.length };
  };
  Model.deleteOne = async (filter) => {
    const at = rows.findIndex((r) => matches(r, filter));
    if (at >= 0) rows.splice(at, 1);
  };
  Model.create = async (fields) => {
    const row = new Model(fields).toObject(); // with the schema's defaults
    rows.push(row);
    return row;
  };
};

const tick = () => new Promise((resolve) => setImmediate(resolve));
const pause = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

// Serialised as server.js does; "finish" fires once the reply is sent.
const fakeRes = () => {
  const finished = [];
  return {
    statusCode: 200, body: null, headers: {},
    status(code) { this.statusCode = code; return this; },
    json(body) {
      this.body = JSON.parse(JSON.stringify(body, stripCredentials));
      finished.forEach((fn) => fn());
      return this;
    },
    setHeader(name, value) { this.headers[name] = value; },
    clearCookie() {},
    on(event, fn) { if (event === "finish") finished.push(fn); },
  };
};
const session = (user) => ({
  user,
  regenerate(done) { this.regenerated = true; done(); },
  destroy(done) { this.destroyed = true; this.user = undefined; done?.(); },
});
const runRoute = async (router, method, path, { body = {}, params = {}, ip = "198.51.100.1", sess = session() } = {}) => {
  const layer = router.stack.find((l) => l.route?.path === path && l.route.methods[method]);
  if (!layer) throw new Error(`no route ${method.toUpperCase()} ${path}`);
  const req = { method: method.toUpperCase(), body, params, query: {}, headers: {}, ip, session: sess };
  const res = fakeRes();
  for (const { handle } of layer.route.stack) {
    let next = false;
    await handle(req, res, () => { next = true; });
    if (!next) break;
  }
  await tick(); // attempts given back after the reply
  return res;
};

// ----------------------------------------------------------------- fixtures --
const hash = (plain) => bcrypt.hashSync(plain, 4);
const account = (fields) => ({
  isActive: true,
  passwordChangedAt: null,
  ...fields,
  async updateOne(update) { apply(this, update); },
  async save() {},
  toObject() { return { ...this }; },
});
const kartik = account({
  _id: oid(), employeeCode: "SRT009", employeeName: "Kartik Jain", email: "kartik.jain.srt009@example.com",
  password: hash("Right@1234"), status: "Active", roleId: oid(), departmentId: null,
});
const admin = account({ _id: oid(), adminName: "Admin", email: "admin@example.com", password: hash("Admin@1234") });
const employees = [kartik];
const admins = [admin];
const loginRows = [];
const otpRows = [];
const throttleRows = [];
inMemory(Employee, employees);
inMemory(AdminUser, admins);
inMemory(LoginAttempt, loginRows);
inMemory(Otp, otpRows);
const AuthThrottle = mongoose.models.AuthThrottle; // absent before ADR-067
if (AuthThrottle) inMemory(AuthThrottle, throttleRows);
EmailFor.findOne = async () => null; // no email configured: codes are only stored

const adminSession = () => session({ id: String(admin._id), role: "ADMIN", signedInAt: Date.now() });
let ipSeq = 0;
const newIp = () => `203.0.113.${++ipSeq}`;
const signIn = (login, password, { ip = newIp(), sess = session() } = {}) => runRoute(authRoutes, "post", "/auth/login", {
  body: { email: login, password, locationConsent: true, ipConsent: true }, ip, sess,
});
const kartikSpellings = ["kartik.jain.srt009@example.com", "KARTIK.JAIN.SRT009@EXAMPLE.COM", "SRT009", "srt009"];
let kartikPassword = "Right@1234";
const me = (sess) => runRoute(authRoutes, "get", "/auth/me", { sess });
// A section that needs Kartik signed in starts with no lock left over.
const signInKartik = async (sess) => {
  loginRows.length = 0;
  assert.equal((await signIn(kartik.email, kartikPassword, { sess })).statusCode, 200, "Kartik signs in");
  assert.equal((await me(sess)).statusCode, 200, "and the session works");
};

const failures = [];
const section = async (name, fn) => {
  try {
    await fn();
    console.log(`ok   ${name}`);
  } catch (error) {
    failures.push(name);
    console.log(`FAIL ${name}\n     ${error.message.split("\n")[0]}`);
  }
};

// ======================================================= S1: one lock each
await section("S1 every spelling of one person shares one lockout", async () => {
  loginRows.length = 0;
  const wrong = ["kartik.jain.srt009@example.com", "SRT009", "srt009"];
  for (const [i, spelling] of wrong.entries()) {
    const res = await signIn(spelling, "Wrong@1234");
    assert.equal(res.statusCode, i < LOGIN.MAX_ATTEMPTS - 1 ? 401 : 423, `wrong password #${i + 1} as ${spelling}`);
  }
  for (const spelling of kartikSpellings) {
    assert.equal((await signIn(spelling, kartikPassword)).statusCode, 423, `right password as ${spelling} while locked`);
  }
  assert.equal(loginRows.length, 1, "one lockout row for the person");
  assert.equal(loginRows[0].userEmail, kartik.email, "kept under the account's own email");

  const unknown = await signIn("nobody@example.com", "Wrong@1234");
  const wrongPassword = (await signIn(admin.email, "Wrong@1234")).body;
  assert.deepEqual(unknown.body, wrongPassword, "an unknown login still answers like a wrong password");
});

// =============================================== S7: unlock clears every row
await section("S7 Unlock clears every lockout row, old spellings included", async () => {
  loginRows.length = 0;
  const lockUntil = new Date(Date.now() + LOGIN.LOCK_DURATION_MS);
  // Left behind by the old code: one row per spelling typed.
  for (const userEmail of [kartik.email, "SRT009", "srt009", "KARTIK.JAIN.SRT009@EXAMPLE.COM"]) {
    loginRows.push({ _id: oid(), userId: kartik._id, userEmail, attemptCount: LOGIN.MAX_ATTEMPTS, isLocked: true, lockUntil });
  }
  const unlock = await runRoute(authRoutes, "post", "/admin/auth/unlock", { body: { userId: String(kartik._id) }, sess: adminSession() });
  assert.equal(unlock.statusCode, 200);
  assert.ok(loginRows.every((row) => !row.isLocked), "no row is left locked");
  for (const spelling of kartikSpellings) {
    assert.equal((await signIn(spelling, kartikPassword)).statusCode, 200, `signs in as ${spelling} after Unlock`);
  }
});

await section("S7 an old-spelling lock still holds until it is cleared", async () => {
  loginRows.length = 0;
  loginRows.push({ _id: oid(), userId: kartik._id, userEmail: "SRT009", attemptCount: LOGIN.MAX_ATTEMPTS, isLocked: true, lockUntil: new Date(Date.now() + 60_000) });
  assert.equal((await signIn(kartik.email, kartikPassword)).statusCode, 423, "locked under another spelling is still locked");
  loginRows[0].lockUntil = new Date(Date.now() - 1);
  assert.equal((await signIn(kartik.email, kartikPassword)).statusCode, 200, "a lock that ran out is cleared");
  assert.equal(loginRows.find((row) => row.userEmail === "SRT009").isLocked, false);
});

await section("S7 the admin's password reset clears the lock", async () => {
  loginRows.length = 0;
  for (let i = 0; i < LOGIN.MAX_ATTEMPTS; i += 1) await signIn("SRT009", "Wrong@1234");
  assert.equal((await signIn(kartik.email, kartikPassword)).statusCode, 423, "locked");
  const reset = await runRoute(employeeRoutes, "post", "/employees/:employeeId/reset-password", {
    params: { employeeId: String(kartik._id) }, body: { password: "Fresh@1234" }, sess: adminSession(),
  });
  assert.equal(reset.statusCode, 200);
  kartikPassword = "Fresh@1234";
  assert.equal((await signIn("srt009", kartikPassword)).statusCode, 200, "signs in with the new password");
});

// ==================================================== S1: per-address limit
await section("S1 failed sign-ins from one address are limited", async () => {
  loginRows.length = 0;
  if (AuthThrottle) throttleRows.length = 0;
  const ip = newIp();
  let refusedAt = null;
  for (let i = 1; i <= 101 && refusedAt === null; i += 1) {
    const res = await signIn(`nobody${i}@example.com`, "Wrong@1234", { ip });
    if (res.statusCode === 429) refusedAt = i;
    else assert.equal(res.statusCode, 401);
  }
  assert.equal(refusedAt, 101, "the 101st failure from one address is refused");
  assert.equal((await signIn(kartik.email, kartikPassword, { ip })).statusCode, 429, "the whole address waits");
  assert.equal((await signIn(kartik.email, kartikPassword)).statusCode, 200, "another address is unaffected");
});

await section("S1 correct sign-ins never use up an office's address", async () => {
  loginRows.length = 0;
  if (AuthThrottle) throttleRows.length = 0;
  const office = newIp();
  for (let i = 0; i < 150; i += 1) {
    assert.equal((await signIn(kartik.email, kartikPassword, { ip: office })).statusCode, 200, `sign-in #${i + 1}`);
  }
  for (let i = 0; i < 100; i += 1) {
    assert.equal((await signIn(`typo${i}@example.com`, "Wrong@1234", { ip: office })).statusCode, 401, `typo #${i + 1}`);
  }
  assert.equal((await signIn("typo@example.com", "Wrong@1234", { ip: office })).statusCode, 429);
});

// ============================================================ S6: sessions
await section("S6 the session id is renewed at sign-in", async () => {
  const sess = session();
  await signInKartik(sess);
  assert.equal(sess.regenerated, true, "a fresh session id");
  assert.ok(sess.user?.signedInAt, "the sign-in time is kept");
});

// ============================================================= S2: the code
const sendCode = (email, ip = newIp()) => runRoute(otpRoutes, "post", "/send", { body: { email }, ip });
const verify = (email, otp, ip = newIp()) => runRoute(otpRoutes, "post", "/verify", { body: { email, otp }, ip });
const resetWith = (email, otp, newPassword, ip = newIp()) => runRoute(otpRoutes, "post", "/reset-password", { body: { email, otp, newPassword }, ip });
const freshCode = async () => {
  otpRows.length = 0;
  if (AuthThrottle) throttleRows.length = 0;
  await sendCode(kartik.email);
  return otpRows[0].otp;
};
const wrongCode = (code) => String((Number(code) + 1) % 10 ** OTP.LENGTH).padStart(OTP.LENGTH, "0");

await section("S2 codes come from crypto.randomInt", async () => {
  const { randomInt } = crypto;
  const { random } = Math;
  crypto.randomInt = () => 4321;
  Math.random = () => 0.5;
  try {
    assert.equal(await freshCode(), "004321");
  } finally {
    crypto.randomInt = randomInt;
    Math.random = random;
  }
});

await section("S2 a code dies after 5 wrong tries", async () => {
  const code = await freshCode();
  for (let i = 1; i <= OTP.MAX_WRONG_TRIES; i += 1) {
    const res = await verify(kartik.email, wrongCode(code));
    assert.equal(res.statusCode, 400, `wrong code #${i}`);
  }
  assert.equal((await verify(kartik.email, code)).statusCode, 400, "the right code no longer works");
  assert.equal((await resetWith(kartik.email, code, "Taken@1234")).statusCode, 400, "nor resets the password");
  assert.equal(otpRows.length, 0, "the code is gone; a new one must be requested");
});

await section("S2 wrong codes sent together cannot share a try", async () => {
  const code = await freshCode();
  await Promise.all(Array.from({ length: 8 }, () => verify(kartik.email, wrongCode(code))));
  assert.equal((await verify(kartik.email, code)).statusCode, 400, "the right code no longer works");
});

await section("S2 a right code still verifies and resets after a few typos", async () => {
  const code = await freshCode();
  for (let i = 0; i < OTP.MAX_WRONG_TRIES - 1; i += 1) await verify(kartik.email, wrongCode(code));
  assert.equal((await verify(kartik.email, code)).statusCode, 200, "verified");
  const res = await resetWith(kartik.email, code, "Reset@1234");
  assert.equal(res.statusCode, 200, "and resets with the same code");
  kartikPassword = "Reset@1234";
  assert.equal((await signIn(kartik.email, kartikPassword)).statusCode, 200, "the new password works");
});

await section("S2 code requests are limited per email, alike for every email", async () => {
  otpRows.length = 0;
  if (AuthThrottle) throttleRows.length = 0;
  const replies = async (email) => {
    const out = [];
    for (let i = 0; i < 6; i += 1) {
      otpRows.length = 0; // past the resend cooldown
      out.push(await sendCode(email));
    }
    return out;
  };
  const real = await replies(kartik.email);
  const unknown = await replies("nobody@example.com");
  assert.deepEqual(real.map((r) => r.statusCode), [200, 200, 200, 200, 200, 429], "the 6th request for one email in an hour is refused");
  assert.deepEqual(unknown.map((r) => r.statusCode), real.map((r) => r.statusCode), "an unknown email is limited alike");
  assert.deepEqual(unknown.map((r) => r.body), real.map((r) => r.body), "with the same replies");
});

await section("S2 code requests are limited per address", async () => {
  if (AuthThrottle) throttleRows.length = 0;
  const ip = newIp();
  const statuses = [];
  for (let i = 0; i < 31; i += 1) statuses.push((await sendCode(`person${i}@example.com`, ip)).statusCode);
  assert.deepEqual(statuses.slice(0, 30), Array(30).fill(200));
  assert.equal(statuses[30], 429, "the 31st request from one address in an hour is refused");
});

await section("S2 wrong codes are limited per email and per address", async () => {
  const code = await freshCode();
  // Each try from a new address: only the per-email limit applies.
  const perEmail = [];
  for (let i = 0; i < 11; i += 1) perEmail.push((await verify(kartik.email, wrongCode(code))).statusCode);
  assert.equal(perEmail[10], 429, "the 11th wrong code for one email in an hour is refused");
  assert.ok(perEmail.slice(0, 10).every((status) => status === 400));

  if (AuthThrottle) throttleRows.length = 0;
  const ip = newIp();
  const perIp = [];
  for (let i = 0; i < 51; i += 1) perIp.push((await verify(`person${i}@example.com`, "123456", ip)).statusCode);
  assert.equal(perIp[50], 429, "the 51st wrong code from one address in an hour is refused");
});

// ================================================ S6: password change ends sessions
await section("S6 a forgot-password reset ends the person's open sessions", async () => {
  const stolen = session();
  await signInKartik(stolen);
  await pause(2);
  const code = await freshCode();
  assert.equal((await resetWith(kartik.email, code, "Forgot@1234")).statusCode, 200);
  kartikPassword = "Forgot@1234";
  assert.equal((await me(stolen)).statusCode, 401, "the copied session no longer works");
  assert.equal(stolen.destroyed, true);
});

await section("S6 the admin's reset ends the person's open sessions", async () => {
  const open = session();
  await signInKartik(open);
  await pause(2);
  await runRoute(employeeRoutes, "post", "/employees/:employeeId/reset-password", {
    params: { employeeId: String(kartik._id) }, body: { password: "Admin@5678" }, sess: adminSession(),
  });
  kartikPassword = "Admin@5678";
  assert.equal((await me(open)).statusCode, 401);
});

// ===================================================== S10: change password
const changePassword = (sess, body) => runRoute(authRoutes, "post", "/auth/change-password", { body, sess });

await section("S10 everyone can change their own password; other sessions end", async () => {
  if (AuthThrottle) throttleRows.length = 0;
  const here = session();
  const elsewhere = session();
  await signInKartik(here);
  assert.equal((await signIn("SRT009", kartikPassword, { sess: elsewhere })).statusCode, 200);
  await pause(2);
  const weak = await changePassword(here, { currentPassword: kartikPassword, newPassword: "short" });
  assert.equal(weak.statusCode, 400, "a weak new password is refused");
  assert.ok(JSON.stringify(weak.body).includes(PASSWORD.MESSAGE));
  const wrong = await changePassword(here, { currentPassword: "Wrong@1234", newPassword: "Mine@12345" });
  assert.equal(wrong.statusCode, 400, "a wrong current password is refused");
  assert.equal(wrong.body.message, "Current password is incorrect");

  const res = await changePassword(here, { currentPassword: kartikPassword, newPassword: "Mine@12345" });
  assert.equal(res.statusCode, 200);
  kartikPassword = "Mine@12345";
  assert.equal((await me(here)).statusCode, 200, "this session stays signed in");
  assert.equal((await me(elsewhere)).statusCode, 401, "the other session ends");
  assert.equal((await signIn(kartik.email, kartikPassword)).statusCode, 200, "the new password signs in");
});

await section("S10 wrong current passwords are limited per account", async () => {
  if (AuthThrottle) throttleRows.length = 0;
  const sess = session();
  await signInKartik(sess);
  const statuses = [];
  for (let i = 0; i < 6; i += 1) statuses.push((await changePassword(sess, { currentPassword: `Guess@${i}000`, newPassword: "Mine@99999" })).statusCode);
  assert.deepEqual(statuses, [400, 400, 400, 400, 400, 429]);
});

// ================================================== S10: the rule everywhere
await section("S10 the password rule is enforced wherever a password is set", async () => {
  const refusesWeak = async (label, res) => {
    assert.equal(res.statusCode, 400, `${label}: refused`);
    assert.ok(JSON.stringify(res.body).includes(PASSWORD.MESSAGE), `${label}: with the rule (${JSON.stringify(res.body)})`);
  };
  await refusesWeak("HR creates a login with password 1", await runRoute(employeeRoutes, "post", "/employees", {
    body: { employeeCode: "SRT010", employeeName: "New Joiner", email: "joiner@example.com", password: "1" }, sess: adminSession(),
  }));
  await refusesWeak("admin resets an employee's password to 1", await runRoute(employeeRoutes, "post", "/employees/:employeeId/reset-password", {
    params: { employeeId: String(kartik._id) }, body: { password: "1" }, sess: adminSession(),
  }));
  await refusesWeak("admin resets an admin's password to 1", await runRoute(adminUsersRoutes, "post", "/admin-users/:adminUserId/reset-password", {
    params: { adminUserId: String(admin._id) }, body: { password: "1" }, sess: adminSession(),
  }));
  await refusesWeak("admin creates an admin with password 1", await runRoute(adminUsersRoutes, "post", "/admin-users", {
    body: { adminName: "Second Admin", email: "second@example.com", password: "1", mobileNumber: "9999999999", isActive: true }, sess: adminSession(),
  }));
  const code = await freshCode();
  await refusesWeak("forgot-password reset to 1", await resetWith(kartik.email, code, "1"));
  assert.equal(admins.length, 1, "no admin was created");
});

// ===================================================== Low: lock state
await section("Low an account's lock state is for admins only", async () => {
  const status = (sess) => runRoute(authRoutes, "get", "/auth/login-status/:userId", { params: { userId: String(admin._id) }, sess });
  const employeeSession = session();
  await signInKartik(employeeSession);
  assert.equal((await status(employeeSession)).statusCode, 403, "a signed-in employee cannot read it");
  assert.equal((await status(adminSession())).statusCode, 200, "an admin can");
});

// ============================================== S8: production settings
await section("S8 production settings", async () => {
  const { productionConfigProblem, apiDocsEnabled, queryLoggingEnabled } = await import("../../config/production.js");
  const prod = { NODE_ENV: "production" };
  for (const SESSION_SECRET of [undefined, "", "change-me", "your-super-secret-key-change-in-production", "short-secret"]) {
    assert.ok(productionConfigProblem({ ...prod, SESSION_SECRET }), `refuses to start with SESSION_SECRET=${SESSION_SECRET}`);
  }
  assert.equal(productionConfigProblem({ ...prod, SESSION_SECRET: crypto.randomBytes(32).toString("hex") }), null, "starts with a real secret");
  assert.equal(productionConfigProblem({ NODE_ENV: "development" }), null, "development is not held to it");

  assert.equal(apiDocsEnabled(prod), false, "/api-docs off in production");
  assert.equal(apiDocsEnabled({ ...prod, API_DOCS_ENABLED: "true" }), true, "unless turned on");
  assert.equal(apiDocsEnabled({ NODE_ENV: "development" }), true);
  assert.equal(queryLoggingEnabled(prod), false, "no query logging in production");
  assert.equal(queryLoggingEnabled({ NODE_ENV: "development" }), true);

  const allows = (cors, origin) => new Promise((resolve) => cors.origin(origin, (error, ok) => resolve(!error && ok)));
  const prodCors = getCorsConfig(["https://hr.example.com"], "production");
  assert.equal(await allows(prodCors, "https://hr.example.com"), true, "ALLOWED_ORIGINS is allowed");
  for (const origin of ["http://localhost:3000", "null", "https://evil.example"]) {
    assert.equal(await allows(prodCors, origin), false, `production refuses ${origin}`);
  }
});

if (failures.length) {
  console.error(`signinSecurity.test.js: ${failures.length} failed — ${failures.join("; ")}`);
  process.exit(1);
}
console.log("signinSecurity.test.js passed");

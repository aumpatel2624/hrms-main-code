// ponytail: one runnable check, no framework. `node packages/shared/test.js`
import assert from "node:assert/strict";
import {
    ROLES,
    ANY_ROLE,
    ADMIN_ONLY,
    PERMISSION_KEYS,
    permissions,
    onlyPermission,
    pickPermissions,
    isStrongPassword,
    isValidEmail,
    LOGIN,
    OTP,
    fromZonedDateTimeKey,
    zonedDateKey,
    zonedDateTimeKey,
    zonedWallTime,
} from "./src/index.js";

// roles
assert.deepEqual([...ANY_ROLE], [ROLES.ADMIN, ROLES.USER]);
assert.deepEqual([...ADMIN_ONLY], [ROLES.ADMIN]);

// permissions
assert.equal(PERMISSION_KEYS.length, 6);
assert.equal(Object.values(permissions()).every((v) => v === false), true);
assert.equal(Object.values(permissions(true)).every((v) => v === true), true);
assert.equal(onlyPermission("read").read, true);
assert.equal(onlyPermission("read").write, false);
assert.deepEqual(pickPermissions({ read: 1, nope: "x" }), {
    read: true, write: false, delete: false, edit: false, print: false, mail: false,
});

// password: strong only where a password is set
assert.equal(isStrongPassword("Passw0rd"), true);
assert.equal(isStrongPassword("passw0rd"), false); // no uppercase
assert.equal(isStrongPassword("PASSW0RD"), false); // no lowercase
assert.equal(isStrongPassword("Password"), false); // no digit
assert.equal(isStrongPassword("Passw0r"), false); // 7 chars
assert.equal(isStrongPassword("A1b".padEnd(129, "c")), false); // over max
assert.equal(isStrongPassword(undefined), false);
assert.equal(isStrongPassword("Admin@123"), true); // the seeded admin password

// email: the TLD>4 case the old frontend regex wrongly rejected
assert.equal(isValidEmail("a@b.museum"), true);
assert.equal(isValidEmail("admin@demopanel.com"), true);
assert.equal(isValidEmail("a@b"), false);
assert.equal(isValidEmail("no-at-sign.com"), false);
assert.equal(isValidEmail("not-an-email"), false);
assert.equal(isValidEmail(`${"a".repeat(250)}@b.com`), false); // over 254

// auth constants
assert.equal(LOGIN.MAX_ATTEMPTS, 3);
assert.equal(OTP.LENGTH, 6);
assert.equal(OTP.TTL_MS / 1000, 600);

// zonedTime — wall clock <-> instant, including a daylight-saving zone
const IST = "Asia/Kolkata";
assert.equal(zonedWallTime("2026-09-21", 9 * 60 + 30, IST).toISOString(), "2026-09-21T04:00:00.000Z");
assert.equal(zonedWallTime("2026-09-21", -30, IST).toISOString(), "2026-09-20T18:00:00.000Z"); // before midnight
assert.equal(zonedWallTime("2026-09-21", 0, "UTC").toISOString(), "2026-09-21T00:00:00.000Z");
assert.equal(zonedWallTime("2026-03-29", 12 * 60, "Europe/London").toISOString(), "2026-03-29T11:00:00.000Z"); // BST
assert.equal(zonedWallTime("2026-03-28", 12 * 60, "Europe/London").toISOString(), "2026-03-28T12:00:00.000Z"); // GMT
assert.equal(zonedDateKey("2026-09-20T18:30:00Z", IST), "2026-09-21");
assert.equal(zonedDateKey("2026-09-20T18:30:00Z", "UTC"), "2026-09-20");

// the check-in form's datetime-local value: entered and shown on the company clock, stored as UTC
assert.equal(zonedDateTimeKey("2026-09-21T04:30:00.000Z", IST), "2026-09-21T10:00");
assert.equal(zonedDateTimeKey("2026-09-21T19:30:00.000Z", IST), "2026-09-22T01:00"); // next day in India
assert.equal(fromZonedDateTimeKey("2026-09-21T10:00", IST).toISOString(), "2026-09-21T04:30:00.000Z");
assert.equal(fromZonedDateTimeKey("2026-09-22T01:00", IST).toISOString(), "2026-09-21T19:30:00.000Z");
assert.equal(fromZonedDateTimeKey("2026-07-01T09:00", "Europe/London").toISOString(), "2026-07-01T08:00:00.000Z"); // BST

console.log("ok");

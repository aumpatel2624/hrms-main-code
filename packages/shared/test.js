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
assert.equal(isValidEmail(`${"a".repeat(250)}@b.com`), false); // over 254

// auth constants
assert.equal(LOGIN.MAX_ATTEMPTS, 3);
assert.equal(OTP.LENGTH, 6);
assert.equal(OTP.TTL_MS / 1000, 600);

console.log("ok");

// recordFailedAttempt under concurrency: two wrong passwords at once for an
// account with no LoginAttempt row both count, neither fails on the unique
// userEmail index, and the lockout threshold is unchanged. Runs against an
// in-memory stand-in that yields between a read and a write, as MongoDB can.
import assert from "node:assert/strict";
import mongoose from "mongoose";
import { LOGIN } from "@demo-panel/shared/auth";
import LoginAttempt from "../models/LoginAttempt.js";
import { recordFailedAttempt } from "./authService.js";

// ---------------------------------------------------------------- stand-in --
const rows = new Map(); // userEmail → row; the map key is the unique index
const tick = () => new Promise((resolve) => setImmediate(resolve));
const duplicateKey = () => Object.assign(new Error("E11000 duplicate key error collection: loginattempts index: userEmail_1"), { code: 11000 });
const insert = (row) => {
  if (rows.has(row.userEmail)) throw duplicateKey();
  rows.set(row.userEmail, row);
};
const matches = (row, filter) => Object.entries(filter).every(([key, value]) => String(row[key]) === String(value));

LoginAttempt.findOne = async (filter) => {
  await tick();
  const row = [...rows.values()].find((r) => matches(r, filter));
  if (!row) return null;
  return { ...row, async save() { await tick(); rows.set(row.userEmail, { ...this }); return this; } };
};
LoginAttempt.prototype.save = async function save() {
  await tick();
  insert(this.toObject());
  return this;
};
// Atomic on an existing row; an upsert that finds none can lose the insert
// to a racing upsert and gets E11000, as MongoDB can on a unique index.
LoginAttempt.findOneAndUpdate = async (filter, update, options = {}) => {
  let row = [...rows.values()].find((r) => matches(r, filter));
  if (!row) {
    if (!options.upsert) return null;
    await tick();
    row = { _id: new mongoose.Types.ObjectId(), ...filter, ...update.$setOnInsert };
    insert(row);
  }
  for (const [key, by] of Object.entries(update.$inc || {})) row[key] = (row[key] || 0) + by;
  Object.assign(row, update.$set);
  for (const [key, value] of Object.entries(update.$min || {})) row[key] = Math.min(row[key], value);
  return { ...row };
};

const userId = new mongoose.Types.ObjectId();
const email = "zalak@work.example";
const fail = () => recordFailedAttempt(userId, email, "127.0.0.1");

// --------------------------------- 1. two at once, no row yet: both count --
{
  const results = await Promise.allSettled([fail(), fail()]);
  assert.deepEqual(results.map((r) => r.status), ["fulfilled", "fulfilled"],
    `neither attempt fails: ${results.map((r) => r.reason?.message).filter(Boolean).join("; ")}`);
  assert.equal(rows.get(email).attemptCount, 2, "both attempts are counted");
  assert.deepEqual(results.map((r) => r.value.attemptCount).sort(), [1, 2]);
  assert.ok(results.every((r) => r.value.isLocked === false), "two attempts do not lock");
  assert.equal(Math.min(...results.map((r) => r.value.attemptsRemaining)), LOGIN.MAX_ATTEMPTS - 2);
}

// ----------------------------------------- 2. the threshold still locks --
{
  const before = Date.now();
  const third = await fail();
  assert.equal(third.attemptCount, LOGIN.MAX_ATTEMPTS);
  assert.equal(third.isLocked, true, "the third wrong password locks the account");
  assert.equal(third.attemptsRemaining, 0);
  assert.ok(third.lockUntil.getTime() >= before + LOGIN.LOCK_DURATION_MS, "locked for the usual duration");
  assert.equal(rows.get(email).isLocked, true, "the lock is stored");
}

// ------------------- 3. attempts racing past the threshold stay at the max --
{
  rows.clear();
  await fail();
  await fail();
  const results = await Promise.all([fail(), fail()]);
  assert.ok(results.every((r) => r.isLocked), "both racing attempts report the lock");
  assert.equal(rows.get(email).attemptCount, LOGIN.MAX_ATTEMPTS, "the stored count never passes the schema's max");
}

console.log("authService.test.js passed");

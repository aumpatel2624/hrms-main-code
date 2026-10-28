// Records named instead of shown by id (Dashboard Builder filter values, the
// Audit Log's before/after). Pure parts only — no database.
import assert from "node:assert/strict";
import mongoose from "mongoose";
import { idsInValue, nameField, recordLabel, refModelName } from "./recordLabels.js";

const { ObjectId } = mongoose.Schema.Types;
const allocation = new mongoose.Schema({
  employeeId: { type: ObjectId, ref: "Employee" },
  leaveTypeId: { type: ObjectId, ref: "LeaveType" },
  companyId: { type: ObjectId, ref: "Company" },
  payrollPeriodId: { type: ObjectId },
  deviceId: { type: String },
  fromDate: Date,
  toDate: Date,
});

// The reference a field points at: its `ref`, else the model its name implies.
assert.equal(refModelName(allocation, "employeeId"), "Employee");
assert.equal(refModelName(allocation, "payrollPeriodId", ["PayrollPeriod"]), "PayrollPeriod");
assert.equal(refModelName(allocation, "deviceId", ["Device"]), null, "a plain string is not a reference");

assert.equal(nameField(new mongoose.Schema({ employeeCode: String, employeeName: String })), "employeeName");
assert.equal(nameField(new mongoose.Schema({ title: String })), "title");
assert.equal(nameField(allocation), null);

const ekta = "64f000000000000000000001";
const casual = "64f000000000000000000002";
const apidel = "64f000000000000000000003";
const names = new Map([[ekta, "Ekta Bansal"], [casual, "Casual Leave"], [apidel, "Apidel"]]);

// A record with no name of its own: whose, which kind, which dates, which company.
assert.equal(
  recordLabel({ employeeId: ekta, leaveTypeId: casual, companyId: apidel, fromDate: "2026-01-01T00:00:00Z", toDate: "2026-12-31T00:00:00Z" }, { names }),
  "Ekta Bansal — Casual Leave — 2026-01-01 – 2026-12-31 (Apidel)",
);
assert.equal(recordLabel({ employeeId: ekta, fromDate: "2026-09-01T00:00:00Z" }, { names }), "Ekta Bansal — from 2026-09-01");

// A named record keeps its name; dates are not added to it.
assert.equal(
  recordLabel({ goalName: "Ship the billing module", employeeId: ekta, companyId: apidel, startDate: "2026-04-01T00:00:00Z" }, { nameKey: "goalName", names }),
  "Ekta Bansal — Ship the billing module (Apidel)",
);
assert.equal(recordLabel({ companyName: "Apidel" }, { nameKey: "companyName", names }), "Apidel");
assert.equal(recordLabel({}, { names }), "Unnamed record");

// The Audit Log stores a reference as its id, or a list of ids as JSON.
assert.deepEqual(idsInValue(ekta), [ekta]);
assert.deepEqual(idsInValue(JSON.stringify([ekta, casual])), [ekta, casual]);
assert.deepEqual(idsInValue("Engineering"), []);
assert.deepEqual(idsInValue('["Monday"]'), []);
assert.deepEqual(idsInValue(null), []);

console.log("recordLabels.test.js: all assertions passed");

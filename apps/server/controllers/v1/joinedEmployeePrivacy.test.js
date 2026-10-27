// ADR-045 follow-up: eight list endpoints joined the whole Employee document
// onto every row (PAN, bank, PF, CTC, date of birth, address, phone,
// insurance) just to show the employee's name. The join is now dropped after
// the name is read off it, for every caller, so the row reaches the browser
// with the name only. Runs the real handlers and runListQuery over an
// in-memory stand-in for the aggregation, like employeePrivacy.test.js.
import assert from "node:assert/strict";
import mongoose from "mongoose";
import Employee from "../../models/Employee.js";
import TravelRequest from "../../models/TravelRequest.js";
import TrainingFeedback from "../../models/TrainingFeedback.js";
import EmployeeSkillMap from "../../models/EmployeeSkillMap.js";
import LeaveLedgerEntry from "../../models/LeaveLedgerEntry.js";
import EmployeeSeparation from "../../models/EmployeeSeparation.js";
import ExitInterview from "../../models/ExitInterview.js";
import FullAndFinalStatement from "../../models/FullAndFinalStatement.js";
import JobRequisition from "../../models/JobRequisition.js";
import { stripCredentials } from "../../utils/jsonSecrets.js";
import { listTravelRequestByParams } from "./travel.controller.js";
import { listTrainingFeedbacksByParams, listEmployeeSkillMapsByParams } from "./trainingSkills.controller.js";
import { listLeaveLedgerEntryByParams } from "./leaves.controller.js";
import { listEmployeeSeparationsByParams } from "./employeeSeparation.controller.js";
import { listExitInterviewsByParams } from "./exitInterview.controller.js";
import { listFullAndFinalStatementsByParams } from "./fullAndFinalStatement.controller.js";
import { listJobRequisitionsByParams } from "./jobRequisition.controller.js";

// ----------------------------------------------------------------- fixtures --
const oid = () => new mongoose.Types.ObjectId();
// Every personal / financial field, each value unique so a leak shows up
// anywhere in the response body.
const asha = {
  _id: oid(), employeeCode: "E001", employeeName: "asha", email: "asha@work.example", companyId: oid(),
  password: "hash-asha", mobileNumber: "9800000001", address: "1 Home Street", dateOfBirth: new Date("1990-01-01"),
  healthInsuranceNo: "INS-asha", ctc: 123457, ifscCode: "IFSC0001", panNumber: "PANAB1", micrCode: "MICR001",
  providentFundAccount: "PF-asha",
};
const SECRETS = ["hash-asha", "9800000001", "1 Home Street", "INS-asha", "123457", "IFSC0001", "PANAB1", "MICR001", "PF-asha"];
Employee.findById = () => ({ lean: async () => null }); // ADMIN has no Employee row

// --------------------------------------------------------------- stand-ins --
const valueAt = (row, path) => path.slice(1).split(".").reduce((value, key) => value?.[key], row);
const evaluate = (row, expr) => {
  if (expr.$ifNull) return valueAt(row, expr.$ifNull[0]) ?? expr.$ifNull[1];
  if (expr.$arrayElemAt) return valueAt(row, expr.$arrayElemAt[0].replace(/\.[^.]+$/, ""))?.[0]?.[expr.$arrayElemAt[0].split(".").pop()];
  throw new Error(`stand-in aggregate: unsupported expression ${JSON.stringify(expr)}`);
};
const exclude = (rows, spec) => rows.map((row) => Object.fromEntries(Object.entries(row).filter(([key]) => !(key in spec))));
// Just enough of the aggregation runListQuery builds: the $lookups (only
// `employees` has rows), $unwind, the name $addFields, and every $project
// exclusion — the handlers' own stages and the paged branch's.
const aggregateOver = (record) => async (pipeline) => {
  let rows = [{ ...record }];
  for (const stage of pipeline) {
    if (stage.$lookup) {
      const { from, localField, as } = stage.$lookup;
      rows = rows.map((row) => ({ ...row, [as]: from === "employees" && String(row[localField]) === String(asha._id) ? [{ ...asha }] : [] }));
    }
    if (stage.$unwind) {
      const field = (stage.$unwind.path ?? stage.$unwind).slice(1);
      rows = rows.map((row) => ({ ...row, [field]: row[field]?.[0] }));
    }
    if (stage.$addFields) {
      rows = rows.map((row) => ({ ...row, ...Object.fromEntries(Object.entries(stage.$addFields).map(([key, expr]) => [key, evaluate(row, expr)])) }));
    }
    if (stage.$project) rows = exclude(rows, stage.$project);
    if (stage.$facet) {
      const spec = stage.$facet.stage2.find((s) => s.$project)?.$project ?? {};
      return [{ count: rows.length, data: exclude(rows, spec) }];
    }
  }
  throw new Error("stand-in aggregate: no $facet");
};

const fakeRes = () => ({
  statusCode: 200, body: null,
  status(code) { this.statusCode = code; return this; },
  json(body) { this.body = JSON.parse(JSON.stringify(body, stripCredentials)); return this; },
});

// ------------------------------------------------------------------- checks --
const cases = [
  ["Travel Request", TravelRequest, listTravelRequestByParams, "employeeId", "employeeName", "employee"],
  ["Training Feedback", TrainingFeedback, listTrainingFeedbacksByParams, "employeeId", "employeeName", "employee"],
  ["Employee Skill Map", EmployeeSkillMap, listEmployeeSkillMapsByParams, "employeeId", "employeeName", "employee"],
  ["Leave Ledger Entry", LeaveLedgerEntry, listLeaveLedgerEntryByParams, "employeeId", "employeeName", "employee"],
  ["Employee Separation", EmployeeSeparation, listEmployeeSeparationsByParams, "employeeId", "employeeName", "employee"],
  ["Exit Interview", ExitInterview, listExitInterviewsByParams, "employeeId", "employeeName", "employee"],
  ["Full and Final Statement", FullAndFinalStatement, listFullAndFinalStatementsByParams, "employeeId", "employeeName", "employee"],
  ["Job Requisition", JobRequisition, listJobRequisitionsByParams, "requestedById", "requestedByName", "requestedBy"],
];

for (const [label, Model, handler, refField, nameField, joined] of cases) {
  Model.aggregate = aggregateOver({ _id: oid(), [refField]: asha._id, createdAt: new Date() });
  // The join is dropped for every caller; ADMIN keeps the scope helpers off
  // the database.
  const req = { user: { id: String(oid()), role: "ADMIN" }, session: { user: {} }, params: {}, body: {} };
  const res = fakeRes();
  await handler(req, res);
  assert.equal(res.statusCode, 200, `${label}: ${JSON.stringify(res.body)}`);

  const [row] = res.body.data[0].data;
  assert.equal(row[nameField], "asha", `${label}: the ${nameField} column still shows`);
  assert.ok(!(joined in row), `${label}: the joined employee record "${joined}" is not sent`);
  const text = JSON.stringify(res.body);
  for (const secret of SECRETS) assert.ok(!text.includes(secret), `${label}: leaked ${secret}`);
}

console.log("joinedEmployeePrivacy.test.js passed");

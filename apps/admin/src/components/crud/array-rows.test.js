// Re-test (28 Oct): a Training Event attendee row left with Attendance and
// Status on "—" was refused with Mongoose's raw "TrainingEvent validation
// failed: employees.0.attendance: `` is not a valid enum value". A blank row
// dropdown is now unset, so the row saves with the field's default. Checked
// against the real TrainingEvent model.
import assert from "node:assert/strict";
import mongoose from "mongoose";
import TrainingEvent from "../../../../server/models/TrainingEvent.js";
import { emptyRow, withCell } from "./array-rows.js";

const columns = [
    { name: "employeeId", type: "select" },
    { name: "isMandatory", type: "checkbox" },
    { name: "attendance", type: "select" },
    { name: "status", type: "select" },
    { name: "hours", type: "number" },
    { name: "comments", type: "text" },
];
const [employeeId, attendance, status] = [columns[0], columns[2], columns[3]];
const attendee = String(new mongoose.Types.ObjectId());
const eventWith = (row) => new TrainingEvent({
    eventName: "Fire safety", type: "Workshop", location: "Vadodara", introduction: "Annual drill",
    startTime: new Date("2026-10-28T09:00:00Z"), endTime: new Date("2026-10-28T11:00:00Z"),
    employees: [JSON.parse(JSON.stringify(row))],
});

// What the form used to send: blank dropdowns as "".
assert.ok(eventWith({ employeeId: attendee, attendance: "", status: "" }).validateSync(), "the old blank row is what the server refused");

// A new row, only the employee picked.
const fresh = withCell(emptyRow(columns), employeeId, attendee);
assert.ok(!("attendance" in fresh) && !("status" in fresh), "blank dropdowns are unset");
const saved = eventWith(fresh);
assert.equal(saved.validateSync(), undefined, "the row saves");
assert.equal(saved.employees[0].status, "Open", "Status takes its default");
assert.equal(saved.employees[0].attendance, null, "Attendance stays unset");

// Picked, then set back to "—".
const cleared = withCell(withCell(withCell(fresh, attendance, "Present"), attendance, ""), status, "");
assert.equal(eventWith(cleared).validateSync(), undefined, "a cleared dropdown saves too");
assert.equal(withCell(fresh, attendance, "Absent").attendance, "Absent", "a choice is kept");

console.log("array-rows.test.js: all assertions passed");

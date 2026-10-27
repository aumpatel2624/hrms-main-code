import assert from "node:assert/strict";
import { initialFormValues, storedFormValues } from "./form-defaults.js";

// Is active starts checked on a create form when the config gives no default.
assert.equal(initialFormValues([{ name: "isActive", type: "checkbox" }]).isActive, true, "isActive defaults on");

// An explicit config default still wins, either way.
assert.equal(initialFormValues([{ name: "isActive", type: "checkbox", default: false }]).isActive, false, "explicit false kept");
assert.equal(initialFormValues([{ name: "isActive", type: "checkbox", default: true }]).isActive, true, "explicit true kept");

// Other checkboxes and fields keep their old defaults.
assert.deepEqual(
    initialFormValues([
        { name: "isPaid", type: "checkbox" },
        { name: "name", type: "text" },
        { name: "count", type: "number", default: 3 },
    ]),
    { isPaid: false, name: "", count: 3 },
    "other defaults unchanged",
);

// A multiselect starts as an empty id list, not "".
assert.deepEqual(initialFormValues([{ name: "interviewers", type: "multiselect" }]).interviewers, [], "multiselect starts empty");

// An edit form shows a stored date: the timestamp becomes the day a date input reads (F14).
const leaveFields = [{ name: "fromDate", type: "date" }, { name: "toDate", type: "date" }, { name: "reason", type: "text" }];
assert.deepEqual(
    storedFormValues(leaveFields, { fromDate: "2026-09-15T00:00:00.000Z", toDate: "2026-09-16T00:00:00.000Z", reason: "2026-01-01T00:00:00Z" }),
    { fromDate: "2026-09-15", toDate: "2026-09-16", reason: "2026-01-01T00:00:00Z" },
    "date fields trimmed to the day, other fields untouched",
);
assert.deepEqual(storedFormValues(leaveFields, { fromDate: "2026-09-15", toDate: "" }), { fromDate: "2026-09-15", toDate: "" }, "already a day, or blank");

console.log("form-defaults: all assertions passed");

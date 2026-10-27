import assert from "node:assert/strict";
import { initialFormValues } from "./form-defaults.js";

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

console.log("form-defaults: all assertions passed");

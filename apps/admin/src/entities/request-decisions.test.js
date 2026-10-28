// Re-test P1: a team lead on the Employee role who is a Shift Request's or
// Attendance Request's named approver could not decide it. Approve/Reject
// lived only on the Edit page, which that role may not open. They are now on
// the View page too, still shown only when the server says `canDecide`.
// advanced.jsx is JSX and cannot be imported here, so this reads the sources.
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const source = readFileSync(new URL("./advanced.jsx", import.meta.url), "utf8");
const view = readFileSync(new URL("../components/crud/crud-view.jsx", import.meta.url), "utf8");

assert.match(view, /config\.renderViewExtra\?\.\(\{ id, values \}\)/, "the View page renders a config's view actions");

const configOf = (name) => {
    const start = source.indexOf(`export const ${name}`);
    assert.ok(start >= 0, `${name} exists`);
    return source.slice(start, source.indexOf("export const", start + 1));
};
const helperOf = (name) => {
    const start = source.indexOf(`const ${name} = `);
    assert.ok(start >= 0, `${name} exists`);
    return source.slice(start, source.indexOf("\n);\n", start));
};

for (const [config, helper, approve, reject] of [
    ["shiftRequestConfig", "shiftRequestDecision", "approveShiftRequest", "rejectShiftRequest"],
    ["attendanceRequestConfig", "attendanceRequestDecision", "approveAttendanceRequest", "rejectAttendanceRequest"],
]) {
    const body = configOf(config);
    assert.match(body, new RegExp(`renderViewExtra: \\(\\{ id, values \\}\\) => ${helper}\\(id, values\\)`), `${config} offers the decision on View`);
    assert.match(body, new RegExp(`renderExtra:[\\s\\S]*${helper}\\(id, values\\)`), `${config} still offers it on Edit`);
    const decision = helperOf(helper);
    assert.match(decision, /values\.status === "open" && values\.canDecide/, `${helper}: open requests the server lets the caller decide`);
    assert.match(decision, new RegExp(`${approve}\\(id\\)`), `${helper} approves`);
    assert.match(decision, new RegExp(`${reject}\\(id\\)`), `${helper} rejects`);
}

console.log("request-decisions.test.js: all assertions passed");

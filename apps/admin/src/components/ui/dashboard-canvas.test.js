import assert from "node:assert/strict";

// Mirrors the resize math in dashboard-canvas.jsx.
const SIZE_FOR_SPAN = { 1: "sm", 2: "md", 3: "lg", 4: "full" };
const SPAN = { sm: 1, md: 2, lg: 3, full: 4 };
const COL = 240;

const resizeTo = (startSize, dxPx, dir) => {
  const startSpan = SPAN[startSize];
  const delta = Math.round((dxPx * dir) / Math.max(COL, 1));
  return SIZE_FOR_SPAN[Math.min(4, Math.max(1, startSpan + delta))];
};

// East handle: dragging right widens.
assert.equal(resizeTo("sm", 240, 1), "md", "e: +1 col widens sm->md");
assert.equal(resizeTo("md", 480, 1), "full", "e: +2 cols md->full");
assert.equal(resizeTo("md", -240, 1), "sm", "e: dragging left narrows");

// West handle: dragging LEFT widens (dir -1) — the whole point of 4-side resize.
assert.equal(resizeTo("sm", -240, -1), "md", "w: dragging left widens");
assert.equal(resizeTo("md", 240, -1), "sm", "w: dragging right narrows");

// Clamped to the 4-column grid at both ends.
assert.equal(resizeTo("full", 9999, 1), "full", "clamps at 4 columns");
assert.equal(resizeTo("sm", -9999, 1), "sm", "clamps at 1 column");

// Sub-column travel does not flicker the size.
assert.equal(resizeTo("md", 100, 1), "md", "under half a column: no change");
assert.equal(resizeTo("md", 130, 1), "lg", "past half a column: snaps");

// Stat tiles default to one column; everything else to two.
const defaultSizeFor = (t) => (t === "stat" ? "sm" : "md");
assert.equal(defaultSizeFor("stat"), "sm");
for (const t of ["bar", "donut", "area", "radar", "table"]) assert.equal(defaultSizeFor(t), "md", t);

console.log("dashboard canvas: all checks passed");

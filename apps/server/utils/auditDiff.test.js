import assert from "node:assert/strict";
import mongoose from "mongoose";
import {
    REDACTED,
    applyUpdate,
    classifyUpdate,
    diffDocuments,
    flatten,
    isSecret,
    summarise,
} from "./auditDiff.js";

// ---- isSecret -------------------------------------------------------------
{
    assert.equal(isSecret("password"), true);
    assert.equal(isSecret("emailFrom.appPassword"), true, "matches on the last path segment");
    assert.equal(isSecret("siteKey"), true);
    assert.equal(isSecret("Password"), true, "case-insensitive");
    assert.equal(isSecret("name"), false);
    // A field that merely contains a secret word is not itself a secret.
    assert.equal(isSecret("passwordHint"), false);
}

// ---- summarise ------------------------------------------------------------
{
    assert.equal(summarise(null), null);
    assert.equal(summarise(undefined), null);
    assert.equal(summarise(true), true);
    assert.equal(summarise(42), 42);
    assert.equal(summarise("hello"), "hello");
    assert.equal(summarise(new Date("2026-08-22T10:00:00Z")), "2026-08-22T10:00:00.000Z");

    // An ObjectId must stay readable — this is the whole reason summarise exists.
    const id = new mongoose.Types.ObjectId();
    assert.equal(summarise(id), id.toHexString());

    // A rich-text body must not put a page of HTML in the log.
    const long = "x".repeat(900);
    assert.equal(summarise(long).length, 501, "truncated to the cap plus an ellipsis");
    assert.ok(summarise(long).endsWith("…"));
    assert.equal(summarise(long, 10), "xxxxxxxxxx…");
}

// ---- flatten --------------------------------------------------------------
{
    const flat = flatten({
        name: "A",
        robots: { index: true, nested: { deep: 1 } },
        tags: ["x", "y"],
        _id: "drop", __v: 0, createdAt: "drop", updatedAt: "drop", isDeleted: false,
    });
    assert.deepEqual(flat, {
        name: "A",
        "robots.index": true,
        "robots.nested.deep": 1,
        tags: ["x", "y"],
    });
    // Arrays stay whole: exploding roles[47].read would bury the one change
    // that matters under forty-six identical ones.
    assert.ok(Array.isArray(flat.tags));
    assert.deepEqual(flatten(null), {});
}

// ---- diffDocuments --------------------------------------------------------
{
    // Create: everything is a change, nothing has a "from".
    const created = diffDocuments(null, { name: "Sales", isActive: true });
    assert.deepEqual(created, [
        { field: "isActive", from: null, to: true },
        { field: "name", from: null, to: "Sales" },
    ]);

    // Unchanged fields produce no rows.
    const changed = diffDocuments(
        { name: "A", code: "X", isActive: true },
        { name: "B", code: "X", isActive: true },
    );
    assert.deepEqual(changed, [{ field: "name", from: "A", to: "B" }]);
    assert.equal(diffDocuments({ a: 1 }, { a: 1 }).length, 0);

    // Nested changes read as a path, not "the whole object changed".
    const nested = diffDocuments({ robots: { index: true, follow: true } }, { robots: { index: false, follow: true } });
    assert.deepEqual(nested, [{ field: "robots.index", from: true, to: false }]);
}

// secrets: the log records that it changed, never the value on either side
{
    const secret = diffDocuments({ password: "old-hash" }, { password: "new-hash" });
    assert.deepEqual(secret, [{ field: "password", from: REDACTED, to: REDACTED }]);
    assert.equal(JSON.stringify(secret).includes("hash"), false, "no credential reaches the log");

    const added = diffDocuments({}, { "emailFrom.appPassword": "abc123" });
    assert.deepEqual(added, [{ field: "emailFrom.appPassword", from: null, to: REDACTED }]);
    assert.equal(JSON.stringify(added).includes("abc123"), false);
}

// a pathological document cannot produce a thousand-row change list
{
    const wide = Object.fromEntries(Array.from({ length: 200 }, (_, i) => [`f${i}`, i]));
    assert.equal(diffDocuments(null, wide).length, 50);
    assert.equal(diffDocuments(null, wide, { maxChanges: 5 }).length, 5);
}

// ---- applyUpdate ----------------------------------------------------------
{
    const before = { name: "A", robots: { index: true, follow: true }, count: 3 };

    // Direct fields, the shape every controller here uses.
    assert.equal(applyUpdate(before, { name: "B" }).name, "B");
    // Dot paths reach into subdocuments without replacing them.
    const dotted = applyUpdate(before, { "robots.index": false });
    assert.deepEqual(dotted.robots, { index: false, follow: true });
    // $set is the same thing spelled differently.
    assert.equal(applyUpdate(before, { $set: { name: "C" } }).name, "C");
    // $unset reads as "cleared", not "missing".
    assert.equal(applyUpdate(before, { $unset: { name: "" } }).name, null);
    // $setOnInsert only applies when nothing matched, so it is not an update.
    assert.equal(applyUpdate(before, { $setOnInsert: { name: "Z" } }).name, "A");
    // An operator whose result depends on the stored value is flagged, not guessed.
    assert.equal(applyUpdate(before, { $inc: { count: 1 } }).count, "[$inc]");

    // The before-image must not be mutated — the diff needs both sides.
    applyUpdate(before, { name: "mutated", "robots.index": false });
    assert.equal(before.name, "A");
    assert.equal(before.robots.index, true);

    // ObjectIds survive the clone; structuredClone would have wrecked them.
    const id = new mongoose.Types.ObjectId();
    const after = applyUpdate({ countryId: id, name: "A" }, { name: "B" });
    assert.equal(typeof after.countryId.toHexString, "function");
    assert.equal(summarise(after.countryId), id.toHexString());
}

// ---- classifyUpdate -------------------------------------------------------
{
    // Soft delete arrives as an ordinary update; if this misread it, every
    // delete in the panel would be logged as an edit.
    assert.equal(classifyUpdate({ isDeleted: false }, { isDeleted: true }), "delete");
    assert.equal(classifyUpdate({ isDeleted: true }, { isDeleted: false }), "restore");
    assert.equal(classifyUpdate({ isDeleted: false }, { isDeleted: false }), "update");
    assert.equal(classifyUpdate({}, {}), "update");
    assert.equal(classifyUpdate({}, { isDeleted: true }), "delete", "absent counts as not deleted");
}

// ---- the delete path end to end -------------------------------------------
{
    // What findByIdAndUpdate(id, { isDeleted: true }) actually produces.
    const before = { _id: "x", name: "Sales", isDeleted: false };
    const after = applyUpdate(before, { isDeleted: true });
    assert.equal(classifyUpdate(before, after), "delete");
    // isDeleted is ignored in the change list because the action already says it.
    assert.deepEqual(diffDocuments(before, after), []);
}

console.log("auditDiff: all checks passed");

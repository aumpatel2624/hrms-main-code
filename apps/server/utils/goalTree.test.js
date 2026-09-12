import assert from "node:assert/strict";
import { wouldCreateCycle, buildChildrenByParent } from "./goalTree.js";

console.log("Running goalTree.test.js...");

// ============================================================================
// buildChildrenByParent
// ============================================================================

{
  const map = buildChildrenByParent([
    { _id: "a", parentGoalId: null },
    { _id: "b", parentGoalId: "a" },
    { _id: "c", parentGoalId: "a" },
    { _id: "d", parentGoalId: "b" },
  ]);
  assert.deepEqual(map.a.sort(), ["b", "c"]);
  assert.deepEqual(map.b, ["d"]);
  assert.equal(map.d, undefined, "A leaf with no children of its own gets no map entry");
}

// ============================================================================
// wouldCreateCycle
// ============================================================================

{
  // Tree: a -> b -> c -> d (a is root, d is deepest leaf)
  const childrenByParent = buildChildrenByParent([
    { _id: "a", parentGoalId: null },
    { _id: "b", parentGoalId: "a" },
    { _id: "c", parentGoalId: "b" },
    { _id: "d", parentGoalId: "c" },
  ]);

  // A goal cannot be its own parent.
  assert.equal(wouldCreateCycle("a", "a", childrenByParent), true);

  // Assigning a descendant (c, a grandchild of a) as a's parent would loop.
  assert.equal(wouldCreateCycle("c", "a", childrenByParent), true);
  assert.equal(wouldCreateCycle("d", "a", childrenByParent), true, "Deep descendant still detected");
  assert.equal(wouldCreateCycle("b", "a", childrenByParent), true, "Direct child still detected");

  // Assigning an unrelated node, or the current real parent, is fine.
  assert.equal(wouldCreateCycle("a", "d", childrenByParent), false, "d adopting its own ancestor a as parent is a real re-parent, not a cycle for a");
  assert.equal(wouldCreateCycle(null, "a", childrenByParent), false, "No proposed parent -> never a cycle");
}

{
  // Defensive: a pre-existing cycle in bad data must not infinite-loop.
  const childrenByParent = { x: ["y"], y: ["x"] };
  assert.doesNotThrow(() => wouldCreateCycle("z", "x", childrenByParent));
  assert.equal(wouldCreateCycle("z", "x", childrenByParent), false);
}

console.log("✅ All goalTree.test.js assertions passed!");

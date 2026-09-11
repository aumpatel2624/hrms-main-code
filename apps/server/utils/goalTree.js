/**
 * ADR-032 (Performance, module 16, transactional half). A small, pure
 * tree-walk helper for `Goal` — the first tree-shaped doctype in this
 * project (checked `utils/payrollPaymentDays.js` and the rest of `utils/`
 * first; nothing reusable already exists for adjacency-list cycle
 * detection). Kept separate from `utils/appraisalCalc.js`, which is scoped
 * to appraisal *scoring* math, not tree structure.
 *
 * `wouldCreateCycle` answers "if `selfId` adopted `candidateParentId` as its
 * parent, would that create a cycle in the parent chain?" — true when
 * `candidateParentId` equals `selfId` itself, or is any descendant of
 * `selfId`. `childrenByParent` is a plain map the caller builds from a
 * flat `{ _id, parentGoalId }[]` read of the whole tree (or just the
 * relevant employee's goals) — this function does no DB access itself, so
 * it can be unit-tested with hand-built fixtures.
 */
export const wouldCreateCycle = (candidateParentId, selfId, childrenByParent = {}) => {
  if (!candidateParentId || !selfId) return false;
  const candidate = String(candidateParentId);
  const self = String(selfId);
  if (candidate === self) return true;

  const stack = [...(childrenByParent[self] || [])];
  const seen = new Set();
  while (stack.length) {
    const nodeId = String(stack.pop());
    if (nodeId === candidate) return true;
    if (seen.has(nodeId)) continue; // guard against a pre-existing cycle in bad data
    seen.add(nodeId);
    stack.push(...(childrenByParent[nodeId] || []));
  }
  return false;
};

/**
 * Builds the `childrenByParent` map `wouldCreateCycle` expects from a flat
 * list of `{ _id, parentGoalId }` rows (as returned by a `.lean()` query
 * selecting just those two fields).
 */
export const buildChildrenByParent = (rows = []) => {
  const map = {};
  for (const row of rows) {
    if (!row.parentGoalId) continue;
    const key = String(row.parentGoalId);
    if (!map[key]) map[key] = [];
    map[key].push(String(row._id));
  }
  return map;
};

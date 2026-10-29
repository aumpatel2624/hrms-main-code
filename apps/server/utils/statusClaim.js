/**
 * Decide a document exactly once (29 Oct S4).
 *
 * The decision actions used to read a document, check "is it still open?",
 * write ledger or pay rows, then save the new status. Two approvals pressed
 * at the same moment both passed the check, so a 1-day leave wrote two -1
 * ledger entries. Here the status moves first, in one database step that
 * only matches while the document is still in the status the caller read
 * and checked: of two simultaneous decisions exactly one moves it, and the
 * other is refused with 409 before it writes anything.
 *
 * `work` runs the side effects (ledger, attendance, Additional Salary). If it
 * throws, the status goes back to what it was, so the action can be retried.
 * `doc.status` is set to `to` on success; save `doc` afterwards for any other
 * field the action changes.
 */
export const decideOnce = async (Model, doc, to, label, work = async () => {}) => {
  const from = doc.status;
  const moved = await Model.findOneAndUpdate({ _id: doc._id, status: from }, { $set: { status: to } });
  if (!moved) {
    const error = new Error(`This ${label} has already been changed by someone else — reload it to see where it stands`);
    error.status = 409;
    throw error;
  }
  doc.status = to;
  try {
    return await work();
  } catch (error) {
    await Model.updateOne({ _id: doc._id, status: to }, { $set: { status: from } });
    doc.status = from;
    throw error;
  }
};

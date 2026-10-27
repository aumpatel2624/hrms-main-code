/**
 * Company checks on save. HR works group-wide, so every picker offers every
 * company's departments, designations, branches, leave periods and job
 * offers, and a record could quietly mix them (pre-production simulation
 * U1–U3: a transfer into another company's department, an onboarding on
 * another company's offer, a leave policy assignment on another company's
 * leave period).
 *
 * `refs` is `[{ Model, id, label }]`; refs without an id are skipped. Returns
 * the message for the first one that is missing or belongs to a different
 * company than `companyId`, or null when they all match.
 */
export const companyMismatch = async (companyId, refs, whose = "the employee's company") => {
  for (const { Model, id, label } of refs) {
    if (!id) continue;
    const doc = await Model.findById(id).select("companyId").lean();
    if (!doc) return `${label} not found`;
    if (String(doc.companyId) !== String(companyId)) return `${label} must belong to ${whose}`;
  }
  return null;
};

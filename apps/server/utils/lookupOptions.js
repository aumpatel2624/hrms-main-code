/**
 * A names-only list feeding a form's row dropdown (ADR-051) — Expense Type on
 * an Expense Claim, Salary Component on a Benefit Application. The form's own
 * screen permission decides who files it; this list hands any signed-in user
 * `fields` and the id, nothing more, so an Employee can pick a name without
 * read access to the master screen behind it.
 *
 * `scope(req)` narrows the rows (e.g. to the caller's company); it defaults to
 * every row.
 */
export const namesOnlyList = (Model, fields, { sort, scope = async () => ({}) } = {}) =>
  async (req, res) => {
    try {
      const data = await Model.find(await scope(req)).select(fields).sort(sort).lean();
      return res.status(200).json({ isOk: true, status: 200, data });
    } catch (error) {
      console.error("Error in namesOnlyList:", error);
      return res.status(500).json({ isOk: false, status: 500, message: "Internal server error" });
    }
  };

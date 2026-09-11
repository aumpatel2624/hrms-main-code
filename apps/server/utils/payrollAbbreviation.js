/**
 * ADR-026. `SalaryComponent.abbreviation` auto-derivation + de-duplication.
 *
 * Derivation matches the real spec exactly: initials of each word of
 * `salaryComponentName`, uppercased — "Basic Salary" -> "BS". De-duplication
 * matches source's `append_number_if_name_exists` shape (a numeric suffix
 * appended with "_" until unique) but is scoped to `companyId` rather than
 * globally — source has no `company` field on Salary Component at all
 * (single-tenant); this project is multi-company (ADR-016), and an
 * abbreviation only has to be unique within the company whose formulas
 * reference it, so the dedup scope narrows accordingly (judgment call,
 * recorded in DECISIONS.md ADR-026 "As built").
 */

/** Pure: derives the abbreviation from a component name's word-initials. */
export const deriveAbbreviation = (salaryComponentName) =>
  String(salaryComponentName || "")
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .map((word) => word[0].toUpperCase())
    .join("");

/**
 * DB-backed: finds a company-unique abbreviation, appending "_1", "_2", ...
 * until no other SalaryComponent in the same company already has it.
 * `excludeId` omits the document being updated from the collision check.
 */
export const dedupeAbbreviation = async (SalaryComponent, abbreviation, companyId, excludeId = null) => {
  let candidate = abbreviation;
  let suffix = 0;
  for (;;) {
    const clash = await SalaryComponent.findOne({
      abbreviation: candidate,
      companyId,
      ...(excludeId ? { _id: { $ne: excludeId } } : {}),
    });
    if (!clash) return candidate;
    suffix += 1;
    candidate = `${abbreviation}_${suffix}`;
  }
};

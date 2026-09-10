# UAE Gratuity Rules

**Source:** `hrms/regional/united_arab_emirates/setup.py`
**Module:** Regional (United Arab Emirates) — one-time fixture/setup logic only. No calculation
overrides exist for UAE (no `hooks.py` `regional_overrides["United Arab Emirates"]` entry) —
UAE's contribution is exclusively 3 preset `[[Gratuity Rule]]` records reflecting UAE labor-law
gratuity formulas.

## 1. Exact Trigger

`hrms/regional/united_arab_emirates/setup.py::setup()` — entry point invoked at app install /
regional fixture install time for a site whose country is United Arab Emirates (same Frappe
auto-discovery convention as India's `setup.py`, described in
`India Gratuity Rule Setup + Custom Fields.md` §1). No `uninstall()` function is defined for this
module (unlike India) — the 3 Gratuity Rule records are never automatically removed.

```python
def setup():
    create_gratuity_rules_for_uae()
```

## 2. Full Algorithm (numbered pseudocode)

### 2A. `setup()`
1. Call `create_gratuity_rules_for_uae()`.

### 2B. `create_gratuity_rules_for_uae()`
1. Get the list of 3 Gratuity Rule fixture dicts from `get_gratuity_rules()` (section 4 below).
2. FOR each fixture dict `d`:
   a. Construct a new `Gratuity Rule` document from `d`.
   b. Insert it with `ignore_if_duplicate=True, ignore_permissions=True, ignore_mandatory=True`
      (unlike India's explicit `frappe.db.exists(...)` pre-check, UAE relies on Frappe's built-in
      `ignore_if_duplicate` insert flag to silently skip if a record with the same name already
      exists — functionally idempotent, different mechanism).

No calculation logic is involved — these are static reference records read by the generic core
[[Gratuity]] calculation engine (which is NOT part of this module's scope; it lives in
`hrms/hr/doctype/gratuity/` or similar core doctype, owned by another module).

## 3. Custom Fields

None. UAE's `setup.py` seeds only Gratuity Rule records — no custom fields are defined.

## 4. Exact Gratuity Rule / Gratuity Rule Slab Records Seeded

Three `Gratuity Rule` records, each modeling a different UAE labor-law termination scenario:

### Rule 1: `Rule Under Limited Contract (UAE)`

| Field | Value |
|---|---|
| `calculate_gratuity_amount_based_on` | `Sum of all previous slabs` |
| `work_experience_calculation_method` | `Take Exact Completed Years` |
| `minimum_year_for_gratuity` | `1` |

Slabs:

| `from_year` | `to_year` | `fraction_of_applicable_earnings` |
|---|---|---|
| `0` | `1` | `0` |
| `1` | `5` | `21 / 30` (= 0.7) |
| `5` | `0` (no upper bound) | `1` |

### Rule 2: `Rule Under Unlimited Contract on termination (UAE)`

| Field | Value |
|---|---|
| `calculate_gratuity_amount_based_on` | `Current Slab` |
| `work_experience_calculation_method` | `Take Exact Completed Years` |
| `minimum_year_for_gratuity` | `1` |

Slabs (identical breakpoints/fractions to Rule 1, but calculation basis differs — "Current Slab"
means only the fraction of the slab the employee's tenure currently falls into applies, vs. Rule
1's "Sum of all previous slabs" which sums contributions across every slab boundary crossed):

| `from_year` | `to_year` | `fraction_of_applicable_earnings` |
|---|---|---|
| `0` | `1` | `0` |
| `1` | `5` | `21 / 30` (= 0.7) |
| `5` | `0` (no upper bound) | `1` |

### Rule 3: `Rule Under Unlimited Contract on resignation (UAE)`

| Field | Value |
|---|---|
| `calculate_gratuity_amount_based_on` | `Current Slab` |
| `work_experience_calculation_method` | `Take Exact Completed Years` |
| `minimum_year_for_gratuity` | `1` |

Slabs (finer-grained resignation scale — reduced gratuity fraction for shorter tenure, per UAE
law's resignation-specific reduction):

| `from_year` | `to_year` | `fraction_of_applicable_earnings` |
|---|---|---|
| `0` | `1` | `0` |
| `1` | `3` | `1/3 * 21/30` (= 0.2333...) |
| `3` | `5` | `2/3 * 21/30` (= 0.4666...) |
| `5` | `0` (no upper bound) | `21 / 30` (= 0.7) |

## 5. Port Notes

- **No `RegionalStrategy` code needed for UAE** — since there are no calculation-function
  overrides, UAE contributes purely to the Gratuity Rule reference-data table. Port as 3 seed rows
  (plus their [[Gratuity Rule Slab]] child rows) inserted by the same seed/migration mechanism used
  for India's Gratuity Rule (see `01-Modules/Regional/_Module-Spec.md`'s guidance on treating fixture seeding as one-time
  migration data, not runtime code).
- **Idempotency mechanism differs from India's**: UAE relies on the insert call's
  `ignore_if_duplicate=True` flag rather than an explicit pre-check. In a port, prefer an explicit
  "insert if not exists (matched by rule name)" pattern uniformly across both countries' seed
  scripts, since a generic ORM/migration tool may not have an equivalent single-flag
  duplicate-suppression feature — replicate the *behavior* (idempotent, silently skips existing),
  not necessarily the mechanism.
- **`to_year == 0` convention**: across all 3 rules' final slab, `to_year: 0` means "no upper
  bound" (open-ended top slab), matching India's single-slab convention in
  `India Gratuity Rule Setup + Custom Fields.md` §4. A port's Gratuity calculation engine must
  treat `to_year == 0` as `+infinity`, not literally "0 years" — this is a domain convention, not
  a literal numeric boundary, and must be documented/enforced explicitly since a naive port could
  misinterpret `0` as an actual upper bound of zero years.
- **`calculate_gratuity_amount_based_on` values `"Sum of all previous slabs"` vs. `"Current
  Slab"`** are core Gratuity-doctype-level calculation-mode settings (not part of this module) —
  the generic Gratuity engine must support both modes since UAE's 3 rules deliberately use both
  (Rule 1 sums across slabs, Rules 2 and 3 use only the current slab's fraction). Confirm this
  logic's exact implementation with whichever module owns the core `Gratuity`/`Gratuity Rule`
  doctypes when porting the calculation engine itself — this file only specifies the seeded
  *data*, not the engine that consumes it.
- **No `uninstall()`**: unlike India, there is no fixture-removal path defined for UAE at all —
  flag this asymmetry to the product owner if "uninstall regional pack" is a requirement in the
  ported system, rather than silently adding one.

## Related Doctypes

- [[Gratuity Rule]] — the 3 records seeded by this fixture (Limited Contract, Unlimited Contract termination, Unlimited Contract resignation).
- [[Gratuity Rule Slab]] — the child table rows defining each rule's tenure-based fraction breakpoints.
- [[Gratuity]] — the core calculation engine (owned by Payroll) that consumes these seeded rules; not part of this module's scope.

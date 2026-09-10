# India Gratuity Rule Setup + Custom Fields

**Source:** `hrms/regional/india/setup.py`, `hrms/setup.py` (`delete_custom_fields` helper)
**Module:** Regional (India) — one-time fixture/setup logic, not an override of a calculation
function; no `hooks.py` `regional_overrides` entry (this is invoked directly at app-install time,
not via the `allow_regional` dispatch mechanism).

## 1. Exact Trigger

`hrms/regional/india/setup.py::setup()` is the entry point, called during app installation /
regional fixture install for a site whose default country is India (Frappe framework convention:
regional `setup.py` modules under `<app>/regional/<country_folder>/setup.py` are auto-discovered
and their `setup()` function invoked when the site's country matches; `uninstall()` is invoked on
app removal). It runs 3 steps in order:
```python
def setup():
    make_custom_fields()
    add_custom_roles_for_reports()
    create_gratuity_rule_for_india()
```
This is NOT wired through `hooks.py`'s `regional_overrides` dict (that dict only covers the 3
calculation-override hooks documented in `India HRA Exemption.md` / `India Marginal Relief Tax.md`).
It is a plain one-time data-seeding routine.

## 2. Full Algorithm (numbered pseudocode)

### 2A. `setup()`
1. Call `make_custom_fields()` (idempotent upsert of all custom fields below via
   `create_custom_fields(fields, update=True)` — Frappe's helper creates fields that don't exist
   and updates properties on ones that do, matched by `(dt, fieldname)`).
2. Call `add_custom_roles_for_reports()`.
3. Call `create_gratuity_rule_for_india()`.

### 2B. `add_custom_roles_for_reports()`
For each of the 3 report names `"Professional Tax Deductions"`, `"Provident Fund Deductions"`,
`"Income Tax Deductions"`:
1. IF a `Custom Role` record with `report == <report_name>` does NOT already exist THEN create
   one with `roles = [HR User, HR Manager, Employee]` (insert with `ignore_permissions=True`).
2. (Idempotent: skips creation if a Custom Role for that report already exists — does not update
   an existing one's role list.)

### 2C. `create_gratuity_rule_for_india()`
1. IF the `[[Gratuity Rule]]` DocType does not exist in the target system (defensive check for install
   ordering — Payroll module may not be installed) THEN return without doing anything.
2. IF a `Gratuity Rule` named `"Indian Standard Gratuity Rule"` already exists THEN return (no-op,
   idempotent).
3. ELSE create and insert a new `Gratuity Rule` (see section 4 below for exact field values),
   inserted with `ignore_permissions=True, ignore_mandatory=True`.

### 2D. `uninstall()`
1. Call `get_custom_fields()` to get the same field-definition dict used at install time.
2. Call `delete_custom_fields(custom_fields)` (from `hrms/setup.py`) to remove every custom field
   listed, reversing `make_custom_fields()`. (Gratuity Rule / Custom Role records created by
   `setup()` are NOT removed by `uninstall()` — only custom fields are cleaned up; port note this
   asymmetry explicitly.)

## 3. Exact Custom Fields (full `get_custom_fields()` dict, India `setup.py`)

Fields already covered in `India HRA Exemption.md` (Company HRA fields, Declaration/Proof
Submission HRA fields) and `India Marginal Relief Tax.md` (Income Tax Slab field) are cross-
referenced there rather than duplicated. The remaining fields from the same fixture function:

| DocType | Fieldname | Label | Type | Insert After | Options / Notes |
|---|---|---|---|---|---|
| [[Salary Component]] | `component_type` | Component Type | Select | `description` | Options: `""`, `Provident Fund`, `Additional Provident Fund`, `Provident Fund Loan`, `Professional Tax`. `depends_on: eval:doc.type == "Deduction"`. `translatable: 0`. |
| [[Employee Core Model\|Employee]] | `bank_cb` | — | Column Break | `bank_ac_no` | layout only |
| Employee | `ifsc_code` | IFSC Code | Data | `bank_cb` | `print_hide: 1`, `depends_on: eval:doc.salary_mode == "Bank"`, `translatable: 0` |
| Employee | `pan_number` | PAN Number | Data | `payroll_cost_center` | `print_hide: 1`, `translatable: 0` |
| Employee | `micr_code` | MICR Code | Data | `ifsc_code` | `print_hide: 1`, `depends_on: eval:doc.salary_mode == "Bank"`, `translatable: 0` |
| Employee | `provident_fund_account` | Provident Fund Account | Data | `pan_number` | `translatable: 0` |

Full field list (all DocTypes, cross-referenced): Salary Component (`component_type` — above),
Employee (`bank_cb`, `ifsc_code`, `pan_number`, `micr_code`, `provident_fund_account` — above),
Company (`hra_section`, `basic_component`, `hra_component`, `hra_column_break`,
`arrear_component` — see [[India HRA Exemption]] §3), [[Employee Tax Exemption Declaration]] (7 HRA
fields — see [[India HRA Exemption]] §3), [[Employee Tax Exemption Proof Submission]] (9 HRA fields
— see [[India HRA Exemption]] §3), [[Income Tax Slab]] (`marginal_relief_limit` — see
[[India Marginal Relief Tax]] §3).

## 4. Exact Gratuity Rule Record Seeded

One `Gratuity Rule` record:

| Field | Value |
|---|---|
| `name` | `Indian Standard Gratuity Rule` |
| `calculate_gratuity_amount_based_on` | `Current Slab` |
| `work_experience_calculation_method` | `Round Off Work Experience` |
| `minimum_year_for_gratuity` | `5` |

Child table `gratuity_rule_slabs` (see [[Gratuity Rule Slab]]) (1 row):

| `from_year` | `to_year` | `fraction_of_applicable_earnings` |
|---|---|---|
| `0` | `0` | `15 / 26` (≈ 0.576923) |

Interpretation: employees with 5+ years of service qualify; gratuity is calculated as
`(15/26) * applicable earnings` per year of service, applied uniformly across the whole tenure
(single slab covering all years, since `from_year`/`to_year` are both `0`, meaning "no upper
bound" in this rule's convention — consistent with `calculate_gratuity_amount_based_on ==
"Current Slab"`, i.e. the current single slab's fraction applies to the full calculation rather
than summing across slabs).

## 5. Port Notes

- **Idempotency guards must be replicated exactly**: the Custom Role seed checks existence by
  `report` name only (not full row equality) and skips if found — does not upsert. The Gratuity
  Rule seed checks by exact `name` and skips entirely if found — does not upsert/update an
  existing rule's slabs. A port's migration/seed script should use the same "insert if absent,
  never overwrite" semantics, not a blind upsert, to avoid clobbering user edits to these fixture
  records post-install.
- **Defensive DocType-existence check**: `create_gratuity_rule_for_india()` first checks whether
  `Gratuity Rule` exists as a DocType at all before attempting to insert — this models a
  cross-module dependency (Payroll module must be installed for Gratuity Rule to exist). In a
  ported system, this becomes an explicit dependency/ordering constraint in the seed/migration
  pipeline (run gratuity fixtures only after the Payroll/Gratuity schema migration), not a runtime
  existence check.
- **`uninstall()` asymmetry**: only custom fields are removed on uninstall; the Gratuity Rule and
  Custom Role records seeded by `setup()` are left in place. Preserve this asymmetry deliberately
  if porting an "uninstall regional pack" flow, or flag it to the product owner as a possible gap
  rather than "fixing" it unprompted.
- **`ignore_mandatory=True` on Gratuity Rule insert**: the source explicitly bypasses mandatory-
  field validation when inserting this fixture (likely because some Gratuity Rule fields not set
  here — e.g. company-scoping fields, if any exist on that doctype — are normally required). A
  port's seed script must ensure the fixture record satisfies whatever the target schema's actual
  NOT NULL/required-field constraints are, filling in any additional required columns with sane
  defaults rather than reproducing a "skip validation" bypass (which may not be expressible/safe
  in a typical relational schema with NOT NULL constraints).

## Related Doctypes

- [[Gratuity Rule]] — seeded record (`Indian Standard Gratuity Rule`) created by this fixture.
- [[Gratuity Rule Slab]] — child table row seeded under the Gratuity Rule above.
- [[Salary Component]] — target of the `component_type` custom field.
- [[Employee Core Model|Employee]] — target of the bank/PAN custom fields (`ifsc_code`, `pan_number`, `micr_code`, `provident_fund_account`).
- [[Employee Tax Exemption Declaration]] — receives HRA custom fields from the same fixture (see [[India HRA Exemption]]).
- [[Employee Tax Exemption Proof Submission]] — receives HRA custom fields from the same fixture (see [[India HRA Exemption]]).
- [[Income Tax Slab]] — receives the `marginal_relief_limit` custom field (see [[India Marginal Relief Tax]]).

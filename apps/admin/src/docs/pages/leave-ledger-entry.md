# Leave Ledger

Every leave balance movement — allocation, adjustment, and (once built) leave application and encashment — as a single append-only list.

![Leave Ledger](../screenshots/leave-ledger-entry-light.png "light")

![Leave Ledger](../screenshots/leave-ledger-entry-dark.png "dark")

## The balance is always the sum of this table

An employee's real leave balance for a leave type is never stored as one number anywhere — it is always the sum of every row here for that employee and leave type. A cached total shown on a Leave Allocation is a snapshot for display, not the source of truth.

## What creates a row

Granting a Leave Policy Assignment's allocations writes one row per leave type (plus a second, carry-forward row when there are unused leaves brought forward). Adjusting a Leave Allocation writes one signed delta row. Every future balance-affecting action in this module writes here the same way.

## Nothing here can be edited or removed

Like the Audit Log, this is read-only for everyone, including administrators — there is no add, edit or delete button, because an editable ledger is not a ledger.

---
type: flow
tags: [hrms, flow]
roles: [Employee, HR User, Leave Approver]
---

# Attendance and Shift Lifecycle

## Flow

```mermaid
flowchart TD
    ST[Shift Type defined\n(start/end time, grace period, auto-attendance rules)] --> SA[Shift Assignment\nassigns a Shift Type to an Employee for a date range]
    SchS[Shift Schedule defines a recurring rota] --> SSA[Shift Schedule Assignment\nrolls the rota forward via process_auto_shift_creation]
    SSA --> SA
    SA --> CI[Employee Checkin logs\n(IN/OUT punches, mobile or biometric)]
    CI --> Sync[hourly_long: update_last_sync_of_checkin]
    Sync --> Auto[hourly_long: process_auto_attendance_for_all_shifts\ngroups checkins per shift, classifies vs working-hour threshold]
    Auto --> AttMark[Attendance auto-created/updated\n(Present/Absent/Half Day) + linked back to source Checkins]
    Req[Employee requests correction] --> AR[Attendance Request submitted]
    AR --> ApprovalRoute[Routed to Leave Approver]
    ApprovalRoute --> AttMark
    Manual[HR manual override] --> Tool[Employee Attendance Tool\nbulk mark_employee_attendance]
    Tool --> AttMark
    LeaveApproved[Leave Application approved] --> AttMark
```

## Roles at Each Step

| Step | Role |
|---|---|
| Define [[Shift Type]] / [[Shift Schedule]] | [[HR User]] |
| Assign shifts to employees | [[HR User]] (or automated via [[Shift Schedule Assignment]]) |
| Punch in/out | [[Employee]] (self) |
| Request shift change | [[Employee]] → routed to [[Leave Approver]] |
| Request attendance correction | [[Employee]] → routed to [[Leave Approver]] |
| Bulk mark attendance | [[HR User]] |

## Why Attendance Is Mostly System-Generated, Not Manually Entered

- **Employee Checkin is the raw, unopinionated event log** (a punch, nothing more) so
  the system has an immutable source record before any interpretation happens —
  reclassifying how attendance is computed later doesn't require re-entering data,
  just re-running the classification against the same checkins.
- **[[Shift Type]] owns the interpretation rules** (grace period, minimum working hours for
  Half Day vs Present, whether auto-attendance is even enabled) because these rules
  are genuinely per-shift — a night shift and a flexible-hours shift shouldn't share
  the same Present/Absent threshold logic, so the rule lives with the shift definition
  rather than being global.
- **Auto-marking runs on a schedule (`hourly_long`), not on every checkin**, because
  classifying attendance for a shift requires *all* of that shift's checkins for the
  day to be in, which usually isn't known until well after the shift's start — running
  it per-checkin would produce premature/wrong classifications.
- **[[Shift Schedule Assignment]] is separate from [[Shift Assignment]]** because a recurring
  rota (e.g. "week on / week off" or rotating night shifts) needs to keep generating
  future Shift Assignments indefinitely without HR manually creating each one — the
  Assignment is the atomic unit Attendance logic reads from; the Schedule is the
  generator that keeps producing them.
- **[[Attendance Request]] routes through the same approver as Leave**, not a separate
  approval role, because a correction to attendance ("I was actually working, my
  checkin failed") is the same kind of line-management judgment call as approving
  leave — reusing [[Leave Approver]] avoids a redundant role for a structurally
  identical decision.

See also: [[Hire to Retire Overview]], [[01-Modules/Shift-Attendance/_Overview|Shift & Attendance Module]],
[[Employee Checkin]], [[Attendance]], [[Shift Type]].

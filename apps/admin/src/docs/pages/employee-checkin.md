# Employee Checkin

One employee's attendance for a whole month, a row per day: the shift they were on, when they came in and left, the day's status, and how many hours they worked.

![Employee Checkin](../screenshots/employee-checkin-light.png "light")

![Employee Checkin](../screenshots/employee-checkin-dark.png "dark")

## Choosing the employee and month

The register opens on the current month — use the arrows or the month list to move. If your role lets you see other people's attendance, pick someone in the Employee box; it only offers the people your role covers. Otherwise the register always shows your own attendance. On someone else's register, the statuses and attendance times appear only if your role can also open Attendance for them, and leave names only if it can open Leave Application for them; otherwise those cells stay empty. Your own register always shows everything.

## The tiles at the top

Each tile counts the days in the month that carry that status, so you can see at a glance how many days were present, absent, on leave or off.

## Status codes

PR Present · AB Absent · HD Half Day · WFH Work From Home · LV Leave · LWP Leave Without Pay · WO Weekly Off · HO Holiday. A day's status comes from its attendance record first, then from approved leave, then from the holiday list — so someone who worked on a holiday shows as present, and a weekly off or holiday inside a leave stays WO or HO unless that leave type counts holidays. A past working day nobody marked shows the way payroll treats it — AB, or PR if Payroll Settings counts unmarked days as present. Today and later days stay blank until they are marked.

## What the columns mean

In time and Out time are the day's first and last punch (or, with no punches, the times on the attendance record). First half and Second half hold the status codes: a half day shows HD first and the other half's status second. Portion is how much of the day the status covers — 1.00 a whole day, 0.50 a half. Late in is how late the first punch was against the shift start, counted only once past the shift's grace period. Gross hrs runs from In time to Out time; Net punch hrs adds up each In-to-Out stretch; Break hrs is the time between an Out and the next In. Hours are shown as hours:minutes. A column with nothing to show stays empty rather than guessed.

## A day's punches

Click a date to open that day's punches: the title shows the shift and its cut-off time — the window in which a punch counts toward that day — then every punch with its time, In or Out, the device and location it came from, and when it was recorded. Each punch can be opened, edited or deleted from there, if your role allows it.

## Adding a punch, and the full list

"Add Employee Checkin" opens the punch form. "All punches" opens every punch as one list grouped by date, with search and filters — the way this screen used to look.

## Times and night shifts

Every time is shown in India time (Asia/Kolkata), whatever your computer's time zone. A punch counts toward the day of the shift it falls in, so a night shift's punches after midnight stay on the day the shift started.

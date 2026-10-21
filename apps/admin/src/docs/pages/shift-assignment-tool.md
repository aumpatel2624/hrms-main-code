# Shift Assignment Tool

Assign a shift, or a repeating shift schedule, to many employees at once — or bulk-approve/reject open Shift Requests.

![Shift Assignment Tool](../screenshots/shift-assignment-tool-light.png "light")

![Shift Assignment Tool](../screenshots/shift-assignment-tool-dark.png "dark")

## Three actions, one page

Pick an action at the top: "Assign Shift" gives every selected employee the same Shift Type over the same date range. "Assign Shift Schedule" does the same for a repeating Shift Schedule, and immediately generates the first batch of Shift Assignments from it — the same generation a Shift Schedule Assignment's own Generate button runs. "Process Shift Requests" applies one decision (Approve or Reject) to every open request you select.

## One failure doesn't stop the rest

Each employee (or request) is processed on its own. If one already has an overlapping shift, or something else about them is wrong, only that row shows Failed — everyone else still goes through. The results table after a run shows exactly who succeeded and who didn't, and why.

## Nothing is saved here

This page holds no records of its own — it dispatches individual Shift Assignment, Shift Schedule Assignment, or Shift Request approve/reject actions per employee or request. Refreshing the page clears your selection.

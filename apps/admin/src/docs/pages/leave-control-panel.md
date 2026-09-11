# Leave Control Panel

Assign a Leave Policy to many employees at once, and optionally grant the resulting leave allocations in the same step.

![Leave Control Panel](../screenshots/leave-control-panel-light.png "light")

![Leave Control Panel](../screenshots/leave-control-panel-dark.png "dark")

## Two buttons, two outcomes

"Assign Policy Only" creates the Leave Policy Assignment records and stops there — nobody has any leave yet. "Assign + Grant Allocations" does that and immediately runs the allocation step too, the same as opening each assignment afterward and clicking Grant Allocations by hand.

## One failure doesn't stop the rest

Each selected employee is processed on its own. If one already has an overlapping assignment, or something else about them is wrong, only that row shows Failed — everyone else still goes through. The results table after a run shows exactly who succeeded and who didn't, and why.

## Nothing is saved here

This page holds no records of its own — it is a form that dispatches individual Leave Policy Assignment (and, on the fuller path, Leave Allocation) records per employee. Refreshing the page clears your selection.

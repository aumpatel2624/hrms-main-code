# Bulk Salary Structure Assignment

Find employees eligible for a From Date, then assign the same Salary Structure to as many as you select at once.

![Bulk Salary Structure Assignment](../screenshots/bulk-salary-structure-assignment-light.png "light")

![Bulk Salary Structure Assignment](../screenshots/bulk-salary-structure-assignment-dark.png "dark")

## Two steps: find, then assign

Choose a From Date (and optionally narrow by Company, Department, Grade or Employment Type) and click "Find Eligible Employees". The list only shows active employees who don't already have an assignment for that exact date — everyone else is silently excluded, not shown as an error. Pick a Salary Structure and an optional Base/Variable, then assign.

## One failure doesn't stop the rest

Each selected employee is processed on its own. If one turns out to already have a conflicting assignment (a race between the search and the assign step), only that row shows Failed — everyone else still goes through. The results table after a run shows exactly who succeeded and who didn't, and why.

## Nothing is saved here

This page holds no records of its own — it dispatches individual Salary Structure Assignment creations per employee. Refreshing the page clears your search and selection.

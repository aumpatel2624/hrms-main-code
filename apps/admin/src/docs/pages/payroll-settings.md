# Payroll Settings

One shared set of rules every Salary Slip's payment-days calculation reads — how attendance is sourced, how an unmarked day counts, and how a half day is weighted.

![Payroll Settings](../screenshots/payroll-settings-light.png "light")

![Payroll Settings](../screenshots/payroll-settings-dark.png "dark")

## One row for the whole company

There is only one Payroll Settings record — it applies to every Salary Slip created afterward, not per-company. The first time this page is opened it is created automatically with sensible defaults.

## Payroll Based On

Choose whether unpaid leave is read from Attendance records or from Leave Applications directly. Attendance is the more complete signal (it also knows about unmarked days and half days); Leave Application is simpler if attendance isn't tracked day-by-day.

## Changes only affect new Salary Slips

A Salary Slip is a snapshot taken at creation time — changing a setting here never rewrites one already created.

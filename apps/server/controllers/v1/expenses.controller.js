import ExpenseClaimType from "../../models/ExpenseClaimType.js";
import ExpenseClaim from "../../models/ExpenseClaim.js";
import Employee from "../../models/Employee.js";
import { runListQuery } from "../../utils/listQuery.js";
import { attendanceScope } from "../../utils/attendanceScope.js";
import { resolveRequestEmployee } from "../../utils/requestEmployee.js";
import { resolveApprovers, getEmployeesApprovedBy } from "../../utils/approvers.js";
import { buildScopeFilter } from "../../utils/scope.js";
import { SCOPES } from "@demo-panel/shared/scopes";
import { computeExpenseTotals, computeTaxAmount } from "../../utils/expenseClaimCalc.js";

const failure = (res, error) => {
  if (error.status) return res.status(error.status).json({ isOk: false, status: error.status, message: error.message });
  if (error.name === "ValidationError" || error.name === "CastError" || error.code === 11000) return res.status(400).json({ isOk: false, status: 400, message: error.code === 11000 ? "A record with these unique values already exists" : error.message });
  console.error("Expenses request failed", error);
  return res.status(500).json({ isOk: false, status: 500, message: "Internal server error" });
};
const throwError = (status, message) => { const error = new Error(message); error.status = status; throw error; };

export const EXPENSE_CLAIM_TYPE_FIELDS = ["name", "description"];
export const EXPENSE_CLAIM_FIELDS = ["employeeId", "postingDate", "expenseApproverId", "expenses", "taxes"];
const TYPE_FILTERABLE = { name: "string", description: "string", createdAt: "date" };
export const EXPENSE_CLAIM_FILTERABLE = { employeeId: "objectId", departmentId: "objectId", status: "string", postingDate: "date", isPaid: "boolean" };
const STAGES = [
  { $lookup: { from: "employees", localField: "employeeId", foreignField: "_id", as: "employee" } },
  { $addFields: { employeeIdLabel: { $arrayElemAt: ["$employee.employeeName", 0] } } }, { $project: { employee: 0 } },
  { $lookup: { from: "departments", localField: "departmentId", foreignField: "_id", as: "department" } },
  { $addFields: { departmentIdLabel: { $arrayElemAt: ["$department.departmentName", 0] } } }, { $project: { department: 0 } },
];

const claimScope = async (req) => {
  const company = await attendanceScope(req, false);
  if (req.user?.dataScope !== SCOPES.APPROVER) return req.user?.dataScope === SCOPES.OWN ? await attendanceScope(req, true) : company;
  const own = await resolveRequestEmployee(req);
  const approverIds = await getEmployeesApprovedBy(req.user.id, "expense");
  const row = buildScopeFilter({ ...req.user, employeeId: own?._id }, { owner: "employeeId", approverIds });
  return { $and: [company, row] };
};
const ensureReadable = async (req, doc) => {
  const scope = await claimScope(req);
  const match = await ExpenseClaim.exists({ _id: doc._id, ...scope });
  if (!match) throwError(403, "You do not have permission to access this Expense Claim");
};
const canAct = async (req, doc) => {
  if (req.user?.dataScope === SCOPES.ALL || !req.user?.dataScope) return true;
  if (String(doc.expenseApproverId || "") === String(req.user.id)) return true;
  const approved = await getEmployeesApprovedBy(req.user.id, "expense");
  return approved.some((id) => String(id) === String(doc.employeeId));
};
const normalizeRows = async (expenses = [], taxes = []) => {
  const normalizedExpenses = await Promise.all((expenses || []).map(async (row) => {
    const next = typeof row.toObject === "function" ? row.toObject() : { ...row };
    if (next.sanctionedAmount === undefined || next.sanctionedAmount === null || next.sanctionedAmount === "") next.sanctionedAmount = Number(next.amount);
    if (Number(next.sanctionedAmount) > Number(next.amount)) throwError(400, "Sanctioned Amount cannot be greater than Amount");
    if (!next.description && next.expenseTypeId) {
      const type = await ExpenseClaimType.findById(next.expenseTypeId).select("description").lean();
      next.description = type?.description || "";
    }
    return next;
  }));
  const sanctioned = normalizedExpenses.reduce((sum, row) => sum + (Number(row.sanctionedAmount) || 0), 0);
  const normalizedTaxes = (taxes || []).map((row) => {
    const next = typeof row.toObject === "function" ? row.toObject() : { ...row };
    if (next.rate !== undefined && next.rate !== null && next.rate !== "") next.taxAmount = computeTaxAmount(next.rate, sanctioned);
    return next;
  });
  return { expenses: normalizedExpenses, taxes: normalizedTaxes, totals: computeExpenseTotals(normalizedExpenses, normalizedTaxes) };
};

export const createExpenseClaimType = async (req, res) => { try { const doc = await ExpenseClaimType.create(req.body); return res.status(201).json({ isOk: true, status: 201, data: doc }); } catch (error) { return failure(res, error); } };
export const listExpenseClaimTypes = async (req, res) => { try { const data = await ExpenseClaimType.find().sort({ name: 1 }); return res.json({ isOk: true, status: 200, data }); } catch (error) { return failure(res, error); } };
export const searchExpenseClaimTypes = async (req, res) => { try { const data = await runListQuery(ExpenseClaimType, req.body, { searchFields: ["name", "description"], filterable: TYPE_FILTERABLE }); return res.json({ isOk: true, status: 200, data }); } catch (error) { return failure(res, error); } };
export const getExpenseClaimTypeById = async (req, res) => { try { const data = await ExpenseClaimType.findById(req.params.id); if (!data) throwError(404, "Expense Claim Type not found"); return res.json({ isOk: true, status: 200, data }); } catch (error) { return failure(res, error); } };
export const updateExpenseClaimType = async (req, res) => { try { const data = await ExpenseClaimType.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true }); if (!data) throwError(404, "Expense Claim Type not found"); return res.json({ isOk: true, status: 200, data }); } catch (error) { return failure(res, error); } };
export const deleteExpenseClaimType = async (req, res) => { try { const doc = await ExpenseClaimType.findById(req.params.id); if (!doc) throwError(404, "Expense Claim Type not found"); if (await ExpenseClaim.exists({ "expenses.expenseTypeId": doc._id })) throwError(409, "Cannot delete an Expense Claim Type referenced by an Expense Claim"); await doc.deleteOne(); return res.json({ isOk: true, status: 200, message: "Expense Claim Type deleted successfully" }); } catch (error) { return failure(res, error); } };

export const createExpenseClaim = async (req, res) => { try {
  let employeeId = req.body.employeeId;
  if (req.user?.dataScope === SCOPES.OWN) { const employee = await resolveRequestEmployee(req); if (!employee) throwError(403, "No employee record linked to this user"); employeeId = employee._id; }
  if (!employeeId) throwError(400, "Employee is required");
  const employee = await Employee.findById(employeeId).lean(); if (!employee) throwError(404, "Employee not found");
  const { expenses, taxes, totals } = await normalizeRows(req.body.expenses, req.body.taxes);
  const resolved = req.body.expenseApproverId || (await resolveApprovers(employeeId, "expense"))[0] || null;
  const data = await ExpenseClaim.create({ employeeId, companyId: employee.companyId, departmentId: employee.departmentId, postingDate: req.body.postingDate || new Date(), expenseApproverId: resolved, expenses, taxes, status: "draft", ...totals });
  return res.status(201).json({ isOk: true, status: 201, data });
} catch (error) { return failure(res, error); } };
export const listExpenseClaims = async (req, res) => { try { const data = await runListQuery(ExpenseClaim, req.query, { scopeFilter: await claimScope(req), filterable: EXPENSE_CLAIM_FILTERABLE, stages: STAGES }); return res.json({ isOk: true, status: 200, data }); } catch (error) { return failure(res, error); } };
export const searchExpenseClaims = async (req, res) => { try { const data = await runListQuery(ExpenseClaim, req.body, { scopeFilter: await claimScope(req), filterable: EXPENSE_CLAIM_FILTERABLE, stages: STAGES }); return res.json({ isOk: true, status: 200, data }); } catch (error) { return failure(res, error); } };
export const getExpenseClaimById = async (req, res) => { try { const data = await ExpenseClaim.findById(req.params.id).populate("employeeId", "employeeName employeeCode").populate("departmentId", "departmentName").populate("expenseApproverId", "userName").populate("expenses.expenseTypeId", "name description"); if (!data) throwError(404, "Expense Claim not found"); await ensureReadable(req, data); return res.json({ isOk: true, status: 200, data }); } catch (error) { return failure(res, error); } };
export const updateExpenseClaim = async (req, res) => { try { const doc = await ExpenseClaim.findById(req.params.id); if (!doc) throwError(404, "Expense Claim not found"); await ensureReadable(req, doc); if (doc.status !== "draft") throwError(400, "Only draft Expense Claim documents can be edited"); const rows = await normalizeRows(req.body.expenses ?? doc.expenses, req.body.taxes ?? doc.taxes); doc.expenses = rows.expenses; doc.taxes = rows.taxes; Object.assign(doc, rows.totals); if (req.body.postingDate !== undefined) doc.postingDate = req.body.postingDate; if (req.body.expenseApproverId !== undefined) doc.expenseApproverId = req.body.expenseApproverId || null; await doc.save(); return res.json({ isOk: true, status: 200, data: doc }); } catch (error) { return failure(res, error); } };
export const deleteExpenseClaim = async (req, res) => { try { const doc = await ExpenseClaim.findById(req.params.id); if (!doc) throwError(404, "Expense Claim not found"); await ensureReadable(req, doc); if (doc.status === "submitted") throwError(400, "Submitted documents must be cancelled before deletion"); doc.isDeleted = true; await doc.save(); return res.json({ isOk: true, status: 200, message: "Expense Claim deleted successfully" }); } catch (error) { return failure(res, error); } };
const act = (action) => async (req, res) => { try { const doc = await ExpenseClaim.findById(req.params.id); if (!doc) throwError(404, "Expense Claim not found"); if (!(await canAct(req, doc))) throwError(403, "You do not have permission to act on this Expense Claim"); await action(doc); await doc.save(); return res.json({ isOk: true, status: 200, data: doc }); } catch (error) { return failure(res, error); } };
export const approveExpenseClaim = act(async (doc) => { if (doc.status !== "draft") throwError(400, "Only draft Expense Claim documents can be approved"); doc.status = "approved"; });
export const rejectExpenseClaim = act(async (doc) => { if (doc.status !== "draft") throwError(400, "Only draft Expense Claim documents can be rejected"); doc.status = "rejected"; doc.expenses.forEach((row) => { row.sanctionedAmount = 0; }); Object.assign(doc, computeExpenseTotals(doc.expenses, doc.taxes)); });
export const submitExpenseClaim = act(async (doc) => { if (doc.status !== "approved") throwError(400, "Only approved Expense Claim documents can be submitted"); doc.status = "submitted"; });
export const cancelExpenseClaim = act(async (doc) => { if (doc.status !== "submitted") throwError(400, "Only submitted Expense Claim documents can be cancelled"); doc.status = "cancelled"; });
export const markExpenseClaimAsPaid = async (req, res) => {
  try {
    const doc = await ExpenseClaim.findById(req.params.id);
    if (!doc) throwError(404, "Expense Claim not found");
    if (!(await canAct(req, doc))) throwError(403, "You do not have permission to act on this Expense Claim");
    if (doc.status !== "submitted") throwError(400, "Only submitted Expense Claim documents can be marked as paid");
    if (doc.isPaid) throwError(400, "Expense Claim is already marked as paid");
    doc.isPaid = true; await doc.save();
    return res.status(200).json({ isOk: true, status: 200, message: "Expense Claim marked as paid successfully" });
  } catch (error) { return failure(res, error); }
};

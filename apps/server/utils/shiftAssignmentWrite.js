import { validateShiftRecord } from "./shiftValidation.js";

// ADR-024/025 assume a single server process. Serialize validation+save per employee
// so simultaneous manual/generation writes cannot both pass the overlap query.
// A multi-process deployment needs a database-backed lock instead.
const tails = new Map();
export const withShiftWriteLock = async (key, action) => {
  const prior = tails.get(key) || Promise.resolve();
  let release;
  const next = new Promise(resolve => { release = resolve; });
  tails.set(key, next);
  await prior;
  try { return await action(); }
  finally { release(); if (tails.get(key) === next) tails.delete(key); }
};
export const saveShiftRecord = (doc, previous, req) => {
  const save = async () => { await validateShiftRecord(doc, previous, req); return doc.save(); };
  return doc.constructor.modelName === "ShiftAssignment"
    ? withShiftWriteLock(`employee:${doc.employeeId}`, save)
    : save();
};

const number = (value) => (Number.isFinite(Number(value)) ? Number(value) : 0);

export const computeTaxAmount = (rate, totalSanctionedAmount) => number(rate) * number(totalSanctionedAmount) / 100;

export const computeExpenseTotals = (expenses = [], taxes = []) => {
  const totalClaimedAmount = expenses.reduce((sum, row) => sum + number(row.amount), 0);
  const totalSanctionedAmount = expenses.reduce((sum, row) => sum + number(row.sanctionedAmount), 0);
  const totalTaxesAndCharges = taxes.reduce((sum, row) => sum + number(row.taxAmount), 0);
  return { totalClaimedAmount, totalSanctionedAmount, totalTaxesAndCharges, grandTotal: totalSanctionedAmount + totalTaxesAndCharges };
};

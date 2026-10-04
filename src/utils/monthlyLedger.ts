import { Revenue, Expense } from '../context/AuthContext';

// Shared by BusinessPerformanceCard (trend chart) and CashFlowRecommendations
// (risk analysis) — both read the same Monthly P&L entries from Financials,
// tagged with a `monthly-turnover:YYYY-MM` / `monthly-expense:YYYY-MM`
// reference (see MonthlyFinancials.tsx), so the two views never disagree
// about what a given month's revenue/expenses actually were.
export interface MonthlyLedgerPoint {
  year: number;
  month: number; // 0-indexed, matches Date.getMonth()
  date: Date;
  totalRevenue: number;
  totalExpenses: number;
}

const TURNOVER_RE = /^monthly-turnover:(\d{4})-(\d{2})$/;
const EXPENSE_RE = /^monthly-expense:(\d{4})-(\d{2})$/;

export function buildMonthlyLedger(revenues: Revenue[], expenses: Expense[]): MonthlyLedgerPoint[] {
  const byKey = new Map<string, { year: number; month: number; totalRevenue: number; totalExpenses: number }>();

  for (const r of revenues) {
    const m = r.reference?.match(TURNOVER_RE);
    if (!m) continue;
    const key = `${m[1]}-${m[2]}`;
    const entry = byKey.get(key) ?? { year: parseInt(m[1], 10), month: parseInt(m[2], 10) - 1, totalRevenue: 0, totalExpenses: 0 };
    entry.totalRevenue += r.amount;
    byKey.set(key, entry);
  }

  for (const e of expenses) {
    const m = e.reference?.match(EXPENSE_RE);
    if (!m) continue;
    const key = `${m[1]}-${m[2]}`;
    const entry = byKey.get(key) ?? { year: parseInt(m[1], 10), month: parseInt(m[2], 10) - 1, totalRevenue: 0, totalExpenses: 0 };
    entry.totalExpenses += e.amount;
    byKey.set(key, entry);
  }

  return Array.from(byKey.values())
    .map((v) => ({ ...v, date: new Date(v.year, v.month, 1) }))
    .sort((a, b) => a.date.getTime() - b.date.getTime());
}

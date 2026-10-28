import { Revenue, Expense } from '../context/AuthContext';

// Shared by BusinessPerformanceCard (monthly trend chart), BusinessHealthDashboard,
// MultiYearComparison, FinancialTracker and CashFlowRecommendations — all read
// the same Monthly P&L entries from Financials. Entries are tagged with either
// the legacy `monthly-turnover:YYYY-MM` / `monthly-expense:YYYY-MM` reference
// (one lump sum per month, pre-dates daily entry) or the current
// `daily-turnover:YYYY-MM-DD` / `daily-expense:YYYY-MM-DD` reference (see
// MonthlyFinancials.tsx) — this aggregator sums whichever (or both) exist for
// a month into one point, so none of these views ever disagree about what a
// given month's revenue/expenses actually were, regardless of which format
// produced them.
export interface MonthlyLedgerPoint {
  year: number;
  month: number; // 0-indexed, matches Date.getMonth()
  date: Date;
  totalRevenue: number;
  totalExpenses: number;
}

// Matches both `monthly-turnover:YYYY-MM` (legacy, no day) and
// `daily-turnover:YYYY-MM-DD` (current) — the trailing day group is optional
// and simply ignored, since this aggregator only needs the month total.
const TURNOVER_RE = /^(?:monthly|daily)-turnover:(\d{4})-(\d{2})(?:-\d{2})?$/;
const EXPENSE_RE = /^(?:monthly|daily)-expense:(\d{4})-(\d{2})(?:-\d{2})?$/;

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

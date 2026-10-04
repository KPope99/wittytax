import React, { useMemo, useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { formatCurrency, deriveBusinessFinancials } from '../utils/taxCalculations';
import { getAllCanonicalCompanyCalcsByYear } from '../utils/canonicalCompanyCalc';

const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

const TOLERANCE = 1; // naira — guards against float rounding, not a real allowance

function monthKey(month: number): string {
  return String(month + 1).padStart(2, '0');
}

function turnoverRef(year: number, month: number): string {
  return `monthly-turnover:${year}-${monthKey(month)}`;
}

function expenseRef(year: number, month: number): string {
  return `monthly-expense:${year}-${monthKey(month)}`;
}

function parseAmount(v: string): number {
  const n = parseFloat(v.replace(/,/g, ''));
  return isNaN(n) ? 0 : n;
}

function formatInput(raw: string): string {
  const n = raw.replace(/[^0-9]/g, '');
  return n ? parseInt(n, 10).toLocaleString('en-NG') : '';
}

type Draft = { turnover: string; expenses: string };

const MonthlyFinancials: React.FC = () => {
  const { taxHistory, revenues, expenses, addRevenue, removeRevenue, addExpense, removeExpense } = useAuth();

  const currentYear = new Date().getFullYear();

  // Canonical annual turnover/expenses per year, taken from the most recent
  // saved Company Tax calculation for that year.
  const companyCalcsByYear = useMemo(() => getAllCanonicalCompanyCalcsByYear(taxHistory), [taxHistory]);

  const availableYears = useMemo(() => {
    const years = new Set<number>([currentYear, ...Array.from(companyCalcsByYear.keys())]);
    return Array.from(years).sort((a, b) => b - a);
  }, [companyCalcsByYear, currentYear]);

  const [selectedYear, setSelectedYear] = useState<number>(availableYears[0] ?? currentYear);

  const canonicalCalc = companyCalcsByYear.get(selectedYear) ?? null;
  const target = useMemo(
    () =>
      canonicalCalc
        ? { annualTurnover: canonicalCalc.result.annualTurnover, totalExpenses: deriveBusinessFinancials(canonicalCalc.result).totalExpenses }
        : null,
    [canonicalCalc]
  );

  const existingTurnoverByMonth = useMemo(() => {
    const map = new Map<string, { id: string; amount: number }>();
    for (const r of revenues) {
      if (r.reference && r.reference.startsWith(`monthly-turnover:${selectedYear}-`)) {
        map.set(r.reference, { id: r.id, amount: r.amount });
      }
    }
    return map;
  }, [revenues, selectedYear]);

  const existingExpenseByMonth = useMemo(() => {
    const map = new Map<string, { id: string; amount: number }>();
    for (const e of expenses) {
      if (e.reference && e.reference.startsWith(`monthly-expense:${selectedYear}-`)) {
        map.set(e.reference, { id: e.id, amount: e.amount });
      }
    }
    return map;
  }, [expenses, selectedYear]);

  const [drafts, setDrafts] = useState<Draft[]>(() => Array.from({ length: 12 }, () => ({ turnover: '', expenses: '' })));
  const [rowErrors, setRowErrors] = useState<Record<number, string>>({});
  const [savingMonth, setSavingMonth] = useState<number | null>(null);

  // Re-seed drafts from saved data whenever the selected year changes (not
  // on every revenues/expenses update, so in-progress typing isn't clobbered
  // by the refetch that follows a save elsewhere on the page).
  useEffect(() => {
    const next = Array.from({ length: 12 }, (_, month) => {
      const t = existingTurnoverByMonth.get(turnoverRef(selectedYear, month));
      const e = existingExpenseByMonth.get(expenseRef(selectedYear, month));
      return {
        turnover: t ? t.amount.toLocaleString('en-NG') : '',
        expenses: e ? e.amount.toLocaleString('en-NG') : '',
      };
    });
    setDrafts(next);
    setRowErrors({});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedYear]);

  const savedTurnoverTotal = useMemo(() => {
    let sum = 0;
    existingTurnoverByMonth.forEach((v) => { sum += v.amount; });
    return sum;
  }, [existingTurnoverByMonth]);

  const monthsWithTurnoverSaved = existingTurnoverByMonth.size;

  const reconciliation: 'no-target' | 'matched' | 'incomplete' | 'mismatch' = useMemo(() => {
    if (!target) return 'no-target';
    // Already over the declared annual figure is always a problem, even with
    // months still unfilled — expenses only ever add up as more are entered,
    // so there's no way the remaining months bring this back into line.
    // Catches legacy entries saved before this check existed, or ones that
    // were valid against an older canonical figure that's since changed
    // (e.g. the Wizard was re-run with a different turnover/profit).
    if (savedTurnoverTotal > target.annualTurnover + TOLERANCE) return 'mismatch';
    if (monthsWithTurnoverSaved < 12) return 'incomplete';
    return Math.abs(savedTurnoverTotal - target.annualTurnover) <= TOLERANCE ? 'matched' : 'mismatch';
  }, [target, monthsWithTurnoverSaved, savedTurnoverTotal]);

  const savedExpenseTotal = useMemo(() => {
    let sum = 0;
    existingExpenseByMonth.forEach((v) => { sum += v.amount; });
    return sum;
  }, [existingExpenseByMonth]);

  const monthsWithExpenseSaved = existingExpenseByMonth.size;

  const expenseReconciliation: 'no-target' | 'matched' | 'incomplete' | 'mismatch' = useMemo(() => {
    if (!target) return 'no-target';
    if (savedExpenseTotal > target.totalExpenses + TOLERANCE) return 'mismatch';
    if (monthsWithExpenseSaved < 12) return 'incomplete';
    return Math.abs(savedExpenseTotal - target.totalExpenses) <= TOLERANCE ? 'matched' : 'mismatch';
  }, [target, monthsWithExpenseSaved, savedExpenseTotal]);

  const updateDraft = (month: number, field: keyof Draft, value: string) => {
    setDrafts((prev) => prev.map((d, i) => (i === month ? { ...d, [field]: value } : d)));
    setRowErrors((prev) => {
      if (!prev[month]) return prev;
      const next = { ...prev };
      delete next[month];
      return next;
    });
  };

  const handleSaveMonth = async (month: number) => {
    const draft = drafts[month];
    const newTurnover = parseAmount(draft.turnover);
    const newExpenses = parseAmount(draft.expenses);

    if (target) {
      const otherMonthsTurnoverTotal = savedTurnoverTotal - (existingTurnoverByMonth.get(turnoverRef(selectedYear, month))?.amount ?? 0);
      const hypotheticalTurnoverTotal = otherMonthsTurnoverTotal + newTurnover;
      if (hypotheticalTurnoverTotal > target.annualTurnover + TOLERANCE) {
        setRowErrors((prev) => ({
          ...prev,
          [month]: `This would bring your ${selectedYear} turnover total to ${formatCurrency(hypotheticalTurnoverTotal)}, over your declared annual turnover of ${formatCurrency(target.annualTurnover)}. Reduce this month or another month first.`,
        }));
        return;
      }

      const otherMonthsExpenseTotal = savedExpenseTotal - (existingExpenseByMonth.get(expenseRef(selectedYear, month))?.amount ?? 0);
      const hypotheticalExpenseTotal = otherMonthsExpenseTotal + newExpenses;
      if (hypotheticalExpenseTotal > target.totalExpenses + TOLERANCE) {
        setRowErrors((prev) => ({
          ...prev,
          [month]: `This would bring your ${selectedYear} expenses total to ${formatCurrency(hypotheticalExpenseTotal)}, over your declared annual expenses of ${formatCurrency(target.totalExpenses)} (turnover minus assessable profit). Reduce this month or another month first.`,
        }));
        return;
      }
    }

    setSavingMonth(month);
    try {
      const existingT = existingTurnoverByMonth.get(turnoverRef(selectedYear, month));
      if (existingT) await removeRevenue(existingT.id);
      if (newTurnover > 0) {
        await addRevenue({
          description: `${MONTHS[month]} ${selectedYear} turnover`,
          amount: newTurnover,
          category: 'Monthly Turnover',
          date: new Date(selectedYear, month, 1),
          reference: turnoverRef(selectedYear, month),
        });
      }

      const existingE = existingExpenseByMonth.get(expenseRef(selectedYear, month));
      if (existingE) await removeExpense(existingE.id);
      if (newExpenses > 0) {
        await addExpense({
          description: `${MONTHS[month]} ${selectedYear} expenses`,
          amount: newExpenses,
          category: 'Monthly Expenses',
          date: new Date(selectedYear, month, 1),
          reference: expenseRef(selectedYear, month),
        });
      }
    } finally {
      setSavingMonth(null);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h3 className="text-base font-semibold text-gray-800">Monthly Revenue & Expenses</h3>
          <p className="text-xs text-gray-500 mt-0.5">
            Enter turnover and expenses month by month — net profit is calculated automatically, and this feeds the Business Performance trend chart.
          </p>
        </div>
        <select
          value={selectedYear}
          onChange={(e) => setSelectedYear(parseInt(e.target.value, 10))}
          className="px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white focus:ring-2 focus:ring-primary-500 focus:border-transparent"
        >
          {availableYears.map((y) => (
            <option key={y} value={y}>{y}</option>
          ))}
        </select>
      </div>

      {/* Reconciliation banners */}
      {reconciliation === 'no-target' && (
        <div className="bg-gray-50 border border-gray-200 rounded-lg p-3 text-sm text-gray-600">
          No Company Tax calculation on record for {selectedYear} yet — enter your monthly figures freely. Once you save a Company Tax calculation for {selectedYear} (with Tax Year set to {selectedYear}), we'll check that these add up to the turnover and expenses you declared there.
        </div>
      )}
      {reconciliation === 'incomplete' && target && (
        <div className="bg-blue-50 border border-blue-100 rounded-lg p-3 text-sm text-blue-700">
          Turnover: {monthsWithTurnoverSaved} of 12 months entered — running total {formatCurrency(savedTurnoverTotal)} of {formatCurrency(target.annualTurnover)} declared for {selectedYear}.
        </div>
      )}
      {reconciliation === 'matched' && target && (
        <div className="bg-green-50 border border-green-200 rounded-lg p-3 text-sm text-green-700 flex items-center gap-1.5">
          <svg className="w-4 h-4 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
          </svg>
          Turnover reconciled — your {selectedYear} monthly entries total {formatCurrency(savedTurnoverTotal)}, matching your declared annual turnover.
        </div>
      )}
      {reconciliation === 'mismatch' && target && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-sm text-red-700">
          Turnover doesn't reconcile — your {selectedYear} monthly entries total {formatCurrency(savedTurnoverTotal)}, but you declared {formatCurrency(target.annualTurnover)} annual turnover for {selectedYear} in the Wizard/Calculator. Adjust the figures below so they match.
        </div>
      )}

      {expenseReconciliation === 'incomplete' && target && (
        <div className="bg-blue-50 border border-blue-100 rounded-lg p-3 text-sm text-blue-700">
          Expenses: {monthsWithExpenseSaved} of 12 months entered — running total {formatCurrency(savedExpenseTotal)} of {formatCurrency(target.totalExpenses)} implied for {selectedYear} (turnover minus assessable profit).
        </div>
      )}
      {expenseReconciliation === 'matched' && target && (
        <div className="bg-green-50 border border-green-200 rounded-lg p-3 text-sm text-green-700 flex items-center gap-1.5">
          <svg className="w-4 h-4 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
          </svg>
          Expenses reconciled — your {selectedYear} monthly entries total {formatCurrency(savedExpenseTotal)}, matching the expenses implied by your Company Tax calculation.
        </div>
      )}
      {expenseReconciliation === 'mismatch' && target && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-sm text-red-700">
          Expenses don't reconcile — your {selectedYear} monthly entries total {formatCurrency(savedExpenseTotal)}, but your {selectedYear} Company Tax calculation implies {formatCurrency(target.totalExpenses)} in annual expenses (turnover minus assessable profit). Adjust the figures below so they match.
        </div>
      )}

      {/* Month rows */}
      <div className="bg-white rounded-lg border border-gray-200 divide-y divide-gray-100 overflow-x-auto">
        <div className="grid grid-cols-[1fr_1fr_1fr_1fr_auto] gap-3 px-4 py-2 text-xs font-medium text-gray-400 uppercase tracking-wide min-w-[600px]">
          <span>Month</span>
          <span>Turnover (₦)</span>
          <span>Expenses (₦)</span>
          <span>Net Profit</span>
          <span></span>
        </div>
        {MONTHS.map((label, month) => {
          const draft = drafts[month];
          const netProfit = parseAmount(draft.turnover) - parseAmount(draft.expenses);
          const isSaved = existingTurnoverByMonth.has(turnoverRef(selectedYear, month)) || existingExpenseByMonth.has(expenseRef(selectedYear, month));
          return (
            <div key={month} className="px-4 py-2.5">
              <div className="grid grid-cols-[1fr_1fr_1fr_1fr_auto] gap-3 items-center min-w-[600px]">
                <span className="text-sm text-gray-700">{label}</span>
                <input
                  type="text"
                  inputMode="numeric"
                  value={draft.turnover}
                  onChange={(e) => updateDraft(month, 'turnover', formatInput(e.target.value))}
                  placeholder="0"
                  className="w-full px-2.5 py-1.5 border border-gray-200 rounded-md text-sm focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                />
                <input
                  type="text"
                  inputMode="numeric"
                  value={draft.expenses}
                  onChange={(e) => updateDraft(month, 'expenses', formatInput(e.target.value))}
                  placeholder="0"
                  className="w-full px-2.5 py-1.5 border border-gray-200 rounded-md text-sm focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                />
                <span className={`text-sm font-medium ${netProfit >= 0 ? 'text-emerald-700' : 'text-red-600'}`}>
                  {formatCurrency(netProfit)}
                </span>
                <button
                  onClick={() => handleSaveMonth(month)}
                  disabled={savingMonth === month}
                  className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors whitespace-nowrap ${
                    isSaved ? 'bg-gray-100 text-gray-600 hover:bg-gray-200' : 'bg-primary-600 text-white hover:bg-primary-700'
                  } disabled:opacity-50`}
                >
                  {savingMonth === month ? 'Saving…' : isSaved ? 'Update' : 'Save'}
                </button>
              </div>
              {rowErrors[month] && (
                <p className="text-xs text-red-600 mt-1.5">{rowErrors[month]}</p>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default MonthlyFinancials;

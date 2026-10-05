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

type ReconciliationStatus = 'no-target' | 'matched' | 'incomplete' | 'mismatch';

function ReconciliationChip({
  label,
  status,
  current,
  target,
  monthsEntered,
}: {
  label: string;
  status: ReconciliationStatus;
  current: number;
  target: number | null;
  monthsEntered: number;
}) {
  const config = {
    'no-target': { dot: 'bg-gray-300', bar: 'bg-gray-300', text: 'text-gray-500' },
    incomplete: { dot: 'bg-blue-500', bar: 'bg-blue-500', text: 'text-blue-700' },
    matched: { dot: 'bg-emerald-500', bar: 'bg-emerald-500', text: 'text-emerald-700' },
    mismatch: { dot: 'bg-red-500', bar: 'bg-red-500', text: 'text-red-700' },
  }[status];
  const pct = target ? Math.min(100, (current / target) * 100) : status === 'matched' ? 100 : 0;

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-3.5">
      <div className="flex items-center justify-between mb-1.5">
        <div className="flex items-center gap-1.5">
          <span className={`w-2 h-2 rounded-full ${config.dot}`} />
          <span className="text-xs font-semibold text-gray-700 uppercase tracking-wide">{label}</span>
        </div>
        <span className="text-xs text-gray-400">{monthsEntered}/12 months</span>
      </div>
      <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden mb-1.5">
        <div className={`h-full rounded-full ${config.bar}`} style={{ width: `${pct}%` }} />
      </div>
      <p className={`text-xs ${config.text}`}>
        {status === 'no-target' && 'No Wizard figure to reconcile against yet'}
        {status === 'incomplete' && target !== null && `${formatCurrency(current)} of ${formatCurrency(target)} declared`}
        {status === 'matched' && target !== null && `${formatCurrency(current)} — matches the Wizard`}
        {status === 'mismatch' && target !== null && `${formatCurrency(current)} vs ${formatCurrency(target)} declared — adjust below`}
      </p>
    </div>
  );
}

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

  const reconciliation: ReconciliationStatus = useMemo(() => {
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

  const expenseReconciliation: ReconciliationStatus = useMemo(() => {
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
      // A reduction (or no change) is always allowed, even while the year is
      // already over target — it can only bring the total closer to
      // reconciling, never push it further away. Blocking reductions too
      // would deadlock the user: once any other month alone exceeds the
      // target (e.g. one large month entered before this check existed),
      // the hypothetical total stays over target no matter what this row is
      // set to, so a naive "hypothetical > target" guard would block the
      // very fix it's supposed to force. Only an *increase* needs gating.
      const previousTurnover = existingTurnoverByMonth.get(turnoverRef(selectedYear, month))?.amount ?? 0;
      if (newTurnover > previousTurnover) {
        const otherMonthsTurnoverTotal = savedTurnoverTotal - previousTurnover;
        const hypotheticalTurnoverTotal = otherMonthsTurnoverTotal + newTurnover;
        if (hypotheticalTurnoverTotal > target.annualTurnover + TOLERANCE) {
          setRowErrors((prev) => ({
            ...prev,
            [month]: `This would bring your ${selectedYear} turnover total to ${formatCurrency(hypotheticalTurnoverTotal)}, over your declared annual turnover of ${formatCurrency(target.annualTurnover)}. Reduce this month or another month first.`,
          }));
          return;
        }
      }

      const previousExpenses = existingExpenseByMonth.get(expenseRef(selectedYear, month))?.amount ?? 0;
      if (newExpenses > previousExpenses) {
        const otherMonthsExpenseTotal = savedExpenseTotal - previousExpenses;
        const hypotheticalExpenseTotal = otherMonthsExpenseTotal + newExpenses;
        if (hypotheticalExpenseTotal > target.totalExpenses + TOLERANCE) {
          setRowErrors((prev) => ({
            ...prev,
            [month]: `This would bring your ${selectedYear} expenses total to ${formatCurrency(hypotheticalExpenseTotal)}, over your declared annual expenses of ${formatCurrency(target.totalExpenses)} (turnover minus assessable profit). Reduce this month or another month first.`,
          }));
          return;
        }
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

      {/* Reconciliation — compact chips, not stacked paragraphs. */}
      {target ? (
        <div className="grid sm:grid-cols-2 gap-3">
          <ReconciliationChip
            label="Turnover"
            status={reconciliation}
            current={savedTurnoverTotal}
            target={target.annualTurnover}
            monthsEntered={monthsWithTurnoverSaved}
          />
          <ReconciliationChip
            label="Expenses"
            status={expenseReconciliation}
            current={savedExpenseTotal}
            target={target.totalExpenses}
            monthsEntered={monthsWithExpenseSaved}
          />
        </div>
      ) : (
        <div className="bg-gray-50 border border-gray-200 rounded-lg px-3.5 py-2.5 text-xs text-gray-500">
          No Company Tax calculation on record for {selectedYear} — enter figures freely. Once you save one for {selectedYear}, we'll check these totals against it.
        </div>
      )}

      {/* Month rows */}
      <div className="bg-white rounded-lg border border-gray-200 overflow-x-auto">
        <table className="w-full min-w-[640px] text-sm border-collapse">
          <thead>
            <tr className="text-xs font-medium text-gray-400 uppercase tracking-wide border-b border-gray-100">
              <th className="text-left px-4 py-2.5 font-medium">Month</th>
              <th className="text-right px-3 py-2.5 font-medium">Turnover (₦)</th>
              <th className="text-right px-3 py-2.5 font-medium">Expenses (₦)</th>
              <th className="text-right px-3 py-2.5 font-medium">Net Profit</th>
              <th className="px-3 py-2.5 w-20"></th>
            </tr>
          </thead>
          <tbody>
            {MONTHS.map((label, month) => {
              const draft = drafts[month];
              const netProfit = parseAmount(draft.turnover) - parseAmount(draft.expenses);
              const isSaved = existingTurnoverByMonth.has(turnoverRef(selectedYear, month)) || existingExpenseByMonth.has(expenseRef(selectedYear, month));
              return (
                <React.Fragment key={month}>
                  <tr className={`border-b border-gray-50 ${month % 2 === 1 ? 'bg-gray-50/40' : ''}`}>
                    <td className="px-4 py-2 text-sm text-gray-700 whitespace-nowrap">{label}</td>
                    <td className="px-3 py-1.5">
                      <input
                        type="text"
                        inputMode="numeric"
                        value={draft.turnover}
                        onChange={(e) => updateDraft(month, 'turnover', formatInput(e.target.value))}
                        placeholder="0"
                        className="w-full text-right tabular-nums px-2.5 py-1.5 border border-gray-200 rounded-md text-sm focus:ring-2 focus:ring-primary-500 focus:border-transparent placeholder:text-gray-300"
                      />
                    </td>
                    <td className="px-3 py-1.5">
                      <input
                        type="text"
                        inputMode="numeric"
                        value={draft.expenses}
                        onChange={(e) => updateDraft(month, 'expenses', formatInput(e.target.value))}
                        placeholder="0"
                        className="w-full text-right tabular-nums px-2.5 py-1.5 border border-gray-200 rounded-md text-sm focus:ring-2 focus:ring-primary-500 focus:border-transparent placeholder:text-gray-300"
                      />
                    </td>
                    <td className={`px-3 py-1.5 text-right tabular-nums text-sm font-medium ${isSaved ? (netProfit >= 0 ? 'text-emerald-700' : 'text-red-600') : 'text-gray-300'}`}>
                      {formatCurrency(netProfit)}
                    </td>
                    <td className="px-3 py-1.5 text-right">
                      <button
                        onClick={() => handleSaveMonth(month)}
                        disabled={savingMonth === month}
                        className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors whitespace-nowrap ${
                          isSaved ? 'bg-gray-100 text-gray-600 hover:bg-gray-200' : 'bg-primary-600 text-white hover:bg-primary-700'
                        } disabled:opacity-50`}
                      >
                        {savingMonth === month ? 'Saving…' : isSaved ? 'Update' : 'Save'}
                      </button>
                    </td>
                  </tr>
                  {rowErrors[month] && (
                    <tr>
                      <td colSpan={5} className="px-4 pb-2 -mt-1 text-xs text-red-600">{rowErrors[month]}</td>
                    </tr>
                  )}
                </React.Fragment>
              );
            })}
          </tbody>
          <tfoot>
            <tr className="border-t border-gray-200 bg-gray-50/60">
              <td className="px-4 py-2.5 text-sm font-semibold text-gray-700">Total</td>
              <td className="px-3 py-2.5 text-right tabular-nums text-sm font-semibold text-gray-900">{formatCurrency(savedTurnoverTotal)}</td>
              <td className="px-3 py-2.5 text-right tabular-nums text-sm font-semibold text-gray-900">{formatCurrency(savedExpenseTotal)}</td>
              <td className={`px-3 py-2.5 text-right tabular-nums text-sm font-semibold ${savedTurnoverTotal - savedExpenseTotal >= 0 ? 'text-emerald-700' : 'text-red-600'}`}>
                {formatCurrency(savedTurnoverTotal - savedExpenseTotal)}
              </td>
              <td></td>
            </tr>
          </tfoot>
        </table>
      </div>
    </div>
  );
};

export default MonthlyFinancials;

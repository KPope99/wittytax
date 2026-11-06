import React, { useMemo, useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { formatCurrency, deriveBusinessFinancials } from '../utils/taxCalculations';
import { getAllCanonicalCompanyCalcsByYear } from '../utils/canonicalCompanyCalc';
import { WizardState } from './TaxWizard';

const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

const TOLERANCE = 1; // naira — guards against float rounding, not a real allowance

function pad2(n: number): string {
  return String(n).padStart(2, '0');
}

function monthKey(month: number): string {
  return pad2(month + 1);
}

function dailyTurnoverRef(year: number, month: number, day: number): string {
  return `daily-turnover:${year}-${monthKey(month)}-${pad2(day)}`;
}

function dailyExpenseRef(year: number, month: number, day: number): string {
  return `daily-expense:${year}-${monthKey(month)}-${pad2(day)}`;
}

function daysInMonth(year: number, month: number): number {
  return new Date(year, month + 1, 0).getDate();
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

// A single day's saved entry — `legacy: true` means it actually came from the
// old one-entry-per-month system (reference has no day component) and is
// being shown/edited as if it lived on day 1, per the day-1 migration
// convention this component uses throughout.
type DayEntry = { id: string; amount: number; legacy: boolean };

const DAILY_RE = /^daily-(turnover|expense):(\d{4})-(\d{2})-(\d{2})$/;
const LEGACY_RE = /^monthly-(turnover|expense):(\d{4})-(\d{2})$/;

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

interface Props {
  // Opens the Tax Wizard pre-set to Company, so a user blocked by the
  // reconciliation guard below can jump straight to updating their
  // declared annual turnover/expenses instead of hunting for the right
  // place to redo their Company Tax calculation.
  onOpenWizard?: (taxType: 'personal' | 'company', prefill?: { state: WizardState; step: number }) => void;
}

const MonthlyFinancials: React.FC<Props> = ({ onOpenWizard }) => {
  const { taxHistory, revenues, expenses, addRevenue, removeRevenue, addExpense, removeExpense } = useAuth();

  const today = new Date();
  const currentYear = today.getFullYear();

  // Canonical annual turnover/expenses per year, taken from the most recent
  // saved Company Tax calculation for that year.
  const companyCalcsByYear = useMemo(() => getAllCanonicalCompanyCalcsByYear(taxHistory), [taxHistory]);

  const availableYears = useMemo(() => {
    const years = new Set<number>([currentYear, ...Array.from(companyCalcsByYear.keys())]);
    return Array.from(years).sort((a, b) => b - a);
  }, [companyCalcsByYear, currentYear]);

  const [selectedYear, setSelectedYear] = useState<number>(availableYears[0] ?? currentYear);
  const [selectedMonth, setSelectedMonth] = useState<number>(today.getFullYear() === (availableYears[0] ?? currentYear) ? today.getMonth() : 0);

  const canonicalCalc = companyCalcsByYear.get(selectedYear) ?? null;
  const target = useMemo(
    () =>
      canonicalCalc
        ? { annualTurnover: canonicalCalc.result.annualTurnover, totalExpenses: deriveBusinessFinancials(canonicalCalc.result).totalExpenses }
        : null,
    [canonicalCalc]
  );

  // year -> month -> day -> entry, built once per year/revenues|expenses
  // change and sliced per-month below. Day 1 absorbs any legacy
  // monthly-* entry for that month (see LEGACY_RE), per this component's
  // day-1 migration convention.
  const yearTurnoverByMonthDay = useMemo(() => {
    const map = new Map<number, Map<number, DayEntry>>();
    for (const r of revenues) {
      if (!r.reference) continue;
      const daily = r.reference.match(DAILY_RE);
      if (daily && daily[1] === 'turnover' && parseInt(daily[2], 10) === selectedYear) {
        const month = parseInt(daily[3], 10) - 1;
        const day = parseInt(daily[4], 10);
        if (!map.has(month)) map.set(month, new Map());
        map.get(month)!.set(day, { id: r.id, amount: r.amount, legacy: false });
        continue;
      }
      const legacy = r.reference.match(LEGACY_RE);
      if (legacy && legacy[1] === 'turnover' && parseInt(legacy[2], 10) === selectedYear) {
        const month = parseInt(legacy[3], 10) - 1;
        if (!map.has(month)) map.set(month, new Map());
        // A real daily entry on day 1 (if any) always wins over the legacy
        // lump sum it supersedes.
        if (!map.get(month)!.has(1)) {
          map.get(month)!.set(1, { id: r.id, amount: r.amount, legacy: true });
        }
      }
    }
    return map;
  }, [revenues, selectedYear]);

  const yearExpenseByMonthDay = useMemo(() => {
    const map = new Map<number, Map<number, DayEntry>>();
    for (const e of expenses) {
      if (!e.reference) continue;
      const daily = e.reference.match(DAILY_RE);
      if (daily && daily[1] === 'expense' && parseInt(daily[2], 10) === selectedYear) {
        const month = parseInt(daily[3], 10) - 1;
        const day = parseInt(daily[4], 10);
        if (!map.has(month)) map.set(month, new Map());
        map.get(month)!.set(day, { id: e.id, amount: e.amount, legacy: false });
        continue;
      }
      const legacy = e.reference.match(LEGACY_RE);
      if (legacy && legacy[1] === 'expense' && parseInt(legacy[2], 10) === selectedYear) {
        const month = parseInt(legacy[3], 10) - 1;
        if (!map.has(month)) map.set(month, new Map());
        if (!map.get(month)!.has(1)) {
          map.get(month)!.set(1, { id: e.id, amount: e.amount, legacy: true });
        }
      }
    }
    return map;
  }, [expenses, selectedYear]);

  const sumYear = (byMonthDay: Map<number, Map<number, DayEntry>>) => {
    let sum = 0;
    byMonthDay.forEach((byDay) => byDay.forEach((entry) => { sum += entry.amount; }));
    return sum;
  };

  const savedTurnoverTotal = useMemo(() => sumYear(yearTurnoverByMonthDay), [yearTurnoverByMonthDay]);
  const savedExpenseTotal = useMemo(() => sumYear(yearExpenseByMonthDay), [yearExpenseByMonthDay]);
  const monthsWithTurnoverSaved = yearTurnoverByMonthDay.size;
  const monthsWithExpenseSaved = yearExpenseByMonthDay.size;

  const reconciliation: ReconciliationStatus = useMemo(() => {
    if (!target) return 'no-target';
    if (savedTurnoverTotal > target.annualTurnover + TOLERANCE) return 'mismatch';
    if (monthsWithTurnoverSaved < 12) return 'incomplete';
    return Math.abs(savedTurnoverTotal - target.annualTurnover) <= TOLERANCE ? 'matched' : 'mismatch';
  }, [target, monthsWithTurnoverSaved, savedTurnoverTotal]);

  const expenseReconciliation: ReconciliationStatus = useMemo(() => {
    if (!target) return 'no-target';
    if (savedExpenseTotal > target.totalExpenses + TOLERANCE) return 'mismatch';
    if (monthsWithExpenseSaved < 12) return 'incomplete';
    return Math.abs(savedExpenseTotal - target.totalExpenses) <= TOLERANCE ? 'matched' : 'mismatch';
  }, [target, monthsWithExpenseSaved, savedExpenseTotal]);

  // This month's day maps, sliced from the year-wide ones above.
  const monthTurnoverByDay = yearTurnoverByMonthDay.get(selectedMonth) ?? new Map<number, DayEntry>();
  const monthExpenseByDay = yearExpenseByMonthDay.get(selectedMonth) ?? new Map<number, DayEntry>();

  const monthTurnoverTotal = useMemo(() => {
    let sum = 0;
    monthTurnoverByDay.forEach((e) => { sum += e.amount; });
    return sum;
  }, [monthTurnoverByDay]);
  const monthExpenseTotal = useMemo(() => {
    let sum = 0;
    monthExpenseByDay.forEach((e) => { sum += e.amount; });
    return sum;
  }, [monthExpenseByDay]);

  const daysRecorded = useMemo(() => {
    const days = new Set<number>();
    Array.from(monthTurnoverByDay.keys()).forEach((d) => days.add(d));
    Array.from(monthExpenseByDay.keys()).forEach((d) => days.add(d));
    return days.size;
  }, [monthTurnoverByDay, monthExpenseByDay]);

  const goToMonth = (delta: number) => {
    let m = selectedMonth + delta;
    let y = selectedYear;
    if (m < 0) { m = 11; y -= 1; }
    if (m > 11) { m = 0; y += 1; }
    setSelectedYear(y);
    setSelectedMonth(m);
  };

  // Day-entry modal
  const [modalDay, setModalDay] = useState<number | null>(null);
  const [draft, setDraft] = useState<Draft>({ turnover: '', expenses: '' });
  const [modalError, setModalError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const openDay = (day: number) => {
    const t = monthTurnoverByDay.get(day);
    const e = monthExpenseByDay.get(day);
    setDraft({
      turnover: t ? t.amount.toLocaleString('en-NG') : '',
      expenses: e ? e.amount.toLocaleString('en-NG') : '',
    });
    setModalError(null);
    setModalDay(day);
  };

  const closeModal = () => {
    setModalDay(null);
    setModalError(null);
  };

  const handleSaveDay = async () => {
    if (modalDay === null) return;
    const day = modalDay;
    const newTurnover = parseAmount(draft.turnover);
    const newExpenses = parseAmount(draft.expenses);

    if (target) {
      // Same reasoning as the old month-level guard: a reduction can only
      // help reconciliation, so only an *increase* needs checking against
      // the year-wide hypothetical total.
      const previousTurnover = monthTurnoverByDay.get(day)?.amount ?? 0;
      if (newTurnover > previousTurnover) {
        const hypothetical = savedTurnoverTotal - previousTurnover + newTurnover;
        const over = hypothetical - target.annualTurnover;
        if (over > TOLERANCE) {
          setModalError(`This would put your ${selectedYear} turnover ${formatCurrency(over)} over the ${formatCurrency(target.annualTurnover)} you declared on your last Company Tax calculation.`);
          return;
        }
      }
      const previousExpenses = monthExpenseByDay.get(day)?.amount ?? 0;
      if (newExpenses > previousExpenses) {
        const hypothetical = savedExpenseTotal - previousExpenses + newExpenses;
        const over = hypothetical - target.totalExpenses;
        if (over > TOLERANCE) {
          setModalError(`This would put your ${selectedYear} expenses ${formatCurrency(over)} over the ${formatCurrency(target.totalExpenses)} declared (turnover minus assessable profit) on your last Company Tax calculation.`);
          return;
        }
      }
    }

    setSaving(true);
    try {
      const existingT = monthTurnoverByDay.get(day);
      if (existingT) {
        // Clears both a prior daily entry and (on day 1) the legacy monthly
        // lump sum it may represent — either way, it's about to be replaced.
        await removeRevenue(existingT.id);
      }
      if (newTurnover > 0) {
        await addRevenue({
          description: `${MONTHS[selectedMonth]} ${day}, ${selectedYear} turnover`,
          amount: newTurnover,
          category: 'Daily Turnover',
          date: new Date(selectedYear, selectedMonth, day),
          reference: dailyTurnoverRef(selectedYear, selectedMonth, day),
        });
      }

      const existingE = monthExpenseByDay.get(day);
      if (existingE) {
        await removeExpense(existingE.id);
      }
      if (newExpenses > 0) {
        await addExpense({
          description: `${MONTHS[selectedMonth]} ${day}, ${selectedYear} expenses`,
          amount: newExpenses,
          category: 'Daily Expenses',
          date: new Date(selectedYear, selectedMonth, day),
          reference: dailyExpenseRef(selectedYear, selectedMonth, day),
        });
      }
      closeModal();
    } finally {
      setSaving(false);
    }
  };

  // Opens the Wizard pre-filled with the figures from the calculation the
  // reconciliation guard is checking against, landing on the turnover step
  // — so the user edits their existing declared numbers instead of starting
  // from a blank form. wizardExpenses carries a single synthetic line item
  // equal to turnover minus assessable profit, so the Wizard's own
  // turnover-minus-expenses math reproduces the correct assessable profit
  // the moment it mounts.
  const handleUpdateTurnoverClick = () => {
    if (!onOpenWizard) return;
    if (!canonicalCalc) {
      onOpenWizard('company');
      return;
    }
    const { result } = canonicalCalc;
    const turnover = Math.round(result.annualTurnover);
    const profit = Math.round(result.assessableProfit);
    const impliedExpenses = Math.max(0, turnover - profit);
    const prefillState: WizardState = {
      taxType: 'company',
      taxYear: String(canonicalCalc.taxYear),
      annualIncome: '',
      applyPension: true,
      applyNHF: true,
      annualRent: '',
      annualTurnover: String(turnover),
      wizardExpenses: impliedExpenses > 0
        ? [{ id: 'prefill-expenses', description: 'Business expenses (from your last calculation)', amount: impliedExpenses }]
        : [],
      assessableProfit: String(profit),
      fixedAssets: String(Math.round(result.fixedAssets)),
      isProfessionalService: result.isProfessionalService,
    };
    onOpenWizard('company', { state: prefillState, step: 1 });
  };

  // Re-close the modal if the user changes month/year while it's open.
  useEffect(() => { closeModal(); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, [selectedYear, selectedMonth]);

  const totalDays = daysInMonth(selectedYear, selectedMonth);
  const firstWeekday = new Date(selectedYear, selectedMonth, 1).getDay();
  const cells: (number | null)[] = [
    ...Array.from({ length: firstWeekday }, () => null),
    ...Array.from({ length: totalDays }, (_, i) => i + 1),
  ];

  const isToday = (day: number) =>
    selectedYear === today.getFullYear() && selectedMonth === today.getMonth() && day === today.getDate();

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h3 className="text-base font-semibold text-gray-800">Daily Revenue & Expenses</h3>
          <p className="text-xs text-gray-500 mt-0.5">
            Record turnover and expenses day by day on the calendar below — each month's total rolls up automatically, and this feeds the Business Performance trend chart.
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

      {/* Reconciliation — year-wide, across every day entered all year.
          Only surfaced when a total actually exceeds the declared Wizard
          figure; silent while entries are still incomplete or already
          match, so it reads as a warning rather than routine status. */}
      {target && (reconciliation === 'mismatch' || expenseReconciliation === 'mismatch') && (
        <div className="space-y-3">
          {reconciliation === 'mismatch' && (
            <ReconciliationChip label="Turnover" status={reconciliation} current={savedTurnoverTotal} target={target.annualTurnover} monthsEntered={monthsWithTurnoverSaved} />
          )}
          {expenseReconciliation === 'mismatch' && (
            <ReconciliationChip label="Expenses" status={expenseReconciliation} current={savedExpenseTotal} target={target.totalExpenses} monthsEntered={monthsWithExpenseSaved} />
          )}
        </div>
      )}
      {!target && (
        <div className="bg-gray-50 border border-gray-200 rounded-lg px-3.5 py-2.5 text-xs text-gray-500">
          No Company Tax calculation on record for {selectedYear} — enter figures freely. Once you save one for {selectedYear}, we'll check these totals against it.
        </div>
      )}

      {/* Calendar */}
      <div className="bg-white rounded-lg border border-gray-200 p-4">
        <div className="flex items-center justify-between mb-3">
          <button onClick={() => goToMonth(-1)} aria-label="Previous month" className="w-8 h-8 flex items-center justify-center rounded-md text-gray-500 hover:bg-gray-100 hover:text-gray-700">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
          </button>
          <span className="text-sm font-semibold text-gray-800">{MONTHS[selectedMonth]} {selectedYear}</span>
          <button onClick={() => goToMonth(1)} aria-label="Next month" className="w-8 h-8 flex items-center justify-center rounded-md text-gray-500 hover:bg-gray-100 hover:text-gray-700">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
          </button>
        </div>

        <div className="grid grid-cols-7 gap-1 mb-1">
          {WEEKDAYS.map((d) => (
            <div key={d} className="text-center text-[11px] font-medium text-gray-400 uppercase tracking-wide py-1">{d}</div>
          ))}
        </div>
        <div className="grid grid-cols-7 gap-1">
          {cells.map((day, i) => {
            if (day === null) return <div key={`blank-${i}`} />;
            const t = monthTurnoverByDay.get(day);
            const e = monthExpenseByDay.get(day);
            const hasData = !!t || !!e;
            return (
              <button
                key={day}
                onClick={() => openDay(day)}
                className={`relative h-14 rounded-md border text-left p-1 flex flex-col transition-colors ${
                  hasData ? 'border-emerald-200 bg-emerald-50 hover:bg-emerald-100' : 'border-gray-100 hover:bg-gray-50'
                } ${isToday(day) ? 'ring-2 ring-primary-400' : ''}`}
              >
                <span className={`text-xs font-medium ${hasData ? 'text-emerald-800' : 'text-gray-600'}`}>{day}</span>
                {hasData && (
                  <span className="mt-auto text-[9px] leading-tight text-emerald-700 tabular-nums truncate">
                    {formatCurrency((t?.amount ?? 0) - (e?.amount ?? 0))}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* This month's rolled-up total */}
        <div className="mt-3 pt-3 border-t border-gray-100 flex items-center justify-between flex-wrap gap-2 text-sm">
          <span className="text-xs text-gray-500">{daysRecorded === 0 ? 'No days recorded yet' : `${daysRecorded} day(s) recorded`}</span>
          <div className="flex items-center gap-4">
            <span className="text-gray-500">Turnover <span className="font-semibold text-gray-800 tabular-nums">{formatCurrency(monthTurnoverTotal)}</span></span>
            <span className="text-gray-500">Expenses <span className="font-semibold text-gray-800 tabular-nums">{formatCurrency(monthExpenseTotal)}</span></span>
            <span className="text-gray-500">Net <span className={`font-semibold tabular-nums ${monthTurnoverTotal - monthExpenseTotal >= 0 ? 'text-emerald-700' : 'text-red-600'}`}>{formatCurrency(monthTurnoverTotal - monthExpenseTotal)}</span></span>
          </div>
        </div>
      </div>

      {/* Day-entry modal */}
      {modalDay !== null && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4" onClick={closeModal}>
          <div className="bg-white rounded-xl shadow-xl w-full max-w-sm p-5" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h4 className="text-sm font-semibold text-gray-800">{MONTHS[selectedMonth]} {modalDay}, {selectedYear}</h4>
              <button onClick={closeModal} aria-label="Close" className="text-gray-400 hover:text-gray-600">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </div>

            {monthTurnoverByDay.get(modalDay)?.legacy || monthExpenseByDay.get(modalDay)?.legacy ? (
              <p className="text-xs text-blue-700 bg-blue-50 border border-blue-100 rounded-md px-2.5 py-2 mb-3">
                Pre-filled from this month's old single total — saving here splits it into a daily entry.
              </p>
            ) : null}

            <label className="block text-xs font-medium text-gray-500 mb-1">Turnover (₦)</label>
            <input
              type="text"
              inputMode="numeric"
              value={draft.turnover}
              onChange={(e) => setDraft((d) => ({ ...d, turnover: formatInput(e.target.value) }))}
              placeholder="0"
              className="w-full text-right tabular-nums px-3 py-2 border border-gray-200 rounded-md text-sm focus:ring-2 focus:ring-primary-500 focus:border-transparent placeholder:text-gray-300 mb-3"
            />

            <label className="block text-xs font-medium text-gray-500 mb-1">Expenses (₦)</label>
            <input
              type="text"
              inputMode="numeric"
              value={draft.expenses}
              onChange={(e) => setDraft((d) => ({ ...d, expenses: formatInput(e.target.value) }))}
              placeholder="0"
              className="w-full text-right tabular-nums px-3 py-2 border border-gray-200 rounded-md text-sm focus:ring-2 focus:ring-primary-500 focus:border-transparent placeholder:text-gray-300"
            />

            <div className="flex items-center justify-between mt-3 text-xs text-gray-500">
              <span>Net for this day</span>
              <span className={`font-semibold tabular-nums ${parseAmount(draft.turnover) - parseAmount(draft.expenses) >= 0 ? 'text-emerald-700' : 'text-red-600'}`}>
                {formatCurrency(parseAmount(draft.turnover) - parseAmount(draft.expenses))}
              </span>
            </div>

            {modalError && (
              <div className="mt-3 p-3 bg-red-50 border border-red-200 rounded-md">
                <p className="text-xs text-red-700">{modalError}</p>
                <p className="text-xs text-red-600 mt-1.5">
                  Either reduce this day (or another day this year), or update your declared figures if your real numbers have grown since you last filed.
                </p>
                {onOpenWizard && (
                  <button
                    type="button"
                    onClick={handleUpdateTurnoverClick}
                    className="mt-2 inline-flex items-center gap-1 text-xs font-semibold text-red-700 hover:text-red-800 underline underline-offset-2"
                  >
                    Update annual turnover
                    <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
                    </svg>
                  </button>
                )}
              </div>
            )}

            <div className="flex gap-2 mt-4">
              <button onClick={closeModal} className="flex-1 px-3 py-2 rounded-md text-xs font-medium text-gray-600 bg-gray-100 hover:bg-gray-200">
                Cancel
              </button>
              <button
                onClick={handleSaveDay}
                disabled={saving}
                className="flex-1 px-3 py-2 rounded-md text-xs font-medium text-white bg-primary-600 hover:bg-primary-700 disabled:opacity-50"
              >
                {saving ? 'Saving…' : 'Save'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default MonthlyFinancials;

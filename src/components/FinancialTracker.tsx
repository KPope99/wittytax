import React, { useMemo } from 'react';
import { useAuth } from '../context/AuthContext';
import { formatCurrency, deriveBusinessFinancials } from '../utils/taxCalculations';
import { buildMonthlyLedger } from '../utils/monthlyLedger';
import { getCanonicalCompanyCalc } from '../utils/canonicalCompanyCalc';
import { VATTab, WHTTab } from './VATWHTCalculator';
import MonthlyFinancials from './MonthlyFinancials';
import { WizardState } from './TaxWizard';

const TOLERANCE = 1; // naira — guards against float rounding, not a real allowance

// Cash Flow & Profit Recommendations lives on the Overview tab now (see
// Dashboard.tsx) — not duplicated here as a separate sub-tab.
export type FinancialType = 'monthly' | 'vat' | 'wht';

function SummaryCard({
  label,
  value,
  amountColor,
  labelColor,
  bg,
  border,
  badge,
  caption,
}: {
  label: string;
  value: number;
  amountColor: string;
  labelColor: string;
  bg: string;
  border: string;
  badge?: 'matched' | 'mismatch' | null;
  caption: string;
}) {
  return (
    <div className={`rounded-lg p-4 border ${bg} ${border}`}>
      <div className="flex items-center justify-between gap-2">
        <span className={`text-sm font-medium ${labelColor}`}>{label}</span>
        {badge && (
          <span
            className={`shrink-0 text-[11px] font-medium px-2 py-0.5 rounded-full ${
              badge === 'matched' ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'
            }`}
          >
            {badge === 'matched' ? 'Matches Wizard' : 'Mismatch'}
          </span>
        )}
      </div>
      <div className={`text-2xl font-bold mt-1 ${amountColor}`}>{formatCurrency(value)}</div>
      <div className="text-xs text-gray-400 mt-1">{caption}</div>
    </div>
  );
}

interface Props {
  onOpenWizard?: (taxType: 'personal' | 'company', prefill?: { state: WizardState; step: number }) => void;
  // Controlled from Dashboard.tsx so the Cash Flow section below Financials
  // (which only makes sense alongside Monthly P&L data) can hide itself
  // the same way this component's own summary cards do.
  activeType: FinancialType;
  onActiveTypeChange: (type: FinancialType) => void;
}

const FinancialTracker: React.FC<Props> = ({ onOpenWizard, activeType, onActiveTypeChange: setActiveType }) => {
  const { taxHistory, revenues, expenses } = useAuth();

  const mostRecentCompanyTax = useMemo(
    () => taxHistory.find((t) => t.type === 'company'),
    [taxHistory]
  );

  // Revenue/expenses can be entered in two places — the Wizard/Detailed
  // Calculator (a single annual snapshot) or Financials > Monthly P&L
  // (real month-by-month bookkeeping). This summary prefers the Monthly
  // P&L total across all entered months when any exist, same precedent as
  // the Overview trend chart and Cash Flow recommendations, so all three
  // views agree regardless of which path the user actually used.
  const monthlyLedger = useMemo(() => buildMonthlyLedger(revenues, expenses), [revenues, expenses]);
  const usingMonthlyLedger = monthlyLedger.length > 0;

  const monthlyTotals = useMemo(
    () => monthlyLedger.reduce(
      (acc, p) => ({ totalRevenue: acc.totalRevenue + p.totalRevenue, totalExpenses: acc.totalExpenses + p.totalExpenses }),
      { totalRevenue: 0, totalExpenses: 0 }
    ),
    [monthlyLedger]
  );

  const calcTotals = mostRecentCompanyTax
    ? deriveBusinessFinancials(mostRecentCompanyTax.result ?? {})
    : { totalRevenue: 0, totalExpenses: 0 };

  const { totalRevenue, totalExpenses } = usingMonthlyLedger ? monthlyTotals : calcTotals;
  const grossProfit = totalRevenue - totalExpenses;
  const hasAnyData = usingMonthlyLedger || !!mostRecentCompanyTax;

  // Canonical annual figures from the Wizard/Detailed Calculator — the
  // target Monthly P&L is supposed to reconcile against. Surfaced here (not
  // just inside the Monthly P&L sub-tab) so the mismatch is visible no
  // matter which Financials sub-tab is open, instead of looking like two
  // contradictory "Total Expenses" numbers with no explanation.
  const canonicalCalc = useMemo(() => getCanonicalCompanyCalc(taxHistory), [taxHistory]);
  const canonicalTotals = canonicalCalc
    ? { annualTurnover: canonicalCalc.result.annualTurnover, totalExpenses: deriveBusinessFinancials(canonicalCalc.result).totalExpenses }
    : null;
  const turnoverMismatch = usingMonthlyLedger && canonicalTotals !== null && Math.abs(totalRevenue - canonicalTotals.annualTurnover) > TOLERANCE;
  const expenseMismatch = usingMonthlyLedger && canonicalTotals !== null && Math.abs(totalExpenses - canonicalTotals.totalExpenses) > TOLERANCE;

  return (
    <div className="space-y-6">
      {/* Type Toggle — leads the page; the summary cards below are Monthly
          P&L figures (revenue/expenses), so they only make sense while that
          pill is active, not alongside VAT or WHT. */}
      <div className="flex gap-1 p-1 bg-gray-100 rounded-lg w-fit">
        <button
          onClick={() => setActiveType('monthly')}
          className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
            activeType === 'monthly' ? 'bg-white shadow text-emerald-700' : 'text-gray-600 hover:text-gray-900'
          }`}
        >
          Monthly P&L
        </button>
        <button
          onClick={() => setActiveType('vat')}
          className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
            activeType === 'vat' ? 'bg-white shadow text-blue-700' : 'text-gray-600 hover:text-gray-900'
          }`}
        >
          VAT
        </button>
        <button
          onClick={() => setActiveType('wht')}
          className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
            activeType === 'wht' ? 'bg-white shadow text-amber-700' : 'text-gray-600 hover:text-gray-900'
          }`}
        >
          WHT
        </button>
      </div>

      {activeType === 'monthly' && (
        <>
          {/* Summary Cards — from Monthly P&L when any months are entered,
              otherwise from your most recent Company Tax calculation. A badge
              flags disagreement with the Wizard-declared figure; the full
              explanation lives in the one-line banner below, not repeated in
              each card. */}
          <div className="grid md:grid-cols-3 gap-4">
            <SummaryCard
              label="Total Revenue"
              value={totalRevenue}
              amountColor="text-green-800"
              labelColor="text-green-600"
              bg="bg-green-50"
              border="border-green-100"
              badge={usingMonthlyLedger && canonicalTotals ? (turnoverMismatch ? 'mismatch' : 'matched') : null}
              caption={usingMonthlyLedger ? 'From your Monthly P&L records' : 'Turnover + Digital Asset Profit'}
            />
            <SummaryCard
              label="Total Expenses"
              value={totalExpenses}
              amountColor="text-red-800"
              labelColor="text-red-600"
              bg="bg-red-50"
              border="border-red-100"
              badge={usingMonthlyLedger && canonicalTotals ? (expenseMismatch ? 'mismatch' : 'matched') : null}
              caption={usingMonthlyLedger ? 'From your Monthly P&L records' : 'Turnover − Assessable Profit'}
            />
            <SummaryCard
              label={grossProfit >= 0 ? 'Gross Profit' : 'Gross Loss'}
              value={Math.abs(grossProfit)}
              amountColor={grossProfit >= 0 ? 'text-emerald-800' : 'text-orange-800'}
              labelColor={grossProfit >= 0 ? 'text-emerald-600' : 'text-orange-600'}
              bg={grossProfit >= 0 ? 'bg-emerald-50' : 'bg-orange-50'}
              border={grossProfit >= 0 ? 'border-emerald-100' : 'border-orange-100'}
              caption="Revenue minus expenses"
            />
          </div>

          {(turnoverMismatch || expenseMismatch) && (
            <div className="flex items-center gap-2 px-3 py-2 bg-red-50 border border-red-200 rounded-md text-xs text-red-700">
              <svg className="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
              </svg>
              <span>Monthly P&amp;L doesn't match your Wizard-declared figures.</span>
              <button onClick={() => setActiveType('monthly')} className="ml-auto underline font-medium hover:text-red-900 whitespace-nowrap">
                Fix this
              </button>
            </div>
          )}

          {!hasAnyData && (
            <div className="text-center py-6 bg-white rounded-lg border border-dashed border-gray-300">
              <p className="text-sm text-gray-600">No financial data on record yet.</p>
              <p className="text-xs text-gray-400 mt-1">Enter figures in Monthly P&L below, or run a Company Tax calculation in the Wizard or Detailed Calculator, to populate these figures.</p>
            </div>
          )}

          <MonthlyFinancials onOpenWizard={onOpenWizard} />
        </>
      )}

      {/* VAT / WHT calculators */}
      {activeType === 'vat' && <VATTab />}
      {activeType === 'wht' && <WHTTab />}
    </div>
  );
};

export default FinancialTracker;

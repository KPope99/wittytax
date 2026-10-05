import React, { useState, useMemo } from 'react';
import { useAuth } from '../context/AuthContext';
import { formatCurrency, deriveBusinessFinancials } from '../utils/taxCalculations';
import { buildMonthlyLedger } from '../utils/monthlyLedger';
import { getCanonicalCompanyCalc } from '../utils/canonicalCompanyCalc';
import { VATTab, WHTTab } from './VATWHTCalculator';
import MonthlyFinancials from './MonthlyFinancials';

const TOLERANCE = 1; // naira — guards against float rounding, not a real allowance

// Cash Flow & Profit Recommendations lives on the Overview tab now (see
// Dashboard.tsx) — not duplicated here as a separate sub-tab.
type FinancialType = 'monthly' | 'vat' | 'wht';

const FinancialTracker: React.FC = () => {
  const { taxHistory, revenues, expenses } = useAuth();
  const [activeType, setActiveType] = useState<FinancialType>('monthly');

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
      {/* Summary Cards — from Monthly P&L when any months are entered,
          otherwise from your most recent Company Tax calculation. Source is
          always labelled, and flagged in red when it disagrees with the
          Wizard-declared annual figure, so this never reads as two
          contradictory numbers with no explanation. */}
      <div className="grid md:grid-cols-3 gap-4">
        <div className="bg-green-50 rounded-lg p-4 border border-green-100">
          <div className="text-green-600 text-sm font-medium">Total Revenue</div>
          <div className="text-2xl font-bold text-green-800 mt-1">{formatCurrency(totalRevenue)}</div>
          {usingMonthlyLedger ? (
            <div className={`text-xs mt-1 ${turnoverMismatch ? 'text-red-600 font-medium' : 'text-green-600'}`}>
              Sum of your Monthly P&L entries
              {canonicalTotals && (
                turnoverMismatch
                  ? ` — doesn't match the ${formatCurrency(canonicalTotals.annualTurnover)} declared in the Wizard`
                  : ' — matches your Wizard-declared turnover'
              )}
            </div>
          ) : (
            <div className="text-xs text-green-600 mt-1">Turnover + Digital Asset Profit (from your Wizard/Calculator)</div>
          )}
        </div>
        <div className="bg-red-50 rounded-lg p-4 border border-red-100">
          <div className="text-red-600 text-sm font-medium">Total Expenses</div>
          <div className="text-2xl font-bold text-red-800 mt-1">{formatCurrency(totalExpenses)}</div>
          {usingMonthlyLedger ? (
            <div className={`text-xs mt-1 ${expenseMismatch ? 'text-red-700 font-medium' : 'text-red-600'}`}>
              Sum of your Monthly P&L entries
              {canonicalTotals && (
                expenseMismatch
                  ? ` — doesn't match the ${formatCurrency(canonicalTotals.totalExpenses)} implied by the Wizard`
                  : ' — matches your Wizard-declared expenses'
              )}
            </div>
          ) : (
            <div className="text-xs text-red-600 mt-1">Turnover − Assessable Profit (from your Wizard/Calculator)</div>
          )}
        </div>
        <div className={`rounded-lg p-4 border ${grossProfit >= 0 ? 'bg-emerald-50 border-emerald-100' : 'bg-orange-50 border-orange-100'}`}>
          <div className={`text-sm font-medium ${grossProfit >= 0 ? 'text-emerald-600' : 'text-orange-600'}`}>
            Gross {grossProfit >= 0 ? 'Profit' : 'Loss'}
          </div>
          <div className={`text-2xl font-bold mt-1 ${grossProfit >= 0 ? 'text-emerald-800' : 'text-orange-800'}`}>
            {formatCurrency(Math.abs(grossProfit))}
          </div>
          <div className={`text-xs mt-1 ${grossProfit >= 0 ? 'text-emerald-600' : 'text-orange-600'}`}>
            Revenue minus expenses
          </div>
        </div>
      </div>

      {(turnoverMismatch || expenseMismatch) && (
        <div className="flex items-start gap-2.5 p-3 bg-red-50 border border-red-200 rounded-lg">
          <svg className="w-4 h-4 text-red-600 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
          </svg>
          <div className="text-xs text-red-700">
            <span className="font-semibold">Your Monthly P&L records don't reconcile</span> with the annual {turnoverMismatch && expenseMismatch ? 'turnover and expenses' : turnoverMismatch ? 'turnover' : 'expenses'} declared in the Wizard.{' '}
            <button onClick={() => setActiveType('monthly')} className="underline font-medium hover:text-red-900">
              Fix this in Monthly P&amp;L
            </button>
          </div>
        </div>
      )}

      {!hasAnyData && (
        <div className="text-center py-6 bg-white rounded-lg border border-dashed border-gray-300">
          <p className="text-sm text-gray-600">No financial data on record yet.</p>
          <p className="text-xs text-gray-400 mt-1">Enter figures in Monthly P&L below, or run a Company Tax calculation in the Wizard or Detailed Calculator, to populate these figures.</p>
        </div>
      )}

      {/* Type Toggle */}
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

      {/* Monthly P&L */}
      {activeType === 'monthly' && <MonthlyFinancials />}

      {/* VAT / WHT calculators */}
      {activeType === 'vat' && <VATTab />}
      {activeType === 'wht' && <WHTTab />}
    </div>
  );
};

export default FinancialTracker;

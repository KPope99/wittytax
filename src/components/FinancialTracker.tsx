import React, { useState, useMemo } from 'react';
import { useAuth } from '../context/AuthContext';
import { formatCurrency, deriveBusinessFinancials } from '../utils/taxCalculations';
import { buildMonthlyLedger } from '../utils/monthlyLedger';
import { VATTab, WHTTab } from './VATWHTCalculator';
import MonthlyFinancials from './MonthlyFinancials';

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

  return (
    <div className="space-y-6">
      {/* Summary Cards — from Monthly P&L when any months are entered,
          otherwise from your most recent Company Tax calculation */}
      <div className="grid md:grid-cols-3 gap-4">
        <div className="bg-green-50 rounded-lg p-4 border border-green-100">
          <div className="text-green-600 text-sm font-medium">Total Revenue</div>
          <div className="text-2xl font-bold text-green-800 mt-1">{formatCurrency(totalRevenue)}</div>
          <div className="text-xs text-green-600 mt-1">
            {usingMonthlyLedger ? 'Sum of your Monthly P&L entries' : 'Turnover + Digital Asset Profit'}
          </div>
        </div>
        <div className="bg-red-50 rounded-lg p-4 border border-red-100">
          <div className="text-red-600 text-sm font-medium">Total Expenses</div>
          <div className="text-2xl font-bold text-red-800 mt-1">{formatCurrency(totalExpenses)}</div>
          <div className="text-xs text-red-600 mt-1">
            {usingMonthlyLedger ? 'Sum of your Monthly P&L entries' : 'Turnover − Assessable Profit'}
          </div>
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

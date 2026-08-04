import React, { useState, useMemo } from 'react';
import { useAuth } from '../context/AuthContext';
import { formatCurrency, deriveBusinessFinancials } from '../utils/taxCalculations';
import { VATTab, WHTTab } from './VATWHTCalculator';
import CashFlowRecommendations from './CashFlowRecommendations';

type FinancialType = 'cashflow' | 'vat' | 'wht';

const FinancialTracker: React.FC = () => {
  const { taxHistory } = useAuth();
  const [activeType, setActiveType] = useState<FinancialType>('cashflow');

  const mostRecentCompanyTax = useMemo(
    () => taxHistory.find((t) => t.type === 'company'),
    [taxHistory]
  );
  const { totalRevenue, totalExpenses } = mostRecentCompanyTax
    ? deriveBusinessFinancials(mostRecentCompanyTax.result ?? {})
    : { totalRevenue: 0, totalExpenses: 0 };
  const grossProfit = totalRevenue - totalExpenses;

  return (
    <div className="space-y-6">
      {/* Summary Cards — derived from your most recent Company Tax calculation */}
      <div className="grid md:grid-cols-3 gap-4">
        <div className="bg-green-50 rounded-lg p-4 border border-green-100">
          <div className="text-green-600 text-sm font-medium">Total Revenue</div>
          <div className="text-2xl font-bold text-green-800 mt-1">{formatCurrency(totalRevenue)}</div>
          <div className="text-xs text-green-600 mt-1">Turnover + Digital Asset Profit</div>
        </div>
        <div className="bg-red-50 rounded-lg p-4 border border-red-100">
          <div className="text-red-600 text-sm font-medium">Total Expenses</div>
          <div className="text-2xl font-bold text-red-800 mt-1">{formatCurrency(totalExpenses)}</div>
          <div className="text-xs text-red-600 mt-1">Turnover − Assessable Profit</div>
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

      {!mostRecentCompanyTax && (
        <div className="text-center py-6 bg-white rounded-lg border border-dashed border-gray-300">
          <p className="text-sm text-gray-600">No Company Tax calculation on record yet.</p>
          <p className="text-xs text-gray-400 mt-1">Run one in the Wizard or Detailed Calculator to populate these figures.</p>
        </div>
      )}

      {/* Type Toggle */}
      <div className="flex gap-1 p-1 bg-gray-100 rounded-lg w-fit">
        <button
          onClick={() => setActiveType('cashflow')}
          className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
            activeType === 'cashflow' ? 'bg-white shadow text-emerald-700' : 'text-gray-600 hover:text-gray-900'
          }`}
        >
          Cash Flow
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

      {/* Cash Flow */}
      {activeType === 'cashflow' && (
        <div className="space-y-4">
          <div>
            <h3 className="text-base font-semibold text-gray-800">Cash Flow & Profit Recommendations</h3>
            <p className="text-xs text-gray-500 mt-0.5">
              Analysis of your Turnover vs implied expenses, derived from your saved Company Tax calculations.
            </p>
          </div>
          <CashFlowRecommendations taxHistory={taxHistory} />
        </div>
      )}

      {/* VAT / WHT calculators */}
      {activeType === 'vat' && <VATTab />}
      {activeType === 'wht' && <WHTTab />}
    </div>
  );
};

export default FinancialTracker;

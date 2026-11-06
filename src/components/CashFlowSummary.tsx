import React, { useMemo } from 'react';
import { TaxCalculation, Revenue, Expense } from '../context/AuthContext';
import { deriveBusinessFinancials } from '../utils/taxCalculations';
import { buildMonthlyLedger } from '../utils/monthlyLedger';
import { getCanonicalCompanyCalc } from '../utils/canonicalCompanyCalc';
import { analyzeCashFlow, TaxPeriodPoint, CompanyProfile } from '../utils/cashFlowRecommendations';

interface Props {
  taxHistory: TaxCalculation[];
  revenues: Revenue[];
  expenses: Expense[];
}

const RISK_CONFIG = {
  low:      { label: 'Low Risk',      dot: 'bg-emerald-500', text: 'text-emerald-700', bg: 'bg-emerald-50',  border: 'border-emerald-200' },
  medium:   { label: 'Medium Risk',   dot: 'bg-amber-500',   text: 'text-amber-700',   bg: 'bg-amber-50',    border: 'border-amber-200' },
  high:     { label: 'High Risk',     dot: 'bg-orange-500',  text: 'text-orange-700',  bg: 'bg-orange-50',   border: 'border-orange-200' },
  critical: { label: 'Critical Risk', dot: 'bg-red-600',     text: 'text-red-700',     bg: 'bg-red-50',      border: 'border-red-200' },
};

const TREND_LABEL: Record<string, string> = {
  improving: '↑ Improving',
  declining: '↓ Declining',
  stable: '→ Stable',
  insufficient_data: '— Insufficient data',
  up: '↑ Increasing',
  down: '↓ Decreasing',
  flat: '→ Flat',
};

const TREND_COLOR: Record<string, string> = {
  improving: 'text-emerald-600',
  up: 'text-emerald-600',
  stable: 'text-gray-500',
  flat: 'text-gray-500',
  insufficient_data: 'text-gray-400',
  declining: 'text-red-500',
  down: 'text-red-500',
};

// The Monthly-P&L-derived risk/margin/trend summary that used to sit at the
// top of Cash Flow (Overview). Moved here, above Financials in Bookkeeping,
// since it's computed directly from the Monthly P&L ledger entered right
// below it — the recommendation cards, AI-Powered Opportunities and Tax
// Savings that reason about this data stay in Overview > Cash Flow.
const CashFlowSummary: React.FC<Props> = ({ taxHistory, revenues, expenses }) => {
  const monthlyLedgerPeriods: TaxPeriodPoint[] = useMemo(
    () => buildMonthlyLedger(revenues, expenses).map((p) => ({ date: p.date, totalRevenue: p.totalRevenue, totalExpenses: p.totalExpenses })),
    [revenues, expenses]
  );

  const calcPeriods: TaxPeriodPoint[] = useMemo(
    () =>
      taxHistory
        .filter((t) => t.type === 'company')
        .map((t) => ({ date: new Date(t.date), ...deriveBusinessFinancials(t.result ?? {}) })),
    [taxHistory]
  );

  const usingMonthlyLedger = monthlyLedgerPeriods.length > 0;
  const periods = usingMonthlyLedger ? monthlyLedgerPeriods : calcPeriods;

  const canonicalCalc = useMemo(() => getCanonicalCompanyCalc(taxHistory), [taxHistory]);

  const companyProfile: CompanyProfile | null = useMemo(() => {
    if (!canonicalCalc) return null;
    const { result } = canonicalCalc;
    return {
      companySize: result.companySize,
      isLargeCompany: result.isLargeCompany,
      isMNE: result.isMNE,
      annualTurnover: result.annualTurnover,
      taxableProfit: result.taxableProfit,
      taxRate: result.taxRate,
      corporateTax: result.corporateTax,
      developmentLevy: result.developmentLevy,
      minimumETRApplied: result.minimumETRApplied,
    };
  }, [canonicalCalc]);

  const ledgerReconciliationWarning = useMemo(() => {
    if (!usingMonthlyLedger || !canonicalCalc) return null;
    const TOLERANCE = 1;
    const ledgerRevenue = monthlyLedgerPeriods.reduce((sum, p) => sum + p.totalRevenue, 0);
    const ledgerExpenses = monthlyLedgerPeriods.reduce((sum, p) => sum + p.totalExpenses, 0);
    const canonicalExpenses = deriveBusinessFinancials(canonicalCalc.result).totalExpenses;
    const turnoverOver = ledgerRevenue > canonicalCalc.result.annualTurnover + TOLERANCE;
    const expensesOver = ledgerExpenses > canonicalExpenses + TOLERANCE;
    if (!turnoverOver && !expensesOver) return null;
    return { turnoverOver, expensesOver };
  }, [usingMonthlyLedger, canonicalCalc, monthlyLedgerPeriods]);

  const analysis = useMemo(() => analyzeCashFlow(periods, companyProfile), [periods, companyProfile]);
  const hasData = periods.length > 0;

  if (!hasData) return null;

  const riskCfg = RISK_CONFIG[analysis.riskLevel];

  return (
    <div className="space-y-3">
      <p className="text-xs text-gray-400">
        {usingMonthlyLedger
          ? 'Based on your Monthly P&L records (Financials > Monthly P&L).'
          : 'Based on your saved Company Tax calculations — enter Monthly P&L records below for a more accurate, month-by-month analysis.'}
      </p>

      {ledgerReconciliationWarning && (
        <div className="flex items-start gap-2.5 p-3 bg-red-50 border border-red-200 rounded-xl">
          <svg className="w-4 h-4 text-red-600 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
          </svg>
          <p className="text-xs text-red-700">
            <span className="font-semibold">Your Monthly P&L records haven't been reconciled</span> against your declared annual {ledgerReconciliationWarning.turnoverOver && ledgerReconciliationWarning.expensesOver ? 'turnover and expenses' : ledgerReconciliationWarning.turnoverOver ? 'turnover' : 'expenses'} yet — the risk analysis below is based on these unvalidated numbers.
          </p>
        </div>
      )}

      {/* Risk banner */}
      <div className={`flex items-center justify-between p-4 rounded-xl border ${riskCfg.bg} ${riskCfg.border}`}>
        <div className="flex items-center gap-3">
          <div className="relative flex h-3 w-3 flex-shrink-0">
            <span className={`animate-ping absolute inline-flex h-full w-full rounded-full ${riskCfg.dot} opacity-60`} />
            <span className={`relative inline-flex rounded-full h-3 w-3 ${riskCfg.dot}`} />
          </div>
          <div>
            <p className={`text-sm font-bold ${riskCfg.text}`}>Financial Risk Level: {riskCfg.label}</p>
            <p className={`text-xs mt-0.5 ${riskCfg.text} opacity-80`}>
              {analysis.recommendations.length} personalised recommendation{analysis.recommendations.length !== 1 ? 's' : ''} based on your data
            </p>
          </div>
        </div>
        {analysis.profitMargin !== null && (
          <div className="text-right flex-shrink-0 ml-4">
            <p className={`text-2xl font-bold ${analysis.netProfit >= 0 ? 'text-emerald-700' : 'text-red-600'}`}>
              {analysis.profitMargin.toFixed(1)}%
            </p>
            {/* Deliberately not just "Profit Margin" — this is one period,
                pre-tax, so it reads differently from Business Health's
                annual after-tax margin on the Overview tab. */}
            <p className="text-xs text-gray-500">
              {analysis.periodLabel ? `${analysis.periodLabel} Margin (Pre-Tax)` : 'Profit Margin (Pre-Tax)'}
            </p>
          </div>
        )}
      </div>

      {/* Trend summary strip */}
      <div className="grid grid-cols-3 gap-3">
        {[
          { label: 'Profit Trend', value: analysis.trend },
          { label: 'Revenue Trend', value: analysis.revenueTrend },
          { label: 'Expense Trend', value: analysis.expenseTrend },
        ].map(({ label, value }) => (
          <div key={label} className="bg-white rounded-xl border border-gray-200 p-3 text-center">
            <p className="text-xs font-medium text-gray-400 uppercase tracking-wide mb-1">{label}</p>
            <p className={`text-sm font-bold ${TREND_COLOR[value] ?? 'text-gray-500'}`}>
              {TREND_LABEL[value] ?? value}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
};

export default CashFlowSummary;

import React, { useMemo } from 'react';
import { TaxCalculation, Revenue, Expense } from '../context/AuthContext';
import { formatCurrency, deriveBusinessFinancials } from '../utils/taxCalculations';
import { buildMonthlyLedger } from '../utils/monthlyLedger';
import { getCanonicalCompanyCalc } from '../utils/canonicalCompanyCalc';

interface Props {
  taxHistory: TaxCalculation[];
  revenues: Revenue[];
  expenses: Expense[];
}

function shortCurrency(value: number): string {
  if (value >= 1_000_000) return `₦ ${(value / 1_000_000).toFixed(1)}M`;
  if (value >= 1_000) return `₦ ${(value / 1_000).toFixed(0)}K`;
  return `₦ ${value}`;
}

const BusinessHealthDashboard: React.FC<Props> = ({ taxHistory, revenues, expenses }) => {
  const companyCalcs = useMemo(
    () =>
      taxHistory
        .filter((t) => t.type === 'company')
        .slice()
        .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()),
    [taxHistory]
  );

  const latest = companyCalcs[companyCalcs.length - 1];

  // Revenue/Expenses prefer real Monthly P&L bookkeeping over Company Tax
  // calculation snapshots — same precedent as the Overview trend chart, Cash
  // Flow recommendations and the Financials summary, so this tab never
  // disagrees with them. The old fallback (averaging every Wizard/Calculator
  // save in the latest calendar month) stays for users who haven't entered
  // Monthly P&L yet, since a snapshot is still better than nothing — but it
  // was never a reliable "business health" figure on its own, which is the
  // whole reason Monthly P&L takes priority the moment it exists.
  const monthlyLedger = useMemo(() => buildMonthlyLedger(revenues, expenses), [revenues, expenses]);
  const usingMonthlyLedger = monthlyLedger.length > 0;

  const ledgerTotals = useMemo(
    () => monthlyLedger.reduce(
      (acc, p) => ({ totalRevenue: acc.totalRevenue + p.totalRevenue, totalExpenses: acc.totalExpenses + p.totalExpenses }),
      { totalRevenue: 0, totalExpenses: 0 }
    ),
    [monthlyLedger]
  );

  // Total Tax has no Monthly P&L equivalent — it's a tax-engine output, not
  // bookkeeping — so it always comes from the most recent Company Tax
  // calculation regardless of which source is driving Revenue/Expenses.
  const canonicalCalc = useMemo(() => getCanonicalCompanyCalc(taxHistory), [taxHistory]);
  const canonicalTotalTax = canonicalCalc?.result.totalTax ?? 0;

  const latestMonthCalcs = useMemo(() => {
    if (usingMonthlyLedger || companyCalcs.length === 0) return [];
    const d = new Date(latest.date);
    const key = `${d.getFullYear()}-${d.getMonth()}`;
    return companyCalcs.filter((c) => {
      const cd = new Date(c.date);
      return `${cd.getFullYear()}-${cd.getMonth()}` === key;
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [companyCalcs, usingMonthlyLedger]);

  const latestMonthMetrics = useMemo(
    () =>
      latestMonthCalcs.map((c) => {
        const { totalRevenue, totalExpenses } = deriveBusinessFinancials(c.result ?? {});
        const totalTax = c.result?.totalTax ?? 0;
        const netProfit = c.result?.netProfit ?? (totalRevenue - totalExpenses - totalTax);
        return { totalRevenue, totalExpenses, totalTax, netProfit };
      }),
    [latestMonthCalcs]
  );

  const avgOf = (key: keyof (typeof latestMonthMetrics)[number]): number =>
    latestMonthMetrics.length > 0
      ? latestMonthMetrics.reduce((sum, m) => sum + m[key], 0) / latestMonthMetrics.length
      : 0;

  const totalRevenue = usingMonthlyLedger ? ledgerTotals.totalRevenue : avgOf('totalRevenue');
  const totalExpenses = usingMonthlyLedger ? ledgerTotals.totalExpenses : avgOf('totalExpenses');
  const totalTax = usingMonthlyLedger ? canonicalTotalTax : avgOf('totalTax');
  const grossProfit = totalRevenue - totalExpenses;
  const netProfitAfterTax = usingMonthlyLedger ? grossProfit - totalTax : avgOf('netProfit');
  const profitMargin = totalRevenue > 0 ? (netProfitAfterTax / totalRevenue) * 100 : null;
  const expenseRatio = totalRevenue > 0 ? (totalExpenses / totalRevenue) * 100 : null;
  const isAveraged = !usingMonthlyLedger && latestMonthCalcs.length > 1;
  const latestMonthLabel = latest
    ? new Date(latest.date).toLocaleDateString('en-NG', { month: 'long', year: 'numeric' })
    : '';

  const hasData = usingMonthlyLedger || companyCalcs.length > 0;

  // Health status is based on Net Profit AFTER tax — a business isn't
  // "healthy" just because its pre-tax margin looks good if a large tax
  // liability (CIT + Dev Levy + Digital Asset Tax) is about to consume it.
  const health = useMemo(() => {
    if (!hasData) return 'neutral';
    if (profitMargin === null) return 'no-revenue';
    if (profitMargin > 20) return 'healthy';
    if (profitMargin >= 0) return 'moderate';
    return 'loss';
  }, [hasData, profitMargin]);

  const healthConfig = {
    healthy:    { label: 'Healthy',        bg: 'bg-emerald-50',  border: 'border-emerald-200', dot: 'bg-emerald-500', text: 'text-emerald-700', sub: 'Net profit margin (after tax) above 20%' },
    moderate:   { label: 'Moderate',       bg: 'bg-yellow-50',   border: 'border-yellow-200',  dot: 'bg-yellow-500',  text: 'text-yellow-700',  sub: 'Low net profit margin — review expenses and tax exposure' },
    loss:       { label: 'At Risk',         bg: 'bg-red-50',      border: 'border-red-200',     dot: 'bg-red-500',     text: 'text-red-700',     sub: 'Expenses and tax exceed revenue' },
    'no-revenue': { label: 'Expenses Only', bg: 'bg-orange-50',  border: 'border-orange-200',  dot: 'bg-orange-400',  text: 'text-orange-700',  sub: 'No revenue recorded yet' },
    neutral:    { label: 'No Data Yet',     bg: 'bg-gray-50',     border: 'border-gray-200',    dot: 'bg-gray-400',    text: 'text-gray-600',    sub: 'Run a Company Tax calculation to see your health score' },
  }[health];

  return (
    <div className="space-y-5">

      {/* Health Banner */}
      <div className={`flex items-center justify-between p-4 rounded-xl border ${healthConfig.bg} ${healthConfig.border}`}>
        <div className="flex items-center gap-3">
          <div className="relative flex h-3 w-3">
            {health !== 'neutral' && <span className={`animate-ping absolute inline-flex h-full w-full rounded-full ${healthConfig.dot} opacity-60`} />}
            <span className={`relative inline-flex rounded-full h-3 w-3 ${healthConfig.dot}`} />
          </div>
          <div>
            <span className={`text-sm font-bold ${healthConfig.text}`}>Business Health: {healthConfig.label}</span>
            <p className={`text-xs mt-0.5 ${healthConfig.text} opacity-80`}>{healthConfig.sub}</p>
          </div>
        </div>
        {profitMargin !== null && (
          <div className="text-right">
            <div className={`text-2xl font-bold ${netProfitAfterTax >= 0 ? 'text-emerald-700' : 'text-red-600'}`}>
              {profitMargin.toFixed(1)}%
            </div>
            <div className="text-xs text-gray-500">Annual Net Profit Margin (After Tax)</div>
          </div>
        )}
      </div>

      {hasData && (
        <p className="text-xs text-gray-400 -mt-3">
          {usingMonthlyLedger
            ? 'Revenue and expenses are the sum of your Monthly P&L records (Financials > Monthly P&L); Total Tax is from your latest Company Tax calculation.'
            : isAveraged
            ? `Figures below are averaged across ${latestMonthMetrics.length} calculations saved in ${latestMonthLabel}. Enter Monthly P&L records in Financials for a more accurate, month-by-month picture.`
            : `Figures below are from your ${latestMonthLabel} calculation. Enter Monthly P&L records in Financials for a more accurate, month-by-month picture.`}
        </p>
      )}

      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-medium text-gray-500 uppercase tracking-wide">Revenue</span>
            <div className="w-7 h-7 rounded-full bg-green-100 flex items-center justify-center">
              <svg className="w-4 h-4 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 11l5-5m0 0l5 5m-5-5v12" />
              </svg>
            </div>
          </div>
          <div className="text-xl font-bold text-gray-900">{shortCurrency(totalRevenue)}</div>
          <div className="text-xs text-gray-400 mt-1">{usingMonthlyLedger ? 'From your Monthly P&L records' : 'Turnover + Digital Asset'}</div>
        </div>

        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-medium text-gray-500 uppercase tracking-wide">Expenses</span>
            <div className="w-7 h-7 rounded-full bg-red-100 flex items-center justify-center">
              <svg className="w-4 h-4 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 13l-5 5m0 0l-5-5m5 5V6" />
              </svg>
            </div>
          </div>
          <div className="text-xl font-bold text-gray-900">{shortCurrency(totalExpenses)}</div>
          <div className="text-xs text-gray-400 mt-1">{usingMonthlyLedger ? 'From your Monthly P&L records' : 'Turnover − Assessable Profit'}</div>
        </div>

        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-medium text-gray-500 uppercase tracking-wide">Gross {grossProfit >= 0 ? 'Profit' : 'Loss'}</span>
            <div className={`w-7 h-7 rounded-full flex items-center justify-center ${grossProfit >= 0 ? 'bg-emerald-100' : 'bg-orange-100'}`}>
              <svg className={`w-4 h-4 ${grossProfit >= 0 ? 'text-emerald-600' : 'text-orange-600'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
              </svg>
            </div>
          </div>
          <div className={`text-xl font-bold ${grossProfit >= 0 ? 'text-emerald-700' : 'text-red-600'}`}>
            {grossProfit < 0 ? '−' : ''}{shortCurrency(Math.abs(grossProfit))}
          </div>
          <div className="text-xs text-gray-400 mt-1">Revenue − Expenses (before tax)</div>
        </div>

        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-medium text-gray-500 uppercase tracking-wide">Total Tax</span>
            <div className="w-7 h-7 rounded-full bg-red-100 flex items-center justify-center">
              <svg className="w-4 h-4 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 14l6-6m-5.5.5h.01m4.99 5h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
            </div>
          </div>
          <div className="text-xl font-bold text-red-600">{shortCurrency(totalTax)}</div>
          <div className="text-xs text-gray-400 mt-1">CIT + Dev Levy + Digital Asset Tax</div>
        </div>

        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-medium text-gray-500 uppercase tracking-wide">Net {netProfitAfterTax >= 0 ? 'Profit' : 'Loss'} (After Tax)</span>
            <div className={`w-7 h-7 rounded-full flex items-center justify-center ${netProfitAfterTax >= 0 ? 'bg-emerald-100' : 'bg-orange-100'}`}>
              <svg className={`w-4 h-4 ${netProfitAfterTax >= 0 ? 'text-emerald-600' : 'text-orange-600'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
              </svg>
            </div>
          </div>
          <div className={`text-xl font-bold ${netProfitAfterTax >= 0 ? 'text-emerald-700' : 'text-red-600'}`}>
            {netProfitAfterTax < 0 ? '−' : ''}{shortCurrency(Math.abs(netProfitAfterTax))}
          </div>
          <div className="text-xs text-gray-400 mt-1">Gross Profit − Total Tax</div>
        </div>

        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-medium text-gray-500 uppercase tracking-wide">Expense Ratio</span>
            <div className="w-7 h-7 rounded-full bg-blue-100 flex items-center justify-center">
              <svg className="w-4 h-4 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 3.055A9.001 9.001 0 1020.945 13H11V3.055z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20.488 9H15V3.512A9.025 9.025 0 0120.488 9z" />
              </svg>
            </div>
          </div>
          <div className="text-xl font-bold text-gray-900">
            {expenseRatio !== null ? `${expenseRatio.toFixed(1)}%` : '—'}
          </div>
          <div className="text-xs text-gray-400 mt-1">of revenue spent (excl. tax)</div>
        </div>
      </div>

      {/* Latest Tax Calculation — the source of the figures above */}
      {latest && (
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-semibold text-gray-700">Latest Company Tax Calculation</h3>
            <span className="text-xs text-gray-400">
              {new Date(latest.date).toLocaleDateString('en-NG', { day: 'numeric', month: 'short', year: 'numeric' })}
            </span>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
            <div>
              <div className="text-xs text-gray-500">Turnover</div>
              <div className="font-medium text-gray-900">{formatCurrency(latest.result?.annualTurnover ?? 0)}</div>
            </div>
            <div>
              <div className="text-xs text-gray-500">Assessable Profit</div>
              <div className="font-medium text-gray-900">{formatCurrency(latest.result?.assessableProfit ?? 0)}</div>
            </div>
            <div>
              <div className="text-xs text-gray-500">Digital Asset Profit</div>
              <div className="font-medium text-gray-900">{formatCurrency(latest.result?.digitalAssetProfit ?? 0)}</div>
            </div>
            <div>
              <div className="text-xs text-gray-500">Total Tax</div>
              <div className="font-medium text-red-600">{formatCurrency(latest.result?.totalTax ?? 0)}</div>
            </div>
          </div>
        </div>
      )}

      {/* Empty state nudge */}
      {!hasData && (
        <div className="text-center py-8 bg-white rounded-xl border border-dashed border-gray-300">
          <div className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-3">
            <svg className="w-6 h-6 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
            </svg>
          </div>
          <p className="text-sm font-medium text-gray-700">No Company Tax calculations yet</p>
          <p className="text-xs text-gray-400 mt-1">Run one in the Wizard or Detailed Calculator to see your business health.</p>
        </div>
      )}
    </div>
  );
};

export default BusinessHealthDashboard;

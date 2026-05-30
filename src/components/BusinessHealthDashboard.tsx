import React, { useMemo } from 'react';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
  ArcElement,
} from 'chart.js';
import { Bar, Doughnut } from 'react-chartjs-2';
import { Revenue, Expense } from '../context/AuthContext';
import { formatCurrency } from '../utils/taxCalculations';

ChartJS.register(CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend, ArcElement);

interface Props {
  revenues: Revenue[];
  expenses: Expense[];
}

const CATEGORY_COLORS = [
  '#3b82f6', '#8b5cf6', '#ec4899', '#f97316',
  '#f59e0b', '#84cc16', '#14b8a6', '#06b6d4',
  '#ef4444', '#a855f7', '#22c55e',
];

function shortCurrency(value: number): string {
  if (value >= 1_000_000) return `₦${(value / 1_000_000).toFixed(1)}M`;
  if (value >= 1_000) return `₦${(value / 1_000).toFixed(0)}K`;
  return `₦${value}`;
}

function getLastSixMonths() {
  const now = new Date();
  return Array.from({ length: 6 }, (_, i) => {
    const d = new Date(now.getFullYear(), now.getMonth() - (5 - i), 1);
    return { label: d.toLocaleDateString('en-NG', { month: 'short', year: '2-digit' }), year: d.getFullYear(), month: d.getMonth() };
  });
}

function groupByCategory(items: { category: string; amount: number }[]) {
  return Object.entries(
    items.reduce((acc, item) => {
      acc[item.category] = (acc[item.category] || 0) + item.amount;
      return acc;
    }, {} as Record<string, number>)
  ).sort(([, a], [, b]) => b - a);
}

const BusinessHealthDashboard: React.FC<Props> = ({ revenues, expenses }) => {
  const totalRevenue = revenues.reduce((s, r) => s + r.amount, 0);
  const totalExpenses = expenses.reduce((s, e) => s + e.amount, 0);
  const netProfit = totalRevenue - totalExpenses;
  const profitMargin = totalRevenue > 0 ? (netProfit / totalRevenue) * 100 : null;
  const expenseRatio = totalRevenue > 0 ? (totalExpenses / totalRevenue) * 100 : null;

  const hasData = revenues.length > 0 || expenses.length > 0;

  // Health status
  const health = useMemo(() => {
    if (!hasData) return 'neutral';
    if (profitMargin === null) return 'no-revenue';
    if (profitMargin > 20) return 'healthy';
    if (profitMargin >= 0) return 'moderate';
    return 'loss';
  }, [hasData, profitMargin]);

  const healthConfig = {
    healthy:    { label: 'Healthy',        bg: 'bg-emerald-50',  border: 'border-emerald-200', dot: 'bg-emerald-500', text: 'text-emerald-700', sub: 'Profit margin above 20%' },
    moderate:   { label: 'Moderate',       bg: 'bg-yellow-50',   border: 'border-yellow-200',  dot: 'bg-yellow-500',  text: 'text-yellow-700',  sub: 'Low profit margin — review expenses' },
    loss:       { label: 'At Risk',         bg: 'bg-red-50',      border: 'border-red-200',     dot: 'bg-red-500',     text: 'text-red-700',     sub: 'Expenses exceed revenue' },
    'no-revenue': { label: 'Expenses Only', bg: 'bg-orange-50',  border: 'border-orange-200',  dot: 'bg-orange-400',  text: 'text-orange-700',  sub: 'No revenue recorded yet' },
    neutral:    { label: 'No Data Yet',     bg: 'bg-gray-50',     border: 'border-gray-200',    dot: 'bg-gray-400',    text: 'text-gray-600',    sub: 'Add revenue and expenses to see your health score' },
  }[health];

  // Monthly bar chart data
  const months = getLastSixMonths();
  const monthlyRevenue = months.map(m =>
    revenues.filter(r => { const d = new Date(r.date); return d.getFullYear() === m.year && d.getMonth() === m.month; })
            .reduce((s, r) => s + r.amount, 0)
  );
  const monthlyExpenses = months.map(m =>
    expenses.filter(e => { const d = new Date(e.date); return d.getFullYear() === m.year && d.getMonth() === m.month; })
            .reduce((s, e) => s + e.amount, 0)
  );

  const barData = {
    labels: months.map(m => m.label),
    datasets: [
      {
        label: 'Revenue',
        data: monthlyRevenue,
        backgroundColor: 'rgba(34, 197, 94, 0.75)',
        borderColor: 'rgb(22, 163, 74)',
        borderWidth: 1,
        borderRadius: 5,
      },
      {
        label: 'Expenses',
        data: monthlyExpenses,
        backgroundColor: 'rgba(239, 68, 68, 0.75)',
        borderColor: 'rgb(220, 38, 38)',
        borderWidth: 1,
        borderRadius: 5,
      },
    ],
  };

  const barOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { position: 'top' as const, labels: { boxWidth: 12, font: { size: 12 } } },
      tooltip: {
        callbacks: {
          label: (ctx: any) => ` ${ctx.dataset.label}: ${formatCurrency(ctx.raw)}`,
        },
      },
    },
    scales: {
      y: {
        beginAtZero: true,
        ticks: { callback: (v: any) => shortCurrency(v), font: { size: 11 } },
        grid: { color: 'rgba(0,0,0,0.05)' },
      },
      x: { ticks: { font: { size: 11 } }, grid: { display: false } },
    },
  };

  // Expense doughnut
  const expenseCategories = groupByCategory(expenses);
  const expenseDoughnutData = {
    labels: expenseCategories.map(([cat]) => cat),
    datasets: [{
      data: expenseCategories.map(([, amt]) => amt),
      backgroundColor: expenseCategories.map((_, i) => CATEGORY_COLORS[i % CATEGORY_COLORS.length]),
      borderWidth: 2,
      borderColor: '#fff',
    }],
  };

  // Revenue doughnut
  const revenueCategories = groupByCategory(revenues);
  const revenueDoughnutData = {
    labels: revenueCategories.map(([cat]) => cat),
    datasets: [{
      data: revenueCategories.map(([, amt]) => amt),
      backgroundColor: revenueCategories.map((_, i) => CATEGORY_COLORS[i % CATEGORY_COLORS.length]),
      borderWidth: 2,
      borderColor: '#fff',
    }],
  };

  const doughnutOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { position: 'bottom' as const, labels: { boxWidth: 10, font: { size: 11 }, padding: 8 } },
      tooltip: {
        callbacks: {
          label: (ctx: any) => ` ${ctx.label}: ${formatCurrency(ctx.raw)} (${((ctx.raw / (ctx.dataset.data.reduce((a: number, b: number) => a + b, 0))) * 100).toFixed(1)}%)`,
        },
      },
    },
  };

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
            <div className={`text-2xl font-bold ${netProfit >= 0 ? 'text-emerald-700' : 'text-red-600'}`}>
              {profitMargin.toFixed(1)}%
            </div>
            <div className="text-xs text-gray-500">Profit Margin</div>
          </div>
        )}
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
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
          <div className="text-xs text-gray-400 mt-1">{revenues.length} entries</div>
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
          <div className="text-xs text-gray-400 mt-1">{expenses.length} entries</div>
        </div>

        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-medium text-gray-500 uppercase tracking-wide">Net {netProfit >= 0 ? 'Profit' : 'Loss'}</span>
            <div className={`w-7 h-7 rounded-full flex items-center justify-center ${netProfit >= 0 ? 'bg-emerald-100' : 'bg-orange-100'}`}>
              <svg className={`w-4 h-4 ${netProfit >= 0 ? 'text-emerald-600' : 'text-orange-600'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
              </svg>
            </div>
          </div>
          <div className={`text-xl font-bold ${netProfit >= 0 ? 'text-emerald-700' : 'text-red-600'}`}>
            {netProfit < 0 ? '−' : ''}{shortCurrency(Math.abs(netProfit))}
          </div>
          <div className="text-xs text-gray-400 mt-1">Revenue − Expenses</div>
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
          <div className="text-xs text-gray-400 mt-1">of revenue spent</div>
        </div>
      </div>

      {/* Monthly Bar Chart */}
      <div className="bg-white rounded-xl border border-gray-200 p-5">
        <h3 className="text-sm font-semibold text-gray-700 mb-4">Revenue vs Expenses — Last 6 Months</h3>
        <div style={{ height: 220 }}>
          <Bar data={barData} options={barOptions} />
        </div>
      </div>

      {/* Breakdown Charts */}
      {(revenues.length > 0 || expenses.length > 0) && (
        <div className="grid md:grid-cols-2 gap-4">
          {/* Expense Breakdown */}
          {expenses.length > 0 && (
            <div className="bg-white rounded-xl border border-gray-200 p-5">
              <h3 className="text-sm font-semibold text-gray-700 mb-4">Expense Breakdown by Category</h3>
              <div style={{ height: 220 }}>
                <Doughnut data={expenseDoughnutData} options={doughnutOptions} />
              </div>
              <div className="mt-3 space-y-1.5">
                {expenseCategories.slice(0, 4).map(([cat, amt], i) => (
                  <div key={cat} className="flex items-center justify-between text-xs">
                    <div className="flex items-center gap-2">
                      <div className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: CATEGORY_COLORS[i % CATEGORY_COLORS.length] }} />
                      <span className="text-gray-600 truncate">{cat}</span>
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <span className="text-gray-800 font-medium">{shortCurrency(amt)}</span>
                      <span className="text-gray-400 w-10 text-right">{((amt / totalExpenses) * 100).toFixed(0)}%</span>
                    </div>
                  </div>
                ))}
                {expenseCategories.length > 4 && (
                  <p className="text-xs text-gray-400 mt-1">+{expenseCategories.length - 4} more categories</p>
                )}
              </div>
            </div>
          )}

          {/* Revenue Breakdown */}
          {revenues.length > 0 && (
            <div className="bg-white rounded-xl border border-gray-200 p-5">
              <h3 className="text-sm font-semibold text-gray-700 mb-4">Revenue Breakdown by Category</h3>
              <div style={{ height: 220 }}>
                <Doughnut data={revenueDoughnutData} options={doughnutOptions} />
              </div>
              <div className="mt-3 space-y-1.5">
                {revenueCategories.slice(0, 4).map(([cat, amt], i) => (
                  <div key={cat} className="flex items-center justify-between text-xs">
                    <div className="flex items-center gap-2">
                      <div className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: CATEGORY_COLORS[i % CATEGORY_COLORS.length] }} />
                      <span className="text-gray-600 truncate">{cat}</span>
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <span className="text-gray-800 font-medium">{shortCurrency(amt)}</span>
                      <span className="text-gray-400 w-10 text-right">{((amt / totalRevenue) * 100).toFixed(0)}%</span>
                    </div>
                  </div>
                ))}
                {revenueCategories.length > 4 && (
                  <p className="text-xs text-gray-400 mt-1">+{revenueCategories.length - 4} more categories</p>
                )}
              </div>
            </div>
          )}
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
          <p className="text-sm font-medium text-gray-700">No financial data yet</p>
          <p className="text-xs text-gray-400 mt-1">Go to the Financials tab to add revenue and expense entries.</p>
        </div>
      )}
    </div>
  );
};

export default BusinessHealthDashboard;

import React, { useMemo } from 'react';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Filler,
  Tooltip,
  Legend,
} from 'chart.js';
import { Line } from 'react-chartjs-2';
import { StoredDocument, TaxCalculation, Revenue, Expense } from '../context/AuthContext';
import {
  formatCurrency,
  deriveBusinessFinancials,
  getCountdown,
  LODGEMENT_DATE,
  COMPANY_LODGEMENT_DATE,
} from '../utils/taxCalculations';
import { downloadTaxCalculationPDF } from '../utils/historyReport';
import { buildMonthlyLedger } from '../utils/monthlyLedger';

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Filler, Tooltip, Legend);

interface Props {
  documents: StoredDocument[];
  taxHistory: TaxCalculation[];
  revenues: Revenue[];
  expenses: Expense[];
  effectiveTaxType: 'personal' | 'company';
  isPremium: boolean;
  companyName?: string;
  onNavigate: (tab: 'financials' | 'businessHealth') => void;
}

function shortCurrency(value: number): string {
  if (Math.abs(value) >= 1_000_000) return `₦ ${(value / 1_000_000).toFixed(1)}M`;
  if (Math.abs(value) >= 1_000) return `₦ ${(value / 1_000).toFixed(0)}K`;
  return `₦ ${Math.round(value)}`;
}

const Pill: React.FC<{ tone: 'gold' | 'good' | 'warn' | 'neutral'; children: React.ReactNode }> = ({ tone, children }) => {
  const toneClasses = {
    gold: 'bg-gold-100 text-gold-800 border-gold-200',
    good: 'bg-primary-50 text-primary-800 border-primary-200',
    warn: 'bg-amber-50 text-amber-800 border-amber-200',
    neutral: 'bg-secondary-100 text-secondary-600 border-secondary-200',
  }[tone];
  const dotClasses = {
    gold: 'bg-gold-500',
    good: 'bg-primary-500',
    warn: 'bg-amber-500',
    neutral: 'bg-secondary-400',
  }[tone];
  return (
    <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full border text-xs font-semibold uppercase tracking-wide ${toneClasses}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${dotClasses}`} />
      {children}
    </span>
  );
};

const StatTile: React.FC<{ label: string; value: string; onClick?: () => void; warn?: boolean }> = ({ label, value, onClick, warn }) => (
  <button
    type="button"
    onClick={onClick}
    disabled={!onClick}
    className={`text-left bg-white rounded-xl border border-cream-200 p-4 transition-shadow ${
      onClick ? 'hover:shadow-md cursor-pointer' : 'cursor-default'
    }`}
  >
    <div className={`text-2xl font-bold ${warn ? 'text-amber-700' : 'text-secondary-900'}`}>{value}</div>
    <div className="text-xs font-medium text-secondary-400 uppercase tracking-wide mt-1">{label}</div>
  </button>
);

type ActivityItem = {
  id: string;
  label: string;
  sublabel: string;
  date: Date;
  status: 'Verified' | 'Pending review';
  onClick?: () => void;
};

const BusinessPerformanceCard: React.FC<Props> = ({
  documents,
  taxHistory,
  revenues,
  expenses,
  effectiveTaxType,
  isPremium,
  companyName,
  onNavigate,
}) => {
  // --- Monthly ledger: real bookkeeping entered in Financials > Monthly P&L.
  // This is the preferred trend source when it exists, since it's actual
  // month-by-month data rather than a snapshot of whatever the calculator
  // happened to hold when last saved. Shared with CashFlowRecommendations so
  // the two views never disagree about a given month's figures. ---
  const monthlyLedger = useMemo(
    () =>
      buildMonthlyLedger(revenues, expenses)
        .slice(-6)
        .map((p) => ({
          label: p.date.toLocaleDateString('en-NG', { month: 'short', year: '2-digit' }),
          revenue: p.totalRevenue,
          expenses: p.totalExpenses,
          netProfit: p.totalRevenue - p.totalExpenses,
        })),
    [revenues, expenses]
  );

  // --- Trend data: company calcs get Revenue/Expenses/Net Profit (same
  // month-collapsing logic as Business Health); personal calcs get Taxable
  // Income/Tax Paid plotted per saved calculation, since personal filings
  // are typically one-off rather than monthly. ---
  const companyCalcs = useMemo(
    () =>
      taxHistory
        .filter((t) => t.type === 'company')
        .slice()
        .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()),
    [taxHistory]
  );
  const personalCalcs = useMemo(
    () =>
      taxHistory
        .filter((t) => t.type === 'personal')
        .slice()
        .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()),
    [taxHistory]
  );

  const monthlyCompanyCalcs = useMemo(() => {
    const latestByMonth = new Map<string, (typeof companyCalcs)[number]>();
    for (const calc of companyCalcs) {
      const d = new Date(calc.date);
      const key = `${d.getFullYear()}-${d.getMonth()}`;
      const existing = latestByMonth.get(key);
      if (!existing || d.getTime() > new Date(existing.date).getTime()) {
        latestByMonth.set(key, calc);
      }
    }
    return Array.from(latestByMonth.values())
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
      .slice(-6);
  }, [companyCalcs]);

  // When the user's most recent activity is personal, the chart must show
  // their personal trend — company turnover/expenses from older activity
  // (or unrelated Monthly P&L bookkeeping) would otherwise silently take
  // priority and show company figures under a "Personal Tax" header.
  const trendSource: 'monthlyLedger' | 'company' | 'personal' | 'none' =
    effectiveTaxType === 'personal'
      ? (personalCalcs.length > 0 ? 'personal' : 'none')
      : monthlyLedger.length > 0 ? 'monthlyLedger' : monthlyCompanyCalcs.length > 0 ? 'company' : personalCalcs.length > 0 ? 'personal' : 'none';

  const companyMetrics = useMemo(
    () => ({
      labels: monthlyCompanyCalcs.map((t) => new Date(t.date).toLocaleDateString('en-NG', { month: 'short', year: '2-digit' })),
      netProfit: monthlyCompanyCalcs.map((t) => t.result?.netProfit ?? 0),
      revenue: monthlyCompanyCalcs.map((t) => deriveBusinessFinancials(t.result ?? {}).totalRevenue),
      expenses: monthlyCompanyCalcs.map((t) => deriveBusinessFinancials(t.result ?? {}).totalExpenses),
    }),
    [monthlyCompanyCalcs]
  );

  const personalTrend = useMemo(() => {
    const recent = personalCalcs.slice(-6);
    return {
      labels: recent.map((t) => new Date(t.date).toLocaleDateString('en-NG', { day: 'numeric', month: 'short' })),
      taxableIncome: recent.map((t) => t.result?.taxableIncome ?? 0),
      taxPaid: recent.map((t) => t.result?.totalTax ?? 0),
    };
  }, [personalCalcs]);

  // Net Profit / Revenue / Expenses are plotted together (not toggled one at
  // a time) whenever the source has all three — real monthly bookkeeping or
  // a company calculation snapshot. Personal filings only have two
  // comparable figures, so those two are shown together instead.
  const NET_PROFIT_COLOR = '34, 74, 52'; // primary-700
  const REVENUE_COLOR = '21, 128, 61';
  const EXPENSES_COLOR = '194, 65, 12';

  const chartLabels =
    trendSource === 'monthlyLedger'
      ? monthlyLedger.map((m) => m.label)
      : trendSource === 'company'
      ? companyMetrics.labels
      : trendSource === 'personal'
      ? personalTrend.labels
      : [];

  function lineDataset(label: string, data: number[], color: string, dashed = false) {
    return {
      label,
      data,
      borderColor: `rgb(${color})`,
      backgroundColor: `rgba(${color}, 0.08)`,
      pointBackgroundColor: `rgb(${color})`,
      pointRadius: 3,
      pointHoverRadius: 5,
      borderWidth: 2,
      borderDash: dashed ? [4, 3] : undefined,
      fill: false,
      tension: 0.35,
    };
  }

  const chartData = {
    labels: chartLabels,
    datasets:
      trendSource === 'monthlyLedger'
        ? [
            lineDataset('Net Profit', monthlyLedger.map((m) => m.netProfit), NET_PROFIT_COLOR),
            lineDataset('Revenue', monthlyLedger.map((m) => m.revenue), REVENUE_COLOR),
            lineDataset('Expenses', monthlyLedger.map((m) => m.expenses), EXPENSES_COLOR, true),
          ]
        : trendSource === 'company'
        ? [
            lineDataset('Net Profit', companyMetrics.netProfit, NET_PROFIT_COLOR),
            lineDataset('Revenue', companyMetrics.revenue, REVENUE_COLOR),
            lineDataset('Expenses', companyMetrics.expenses, EXPENSES_COLOR, true),
          ]
        : trendSource === 'personal'
        ? [
            lineDataset('Taxable Income', personalTrend.taxableIncome, NET_PROFIT_COLOR),
            lineDataset('Tax Paid', personalTrend.taxPaid, EXPENSES_COLOR, true),
          ]
        : [],
  };

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    interaction: { mode: 'index' as const, intersect: false },
    plugins: {
      legend: {
        display: true,
        position: 'top' as const,
        align: 'end' as const,
        labels: { boxWidth: 10, font: { size: 11 }, usePointStyle: true },
      },
      tooltip: {
        callbacks: {
          label: (ctx: any) => ` ${ctx.dataset.label}: ${formatCurrency(ctx.raw)}`,
        },
      },
    },
    scales: {
      y: {
        ticks: { callback: (v: any) => shortCurrency(v), font: { size: 11 } },
        grid: { color: 'rgba(0,0,0,0.05)' },
      },
      x: { ticks: { font: { size: 11 } }, grid: { display: false } },
    },
  };

  // --- Stat tiles ---
  const latestEffectiveCalc = taxHistory.find((t) => t.type === effectiveTaxType);
  const estTaxDue = latestEffectiveCalc?.result?.totalTax ?? null;

  const docsWithAmount = documents.filter((d) => d.extractedAmount > 0).length;
  const docsVerifiedPct = documents.length > 0 ? Math.round((docsWithAmount / documents.length) * 100) : null;

  const deadline = effectiveTaxType === 'company' ? COMPANY_LODGEMENT_DATE : LODGEMENT_DATE;
  const countdown = getCountdown(deadline);

  // --- Status pills ---
  const filingPill: { tone: 'good' | 'warn' | 'neutral'; label: string } =
    taxHistory.length === 0
      ? { tone: 'neutral', label: 'No Filing Yet' }
      : countdown.days <= 14
      ? { tone: 'warn', label: 'Deadline Approaching' }
      : { tone: 'good', label: 'Filing On Track' };

  // --- Activity list: most recent documents + tax calculations, newest first ---
  const activity: ActivityItem[] = useMemo(() => {
    const docItems: ActivityItem[] = documents.map((d) => ({
      id: `doc-${d.id}`,
      label: d.fileName || d.description || 'Uploaded document',
      sublabel: d.type === 'invoice' ? 'Invoice' : 'Receipt',
      date: new Date(d.uploadDate),
      status: d.extractedAmount > 0 ? 'Verified' : 'Pending review',
    }));
    const calcItems: ActivityItem[] = taxHistory.map((c) => ({
      id: `calc-${c.id}`,
      label: `${c.type === 'personal' ? 'Personal' : 'Company'} Tax Calculation`,
      sublabel: new Date(c.date).toLocaleDateString('en-NG', { month: 'long', year: 'numeric' }),
      date: new Date(c.date),
      status: 'Verified',
      onClick: () => downloadTaxCalculationPDF(c),
    }));
    return [...docItems, ...calcItems].sort((a, b) => b.date.getTime() - a.date.getTime()).slice(0, 5);
  }, [documents, taxHistory]);

  return (
    <div className="bg-cream-50 border border-cream-200 rounded-2xl p-5 md:p-6 space-y-5">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h3 className="font-serif text-lg font-bold text-primary-900">
          {companyName ?? 'Your Business'} — {effectiveTaxType === 'company' ? 'Company' : 'Personal'} Tax
        </h3>
        <div className="flex items-center gap-2 flex-wrap">
          <Pill tone={isPremium ? 'gold' : 'neutral'}>{isPremium ? 'Premium AI Active' : 'Standard Plan'}</Pill>
          <Pill tone={filingPill.tone}>{filingPill.label}</Pill>
        </div>
      </div>

      {/* Stat tiles */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <StatTile label="Est. Tax Due" value={estTaxDue !== null ? formatCurrency(estTaxDue) : '—'} onClick={() => onNavigate('financials')} />
        <StatTile label="Docs Verified" value={docsVerifiedPct !== null ? `${docsVerifiedPct}%` : 'No docs yet'} />
        <StatTile label="To Deadline" value={countdown.isPast ? 'Overdue' : `${countdown.days} days`} warn={!countdown.isPast && countdown.days <= 14} onClick={() => onNavigate('financials')} />
      </div>

      {/* Trend chart */}
      <div className="bg-white rounded-xl border border-cream-200 p-4">
        <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
          <span className="text-sm font-medium text-secondary-600">
            {trendSource === 'monthlyLedger'
              ? 'Business performance — monthly records'
              : trendSource === 'company'
              ? 'Business performance (last 6 months, from saved calculations)'
              : trendSource === 'personal'
              ? 'Personal tax trend (recent filings)'
              : 'Business performance trend'}
          </span>
        </div>

        {trendSource !== 'none' ? (
          <div className="h-56">
            <Line data={chartData} options={chartOptions} />
          </div>
        ) : (
          <div className="h-40 flex flex-col items-center justify-center text-center px-4">
            <p className="text-sm text-secondary-500">
              No trend data yet — save a {effectiveTaxType === 'company' ? 'Company' : 'Personal'} Tax calculation
              {effectiveTaxType === 'company' && ' or enter figures in Financials > Monthly P&L'} to see how your {effectiveTaxType === 'company' ? 'business' : 'tax position'} is tracking over time.
            </p>
          </div>
        )}
      </div>

      {/* Activity / verification list */}
      <div className="bg-white rounded-xl border border-cream-200 divide-y divide-secondary-100">
        {activity.length === 0 ? (
          <div className="p-4 text-sm text-secondary-500 text-center">No activity yet. Upload a document or run a tax calculation to get started.</div>
        ) : (
          activity.map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={item.onClick}
              disabled={!item.onClick}
              className={`w-full flex items-center justify-between gap-3 px-4 py-3 text-left transition-colors ${
                item.onClick ? 'hover:bg-cream-50 cursor-pointer' : 'cursor-default'
              }`}
            >
              <div>
                <div className="text-sm font-medium text-secondary-800">{item.label}</div>
                <div className="text-xs text-secondary-400">{item.sublabel}</div>
              </div>
              <span
                className={`text-xs font-medium px-2 py-1 rounded-full ${
                  item.status === 'Verified' ? 'text-primary-700 bg-primary-50' : 'text-secondary-500 bg-secondary-100'
                }`}
              >
                {item.status}
              </span>
            </button>
          ))
        )}
      </div>
    </div>
  );
};

export default BusinessPerformanceCard;

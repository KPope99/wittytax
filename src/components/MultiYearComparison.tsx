import React, { useMemo, useState } from 'react';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
} from 'chart.js';
import { Bar } from 'react-chartjs-2';
import { TaxCalculation } from '../context/AuthContext';
import { formatCurrency } from '../utils/taxCalculations';

ChartJS.register(CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend);

interface Props {
  taxHistory: TaxCalculation[];
}

type TaxType = 'personal' | 'company';

function shortCurrency(value: number): string {
  if (Math.abs(value) >= 1_000_000) return `₦${(value / 1_000_000).toFixed(1)}M`;
  if (Math.abs(value) >= 1_000) return `₦${(value / 1_000).toFixed(0)}K`;
  return `₦${Math.round(value)}`;
}

// One row per year, taking the most recent calculation within that year as
// the year's figure — a user may recalculate several times in one year, but
// only the latest reflects their final position for that filing year.
interface YearRow {
  year: number;
  primaryIncome: number;   // Gross Income (personal) or Annual Turnover (company)
  taxableAmount: number;   // Taxable Income (personal) or Taxable Profit (company)
  totalTax: number;
  effectiveRate: number;
  netAmount: number;       // Net Income (personal) or Net Profit (company)
}

function buildYearRows(taxHistory: TaxCalculation[], type: TaxType): YearRow[] {
  const filtered = taxHistory
    .filter((t) => t.type === type)
    .slice()
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

  const latestByYear = new Map<number, TaxCalculation>();
  for (const calc of filtered) {
    const year = new Date(calc.date).getFullYear();
    latestByYear.set(year, calc); // later entries overwrite earlier ones for the same year
  }

  return Array.from(latestByYear.entries())
    .map(([year, calc]) => {
      const r = calc.result ?? {};
      return {
        year,
        primaryIncome: type === 'personal' ? (r.grossIncome ?? 0) : (r.annualTurnover ?? 0),
        taxableAmount: type === 'personal' ? (r.taxableIncome ?? 0) : (r.taxableProfit ?? 0),
        totalTax: r.totalTax ?? 0,
        effectiveRate: r.effectiveRate ?? 0,
        netAmount: type === 'personal' ? (r.netIncome ?? 0) : (r.netProfit ?? 0),
      };
    })
    .sort((a, b) => a.year - b.year);
}

const MultiYearComparison: React.FC<Props> = ({ taxHistory }) => {
  const personalRows = useMemo(() => buildYearRows(taxHistory, 'personal'), [taxHistory]);
  const companyRows = useMemo(() => buildYearRows(taxHistory, 'company'), [taxHistory]);

  const [selectedType, setSelectedType] = useState<TaxType>(
    companyRows.length >= personalRows.length ? 'company' : 'personal'
  );

  const rows = selectedType === 'personal' ? personalRows : companyRows;
  const hasBoth = personalRows.length > 0 && companyRows.length > 0;
  const hasAnyData = personalRows.length > 0 || companyRows.length > 0;

  const latest = rows[rows.length - 1];
  const previous = rows.length >= 2 ? rows[rows.length - 2] : undefined;

  const primaryLabel = selectedType === 'personal' ? 'Gross Income' : 'Annual Turnover';
  const taxableLabel = selectedType === 'personal' ? 'Taxable Income' : 'Taxable Profit';
  const netLabel = selectedType === 'personal' ? 'Net Income' : 'Net Profit';

  const pctChange = (curr: number, prev: number): number | null => {
    if (!prev) return null;
    return ((curr - prev) / Math.abs(prev)) * 100;
  };

  const barData = {
    labels: rows.map((r) => String(r.year)),
    datasets: [
      {
        label: primaryLabel,
        data: rows.map((r) => r.primaryIncome),
        backgroundColor: 'rgba(59, 130, 246, 0.75)',
        borderColor: 'rgb(37, 99, 235)',
        borderWidth: 1,
        borderRadius: 5,
      },
      {
        label: 'Total Tax',
        data: rows.map((r) => r.totalTax),
        backgroundColor: 'rgba(239, 68, 68, 0.75)',
        borderColor: 'rgb(220, 38, 38)',
        borderWidth: 1,
        borderRadius: 5,
      },
      {
        label: netLabel,
        data: rows.map((r) => r.netAmount),
        backgroundColor: 'rgba(34, 197, 94, 0.75)',
        borderColor: 'rgb(22, 163, 74)',
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

  const ChangeBadge: React.FC<{ value: number | null; invertColor?: boolean }> = ({ value, invertColor }) => {
    if (value === null) return <span className="text-xs text-gray-400">—</span>;
    const isUp = value > 0;
    const isFlat = Math.abs(value) < 0.05;
    // For most metrics, "up" is just informational (green). For effective
    // rate, a lower rate is the favourable direction, so colouring is flipped.
    const favourable = invertColor ? !isUp : isUp;
    const color = isFlat ? 'text-gray-500' : favourable ? 'text-emerald-600' : 'text-orange-600';
    return (
      <span className={`inline-flex items-center gap-1 text-xs font-semibold ${color}`}>
        {!isFlat && (
          <svg className={`w-3 h-3 ${isUp ? '' : 'rotate-180'}`} fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M10 3a1 1 0 01.7.29l5 5a1 1 0 01-1.4 1.42L11 6.41V16a1 1 0 11-2 0V6.41L5.7 9.71a1 1 0 01-1.4-1.42l5-5A1 1 0 0110 3z" clipRule="evenodd" />
          </svg>
        )}
        {isFlat ? 'No change' : `${Math.abs(value).toFixed(1)}%`}
      </span>
    );
  };

  if (!hasAnyData) {
    return (
      <div className="text-center py-8 bg-white rounded-xl border border-dashed border-gray-300">
        <div className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-3">
          <svg className="w-6 h-6 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
          </svg>
        </div>
        <p className="text-sm font-medium text-gray-700">No saved calculations yet</p>
        <p className="text-xs text-gray-400 mt-1">
          Run a Personal or Company Tax calculation to start building your year-over-year comparison.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-5">

      {/* Type toggle — only shown when both types have data */}
      {hasBoth && (
        <div className="inline-flex bg-gray-100 rounded-lg p-1">
          <button
            onClick={() => setSelectedType('personal')}
            className={`px-4 py-1.5 rounded-md text-sm font-medium transition-colors ${
              selectedType === 'personal' ? 'bg-white text-primary-700 shadow-sm' : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            Personal Tax
          </button>
          <button
            onClick={() => setSelectedType('company')}
            className={`px-4 py-1.5 rounded-md text-sm font-medium transition-colors ${
              selectedType === 'company' ? 'bg-white text-primary-700 shadow-sm' : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            Company Tax
          </button>
        </div>
      )}

      {rows.length === 0 && (
        <div className="text-center py-8 bg-white rounded-xl border border-dashed border-gray-300">
          <p className="text-sm font-medium text-gray-700">
            No {selectedType === 'personal' ? 'Personal' : 'Company'} Tax calculations yet
          </p>
          <p className="text-xs text-gray-400 mt-1">Run one to see it appear here.</p>
        </div>
      )}

      {rows.length === 1 && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 text-sm text-blue-700">
          You have one year of data so far ({latest.year}). Save a calculation next filing year to
          unlock a year-over-year comparison.
        </div>
      )}

      {/* Headline: latest year vs previous year */}
      {latest && previous && (
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <h3 className="text-sm font-semibold text-gray-700 mb-4">
            {latest.year} vs {previous.year}
          </h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div>
              <div className="text-xs text-gray-500 uppercase tracking-wide">{primaryLabel}</div>
              <div className="text-lg font-bold text-gray-900 mt-0.5">{shortCurrency(latest.primaryIncome)}</div>
              <ChangeBadge value={pctChange(latest.primaryIncome, previous.primaryIncome)} />
            </div>
            <div>
              <div className="text-xs text-gray-500 uppercase tracking-wide">{taxableLabel}</div>
              <div className="text-lg font-bold text-gray-900 mt-0.5">{shortCurrency(latest.taxableAmount)}</div>
              <ChangeBadge value={pctChange(latest.taxableAmount, previous.taxableAmount)} />
            </div>
            <div>
              <div className="text-xs text-gray-500 uppercase tracking-wide">Total Tax</div>
              <div className="text-lg font-bold text-red-600 mt-0.5">{shortCurrency(latest.totalTax)}</div>
              <ChangeBadge value={pctChange(latest.totalTax, previous.totalTax)} />
            </div>
            <div>
              <div className="text-xs text-gray-500 uppercase tracking-wide">Effective Rate</div>
              <div className="text-lg font-bold text-gray-900 mt-0.5">{latest.effectiveRate.toFixed(1)}%</div>
              <ChangeBadge value={pctChange(latest.effectiveRate, previous.effectiveRate)} invertColor />
            </div>
          </div>
        </div>
      )}

      {/* Trend chart across all years */}
      {rows.length > 0 && (
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <h3 className="text-sm font-semibold text-gray-700 mb-4">
            {primaryLabel}, Total Tax & {netLabel} by Year
          </h3>
          <div style={{ height: 240 }}>
            <Bar data={barData} options={barOptions} />
          </div>
        </div>
      )}

      {/* Full year-by-year table */}
      {rows.length > 0 && (
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <div className="px-5 py-3 border-b border-gray-100">
            <h3 className="text-sm font-semibold text-gray-700">Year-by-Year Detail</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50">
                  <th className="px-4 py-2 text-left text-gray-600 font-medium">Year</th>
                  <th className="px-4 py-2 text-right text-gray-600 font-medium">{primaryLabel}</th>
                  <th className="px-4 py-2 text-right text-gray-600 font-medium">{taxableLabel}</th>
                  <th className="px-4 py-2 text-right text-gray-600 font-medium">Total Tax</th>
                  <th className="px-4 py-2 text-right text-gray-600 font-medium">Effective Rate</th>
                  <th className="px-4 py-2 text-right text-gray-600 font-medium">{netLabel}</th>
                </tr>
              </thead>
              <tbody>
                {rows.slice().reverse().map((r) => (
                  <tr key={r.year} className="border-t border-gray-100">
                    <td className="px-4 py-2 font-medium text-gray-800">{r.year}</td>
                    <td className="px-4 py-2 text-right text-gray-700">{formatCurrency(r.primaryIncome)}</td>
                    <td className="px-4 py-2 text-right text-gray-700">{formatCurrency(r.taxableAmount)}</td>
                    <td className="px-4 py-2 text-right text-red-600">{formatCurrency(r.totalTax)}</td>
                    <td className="px-4 py-2 text-right text-gray-700">{r.effectiveRate.toFixed(1)}%</td>
                    <td className="px-4 py-2 text-right text-emerald-700">{formatCurrency(r.netAmount)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="text-xs text-gray-400 px-5 py-3 border-t border-gray-100">
            Where more than one calculation was saved in the same year, the most recent is shown as
            that year's figure.
          </p>
        </div>
      )}
    </div>
  );
};

export default MultiYearComparison;

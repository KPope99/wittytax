import React, { useMemo, useState } from 'react';
import { Revenue, Expense } from '../context/AuthContext';
import {
  analyzeCashFlow,
  CashFlowRecommendation,
  RecommendationSeverity,
  RecommendationArea,
} from '../utils/cashFlowRecommendations';

interface Props {
  revenues: Revenue[];
  expenses: Expense[];
}

// ── Severity config ───────────────────────────────────────────────────────────
const SEVERITY: Record<RecommendationSeverity, {
  label: string; bg: string; border: string; badge: string; icon: React.ReactNode;
}> = {
  critical: {
    label: 'Critical',
    bg: 'bg-red-50',
    border: 'border-red-200',
    badge: 'bg-red-100 text-red-700',
    icon: (
      <svg className="w-5 h-5 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
          d="M12 9v2m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
      </svg>
    ),
  },
  warning: {
    label: 'Warning',
    bg: 'bg-amber-50',
    border: 'border-amber-200',
    badge: 'bg-amber-100 text-amber-700',
    icon: (
      <svg className="w-5 h-5 text-amber-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
          d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    ),
  },
  opportunity: {
    label: 'Opportunity',
    bg: 'bg-emerald-50',
    border: 'border-emerald-200',
    badge: 'bg-emerald-100 text-emerald-700',
    icon: (
      <svg className="w-5 h-5 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
          d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
      </svg>
    ),
  },
  insight: {
    label: 'Insight',
    bg: 'bg-blue-50',
    border: 'border-blue-200',
    badge: 'bg-blue-100 text-blue-700',
    icon: (
      <svg className="w-5 h-5 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
          d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
      </svg>
    ),
  },
};

const AREA_LABEL: Record<RecommendationArea, string> = {
  revenue: 'Revenue',
  expenses: 'Expenses',
  cashflow: 'Cash Flow',
  tax: 'Tax',
  funding: 'Funding',
};

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

// ── Card ─────────────────────────────────────────────────────────────────────
const RecCard: React.FC<{ rec: CashFlowRecommendation }> = ({ rec }) => {
  const [open, setOpen] = useState(false);
  const cfg = SEVERITY[rec.severity];
  return (
    <div className={`rounded-xl border ${cfg.border} ${cfg.bg} overflow-hidden transition-shadow ${open ? 'shadow-md' : 'hover:shadow-sm'}`}>
      <button
        onClick={() => setOpen(v => !v)}
        className="w-full p-4 text-left"
      >
        <div className="flex items-start gap-3">
          <div className="flex-shrink-0 mt-0.5">{cfg.icon}</div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center flex-wrap gap-2 mb-1">
              <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${cfg.badge}`}>
                {cfg.label}
              </span>
              <span className="text-xs font-medium text-gray-500 px-2 py-0.5 bg-white/70 rounded-full border border-gray-200">
                {AREA_LABEL[rec.area]}
              </span>
            </div>
            <p className="font-semibold text-gray-800 text-sm leading-snug">{rec.title}</p>
          </div>
          <svg
            className={`w-4 h-4 text-gray-400 flex-shrink-0 mt-1 transition-transform ${open ? 'rotate-180' : ''}`}
            fill="none" stroke="currentColor" viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </div>
      </button>

      {open && (
        <div className="px-4 pb-4 border-t border-gray-200/60">
          <p className="text-sm text-gray-700 mt-3 leading-relaxed">{rec.description}</p>

          <div className="mt-3 bg-white/80 rounded-lg p-3 border border-gray-200">
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">Recommended Action</p>
            <p className="text-sm text-gray-800 leading-relaxed">{rec.action}</p>
          </div>

          <div className="mt-3 flex items-start gap-2">
            <svg className="w-4 h-4 text-emerald-500 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <p className="text-xs text-gray-600 italic">{rec.impact}</p>
          </div>
        </div>
      )}
    </div>
  );
};

// ── Main component ────────────────────────────────────────────────────────────
const CashFlowRecommendations: React.FC<Props> = ({ revenues, expenses }) => {
  const [filterArea, setFilterArea] = useState<RecommendationArea | 'all'>('all');

  const analysis = useMemo(() => analyzeCashFlow(revenues, expenses), [revenues, expenses]);
  const hasData = revenues.length > 0 || expenses.length > 0;

  const riskCfg = RISK_CONFIG[analysis.riskLevel];

  const filtered = filterArea === 'all'
    ? analysis.recommendations
    : analysis.recommendations.filter(r => r.area === filterArea);

  const counts = {
    critical: analysis.recommendations.filter(r => r.severity === 'critical').length,
    warning: analysis.recommendations.filter(r => r.severity === 'warning').length,
    opportunity: analysis.recommendations.filter(r => r.severity === 'opportunity').length,
    insight: analysis.recommendations.filter(r => r.severity === 'insight').length,
  };

  if (!hasData) {
    return (
      <div className="text-center py-12 bg-white rounded-xl border border-dashed border-gray-300">
        <div className="w-14 h-14 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-3">
          <svg className="w-7 h-7 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
              d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
          </svg>
        </div>
        <p className="text-sm font-medium text-gray-700">No financial data to analyse yet</p>
        <p className="text-xs text-gray-400 mt-1">Add revenue and expense entries in the Financials tab to get tailored recommendations.</p>
      </div>
    );
  }

  return (
    <div className="space-y-5">

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
            <p className="text-xs text-gray-500">Profit Margin</p>
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

      {/* Severity summary pills */}
      <div className="flex flex-wrap gap-2">
        {[
          { key: 'critical', label: 'Critical', count: counts.critical, badge: 'bg-red-100 text-red-700 border-red-200' },
          { key: 'warning',  label: 'Warnings', count: counts.warning,  badge: 'bg-amber-100 text-amber-700 border-amber-200' },
          { key: 'opportunity', label: 'Opportunities', count: counts.opportunity, badge: 'bg-emerald-100 text-emerald-700 border-emerald-200' },
          { key: 'insight',  label: 'Insights',  count: counts.insight,  badge: 'bg-blue-100 text-blue-700 border-blue-200' },
        ].filter(s => s.count > 0).map(s => (
          <span key={s.key} className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold border ${s.badge}`}>
            <span className="text-sm font-bold">{s.count}</span>
            {s.label}
          </span>
        ))}
      </div>

      {/* Area filter */}
      <div className="flex flex-wrap gap-1.5">
        {(['all', 'revenue', 'expenses', 'cashflow', 'tax', 'funding'] as const).map(area => (
          <button
            key={area}
            onClick={() => setFilterArea(area)}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors border ${
              filterArea === area
                ? 'bg-primary-600 text-white border-primary-600'
                : 'bg-white text-gray-600 border-gray-200 hover:border-primary-300 hover:text-primary-600'
            }`}
          >
            {area === 'all' ? 'All' : AREA_LABEL[area]}
            {area !== 'all' && (
              <span className="ml-1 opacity-70">
                ({analysis.recommendations.filter(r => r.area === area).length})
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Recommendation cards */}
      {filtered.length === 0 ? (
        <div className="text-center py-8 bg-white rounded-xl border border-dashed border-gray-300">
          <p className="text-sm text-gray-500">No recommendations in this category.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map(rec => <RecCard key={rec.id} rec={rec} />)}
        </div>
      )}

      {/* Revenue diversity insight */}
      {revenues.length > 0 && (
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <div className="flex items-center justify-between mb-2">
            <p className="text-sm font-semibold text-gray-700">Revenue Diversification Score</p>
            <span className={`text-lg font-bold ${
              analysis.revenueDiversityScore >= 60 ? 'text-emerald-600' :
              analysis.revenueDiversityScore >= 30 ? 'text-amber-600' : 'text-red-500'
            }`}>{analysis.revenueDiversityScore}/100</span>
          </div>
          <div className="w-full bg-gray-100 rounded-full h-2">
            <div
              className={`h-2 rounded-full transition-all ${
                analysis.revenueDiversityScore >= 60 ? 'bg-emerald-500' :
                analysis.revenueDiversityScore >= 30 ? 'bg-amber-500' : 'bg-red-500'
              }`}
              style={{ width: `${analysis.revenueDiversityScore}%` }}
            />
          </div>
          <p className="text-xs text-gray-400 mt-2">
            {analysis.revenueDiversityScore >= 60
              ? 'Well-diversified revenue base — good resilience against client or market shocks.'
              : analysis.revenueDiversityScore >= 30
              ? 'Moderate concentration — adding one more revenue stream would improve financial resilience.'
              : 'High concentration risk — revenue depends on very few sources.'}
          </p>
        </div>
      )}

      <p className="text-xs text-gray-400 text-center pt-1">
        Recommendations are based on your actual financial data and NTA 2025 provisions. Consult a qualified accountant for personalised advice.
      </p>
      <p className="text-xs text-gray-400 text-center">© Tech84 Alliance</p>
    </div>
  );
};

export default CashFlowRecommendations;

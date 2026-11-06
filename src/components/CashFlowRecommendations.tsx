import React, { useCallback, useMemo, useState } from 'react';
import { TaxCalculation, Revenue, Expense, useAuth, API_BASE } from '../context/AuthContext';
import { deriveBusinessFinancials } from '../utils/taxCalculations';
import { buildMonthlyLedger } from '../utils/monthlyLedger';
import { getCanonicalCompanyCalc } from '../utils/canonicalCompanyCalc';
import { getBusinessTypeById } from '../utils/businessTypes';
import {
  analyzeCashFlow,
  CashFlowRecommendation,
  RecommendationSeverity,
  RecommendationArea,
  TaxPeriodPoint,
  CompanyProfile,
} from '../utils/cashFlowRecommendations';

interface Props {
  taxHistory: TaxCalculation[];
  revenues: Revenue[];
  expenses: Expense[];
}

interface AIOpportunity {
  id: string;
  title: string;
  description: string;
  action: string;
  impact: string;
  priority: 'high' | 'medium' | 'low';
  area: RecommendationArea;
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

const PRIORITY_LABEL: Record<AIOpportunity['priority'], string> = { high: 'High Priority', medium: 'Medium Priority', low: 'Low Priority' };
const PRIORITY_BADGE: Record<AIOpportunity['priority'], string> = {
  high: 'bg-indigo-200 text-indigo-800',
  medium: 'bg-indigo-100 text-indigo-700',
  low: 'bg-indigo-50 text-indigo-600',
};

// ── AI opportunity card — visually distinct (indigo/sparkle) from the free
// rule-based cards so it's clear which recommendations came from AI vs the
// deterministic rules engine. ─────────────────────────────────────────────
const AICard: React.FC<{ opp: AIOpportunity }> = ({ opp }) => {
  const [open, setOpen] = useState(false);
  return (
    <div className={`rounded-xl border border-indigo-200 bg-indigo-50/60 overflow-hidden transition-shadow ${open ? 'shadow-md' : 'hover:shadow-sm'}`}>
      <button onClick={() => setOpen(v => !v)} className="w-full p-4 text-left">
        <div className="flex items-start gap-3">
          <div className="flex-shrink-0 mt-0.5">
            <svg className="w-5 h-5 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" />
            </svg>
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center flex-wrap gap-2 mb-1">
              <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-indigo-600 text-white">AI Opportunity</span>
              <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${PRIORITY_BADGE[opp.priority]}`}>
                {PRIORITY_LABEL[opp.priority]}
              </span>
              <span className="text-xs font-medium text-gray-500 px-2 py-0.5 bg-white/70 rounded-full border border-gray-200">
                {AREA_LABEL[opp.area]}
              </span>
            </div>
            <p className="font-semibold text-gray-800 text-sm leading-snug">{opp.title}</p>
          </div>
          <svg className={`w-4 h-4 text-gray-400 flex-shrink-0 mt-1 transition-transform ${open ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </div>
      </button>
      {open && (
        <div className="px-4 pb-4 border-t border-indigo-200/60">
          <p className="text-sm text-gray-700 mt-3 leading-relaxed">{opp.description}</p>
          <div className="mt-3 bg-white/80 rounded-lg p-3 border border-indigo-100">
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">Recommended Action</p>
            <p className="text-sm text-gray-800 leading-relaxed">{opp.action}</p>
          </div>
          <div className="mt-3 flex items-start gap-2">
            <svg className="w-4 h-4 text-indigo-500 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <p className="text-xs text-gray-600 italic">{opp.impact}</p>
          </div>
        </div>
      )}
    </div>
  );
};

// ── Main component ────────────────────────────────────────────────────────────
const CashFlowRecommendations: React.FC<Props> = ({ taxHistory, revenues, expenses }) => {
  const { isPremium } = useAuth();
  const [filterArea, setFilterArea] = useState<RecommendationArea | 'all'>('all');
  const [aiOpportunities, setAiOpportunities] = useState<AIOpportunity[] | null>(null);
  const [aiLoading, setAiLoading] = useState(false);
  const [aiError, setAiError] = useState<string | null>(null);

  // Monthly P&L records (Financials > Monthly P&L) are real bookkeeping and
  // take priority over calculation snapshots when present — same precedent
  // as the Overview trend chart, so risk analysis never disagrees with it.
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

  // Always the true annual figures from the most recent Company Tax
  // calculation, independent of whether `periods` above is monthly or
  // annual — regulatory thresholds (NTA 2025 small company cap) need the
  // real annual turnover, never a single trend period's revenue.
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

  const sectorName = useMemo(() => {
    const sector = (canonicalCalc?.result as any)?.businessSector;
    return sector ? getBusinessTypeById(sector)?.name ?? null : null;
  }, [canonicalCalc]);

  const analysis = useMemo(() => analyzeCashFlow(periods, companyProfile), [periods, companyProfile]);
  const hasData = periods.length > 0;

  const handleGenerateAI = useCallback(async () => {
    setAiLoading(true);
    setAiError(null);
    const token = localStorage.getItem('auth_token');
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 60_000);
    try {
      const res = await fetch(`${API_BASE}/recommendations/cashflow`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          analysis: {
            totalRevenue: analysis.totalRevenue,
            totalExpenses: analysis.totalExpenses,
            netProfit: analysis.netProfit,
            profitMargin: analysis.profitMargin,
            expenseRatio: analysis.expenseRatio,
            trend: analysis.trend,
            revenueTrend: analysis.revenueTrend,
            expenseTrend: analysis.expenseTrend,
            riskLevel: analysis.riskLevel,
            recommendations: analysis.recommendations.map((r) => ({ title: r.title })),
          },
          companyProfile,
          sectorName,
          dataSource: usingMonthlyLedger ? 'monthly_ledger' : 'calculation_snapshot',
        }),
        signal: controller.signal,
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(body.error || 'Failed to generate opportunities');
      setAiOpportunities(body.opportunities);
    } catch (err: any) {
      const message = err?.name === 'AbortError'
        ? 'This is taking longer than expected. Please try again.'
        : err.message ?? 'Something went wrong. Please try again.';
      setAiError(message);
    } finally {
      clearTimeout(timeoutId);
      setAiLoading(false);
    }
  }, [analysis, companyProfile, sectorName, usingMonthlyLedger]);

  const filtered = filterArea === 'all'
    ? analysis.recommendations
    : analysis.recommendations.filter(r => r.area === filterArea);

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
        <p className="text-xs text-gray-400 mt-1">Run a Company Tax calculation in the Wizard or Detailed Calculator to get tailored recommendations.</p>
      </div>
    );
  }

  return (
    <div className="space-y-5">

      {/* The risk/margin/trend summary (caption, reconciliation warning,
          risk banner, trend strip) now lives in Bookkeeping, above
          Financials — right next to the Monthly P&L data it's computed
          from. See CashFlowSummary.tsx. */}

      {/* Area filter — severity is already visible per-card (badge + color),
          so this is the only count/filter row needed instead of stacking a
          second, duplicate severity-count row above it. */}
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

      {/* Recommendation cards — rule-based (analyzeCashFlow / if-else
          logic, computed client-side from the user's own data), not AI, so
          there's no marginal cost to showing the full list to everyone.
          Only the genuinely AI-generated layer below (AI-Powered
          Opportunities, GPT-4o + web search) stays Premium-gated. */}
      {filtered.length === 0 ? (
        <div className="text-center py-8 bg-white rounded-xl border border-dashed border-gray-300">
          <p className="text-sm text-gray-500">No recommendations in this category.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map(rec => <RecCard key={rec.id} rec={rec} />)}
        </div>
      )}

      {/* AI-Powered Opportunities (Premium) — supplements the free rule-based
          cards above with sector- and macro-aware reasoning an if/else rules
          engine can't do. For free users, a small "Premium" badge next to
          the heading is the only gate indicator — no separate unlock card
          underneath, since that duplicated what the badge already says. */}
      <div className="pt-4 border-t border-gray-200">
        <div className="mb-3">
          <h4 className="text-sm font-bold text-gray-800 flex items-center gap-1.5">
            <svg className="w-4 h-4 text-primary-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" />
            </svg>
            AI-Powered Opportunities
            {!isPremium && (
              <span className="text-[10px] font-semibold uppercase tracking-wide px-1.5 py-0.5 rounded bg-indigo-100 text-indigo-700">
                Premium
              </span>
            )}
          </h4>
          <p className="text-xs text-gray-500 mt-0.5">
            Sector- and macro-aware recommendations beyond the rules above{sectorName ? ` — tailored to ${sectorName}` : ''}.
          </p>
        </div>

        {isPremium && (
          <>
            <div className="flex justify-end mb-3">
              <button
                onClick={handleGenerateAI}
                disabled={aiLoading}
                className="px-4 py-2 bg-primary-600 hover:bg-primary-700 text-white text-xs font-semibold rounded-lg disabled:opacity-50 transition-colors flex items-center gap-1.5"
              >
                {aiLoading ? 'Generating…' : aiOpportunities ? 'Regenerate' : 'Generate with AI'}
              </button>
            </div>

            {aiError && (
              <p className="text-xs text-red-600 mb-2">{aiError}</p>
            )}

            {!aiOpportunities && !aiLoading && !aiError && (
              <div className="text-center py-6 bg-gray-50 rounded-xl border border-dashed border-gray-200">
                <p className="text-xs text-gray-500">Click "Generate with AI" for recommendations tailored to your sector and Nigeria's current economic environment.</p>
              </div>
            )}

            {aiOpportunities && (
              <div className="space-y-3">
                {aiOpportunities.map(opp => <AICard key={opp.id} opp={opp} />)}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
};

export default CashFlowRecommendations;

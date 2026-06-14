import React, { useState, useMemo } from 'react';
import { useAuth } from '../context/AuthContext';
import { formatCurrency } from '../utils/taxCalculations';

interface RevenueRow { period: string; conservative: number; moderate: number; optimistic: number; }
interface ProfitRow { period: string; grossMarginPct: number; netMarginPct: number; estimatedNetProfit: number; }
interface Risk { factor: string; impact: string; likelihood: 'Low' | 'Medium' | 'High'; }
interface PolicyImpact { policy: string; effect: string; recommendation: string; }
interface SectorTrend { trend: string; localImpact: string; globalContext: string; }

interface ForecastResult {
  executiveSummary: string;
  revenueForecasts: RevenueRow[];
  profitabilityForecasts: ProfitRow[];
  keyGrowthDrivers: string[];
  risks: Risk[];
  nigeriaPolicyImpacts: PolicyImpact[];
  sectorTrends: SectorTrend[];
  taxOptimizations: string[];
  strategicRecommendations: string[];
}

const NIGERIAN_SECTORS = [
  'Agriculture', 'Banking & Finance', 'Construction & Real Estate', 'Education',
  'Energy & Power', 'Fast-Moving Consumer Goods (FMCG)', 'Healthcare & Pharma',
  'Information Technology', 'Insurance', 'Logistics & Transportation',
  'Manufacturing', 'Media & Entertainment', 'Mining & Metals', 'Oil & Gas',
  'Retail & E-commerce', 'Telecommunications', 'Tourism & Hospitality', 'Other',
];

const BUSINESS_TYPES = [
  'Sole Trader', 'Partnership', 'Limited Liability Company (LLC)',
  'Public Limited Company (PLC)', 'NGO / Non-Profit', 'Cooperative', 'Startup',
];

const FORECAST_PERIODS = ['1 year', '2 years', '3 years', '5 years'];

const riskColor = (likelihood: string) => {
  if (likelihood === 'High') return 'bg-red-100 text-red-700 border-red-200';
  if (likelihood === 'Medium') return 'bg-yellow-100 text-yellow-700 border-yellow-200';
  return 'bg-green-100 text-green-700 border-green-200';
};

const ForecastingEngine: React.FC = () => {
  const { user, revenues, expenses, taxHistory } = useAuth();

  // Derive pre-filled values from existing data
  const prefilled = useMemo(() => {
    const totalRevenue = revenues.reduce((sum, r) => sum + r.amount, 0);
    const totalExpenses = expenses.reduce((sum, e) => sum + e.amount, 0);

    // Find most recent company tax result
    const companyTax = [...taxHistory]
      .filter((h) => h.type === 'company')
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())[0];
    const taxPaid = companyTax?.result?.totalTax ?? 0;

    return {
      annualRevenue: totalRevenue > 0 ? Math.round(totalRevenue).toString() : '',
      totalExpenses: totalExpenses > 0 ? Math.round(totalExpenses).toString() : '',
      taxPaid: taxPaid > 0 ? Math.round(taxPaid).toString() : '',
    };
  }, [revenues, expenses, taxHistory]);

  const [form, setForm] = useState({
    sector: '',
    businessType: '',
    annualRevenue: prefilled.annualRevenue,
    totalExpenses: prefilled.totalExpenses,
    taxPaid: prefilled.taxPaid,
    employeeCount: '',
    yearsInOperation: '',
    forecastPeriod: '3 years',
    additionalContext: '',
  });

  const [progress, setProgress] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState<ForecastResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    setForm((f) => ({ ...f, [e.target.name]: e.target.value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setProgress([]);
    setResult(null);
    setError(null);

    const token = localStorage.getItem('token');
    if (!token) {
      setError('Not authenticated');
      setIsLoading(false);
      return;
    }

    try {
      const res = await fetch('/api/forecast/generate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          sector: form.sector,
          businessType: form.businessType,
          annualRevenue: Number(form.annualRevenue.replace(/,/g, '')),
          totalExpenses: form.totalExpenses ? Number(form.totalExpenses.replace(/,/g, '')) : undefined,
          taxPaid: form.taxPaid ? Number(form.taxPaid.replace(/,/g, '')) : undefined,
          employeeCount: form.employeeCount ? Number(form.employeeCount) : undefined,
          yearsInOperation: form.yearsInOperation ? Number(form.yearsInOperation) : undefined,
          forecastPeriod: form.forecastPeriod,
          additionalContext: form.additionalContext || undefined,
        }),
      });

      if (!res.ok || !res.body) {
        const body = await res.json().catch(() => ({}));
        throw new Error((body as any).error || 'Request failed');
      }

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });

        const lines = buffer.split('\n');
        buffer = lines.pop() ?? '';

        let currentEvent = '';
        for (const line of lines) {
          if (line.startsWith('event: ')) {
            currentEvent = line.slice(7).trim();
          } else if (line.startsWith('data: ')) {
            try {
              const payload = JSON.parse(line.slice(6));
              if (currentEvent === 'progress') {
                setProgress((prev) => [...prev, payload.step]);
              } else if (currentEvent === 'complete') {
                setResult(payload.forecast);
                setIsLoading(false);
              } else if (currentEvent === 'error') {
                throw new Error(payload.message);
              }
            } catch (parseErr: any) {
              if (parseErr?.message && !parseErr.message.includes('JSON')) throw parseErr;
            }
          }
        }
      }
    } catch (err: any) {
      setError(err.message ?? 'Something went wrong. Please try again.');
      setIsLoading(false);
    }
  };

  if (result) {
    return (
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold text-gray-800">AI Business Forecast</h2>
            <p className="text-sm text-gray-500">{user?.companyName} · {form.sector} · {form.forecastPeriod}</p>
          </div>
          <button
            onClick={() => { setResult(null); setProgress([]); }}
            className="px-4 py-2 text-sm bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors"
          >
            New Forecast
          </button>
        </div>

        {/* Executive Summary */}
        <div className="bg-gradient-to-br from-primary-50 to-primary-100 rounded-xl p-5 border border-primary-200">
          <h3 className="font-semibold text-primary-800 mb-2 flex items-center gap-2">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            Executive Summary
          </h3>
          <p className="text-primary-900 text-sm leading-relaxed">{result.executiveSummary}</p>
        </div>

        {/* Revenue Forecast Table */}
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <div className="px-5 py-4 border-b border-gray-100 flex items-center gap-2">
            <svg className="w-4 h-4 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
            </svg>
            <h3 className="font-semibold text-gray-800">Revenue Forecast (₦)</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50">
                  <th className="px-5 py-3 text-left font-medium text-gray-600">Period</th>
                  <th className="px-5 py-3 text-right font-medium text-red-600">Conservative</th>
                  <th className="px-5 py-3 text-right font-medium text-yellow-600">Moderate</th>
                  <th className="px-5 py-3 text-right font-medium text-green-600">Optimistic</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {result.revenueForecasts.map((row) => (
                  <tr key={row.period} className="hover:bg-gray-50">
                    <td className="px-5 py-3 font-medium text-gray-800">{row.period}</td>
                    <td className="px-5 py-3 text-right text-red-700">{formatCurrency(row.conservative)}</td>
                    <td className="px-5 py-3 text-right text-yellow-700">{formatCurrency(row.moderate)}</td>
                    <td className="px-5 py-3 text-right text-green-700">{formatCurrency(row.optimistic)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Profitability Forecast */}
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <div className="px-5 py-4 border-b border-gray-100 flex items-center gap-2">
            <svg className="w-4 h-4 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
            </svg>
            <h3 className="font-semibold text-gray-800">Profitability Forecast</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50">
                  <th className="px-5 py-3 text-left font-medium text-gray-600">Period</th>
                  <th className="px-5 py-3 text-right font-medium text-gray-600">Gross Margin %</th>
                  <th className="px-5 py-3 text-right font-medium text-gray-600">Net Margin %</th>
                  <th className="px-5 py-3 text-right font-medium text-gray-600">Est. Net Profit</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {result.profitabilityForecasts.map((row) => (
                  <tr key={row.period} className="hover:bg-gray-50">
                    <td className="px-5 py-3 font-medium text-gray-800">{row.period}</td>
                    <td className="px-5 py-3 text-right text-gray-700">{row.grossMarginPct.toFixed(1)}%</td>
                    <td className="px-5 py-3 text-right text-gray-700">{row.netMarginPct.toFixed(1)}%</td>
                    <td className="px-5 py-3 text-right font-semibold text-purple-700">{formatCurrency(row.estimatedNetProfit)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Key Drivers & Risks side by side */}
        <div className="grid md:grid-cols-2 gap-4">
          <div className="bg-white rounded-xl border border-gray-200 p-5">
            <h3 className="font-semibold text-gray-800 mb-3 flex items-center gap-2">
              <svg className="w-4 h-4 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
              Key Growth Drivers
            </h3>
            <ul className="space-y-2">
              {result.keyGrowthDrivers.map((d, i) => (
                <li key={i} className="flex gap-2 text-sm text-gray-700">
                  <span className="text-green-500 font-bold flex-shrink-0">↑</span>
                  {d}
                </li>
              ))}
            </ul>
          </div>

          <div className="bg-white rounded-xl border border-gray-200 p-5">
            <h3 className="font-semibold text-gray-800 mb-3 flex items-center gap-2">
              <svg className="w-4 h-4 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
              Risk Factors
            </h3>
            <ul className="space-y-2">
              {result.risks.map((r, i) => (
                <li key={i} className="text-sm">
                  <div className="flex items-start gap-2">
                    <span className={`text-xs px-1.5 py-0.5 rounded border font-medium flex-shrink-0 mt-0.5 ${riskColor(r.likelihood)}`}>
                      {r.likelihood}
                    </span>
                    <div>
                      <p className="font-medium text-gray-800">{r.factor}</p>
                      <p className="text-gray-500">{r.impact}</p>
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* Nigeria Policy Impacts */}
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <h3 className="font-semibold text-gray-800 mb-3 flex items-center gap-2">
            <svg className="w-4 h-4 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 6l3 1m0 0l-3 9a5.002 5.002 0 006.001 0M6 7l3 9M6 7l6-2m6 2l3-1m-3 1l-3 9a5.002 5.002 0 006.001 0M18 7l3 9m-3-9l-6-2m0-2v2m0 16V5m0 16H9m3 0h3" />
            </svg>
            Nigerian Government Policy Impacts
          </h3>
          <div className="space-y-3">
            {result.nigeriaPolicyImpacts.map((p, i) => (
              <div key={i} className="bg-blue-50 rounded-lg p-3 border border-blue-100">
                <p className="font-medium text-blue-800 text-sm">{p.policy}</p>
                <p className="text-gray-700 text-sm mt-1">{p.effect}</p>
                <p className="text-primary-700 text-xs mt-1 font-medium">Recommendation: {p.recommendation}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Sector Trends */}
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <h3 className="font-semibold text-gray-800 mb-3 flex items-center gap-2">
            <svg className="w-4 h-4 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 104 0 2 2 0 012-2h1.064M15 20.488V18a2 2 0 012-2h3.064" />
            </svg>
            Sector Trends — {form.sector}
          </h3>
          <div className="space-y-3">
            {result.sectorTrends.map((t, i) => (
              <div key={i} className="border border-gray-100 rounded-lg p-3">
                <p className="font-medium text-gray-800 text-sm">{t.trend}</p>
                <div className="mt-1.5 grid md:grid-cols-2 gap-2 text-xs text-gray-600">
                  <p><span className="font-medium text-gray-700">Local impact:</span> {t.localImpact}</p>
                  <p><span className="font-medium text-gray-700">Global context:</span> {t.globalContext}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Tax Optimizations */}
        <div className="bg-amber-50 rounded-xl border border-amber-200 p-5">
          <h3 className="font-semibold text-amber-900 mb-3 flex items-center gap-2">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            Tax Optimisation Opportunities
          </h3>
          <ul className="space-y-2">
            {result.taxOptimizations.map((t, i) => (
              <li key={i} className="flex gap-2 text-sm text-amber-900">
                <span className="text-amber-500 font-bold flex-shrink-0">•</span>
                {t}
              </li>
            ))}
          </ul>
        </div>

        {/* Strategic Recommendations */}
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <h3 className="font-semibold text-gray-800 mb-3 flex items-center gap-2">
            <svg className="w-4 h-4 text-primary-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
            </svg>
            Strategic Recommendations
          </h3>
          <ol className="space-y-2">
            {result.strategicRecommendations.map((r, i) => (
              <li key={i} className="flex gap-3 text-sm text-gray-700">
                <span className="w-5 h-5 rounded-full bg-primary-100 text-primary-700 text-xs font-bold flex items-center justify-center flex-shrink-0 mt-0.5">
                  {i + 1}
                </span>
                {r}
              </li>
            ))}
          </ol>
        </div>

        <div className="text-xs text-gray-400 text-center pb-2">
          AI-generated forecast based on web research and your financial data. Not financial advice. Consult a qualified advisor before making decisions.
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div>
        <h2 className="text-xl font-bold text-gray-800">Business Forecasting Engine</h2>
        <p className="text-sm text-gray-500 mt-1">
          Enter your business details and our AI will research current Nigerian economic conditions,
          sector trends, and government policies to generate a comprehensive forecast.
        </p>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-sm text-red-700 flex gap-2">
          <svg className="w-4 h-4 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
          {error}
        </div>
      )}

      {isLoading ? (
        <div className="bg-white rounded-xl border border-gray-200 p-8 text-center space-y-5">
          <div className="w-14 h-14 mx-auto rounded-full bg-primary-100 flex items-center justify-center">
            <svg className="w-7 h-7 text-primary-600 animate-spin" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
            </svg>
          </div>
          <div>
            <p className="font-semibold text-gray-800">Generating your forecast…</p>
            <p className="text-sm text-gray-500 mt-1">
              Researching current market data, Nigerian policies, and sector trends.
              This may take 30–90 seconds.
            </p>
          </div>
          {progress.length > 0 && (
            <div className="text-left bg-gray-50 rounded-lg p-4 space-y-2">
              {progress.map((step, i) => (
                <div key={i} className="flex items-center gap-2 text-sm text-gray-600">
                  <svg className="w-3.5 h-3.5 text-green-500 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                  {step}
                </div>
              ))}
              <div className="flex items-center gap-2 text-sm text-primary-600">
                <svg className="w-3.5 h-3.5 animate-spin flex-shrink-0" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
                Analysing data…
              </div>
            </div>
          )}
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="bg-white rounded-xl border border-gray-200 p-6 space-y-5">

          {/* Fields needing user input */}
          <div>
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">Required Details</p>
            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Sector *</label>
                <select
                  name="sector"
                  value={form.sector}
                  onChange={handleChange}
                  required
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                >
                  <option value="">Select sector…</option>
                  {NIGERIAN_SECTORS.map((s) => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Business Type *</label>
                <select
                  name="businessType"
                  value={form.businessType}
                  onChange={handleChange}
                  required
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                >
                  <option value="">Select type…</option>
                  {BUSINESS_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Number of Employees</label>
                <input
                  type="number"
                  name="employeeCount"
                  value={form.employeeCount}
                  onChange={handleChange}
                  placeholder="e.g. 25"
                  min="1"
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Years in Operation</label>
                <input
                  type="number"
                  name="yearsInOperation"
                  value={form.yearsInOperation}
                  onChange={handleChange}
                  placeholder="e.g. 5"
                  min="0"
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Forecast Period</label>
                <select
                  name="forecastPeriod"
                  value={form.forecastPeriod}
                  onChange={handleChange}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                >
                  {FORECAST_PERIODS.map((p) => <option key={p} value={p}>{p}</option>)}
                </select>
              </div>
            </div>
          </div>

          {/* Pre-filled financial data */}
          <div>
            <div className="flex items-center gap-2 mb-3">
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Financial Data</p>
              {(prefilled.annualRevenue || prefilled.totalExpenses || prefilled.taxPaid) && (
                <span className="text-xs bg-green-100 text-green-700 border border-green-200 px-2 py-0.5 rounded-full font-medium">
                  Auto-filled from your records
                </span>
              )}
            </div>
            <div className="grid md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1 flex items-center gap-1.5">
                  Annual Revenue (₦) *
                  {prefilled.annualRevenue && (
                    <svg className="w-3.5 h-3.5 text-green-500" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                  )}
                </label>
                <input
                  type="text"
                  name="annualRevenue"
                  value={form.annualRevenue}
                  onChange={handleChange}
                  required
                  placeholder="e.g. 50,000,000"
                  className={`w-full border rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-primary-500 focus:border-transparent ${
                    prefilled.annualRevenue ? 'border-green-300 bg-green-50' : 'border-gray-300'
                  }`}
                />
                {prefilled.annualRevenue && (
                  <p className="text-xs text-green-600 mt-1">From {revenues.length} revenue record{revenues.length !== 1 ? 's' : ''}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1 flex items-center gap-1.5">
                  Total Expenses (₦)
                  {prefilled.totalExpenses && (
                    <svg className="w-3.5 h-3.5 text-green-500" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                  )}
                </label>
                <input
                  type="text"
                  name="totalExpenses"
                  value={form.totalExpenses}
                  onChange={handleChange}
                  placeholder="e.g. 30,000,000"
                  className={`w-full border rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-primary-500 focus:border-transparent ${
                    prefilled.totalExpenses ? 'border-green-300 bg-green-50' : 'border-gray-300'
                  }`}
                />
                {prefilled.totalExpenses && (
                  <p className="text-xs text-green-600 mt-1">From {expenses.length} expense record{expenses.length !== 1 ? 's' : ''}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1 flex items-center gap-1.5">
                  Tax Paid (₦)
                  {prefilled.taxPaid && (
                    <svg className="w-3.5 h-3.5 text-green-500" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                  )}
                </label>
                <input
                  type="text"
                  name="taxPaid"
                  value={form.taxPaid}
                  onChange={handleChange}
                  placeholder="e.g. 5,000,000"
                  className={`w-full border rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-primary-500 focus:border-transparent ${
                    prefilled.taxPaid ? 'border-green-300 bg-green-50' : 'border-gray-300'
                  }`}
                />
                {prefilled.taxPaid && (
                  <p className="text-xs text-green-600 mt-1">From your latest company tax calculation</p>
                )}
              </div>
            </div>
            {!prefilled.annualRevenue && !prefilled.totalExpenses && !prefilled.taxPaid && (
              <p className="text-xs text-gray-400 mt-2">
                Add revenue and expense records in the Financials tab to auto-fill these fields next time.
              </p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Additional Context (optional)</label>
            <textarea
              name="additionalContext"
              value={form.additionalContext}
              onChange={handleChange}
              rows={3}
              placeholder="E.g. recent expansion plans, key products/services, target markets, competitive landscape…"
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-primary-500 focus:border-transparent resize-none"
            />
          </div>

          <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 text-xs text-amber-800 flex gap-2">
            <svg className="w-4 h-4 flex-shrink-0 mt-0.5 text-amber-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <span>
              This AI will search the web for live market data, Nigerian government policies, and sector trends.
              Forecast generation typically takes 30–90 seconds.
            </span>
          </div>

          <button
            type="submit"
            className="w-full py-3 bg-primary-600 hover:bg-primary-700 text-white font-semibold rounded-lg transition-colors flex items-center justify-center gap-2"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
            </svg>
            Generate Forecast
          </button>
        </form>
      )}
    </div>
  );
};

export default ForecastingEngine;

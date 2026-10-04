import React, { useState, useCallback, useEffect, useMemo } from 'react';
import { useAuth, API_BASE } from '../context/AuthContext';
import { formatCurrency } from '../utils/taxCalculations';
import { buildMonthlyLedger } from '../utils/monthlyLedger';
import { analytics } from '../utils/analytics';
import { generateTaxRecommendations, TaxRecommendation } from '../utils/taxRecommendations';
import TaxRecommendations from './TaxRecommendations';
import BusinessPerformanceCard from './BusinessPerformanceCard';
import FinancialTracker from './FinancialTracker';
import BusinessHealthDashboard from './BusinessHealthDashboard';
import MultiYearComparison from './MultiYearComparison';
import CashFlowRecommendations from './CashFlowRecommendations';
import AdminPanel from './AdminPanel';
import ChangePassword from './ChangePassword';
import ForecastingEngine from './ForecastingEngine';

interface DashboardProps {
  onClose: () => void;
  currentTaxType: 'personal' | 'company';
  onOpenWizard: () => void;
}

const PremiumLock: React.FC<{ featureName: string }> = ({ featureName }) => {
  useEffect(() => { analytics.premiumFeatureHit(featureName); }, [featureName]);
  return (
  <div className="flex flex-col items-center justify-center py-16 px-6 text-center">
    <div className="w-16 h-16 bg-yellow-100 rounded-full flex items-center justify-center mb-4">
      <svg className="w-8 h-8 text-yellow-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
      </svg>
    </div>
    <h3 className="text-lg font-bold text-gray-800 mb-2">Premium Feature</h3>
    <p className="text-gray-500 text-sm max-w-xs">
      <span className="font-medium">{featureName}</span> is available exclusively to <span className="text-yellow-600 font-semibold">Premium</span> members. Contact your administrator to upgrade your account.
    </p>
    <div className="mt-4 px-4 py-2 bg-yellow-50 border border-yellow-200 rounded-lg text-xs text-yellow-800">
      Premium group access required
    </div>
  </div>
  );
};

const Dashboard: React.FC<DashboardProps> = ({ onClose, currentTaxType, onOpenWizard }) => {
  const { user, documents, taxHistory, revenues, expenses, logout, refreshData, isPremium, isAdmin } = useAuth();
  const [activeTab, setActiveTab] = useState<'overview' | 'financials' | 'businessHealth' | 'recommendations' | 'settings' | 'admin'>('overview');

  // Refresh data every time the dashboard opens
  useEffect(() => {
    refreshData();
    analytics.dashboardOpened();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps
  // Determine which tax type to show savings tips for from the user's most recent
  // saved calculation (the actual data they entered) rather than the calculator tab
  // that happens to be open — the wizard flow, for instance, never touches that tab.
  // Monthly P&L entries (Financials > Monthly P&L) are inherently company data —
  // turnover/expenses, never a personal concept — so a user with those but no
  // saved calculation yet is still a company user, not the generic 'personal'
  // fallback the calculator tab would otherwise default to.
  const hasMonthlyLedgerData = useMemo(() => buildMonthlyLedger(revenues, expenses).length > 0, [revenues, expenses]);
  const effectiveTaxType = taxHistory.length > 0 ? taxHistory[0].type : hasMonthlyLedgerData ? 'company' : currentTaxType;

  // AI-generated tax-saving recommendations (Premium, on-demand — uses the same
  // OpenAI GPT-4o model as the Forecasting Engine)
  const [aiRecommendations, setAiRecommendations] = useState<TaxRecommendation[] | null>(null);
  const [aiRecsLoading, setAiRecsLoading] = useState(false);
  const [aiRecsError, setAiRecsError] = useState<string | null>(null);

  const handleGenerateAIRecommendations = useCallback(async () => {
    const latestCalc = taxHistory[0];
    if (!latestCalc) return;

    setAiRecsLoading(true);
    setAiRecsError(null);

    const token = localStorage.getItem('auth_token');
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 60_000); // safety cap against a hung AI request

    try {
      const res = await fetch(`${API_BASE}/recommendations/generate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ type: latestCalc.type, result: latestCalc.result }),
        signal: controller.signal,
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(body.error || 'Failed to generate recommendations');
      }
      setAiRecommendations(body.recommendations);
    } catch (err: any) {
      const message = err?.name === 'AbortError'
        ? 'This is taking longer than expected. Please try again.'
        : err.message ?? 'Something went wrong. Please try again.';
      setAiRecsError(message);
    } finally {
      clearTimeout(timeoutId);
      setAiRecsLoading(false);
    }
  }, [taxHistory]);

  // Tax Savings and Forecast live in the same "AI Insights" tab — both are
  // AI-generated recommendations working off the same tax history, just
  // framed differently (savings/strategy vs. forward-looking projection).
  const [aiInsightsSubTab, setAiInsightsSubTab] = useState<'savings' | 'forecast'>('savings');
  // Year Comparison lives inside Business Health as a sub-tab — both are
  // history-derived business insights built from the same taxHistory data.
  const [businessHealthSubTab, setBusinessHealthSubTab] = useState<'overview' | 'yearComparison'>('overview');

  // Auto-generate once per dashboard session for premium users so they see
  // recommendations by default without needing to click first. isPremium is
  // required here even though the tab itself is gated in the JSX below —
  // activeTab/aiInsightsSubTab state isn't gated, so a free user opening this
  // tab (and seeing PremiumLock) would otherwise still trigger the API call.
  useEffect(() => {
    if (isPremium && activeTab === 'recommendations' && aiInsightsSubTab === 'savings' && taxHistory.length > 0 && !aiRecommendations && !aiRecsLoading && !aiRecsError) {
      handleGenerateAIRecommendations();
    }
  }, [isPremium, activeTab, aiInsightsSubTab, taxHistory, aiRecommendations, aiRecsLoading, aiRecsError, handleGenerateAIRecommendations]);

  // Strategy guides (Personal/Company) now live in the free Overview tab,
  // default collapsed there regardless of plan.
  const [showStrategies, setShowStrategies] = useState(false);

  return (
    <div className="min-h-screen bg-cream-100 py-6 px-4">
      <div className="bg-white rounded-xl shadow-md w-full max-w-5xl mx-auto overflow-hidden flex flex-col">
        {/* Header */}
        <div className="bg-gradient-to-r from-primary-600 to-primary-700 px-6 py-6 text-white">
          <div className="flex justify-between items-center">
            <div>
              <h2 className="text-2xl font-bold">{user?.companyName}</h2>
              <p className="text-primary-100 text-sm">{user?.email}</p>
            </div>
            <div className="flex items-center gap-3">
              <button
                onClick={onOpenWizard}
                className="flex items-center gap-1.5 px-4 py-2 bg-white/10 hover:bg-white/20 rounded-lg text-sm font-medium transition-colors"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                </svg>
                Tax Wizard
              </button>
              <button
                onClick={() => { logout(); onClose(); }}
                className="px-4 py-2 bg-red-500/80 hover:bg-red-500 rounded-lg text-sm font-medium transition-colors"
              >
                Logout
              </button>
              <button
                onClick={onClose}
                className="text-white/80 hover:text-white transition-colors"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          </div>

          {/* Tabs */}
          <div className="flex items-end gap-4 mt-6 flex-wrap">
            {/* Group 1: Overview */}
            <div className="flex gap-1">
              <button
                onClick={() => setActiveTab('overview')}
                className={`px-4 py-2 rounded-t-lg text-sm font-medium transition-colors ${
                  activeTab === 'overview' ? 'bg-white text-primary-700' : 'bg-white/10 text-white hover:bg-white/20'
                }`}
              >
                Overview
              </button>
            </div>

            {/* Divider */}
            <div className="w-px h-6 bg-white/20 self-center" />

            {/* Group 2: Financials is open to everyone; Business Health remains Premium */}
            <div className="flex gap-1">
              <button
                onClick={() => setActiveTab('financials')}
                className={`px-4 py-2 rounded-t-lg text-sm font-medium transition-colors flex items-center gap-1.5 ${
                  activeTab === 'financials' ? 'bg-white text-primary-700' : 'bg-white/10 text-white hover:bg-white/20'
                }`}
              >
                Financials
              </button>
              <button
                onClick={() => setActiveTab('businessHealth')}
                className={`px-4 py-2 rounded-t-lg text-sm font-medium transition-colors flex items-center gap-1.5 ${
                  activeTab === 'businessHealth' ? 'bg-white text-primary-700' : 'bg-white/10 text-white hover:bg-white/20'
                }`}
              >
                {!isPremium && (
                  <svg className="w-3.5 h-3.5 text-yellow-300" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z" clipRule="evenodd" />
                  </svg>
                )}
                Business Health
              </button>
            </div>

            {/* Divider */}
            <div className="w-px h-6 bg-white/20 self-center" />

            {/* Group 3: AI Insights — Premium only. Tax Savings and Forecast share one tab, switched via sub-tabs inside */}
            <div className="flex gap-1">
              <button
                onClick={() => setActiveTab('recommendations')}
                className={`px-4 py-2 rounded-t-lg text-sm font-medium transition-colors flex items-center gap-1.5 ${
                  activeTab === 'recommendations' ? 'bg-white text-primary-700' : 'bg-white/10 text-white hover:bg-white/20'
                }`}
              >
                {!isPremium && (
                  <svg className="w-3.5 h-3.5 text-yellow-300" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z" clipRule="evenodd" />
                  </svg>
                )}
                AI Insights
              </button>
            </div>

            {/* Settings tab */}
            <div className="w-px h-6 bg-white/20 self-center" />
            <button
              onClick={() => setActiveTab('settings')}
              className={`px-4 py-2 rounded-t-lg text-sm font-medium transition-colors flex items-center gap-1.5 ${
                activeTab === 'settings'
                  ? 'bg-white text-gray-700'
                  : 'bg-white/10 text-white hover:bg-white/20'
              }`}
            >
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
              Settings
            </button>

            {/* Admin tab */}
            {isAdmin && (
              <>
                <div className="w-px h-6 bg-white/20 self-center" />
                <button
                  onClick={() => setActiveTab('admin')}
                  className={`px-4 py-2 rounded-t-lg text-sm font-medium transition-colors flex items-center gap-1.5 ${
                    activeTab === 'admin'
                      ? 'bg-white text-purple-700'
                      : 'bg-purple-500/40 text-white hover:bg-purple-500/60'
                  }`}
                >
                  <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-6-3a2 2 0 11-4 0 2 2 0 014 0zm-2 4a5 5 0 00-4.546 2.916A5.986 5.986 0 0010 16a5.986 5.986 0 004.546-2.084A5 5 0 0010 11z" clipRule="evenodd" />
                  </svg>
                  Admin
                </button>
              </>
            )}
          </div>
        </div>

        {/* Content */}
        <div className="p-6">
          {/* Overview Tab */}
          {activeTab === 'overview' && (
            <div className="space-y-6">
              {/* Business Performance — interactive overview card */}
              <BusinessPerformanceCard
                documents={documents}
                taxHistory={taxHistory}
                revenues={revenues}
                expenses={expenses}
                effectiveTaxType={effectiveTaxType}
                isPremium={isPremium}
                companyName={user?.companyName}
                onNavigate={setActiveTab}
              />

              {/* Cash Flow & Profit Recommendations — lives only on Overview
                  (no separate Financials > Cash Flow tab), gated on the
                  component's own data availability (Monthly P&L OR a saved
                  Company Tax calculation) so it shows for any user with
                  either kind of data. */}
              <div>
                <h3 className="text-base font-semibold text-gray-800 mb-3">Cash Flow & Profit Recommendations</h3>
                <CashFlowRecommendations taxHistory={taxHistory} revenues={revenues} expenses={expenses} />
              </div>

              {/* Personal Tax Section */}
              {effectiveTaxType === 'personal' && (
              <div className="space-y-6">
                <button
                  onClick={() => setShowStrategies((v) => !v)}
                  className="w-full text-left bg-gradient-to-r from-primary-50 to-blue-50 border border-primary-200 rounded-lg p-4 hover:from-primary-100 hover:to-blue-100 transition-colors"
                >
                  <div className="flex items-center justify-between">
                    <h3 className="text-lg font-bold text-primary-800 flex items-center gap-2">
                      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                      </svg>
                      Personal Tax Reduction Strategies (NTA 2025)
                    </h3>
                    <svg
                      className={`w-5 h-5 text-primary-600 flex-shrink-0 transition-transform ${showStrategies ? 'rotate-180' : ''}`}
                      fill="none" stroke="currentColor" viewBox="0 0 24 24"
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  </div>
                  <p className="text-primary-700 text-sm mt-1">
                    Legal strategies to minimize your personal income tax liability under the Nigeria Tax Act 2025
                  </p>
                </button>

                {showStrategies && (
                <>
                {/* Personal Strategy 1: Tax-Free Threshold */}
                <div className="bg-white border border-gray-200 rounded-lg p-5">
                  <div className="flex items-start gap-3">
                    <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center flex-shrink-0">
                      <span className="text-green-600 font-bold">1</span>
                    </div>
                    <div className="flex-1">
                      <h4 className="font-semibold text-gray-900 text-lg">Utilize the Tax-Free Threshold</h4>
                      <p className="text-gray-600 mt-2">
                        Under NTA 2025, the first ₦ 800,000 of your annual income is completely tax-free.
                      </p>
                      <div className="mt-3 bg-green-50 rounded-lg p-4">
                        <h5 className="font-medium text-green-800 mb-2">How it works:</h5>
                        <ul className="text-sm text-green-700 space-y-1">
                          <li>• <strong>Tax-Free Band:</strong> First ₦ 800,000 = 0% tax</li>
                          <li>• <strong>Progressive Rates:</strong> Only income above ₦ 800,000 is taxed</li>
                          <li>• <strong>Automatic:</strong> This exemption applies automatically</li>
                        </ul>
                        <div className="mt-3 p-3 bg-white rounded border border-green-200">
                          <p className="text-sm font-medium text-gray-800 mb-2">Worked Example:</p>
                          <table className="text-sm text-gray-700 w-full">
                            <tbody>
                              <tr><td>Annual Income:</td><td className="text-right font-medium">₦ 3,000,000</td></tr>
                              <tr><td>Tax-Free Portion:</td><td className="text-right text-green-600">₦ 800,000 × 0% = ₦ 0</td></tr>
                              <tr><td>Taxable Portion:</td><td className="text-right">₦ 2,200,000 × 15% = ₦ 330,000</td></tr>
                              <tr className="border-t"><td className="font-medium">Total Tax:</td><td className="text-right font-bold">₦ 330,000</td></tr>
                              <tr><td className="text-green-600">Tax Saved:</td><td className="text-right text-green-600 font-medium">₦ 120,000 (₦ 800K × 15%)</td></tr>
                            </tbody>
                          </table>
                        </div>
                        <div className="mt-3 p-3 bg-blue-50 rounded border border-blue-200">
                          <p className="text-sm text-blue-800">
                            <strong>Tip:</strong> If you have multiple income sources, ensure all are consolidated for proper tax band application.
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Personal Strategy 2: Pension Contribution */}
                <div className="bg-white border border-gray-200 rounded-lg p-5">
                  <div className="flex items-start gap-3">
                    <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center flex-shrink-0">
                      <span className="text-blue-600 font-bold">2</span>
                    </div>
                    <div className="flex-1">
                      <h4 className="font-semibold text-gray-900 text-lg">Maximize Pension Contributions (8%)</h4>
                      <p className="text-gray-600 mt-2">
                        Pension contributions are fully deductible from your taxable income under the Pension Reform Act.
                      </p>
                      <div className="mt-3 bg-blue-50 rounded-lg p-4">
                        <h5 className="font-medium text-blue-800 mb-2">How it reduces tax:</h5>
                        <ul className="text-sm text-blue-700 space-y-1">
                          <li>• <strong>Deduction Rate:</strong> 8% of your gross annual income</li>
                          <li>• <strong>Pre-Tax Benefit:</strong> Reduces taxable income before tax calculation</li>
                          <li>• <strong>Retirement Savings:</strong> Builds your retirement fund while saving tax</li>
                        </ul>
                        <div className="mt-3 p-3 bg-white rounded border border-blue-200">
                          <p className="text-sm font-medium text-gray-800 mb-2">Worked Example:</p>
                          <table className="text-sm text-gray-700 w-full">
                            <tbody>
                              <tr><td>Annual Income:</td><td className="text-right font-medium">₦ 12,000,000</td></tr>
                              <tr><td>Pension Deduction (8%):</td><td className="text-right text-red-600">-₦ 960,000</td></tr>
                              <tr><td>Taxable Income After Pension:</td><td className="text-right">₦ 11,040,000</td></tr>
                              <tr className="border-t"><td className="text-green-600 font-medium">Tax Saved:</td><td className="text-right text-green-600 font-bold">₦ 172,800</td></tr>
                            </tbody>
                          </table>
                          <p className="text-xs text-gray-500 mt-2">
                            Calculation: ₦ 960,000 × 18% (marginal rate for ₦ 3M-₦ 12M band) = ₦ 172,800
                          </p>
                        </div>
                        <div className="mt-3 p-3 bg-yellow-50 rounded border border-yellow-200">
                          <p className="text-sm text-yellow-800">
                            <strong>Implementation:</strong> Ensure your employer is remitting pension contributions. Self-employed individuals should register with a Pension Fund Administrator (PFA).
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Personal Strategy 3: NHF Contribution */}
                <div className="bg-white border border-gray-200 rounded-lg p-5">
                  <div className="flex items-start gap-3">
                    <div className="w-10 h-10 bg-purple-100 rounded-full flex items-center justify-center flex-shrink-0">
                      <span className="text-purple-600 font-bold">3</span>
                    </div>
                    <div className="flex-1">
                      <h4 className="font-semibold text-gray-900 text-lg">Claim National Housing Fund (NHF) Deduction (2.5%)</h4>
                      <p className="text-gray-600 mt-2">
                        NHF contributions are tax-deductible and help you qualify for affordable housing loans.
                      </p>
                      <div className="mt-3 bg-purple-50 rounded-lg p-4">
                        <h5 className="font-medium text-purple-800 mb-2">How it reduces tax:</h5>
                        <ul className="text-sm text-purple-700 space-y-1">
                          <li>• <strong>Deduction Rate:</strong> 2.5% of your gross annual income</li>
                          <li>• <strong>Dual Benefit:</strong> Tax savings + eligibility for NHF housing loans</li>
                          <li>• <strong>Loan Advantage:</strong> Access to low-interest mortgage loans (6% p.a.)</li>
                        </ul>
                        <div className="mt-3 p-3 bg-white rounded border border-purple-200">
                          <p className="text-sm font-medium text-gray-800 mb-2">Worked Example:</p>
                          <table className="text-sm text-gray-700 w-full">
                            <tbody>
                              <tr><td>Annual Income:</td><td className="text-right font-medium">₦ 10,000,000</td></tr>
                              <tr><td>NHF Deduction (2.5%):</td><td className="text-right text-red-600">-₦ 250,000</td></tr>
                              <tr><td>Taxable Income Reduction:</td><td className="text-right">₦ 250,000</td></tr>
                              <tr className="border-t"><td className="text-green-600 font-medium">Tax Saved:</td><td className="text-right text-green-600 font-bold">₦ 45,000</td></tr>
                            </tbody>
                          </table>
                          <p className="text-xs text-gray-500 mt-2">
                            Calculation: ₦ 250,000 × 18% (marginal rate) = ₦ 45,000
                          </p>
                        </div>
                        <div className="mt-3 p-3 bg-blue-50 rounded border border-blue-200">
                          <p className="text-sm text-blue-800">
                            <strong>Tip:</strong> Register with the Federal Mortgage Bank of Nigeria (FMBN) to start contributing and build your housing loan eligibility.
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Personal Strategy 4: Rent Relief */}
                <div className="bg-white border border-gray-200 rounded-lg p-5">
                  <div className="flex items-start gap-3">
                    <div className="w-10 h-10 bg-orange-100 rounded-full flex items-center justify-center flex-shrink-0">
                      <span className="text-orange-600 font-bold">4</span>
                    </div>
                    <div className="flex-1">
                      <h4 className="font-semibold text-gray-900 text-lg">Claim Rent Relief (20% of Rent, Max ₦ 500,000)</h4>
                      <p className="text-gray-600 mt-2">
                        If you pay rent for your primary residence, you can claim 20% of your annual rent as a tax deduction.
                      </p>
                      <div className="mt-3 bg-orange-50 rounded-lg p-4">
                        <h5 className="font-medium text-orange-800 mb-2">How it reduces tax:</h5>
                        <ul className="text-sm text-orange-700 space-y-1">
                          <li>• <strong>Relief Rate:</strong> 20% of annual rent paid</li>
                          <li>• <strong>Maximum Cap:</strong> ₦ 500,000 per year</li>
                          <li>• <strong>Documentation:</strong> Keep rent receipts and tenancy agreement</li>
                        </ul>
                        <div className="mt-3 p-3 bg-white rounded border border-orange-200">
                          <p className="text-sm font-medium text-gray-800 mb-2">Worked Example:</p>
                          <table className="text-sm text-gray-700 w-full">
                            <tbody>
                              <tr><td>Annual Rent Paid:</td><td className="text-right font-medium">₦ 3,000,000</td></tr>
                              <tr><td>Rent Relief (20%):</td><td className="text-right">₦ 600,000</td></tr>
                              <tr><td>Applied Relief (capped):</td><td className="text-right text-red-600">-₦ 500,000</td></tr>
                              <tr className="border-t"><td className="text-green-600 font-medium">Tax Saved:</td><td className="text-right text-green-600 font-bold">₦ 115,000</td></tr>
                            </tbody>
                          </table>
                          <p className="text-xs text-gray-500 mt-2">
                            Calculation: ₦ 500,000 × 23% (for income ₦ 25M-₦ 50M) = ₦ 115,000
                          </p>
                        </div>
                        <div className="mt-3 p-3 bg-yellow-50 rounded border border-yellow-200">
                          <p className="text-sm text-yellow-800">
                            <strong>Documentation Required:</strong> Keep copies of rent receipts, bank transfer evidence, and signed tenancy agreement. Submit with your annual tax filing.
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Personal Strategy 5: Compensation Exemption */}
                <div className="bg-white border border-gray-200 rounded-lg p-5">
                  <div className="flex items-start gap-3">
                    <div className="w-10 h-10 bg-teal-100 rounded-full flex items-center justify-center flex-shrink-0">
                      <span className="text-teal-600 font-bold">5</span>
                    </div>
                    <div className="flex-1">
                      <h4 className="font-semibold text-gray-900 text-lg">Compensation for Loss of Office Exemption (₦ 50M)</h4>
                      <p className="text-gray-600 mt-2">
                        NTA 2025 increased the tax-free threshold for severance pay from ₦ 10M to ₦ 50M.
                      </p>
                      <div className="mt-3 bg-teal-50 rounded-lg p-4">
                        <h5 className="font-medium text-teal-800 mb-2">How it reduces tax:</h5>
                        <ul className="text-sm text-teal-700 space-y-1">
                          <li>• <strong>Exempt Amount:</strong> First ₦ 50,000,000 is completely tax-free</li>
                          <li>• <strong>Taxable Excess:</strong> Only amounts above ₦ 50M are taxed at progressive rates</li>
                          <li>• <strong>Applies To:</strong> Redundancy pay, severance packages, golden handshakes</li>
                        </ul>
                        <div className="mt-3 p-3 bg-white rounded border border-teal-200">
                          <p className="text-sm font-medium text-gray-800 mb-2">Worked Example:</p>
                          <table className="text-sm text-gray-700 w-full">
                            <tbody>
                              <tr><td>Severance Payment:</td><td className="text-right font-medium">₦ 80,000,000</td></tr>
                              <tr><td>Tax-Free Portion:</td><td className="text-right text-green-600">₦ 50,000,000 (exempt)</td></tr>
                              <tr><td>Taxable Amount:</td><td className="text-right">₦ 30,000,000</td></tr>
                              <tr><td>Tax on Excess (progressive):</td><td className="text-right text-red-600">₦ 6,490,000</td></tr>
                              <tr className="border-t"><td className="text-green-600 font-medium">Tax Saved by Exemption:</td><td className="text-right text-green-600 font-bold">₦ 12,500,000</td></tr>
                            </tbody>
                          </table>
                          <p className="text-xs text-gray-500 mt-2">
                            Without exemption: Full ₦ 80M would be taxed at approximately ₦ 18,990,000
                          </p>
                        </div>
                        <div className="mt-3 p-3 bg-blue-50 rounded border border-blue-200">
                          <p className="text-sm text-blue-800">
                            <strong>Tip:</strong> When negotiating severance, structure the package to maximize the use of this ₦ 50M exemption. Consult a tax advisor for optimal structuring.
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Personal Strategy 6: Share Transfer Exemption */}
                <div className="bg-white border border-gray-200 rounded-lg p-5">
                  <div className="flex items-start gap-3">
                    <div className="w-10 h-10 bg-indigo-100 rounded-full flex items-center justify-center flex-shrink-0">
                      <span className="text-indigo-600 font-bold">6</span>
                    </div>
                    <div className="flex-1">
                      <h4 className="font-semibold text-gray-900 text-lg">Share Transfer Capital Gains Exemption</h4>
                      <p className="text-gray-600 mt-2">
                        NTA 2025 provides exemption for capital gains on share disposals under certain conditions.
                      </p>
                      <div className="mt-3 bg-indigo-50 rounded-lg p-4">
                        <h5 className="font-medium text-indigo-800 mb-2">How it reduces tax:</h5>
                        <ul className="text-sm text-indigo-700 space-y-1">
                          <li>• <strong>Threshold:</strong> Disposal proceeds must be below ₦ 150,000,000</li>
                          <li>• <strong>Maximum Exemption:</strong> Capital gains up to ₦ 10,000,000 can be exempt</li>
                          <li>• <strong>CGT Rate:</strong> Normal rate is 10% on chargeable gains</li>
                        </ul>
                        <div className="mt-3 p-3 bg-white rounded border border-indigo-200">
                          <p className="text-sm font-medium text-gray-800 mb-2">Worked Example:</p>
                          <table className="text-sm text-gray-700 w-full">
                            <tbody>
                              <tr><td>Shares Sold For:</td><td className="text-right font-medium">₦ 100,000,000</td></tr>
                              <tr><td>Original Cost:</td><td className="text-right">₦ 85,000,000</td></tr>
                              <tr><td>Capital Gain:</td><td className="text-right">₦ 15,000,000</td></tr>
                              <tr><td>Exempt Portion:</td><td className="text-right text-green-600">₦ 10,000,000</td></tr>
                              <tr><td>Taxable Gain:</td><td className="text-right">₦ 5,000,000</td></tr>
                              <tr><td>CGT (10%):</td><td className="text-right text-red-600">₦ 500,000</td></tr>
                              <tr className="border-t"><td className="text-green-600 font-medium">Tax Saved:</td><td className="text-right text-green-600 font-bold">₦ 1,000,000</td></tr>
                            </tbody>
                          </table>
                        </div>
                        <div className="mt-3 p-3 bg-yellow-50 rounded border border-yellow-200">
                          <p className="text-sm text-yellow-800">
                            <strong>Reinvestment Bonus:</strong> Additional exemption may apply if proceeds are reinvested in qualifying Nigerian securities within a specified period.
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Personal Strategy 7: Timing Income */}
                <div className="bg-white border border-gray-200 rounded-lg p-5">
                  <div className="flex items-start gap-3">
                    <div className="w-10 h-10 bg-red-100 rounded-full flex items-center justify-center flex-shrink-0">
                      <span className="text-red-600 font-bold">7</span>
                    </div>
                    <div className="flex-1">
                      <h4 className="font-semibold text-gray-900 text-lg">Strategic Income Timing</h4>
                      <p className="text-gray-600 mt-2">
                        Timing when you receive income can help you stay in lower tax brackets and reduce overall tax.
                      </p>
                      <div className="mt-3 bg-red-50 rounded-lg p-4">
                        <h5 className="font-medium text-red-800 mb-2">NTA 2025 Progressive Tax Bands:</h5>
                        <table className="text-sm text-red-700 w-full mb-3">
                          <thead>
                            <tr className="border-b border-red-200">
                              <th className="text-left py-1">Income Band</th>
                              <th className="text-right py-1">Rate</th>
                            </tr>
                          </thead>
                          <tbody>
                            <tr><td>Up to ₦ 800,000</td><td className="text-right font-medium">0%</td></tr>
                            <tr><td>₦ 800,001 - ₦ 3,000,000</td><td className="text-right font-medium">15%</td></tr>
                            <tr><td>₦ 3,000,001 - ₦ 12,000,000</td><td className="text-right font-medium">18%</td></tr>
                            <tr><td>₦ 12,000,001 - ₦ 25,000,000</td><td className="text-right font-medium">21%</td></tr>
                            <tr><td>₦ 25,000,001 - ₦ 50,000,000</td><td className="text-right font-medium">23%</td></tr>
                            <tr><td>Over ₦ 50,000,000</td><td className="text-right font-medium">25%</td></tr>
                          </tbody>
                        </table>
                        <div className="p-3 bg-white rounded border border-red-200">
                          <p className="text-sm font-medium text-gray-800 mb-2">Worked Example - Bonus Deferral:</p>
                          <p className="text-sm text-gray-700">
                            If your salary is ₦ 48M and you're due a ₦ 5M bonus:
                          </p>
                          <ul className="text-sm text-gray-700 mt-2 space-y-1">
                            <li>• <strong>Receive in same year:</strong> ₦ 53M total → ₦ 3M taxed at 25% = ₦ 750K extra tax</li>
                            <li>• <strong>Defer to next year:</strong> Stay at 23% band → Save ₦ 100,000</li>
                          </ul>
                        </div>
                        <div className="mt-3 p-3 bg-blue-50 rounded border border-blue-200">
                          <p className="text-sm text-blue-800">
                            <strong>Tip:</strong> For self-employed individuals and business owners, consider timing of invoicing and client payments to optimize annual income levels.
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Personal Strategy 8: Combine All Deductions */}
                <div className="bg-white border border-gray-200 rounded-lg p-5">
                  <div className="flex items-start gap-3">
                    <div className="w-10 h-10 bg-emerald-100 rounded-full flex items-center justify-center flex-shrink-0">
                      <span className="text-emerald-600 font-bold">8</span>
                    </div>
                    <div className="flex-1">
                      <h4 className="font-semibold text-gray-900 text-lg">Maximize Combined Deductions</h4>
                      <p className="text-gray-600 mt-2">
                        Stack all available deductions to significantly reduce your taxable income.
                      </p>
                      <div className="mt-3 bg-emerald-50 rounded-lg p-4">
                        <h5 className="font-medium text-emerald-800 mb-2">Complete Tax Optimization Example:</h5>
                        <div className="p-3 bg-white rounded border border-emerald-200">
                          <table className="text-sm text-gray-700 w-full">
                            <tbody>
                              <tr className="font-medium"><td>Gross Annual Income:</td><td className="text-right">₦ 25,000,000</td></tr>
                              <tr className="border-t border-gray-100"><td colSpan={2} className="text-gray-500 pt-2">Deductions:</td></tr>
                              <tr><td className="pl-4">Pension (8%):</td><td className="text-right text-red-600">-₦ 2,000,000</td></tr>
                              <tr><td className="pl-4">NHF (2.5%):</td><td className="text-right text-red-600">-₦ 625,000</td></tr>
                              <tr><td className="pl-4">Rent Relief (max):</td><td className="text-right text-red-600">-₦ 500,000</td></tr>
                              <tr className="border-t font-medium"><td>Total Deductions:</td><td className="text-right text-red-600">-₦ 3,125,000</td></tr>
                              <tr className="border-t"><td className="font-medium">Taxable Income:</td><td className="text-right font-bold">₦ 21,875,000</td></tr>
                              <tr className="border-t border-gray-200"><td colSpan={2} className="text-gray-500 pt-2">Tax Comparison:</td></tr>
                              <tr><td className="pl-4">Without Deductions:</td><td className="text-right">₦ 4,380,000</td></tr>
                              <tr><td className="pl-4">With Deductions:</td><td className="text-right">₦ 3,613,750</td></tr>
                              <tr className="border-t bg-green-50"><td className="font-bold text-green-700">Total Tax Saved:</td><td className="text-right font-bold text-green-700">₦ 766,250</td></tr>
                            </tbody>
                          </table>
                        </div>
                        <div className="mt-3 p-3 bg-yellow-50 rounded border border-yellow-200">
                          <p className="text-sm text-yellow-800">
                            <strong>Best Practice:</strong> Review all available deductions at the start of each tax year. Set up automatic contributions for pension and NHF to ensure you don't miss any savings.
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Personal Tax Disclaimer */}
                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                  <div className="flex items-start gap-3">
                    <svg className="w-6 h-6 text-yellow-600 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                    </svg>
                    <div>
                      <h4 className="font-semibold text-yellow-800">Important Disclaimer</h4>
                      <p className="text-sm text-yellow-700 mt-1">
                        These recommendations are based on NTA 2025 provisions and are for informational purposes only.
                        Individual circumstances vary. Consult Nigeria Revenue Service before making tax-related decisions. Filing deadline for personal income tax is March 31st.
                      </p>
                    </div>
                  </div>
                </div>
                </>
                )}
              </div>
              )}

            </div>
          )}

          {/* Financials Tab — open to all users. Monthly P&L entry and the
              VAT/WHT calculators are basic bookkeeping/compliance tools, not
              premium features. Cash Flow & Profit Recommendations lives on
              Overview instead of here. */}
          {activeTab === 'financials' && <FinancialTracker />}

          {/* Business Health Tab — Premium only. Year Comparison lives here as
              a sub-tab since both are history-derived business insights. */}
          {activeTab === 'businessHealth' && (
            isPremium ? (
              <div className="space-y-5">
                <div className="inline-flex bg-gray-100 rounded-lg p-1">
                  <button
                    onClick={() => setBusinessHealthSubTab('overview')}
                    className={`px-4 py-1.5 rounded-md text-sm font-medium transition-colors ${
                      businessHealthSubTab === 'overview' ? 'bg-white text-primary-700 shadow-sm' : 'text-gray-500 hover:text-gray-700'
                    }`}
                  >
                    Health Overview
                  </button>
                  <button
                    onClick={() => setBusinessHealthSubTab('yearComparison')}
                    className={`px-4 py-1.5 rounded-md text-sm font-medium transition-colors ${
                      businessHealthSubTab === 'yearComparison' ? 'bg-white text-primary-700 shadow-sm' : 'text-gray-500 hover:text-gray-700'
                    }`}
                  >
                    Year Comparison
                  </button>
                </div>
                {businessHealthSubTab === 'overview' && <BusinessHealthDashboard taxHistory={taxHistory} />}
                {businessHealthSubTab === 'yearComparison' && <MultiYearComparison taxHistory={taxHistory} />}
              </div>
            ) : (
              <PremiumLock featureName="Business Health Dashboard" />
            )
          )}

          {/* AI Insights Tab — Premium only. Tax Savings and Forecast share this
              tab via sub-tabs; the static strategy guides that used to live
              here have moved to Overview, where they're free for everyone. */}
          {activeTab === 'recommendations' && (
            isPremium ? (
            <div className="space-y-6">

              {/* Sub-tabs: Tax Savings vs Forecast */}
              <div className="inline-flex bg-gray-100 rounded-lg p-1">
                <button
                  onClick={() => setAiInsightsSubTab('savings')}
                  className={`px-4 py-1.5 rounded-md text-sm font-medium transition-colors ${
                    aiInsightsSubTab === 'savings' ? 'bg-white text-primary-700 shadow-sm' : 'text-gray-500 hover:text-gray-700'
                  }`}
                >
                  Tax Savings
                </button>
                <button
                  onClick={() => setAiInsightsSubTab('forecast')}
                  className={`px-4 py-1.5 rounded-md text-sm font-medium transition-colors ${
                    aiInsightsSubTab === 'forecast' ? 'bg-white text-primary-700 shadow-sm' : 'text-gray-500 hover:text-gray-700'
                  }`}
                >
                  Forecast
                </button>
              </div>

              {aiInsightsSubTab === 'forecast' && <ForecastingEngine />}

              {aiInsightsSubTab === 'savings' && (
              <>
              {/* AI-Powered Recommendations — open to everyone, on-demand, GPT-4o (same model as Forecasting) */}
              <div className="bg-gradient-to-r from-primary-50 to-emerald-50 border border-primary-200 rounded-lg p-4">
                <div className="flex items-center justify-between flex-wrap gap-3">
                  <div className="flex items-center gap-2">
                    <svg className="w-5 h-5 text-primary-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                    </svg>
                    <div>
                      <h3 className="text-sm font-semibold text-gray-800">AI-Powered Recommendations</h3>
                      <p className="text-xs text-gray-500">Analyses your recent tax calculation for maximum savings, in line with NTA 2025.</p>
                    </div>
                  </div>
                  <button
                    onClick={handleGenerateAIRecommendations}
                    disabled={aiRecsLoading || taxHistory.length === 0}
                    className="px-4 py-2 bg-primary-600 hover:bg-primary-700 text-white text-sm font-medium rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex-shrink-0"
                  >
                    {aiRecsLoading ? 'Generating…' : aiRecommendations ? 'Regenerate' : 'Generate with AI'}
                  </button>
                </div>

                {taxHistory.length === 0 && (
                  <p className="text-xs text-gray-500 mt-3">Complete a tax calculation first so there's something to analyse.</p>
                )}
                {aiRecsError && (
                  <p className="text-xs text-red-600 mt-3">{aiRecsError}</p>
                )}
              </div>

              {aiRecommendations && (
                <TaxRecommendations recommendations={aiRecommendations} />
              )}

              {/* Personalised recommendations from your latest Personal Tax calculation */}
              {effectiveTaxType === 'personal' && (() => {
                const mostRecentPersonalTax = taxHistory.find((t) => t.type === 'personal');
                const annualIncome = mostRecentPersonalTax?.result?.grossIncome ?? 0;
                const personalRecs = annualIncome > 0
                  ? generateTaxRecommendations({ annualIncome, applyPension: false, applyNHF: false, annualRent: 0, taxResult: null })
                  : [];
                return personalRecs.length > 0 ? (
                  <div>
                    <div className="flex items-center gap-2 mb-3">
                      <span className="w-2 h-2 bg-green-500 rounded-full" />
                      <h3 className="text-sm font-semibold text-gray-800">
                        Personalised Recommendations — based on your last calculation ({formatCurrency(annualIncome)})
                      </h3>
                    </div>
                    <TaxRecommendations recommendations={personalRecs} />
                  </div>
                ) : null;
              })()}

              </>
              )}
            </div>
            ) : (
              <PremiumLock featureName="AI Insights" />
            )
          )}

          {/* Settings Tab */}
          {activeTab === 'settings' && (
            <div className="space-y-6 max-w-lg">
              <div>
                <h3 className="text-base font-semibold text-gray-800">Account Settings</h3>
                <p className="text-xs text-gray-500 mt-0.5">{user?.email}</p>
              </div>
              <div className="bg-gray-50 rounded-lg p-5 border border-gray-200">
                <ChangePassword />
              </div>
            </div>
          )}

          {/* Admin Tab */}
          {activeTab === 'admin' && isAdmin && <AdminPanel />}


        </div>
      </div>
    </div>
  );
};

export default Dashboard;

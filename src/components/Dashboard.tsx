import React, { useState, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';
import { formatCurrency } from '../utils/taxCalculations';
import Tesseract from 'tesseract.js';

interface DashboardProps {
  onClose: () => void;
}

const Dashboard: React.FC<DashboardProps> = ({ onClose }) => {
  const { user, documents, taxHistory, logout, addDocument, removeDocument } = useAuth();
  const [activeTab, setActiveTab] = useState<'overview' | 'recommendations' | 'documents' | 'history' | 'privacy'>('overview');
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadType, setUploadType] = useState<'receipt' | 'invoice'>('receipt');
  const [taxRecommendationTab, setTaxRecommendationTab] = useState<'personal' | 'company'>('personal');

  const handleFileUpload = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    setUploadProgress(0);

    try {
      // Process with OCR
      const result = await Tesseract.recognize(file, 'eng', {
        logger: (m) => {
          if (m.status === 'recognizing text') {
            setUploadProgress(Math.round(m.progress * 100));
          }
        },
      });

      // Extract amounts from text
      const text = result.data.text;
      const amountMatch = text.match(/[₦N]?\s*([0-9]{1,3}(?:,?[0-9]{3})*(?:\.[0-9]{2})?)/g);
      let extractedAmount = 0;

      if (amountMatch) {
        const amounts = amountMatch.map(m => {
          const numStr = m.replace(/[₦N,\s]/g, '');
          return parseFloat(numStr) || 0;
        }).filter(n => n > 0 && n < 1000000000);
        extractedAmount = amounts.length > 0 ? Math.max(...amounts) : 0;
      }

      addDocument({
        fileName: file.name,
        extractedAmount,
        description: text.substring(0, 100) + (text.length > 100 ? '...' : ''),
        type: uploadType,
      });
    } catch (error) {
      console.error('Upload error:', error);
    } finally {
      setIsUploading(false);
      setUploadProgress(0);
    }
  }, [addDocument, uploadType]);

  const totalExtractedAmount = documents.reduce((sum, doc) => sum + doc.extractedAmount, 0);

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="bg-gradient-to-r from-primary-600 to-primary-700 px-6 py-6 text-white">
          <div className="flex justify-between items-center">
            <div>
              <h2 className="text-2xl font-bold">{user?.companyName}</h2>
              <p className="text-primary-100 text-sm">{user?.email}</p>
            </div>
            <div className="flex items-center gap-3">
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
          <div className="flex gap-1 mt-6 flex-wrap">
            {(['overview', 'recommendations', 'documents', 'history', 'privacy'] as const).map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`px-4 py-2 rounded-t-lg text-sm font-medium transition-colors ${
                  activeTab === tab
                    ? 'bg-white text-primary-700'
                    : 'bg-white/10 text-white hover:bg-white/20'
                }`}
              >
                {tab === 'recommendations' ? 'Tax Savings' : tab.charAt(0).toUpperCase() + tab.slice(1)}
              </button>
            ))}
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-auto p-6">
          {/* Overview Tab */}
          {activeTab === 'overview' && (
            <div className="space-y-6">
              {/* Summary Cards */}
              <div className="grid md:grid-cols-3 gap-4">
                <div className="bg-primary-50 rounded-lg p-4 border border-primary-100">
                  <div className="text-primary-600 text-sm font-medium">Documents Uploaded</div>
                  <div className="text-3xl font-bold text-primary-800 mt-1">{documents.length}</div>
                </div>
                <div className="bg-green-50 rounded-lg p-4 border border-green-100">
                  <div className="text-green-600 text-sm font-medium">Total Extracted</div>
                  <div className="text-3xl font-bold text-green-800 mt-1">{formatCurrency(totalExtractedAmount)}</div>
                </div>
                <div className="bg-purple-50 rounded-lg p-4 border border-purple-100">
                  <div className="text-purple-600 text-sm font-medium">Tax Calculations</div>
                  <div className="text-3xl font-bold text-purple-800 mt-1">{taxHistory.length}</div>
                </div>
              </div>

              {/* Recent Activity */}
              <div>
                <h3 className="text-lg font-semibold text-gray-800 mb-3">Recent Activity</h3>
                {taxHistory.length === 0 ? (
                  <p className="text-gray-500 text-sm">No tax calculations yet. Use the calculators to get started.</p>
                ) : (
                  <div className="space-y-2">
                    {taxHistory.slice(0, 5).map((calc) => (
                      <div key={calc.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                        <div className="flex items-center gap-3">
                          <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                            calc.type === 'personal' ? 'bg-primary-100 text-primary-600' : 'bg-purple-100 text-purple-600'
                          }`}>
                            {calc.type === 'personal' ? (
                              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                              </svg>
                            ) : (
                              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                              </svg>
                            )}
                          </div>
                          <div>
                            <div className="font-medium text-gray-800">
                              {calc.type === 'personal' ? 'Personal Tax' : 'Company Tax'} Calculation
                            </div>
                            <div className="text-xs text-gray-500">
                              {calc.date.toLocaleDateString('en-NG', { dateStyle: 'medium' })}
                            </div>
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="font-semibold text-red-600">
                            {formatCurrency(calc.result?.totalTax || 0)}
                          </div>
                          <div className="text-xs text-gray-500">Tax Liability</div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Tax Recommendations Tab */}
          {activeTab === 'recommendations' && (
            <div className="space-y-6">
              {/* Tab Toggle for Personal vs Company */}
              <div className="flex gap-2 p-1 bg-gray-100 rounded-lg w-fit">
                <button
                  onClick={() => setTaxRecommendationTab('personal')}
                  className={`px-4 py-2 rounded-md text-sm font-medium ${
                    taxRecommendationTab === 'personal'
                      ? 'bg-white shadow text-primary-700'
                      : 'text-gray-600 hover:text-gray-900'
                  }`}
                >
                  Personal Tax
                </button>
                <button
                  onClick={() => setTaxRecommendationTab('company')}
                  className={`px-4 py-2 rounded-md text-sm font-medium ${
                    taxRecommendationTab === 'company'
                      ? 'bg-white shadow text-primary-700'
                      : 'text-gray-600 hover:text-gray-900'
                  }`}
                >
                  Company Tax
                </button>
              </div>

              {/* Personal Tax Section */}
              {taxRecommendationTab === 'personal' && (
              <div className="space-y-6">
                <div className="bg-gradient-to-r from-primary-50 to-blue-50 border border-primary-200 rounded-lg p-4">
                  <h3 className="text-lg font-bold text-primary-800 flex items-center gap-2">
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                    </svg>
                    Personal Tax Reduction Strategies (NTA 2025)
                  </h3>
                  <p className="text-primary-700 text-sm mt-1">
                    Legal strategies to minimize your personal income tax liability under the Nigeria Tax Act 2025
                  </p>
                </div>

                {/* Personal Strategy 1: Tax-Free Threshold */}
                <div className="bg-white border border-gray-200 rounded-lg p-5">
                  <div className="flex items-start gap-3">
                    <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center flex-shrink-0">
                      <span className="text-green-600 font-bold">1</span>
                    </div>
                    <div className="flex-1">
                      <h4 className="font-semibold text-gray-900 text-lg">Utilize the Tax-Free Threshold</h4>
                      <p className="text-gray-600 mt-2">
                        Under NTA 2025, the first ₦800,000 of your annual income is completely tax-free.
                      </p>
                      <div className="mt-3 bg-green-50 rounded-lg p-4">
                        <h5 className="font-medium text-green-800 mb-2">How it works:</h5>
                        <ul className="text-sm text-green-700 space-y-1">
                          <li>• <strong>Tax-Free Band:</strong> First ₦800,000 = 0% tax</li>
                          <li>• <strong>Progressive Rates:</strong> Only income above ₦800,000 is taxed</li>
                          <li>• <strong>Automatic:</strong> This exemption applies automatically</li>
                        </ul>
                        <div className="mt-3 p-3 bg-white rounded border border-green-200">
                          <p className="text-sm font-medium text-gray-800 mb-2">Worked Example:</p>
                          <table className="text-sm text-gray-700 w-full">
                            <tbody>
                              <tr><td>Annual Income:</td><td className="text-right font-medium">₦3,000,000</td></tr>
                              <tr><td>Tax-Free Portion:</td><td className="text-right text-green-600">₦800,000 × 0% = ₦0</td></tr>
                              <tr><td>Taxable Portion:</td><td className="text-right">₦2,200,000 × 15% = ₦330,000</td></tr>
                              <tr className="border-t"><td className="font-medium">Total Tax:</td><td className="text-right font-bold">₦330,000</td></tr>
                              <tr><td className="text-green-600">Tax Saved:</td><td className="text-right text-green-600 font-medium">₦120,000 (₦800K × 15%)</td></tr>
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
                              <tr><td>Annual Income:</td><td className="text-right font-medium">₦12,000,000</td></tr>
                              <tr><td>Pension Deduction (8%):</td><td className="text-right text-red-600">-₦960,000</td></tr>
                              <tr><td>Taxable Income After Pension:</td><td className="text-right">₦11,040,000</td></tr>
                              <tr className="border-t"><td className="text-green-600 font-medium">Tax Saved:</td><td className="text-right text-green-600 font-bold">₦172,800</td></tr>
                            </tbody>
                          </table>
                          <p className="text-xs text-gray-500 mt-2">
                            Calculation: ₦960,000 × 18% (marginal rate for ₦3M-₦12M band) = ₦172,800
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
                              <tr><td>Annual Income:</td><td className="text-right font-medium">₦10,000,000</td></tr>
                              <tr><td>NHF Deduction (2.5%):</td><td className="text-right text-red-600">-₦250,000</td></tr>
                              <tr><td>Taxable Income Reduction:</td><td className="text-right">₦250,000</td></tr>
                              <tr className="border-t"><td className="text-green-600 font-medium">Tax Saved:</td><td className="text-right text-green-600 font-bold">₦45,000</td></tr>
                            </tbody>
                          </table>
                          <p className="text-xs text-gray-500 mt-2">
                            Calculation: ₦250,000 × 18% (marginal rate) = ₦45,000
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
                      <h4 className="font-semibold text-gray-900 text-lg">Claim Rent Relief (20% of Rent, Max ₦500,000)</h4>
                      <p className="text-gray-600 mt-2">
                        If you pay rent for your primary residence, you can claim 20% of your annual rent as a tax deduction.
                      </p>
                      <div className="mt-3 bg-orange-50 rounded-lg p-4">
                        <h5 className="font-medium text-orange-800 mb-2">How it reduces tax:</h5>
                        <ul className="text-sm text-orange-700 space-y-1">
                          <li>• <strong>Relief Rate:</strong> 20% of annual rent paid</li>
                          <li>• <strong>Maximum Cap:</strong> ₦500,000 per year</li>
                          <li>• <strong>Documentation:</strong> Keep rent receipts and tenancy agreement</li>
                        </ul>
                        <div className="mt-3 p-3 bg-white rounded border border-orange-200">
                          <p className="text-sm font-medium text-gray-800 mb-2">Worked Example:</p>
                          <table className="text-sm text-gray-700 w-full">
                            <tbody>
                              <tr><td>Annual Rent Paid:</td><td className="text-right font-medium">₦3,000,000</td></tr>
                              <tr><td>Rent Relief (20%):</td><td className="text-right">₦600,000</td></tr>
                              <tr><td>Applied Relief (capped):</td><td className="text-right text-red-600">-₦500,000</td></tr>
                              <tr className="border-t"><td className="text-green-600 font-medium">Tax Saved:</td><td className="text-right text-green-600 font-bold">₦115,000</td></tr>
                            </tbody>
                          </table>
                          <p className="text-xs text-gray-500 mt-2">
                            Calculation: ₦500,000 × 23% (for income ₦25M-₦50M) = ₦115,000
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
                      <h4 className="font-semibold text-gray-900 text-lg">Compensation for Loss of Office Exemption (₦50M)</h4>
                      <p className="text-gray-600 mt-2">
                        NTA 2025 increased the tax-free threshold for severance pay from ₦10M to ₦50M.
                      </p>
                      <div className="mt-3 bg-teal-50 rounded-lg p-4">
                        <h5 className="font-medium text-teal-800 mb-2">How it reduces tax:</h5>
                        <ul className="text-sm text-teal-700 space-y-1">
                          <li>• <strong>Exempt Amount:</strong> First ₦50,000,000 is completely tax-free</li>
                          <li>• <strong>Taxable Excess:</strong> Only amounts above ₦50M are taxed at progressive rates</li>
                          <li>• <strong>Applies To:</strong> Redundancy pay, severance packages, golden handshakes</li>
                        </ul>
                        <div className="mt-3 p-3 bg-white rounded border border-teal-200">
                          <p className="text-sm font-medium text-gray-800 mb-2">Worked Example:</p>
                          <table className="text-sm text-gray-700 w-full">
                            <tbody>
                              <tr><td>Severance Payment:</td><td className="text-right font-medium">₦80,000,000</td></tr>
                              <tr><td>Tax-Free Portion:</td><td className="text-right text-green-600">₦50,000,000 (exempt)</td></tr>
                              <tr><td>Taxable Amount:</td><td className="text-right">₦30,000,000</td></tr>
                              <tr><td>Tax on Excess (progressive):</td><td className="text-right text-red-600">₦6,490,000</td></tr>
                              <tr className="border-t"><td className="text-green-600 font-medium">Tax Saved by Exemption:</td><td className="text-right text-green-600 font-bold">₦12,500,000</td></tr>
                            </tbody>
                          </table>
                          <p className="text-xs text-gray-500 mt-2">
                            Without exemption: Full ₦80M would be taxed at approximately ₦18,990,000
                          </p>
                        </div>
                        <div className="mt-3 p-3 bg-blue-50 rounded border border-blue-200">
                          <p className="text-sm text-blue-800">
                            <strong>Tip:</strong> When negotiating severance, structure the package to maximize the use of this ₦50M exemption. Consult a tax advisor for optimal structuring.
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
                          <li>• <strong>Threshold:</strong> Disposal proceeds must be below ₦150,000,000</li>
                          <li>• <strong>Maximum Exemption:</strong> Capital gains up to ₦10,000,000 can be exempt</li>
                          <li>• <strong>CGT Rate:</strong> Normal rate is 10% on chargeable gains</li>
                        </ul>
                        <div className="mt-3 p-3 bg-white rounded border border-indigo-200">
                          <p className="text-sm font-medium text-gray-800 mb-2">Worked Example:</p>
                          <table className="text-sm text-gray-700 w-full">
                            <tbody>
                              <tr><td>Shares Sold For:</td><td className="text-right font-medium">₦100,000,000</td></tr>
                              <tr><td>Original Cost:</td><td className="text-right">₦85,000,000</td></tr>
                              <tr><td>Capital Gain:</td><td className="text-right">₦15,000,000</td></tr>
                              <tr><td>Exempt Portion:</td><td className="text-right text-green-600">₦10,000,000</td></tr>
                              <tr><td>Taxable Gain:</td><td className="text-right">₦5,000,000</td></tr>
                              <tr><td>CGT (10%):</td><td className="text-right text-red-600">₦500,000</td></tr>
                              <tr className="border-t"><td className="text-green-600 font-medium">Tax Saved:</td><td className="text-right text-green-600 font-bold">₦1,000,000</td></tr>
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
                            <tr><td>Up to ₦800,000</td><td className="text-right font-medium">0%</td></tr>
                            <tr><td>₦800,001 - ₦3,000,000</td><td className="text-right font-medium">15%</td></tr>
                            <tr><td>₦3,000,001 - ₦12,000,000</td><td className="text-right font-medium">18%</td></tr>
                            <tr><td>₦12,000,001 - ₦25,000,000</td><td className="text-right font-medium">21%</td></tr>
                            <tr><td>₦25,000,001 - ₦50,000,000</td><td className="text-right font-medium">23%</td></tr>
                            <tr><td>Over ₦50,000,000</td><td className="text-right font-medium">25%</td></tr>
                          </tbody>
                        </table>
                        <div className="p-3 bg-white rounded border border-red-200">
                          <p className="text-sm font-medium text-gray-800 mb-2">Worked Example - Bonus Deferral:</p>
                          <p className="text-sm text-gray-700">
                            If your salary is ₦48M and you're due a ₦5M bonus:
                          </p>
                          <ul className="text-sm text-gray-700 mt-2 space-y-1">
                            <li>• <strong>Receive in same year:</strong> ₦53M total → ₦3M taxed at 25% = ₦750K extra tax</li>
                            <li>• <strong>Defer to next year:</strong> Stay at 23% band → Save ₦100,000</li>
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
                              <tr className="font-medium"><td>Gross Annual Income:</td><td className="text-right">₦25,000,000</td></tr>
                              <tr className="border-t border-gray-100"><td colSpan={2} className="text-gray-500 pt-2">Deductions:</td></tr>
                              <tr><td className="pl-4">Pension (8%):</td><td className="text-right text-red-600">-₦2,000,000</td></tr>
                              <tr><td className="pl-4">NHF (2.5%):</td><td className="text-right text-red-600">-₦625,000</td></tr>
                              <tr><td className="pl-4">Rent Relief (max):</td><td className="text-right text-red-600">-₦500,000</td></tr>
                              <tr className="border-t font-medium"><td>Total Deductions:</td><td className="text-right text-red-600">-₦3,125,000</td></tr>
                              <tr className="border-t"><td className="font-medium">Taxable Income:</td><td className="text-right font-bold">₦21,875,000</td></tr>
                              <tr className="border-t border-gray-200"><td colSpan={2} className="text-gray-500 pt-2">Tax Comparison:</td></tr>
                              <tr><td className="pl-4">Without Deductions:</td><td className="text-right">₦4,380,000</td></tr>
                              <tr><td className="pl-4">With Deductions:</td><td className="text-right">₦3,613,750</td></tr>
                              <tr className="border-t bg-green-50"><td className="font-bold text-green-700">Total Tax Saved:</td><td className="text-right font-bold text-green-700">₦766,250</td></tr>
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
              </div>
              )}

              {/* Company Tax Section */}
              {taxRecommendationTab === 'company' && (
              <div className="space-y-6">
              <div className="bg-gradient-to-r from-green-50 to-emerald-50 border border-green-200 rounded-lg p-4">
                <h3 className="text-lg font-bold text-green-800 flex items-center gap-2">
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                  </svg>
                  Company Tax Reduction Strategies (NTA 2025)
                </h3>
                <p className="text-green-700 text-sm mt-1">
                  Legal strategies to minimize your company's tax liability under the Nigeria Tax Act 2025
                </p>
              </div>

              {/* Strategy 1: Maximize Capital Allowances */}
              <div className="bg-white border border-gray-200 rounded-lg p-5">
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center flex-shrink-0">
                    <span className="text-blue-600 font-bold">1</span>
                  </div>
                  <div>
                    <h4 className="font-semibold text-gray-900 text-lg">Maximize Capital Allowances</h4>
                    <p className="text-gray-600 mt-2">
                      Capital allowances reduce your taxable profit by allowing you to deduct depreciation on business assets.
                    </p>
                    <div className="mt-3 bg-blue-50 rounded-lg p-4">
                      <h5 className="font-medium text-blue-800 mb-2">How it reduces tax:</h5>
                      <ul className="text-sm text-blue-700 space-y-1">
                        <li>• <strong>Initial Allowance:</strong> Claim up to 50% of asset cost in the first year</li>
                        <li>• <strong>Annual Allowance:</strong> Claim 25% of reducing balance yearly</li>
                        <li>• <strong>Qualifying Assets:</strong> Machinery, equipment, vehicles, buildings, furniture</li>
                      </ul>
                      <div className="mt-3 p-3 bg-white rounded border border-blue-200">
                        <p className="text-sm text-gray-700">
                          <strong>Example:</strong> Purchase ₦100M equipment → Claim ₦50M initial allowance →
                          Reduces taxable profit by ₦50M → Saves ₦15M in CIT (30%)
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Strategy 2: Small Company Exemption */}
              <div className="bg-white border border-gray-200 rounded-lg p-5">
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center flex-shrink-0">
                    <span className="text-green-600 font-bold">2</span>
                  </div>
                  <div>
                    <h4 className="font-semibold text-gray-900 text-lg">Qualify for Small Company Exemption</h4>
                    <p className="text-gray-600 mt-2">
                      Small companies pay 0% Corporate Income Tax under NTA 2025.
                    </p>
                    <div className="mt-3 bg-green-50 rounded-lg p-4">
                      <h5 className="font-medium text-green-800 mb-2">Qualification criteria:</h5>
                      <ul className="text-sm text-green-700 space-y-1">
                        <li>• <strong>Annual Turnover:</strong> Must not exceed ₦50 million</li>
                        <li>• <strong>Fixed Assets:</strong> Must be below ₦250 million</li>
                        <li>• <strong>Both conditions</strong> must be met simultaneously</li>
                      </ul>
                      <div className="mt-3 p-3 bg-white rounded border border-green-200">
                        <p className="text-sm text-gray-700">
                          <strong>Tip:</strong> If your turnover is close to ₦50M, consider deferring some revenue
                          to the next financial year to maintain small company status and save 30% CIT.
                        </p>
                      </div>
                      <div className="mt-2 p-3 bg-yellow-50 rounded border border-yellow-200">
                        <p className="text-sm text-yellow-800">
                          <strong>Note:</strong> Professional services (lawyers, accountants, consultants) are
                          excluded from this exemption regardless of size.
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Strategy 3: Deductible Business Expenses */}
              <div className="bg-white border border-gray-200 rounded-lg p-5">
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 bg-purple-100 rounded-full flex items-center justify-center flex-shrink-0">
                    <span className="text-purple-600 font-bold">3</span>
                  </div>
                  <div>
                    <h4 className="font-semibold text-gray-900 text-lg">Claim All Allowable Business Expenses</h4>
                    <p className="text-gray-600 mt-2">
                      Ensure you're claiming all legitimate business expenses to reduce your taxable profit.
                    </p>
                    <div className="mt-3 bg-purple-50 rounded-lg p-4">
                      <h5 className="font-medium text-purple-800 mb-2">Deductible expenses include:</h5>
                      <div className="grid md:grid-cols-2 gap-4 text-sm text-purple-700">
                        <ul className="space-y-1">
                          <li>• Salaries and wages</li>
                          <li>• Rent and utilities</li>
                          <li>• Office supplies and equipment</li>
                          <li>• Professional fees (legal, accounting)</li>
                          <li>• Insurance premiums</li>
                        </ul>
                        <ul className="space-y-1">
                          <li>• Marketing and advertising</li>
                          <li>• Travel and transportation</li>
                          <li>• Training and development</li>
                          <li>• Bad debts written off</li>
                          <li>• Repairs and maintenance</li>
                        </ul>
                      </div>
                      <div className="mt-3 p-3 bg-white rounded border border-purple-200">
                        <p className="text-sm text-gray-700">
                          <strong>Keep records:</strong> Maintain receipts and invoices for all expenses.
                          Use the Documents tab to upload and track your deductible expenses.
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Strategy 4: Economic Development Incentive (EDI) - Replaces Pioneer Status */}
              <div className="bg-white border border-gray-200 rounded-lg p-5">
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 bg-orange-100 rounded-full flex items-center justify-center flex-shrink-0">
                    <span className="text-orange-600 font-bold">4</span>
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h4 className="font-semibold text-gray-900 text-lg">Economic Development Incentive (EDI)</h4>
                      <span className="px-2 py-1 bg-yellow-100 text-yellow-800 text-xs font-medium rounded">NTA 2025 NEW</span>
                    </div>
                    <p className="text-gray-600 mt-2">
                      NTA 2025 replaces Pioneer Status with the Economic Development Incentive (EDI) - a credit-based system targeting investment in priority sectors.
                    </p>
                    <div className="mt-3 bg-orange-50 rounded-lg p-4">
                      <div className="p-3 bg-yellow-50 rounded border border-yellow-200 mb-4">
                        <p className="text-sm text-yellow-800">
                          <strong>Key Change:</strong> Shift from blanket tax holidays to performance-based tax credits tied to actual capital investment in high-impact sectors.
                        </p>
                      </div>
                      <h5 className="font-medium text-orange-800 mb-2">How EDI Works:</h5>
                      <ul className="text-sm text-orange-700 space-y-1">
                        <li>• <strong>Credit Rate:</strong> 5% per year on Qualifying Capital Expenditure (QCE)</li>
                        <li>• <strong>Duration:</strong> Up to 5 years (total 25% credit)</li>
                        <li>• <strong>Requirement:</strong> Actual investment in qualifying assets/facilities</li>
                        <li>• <strong>Sectors:</strong> Manufacturing, agro-processing, renewable energy, pharmaceuticals, mining</li>
                      </ul>
                      <div className="mt-3 p-3 bg-white rounded border border-orange-200">
                        <p className="text-sm font-medium text-gray-800 mb-2">Worked Example:</p>
                        <table className="text-sm text-gray-700 w-full">
                          <tbody>
                            <tr><td>Capital Investment in Factory:</td><td className="text-right font-medium">₦500,000,000</td></tr>
                            <tr><td>Annual EDI Credit (5%):</td><td className="text-right text-green-600">₦25,000,000/year</td></tr>
                            <tr><td>Total Credit over 5 years:</td><td className="text-right font-bold text-green-600">₦125,000,000</td></tr>
                          </tbody>
                        </table>
                      </div>
                      <div className="mt-3 p-3 bg-blue-50 rounded border border-blue-200">
                        <p className="text-sm text-blue-800">
                          <strong>How to Apply:</strong> Submit application to NIPC with proof of qualifying capital expenditure. Credit applied against CIT liability annually.
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Strategy 4b: Sector-Specific Tax Holidays */}
              <div className="bg-white border border-gray-200 rounded-lg p-5">
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 bg-emerald-100 rounded-full flex items-center justify-center flex-shrink-0">
                    <span className="text-emerald-600 font-bold">4b</span>
                  </div>
                  <div className="flex-1">
                    <h4 className="font-semibold text-gray-900 text-lg">Sector-Specific Tax Exemptions (NTA 2025)</h4>
                    <p className="text-gray-600 mt-2">
                      Beyond EDI, certain sectors enjoy full tax holidays under NTA 2025.
                    </p>
                    <div className="mt-3 space-y-3">
                      {/* Agriculture */}
                      <div className="p-3 bg-green-50 rounded-lg border border-green-200">
                        <div className="flex items-center gap-2 mb-2 flex-wrap">
                          <span className="px-2 py-1 bg-green-100 text-green-800 text-xs font-medium rounded">5-10 Years</span>
                          <h5 className="font-medium text-green-800">Agriculture & Agro-Processing</h5>
                        </div>
                        <p className="text-sm text-green-700">
                          Complete tax exemption for first 5 years (extendable to 10 years if 100% profits reinvested). Covers: crop production, livestock, aquaculture, forestry, dairy, cocoa processing, animal feed manufacturing.
                        </p>
                        <div className="mt-2 text-xs text-green-600 space-y-1">
                          <p><strong>Additional Benefits:</strong></p>
                          <ul className="list-disc list-inside pl-2">
                            <li>Agribusiness Small Company Relief: ₦100M turnover threshold (vs ₦50M general)</li>
                            <li>Withholding Tax Exemption on agricultural income</li>
                            <li>VAT Zero-Rating on basic food items (input VAT recoverable)</li>
                            <li>EDI credits available for agro-processing investments</li>
                          </ul>
                        </div>
                      </div>

                      {/* Mining */}
                      <div className="p-3 bg-amber-50 rounded-lg border border-amber-200">
                        <div className="flex items-center gap-2 mb-2">
                          <span className="px-2 py-1 bg-amber-100 text-amber-800 text-xs font-medium rounded">3 Years</span>
                          <h5 className="font-medium text-amber-800">Mining & Solid Minerals</h5>
                        </div>
                        <p className="text-sm text-amber-700">
                          New mining companies exempt for 3 years. Priority minerals (coal, limestone, gold, lithium, iron ore) also qualify for EDI credits.
                        </p>
                      </div>

                      {/* Gas Utilization */}
                      <div className="p-3 bg-blue-50 rounded-lg border border-blue-200">
                        <div className="flex items-center gap-2 mb-2">
                          <span className="px-2 py-1 bg-blue-100 text-blue-800 text-xs font-medium rounded">5 Years+</span>
                          <h5 className="font-medium text-blue-800">Gas Utilization (Downstream)</h5>
                        </div>
                        <p className="text-sm text-blue-700">
                          Tax-free period up to 5 years, extendable. Covers LNG, gas-to-liquids, gas distribution operations.
                        </p>
                      </div>

                      {/* Export-Oriented */}
                      <div className="p-3 bg-purple-50 rounded-lg border border-purple-200">
                        <div className="flex items-center gap-2 mb-2">
                          <span className="px-2 py-1 bg-purple-100 text-purple-800 text-xs font-medium rounded">Full Exemption</span>
                          <h5 className="font-medium text-purple-800">Export-Oriented Businesses</h5>
                        </div>
                        <p className="text-sm text-purple-700">
                          EPZ/FTZ companies exporting 75%+ of goods/services enjoy full tax exemption. 100% exporters outside EPZ may get 3-year holiday.
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Strategy 5: R&D Tax Incentives */}
              <div className="bg-white border border-gray-200 rounded-lg p-5">
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 bg-indigo-100 rounded-full flex items-center justify-center flex-shrink-0">
                    <span className="text-indigo-600 font-bold">5</span>
                  </div>
                  <div>
                    <h4 className="font-semibold text-gray-900 text-lg">Invest in Research & Development</h4>
                    <p className="text-gray-600 mt-2">
                      R&D expenditures qualify for enhanced tax deductions under NTA 2025.
                    </p>
                    <div className="mt-3 bg-indigo-50 rounded-lg p-4">
                      <h5 className="font-medium text-indigo-800 mb-2">R&D tax benefits:</h5>
                      <ul className="text-sm text-indigo-700 space-y-1">
                        <li>• <strong>120% Deduction:</strong> Claim 120% of qualifying R&D expenses</li>
                        <li>• <strong>Qualifying R&D:</strong> Product development, process improvement, scientific research</li>
                        <li>• <strong>Documentation:</strong> Keep detailed records of R&D activities and expenses</li>
                      </ul>
                      <div className="mt-3 p-3 bg-white rounded border border-indigo-200">
                        <p className="text-sm text-gray-700">
                          <strong>Example:</strong> Spend ₦10M on R&D → Claim ₦12M deduction →
                          Extra ₦2M reduces taxable profit → Saves ₦600K in CIT
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Strategy 6: Non-Resident Status */}
              <div className="bg-white border border-gray-200 rounded-lg p-5">
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 bg-teal-100 rounded-full flex items-center justify-center flex-shrink-0">
                    <span className="text-teal-600 font-bold">6</span>
                  </div>
                  <div>
                    <h4 className="font-semibold text-gray-900 text-lg">Development Levy Exemption (Non-Residents)</h4>
                    <p className="text-gray-600 mt-2">
                      Non-resident companies are exempt from the 4% Development Levy.
                    </p>
                    <div className="mt-3 bg-teal-50 rounded-lg p-4">
                      <h5 className="font-medium text-teal-800 mb-2">For non-resident companies:</h5>
                      <ul className="text-sm text-teal-700 space-y-1">
                        <li>• <strong>Levy Exemption:</strong> Save 4% on assessable profits</li>
                        <li>• <strong>Still Pay CIT:</strong> 30% CIT on taxable profit still applies</li>
                        <li>• <strong>Withholding Tax:</strong> Subject to WHT on Nigerian-sourced income</li>
                      </ul>
                      <div className="mt-3 p-3 bg-white rounded border border-teal-200">
                        <p className="text-sm text-gray-700">
                          <strong>Example:</strong> Assessable Profit ₦100M → Save ₦4M (4% levy exemption)
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Company Tax Disclaimer */}
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                <div className="flex items-start gap-3">
                  <svg className="w-6 h-6 text-yellow-600 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                  </svg>
                  <div>
                    <h4 className="font-semibold text-yellow-800">Important Disclaimer</h4>
                    <p className="text-sm text-yellow-700 mt-1">
                      These recommendations are for informational purposes only and do not constitute professional tax advice.
                      Tax laws are complex and subject to change. Consult Nigeria Revenue Service before making tax-related decisions.
                    </p>
                  </div>
                </div>
              </div>
              </div>
              )}
            </div>
          )}

          {/* Documents Tab */}
          {activeTab === 'documents' && (
            <div className="space-y-6">
              {/* Upload Section */}
              <div className="bg-gray-50 rounded-lg p-6 border-2 border-dashed border-gray-300">
                <div className="flex flex-col items-center">
                  <svg className="w-12 h-12 text-gray-400 mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                  </svg>
                  <p className="text-gray-600 mb-4">Upload receipts and invoices for OCR processing</p>

                  <div className="flex items-center gap-4 mb-4">
                    <label className="flex items-center gap-2">
                      <input
                        type="radio"
                        name="uploadType"
                        checked={uploadType === 'receipt'}
                        onChange={() => setUploadType('receipt')}
                        className="text-primary-600 focus:ring-primary-500"
                      />
                      <span className="text-sm">Receipt</span>
                    </label>
                    <label className="flex items-center gap-2">
                      <input
                        type="radio"
                        name="uploadType"
                        checked={uploadType === 'invoice'}
                        onChange={() => setUploadType('invoice')}
                        className="text-primary-600 focus:ring-primary-500"
                      />
                      <span className="text-sm">Invoice</span>
                    </label>
                  </div>

                  <label className="px-6 py-3 bg-primary-600 text-white rounded-lg cursor-pointer hover:bg-primary-700 transition-colors">
                    {isUploading ? `Processing... ${uploadProgress}%` : 'Select File'}
                    <input
                      type="file"
                      className="hidden"
                      accept="image/*,application/pdf"
                      onChange={handleFileUpload}
                      disabled={isUploading}
                    />
                  </label>
                </div>

                {isUploading && (
                  <div className="mt-4">
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div
                        className="bg-primary-600 h-2 rounded-full transition-all duration-300"
                        style={{ width: `${uploadProgress}%` }}
                      />
                    </div>
                  </div>
                )}
              </div>

              {/* Documents List */}
              <div>
                <h3 className="text-lg font-semibold text-gray-800 mb-3">
                  Uploaded Documents ({documents.length})
                </h3>
                {documents.length === 0 ? (
                  <p className="text-gray-500 text-sm">No documents uploaded yet.</p>
                ) : (
                  <div className="space-y-3">
                    {documents.map((doc) => (
                      <div key={doc.id} className="flex items-center justify-between p-4 bg-white border border-gray-200 rounded-lg">
                        <div className="flex items-center gap-3">
                          <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                            doc.type === 'receipt' ? 'bg-green-100 text-green-600' : 'bg-blue-100 text-blue-600'
                          }`}>
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                            </svg>
                          </div>
                          <div>
                            <div className="font-medium text-gray-800">{doc.fileName}</div>
                            <div className="text-xs text-gray-500">
                              {doc.type.charAt(0).toUpperCase() + doc.type.slice(1)} • {doc.uploadDate.toLocaleDateString('en-NG')}
                            </div>
                            <div className="text-xs text-gray-400 mt-1 max-w-md truncate">
                              {doc.description}
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-4">
                          <div className="text-right">
                            <div className="font-semibold text-green-600">
                              {formatCurrency(doc.extractedAmount)}
                            </div>
                            <div className="text-xs text-gray-500">Extracted</div>
                          </div>
                          <button
                            onClick={() => removeDocument(doc.id)}
                            className="p-2 text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                          >
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                            </svg>
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* History Tab */}
          {activeTab === 'history' && (
            <div>
              <h3 className="text-lg font-semibold text-gray-800 mb-3">Tax Calculation History</h3>
              {taxHistory.length === 0 ? (
                <p className="text-gray-500 text-sm">No calculations saved yet.</p>
              ) : (
                <div className="space-y-4">
                  {taxHistory.map((calc) => (
                    <div key={calc.id} className="bg-white border border-gray-200 rounded-lg p-4">
                      <div className="flex justify-between items-start mb-3">
                        <div>
                          <span className={`inline-block px-2 py-1 rounded text-xs font-medium ${
                            calc.type === 'personal'
                              ? 'bg-primary-100 text-primary-700'
                              : 'bg-purple-100 text-purple-700'
                          }`}>
                            {calc.type === 'personal' ? 'Personal Tax' : 'Company Tax'}
                          </span>
                          <div className="text-sm text-gray-500 mt-1">
                            {calc.date.toLocaleDateString('en-NG', { dateStyle: 'full' })}
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="text-2xl font-bold text-red-600">
                            {formatCurrency(calc.result?.totalTax || 0)}
                          </div>
                          <div className="text-xs text-gray-500">Total Tax</div>
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-4 text-sm">
                        <div>
                          <span className="text-gray-500">
                            {calc.type === 'personal' ? 'Gross Income:' : 'Assessable Profit:'}
                          </span>
                          <span className="ml-2 font-medium">
                            {formatCurrency(calc.result?.grossIncome || calc.result?.assessableProfit || 0)}
                          </span>
                        </div>
                        <div>
                          <span className="text-gray-500">
                            {calc.type === 'personal' ? 'Taxable Income:' : 'Taxable Profit:'}
                          </span>
                          <span className="ml-2 font-medium">
                            {formatCurrency(calc.result?.taxableIncome || calc.result?.taxableProfit || 0)}
                          </span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Privacy/Data Protection Tab */}
          {activeTab === 'privacy' && (
            <div className="prose prose-sm max-w-none">
              <h3 className="text-lg font-semibold text-gray-800 mb-4">Data Protection Statement</h3>

              <div className="bg-primary-50 border border-primary-200 rounded-lg p-6 space-y-4">
                <div>
                  <h4 className="font-semibold text-primary-800">1. Data Collection</h4>
                  <p className="text-gray-700">
                    This Nigeria Tax Calculator application collects minimal personal information necessary
                    to provide tax calculation services. This includes your email address, company name,
                    and any financial documents you voluntarily upload for OCR processing.
                  </p>
                </div>

                <div>
                  <h4 className="font-semibold text-primary-800">2. Data Storage</h4>
                  <p className="text-gray-700">
                    All data is stored locally on your device using browser local storage. We do not
                    transmit your financial information to external servers. Your tax calculations and
                    uploaded documents remain under your control.
                  </p>
                </div>

                <div>
                  <h4 className="font-semibold text-primary-800">3. Data Security</h4>
                  <p className="text-gray-700">
                    While we implement reasonable security measures, please note that browser local
                    storage has inherent limitations. We recommend not storing highly sensitive
                    information and clearing your data after use on shared devices.
                  </p>
                </div>

                <div>
                  <h4 className="font-semibold text-primary-800">4. Third-Party Services</h4>
                  <p className="text-gray-700">
                    The OCR functionality uses Tesseract.js, which processes images locally in your
                    browser. No images are sent to external servers for processing.
                  </p>
                </div>

                <div>
                  <h4 className="font-semibold text-primary-800">5. Your Rights</h4>
                  <p className="text-gray-700">
                    You have the right to access, modify, and delete your data at any time. You can
                    remove individual documents or clear all stored data by logging out and clearing
                    your browser's local storage.
                  </p>
                </div>

                <div>
                  <h4 className="font-semibold text-primary-800">6. Compliance</h4>
                  <p className="text-gray-700">
                    This application is designed to comply with the Nigeria Data Protection Regulation
                    (NDPR) 2019. We are committed to protecting your privacy and ensuring transparent
                    data handling practices.
                  </p>
                </div>

                <div>
                  <h4 className="font-semibold text-primary-800">7. Disclaimer</h4>
                  <p className="text-gray-700">
                    This calculator provides estimates based on the Nigeria Tax Act 2025 and is for
                    informational purposes only. It does not constitute professional tax advice. Please
                    consult Nigeria Revenue Service for official tax filing and compliance matters.
                  </p>
                </div>

                <div className="pt-4 border-t border-primary-200">
                  <p className="text-xs text-gray-500">
                    Last updated: January 2026 | Contact: support@nigeriataxcalculator.ng
                  </p>
                  <p className="text-xs text-gray-400 mt-2">© Tech84</p>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Dashboard;

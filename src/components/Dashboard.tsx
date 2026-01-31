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
              <div className="bg-gradient-to-r from-green-50 to-emerald-50 border border-green-200 rounded-lg p-4">
                <h3 className="text-lg font-bold text-green-800 flex items-center gap-2">
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  Tax Reduction Strategies (NTA 2025)
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

              {/* Strategy 4: Pioneer Status */}
              <div className="bg-white border border-gray-200 rounded-lg p-5">
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 bg-orange-100 rounded-full flex items-center justify-center flex-shrink-0">
                    <span className="text-orange-600 font-bold">4</span>
                  </div>
                  <div>
                    <h4 className="font-semibold text-gray-900 text-lg">Apply for Pioneer Status</h4>
                    <p className="text-gray-600 mt-2">
                      Companies in qualifying industries can enjoy tax holidays of 3-5 years.
                    </p>
                    <div className="mt-3 bg-orange-50 rounded-lg p-4">
                      <h5 className="font-medium text-orange-800 mb-2">Qualifying industries:</h5>
                      <ul className="text-sm text-orange-700 space-y-1">
                        <li>• Manufacturing and processing</li>
                        <li>• Agriculture and agro-processing</li>
                        <li>• Mining and solid minerals</li>
                        <li>• Information technology</li>
                        <li>• Tourism and hospitality</li>
                        <li>• Healthcare and pharmaceuticals</li>
                      </ul>
                      <div className="mt-3 p-3 bg-white rounded border border-orange-200">
                        <p className="text-sm text-gray-700">
                          <strong>Benefit:</strong> 100% tax exemption for 3 years (extendable to 5 years).
                          Apply through the Nigerian Investment Promotion Commission (NIPC).
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

              {/* Strategy 6: Timing of Asset Disposal */}
              <div className="bg-white border border-gray-200 rounded-lg p-5">
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 bg-red-100 rounded-full flex items-center justify-center flex-shrink-0">
                    <span className="text-red-600 font-bold">6</span>
                  </div>
                  <div>
                    <h4 className="font-semibold text-gray-900 text-lg">Strategic Asset Disposal Timing</h4>
                    <p className="text-gray-600 mt-2">
                      Plan asset sales to minimize chargeable gains tax.
                    </p>
                    <div className="mt-3 bg-red-50 rounded-lg p-4">
                      <h5 className="font-medium text-red-800 mb-2">Key considerations:</h5>
                      <ul className="text-sm text-red-700 space-y-1">
                        <li>• <strong>Tax Written Down Value:</strong> Higher TWDV means lower chargeable gain</li>
                        <li>• <strong>Timing:</strong> Dispose assets in years with lower profits to offset gains</li>
                        <li>• <strong>Replacement:</strong> Consider reinvesting proceeds in new assets for rollover relief</li>
                      </ul>
                      <div className="mt-3 p-3 bg-white rounded border border-red-200">
                        <p className="text-sm text-gray-700">
                          <strong>Calculation:</strong> Chargeable Gain = Sales Proceeds - Tax Written Down Value.
                          This gain is added to taxable profit and taxed at 30%.
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Strategy 7: Non-Resident Status */}
              <div className="bg-white border border-gray-200 rounded-lg p-5">
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 bg-teal-100 rounded-full flex items-center justify-center flex-shrink-0">
                    <span className="text-teal-600 font-bold">7</span>
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

              {/* Disclaimer */}
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                <div className="flex items-start gap-3">
                  <svg className="w-6 h-6 text-yellow-600 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                  </svg>
                  <div>
                    <h4 className="font-semibold text-yellow-800">Important Disclaimer</h4>
                    <p className="text-sm text-yellow-700 mt-1">
                      These recommendations are for informational purposes only and do not constitute professional tax advice.
                      Tax laws are complex and subject to change. Always consult with a qualified tax professional or the
                      Federal Inland Revenue Service (FIRS) before making tax-related decisions.
                    </p>
                  </div>
                </div>
              </div>
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
                    consult a qualified tax professional or the Nigeria Revenue Service (NRS)
                    for official tax filing and compliance matters.
                  </p>
                </div>

                <div className="pt-4 border-t border-primary-200">
                  <p className="text-xs text-gray-500">
                    Last updated: January 2026 | Contact: support@nigeriataxcalculator.ng
                  </p>
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

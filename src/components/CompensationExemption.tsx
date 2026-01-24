import React, { useState, useEffect } from 'react';
import { formatCurrency, calculateProgressiveTax } from '../utils/taxCalculations';
import { COMPENSATION_EXEMPTION } from '../utils/taxRecommendations';

export interface CompensationData {
  totalCompensation: number;
  yearsOfService: number;
}

export interface CompensationResult {
  totalCompensation: number;
  exemptPortion: number;
  taxablePortion: number;
  estimatedTax: number;
  yearsOfService: number;
}

interface CompensationExemptionProps {
  onCalculate?: (result: CompensationResult) => void;
}

const CompensationExemption: React.FC<CompensationExemptionProps> = ({ onCalculate }) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [totalCompensation, setTotalCompensation] = useState<string>('');
  const [yearsOfService, setYearsOfService] = useState<string>('');
  const [result, setResult] = useState<CompensationResult | null>(null);

  const parseNumber = (value: string): number => {
    const cleaned = value.replace(/,/g, '');
    const num = parseFloat(cleaned);
    return isNaN(num) ? 0 : num;
  };

  const formatInputValue = (value: string): string => {
    const cleaned = value.replace(/[^0-9.]/g, '');
    const parts = cleaned.split('.');
    if (parts[0]) {
      parts[0] = parseInt(parts[0], 10).toLocaleString('en-NG');
    }
    return parts.join('.');
  };

  const handleCompensationChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value.replace(/,/g, '');
    if (raw === '' || /^\d*\.?\d*$/.test(raw)) {
      setTotalCompensation(formatInputValue(raw));
    }
  };

  const handleYearsChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value.replace(/[^0-9]/g, '');
    setYearsOfService(raw);
  };

  useEffect(() => {
    const compensation = parseNumber(totalCompensation);
    const years = parseInt(yearsOfService) || 0;

    if (compensation > 0) {
      // NTA 2025: First ₦50M is exempt
      const exemptPortion = Math.min(compensation, COMPENSATION_EXEMPTION.threshold);
      const taxablePortion = Math.max(0, compensation - COMPENSATION_EXEMPTION.threshold);

      // Calculate tax on taxable portion using progressive rates
      const { totalTax } = calculateProgressiveTax(taxablePortion);

      const calculatedResult: CompensationResult = {
        totalCompensation: compensation,
        exemptPortion,
        taxablePortion,
        estimatedTax: totalTax,
        yearsOfService: years,
      };

      setResult(calculatedResult);
      if (onCalculate) {
        onCalculate(calculatedResult);
      }
    } else {
      setResult(null);
    }
  }, [totalCompensation, yearsOfService, onCalculate]);

  return (
    <div className="bg-white rounded-lg shadow-md overflow-hidden">
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full px-6 py-4 flex items-center justify-between text-left hover:bg-gray-50 transition-colors"
      >
        <div className="flex items-center">
          <svg className="w-5 h-5 text-primary-600 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" />
          </svg>
          <div>
            <h3 className="font-semibold text-gray-800">Compensation for Loss of Office</h3>
            <p className="text-xs text-gray-500">NTA 2025: Up to {formatCurrency(COMPENSATION_EXEMPTION.threshold)} tax-exempt</p>
          </div>
        </div>
        <svg
          className={`w-5 h-5 text-gray-400 transition-transform ${isExpanded ? 'rotate-180' : ''}`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {isExpanded && (
        <div className="px-6 pb-6 border-t border-gray-100">
          {/* Info Banner */}
          <div className="mt-4 p-3 bg-blue-50 rounded-lg border border-blue-100">
            <div className="flex items-start">
              <svg className="w-5 h-5 text-blue-600 mr-2 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <div className="text-sm text-blue-700">
                <p className="font-medium">NTA 2025 Compensation Rules:</p>
                <ul className="mt-1 list-disc list-inside text-xs">
                  <li>Exemption threshold increased from {formatCurrency(10000000)} to {formatCurrency(COMPENSATION_EXEMPTION.threshold)}</li>
                  <li>Amount up to {formatCurrency(COMPENSATION_EXEMPTION.threshold)} is completely tax-exempt</li>
                  <li>Only the excess above {formatCurrency(COMPENSATION_EXEMPTION.threshold)} is taxable</li>
                </ul>
              </div>
            </div>
          </div>

          {/* Input Fields */}
          <div className="mt-4 space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Total Compensation Received (₦)
              </label>
              <input
                type="text"
                value={totalCompensation}
                onChange={handleCompensationChange}
                placeholder="Enter total severance/compensation amount"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              />
              <p className="text-xs text-gray-500 mt-1">
                Include all severance, golden handshake, and compensation payments
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Years of Service <span className="text-gray-400 font-normal">- Optional</span>
              </label>
              <input
                type="text"
                value={yearsOfService}
                onChange={handleYearsChange}
                placeholder="Number of years"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              />
              <p className="text-xs text-gray-500 mt-1">
                For record purposes only - does not affect calculation
              </p>
            </div>
          </div>

          {/* Results */}
          {result && (
            <div className="mt-6 p-4 bg-gray-50 rounded-lg">
              <h4 className="font-semibold text-gray-800 mb-3">Calculation Breakdown</h4>

              <div className="space-y-2">
                <div className="flex justify-between py-1">
                  <span className="text-gray-600">Total Compensation:</span>
                  <span className="font-medium">{formatCurrency(result.totalCompensation)}</span>
                </div>

                {result.yearsOfService > 0 && (
                  <div className="flex justify-between py-1">
                    <span className="text-gray-600">Years of Service:</span>
                    <span className="font-medium">{result.yearsOfService} years</span>
                  </div>
                )}

                <div className="flex justify-between py-2 bg-green-50 px-3 rounded-lg">
                  <span className="text-green-700 font-semibold">Tax-Exempt Portion:</span>
                  <span className="text-green-700 font-bold">{formatCurrency(result.exemptPortion)}</span>
                </div>

                {result.taxablePortion > 0 ? (
                  <>
                    <div className="flex justify-between py-2 bg-yellow-50 px-3 rounded-lg">
                      <span className="text-yellow-700 font-semibold">Taxable Portion:</span>
                      <span className="text-yellow-700 font-bold">{formatCurrency(result.taxablePortion)}</span>
                    </div>

                    <div className="flex justify-between py-2 bg-red-50 px-3 rounded-lg">
                      <span className="text-red-700 font-semibold">Estimated Tax on Excess:</span>
                      <span className="text-red-700 font-bold">{formatCurrency(result.estimatedTax)}</span>
                    </div>

                    <p className="text-xs text-gray-500 mt-2">
                      Tax is calculated using progressive personal income tax bands on the taxable portion.
                    </p>
                  </>
                ) : (
                  <div className="mt-3 p-3 bg-green-50 rounded-lg border border-green-100">
                    <div className="flex items-center">
                      <svg className="w-5 h-5 text-green-600 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      <p className="text-sm text-green-700 font-medium">
                        Your entire compensation is tax-exempt under NTA 2025!
                      </p>
                    </div>
                  </div>
                )}
              </div>

              {/* Tax Savings Callout */}
              {result.exemptPortion > 0 && (
                <div className="mt-4 p-3 bg-primary-50 rounded-lg border border-primary-100">
                  <p className="text-sm text-primary-700">
                    <span className="font-medium">NTA 2025 Benefit:</span> Under the old threshold of {formatCurrency(10000000)},
                    you would have paid more tax. The new {formatCurrency(COMPENSATION_EXEMPTION.threshold)} threshold
                    provides significant tax relief.
                  </p>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default CompensationExemption;

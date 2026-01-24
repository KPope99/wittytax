import React, { useState, useEffect } from 'react';
import { formatCurrency } from '../utils/taxCalculations';
import { SHARE_TRANSFER_EXEMPTION } from '../utils/taxRecommendations';

export interface ShareTransferData {
  disposalProceeds: number;
  costBasis: number;
  holdingPeriod: number;
  reinvestmentAmount: number;
}

export interface ShareTransferResult {
  capitalGain: number;
  isEligibleForExemption: boolean;
  exemptAmount: number;
  taxableGain: number;
  estimatedTax: number;
}

interface ShareTransferExemptionProps {
  onCalculate?: (result: ShareTransferResult) => void;
}

const ShareTransferExemption: React.FC<ShareTransferExemptionProps> = ({ onCalculate }) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [disposalProceeds, setDisposalProceeds] = useState<string>('');
  const [costBasis, setCostBasis] = useState<string>('');
  const [holdingPeriod, setHoldingPeriod] = useState<string>('');
  const [reinvestmentAmount, setReinvestmentAmount] = useState<string>('');
  const [result, setResult] = useState<ShareTransferResult | null>(null);

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

  const handleInputChange = (setter: React.Dispatch<React.SetStateAction<string>>) => (
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    const raw = e.target.value.replace(/,/g, '');
    if (raw === '' || /^\d*\.?\d*$/.test(raw)) {
      setter(formatInputValue(raw));
    }
  };

  useEffect(() => {
    const proceeds = parseNumber(disposalProceeds);
    const cost = parseNumber(costBasis);
    const reinvestment = parseNumber(reinvestmentAmount);

    if (proceeds > 0 && cost >= 0) {
      const capitalGain = Math.max(0, proceeds - cost);

      // Check eligibility: disposal proceeds must be below threshold
      const isEligibleForExemption = proceeds <= SHARE_TRANSFER_EXEMPTION.threshold;

      // Calculate exempt amount (max ₦10M)
      let exemptAmount = 0;
      if (isEligibleForExemption) {
        exemptAmount = Math.min(capitalGain, SHARE_TRANSFER_EXEMPTION.maxExemptibleGain);

        // Reinvestment exemption (additional exemption if reinvested)
        if (reinvestment > 0) {
          const reinvestmentExemption = Math.min(reinvestment, capitalGain - exemptAmount);
          exemptAmount += reinvestmentExemption;
        }
      }

      const taxableGain = capitalGain - exemptAmount;
      const estimatedTax = taxableGain * 0.10; // 10% CGT rate

      const calculatedResult: ShareTransferResult = {
        capitalGain,
        isEligibleForExemption,
        exemptAmount,
        taxableGain,
        estimatedTax,
      };

      setResult(calculatedResult);
      if (onCalculate) {
        onCalculate(calculatedResult);
      }
    } else {
      setResult(null);
    }
  }, [disposalProceeds, costBasis, reinvestmentAmount, onCalculate]);

  return (
    <div className="bg-white rounded-lg shadow-md overflow-hidden">
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full px-6 py-4 flex items-center justify-between text-left hover:bg-gray-50 transition-colors"
      >
        <div className="flex items-center">
          <svg className="w-5 h-5 text-primary-600 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
          </svg>
          <div>
            <h3 className="font-semibold text-gray-800">Share Transfer Exemption</h3>
            <p className="text-xs text-gray-500">NTA 2025: Up to {formatCurrency(SHARE_TRANSFER_EXEMPTION.maxExemptibleGain)} exemption available</p>
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
                <p className="font-medium">NTA 2025 Share Transfer Rules:</p>
                <ul className="mt-1 list-disc list-inside text-xs">
                  <li>Threshold: {formatCurrency(SHARE_TRANSFER_EXEMPTION.threshold)} (increased from {formatCurrency(100000000)})</li>
                  <li>Maximum exemptible gain: {formatCurrency(SHARE_TRANSFER_EXEMPTION.maxExemptibleGain)}</li>
                  <li>Additional reinvestment exemption available</li>
                </ul>
              </div>
            </div>
          </div>

          {/* Input Fields */}
          <div className="mt-4 space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Share Disposal Proceeds (₦)
              </label>
              <input
                type="text"
                value={disposalProceeds}
                onChange={handleInputChange(setDisposalProceeds)}
                placeholder="Enter disposal proceeds"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Original Cost Basis (₦)
              </label>
              <input
                type="text"
                value={costBasis}
                onChange={handleInputChange(setCostBasis)}
                placeholder="Enter original purchase cost"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Holding Period (months)
              </label>
              <input
                type="text"
                value={holdingPeriod}
                onChange={(e) => {
                  const raw = e.target.value.replace(/[^0-9]/g, '');
                  setHoldingPeriod(raw);
                }}
                placeholder="Number of months held"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Reinvestment Amount (₦) <span className="text-gray-400 font-normal">- Optional</span>
              </label>
              <input
                type="text"
                value={reinvestmentAmount}
                onChange={handleInputChange(setReinvestmentAmount)}
                placeholder="Amount reinvested in qualifying shares"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              />
              <p className="text-xs text-gray-500 mt-1">
                Reinvesting in qualifying shares may provide additional tax relief
              </p>
            </div>
          </div>

          {/* Results */}
          {result && (
            <div className="mt-6 p-4 bg-gray-50 rounded-lg">
              <h4 className="font-semibold text-gray-800 mb-3">Calculation Results</h4>

              <div className="space-y-2">
                <div className="flex justify-between py-1">
                  <span className="text-gray-600">Disposal Proceeds:</span>
                  <span className="font-medium">{formatCurrency(parseNumber(disposalProceeds))}</span>
                </div>
                <div className="flex justify-between py-1">
                  <span className="text-gray-600">Cost Basis:</span>
                  <span className="font-medium">{formatCurrency(parseNumber(costBasis))}</span>
                </div>
                <div className="flex justify-between py-1 border-t border-gray-200 pt-2">
                  <span className="text-gray-600">Capital Gain:</span>
                  <span className="font-medium">{formatCurrency(result.capitalGain)}</span>
                </div>

                {/* Exemption Status */}
                <div className="flex justify-between py-2">
                  <span className="text-gray-600">Exemption Status:</span>
                  <span className={`font-medium ${result.isEligibleForExemption ? 'text-green-600' : 'text-red-600'}`}>
                    {result.isEligibleForExemption ? 'Eligible' : 'Not Eligible'}
                  </span>
                </div>

                {result.exemptAmount > 0 && (
                  <div className="flex justify-between py-1">
                    <span className="text-gray-600">Exempt Amount:</span>
                    <span className="font-medium text-green-600">-{formatCurrency(result.exemptAmount)}</span>
                  </div>
                )}

                <div className="flex justify-between py-2 bg-yellow-50 px-3 rounded-lg">
                  <span className="text-yellow-700 font-semibold">Taxable Gain:</span>
                  <span className="text-yellow-700 font-bold">{formatCurrency(result.taxableGain)}</span>
                </div>

                <div className="flex justify-between py-2 bg-red-50 px-3 rounded-lg">
                  <span className="text-red-700 font-semibold">Estimated CGT (10%):</span>
                  <span className="text-red-700 font-bold">{formatCurrency(result.estimatedTax)}</span>
                </div>
              </div>

              {result.isEligibleForExemption && result.exemptAmount > 0 && (
                <div className="mt-3 p-2 bg-green-50 rounded-lg border border-green-100">
                  <p className="text-sm text-green-700">
                    You saved {formatCurrency(result.exemptAmount * 0.10)} in CGT through the NTA 2025 exemption.
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

export default ShareTransferExemption;

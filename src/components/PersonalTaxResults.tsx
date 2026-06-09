import React from 'react';
import { PersonalTaxResult, formatCurrency } from '../utils/taxCalculations';

interface PersonalTaxResultsProps {
  result: PersonalTaxResult;
  isAuthenticated: boolean;
  onDownloadPDF: () => void;
}

const PersonalTaxResults: React.FC<PersonalTaxResultsProps> = ({ result, isAuthenticated, onDownloadPDF }) => (
  <div className="bg-white rounded-lg shadow-md p-6">
    <div className="flex items-center justify-between mb-4">
      <h2 className="text-xl font-semibold text-gray-800">Tax Calculation Results</h2>
      {isAuthenticated ? (
        <button
          onClick={onDownloadPDF}
          className="flex items-center gap-2 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors text-sm"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
          Download PDF
        </button>
      ) : (
        <div className="flex items-center gap-2 px-4 py-2 bg-primary-50 border border-primary-200 rounded-lg">
          <svg className="w-5 h-5 text-primary-600 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
          </svg>
          <span className="text-sm font-semibold text-primary-700 leading-snug">
            Login to Download Detailed Breakdown<br />and Tax Saving Recommendations
          </span>
        </div>
      )}
    </div>

    <div className="space-y-3">
      <div className="flex justify-between py-2 border-b border-gray-200">
        <span className="text-gray-600">Gross Income:</span>
        <span className="font-medium">{formatCurrency(result.grossIncome)}</span>
      </div>

      <div className="text-sm font-medium text-gray-700 mt-4">Deductions:</div>

      {result.pensionDeduction > 0 && (
        <div className="flex justify-between py-1 text-sm">
          <span className="text-gray-500 pl-4">Pension (8%):</span>
          <span className="text-red-500">-{formatCurrency(result.pensionDeduction)}</span>
        </div>
      )}
      {result.voluntaryPensionContribution > 0 && (
        <div className="flex justify-between py-1 text-sm">
          <span className="text-gray-500 pl-4">Voluntary Pension (PRA 2014 s.4(3)):</span>
          <span className="text-red-500">-{formatCurrency(result.voluntaryPensionContribution)}</span>
        </div>
      )}
      {result.nhfDeduction > 0 && (
        <div className="flex justify-between py-1 text-sm">
          <span className="text-gray-500 pl-4">NHF (2.5%):</span>
          <span className="text-red-500">-{formatCurrency(result.nhfDeduction)}</span>
        </div>
      )}
      {result.rentRelief > 0 && (
        <div className="flex justify-between py-1 text-sm">
          <span className="text-gray-500 pl-4">Rent Relief:</span>
          <span className="text-red-500">-{formatCurrency(result.rentRelief)}</span>
        </div>
      )}
      {result.additionalDeductionsTotal > 0 && (
        <div className="flex justify-between py-1 text-sm">
          <span className="text-gray-500 pl-4">Additional Deductions:</span>
          <span className="text-red-500">-{formatCurrency(result.additionalDeductionsTotal)}</span>
        </div>
      )}
      {result.ocrDeductions > 0 && (
        <div className="flex justify-between py-1 text-sm">
          <span className="text-gray-500 pl-4">OCR Deductions:</span>
          <span className="text-red-500">-{formatCurrency(result.ocrDeductions)}</span>
        </div>
      )}

      <div className="flex justify-between py-2 border-t border-gray-200 font-medium">
        <span className="text-gray-700">Total Deductions:</span>
        <span className="text-red-600">-{formatCurrency(result.totalDeductions)}</span>
      </div>

      <div className="flex justify-between py-2 border-b border-gray-200">
        <span className="text-gray-600">Taxable Income:</span>
        <span className="font-medium">{formatCurrency(result.taxableIncome)}</span>
      </div>

      {result.taxBreakdown.length > 0 && (
        <div className="mt-4">
          <div className="text-sm font-medium text-gray-700 mb-2">Tax Breakdown by Band:</div>
          {result.taxBreakdown.map((band, index) => (
            <div key={index} className="flex justify-between py-1 text-xs">
              <span className="text-gray-500 pl-4">{band.band} @ {band.rate}%:</span>
              <span className="text-gray-600">{formatCurrency(band.tax)}</span>
            </div>
          ))}
        </div>
      )}

      {/* Tax-Exempt Pension Income — Benefits 2 & 3 */}
      {result.totalExemptPensionIncome > 0 && (
        <div className="mt-4 p-3 bg-green-50 rounded-lg border border-green-200">
          <div className="text-sm font-semibold text-green-800 mb-2">Tax-Exempt Pension Income (PRA 2014)</div>
          {result.pensionFundInvestmentIncome > 0 && (
            <div className="flex justify-between py-1 text-sm">
              <span className="text-green-700 pl-2">Fund Investment Income (s.10(3)):</span>
              <span className="text-green-700 font-medium">{formatCurrency(result.pensionFundInvestmentIncome)} <span className="text-xs">TAX-FREE</span></span>
            </div>
          )}
          {result.retirementWithdrawalIncome > 0 && (
            <div className="flex justify-between py-1 text-sm">
              <span className="text-green-700 pl-2">Retirement Withdrawal (s.7(3)):</span>
              <span className="text-green-700 font-medium">{formatCurrency(result.retirementWithdrawalIncome)} <span className="text-xs">TAX-FREE</span></span>
            </div>
          )}
          <div className="flex justify-between py-1 text-sm border-t border-green-200 mt-1 pt-1">
            <span className="text-green-800 font-semibold pl-2">Total Exempt:</span>
            <span className="text-green-800 font-bold">{formatCurrency(result.totalExemptPensionIncome)}</span>
          </div>
        </div>
      )}

      <div className="flex justify-between py-2 bg-red-50 px-3 rounded-lg mt-4">
        <span className="text-red-700 font-semibold">Total Tax Liability:</span>
        <span className="text-red-700 font-bold">{formatCurrency(result.totalTax)}</span>
      </div>

      <div className="flex justify-between py-2 bg-primary-50 px-3 rounded-lg">
        <span className="text-primary-700 font-semibold">Net Income:</span>
        <span className="text-primary-700 font-bold">{formatCurrency(result.netIncome)}</span>
      </div>

      <div className="flex justify-between py-2 text-sm">
        <span className="text-gray-500">Effective Tax Rate:</span>
        <span className="font-medium">{result.effectiveRate.toFixed(2)}%</span>
      </div>
    </div>
  </div>
);

export default PersonalTaxResults;

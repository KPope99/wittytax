import React, { useState, useCallback, useEffect } from 'react';
import { Pie } from 'react-chartjs-2';
import { Chart as ChartJS, ArcElement, Tooltip, Legend } from 'chart.js';
import {
  calculateCompanyTax,
  CompanyTaxInput,
  CompanyTaxResult,
  Deduction,
  formatCurrency,
  generateId,
  COMPANY_TAX_RATES,
} from '../utils/taxCalculations';
import { useAuth } from '../context/AuthContext';

ChartJS.register(ArcElement, Tooltip, Legend);

const CompanyTaxCalculator: React.FC = () => {
  const [annualTurnover, setAnnualTurnover] = useState<string>('');
  const [fixedAssets, setFixedAssets] = useState<string>('');
  const [assessableProfit, setAssessableProfit] = useState<string>('');
  const [isProfessionalService, setIsProfessionalService] = useState<boolean>(false);
  const [isNonResident, setIsNonResident] = useState<boolean>(false);
  const [capitalAllowances, setCapitalAllowances] = useState<string>('');
  const [otherDeductions, setOtherDeductions] = useState<Deduction[]>([]);
  const [newDeductionDesc, setNewDeductionDesc] = useState<string>('');
  const [newDeductionAmount, setNewDeductionAmount] = useState<string>('');
  const [result, setResult] = useState<CompanyTaxResult | null>(null);

  const { isAuthenticated, saveTaxCalculation } = useAuth();

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

  const handleTurnoverChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value.replace(/,/g, '');
    if (raw === '' || /^\d*\.?\d*$/.test(raw)) {
      setAnnualTurnover(formatInputValue(raw));
    }
  };

  const handleFixedAssetsChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value.replace(/,/g, '');
    if (raw === '' || /^\d*\.?\d*$/.test(raw)) {
      setFixedAssets(formatInputValue(raw));
    }
  };

  const handleProfitChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value.replace(/,/g, '');
    if (raw === '' || /^\d*\.?\d*$/.test(raw)) {
      setAssessableProfit(formatInputValue(raw));
    }
  };

  const handleCapitalChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value.replace(/,/g, '');
    if (raw === '' || /^\d*\.?\d*$/.test(raw)) {
      setCapitalAllowances(formatInputValue(raw));
    }
  };

  const handleAddDeduction = () => {
    if (newDeductionDesc.trim() && parseNumber(newDeductionAmount) > 0) {
      setOtherDeductions([
        ...otherDeductions,
        {
          id: generateId(),
          description: newDeductionDesc.trim(),
          amount: parseNumber(newDeductionAmount),
        },
      ]);
      setNewDeductionDesc('');
      setNewDeductionAmount('');
    }
  };

  const handleRemoveDeduction = (id: string) => {
    setOtherDeductions(otherDeductions.filter((d) => d.id !== id));
  };

  const calculateTax = useCallback(() => {
    const input: CompanyTaxInput = {
      annualTurnover: parseNumber(annualTurnover),
      fixedAssets: parseNumber(fixedAssets),
      assessableProfit: parseNumber(assessableProfit),
      isProfessionalService,
      isNonResident,
      capitalAllowances: parseNumber(capitalAllowances),
      otherDeductions,
    };

    if (input.assessableProfit > 0) {
      const taxResult = calculateCompanyTax(input);
      setResult(taxResult);
    } else {
      setResult(null);
    }
  }, [annualTurnover, fixedAssets, assessableProfit, isProfessionalService, isNonResident, capitalAllowances, otherDeductions]);

  useEffect(() => {
    calculateTax();
  }, [calculateTax]);

  // Save calculation when user is authenticated and result changes
  useEffect(() => {
    if (isAuthenticated && result && result.totalTax > 0) {
      saveTaxCalculation('company', result);
    }
  }, [result?.totalTax]); // eslint-disable-line react-hooks/exhaustive-deps

  const getPieChartData = () => {
    if (!result) return null;

    const data = result.companySize === 'big'
      ? [result.corporateTax, result.developmentLevy, result.netProfit > 0 ? result.netProfit : 0]
      : [result.totalTax, result.netProfit > 0 ? result.netProfit : 0];

    const labels = result.companySize === 'big'
      ? ['Corporate Tax (30%)', 'Development Levy (4%)', 'Net Profit']
      : ['Tax Liability', 'Net Profit'];

    const backgroundColor = result.companySize === 'big'
      ? ['#ef4444', '#f97316', '#22c55e']
      : ['#ef4444', '#22c55e'];

    const borderColor = result.companySize === 'big'
      ? ['#dc2626', '#ea580c', '#16a34a']
      : ['#dc2626', '#16a34a'];

    return {
      labels,
      datasets: [
        {
          data,
          backgroundColor,
          borderColor,
          borderWidth: 2,
        },
      ],
    };
  };

  const pieOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'bottom' as const,
      },
      tooltip: {
        callbacks: {
          label: function (context: any) {
            const value = context.raw;
            const total = context.dataset.data.reduce((a: number, b: number) => a + b, 0);
            const percentage = total > 0 ? ((value / total) * 100).toFixed(1) : 0;
            return `${context.label}: ${formatCurrency(value)} (${percentage}%)`;
          },
        },
      },
    },
  };

  const getCompanySizeInfo = () => {
    const turnover = parseNumber(annualTurnover);
    const assets = parseNumber(fixedAssets);

    if (isProfessionalService) {
      return {
        size: 'Big (Professional Service)',
        rate: '30% + 4% Levy',
        description: 'Professional services excluded from small company exemption',
        color: 'text-red-600',
        bgColor: 'bg-red-50',
        borderColor: 'border-red-200',
      };
    }

    if (turnover <= COMPANY_TAX_RATES.small.maxTurnover && assets < COMPANY_TAX_RATES.small.maxFixedAssets) {
      return {
        size: 'Small',
        rate: '0%',
        description: `Turnover ≤ ${formatCurrency(COMPANY_TAX_RATES.small.maxTurnover)} AND Assets < ${formatCurrency(COMPANY_TAX_RATES.small.maxFixedAssets)}`,
        color: 'text-green-600',
        bgColor: 'bg-green-50',
        borderColor: 'border-green-200',
      };
    }

    return {
      size: 'Big',
      rate: isNonResident ? '30%' : '30% + 4% Levy',
      description: 'Exceeds small company thresholds',
      color: 'text-red-600',
      bgColor: 'bg-red-50',
      borderColor: 'border-red-200',
    };
  };

  const companySizeInfo = parseNumber(annualTurnover) > 0 || isProfessionalService ? getCompanySizeInfo() : null;

  return (
    <div className="space-y-6">
      {/* Input Section */}
      <div className="bg-white rounded-lg shadow-md p-6">
        <h2 className="text-xl font-semibold text-gray-800 mb-4">Company Details & Deductions</h2>

        {/* Company Tax Rates Info */}
        <div className="mb-6 p-4 bg-primary-50 rounded-lg border border-primary-100">
          <h4 className="text-sm font-semibold text-primary-800 mb-2">Company Tax Rates (NTA 2025)</h4>
          <div className="text-xs text-primary-700 space-y-1">
            <p>
              <span className="font-medium text-green-600">Small Companies:</span> 0%
              (Turnover ≤ ₦50M AND Assets &lt; ₦250M)
            </p>
            <p>
              <span className="font-medium text-red-600">Big Companies:</span> 30% CIT + 4% Development Levy
            </p>
            <p className="text-yellow-700">
              <span className="font-medium">Note:</span> Professional services (lawyers, accountants, consultants)
              are excluded from small company exemption.
            </p>
          </div>
        </div>

        {/* Company Type Checkboxes */}
        <div className="mb-4 p-4 bg-gray-50 rounded-lg space-y-3">
          <label className="flex items-start space-x-3 cursor-pointer">
            <input
              type="checkbox"
              checked={isProfessionalService}
              onChange={(e) => setIsProfessionalService(e.target.checked)}
              className="mt-1 w-4 h-4 text-primary-600 border-gray-300 rounded focus:ring-primary-500"
            />
            <div>
              <span className="text-sm font-medium text-gray-700">
                Professional Service Provider
              </span>
              <p className="text-xs text-gray-500">
                Lawyers, accountants, consultants - excluded from small company exemption
              </p>
            </div>
          </label>

          <label className="flex items-start space-x-3 cursor-pointer">
            <input
              type="checkbox"
              checked={isNonResident}
              onChange={(e) => setIsNonResident(e.target.checked)}
              className="mt-1 w-4 h-4 text-primary-600 border-gray-300 rounded focus:ring-primary-500"
            />
            <div>
              <span className="text-sm font-medium text-gray-700">
                Non-Resident Company
              </span>
              <p className="text-xs text-gray-500">
                Exempt from Development Levy (4%)
              </p>
            </div>
          </label>
        </div>

        {/* Annual Turnover */}
        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Annual Turnover (₦)
          </label>
          <input
            type="text"
            value={annualTurnover}
            onChange={handleTurnoverChange}
            placeholder="Enter annual turnover"
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
          />
        </div>

        {/* Fixed Assets */}
        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Fixed Assets Value (₦)
          </label>
          <input
            type="text"
            value={fixedAssets}
            onChange={handleFixedAssetsChange}
            placeholder="Enter total fixed assets value"
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
          />
          <p className="text-xs text-gray-500 mt-1">
            Value of machinery, equipment, buildings, vehicles, etc.
          </p>
        </div>

        {/* Company Classification Badge */}
        {companySizeInfo && (
          <div className={`mb-4 p-3 rounded-lg ${companySizeInfo.bgColor} border ${companySizeInfo.borderColor}`}>
            <div className="flex items-center justify-between">
              <div>
                <span className={`text-sm font-semibold ${companySizeInfo.color}`}>
                  {companySizeInfo.size} Company
                </span>
                <p className="text-xs text-gray-600 mt-1">{companySizeInfo.description}</p>
              </div>
              <span className={`text-lg font-bold ${companySizeInfo.color}`}>
                {companySizeInfo.rate}
              </span>
            </div>
          </div>
        )}

        {/* Assessable Profit */}
        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Assessable Profit (₦)
          </label>
          <input
            type="text"
            value={assessableProfit}
            onChange={handleProfitChange}
            placeholder="Enter assessable profit"
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
          />
          <p className="text-xs text-gray-500 mt-1">
            Total profit before deductions and allowances
          </p>
        </div>

        {/* Capital Allowances */}
        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Capital Allowances (₦)
          </label>
          <input
            type="text"
            value={capitalAllowances}
            onChange={handleCapitalChange}
            placeholder="Enter capital allowances"
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
          />
          <p className="text-xs text-gray-500 mt-1">
            Depreciation on business assets, machinery, equipment, etc.
          </p>
        </div>

        {/* Other Deductions */}
        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Other Allowable Deductions
          </label>

          {otherDeductions.length > 0 && (
            <div className="mb-3 space-y-2">
              {otherDeductions.map((deduction) => (
                <div
                  key={deduction.id}
                  className="flex items-center justify-between bg-gray-50 px-3 py-2 rounded-lg"
                >
                  <span className="text-sm text-gray-700">
                    {deduction.description}: {formatCurrency(deduction.amount)}
                  </span>
                  <button
                    onClick={() => handleRemoveDeduction(deduction.id)}
                    className="text-red-500 hover:text-red-700 text-sm"
                  >
                    Remove
                  </button>
                </div>
              ))}
            </div>
          )}

          <div className="flex flex-col sm:flex-row gap-2">
            <input
              type="text"
              value={newDeductionDesc}
              onChange={(e) => setNewDeductionDesc(e.target.value)}
              placeholder="Description (e.g., R&D expenses)"
              className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent text-sm"
            />
            <input
              type="text"
              value={newDeductionAmount}
              onChange={(e) => {
                const raw = e.target.value.replace(/,/g, '');
                if (raw === '' || /^\d*\.?\d*$/.test(raw)) {
                  setNewDeductionAmount(formatInputValue(raw));
                }
              }}
              placeholder="Amount (₦)"
              className="w-full sm:w-32 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent text-sm"
            />
            <button
              onClick={handleAddDeduction}
              className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors text-sm"
            >
              Add
            </button>
          </div>
        </div>
      </div>

      {/* Results Section */}
      {result && (
        <div className="bg-white rounded-lg shadow-md p-6">
          <h2 className="text-xl font-semibold text-gray-800 mb-4">Tax Calculation Results</h2>

          <div className="grid md:grid-cols-2 gap-6">
            {/* Breakdown */}
            <div className="space-y-3">
              <div className="flex justify-between py-2 border-b border-gray-200">
                <span className="text-gray-600">Annual Turnover:</span>
                <span className="font-medium">{formatCurrency(result.annualTurnover)}</span>
              </div>

              <div className="flex justify-between py-2 border-b border-gray-200">
                <span className="text-gray-600">Fixed Assets:</span>
                <span className="font-medium">{formatCurrency(result.fixedAssets)}</span>
              </div>

              <div className="flex justify-between py-2 border-b border-gray-200">
                <span className="text-gray-600">Assessable Profit:</span>
                <span className="font-medium">{formatCurrency(result.assessableProfit)}</span>
              </div>

              <div className="text-sm font-medium text-gray-700 mt-4">Deductions:</div>

              {result.capitalAllowances > 0 && (
                <div className="flex justify-between py-1 text-sm">
                  <span className="text-gray-500 pl-4">Capital Allowances:</span>
                  <span className="text-red-500">-{formatCurrency(result.capitalAllowances)}</span>
                </div>
              )}

              {result.otherDeductionsTotal > 0 && (
                <div className="flex justify-between py-1 text-sm">
                  <span className="text-gray-500 pl-4">Other Deductions:</span>
                  <span className="text-red-500">-{formatCurrency(result.otherDeductionsTotal)}</span>
                </div>
              )}

              <div className="flex justify-between py-2 border-t border-gray-200 font-medium">
                <span className="text-gray-700">Total Deductions:</span>
                <span className="text-red-600">-{formatCurrency(result.totalDeductions)}</span>
              </div>

              <div className="flex justify-between py-2 border-b border-gray-200">
                <span className="text-gray-600">Taxable Profit:</span>
                <span className="font-medium">{formatCurrency(result.taxableProfit)}</span>
              </div>

              <div className={`flex justify-between py-2 px-3 rounded-lg ${
                result.companySize === 'small' ? 'bg-green-50' : 'bg-gray-50'
              }`}>
                <span className="text-gray-600">Company Classification:</span>
                <span className={`font-medium capitalize ${
                  result.companySize === 'small' ? 'text-green-600' : 'text-red-600'
                }`}>
                  {result.companySize}
                  {result.isProfessionalService && ' (Professional)'}
                  {result.isNonResident && ' (Non-Resident)'}
                </span>
              </div>

              {/* Tax Breakdown */}
              <div className="mt-4 space-y-2">
                <div className="text-sm font-medium text-gray-700">Tax Breakdown:</div>
                {result.taxBreakdown.map((item, index) => (
                  <div key={index} className="flex justify-between py-1 text-sm">
                    <span className="text-gray-500 pl-4">{item.description}:</span>
                    <span className={item.amount > 0 ? 'text-red-500' : 'text-green-500'}>
                      {formatCurrency(item.amount)}
                    </span>
                  </div>
                ))}
              </div>

              <div className="flex justify-between py-2 bg-red-50 px-3 rounded-lg mt-4">
                <span className="text-red-700 font-semibold">Total Tax Liability:</span>
                <span className="text-red-700 font-bold">{formatCurrency(result.totalTax)}</span>
              </div>

              <div className="flex justify-between py-2 bg-green-50 px-3 rounded-lg">
                <span className="text-green-700 font-semibold">Net Profit:</span>
                <span className="text-green-700 font-bold">{formatCurrency(result.netProfit)}</span>
              </div>

              <div className="flex justify-between py-2 text-sm">
                <span className="text-gray-500">Effective Tax Rate:</span>
                <span className="font-medium">{result.effectiveRate.toFixed(2)}%</span>
              </div>
            </div>

            {/* Pie Chart */}
            <div className="flex flex-col items-center justify-center">
              <h3 className="text-sm font-medium text-gray-700 mb-4">Tax vs Net Profit</h3>
              <div className="w-full max-w-xs h-64">
                {getPieChartData() && (
                  <Pie data={getPieChartData()!} options={pieOptions} />
                )}
              </div>
              {result.totalTax > 0 && result.assessableProfit > 0 && (
                <p className="text-sm text-gray-600 mt-4 text-center">
                  Tax represents{' '}
                  <span className="font-semibold text-red-600">
                    {((result.totalTax / result.assessableProfit) * 100).toFixed(1)}%
                  </span>{' '}
                  of your assessable profit
                </p>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Company Tax Notes */}
      <div className="bg-white rounded-lg shadow-md p-6">
        <h3 className="text-lg font-semibold text-gray-800 mb-3">Important Notes (NTA 2025)</h3>
        <ul className="text-sm text-gray-600 space-y-2">
          <li className="flex items-start">
            <span className="text-primary-500 mr-2">•</span>
            <span><strong>Small Company Exemption:</strong> Turnover ≤ ₦50M AND Fixed Assets &lt; ₦250M = 0% tax</span>
          </li>
          <li className="flex items-start">
            <span className="text-primary-500 mr-2">•</span>
            <span><strong>Professional Services:</strong> Lawyers, accountants, consultants pay 30% regardless of size</span>
          </li>
          <li className="flex items-start">
            <span className="text-primary-500 mr-2">•</span>
            <span><strong>Development Levy:</strong> 4% on assessable profits for big companies (non-residents exempt)</span>
          </li>
          <li className="flex items-start">
            <span className="text-primary-500 mr-2">•</span>
            <span><strong>Filing Deadline:</strong> Within 6 months of accounting year end</span>
          </li>
          <li className="flex items-start">
            <span className="text-yellow-500 mr-2">•</span>
            <span>This calculator provides estimates. Consult a tax professional for official filing.</span>
          </li>
        </ul>
      </div>
    </div>
  );
};

export default CompanyTaxCalculator;

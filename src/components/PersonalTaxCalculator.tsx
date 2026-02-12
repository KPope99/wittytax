import React, { useState, useCallback, useEffect, useMemo } from 'react';
import { Pie } from 'react-chartjs-2';
import { Chart as ChartJS, ArcElement, Tooltip, Legend } from 'chart.js';
import { jsPDF } from 'jspdf';
import {
  calculatePersonalTax,
  PersonalTaxInput,
  PersonalTaxResult,
  Deduction,
  formatCurrency,
  generateId,
  MAX_RENT_RELIEF,
  RENT_RELIEF_RATE,
} from '../utils/taxCalculations';
import { generateTaxRecommendations, RecommendationInput } from '../utils/taxRecommendations';
import DocumentUpload from './DocumentUpload';
import TaxRecommendations from './TaxRecommendations';
import ShareTransferExemption from './ShareTransferExemption';
import CompensationExemption from './CompensationExemption';
import { useAuth } from '../context/AuthContext';

ChartJS.register(ArcElement, Tooltip, Legend);

const PersonalTaxCalculator: React.FC = () => {
  const [annualIncome, setAnnualIncome] = useState<string>('');
  const [applyPension, setApplyPension] = useState<boolean>(false);
  const [applyNHF, setApplyNHF] = useState<boolean>(false);
  const [annualRent, setAnnualRent] = useState<string>('');
  const [additionalDeductions, setAdditionalDeductions] = useState<Deduction[]>([]);
  const [newDeductionDesc, setNewDeductionDesc] = useState<string>('');
  const [newDeductionAmount, setNewDeductionAmount] = useState<string>('');
  const [ocrDeductions, setOcrDeductions] = useState<number>(0);
  const [result, setResult] = useState<PersonalTaxResult | null>(null);
  const [uploadedFiles, setUploadedFiles] = useState<File[]>([]);
  const [showUploadReceipt, setShowUploadReceipt] = useState<boolean>(false);

  const { isAuthenticated, saveTaxCalculation, addDocument } = useAuth();

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

  // Generate recommendations based on current inputs
  const recommendations = useMemo(() => {
    const input: RecommendationInput = {
      annualIncome: parseNumber(annualIncome),
      applyPension,
      applyNHF,
      annualRent: parseNumber(annualRent),
      taxResult: result,
    };
    return generateTaxRecommendations(input);
  }, [annualIncome, applyPension, applyNHF, annualRent, result]);

  // Handle applying recommendations
  const handleApplyRecommendation = useCallback((actionType: string) => {
    switch (actionType) {
      case 'pension':
        setApplyPension(true);
        break;
      case 'nhf':
        setApplyNHF(true);
        break;
      case 'rent':
        document.getElementById('rent-input')?.focus();
        break;
      default:
        break;
    }
  }, []);

  const handleIncomeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value.replace(/,/g, '');
    if (raw === '' || /^\d*\.?\d*$/.test(raw)) {
      setAnnualIncome(formatInputValue(raw));
    }
  };

  const handleRentChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value.replace(/,/g, '');
    if (raw === '' || /^\d*\.?\d*$/.test(raw)) {
      setAnnualRent(formatInputValue(raw));
    }
  };

  const handleAddDeduction = () => {
    if (newDeductionDesc.trim() && parseNumber(newDeductionAmount) > 0) {
      setAdditionalDeductions([
        ...additionalDeductions,
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
    setAdditionalDeductions(additionalDeductions.filter((d) => d.id !== id));
  };

  const handleOCRResult = useCallback((amount: number) => {
    setOcrDeductions((prev) => prev + amount);
  }, []);

  const handleFileUpload = useCallback((file: File, extractedAmount?: number) => {
    setUploadedFiles((prev) => [...prev, file]);
    if (isAuthenticated && extractedAmount !== undefined) {
      addDocument({
        fileName: file.name,
        extractedAmount,
        description: 'Personal tax deduction document',
        type: 'receipt',
      });
    }
  }, [isAuthenticated, addDocument]);

  const calculateTax = useCallback(() => {
    const input: PersonalTaxInput = {
      annualIncome: parseNumber(annualIncome),
      applyPension,
      applyNHF,
      annualRent: parseNumber(annualRent),
      additionalDeductions,
      ocrDeductions,
    };

    if (input.annualIncome > 0) {
      const taxResult = calculatePersonalTax(input);
      setResult(taxResult);
    } else {
      setResult(null);
    }
  }, [annualIncome, applyPension, applyNHF, annualRent, additionalDeductions, ocrDeductions]);

  useEffect(() => {
    calculateTax();
  }, [calculateTax]);

  // Save calculation when user is authenticated and result changes
  useEffect(() => {
    if (isAuthenticated && result && result.totalTax > 0) {
      saveTaxCalculation('personal', result);
    }
  }, [result?.totalTax]); // eslint-disable-line react-hooks/exhaustive-deps

  const getPieChartData = () => {
    if (!result) return null;

    return {
      labels: ['Tax Liability', 'Net Income'],
      datasets: [
        {
          data: [result.totalTax, result.netIncome > 0 ? result.netIncome : 0],
          backgroundColor: ['#ef4444', '#3b82f6'],
          borderColor: ['#dc2626', '#2563eb'],
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

  const rentReliefInfo = parseNumber(annualRent) > 0
    ? `(20% of rent = ${formatCurrency(parseNumber(annualRent) * RENT_RELIEF_RATE)}, capped at ${formatCurrency(MAX_RENT_RELIEF)})`
    : '';

  // Generate PDF Report
  const generatePDFReport = useCallback(() => {
    if (!result) return;

    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    const MARGIN_LEFT = 20;
    const MARGIN_RIGHT = 20;
    const AMOUNT_X = pageWidth - MARGIN_RIGHT;
    const INDENT_X = 25;
    const PAGE_BOTTOM_MARGIN = 30;
    let yPos = 20;

    // Helper function for currency without symbol for PDF
    const formatAmount = (amount: number) => `N${amount.toLocaleString('en-NG')}`;

    // Check if need new page
    const checkNewPage = (requiredSpace: number) => {
      if (yPos + requiredSpace > pageHeight - PAGE_BOTTOM_MARGIN) {
        doc.addPage();
        yPos = 20;
        return true;
      }
      return false;
    };

    // Header
    doc.setFillColor(30, 64, 175);
    doc.rect(0, 0, pageWidth, 40, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(24);
    doc.setFont('helvetica', 'bold');
    doc.text('WittyTax', MARGIN_LEFT, 25);
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.text('Personal Income Tax Report - NTA 2025', MARGIN_LEFT, 35);

    // Date
    doc.setFontSize(10);
    doc.text(`Generated: ${new Date().toLocaleDateString('en-NG')}`, pageWidth - MARGIN_RIGHT, 25, { align: 'right' });

    yPos = 55;
    doc.setTextColor(0, 0, 0);

    // Income Summary Section
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.text('Income Summary', MARGIN_LEFT, yPos);
    yPos += 10;

    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.text('Gross Annual Income:', MARGIN_LEFT, yPos);
    doc.text(formatAmount(result.grossIncome), AMOUNT_X, yPos, { align: 'right' });
    yPos += 8;

    // Deductions Section
    yPos += 5;
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.text('Deductions', MARGIN_LEFT, yPos);
    yPos += 10;

    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');

    if (result.pensionDeduction > 0) {
      doc.text('Pension (8%):', INDENT_X, yPos);
      doc.text(`-${formatAmount(result.pensionDeduction)}`, AMOUNT_X, yPos, { align: 'right' });
      yPos += 7;
    }

    if (result.nhfDeduction > 0) {
      doc.text('NHF (2.5%):', INDENT_X, yPos);
      doc.text(`-${formatAmount(result.nhfDeduction)}`, AMOUNT_X, yPos, { align: 'right' });
      yPos += 7;
    }

    if (result.rentRelief > 0) {
      doc.text('Rent Relief:', INDENT_X, yPos);
      doc.text(`-${formatAmount(result.rentRelief)}`, AMOUNT_X, yPos, { align: 'right' });
      yPos += 7;
    }

    if (result.additionalDeductionsTotal > 0) {
      doc.text('Additional Deductions:', INDENT_X, yPos);
      doc.text(`-${formatAmount(result.additionalDeductionsTotal)}`, AMOUNT_X, yPos, { align: 'right' });
      yPos += 7;
    }

    if (result.ocrDeductions > 0) {
      doc.text('OCR Deductions:', INDENT_X, yPos);
      doc.text(`-${formatAmount(result.ocrDeductions)}`, AMOUNT_X, yPos, { align: 'right' });
      yPos += 7;
    }

    // Total Deductions
    doc.setDrawColor(200, 200, 200);
    doc.line(MARGIN_LEFT, yPos, pageWidth - MARGIN_RIGHT, yPos);
    yPos += 7;
    doc.setFont('helvetica', 'bold');
    doc.text('Total Deductions:', MARGIN_LEFT, yPos);
    doc.text(`-${formatAmount(result.totalDeductions)}`, AMOUNT_X, yPos, { align: 'right' });
    yPos += 10;

    // Taxable Income
    doc.text('Taxable Income:', MARGIN_LEFT, yPos);
    doc.text(formatAmount(result.taxableIncome), AMOUNT_X, yPos, { align: 'right' });
    yPos += 15;

    // Tax Breakdown Section
    doc.setFontSize(14);
    doc.text('Tax Breakdown by Band', MARGIN_LEFT, yPos);
    yPos += 10;

    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');

    result.taxBreakdown.forEach((band) => {
      checkNewPage(12);
      const bandDesc = `${band.band} @ ${band.rate}%:`;
      const bandLines = doc.splitTextToSize(bandDesc, AMOUNT_X - INDENT_X - 10);
      doc.text(bandLines, INDENT_X, yPos);
      doc.text(formatAmount(band.tax), AMOUNT_X, yPos, { align: 'right' });
      yPos += Math.max(bandLines.length * 5, 7);
    });

    // Final Results
    yPos += 5;
    doc.setDrawColor(200, 200, 200);
    doc.line(MARGIN_LEFT, yPos, pageWidth - MARGIN_RIGHT, yPos);
    yPos += 10;

    // Tax Liability Box
    checkNewPage(45);
    doc.setFillColor(254, 226, 226);
    doc.rect(MARGIN_LEFT, yPos - 5, pageWidth - MARGIN_LEFT - MARGIN_RIGHT, 15, 'F');
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(185, 28, 28);
    doc.text('Total Tax Liability:', INDENT_X, yPos + 5);
    doc.text(formatAmount(result.totalTax), AMOUNT_X, yPos + 5, { align: 'right' });
    yPos += 20;

    // Net Income Box
    doc.setFillColor(219, 234, 254);
    doc.rect(MARGIN_LEFT, yPos - 5, pageWidth - MARGIN_LEFT - MARGIN_RIGHT, 15, 'F');
    doc.setTextColor(29, 78, 216);
    doc.text('Net Income:', INDENT_X, yPos + 5);
    doc.text(formatAmount(result.netIncome), AMOUNT_X, yPos + 5, { align: 'right' });
    yPos += 25;

    // Effective Rate
    doc.setTextColor(0, 0, 0);
    doc.setFont('helvetica', 'normal');
    doc.text(`Effective Tax Rate: ${result.effectiveRate.toFixed(2)}%`, MARGIN_LEFT, yPos);
    yPos += 20;

    // Footer
    checkNewPage(25);
    doc.setFontSize(8);
    doc.setTextColor(128, 128, 128);
    doc.text('This report is generated by WittyTax based on Nigeria Tax Act (NTA) 2025.', MARGIN_LEFT, yPos);
    yPos += 5;
    doc.text('For official tax filing, please consult Nigeria Revenue Service.', MARGIN_LEFT, yPos);
    yPos += 8;
    doc.text('\u00A9 Tech84', pageWidth / 2, yPos, { align: 'center' });

    // Save the PDF
    doc.save(`WittyTax_Report_${new Date().toISOString().split('T')[0]}.pdf`);
  }, [result]);

  return (
    <div className="space-y-6">
      {/* Input Section + Pie Chart */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
      {/* Input Section */}
      <div className={`bg-white rounded-lg shadow-md p-6 ${result ? 'lg:col-span-3' : 'lg:col-span-5'}`}>
        <h2 className="text-xl font-semibold text-gray-800 mb-4">Income & Deductions</h2>

        {/* Annual Income */}
        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Annual Income (₦)
          </label>
          <input
            type="text"
            value={annualIncome}
            onChange={handleIncomeChange}
            placeholder="Enter annual income"
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
          />
        </div>

        {/* Pension & NHF Checkboxes */}
        <div className="mb-4 space-y-2">
          <label className="flex items-center space-x-3 cursor-pointer">
            <input
              type="checkbox"
              checked={applyPension}
              onChange={(e) => setApplyPension(e.target.checked)}
              className="w-4 h-4 text-primary-600 border-gray-300 rounded focus:ring-primary-500"
            />
            <span className="text-sm text-gray-700">
              Apply 8% Pension Deduction
              {applyPension && annualIncome && (
                <span className="text-primary-600 ml-2">
                  ({formatCurrency(parseNumber(annualIncome) * 0.08)})
                </span>
              )}
            </span>
          </label>

          <label className="flex items-center space-x-3 cursor-pointer">
            <input
              type="checkbox"
              checked={applyNHF}
              onChange={(e) => setApplyNHF(e.target.checked)}
              className="w-4 h-4 text-primary-600 border-gray-300 rounded focus:ring-primary-500"
            />
            <span className="text-sm text-gray-700">
              Apply 2.5% NHF Deduction
              {applyNHF && annualIncome && (
                <span className="text-primary-600 ml-2">
                  ({formatCurrency(parseNumber(annualIncome) * 0.025)})
                </span>
              )}
            </span>
          </label>
        </div>

        {/* Annual Rent */}
        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Annual Rent (₦)
          </label>
          <input
            id="rent-input"
            type="text"
            value={annualRent}
            onChange={handleRentChange}
            placeholder="Enter annual rent"
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
          />
          {rentReliefInfo && (
            <p className="text-xs text-gray-500 mt-1">{rentReliefInfo}</p>
          )}
        </div>

        {/* Additional Deductions */}
        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Additional Deductions
          </label>

          {additionalDeductions.length > 0 && (
            <div className="mb-3 space-y-2">
              {additionalDeductions.map((deduction) => (
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
              placeholder="Description"
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

        {/* OCR Deductions Display */}
        {ocrDeductions > 0 && (
          <div className="mb-4 p-3 bg-primary-50 rounded-lg border border-primary-100">
            <p className="text-sm text-primary-700">
              <span className="font-medium">OCR Detected Deductions:</span> {formatCurrency(ocrDeductions)}
            </p>
            <button
              onClick={() => setOcrDeductions(0)}
              className="text-xs text-primary-600 hover:text-primary-800 mt-1"
            >
              Clear OCR deductions
            </button>
          </div>
        )}
      </div>

      {/* Pie Chart */}
      {result && (
        <div className="lg:col-span-2">
          <div className="bg-white rounded-lg shadow-md p-6 lg:sticky lg:top-6">
            <h3 className="text-sm font-medium text-gray-700 mb-4 text-center">Tax vs Net Income</h3>
            <div className="w-full max-w-xs mx-auto h-64">
              {getPieChartData() && (
                <Pie data={getPieChartData()!} options={pieOptions} />
              )}
            </div>
            {result.totalTax > 0 && result.grossIncome > 0 && (
              <p className="text-sm text-gray-600 mt-4 text-center">
                Tax represents{' '}
                <span className="font-semibold text-red-600">
                  {((result.totalTax / result.grossIncome) * 100).toFixed(1)}%
                </span>{' '}
                of your gross income
              </p>
            )}
          </div>
        </div>
      )}
      </div>

      {/* Upload Receipt/Invoice Checkbox */}
      <div className="bg-white rounded-lg shadow-md p-4">
        <label className="flex items-center space-x-3 cursor-pointer">
          <input
            type="checkbox"
            checked={showUploadReceipt}
            onChange={(e) => setShowUploadReceipt(e.target.checked)}
            className="w-5 h-5 text-primary-600 border-gray-300 rounded focus:ring-primary-500"
          />
          <div>
            <span className="text-sm font-medium text-gray-700">Upload Receipt/Invoice</span>
            <p className="text-xs text-gray-500">Upload documents to automatically extract amounts via OCR</p>
          </div>
        </label>
      </div>

      {/* Document Upload Section */}
      {showUploadReceipt && (
        <>
          <DocumentUpload onOCRResult={handleOCRResult} onFileUpload={handleFileUpload} />

          {/* Uploaded Files */}
          {uploadedFiles.length > 0 && (
            <div className="bg-white rounded-lg shadow-md p-6">
              <h3 className="text-lg font-semibold text-gray-800 mb-3">Uploaded Documents</h3>
              <ul className="space-y-2">
                {uploadedFiles.map((file, index) => (
                  <li key={index} className="flex items-center text-sm text-gray-600">
                    <svg className="w-4 h-4 mr-2 text-primary-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    {file.name}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </>
      )}

      {/* Results Section */}
      {result && (
        <div className="bg-white rounded-lg shadow-md p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold text-gray-800">Tax Calculation Results</h2>
            {isAuthenticated ? (
              <button
                onClick={generatePDFReport}
                className="flex items-center gap-2 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors text-sm"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                Download PDF
              </button>
            ) : (
              <span className="flex items-center gap-1.5 text-xs text-gray-400">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                </svg>
                Login to download PDF
              </span>
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

              {/* Tax Band Breakdown */}
              {result.taxBreakdown.length > 0 && (
                <div className="mt-4">
                  <div className="text-sm font-medium text-gray-700 mb-2">Tax Breakdown by Band:</div>
                  {result.taxBreakdown.map((band, index) => (
                    <div key={index} className="flex justify-between py-1 text-xs">
                      <span className="text-gray-500 pl-4">
                        {band.band} @ {band.rate}%:
                      </span>
                      <span className="text-gray-600">{formatCurrency(band.tax)}</span>
                    </div>
                  ))}
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
      )}

      {/* Tax Recommendations - Only visible to logged-in users */}
      {isAuthenticated && result && recommendations.length > 0 && (
        <TaxRecommendations
          recommendations={recommendations}
          onApplyRecommendation={handleApplyRecommendation}
        />
      )}

      {/* Login prompt for recommendations */}
      {!isAuthenticated && result && recommendations.length > 0 && (
        <div className="bg-white rounded-lg shadow-md p-6 border border-primary-100">
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <svg className="w-6 h-6 text-primary-600 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
              </svg>
              <div>
                <h3 className="font-semibold text-gray-800">Tax Optimization Recommendations</h3>
                <p className="text-sm text-gray-500">Login to view personalized tax-saving recommendations</p>
              </div>
            </div>
            <div className="flex items-center text-primary-600">
              <svg className="w-5 h-5 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
              </svg>
              <span className="text-sm font-medium">Login Required</span>
            </div>
          </div>
        </div>
      )}

      {/* NTA 2025 Exemption Sections */}
      <div className="space-y-4">
        <h3 className="text-lg font-semibold text-gray-800">NTA 2025 Special Exemptions</h3>
        <ShareTransferExemption />
        <CompensationExemption />
      </div>
    </div>
  );
};

export default PersonalTaxCalculator;

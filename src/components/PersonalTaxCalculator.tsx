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
  VOLUNTARY_PENSION_MAX_MONTHLY_RATE,
} from '../utils/taxCalculations';
import { generateTaxRecommendations, RecommendationInput } from '../utils/taxRecommendations';
import DocumentUpload from './DocumentUpload';
import TaxRecommendations from './TaxRecommendations';
import PersonalTaxResults from './PersonalTaxResults';
import ShareTransferExemption from './ShareTransferExemption';
import CompensationExemption from './CompensationExemption';
import { useAuth } from '../context/AuthContext';

ChartJS.register(ArcElement, Tooltip, Legend);

interface PersonalTaxCalculatorProps {
  initialAnnualIncome?: string;
  initialApplyPension?: boolean;
  initialApplyNHF?: boolean;
  initialAnnualRent?: string;
}

const PersonalTaxCalculator: React.FC<PersonalTaxCalculatorProps> = ({
  initialAnnualIncome = '',
  initialApplyPension = false,
  initialApplyNHF = false,
  initialAnnualRent = '',
}) => {
  const [annualIncome, setAnnualIncome] = useState<string>(initialAnnualIncome);
  const [applyPension, setApplyPension] = useState<boolean>(initialApplyPension);
  const [monthlyVoluntaryPension, setMonthlyVoluntaryPension] = useState<string>('');
  const [pensionFundInvestmentIncome, setPensionFundInvestmentIncome] = useState<string>('');
  const [retirementWithdrawalIncome, setRetirementWithdrawalIncome] = useState<string>('');
  const [applyNHF, setApplyNHF] = useState<boolean>(initialApplyNHF);
  const [annualRent, setAnnualRent] = useState<string>(initialAnnualRent);
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
      voluntaryPensionContribution: parseNumber(monthlyVoluntaryPension) * 12,
      pensionFundInvestmentIncome: parseNumber(pensionFundInvestmentIncome),
      retirementWithdrawalIncome: parseNumber(retirementWithdrawalIncome),
    };

    if (input.annualIncome > 0) {
      const taxResult = calculatePersonalTax(input);
      setResult(taxResult);
    } else {
      setResult(null);
    }
  }, [annualIncome, applyPension, applyNHF, annualRent, additionalDeductions, ocrDeductions, monthlyVoluntaryPension, pensionFundInvestmentIncome, retirementWithdrawalIncome]);

  useEffect(() => {
    calculateTax();
  }, [calculateTax]);

  // Tax calculation is saved to history only when the user downloads the PDF report

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

    if (result.voluntaryPensionContribution > 0) {
      doc.text('Voluntary Pension (PRA 2014 s.4(3)):', INDENT_X, yPos);
      doc.text(`-${formatAmount(result.voluntaryPensionContribution)}`, AMOUNT_X, yPos, { align: 'right' });
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

    // Tax-Exempt Pension Income (Benefits 2 & 3)
    if (result.totalExemptPensionIncome > 0) {
      checkNewPage(40);
      yPos += 3;
      doc.setFontSize(14);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(22, 101, 52);
      doc.text('Tax-Exempt Pension Income (PRA 2014)', MARGIN_LEFT, yPos);
      yPos += 10;
      doc.setFontSize(10);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(0, 0, 0);

      if (result.pensionFundInvestmentIncome > 0) {
        doc.text('Pension Fund Investment Income (s.10(3)):', INDENT_X, yPos);
        doc.text(`${formatAmount(result.pensionFundInvestmentIncome)} TAX-FREE`, AMOUNT_X, yPos, { align: 'right' });
        yPos += 7;
      }
      if (result.retirementWithdrawalIncome > 0) {
        doc.text('Retirement Withdrawal Income (s.7(3)):', INDENT_X, yPos);
        doc.text(`${formatAmount(result.retirementWithdrawalIncome)} TAX-FREE`, AMOUNT_X, yPos, { align: 'right' });
        yPos += 7;
      }
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(22, 101, 52);
      doc.text('Total Tax-Exempt:', MARGIN_LEFT, yPos);
      doc.text(formatAmount(result.totalExemptPensionIncome), AMOUNT_X, yPos, { align: 'right' });
      doc.setTextColor(0, 0, 0);
      yPos += 12;
    }

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

    // Tax Optimization Recommendations & Reduction Strategies
    doc.addPage();
    yPos = 20;

    doc.setFillColor(30, 64, 175);
    doc.rect(0, 0, pageWidth, 25, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(16);
    doc.setFont('helvetica', 'bold');
    doc.text('Tax Optimization Recommendations', MARGIN_LEFT, 17);
    yPos = 35;
    doc.setTextColor(0, 0, 0);

    // Build personalized recommendations
    const recommendations: { title: string; desc: string; saving: string }[] = [];
    let recNum = 1;

    if (!applyPension) {
      const pensionAmount = result.grossIncome * 0.08;
      const potentialSaving = pensionAmount * (result.effectiveRate / 100);
      recommendations.push({
        title: `${recNum++}. Enroll in Pension Scheme (8%)`,
        desc: `Contributing 8% of your income (${formatAmount(pensionAmount)}) to a pension fund is fully deductible, reducing your taxable income.`,
        saving: `Potential tax saving: ${formatAmount(potentialSaving)}`
      });
    }

    if (!applyNHF) {
      const nhfAmount = result.grossIncome * 0.025;
      const potentialSaving = nhfAmount * (result.effectiveRate / 100);
      recommendations.push({
        title: `${recNum++}. Claim NHF Deduction (2.5%)`,
        desc: `The National Housing Fund contribution of 2.5% (${formatAmount(nhfAmount)}) is a tax-deductible expense.`,
        saving: `Potential tax saving: ${formatAmount(potentialSaving)}`
      });
    }

    if (result.rentRelief === 0 && result.grossIncome > 800000) {
      recommendations.push({
        title: `${recNum++}. Claim Rent Relief`,
        desc: 'If you rent your residence, you can claim 20% of your annual rent as a deduction (capped at N500,000).',
        saving: 'Potential tax saving: up to N125,000'
      });
    } else if (result.rentRelief > 0 && result.rentRelief < 500000) {
      recommendations.push({
        title: `${recNum++}. Maximize Rent Relief`,
        desc: `You are currently claiming ${formatAmount(result.rentRelief)} in rent relief. The maximum is N500,000 (on N2,500,000 annual rent).`,
        saving: `Additional saving potential: ${formatAmount((500000 - result.rentRelief) * (result.effectiveRate / 100))}`
      });
    }

    if (result.additionalDeductionsTotal === 0) {
      recommendations.push({
        title: `${recNum++}. Document Business Expenses`,
        desc: 'Track and claim allowable deductions such as professional fees, work-related travel, training costs, and business subscriptions.',
        saving: 'Every N100,000 in deductions saves up to N25,000 in tax'
      });
    }

    if (result.grossIncome > 800000) {
      recommendations.push({
        title: `${recNum++}. Leverage the Tax-Free Band`,
        desc: 'NTA 2025 exempts the first N800,000 of income from tax. Ensure all deductions are applied to maximize income within lower bands.',
        saving: 'First N800,000 is completely tax-free'
      });
    }

    if (result.grossIncome > 25000000) {
      recommendations.push({
        title: `${recNum++}. Share Transfer Exemption`,
        desc: 'Capital gains up to N10M from share disposals below N150M may be exempt under NTA 2025. Consider this for investment portfolio planning.',
        saving: 'Potential CGT saving: up to N1,000,000 (10% of N10M)'
      });
    }

    doc.setFontSize(10);
    recommendations.forEach((rec) => {
      checkNewPage(30);
      doc.setFont('helvetica', 'bold');
      doc.text(rec.title, MARGIN_LEFT, yPos);
      yPos += 6;
      doc.setFont('helvetica', 'normal');
      const descLines = doc.splitTextToSize(rec.desc, pageWidth - INDENT_X - MARGIN_RIGHT);
      doc.text(descLines, INDENT_X, yPos);
      yPos += descLines.length * 5;
      doc.setTextColor(22, 101, 52);
      doc.text(rec.saving, INDENT_X, yPos);
      doc.setTextColor(0, 0, 0);
      yPos += 10;
    });

    // Tax Reduction Strategies Section
    checkNewPage(60);
    yPos += 5;
    doc.setFillColor(22, 101, 52);
    doc.rect(MARGIN_LEFT, yPos - 5, pageWidth - MARGIN_LEFT - MARGIN_RIGHT, 15, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.text('Tax Reduction Strategies (NTA 2025)', INDENT_X, yPos + 5);
    yPos += 20;
    doc.setTextColor(0, 0, 0);

    const strategies = [
      {
        title: 'Maximize All Deductions First',
        desc: 'Apply pension (8%), NHF (2.5%), rent relief (20%), and all allowable expenses before calculating tax. Deductions directly lower your taxable income and the tax band you fall into.'
      },
      {
        title: 'Time Your Income Wisely',
        desc: 'If you receive bonuses or one-time payments, consider whether deferring income to the next tax year could keep you in a lower tax band (e.g., staying below N50M avoids the 25% top rate).'
      },
      {
        title: 'Keep Receipts for Everything',
        desc: 'Professional development courses, work tools, business travel, and professional body subscriptions are all deductible. Use WittyTax OCR upload to capture receipts automatically.'
      },
      {
        title: 'Explore Compensation Exemptions',
        desc: 'If you receive severance or compensation for loss of office, the first N50M is tax-exempt under NTA 2025. Structure packages to maximize this exemption.'
      },
      {
        title: 'File Early, File Correctly',
        desc: 'Filing before the March 31 deadline avoids penalties and interest. Ensure all deductions are properly documented to withstand any audit.'
      },
    ];

    doc.setFontSize(10);
    strategies.forEach((strategy, index) => {
      checkNewPage(25);
      doc.setFont('helvetica', 'bold');
      doc.text(`${index + 1}. ${strategy.title}`, MARGIN_LEFT, yPos);
      yPos += 6;
      doc.setFont('helvetica', 'normal');
      const descLines = doc.splitTextToSize(strategy.desc, pageWidth - INDENT_X - MARGIN_RIGHT);
      doc.text(descLines, INDENT_X, yPos);
      yPos += descLines.length * 5 + 8;
    });

    // Potential Savings Summary
    if (recommendations.length > 0) {
      checkNewPage(25);
      yPos += 5;
      doc.setFillColor(254, 249, 195);
      doc.rect(MARGIN_LEFT, yPos - 5, pageWidth - MARGIN_LEFT - MARGIN_RIGHT, 15, 'F');
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(161, 98, 7);
      const unclaimed = (!applyPension ? 1 : 0) + (!applyNHF ? 1 : 0) + (result.rentRelief === 0 && result.grossIncome > 800000 ? 1 : 0);
      doc.text(`You have ${unclaimed} unclaimed deduction${unclaimed !== 1 ? 's' : ''} that could reduce your tax liability.`, INDENT_X, yPos + 5);
      yPos += 20;
      doc.setTextColor(0, 0, 0);
    }

    // Footer
    checkNewPage(25);
    yPos += 10;
    doc.setFontSize(8);
    doc.setTextColor(128, 128, 128);
    doc.text('This report is generated by WittyTax based on Nigeria Tax Act (NTA) 2025.', MARGIN_LEFT, yPos);
    yPos += 5;
    doc.text('For official tax filing, please consult Nigeria Revenue Service.', MARGIN_LEFT, yPos);
    yPos += 8;
    doc.text('\u00A9 Tech84', pageWidth / 2, yPos, { align: 'center' });

    // Save the PDF
    doc.save(`WittyTax_Report_${new Date().toISOString().split('T')[0]}.pdf`);

    // Save calculation to history when PDF is downloaded
    if (isAuthenticated && result.grossIncome > 0) {
      saveTaxCalculation('personal', result);
    }
  }, [result, isAuthenticated, saveTaxCalculation]);

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
              onChange={(e) => {
                setApplyPension(e.target.checked);
                if (!e.target.checked) setMonthlyVoluntaryPension('');
              }}
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

          {applyPension && (
            <div className="ml-7 mt-2 p-3 bg-blue-50 rounded-lg border border-blue-100">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Voluntary Pension Contribution — Monthly (₦)
                <span className="text-xs text-gray-500 font-normal ml-1">(PRA 2014 s.4(3))</span>
              </label>
              <input
                type="text"
                value={monthlyVoluntaryPension}
                onChange={(e) => {
                  const raw = e.target.value.replace(/,/g, '');
                  if (raw === '' || /^\d*\.?\d*$/.test(raw)) {
                    setMonthlyVoluntaryPension(formatInputValue(raw));
                  }
                }}
                placeholder="e.g. 50,000"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent text-sm"
              />
              {(() => {
                const monthly = parseNumber(monthlyVoluntaryPension);
                const monthlySalary = parseNumber(annualIncome) / 12;
                const cap = monthlySalary * VOLUNTARY_PENSION_MAX_MONTHLY_RATE;
                const annualVC = monthly * 12;
                if (monthly > 0 && cap > 0) {
                  const isCapped = monthly > cap;
                  return (
                    <div className="mt-1 space-y-1">
                      <p className="text-xs text-gray-500">
                        Annual deduction: <span className="font-medium text-blue-700">{formatCurrency(isCapped ? cap * 12 : annualVC)}</span>
                        {isCapped && (
                          <span className="text-amber-600 ml-1">(capped at 1/3 monthly salary = {formatCurrency(cap)}/mo)</span>
                        )}
                      </p>
                      <p className="text-xs text-gray-400">
                        Withdrawals within 5 years attract tax on earnings (PRA 2014).
                      </p>
                    </div>
                  );
                }
                return (
                  <p className="text-xs text-gray-400 mt-1">
                    Max: 1/3 of monthly salary. Tax-deductible under NTA 2025 s.30(2)(a)(iii).
                  </p>
                );
              })()}
            </div>
          )}

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

        {/* Pension Tax-Exempt Income — Benefits 2 & 3 */}
        <div className="mb-4 p-3 bg-green-50 rounded-lg border border-green-200">
          <h3 className="text-sm font-semibold text-green-800 mb-1">Pension Tax-Exempt Income</h3>
          <p className="text-xs text-gray-500 mb-3">
            Do not include these in Annual Income above — they are fully exempt from tax under PRA 2014.
          </p>

          {/* Benefit 2: Pension Fund Investment Income */}
          <div className="mb-3">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Pension Fund Investment Income (₦)
              <span className="text-xs text-gray-500 font-normal ml-1">(PRA 2014 s.10(3))</span>
            </label>
            <input
              type="text"
              value={pensionFundInvestmentIncome}
              onChange={(e) => {
                const raw = e.target.value.replace(/,/g, '');
                if (raw === '' || /^\d*\.?\d*$/.test(raw)) {
                  setPensionFundInvestmentIncome(formatInputValue(raw));
                }
              }}
              placeholder="Dividends, interest & profits earned on pension fund assets"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent text-sm"
            />
            {parseNumber(pensionFundInvestmentIncome) > 0 && (
              <p className="text-xs text-green-700 mt-1">
                {formatCurrency(parseNumber(pensionFundInvestmentIncome))} exempt — pension fund profits are entirely tax-free.
              </p>
            )}
          </div>

          {/* Benefit 3: Retirement Withdrawal Income */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Retirement Withdrawal Income (₦)
              <span className="text-xs text-gray-500 font-normal ml-1">(PRA 2014 s.7(3))</span>
            </label>
            <input
              type="text"
              value={retirementWithdrawalIncome}
              onChange={(e) => {
                const raw = e.target.value.replace(/,/g, '');
                if (raw === '' || /^\d*\.?\d*$/.test(raw)) {
                  setRetirementWithdrawalIncome(formatInputValue(raw));
                }
              }}
              placeholder="Lump-sum or programmatic RSA withdrawals at retirement"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent text-sm"
            />
            {parseNumber(retirementWithdrawalIncome) > 0 && (
              <p className="text-xs text-green-700 mt-1">
                {formatCurrency(parseNumber(retirementWithdrawalIncome))} exempt — lump-sum and programmatic retirement withdrawals are completely tax-free.
              </p>
            )}
          </div>
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
        <PersonalTaxResults
          result={result}
          isAuthenticated={isAuthenticated}
          onDownloadPDF={generatePDFReport}
        />
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

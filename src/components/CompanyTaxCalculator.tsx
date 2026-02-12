import React, { useState, useCallback, useEffect } from 'react';
import { Pie } from 'react-chartjs-2';
import { Chart as ChartJS, ArcElement, Tooltip, Legend } from 'chart.js';
import { jsPDF } from 'jspdf';
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
import { BUSINESS_TYPES, BusinessSector, getBusinessTypeById, EDI_INFO } from '../utils/businessTypes';
import DocumentUpload from './DocumentUpload';

ChartJS.register(ArcElement, Tooltip, Legend);

const CompanyTaxCalculator: React.FC = () => {
  const [businessSector, setBusinessSector] = useState<BusinessSector>('general');
  const [annualTurnover, setAnnualTurnover] = useState<string>('');
  const [fixedAssets, setFixedAssets] = useState<string>('');
  const [assessableProfit, setAssessableProfit] = useState<string>('');
  const [isProfessionalService, setIsProfessionalService] = useState<boolean>(false);
  const [isNonResident, setIsNonResident] = useState<boolean>(false);
  const [isLargeCompany, setIsLargeCompany] = useState<boolean>(false);
  const [isMNE, setIsMNE] = useState<boolean>(false);
  const [capitalAllowances, setCapitalAllowances] = useState<string>('');
  const [otherDeductions, setOtherDeductions] = useState<Deduction[]>([]);
  const [newDeductionDesc, setNewDeductionDesc] = useState<string>('');
  const [newDeductionAmount, setNewDeductionAmount] = useState<string>('');
  const [result, setResult] = useState<CompanyTaxResult | null>(null);
  const [showNotes, setShowNotes] = useState<boolean>(false);
  const [showSavingsBreakdown, setShowSavingsBreakdown] = useState<boolean>(false);
  // Tax incentive claims (for logged-in users)
  const [isTaxHolidayActive, setIsTaxHolidayActive] = useState<boolean>(false);
  const [qualifyingCapitalExpenditure, setQualifyingCapitalExpenditure] = useState<string>('');
  const [showFieldGuide, setShowFieldGuide] = useState<boolean>(false);
  // Document upload state
  const [showUploadReceipt, setShowUploadReceipt] = useState<boolean>(false);
  const [uploadedFiles, setUploadedFiles] = useState<File[]>([]);
  const [ocrDeductions, setOcrDeductions] = useState<number>(0);

  const selectedBusinessType = getBusinessTypeById(businessSector);

  // Auto-set professional service based on sector selection and reset incentive claims
  useEffect(() => {
    setIsProfessionalService(businessSector === 'professional_services');
    // Reset incentive claims when sector changes
    setIsTaxHolidayActive(false);
    setQualifyingCapitalExpenditure('');
  }, [businessSector]);

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

  // OCR Document Upload Handlers
  const handleOCRResult = useCallback((amount: number) => {
    setOcrDeductions((prev) => prev + amount);
  }, []);

  const handleFileUpload = useCallback((file: File, extractedAmount?: number) => {
    setUploadedFiles((prev) => [...prev, file]);
    if (isAuthenticated && extractedAmount !== undefined) {
      addDocument({
        fileName: file.name,
        extractedAmount,
        description: `Company tax deduction from ${file.name}`,
        type: 'receipt',
      });
    }
  }, [isAuthenticated, addDocument]);

  const calculateTax = useCallback(() => {
    // Add OCR deductions to other deductions if present
    const allDeductions = ocrDeductions > 0
      ? [...otherDeductions, { id: 'ocr-deductions', description: 'OCR Detected Deductions', amount: ocrDeductions }]
      : otherDeductions;

    const input: CompanyTaxInput = {
      annualTurnover: parseNumber(annualTurnover),
      fixedAssets: parseNumber(fixedAssets),
      assessableProfit: parseNumber(assessableProfit),
      isProfessionalService,
      isNonResident,
      capitalAllowances: parseNumber(capitalAllowances),
      otherDeductions: allDeductions,
      assetDisposalProceeds: 0,
      assetTaxWrittenDownValue: 0,
      isLargeCompany,
      isMNE,
      // Sector-specific incentives (only for authenticated users)
      businessSector: isAuthenticated ? businessSector : 'general',
      isTaxHolidayActive: isAuthenticated ? isTaxHolidayActive : false,
      qualifyingCapitalExpenditure: isAuthenticated ? parseNumber(qualifyingCapitalExpenditure) : 0,
    };

    if (input.assessableProfit > 0) {
      const taxResult = calculateCompanyTax(input);
      setResult(taxResult);
    } else {
      setResult(null);
    }
  }, [annualTurnover, fixedAssets, assessableProfit, isProfessionalService, isNonResident, capitalAllowances, otherDeductions, ocrDeductions, isLargeCompany, isMNE, isAuthenticated, businessSector, isTaxHolidayActive, qualifyingCapitalExpenditure]);

  useEffect(() => {
    calculateTax();
  }, [calculateTax]);

  // Save calculation when user is authenticated and result changes
  useEffect(() => {
    if (isAuthenticated && result && result.totalTax > 0) {
      saveTaxCalculation('company', result);
    }
  }, [result?.totalTax]); // eslint-disable-line react-hooks/exhaustive-deps

  // Get incentive savings from result (calculated in taxCalculations.ts)
  const incentiveSavings = {
    taxHolidaySavings: result?.taxHolidaySavings || 0,
    ediCreditSavings: result?.ediCredit || 0,
    totalSavings: result?.totalIncentiveSavings || 0
  };

  // Generate PDF Report with incentives and recommendations
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

    // Helper function for currency
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
    doc.text('Company Tax Report - NTA 2025', MARGIN_LEFT, 35);
    doc.text(`Generated: ${new Date().toLocaleDateString('en-NG')}`, pageWidth - MARGIN_RIGHT, 25, { align: 'right' });

    yPos = 55;
    doc.setTextColor(0, 0, 0);

    // Company Details Section
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.text('Company Details', MARGIN_LEFT, yPos);
    yPos += 10;

    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.text('Business Sector:', MARGIN_LEFT, yPos);
    doc.text(selectedBusinessType?.name || 'General', AMOUNT_X, yPos, { align: 'right' });
    yPos += 7;
    doc.text('Company Classification:', MARGIN_LEFT, yPos);
    doc.text(`${result.companySize.charAt(0).toUpperCase() + result.companySize.slice(1)} Company`, AMOUNT_X, yPos, { align: 'right' });
    yPos += 7;
    doc.text('Annual Turnover:', MARGIN_LEFT, yPos);
    doc.text(formatAmount(result.annualTurnover), AMOUNT_X, yPos, { align: 'right' });
    yPos += 7;
    doc.text('Fixed Assets:', MARGIN_LEFT, yPos);
    doc.text(formatAmount(result.fixedAssets), AMOUNT_X, yPos, { align: 'right' });
    yPos += 15;

    // Income & Deductions Section
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.text('Income & Deductions', MARGIN_LEFT, yPos);
    yPos += 10;

    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.text('Assessable Profit:', MARGIN_LEFT, yPos);
    doc.text(formatAmount(result.assessableProfit), AMOUNT_X, yPos, { align: 'right' });
    yPos += 7;

    if (result.capitalAllowances > 0) {
      doc.text('Capital Allowances:', INDENT_X, yPos);
      doc.text(`-${formatAmount(result.capitalAllowances)}`, AMOUNT_X, yPos, { align: 'right' });
      yPos += 7;
    }

    if (result.otherDeductionsTotal > 0) {
      doc.text('Other Deductions:', INDENT_X, yPos);
      doc.text(`-${formatAmount(result.otherDeductionsTotal)}`, AMOUNT_X, yPos, { align: 'right' });
      yPos += 7;
    }

    doc.setDrawColor(200, 200, 200);
    doc.line(MARGIN_LEFT, yPos, pageWidth - MARGIN_RIGHT, yPos);
    yPos += 7;
    doc.setFont('helvetica', 'bold');
    doc.text('Taxable Profit:', MARGIN_LEFT, yPos);
    doc.text(formatAmount(result.taxableProfit), AMOUNT_X, yPos, { align: 'right' });
    yPos += 15;

    // Tax Breakdown Section
    doc.setFontSize(14);
    doc.text('Tax Breakdown', MARGIN_LEFT, yPos);
    yPos += 10;

    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');

    result.taxBreakdown.forEach((item) => {
      if (item.amount >= 0) {
        checkNewPage(12);
        const descLines = doc.splitTextToSize(item.description, AMOUNT_X - INDENT_X - 10);
        doc.text(descLines, INDENT_X, yPos);
        doc.text(formatAmount(item.amount), AMOUNT_X, yPos, { align: 'right' });
        yPos += Math.max(descLines.length * 5, 7);
      }
    });

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

    // Net Profit Box
    doc.setFillColor(219, 234, 254);
    doc.rect(MARGIN_LEFT, yPos - 5, pageWidth - MARGIN_LEFT - MARGIN_RIGHT, 15, 'F');
    doc.setTextColor(29, 78, 216);
    doc.text('Net Profit:', INDENT_X, yPos + 5);
    doc.text(formatAmount(result.netProfit), AMOUNT_X, yPos + 5, { align: 'right' });
    yPos += 25;

    doc.setTextColor(0, 0, 0);
    doc.setFont('helvetica', 'normal');
    doc.text(`Effective Tax Rate: ${result.effectiveRate.toFixed(2)}%`, MARGIN_LEFT, yPos);
    yPos += 20;

    // Sector-Specific Incentives Section (for authenticated users)
    if (isAuthenticated && selectedBusinessType && selectedBusinessType.taxIncentives.length > 0) {
      checkNewPage(80);

      doc.setFillColor(236, 253, 245);
      doc.rect(MARGIN_LEFT, yPos - 5, pageWidth - MARGIN_LEFT - MARGIN_RIGHT, 15, 'F');
      doc.setFontSize(14);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(22, 101, 52);
      doc.text(`Tax Incentives for ${selectedBusinessType.name}`, INDENT_X, yPos + 5);
      yPos += 20;

      doc.setFontSize(10);
      doc.setTextColor(0, 0, 0);

      // EDI Eligibility
      if (selectedBusinessType.ediEligible) {
        doc.setFont('helvetica', 'bold');
        doc.text('Economic Development Incentive (EDI) Eligible', INDENT_X, yPos);
        yPos += 7;
        doc.setFont('helvetica', 'normal');
        doc.text(`Credit Rate: ${EDI_INFO.creditRate} on Qualifying Capital Expenditure`, 30, yPos);
        yPos += 5;
        doc.text(`Duration: Up to ${EDI_INFO.maxDuration} (${EDI_INFO.totalCredit})`, 30, yPos);
        yPos += 10;
      }

      // List incentives
      selectedBusinessType.taxIncentives.forEach((incentive) => {
        checkNewPage(25);
        doc.setFont('helvetica', 'bold');
        doc.text(`${incentive.name} (${incentive.type})`, INDENT_X, yPos);
        yPos += 6;
        doc.setFont('helvetica', 'normal');
        if (incentive.rate) {
          doc.text(`Rate: ${incentive.rate}`, 30, yPos);
          yPos += 5;
        }
        if (incentive.duration) {
          doc.text(`Duration: ${incentive.duration}`, 30, yPos);
          yPos += 5;
        }
        const descLines = doc.splitTextToSize(incentive.description, pageWidth - 30 - MARGIN_RIGHT);
        doc.text(descLines, 30, yPos);
        yPos += descLines.length * 5 + 5;
      });

      // Applied Incentive Savings
      if (incentiveSavings.totalSavings > 0) {
        checkNewPage(30);
        yPos += 5;
        doc.setFillColor(254, 249, 195);
        doc.rect(MARGIN_LEFT, yPos - 5, pageWidth - MARGIN_LEFT - MARGIN_RIGHT, 20, 'F');
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(161, 98, 7);
        doc.text('Applied Incentive Savings:', INDENT_X, yPos + 3);
        if (incentiveSavings.taxHolidaySavings > 0) {
          doc.text(`Tax Holiday Savings: ${formatAmount(incentiveSavings.taxHolidaySavings)}`, INDENT_X, yPos + 10);
        }
        if (incentiveSavings.ediCreditSavings > 0) {
          doc.text(`EDI Credit (Annual): ${formatAmount(incentiveSavings.ediCreditSavings)}`, pageWidth / 2, yPos + 10);
        }
        yPos += 25;
      }
    }

    // Tax Savings Recommendations Section
    doc.addPage();
    yPos = 20;

    doc.setFillColor(30, 64, 175);
    doc.rect(0, 0, pageWidth, 25, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(16);
    doc.setFont('helvetica', 'bold');
    doc.text('Tax Savings Recommendations (NTA 2025)', MARGIN_LEFT, 17);
    yPos = 35;
    doc.setTextColor(0, 0, 0);

    // Build recommendations dynamically based on company size, sector, and attributes
    const recommendations: { title: string; desc: string; saving: string }[] = [];
    let recNum = 1;

    const sectorName = selectedBusinessType?.name || 'General';
    const sector = businessSector;

    // Capital Allowances - relevant for big/large companies paying CIT
    if (result.companySize !== 'small') {
      recommendations.push({
        title: `${recNum++}. Maximize Capital Allowances`,
        desc: 'Claim up to 50% initial allowance + 25% annual allowance on qualifying assets (machinery, equipment, vehicles).',
        saving: 'Example: N100M equipment = N15M CIT savings (30% of N50M allowance)'
      });
    }

    // Small Company Exemption - suggest if company is big but could potentially qualify
    if (result.companySize !== 'small' && !result.isProfessionalService) {
      recommendations.push({
        title: `${recNum++}. Consider Small Company Exemption`,
        desc: 'Maintain turnover <= N100M AND fixed assets < N250M to qualify for 0% CIT and exemption from 4% Development Levy.',
        saving: 'Potential: 100% CIT + Levy exemption'
      });
    }

    // Small company confirmation - if already small, confirm the benefit
    if (result.companySize === 'small') {
      recommendations.push({
        title: `${recNum++}. Maintain Small Company Status`,
        desc: 'Your company currently qualifies for 0% CIT and is exempt from the 4% Development Levy. Keep turnover <= N100M and fixed assets < N250M to retain this benefit.',
        saving: 'Current benefit: 100% CIT + Levy exemption'
      });
    }

    // EDI - only for EDI-eligible sectors
    if (selectedBusinessType?.ediEligible) {
      const qceThreshold = selectedBusinessType.taxIncentives.find(i => i.qceThreshold)?.qceThreshold;
      const qceInfo = qceThreshold ? ` (minimum QCE: N${(qceThreshold / 1000000).toFixed(0)}M)` : '';
      recommendations.push({
        title: `${recNum++}. Economic Development Incentive (EDI)`,
        desc: `As a ${sectorName} business, you qualify for 5% annual tax credit on qualifying capital expenditure for up to 5 years${qceInfo}.`,
        saving: 'Example: N500M QCE = N25M annual credit (N125M over 5 years)'
      });
    }

    // Sector-specific incentives from the selected business type
    if (selectedBusinessType) {
      for (const incentive of selectedBusinessType.taxIncentives) {
        // Skip small company exemption (already handled above) and EDI credits (handled above)
        if (incentive.name === 'Small Company Exemption' || incentive.name === 'Tech Startup Exemption' || incentive.name === 'Agribusiness Small Company Relief') continue;
        if (incentive.type === 'credit' && incentive.name.includes('EDI')) continue;

        if (incentive.type === 'holiday') {
          recommendations.push({
            title: `${recNum++}. ${incentive.name}`,
            desc: `${incentive.description}${incentive.duration ? ` (${incentive.duration})` : ''}.`,
            saving: `Potential: ${incentive.rate || '100% tax exemption'} during holiday period`
          });
        } else if (incentive.type === 'deduction') {
          recommendations.push({
            title: `${recNum++}. ${incentive.name}`,
            desc: `${incentive.description}.`,
            saving: incentive.rate ? `Deduction rate: ${incentive.rate}` : 'Reduces taxable profit and CIT liability'
          });
        } else if (incentive.type === 'exemption' && incentive.name !== 'Small Company Exemption') {
          recommendations.push({
            title: `${recNum++}. ${incentive.name}`,
            desc: `${incentive.description}.`,
            saving: incentive.rate ? `Rate: ${incentive.rate}` : 'Tax exemption benefit'
          });
        } else if (incentive.type === 'credit' && !incentive.name.includes('EDI')) {
          recommendations.push({
            title: `${recNum++}. ${incentive.name}`,
            desc: `${incentive.description}.`,
            saving: incentive.rate ? `Credit rate: ${incentive.rate}` : 'Tax credit benefit'
          });
        }
      }
    }

    // Non-Resident Levy Exemption - only if company is non-resident
    if (result.isNonResident) {
      recommendations.push({
        title: `${recNum++}. Non-Resident Levy Exemption`,
        desc: 'As a non-resident company, you are exempt from the 4% Development Levy.',
        saving: `Levy saving: N${(result.assessableProfit * 0.04 / 1000000).toFixed(1)}M on your assessable profit`
      });
    }

    // Document All Deductions - relevant for big/large companies
    if (result.companySize !== 'small') {
      recommendations.push({
        title: `${recNum++}. Document All Deductions`,
        desc: 'Maintain receipts for all business expenses: salaries, rent, utilities, marketing, travel, professional fees.',
        saving: 'Every N1M in deductions saves N300K in CIT'
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

    // Footer
    checkNewPage(25);
    yPos += 10;
    doc.setFontSize(8);
    doc.setTextColor(128, 128, 128);
    doc.text('This report is generated by WittyTax based on Nigeria Tax Act (NTA) 2025.', MARGIN_LEFT, yPos);
    yPos += 5;
    doc.text('Tax incentives require approval. Consult Nigeria Revenue Service for eligibility verification.', MARGIN_LEFT, yPos);
    yPos += 8;
    doc.text('\u00A9 Tech84', pageWidth / 2, yPos, { align: 'center' });

    // Save the PDF
    doc.save(`WittyTax_Company_Report_${new Date().toISOString().split('T')[0]}.pdf`);
  }, [result, isAuthenticated, selectedBusinessType, incentiveSavings]);

  const getPieChartData = () => {
    if (!result) return null;

    const isBigOrLarge = result.companySize === 'big' || result.companySize === 'large';
    const data = isBigOrLarge
      ? [result.corporateTax, result.developmentLevy, result.netProfit > 0 ? result.netProfit : 0]
      : [result.totalTax, result.netProfit > 0 ? result.netProfit : 0];

    const labels = isBigOrLarge
      ? ['Corporate Tax (30%)', 'Development Levy (4%)', 'Net Profit']
      : ['Tax Liability', 'Net Profit'];

    const backgroundColor = isBigOrLarge
      ? ['#ef4444', '#f97316', '#22c55e']
      : ['#ef4444', '#22c55e'];

    const borderColor = isBigOrLarge
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

    // Check for large company first
    if (isLargeCompany || isMNE || turnover > COMPANY_TAX_RATES.large.turnoverThreshold) {
      return {
        size: 'Large',
        rate: isNonResident ? '30% + 15% ETR' : '30% + 4% Levy + 15% ETR',
        description: isMNE
          ? 'MNE with global turnover >€750M - Subject to 15% minimum ETR'
          : 'Turnover >₦50B - Subject to 15% minimum ETR (OECD Pillar II)',
        color: 'text-purple-600',
        bgColor: 'bg-purple-50',
        borderColor: 'border-purple-200',
      };
    }

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
      {/* Input Section + Pie Chart */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
      {/* Input Section */}
      <div className={`bg-white rounded-lg shadow-md p-6 ${result ? 'lg:col-span-3' : 'lg:col-span-5'}`}>
        <h2 className="text-xl font-semibold text-gray-800 mb-4">Company Details & Deductions</h2>

        {/* Business Sector Selection */}
        <div className="mb-6">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Business Sector / Industry
          </label>
          <select
            value={businessSector}
            onChange={(e) => setBusinessSector(e.target.value as BusinessSector)}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
          >
            {BUSINESS_TYPES.map((bt) => (
              <option key={bt.id} value={bt.id}>
                {bt.name} {bt.ediEligible ? '(EDI Eligible)' : ''}
              </option>
            ))}
          </select>
          {selectedBusinessType && (
            <p className="text-xs text-gray-500 mt-1">{selectedBusinessType.description}</p>
          )}

          {/* Sector Incentives Display */}
          {selectedBusinessType && selectedBusinessType.taxIncentives.length > 0 && (
            <div className="mt-3 p-3 bg-green-50 rounded-lg border border-green-200">
              <div className="flex items-center gap-1.5 mb-2">
                <svg className="w-4 h-4 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <span className="text-xs font-semibold text-green-800">
                  Available Incentives for {selectedBusinessType.name}
                </span>
                {selectedBusinessType.ediEligible && (
                  <span className="ml-auto px-1.5 py-0.5 bg-green-200 text-green-800 text-[10px] font-medium rounded">EDI Eligible</span>
                )}
              </div>
              <div className="space-y-2">
                {selectedBusinessType.taxIncentives.map((incentive, index) => (
                  <div key={index} className="flex items-start gap-2">
                    <span className={`mt-0.5 flex-shrink-0 px-1.5 py-0.5 text-[10px] font-medium rounded ${
                      incentive.type === 'holiday' ? 'bg-purple-100 text-purple-700' :
                      incentive.type === 'exemption' ? 'bg-blue-100 text-blue-700' :
                      incentive.type === 'credit' ? 'bg-orange-100 text-orange-700' :
                      'bg-gray-100 text-gray-700'
                    }`}>
                      {incentive.type}
                    </span>
                    <div className="min-w-0">
                      <p className="text-xs font-medium text-gray-800">
                        {incentive.name}
                        {incentive.rate && <span className="text-green-600 ml-1">({incentive.rate})</span>}
                        {incentive.duration && <span className="text-gray-500 ml-1">- {incentive.duration}</span>}
                      </p>
                      <p className="text-[11px] text-gray-600 leading-tight">{incentive.description}</p>
                    </div>
                  </div>
                ))}
              </div>
              {selectedBusinessType.ediEligible && (
                <p className="text-[11px] text-green-700 mt-2 pt-2 border-t border-green-200">
                  EDI: {EDI_INFO.creditRate} tax credit on qualifying capital expenditure for up to {EDI_INFO.maxDuration} ({EDI_INFO.totalCredit}).
                </p>
              )}
            </div>
          )}
        </div>

        {/* Sector-Specific Incentive Claims - Only visible to logged-in users */}
        {isAuthenticated && selectedBusinessType && (
          selectedBusinessType.taxIncentives.some(i => i.type === 'holiday') || selectedBusinessType.ediEligible
        ) && (
          <div className="mb-6 p-4 bg-green-50 rounded-lg border border-green-200">
            <h4 className="text-sm font-semibold text-green-800 flex items-center gap-2 mb-3">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              Claim Tax Incentives ({selectedBusinessType.name})
            </h4>
            <p className="text-xs text-green-700 mb-4">
              Your sector qualifies for special incentives under NTA 2025. Claim applicable incentives below - view details in Tax Savings section.
            </p>
            <div className="space-y-3">
              {/* Tax Holiday Checkbox */}
              {selectedBusinessType.taxIncentives.some(i => i.type === 'holiday') && (
                <label className="flex items-start space-x-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={isTaxHolidayActive}
                    onChange={(e) => setIsTaxHolidayActive(e.target.checked)}
                    className="mt-1 w-4 h-4 text-green-600 border-gray-300 rounded focus:ring-green-500"
                  />
                  <div>
                    <span className="text-sm font-medium text-gray-700">
                      Tax Holiday Active
                    </span>
                    <p className="text-xs text-gray-500">
                      My company is currently within the tax holiday period (approved by NIPC)
                    </p>
                  </div>
                </label>
              )}

              {/* EDI Qualifying Capital Expenditure */}
              {selectedBusinessType.ediEligible && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Qualifying Capital Expenditure (QCE) for EDI
                  </label>
                  <input
                    type="text"
                    value={qualifyingCapitalExpenditure}
                    onChange={(e) => {
                      const raw = e.target.value.replace(/,/g, '');
                      if (raw === '' || /^\d*\.?\d*$/.test(raw)) {
                        setQualifyingCapitalExpenditure(formatInputValue(raw));
                      }
                    }}
                    placeholder="Enter qualifying capital expenditure"
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    Investment in qualifying assets (manufacturing facilities, processing equipment, etc.)
                  </p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Company Type Checkboxes */}
        <div className="mb-4 p-4 bg-gray-50 rounded-lg space-y-3">
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

          <label className="flex items-start space-x-3 cursor-pointer">
            <input
              type="checkbox"
              checked={isLargeCompany}
              onChange={(e) => setIsLargeCompany(e.target.checked)}
              className="mt-1 w-4 h-4 text-primary-600 border-gray-300 rounded focus:ring-primary-500"
            />
            <div>
              <span className="text-sm font-medium text-gray-700">
                Large Company (Turnover &gt; ₦50 Billion)
              </span>
              <p className="text-xs text-gray-500">
                Subject to 15% minimum Effective Tax Rate (OECD Pillar II)
              </p>
            </div>
          </label>

          <label className="flex items-start space-x-3 cursor-pointer">
            <input
              type="checkbox"
              checked={isMNE}
              onChange={(e) => setIsMNE(e.target.checked)}
              className="mt-1 w-4 h-4 text-primary-600 border-gray-300 rounded focus:ring-primary-500"
            />
            <div>
              <span className="text-sm font-medium text-gray-700">
                Multinational Enterprise (MNE)
              </span>
              <p className="text-xs text-gray-500">
                Part of MNE group with global turnover &gt; €750 million
              </p>
            </div>
          </label>
        </div>

        {/* More Details Button */}
        <button
          type="button"
          onClick={() => setShowFieldGuide(true)}
          className="mb-4 inline-flex items-center gap-1.5 text-sm text-primary-600 hover:text-primary-800 font-medium transition-colors"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          More details on these fields
        </button>

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
            <h3 className="text-sm font-medium text-gray-700 mb-4 text-center">Tax vs Net Profit</h3>
            <div className="w-full max-w-xs mx-auto h-64">
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

              <div className="flex justify-between py-2 border-b border-gray-200 bg-blue-50 px-3 rounded">
                <span className="text-blue-700 font-medium">Taxable Profit (for CIT):</span>
                <span className="font-bold text-blue-700">{formatCurrency(result.taxableProfit)}</span>
              </div>
              <p className="text-xs text-gray-500 mb-2">
                Taxable Profit = Assessable Profit - Allowable Deductions
              </p>

              <div className={`flex justify-between items-center py-2 px-3 rounded-lg ${
                result.companySize === 'small' ? 'bg-green-50 border border-green-300' : result.companySize === 'large' ? 'bg-purple-50' : 'bg-gray-50'
              }`}>
                <span className="text-gray-600">Company Classification:</span>
                <div className="flex items-center gap-2">
                  {result.companySize === 'small' && (
                    <span className="px-2 py-0.5 bg-green-200 text-green-800 text-xs font-bold rounded-full">
                      CIT & Levy Exempt
                    </span>
                  )}
                  <span className={`font-medium capitalize ${
                    result.companySize === 'small' ? 'text-green-600' : result.companySize === 'large' ? 'text-purple-600' : 'text-red-600'
                  }`}>
                    {result.companySize}
                    {result.isProfessionalService && ' (Professional)'}
                    {result.isNonResident && ' (Non-Resident)'}
                    {result.isMNE && ' (MNE)'}
                  </span>
                </div>
              </div>
              {result.minimumETRApplied && (
                <div className="flex justify-between py-2 px-3 rounded-lg bg-purple-50 mt-2">
                  <span className="text-purple-700 text-sm">15% Minimum ETR Applied (OECD Pillar II)</span>
                </div>
              )}

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

              {/* Tax Savings Breakdown - Collapsible (Only for authenticated users) */}
              {isAuthenticated && selectedBusinessType && selectedBusinessType.taxIncentives.length > 0 && (
                <div className="mt-4 border border-green-200 rounded-lg overflow-hidden">
                  <button
                    onClick={() => setShowSavingsBreakdown(!showSavingsBreakdown)}
                    className="w-full px-4 py-3 flex items-center justify-between bg-green-50 hover:bg-green-100 transition-colors"
                  >
                    <div className="flex items-center gap-2">
                      <svg className="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      <span className="text-sm font-semibold text-green-800">Tax Savings & Incentives</span>
                      {(result.totalIncentiveSavings > 0 || incentiveSavings.totalSavings > 0) && (
                        <span className="px-2 py-0.5 bg-green-200 text-green-800 text-xs font-medium rounded-full">
                          Saving {formatCurrency(result.totalIncentiveSavings || incentiveSavings.totalSavings)}
                        </span>
                      )}
                    </div>
                    <svg
                      className={`w-5 h-5 text-green-600 transition-transform ${showSavingsBreakdown ? 'rotate-180' : ''}`}
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  </button>

                  {showSavingsBreakdown && (
                    <div className="px-4 py-3 bg-white space-y-4">
                      {/* Sector Incentives Header */}
                      <div className="pb-3 border-b border-gray-200">
                        <h5 className="text-sm font-semibold text-gray-800">
                          Available Incentives for {selectedBusinessType.name}
                        </h5>
                        <p className="text-xs text-gray-500 mt-1">
                          Your business sector qualifies for the following NTA 2025 incentives
                        </p>
                      </div>

                      {/* EDI Eligibility */}
                      {selectedBusinessType.ediEligible && (
                        <div className="p-3 bg-green-50 rounded-lg border border-green-200">
                          <div className="flex items-center gap-2 mb-2">
                            <span className="px-2 py-1 bg-green-100 text-green-800 text-xs font-medium rounded">EDI Eligible</span>
                          </div>
                          <p className="text-sm text-gray-700">
                            <strong>Economic Development Incentive (EDI):</strong> {EDI_INFO.creditRate} tax credit on qualifying capital expenditure for up to {EDI_INFO.maxDuration}.
                          </p>
                          {selectedBusinessType.ediDetails && (
                            <p className="text-xs text-gray-600 mt-1">{selectedBusinessType.ediDetails}</p>
                          )}
                        </div>
                      )}

                      {/* List of Available Incentives */}
                      <div className="space-y-2">
                        {selectedBusinessType.taxIncentives.map((incentive, index) => (
                          <div key={index} className="p-3 bg-gray-50 rounded-lg border border-gray-200">
                            <div className="flex items-center gap-2 mb-1">
                              <span className={`px-2 py-0.5 text-xs font-medium rounded ${
                                incentive.type === 'holiday' ? 'bg-purple-100 text-purple-800' :
                                incentive.type === 'exemption' ? 'bg-blue-100 text-blue-800' :
                                incentive.type === 'credit' ? 'bg-orange-100 text-orange-800' :
                                'bg-gray-100 text-gray-800'
                              }`}>
                                {incentive.type.charAt(0).toUpperCase() + incentive.type.slice(1)}
                              </span>
                              {incentive.duration && <span className="text-xs text-gray-500">{incentive.duration}</span>}
                              {incentive.rate && <span className="text-xs font-medium text-green-600">{incentive.rate}</span>}
                            </div>
                            <h6 className="text-sm font-medium text-gray-900">{incentive.name}</h6>
                            <p className="text-xs text-gray-600 mt-1">{incentive.description}</p>
                            {incentive.requirements && incentive.requirements.length > 0 && (
                              <details className="mt-2">
                                <summary className="text-xs font-medium text-gray-700 cursor-pointer">Requirements</summary>
                                <ul className="text-xs text-gray-600 list-disc list-inside mt-1 ml-2">
                                  {incentive.requirements.map((req, i) => (
                                    <li key={i}>{req}</li>
                                  ))}
                                </ul>
                              </details>
                            )}
                            {incentive.qceThreshold && (
                              <p className="text-xs text-orange-600 mt-1">
                                Minimum QCE: {formatCurrency(incentive.qceThreshold)}
                              </p>
                            )}
                          </div>
                        ))}
                      </div>

                      {/* Applied Savings Section */}
                      {(result.taxHolidaySavings > 0 || result.ediCredit > 0) && (
                        <div className="pt-3 border-t border-green-200">
                          <h5 className="text-sm font-semibold text-green-800 mb-3">Applied Incentive Savings</h5>

                          {/* Tax Holiday Savings */}
                          {result.taxHolidaySavings > 0 && (
                            <div className="p-3 bg-purple-50 rounded-lg mb-2">
                              <div className="flex justify-between items-center">
                                <div>
                                  <span className="text-sm font-medium text-purple-800">Tax Holiday Exemption</span>
                                  <p className="text-xs text-purple-600 mt-1">100% exemption on CIT + Development Levy</p>
                                </div>
                                <span className="text-lg font-bold text-purple-700">{formatCurrency(result.taxHolidaySavings)}</span>
                              </div>
                            </div>
                          )}

                          {/* EDI Credit Savings */}
                          {result.ediCredit > 0 && (
                            <div className="p-3 bg-orange-50 rounded-lg mb-2">
                              <div className="flex justify-between items-center">
                                <div>
                                  <span className="text-sm font-medium text-orange-800">EDI Tax Credit (Annual)</span>
                                  <p className="text-xs text-orange-600 mt-1">5% of Qualifying Capital Expenditure</p>
                                </div>
                                <span className="text-lg font-bold text-orange-700">{formatCurrency(result.ediCredit)}</span>
                              </div>
                            </div>
                          )}

                          {/* Total Savings */}
                          <div className="p-3 bg-green-100 rounded-lg mt-3">
                            <div className="flex justify-between items-center">
                              <span className="text-sm font-semibold text-green-800">Total Tax Savings:</span>
                              <span className="text-xl font-bold text-green-700">{formatCurrency(result.totalIncentiveSavings || incentiveSavings.totalSavings)}</span>
                            </div>
                          </div>
                        </div>
                      )}

                      {/* Disclaimer */}
                      <p className="text-xs text-gray-500 pt-2 border-t border-gray-200">
                        * Tax incentives require approval. Consult Nigeria Revenue Service for eligibility verification.
                      </p>
                    </div>
                  )}
                </div>
              )}

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
        </div>
      )}

      {/* Company Tax Notes - Collapsible */}
      <div className="bg-white rounded-lg shadow-md overflow-hidden">
        <button
          onClick={() => setShowNotes(!showNotes)}
          className="w-full px-6 py-4 flex items-center justify-between text-left hover:bg-gray-50 transition-colors"
        >
          <div className="flex items-center">
            <svg className="w-5 h-5 text-primary-600 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <div>
              <h3 className="text-lg font-semibold text-gray-800">Important Notes (NTA 2025)</h3>
              <p className="text-xs text-gray-500">Click to {showNotes ? 'hide' : 'view'} tax rules and guidelines</p>
            </div>
          </div>
          <svg
            className={`w-5 h-5 text-gray-400 transition-transform ${showNotes ? 'rotate-180' : ''}`}
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </button>

        {showNotes && (
          <div className="px-6 pb-6 border-t border-gray-100">
            <ul className="text-sm text-gray-600 space-y-2 mt-4">
              <li className="flex items-start">
                <span className="text-green-500 mr-2">•</span>
                <span><strong>Small Company Exemption:</strong> Turnover ≤ ₦100M AND Fixed Assets &lt; ₦250M = 0% CIT and exempt from 4% Development Levy</span>
              </li>
              <li className="flex items-start">
                <span className="text-red-500 mr-2">•</span>
                <span><strong>CIT (30%):</strong> Calculated on <strong>Taxable Profit</strong> (Assessable Profit - Allowable Deductions + Asset Gains)</span>
              </li>
              <li className="flex items-start">
                <span className="text-orange-500 mr-2">•</span>
                <span><strong>Development Levy (4%):</strong> Calculated on <strong>Assessable Profit only</strong> (non-residents exempt)</span>
              </li>
              <li className="flex items-start">
                <span className="text-purple-500 mr-2">•</span>
                <span><strong>15% Minimum ETR:</strong> Large companies (turnover &gt;₦50B) or MNEs (global turnover &gt;€750M) - OECD Pillar II</span>
              </li>
              <li className="flex items-start">
                <span className="text-primary-500 mr-2">•</span>
                <span><strong>Professional Services:</strong> Lawyers, accountants, consultants excluded from small company exemption</span>
              </li>
              <li className="flex items-start">
                <span className="text-primary-500 mr-2">•</span>
                <span><strong>Filing Deadline:</strong> Within 6 months of accounting year end</span>
              </li>
              <li className="flex items-start">
                <span className="text-gray-400 mr-2">•</span>
                <span>This calculator provides estimates. Consult Nigeria Revenue Service for official filing.</span>
              </li>
            </ul>
          </div>
        )}
      </div>

      {/* Field Guide Modal */}
      {showFieldGuide && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50" onClick={() => setShowFieldGuide(false)}>
          <div className="bg-white rounded-xl shadow-2xl max-w-lg w-full max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between p-5 border-b border-gray-200 bg-primary-50 rounded-t-xl">
              <div className="flex items-center gap-2">
                <svg className="w-6 h-6 text-primary-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                </svg>
                <h3 className="text-lg font-bold text-gray-800">Understanding the Fields</h3>
              </div>
              <button onClick={() => setShowFieldGuide(false)} className="p-1 text-gray-400 hover:text-gray-600 rounded-full hover:bg-gray-100">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="p-5 space-y-5">
              {/* Annual Turnover */}
              <div className="p-4 bg-blue-50 rounded-lg border border-blue-100">
                <h4 className="text-sm font-bold text-blue-800 mb-2">Annual Turnover</h4>
                <p className="text-sm text-gray-700 mb-2">
                  Your company's <strong>total revenue from sales</strong> of goods or services during the financial year, before subtracting any expenses.
                </p>
                <div className="text-xs text-gray-600 space-y-1">
                  <p><strong>Example:</strong> If your shop sold goods worth ₦40M in the year, your annual turnover is ₦40,000,000.</p>
                  <p><strong>Where to find it:</strong> Top line of your income statement / profit & loss account.</p>
                  <p><strong>Why it matters:</strong> Determines your company size classification (small ≤ ₦100M = 0% CIT, exempt from 4% levy).</p>
                </div>
              </div>

              {/* Fixed Assets Value */}
              <div className="p-4 bg-green-50 rounded-lg border border-green-100">
                <h4 className="text-sm font-bold text-green-800 mb-2">Fixed Assets Value</h4>
                <p className="text-sm text-gray-700 mb-2">
                  The <strong>total value of long-term physical assets</strong> your company owns and uses for business operations (not for resale).
                </p>
                <div className="text-xs text-gray-600 space-y-1">
                  <p><strong>Includes:</strong> Land, buildings, machinery, equipment, vehicles, furniture, computers.</p>
                  <p><strong>Example:</strong> Office building ₦100M + delivery vans ₦20M + computers ₦5M = ₦125,000,000.</p>
                  <p><strong>Where to find it:</strong> Balance sheet under "Property, Plant & Equipment" or "Non-Current Assets".</p>
                  <p><strong>Why it matters:</strong> Along with turnover, determines if your company qualifies as "small" (assets &lt; ₦250M).</p>
                </div>
              </div>

              {/* Assessable Profit */}
              <div className="p-4 bg-orange-50 rounded-lg border border-orange-100">
                <h4 className="text-sm font-bold text-orange-800 mb-2">Assessable Profit</h4>
                <p className="text-sm text-gray-700 mb-2">
                  Your company's <strong>profit before tax deductions and capital allowances</strong> are applied. Think of it as your "starting profit" for tax purposes.
                </p>
                <div className="text-xs text-gray-600 space-y-1">
                  <p><strong>How to calculate:</strong> Total Revenue - Operating Expenses (salaries, rent, utilities, materials, etc.).</p>
                  <p><strong>Example:</strong> Revenue ₦40M - Expenses ₦28M = Assessable Profit of ₦12,000,000.</p>
                  <p><strong>Where to find it:</strong> "Profit Before Tax" on your income statement (before applying capital allowances).</p>
                  <p><strong>Why it matters:</strong> The 4% Development Levy is calculated on this figure. CIT is calculated after deductions.</p>
                </div>
              </div>

              {/* Capital Allowances */}
              <div className="p-4 bg-purple-50 rounded-lg border border-purple-100">
                <h4 className="text-sm font-bold text-purple-800 mb-2">Capital Allowances</h4>
                <p className="text-sm text-gray-700 mb-2">
                  A <strong>tax deduction for wear and tear</strong> on your business assets. It is similar to depreciation but uses rates set by tax law (not accounting rules).
                </p>
                <div className="text-xs text-gray-600 space-y-1">
                  <p><strong>Typical rates:</strong> Initial allowance (up to 50%) in the first year + annual allowance (10-25%) thereafter.</p>
                  <p><strong>Example:</strong> You bought machinery for ₦10M. Year 1: 50% initial = ₦5M allowance. Year 2+: 25% annual on the remainder.</p>
                  <p><strong>What qualifies:</strong> Machinery, equipment, vehicles, buildings, furniture, IT equipment used for business.</p>
                  <p><strong>Why it matters:</strong> Reduces your taxable profit, directly lowering your CIT bill.</p>
                </div>
              </div>
            </div>

            <div className="p-4 border-t border-gray-200 bg-gray-50 rounded-b-xl">
              <button
                onClick={() => setShowFieldGuide(false)}
                className="w-full px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors text-sm font-medium"
              >
                Got it
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default CompanyTaxCalculator;

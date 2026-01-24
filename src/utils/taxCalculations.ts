// Nigeria Tax Act 2025 - Tax Calculation Utilities

// Personal Income Tax Bands (Progressive Taxation) - NTA 2025
export const PERSONAL_TAX_BANDS = [
  { min: 0, max: 800000, rate: 0 },
  { min: 800001, max: 3000000, rate: 0.15 },
  { min: 3000001, max: 12000000, rate: 0.18 },
  { min: 12000001, max: 25000000, rate: 0.21 },
  { min: 25000001, max: 50000000, rate: 0.23 },
  { min: 50000001, max: Infinity, rate: 0.25 },
];

// Company Income Tax Rates based on NTA 2025
// Small companies: Turnover <= ₦50M AND Fixed Assets < ₦250M = 0%
// Big companies: All others = 30% + 4% Development Levy
// Professional services (lawyers, accountants, consultants): 30% regardless of size
export const COMPANY_TAX_RATES = {
  small: {
    maxTurnover: 50000000, // ₦50 million
    maxFixedAssets: 250000000, // ₦250 million
    rate: 0,
  },
  big: {
    rate: 0.30, // 30%
    developmentLevy: 0.04, // 4% Development Levy on assessable profits
  },
};

// Constants
export const PENSION_DEDUCTION_RATE = 0.08; // 8%
export const NHF_DEDUCTION_RATE = 0.025; // 2.5%
export const RENT_RELIEF_RATE = 0.20; // 20% of annual rent
export const MAX_RENT_RELIEF = 500000; // ₦500,000 cap

// NTA 2025 Exemption Constants
export const SHARE_TRANSFER_EXEMPTION = {
  threshold: 150000000, // ₦150M (increased from ₦100M)
  maxExemptibleGain: 10000000, // ₦10M maximum exemptible gain
  cgtRate: 0.10, // 10% Capital Gains Tax rate
};

export const COMPENSATION_EXEMPTION = {
  threshold: 50000000, // ₦50M (increased from ₦10M)
};

// Lodgement deadline - March 31, 2026 for 2025 tax year (Personal Income Tax)
export const LODGEMENT_DATE = new Date('2026-03-31T23:59:59');

// Company tax filing deadline - June 30 (6 months after financial year end)
export const COMPANY_LODGEMENT_DATE = new Date('2026-06-30T23:59:59');

export interface Deduction {
  id: string;
  description: string;
  amount: number;
}

export interface PersonalTaxInput {
  annualIncome: number;
  applyPension: boolean;
  applyNHF: boolean;
  annualRent: number;
  additionalDeductions: Deduction[];
  ocrDeductions: number;
}

export interface PersonalTaxResult {
  grossIncome: number;
  pensionDeduction: number;
  nhfDeduction: number;
  rentRelief: number;
  additionalDeductionsTotal: number;
  ocrDeductions: number;
  totalDeductions: number;
  taxableIncome: number;
  totalTax: number;
  netIncome: number;
  effectiveRate: number;
  taxBreakdown: TaxBandBreakdown[];
}

export interface TaxBandBreakdown {
  band: string;
  income: number;
  rate: number;
  tax: number;
}

export interface CompanyTaxInput {
  annualTurnover: number;
  fixedAssets: number;
  assessableProfit: number;
  isProfessionalService: boolean;
  isNonResident: boolean;
  capitalAllowances: number;
  otherDeductions: Deduction[];
}

export interface CompanyTaxResult {
  annualTurnover: number;
  fixedAssets: number;
  assessableProfit: number;
  capitalAllowances: number;
  otherDeductionsTotal: number;
  totalDeductions: number;
  taxableProfit: number;
  companySize: 'small' | 'big';
  isProfessionalService: boolean;
  isNonResident: boolean;
  taxRate: number;
  corporateTax: number;
  developmentLevy: number;
  totalTax: number;
  netProfit: number;
  effectiveRate: number;
  taxBreakdown: {
    description: string;
    amount: number;
  }[];
}

// Calculate progressive personal income tax
export function calculateProgressiveTax(taxableIncome: number): {
  totalTax: number;
  breakdown: TaxBandBreakdown[];
} {
  let remainingIncome = taxableIncome;
  let totalTax = 0;
  const breakdown: TaxBandBreakdown[] = [];

  for (const band of PERSONAL_TAX_BANDS) {
    if (remainingIncome <= 0) break;

    const bandWidth = band.max === Infinity ? remainingIncome : band.max - band.min + 1;
    const incomeInBand = Math.min(remainingIncome, bandWidth);
    const taxInBand = incomeInBand * band.rate;

    if (incomeInBand > 0) {
      breakdown.push({
        band: band.max === Infinity
          ? `Over ₦${formatNumber(band.min - 1)}`
          : `₦${formatNumber(band.min)} - ₦${formatNumber(band.max)}`,
        income: incomeInBand,
        rate: band.rate * 100,
        tax: taxInBand,
      });
    }

    totalTax += taxInBand;
    remainingIncome -= incomeInBand;
  }

  return { totalTax, breakdown };
}

// Calculate rent relief (20% of rent, capped at ₦500,000)
export function calculateRentRelief(annualRent: number): number {
  const relief = annualRent * RENT_RELIEF_RATE;
  return Math.min(relief, MAX_RENT_RELIEF);
}

// Main personal tax calculation function
export function calculatePersonalTax(input: PersonalTaxInput): PersonalTaxResult {
  const {
    annualIncome,
    applyPension,
    applyNHF,
    annualRent,
    additionalDeductions,
    ocrDeductions,
  } = input;

  // Calculate deductions
  const pensionDeduction = applyPension ? annualIncome * PENSION_DEDUCTION_RATE : 0;
  const nhfDeduction = applyNHF ? annualIncome * NHF_DEDUCTION_RATE : 0;
  const rentRelief = calculateRentRelief(annualRent);
  const additionalDeductionsTotal = additionalDeductions.reduce(
    (sum, d) => sum + d.amount,
    0
  );

  // Total deductions
  const totalDeductions =
    pensionDeduction + nhfDeduction + rentRelief + additionalDeductionsTotal + ocrDeductions;

  // Taxable income (cannot be negative)
  const taxableIncome = Math.max(0, annualIncome - totalDeductions);

  // Calculate tax using progressive bands
  const { totalTax, breakdown } = calculateProgressiveTax(taxableIncome);

  // Net income after tax
  const netIncome = annualIncome - totalDeductions - totalTax;

  // Effective tax rate
  const effectiveRate = annualIncome > 0 ? (totalTax / annualIncome) * 100 : 0;

  return {
    grossIncome: annualIncome,
    pensionDeduction,
    nhfDeduction,
    rentRelief,
    additionalDeductionsTotal,
    ocrDeductions,
    totalDeductions,
    taxableIncome,
    totalTax,
    netIncome,
    effectiveRate,
    taxBreakdown: breakdown,
  };
}

// Determine company size based on NTA 2025 criteria
export function determineCompanySize(
  turnover: number,
  fixedAssets: number,
  isProfessionalService: boolean
): 'small' | 'big' {
  // Professional services are always treated as big companies (excluded from small company exemption)
  if (isProfessionalService) return 'big';

  // Small company criteria: turnover <= ₦50M AND fixed assets < ₦250M
  if (
    turnover <= COMPANY_TAX_RATES.small.maxTurnover &&
    fixedAssets < COMPANY_TAX_RATES.small.maxFixedAssets
  ) {
    return 'small';
  }

  return 'big';
}

// Main company tax calculation function - NTA 2025 compliant
export function calculateCompanyTax(input: CompanyTaxInput): CompanyTaxResult {
  const {
    annualTurnover,
    fixedAssets,
    assessableProfit,
    isProfessionalService,
    isNonResident,
    capitalAllowances,
    otherDeductions,
  } = input;

  // Calculate deductions
  const otherDeductionsTotal = otherDeductions.reduce(
    (sum, d) => sum + d.amount,
    0
  );
  const totalDeductions = capitalAllowances + otherDeductionsTotal;

  // Taxable profit (cannot be negative)
  const taxableProfit = Math.max(0, assessableProfit - totalDeductions);

  // Determine company size
  const companySize = determineCompanySize(annualTurnover, fixedAssets, isProfessionalService);

  // Calculate tax based on company classification
  let taxRate: number;
  let corporateTax: number;
  let developmentLevy: number = 0;
  const taxBreakdown: { description: string; amount: number }[] = [];

  if (companySize === 'small') {
    // Small companies are exempt from CIT
    taxRate = 0;
    corporateTax = 0;
    taxBreakdown.push({
      description: 'Corporate Income Tax (Small Company Exemption)',
      amount: 0,
    });
  } else {
    // Big companies pay 30% CIT
    taxRate = COMPANY_TAX_RATES.big.rate;
    corporateTax = taxableProfit * taxRate;
    taxBreakdown.push({
      description: `Corporate Income Tax (30% of ₦${formatNumber(taxableProfit)})`,
      amount: corporateTax,
    });

    // Development Levy: 4% on assessable profits
    // Exempt for small companies and non-resident companies
    if (!isNonResident) {
      developmentLevy = assessableProfit * COMPANY_TAX_RATES.big.developmentLevy;
      taxBreakdown.push({
        description: `Development Levy (4% of ₦${formatNumber(assessableProfit)})`,
        amount: developmentLevy,
      });
    } else {
      taxBreakdown.push({
        description: 'Development Levy (Non-resident Exemption)',
        amount: 0,
      });
    }
  }

  // Total tax
  const totalTax = corporateTax + developmentLevy;

  // Net profit after tax
  const netProfit = assessableProfit - totalDeductions - totalTax;

  // Effective tax rate
  const effectiveRate =
    assessableProfit > 0 ? (totalTax / assessableProfit) * 100 : 0;

  return {
    annualTurnover,
    fixedAssets,
    assessableProfit,
    capitalAllowances,
    otherDeductionsTotal,
    totalDeductions,
    taxableProfit,
    companySize,
    isProfessionalService,
    isNonResident,
    taxRate: taxRate * 100,
    corporateTax,
    developmentLevy,
    totalTax,
    netProfit,
    effectiveRate,
    taxBreakdown,
  };
}

// Share Transfer Tax Calculation - NTA 2025
export interface ShareTransferInput {
  disposalProceeds: number;
  costBasis: number;
  reinvestmentAmount?: number;
}

export interface ShareTransferResult {
  capitalGain: number;
  isEligibleForExemption: boolean;
  exemptAmount: number;
  taxableGain: number;
  tax: number;
}

export function calculateShareTransferTax(input: ShareTransferInput): ShareTransferResult {
  const { disposalProceeds, costBasis, reinvestmentAmount = 0 } = input;

  const capitalGain = Math.max(0, disposalProceeds - costBasis);

  // Check eligibility: disposal proceeds must be below threshold
  const isEligibleForExemption = disposalProceeds <= SHARE_TRANSFER_EXEMPTION.threshold;

  // Calculate exempt amount (max ₦10M)
  let exemptAmount = 0;
  if (isEligibleForExemption) {
    exemptAmount = Math.min(capitalGain, SHARE_TRANSFER_EXEMPTION.maxExemptibleGain);

    // Reinvestment exemption (additional exemption if reinvested)
    if (reinvestmentAmount > 0) {
      const reinvestmentExemption = Math.min(reinvestmentAmount, capitalGain - exemptAmount);
      exemptAmount += reinvestmentExemption;
    }
  }

  const taxableGain = capitalGain - exemptAmount;
  const tax = taxableGain * SHARE_TRANSFER_EXEMPTION.cgtRate;

  return {
    capitalGain,
    isEligibleForExemption,
    exemptAmount,
    taxableGain,
    tax,
  };
}

// Compensation for Loss of Office Tax Calculation - NTA 2025
export interface CompensationInput {
  totalCompensation: number;
  yearsOfService?: number;
}

export interface CompensationResult {
  totalCompensation: number;
  exemptPortion: number;
  taxablePortion: number;
  tax: number;
}

export function calculateCompensationTax(input: CompensationInput): CompensationResult {
  const { totalCompensation } = input;

  // NTA 2025: First ₦50M is exempt
  const exemptPortion = Math.min(totalCompensation, COMPENSATION_EXEMPTION.threshold);
  const taxablePortion = Math.max(0, totalCompensation - COMPENSATION_EXEMPTION.threshold);

  // Calculate tax on taxable portion using progressive rates
  const { totalTax } = calculateProgressiveTax(taxablePortion);

  return {
    totalCompensation,
    exemptPortion,
    taxablePortion,
    tax: totalTax,
  };
}

// Utility function to format numbers with commas
export function formatNumber(num: number): string {
  return num.toLocaleString('en-NG');
}

// Format currency with Naira symbol
export function formatCurrency(amount: number): string {
  return `₦${formatNumber(Math.round(amount))}`;
}

// Calculate countdown to lodgement date
export function getCountdown(targetDate: Date = LODGEMENT_DATE): {
  days: number;
  hours: number;
  minutes: number;
  seconds: number;
  isPast: boolean;
} {
  const now = new Date();
  const diff = targetDate.getTime() - now.getTime();

  if (diff <= 0) {
    return { days: 0, hours: 0, minutes: 0, seconds: 0, isPast: true };
  }

  const days = Math.floor(diff / (1000 * 60 * 60 * 24));
  const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
  const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
  const seconds = Math.floor((diff % (1000 * 60)) / 1000);

  return { days, hours, minutes, seconds, isPast: false };
}

// Generate unique ID for deductions
export function generateId(): string {
  return Math.random().toString(36).substr(2, 9);
}

// NTA 2025 FAQ/Knowledge Base for Chat
export const NTA_2025_KNOWLEDGE_BASE = {
  personalTax: {
    bands: [
      { range: 'Up to ₦800,000', rate: '0%' },
      { range: '₦800,001 - ₦3,000,000', rate: '15%' },
      { range: '₦3,000,001 - ₦12,000,000', rate: '18%' },
      { range: '₦12,000,001 - ₦25,000,000', rate: '21%' },
      { range: '₦25,000,001 - ₦50,000,000', rate: '23%' },
      { range: 'Over ₦50,000,000', rate: '25%' },
    ],
    deductions: {
      pension: '8% of annual income',
      nhf: '2.5% of annual income (National Housing Fund)',
      rentRelief: '20% of annual rent, capped at ₦500,000',
    },
    filingDeadline: 'March 31st following the tax year',
  },
  companyTax: {
    smallCompany: {
      definition: 'Annual turnover not exceeding ₦50 million AND fixed assets below ₦250 million',
      rate: '0%',
      exclusions: 'Professional service providers (lawyers, accountants, consultants) are excluded from this exemption',
    },
    bigCompany: {
      rate: '30%',
      developmentLevy: '4% on assessable profits (exempt for small companies and non-residents)',
    },
    filingDeadline: 'Within 6 months of the end of the accounting year (typically June 30)',
  },
  professionalServices: {
    definition: 'Lawyers, accountants, consultants, and other professional service providers',
    taxTreatment: 'Taxed at 30% regardless of turnover or asset size - explicitly excluded from small company exemption',
  },
  developmentLevy: {
    rate: '4%',
    applicability: 'Applied to assessable profits of big companies',
    exemptions: 'Small companies and non-resident companies are exempt',
  },
  shareTransferExemption: {
    threshold: '₦150 million (increased from ₦100 million)',
    maxExemptibleGain: '₦10 million',
    description: 'Capital gains from share disposals below the threshold may be exempt up to ₦10 million',
    reinvestment: 'Additional exemption available for amounts reinvested in qualifying shares',
  },
  compensationExemption: {
    threshold: '₦50 million (increased from ₦10 million)',
    description: 'Compensation for loss of office up to ₦50 million is completely tax-exempt',
    taxableExcess: 'Only amounts exceeding ₦50 million are subject to personal income tax',
  },
};

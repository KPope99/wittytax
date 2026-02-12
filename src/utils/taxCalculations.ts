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
// Small companies: Turnover <= ₦100M AND Fixed Assets < ₦250M = 0% (exempt from CIT and 4% Development Levy)
// Big companies: All others = 30% + 4% Development Levy
// Professional services (lawyers, accountants, consultants): 30% regardless of size
// Large companies (>₦50B turnover or MNEs >€750M): Subject to 15% minimum ETR
export const COMPANY_TAX_RATES = {
  small: {
    maxTurnover: 100000000, // ₦100 million
    maxFixedAssets: 250000000, // ₦250 million
    rate: 0,
  },
  big: {
    rate: 0.30, // 30%
    developmentLevy: 0.04, // 4% Development Levy on assessable profits (based on assessable profit only)
  },
  large: {
    turnoverThreshold: 50000000000, // ₦50 billion
    mneGlobalTurnoverThreshold: 750000000, // €750 million (in EUR)
    minimumETR: 0.15, // 15% Effective Tax Rate (OECD Pillar II)
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
  // Asset disposal gains (NTA 2025)
  assetDisposalProceeds: number;
  assetTaxWrittenDownValue: number;
  // Large company / MNE classification
  isLargeCompany: boolean; // Turnover > ₦50 billion
  isMNE: boolean; // Part of MNE with global turnover > €750 million
  // Sector-specific incentives (NTA 2025 EDI)
  businessSector?: string; // Business sector for incentive eligibility
  isTaxHolidayActive?: boolean; // Whether tax holiday is currently active
  qualifyingCapitalExpenditure?: number; // QCE for EDI credit calculation
}

export interface CompanyTaxResult {
  annualTurnover: number;
  fixedAssets: number;
  assessableProfit: number;
  capitalAllowances: number;
  otherDeductionsTotal: number;
  totalDeductions: number;
  // Asset disposal gains
  assetDisposalGain: number;
  // Taxable profit for CIT
  taxableProfit: number;
  companySize: 'small' | 'big' | 'large';
  isProfessionalService: boolean;
  isNonResident: boolean;
  isLargeCompany: boolean;
  isMNE: boolean;
  taxRate: number;
  corporateTax: number;
  developmentLevy: number;
  // ETR top-up for large companies
  etrTopUp: number;
  // Sector-specific incentives (NTA 2025 EDI)
  taxHolidaySavings: number;
  ediCredit: number;
  totalIncentiveSavings: number;
  totalTax: number;
  netProfit: number;
  effectiveRate: number;
  minimumETRApplied: boolean;
  isTaxHolidayActive: boolean;
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

  // Small company criteria: turnover <= ₦100M AND fixed assets < ₦250M
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
    assetDisposalProceeds = 0,
    assetTaxWrittenDownValue = 0,
    isLargeCompany = false,
    isMNE = false,
    // Sector-specific incentives
    businessSector = 'general',
    isTaxHolidayActive = false,
    qualifyingCapitalExpenditure = 0,
  } = input;

  // Calculate asset disposal gain (NTA 2025: no inflation adjustment)
  // Chargeable gain = Sales proceeds - Tax written down value
  const assetDisposalGain = Math.max(0, assetDisposalProceeds - assetTaxWrittenDownValue);

  // Calculate deductions (allowable expenses)
  const otherDeductionsTotal = otherDeductions.reduce(
    (sum, d) => sum + d.amount,
    0
  );
  const totalDeductions = capitalAllowances + otherDeductionsTotal;

  // Taxable profit for CIT = Assessable Profit - Allowable Deductions + Asset Disposal Gains
  // NTA 2025: CIT (30%) is calculated on taxable profit derived from assessable profit
  // (cannot be negative)
  const taxableProfit = Math.max(0, assessableProfit - totalDeductions + assetDisposalGain);

  // Determine company size
  let companySize: 'small' | 'big' | 'large' = determineCompanySize(annualTurnover, fixedAssets, isProfessionalService);

  // Check if large company (>₦50B turnover or MNE)
  const qualifiesAsLarge = isLargeCompany || isMNE || annualTurnover > COMPANY_TAX_RATES.large.turnoverThreshold;
  if (qualifiesAsLarge && companySize !== 'small') {
    companySize = 'large';
  }

  // Calculate tax based on company classification
  let taxRate: number;
  let corporateTax: number;
  let developmentLevy: number = 0;
  let etrTopUp: number = 0;
  let minimumETRApplied = false;
  const taxBreakdown: { description: string; amount: number }[] = [];

  if (companySize === 'small') {
    // Small companies are exempt from CIT and 4% Development Levy
    taxRate = 0;
    corporateTax = 0;
    taxBreakdown.push({
      description: 'Corporate Income Tax (Small Company Exemption)',
      amount: 0,
    });
    taxBreakdown.push({
      description: 'Development Levy (Small Company Exemption)',
      amount: 0,
    });
  } else {
    // Big/Large companies pay 30% CIT on taxable profit (derived from assessable profit)
    taxRate = COMPANY_TAX_RATES.big.rate;
    corporateTax = taxableProfit * taxRate;
    taxBreakdown.push({
      description: `Corporate Income Tax (30% of ₦${formatNumber(taxableProfit)})`,
      amount: corporateTax,
    });

    // Asset disposal gain breakdown (if applicable)
    if (assetDisposalGain > 0) {
      taxBreakdown.push({
        description: `  └ Includes Asset Disposal Gain: ₦${formatNumber(assetDisposalGain)}`,
        amount: 0, // Already included in CIT
      });
    }

    // Development Levy: 4% on ASSESSABLE PROFIT only (not taxable profit)
    // Exempt for small companies and non-resident companies
    if (!isNonResident) {
      developmentLevy = assessableProfit * COMPANY_TAX_RATES.big.developmentLevy;
      taxBreakdown.push({
        description: `Development Levy (4% of Assessable Profit ₦${formatNumber(assessableProfit)})`,
        amount: developmentLevy,
      });
    } else {
      taxBreakdown.push({
        description: 'Development Levy (Non-resident Exemption)',
        amount: 0,
      });
    }

    // 15% Minimum ETR for large companies (OECD Pillar II compliance)
    if (companySize === 'large' && taxableProfit > 0) {
      const currentTax = corporateTax + developmentLevy;
      const currentETR = currentTax / taxableProfit;
      const minimumETR = COMPANY_TAX_RATES.large.minimumETR;

      if (currentETR < minimumETR) {
        // Top-up tax to reach 15% ETR
        const requiredTax = taxableProfit * minimumETR;
        etrTopUp = requiredTax - currentTax;
        minimumETRApplied = true;
        taxBreakdown.push({
          description: `ETR Top-up Tax (15% Minimum ETR - OECD Pillar II)`,
          amount: etrTopUp,
        });
      }
    }
  }

  // Calculate gross tax before incentives
  const grossTax = corporateTax + developmentLevy + etrTopUp;

  // Sector-specific incentives (NTA 2025 EDI)
  let taxHolidaySavings = 0;
  let ediCredit = 0;

  // Tax Holiday - 100% exemption for qualifying sectors (Agriculture, Mining, Gas, Export)
  // Only applies if tax holiday is active (approved by NIPC)
  const taxHolidaySectors = ['agriculture', 'mining', 'gas_utilization', 'export_oriented'];
  if (isTaxHolidayActive && taxHolidaySectors.includes(businessSector) && companySize !== 'small') {
    taxHolidaySavings = corporateTax + developmentLevy;
    taxBreakdown.push({
      description: `Tax Holiday Exemption (${businessSector.replace('_', ' ').toUpperCase()} sector)`,
      amount: -taxHolidaySavings,
    });
  }

  // EDI Credit - 5% annual credit on Qualifying Capital Expenditure
  // Only for EDI-eligible sectors: agriculture, mining, manufacturing, renewable_energy, healthcare
  const ediEligibleSectors = ['agriculture', 'mining', 'manufacturing', 'renewable_energy', 'healthcare'];
  if (qualifyingCapitalExpenditure > 0 && ediEligibleSectors.includes(businessSector)) {
    ediCredit = qualifyingCapitalExpenditure * 0.05; // 5% annual credit
    // EDI credit cannot exceed remaining tax liability after holiday
    const remainingTax = grossTax - taxHolidaySavings;
    ediCredit = Math.min(ediCredit, remainingTax);
    if (ediCredit > 0) {
      taxBreakdown.push({
        description: `EDI Credit (5% of QCE ₦${formatNumber(qualifyingCapitalExpenditure)})`,
        amount: -ediCredit,
      });
    }
  }

  const totalIncentiveSavings = taxHolidaySavings + ediCredit;

  // Total tax after incentives
  const totalTax = Math.max(0, grossTax - totalIncentiveSavings);

  // Net profit after tax (assessable profit minus total tax)
  const netProfit = assessableProfit - totalTax;

  // Effective tax rate (based on taxable profit derived from assessable profit)
  const effectiveRate =
    taxableProfit > 0 ? (totalTax / taxableProfit) * 100 : 0;

  return {
    annualTurnover,
    fixedAssets,
    assessableProfit,
    capitalAllowances,
    otherDeductionsTotal,
    totalDeductions,
    assetDisposalGain,
    taxableProfit,
    companySize,
    isProfessionalService,
    isNonResident,
    isLargeCompany: qualifiesAsLarge,
    isMNE,
    taxRate: taxRate * 100,
    corporateTax,
    developmentLevy,
    etrTopUp,
    taxHolidaySavings,
    ediCredit,
    totalIncentiveSavings,
    totalTax,
    netProfit,
    effectiveRate,
    minimumETRApplied,
    isTaxHolidayActive,
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
      definition: 'Annual turnover not exceeding ₦100 million AND fixed assets below ₦250 million',
      rate: '0% (exempt from CIT and 4% Development Levy)',
      exclusions: 'Professional service providers (lawyers, accountants, consultants) are excluded from this exemption',
    },
    bigCompany: {
      rate: '30% CIT on taxable profit',
      developmentLevy: '4% on ASSESSABLE PROFIT only (exempt for small companies and non-residents)',
      taxableProfit: 'Taxable Profit = Assessable Profit - Allowable Deductions + Asset Disposal Gains',
    },
    largeCompany: {
      definition: 'Turnover exceeding ₦50 billion OR part of MNE with global turnover >€750 million',
      minimumETR: '15% Effective Tax Rate (OECD Pillar II compliance)',
      description: 'Subject to top-up tax if effective rate falls below 15%',
    },
    assetDisposal: {
      calculation: 'Chargeable Gain = Sales Proceeds - Tax Written Down Value',
      noInflation: 'No adjustment for inflation under NTA 2025',
    },
    filingDeadline: 'Within 6 months of the end of the accounting year (typically June 30)',
  },
  professionalServices: {
    definition: 'Lawyers, accountants, consultants, and other professional service providers',
    taxTreatment: 'Taxed at 30% regardless of turnover or asset size - explicitly excluded from small company exemption',
  },
  developmentLevy: {
    rate: '4%',
    applicability: 'Applied to assessable profits of big companies only',
    exemptions: 'Small companies (turnover ≤ ₦100M, assets < ₦250M) and non-resident companies are exempt',
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

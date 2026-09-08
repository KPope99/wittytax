// Tax Recommendations Engine - NTA 2025
import {
  PersonalTaxResult,
  CompanyTaxResult,
  PENSION_DEDUCTION_RATE,
  NHF_DEDUCTION_RATE,
  MAX_RENT_RELIEF,
  formatCurrency,
} from './taxCalculations';
import { BusinessTypeInfo } from './businessTypes';

export interface TaxRecommendation {
  id: string;
  title: string;
  description: string;
  potentialSavings: number;
  category: 'deduction' | 'exemption' | 'timing' | 'structure';
  priority: 'high' | 'medium' | 'low';
  applicable: boolean;
  actionType?: 'pension' | 'nhf' | 'rent' | 'share_transfer' | 'compensation';
}

export interface RecommendationInput {
  annualIncome: number;
  applyPension: boolean;
  applyNHF: boolean;
  annualRent: number;
  hasShareTransfer?: boolean;
  hasCompensation?: boolean;
  taxResult: PersonalTaxResult | null;
}

// NTA 2025 Exemption Thresholds
export const SHARE_TRANSFER_EXEMPTION = {
  threshold: 150000000, // ₦150M (increased from ₦100M)
  maxExemptibleGain: 10000000, // ₦10M maximum exemptible gain
};

export const COMPENSATION_EXEMPTION = {
  threshold: 50000000, // ₦50M (increased from ₦10M)
};

// Get the marginal tax rate based on taxable income
function getMarginalTaxRate(taxableIncome: number): number {
  if (taxableIncome <= 800000) return 0;
  if (taxableIncome <= 3000000) return 0.15;
  if (taxableIncome <= 12000000) return 0.18;
  if (taxableIncome <= 25000000) return 0.21;
  if (taxableIncome <= 50000000) return 0.23;
  return 0.25;
}

// Calculate potential tax savings from a deduction
function calculatePotentialSavings(deductionAmount: number, taxableIncome: number): number {
  const marginalRate = getMarginalTaxRate(taxableIncome);
  return deductionAmount * marginalRate;
}

// Generate tax recommendations based on user input
export function generateTaxRecommendations(input: RecommendationInput): TaxRecommendation[] {
  const recommendations: TaxRecommendation[] = [];
  const {
    annualIncome,
    applyPension,
    applyNHF,
    annualRent,
    hasShareTransfer = false,
    hasCompensation = false,
    taxResult,
  } = input;

  if (annualIncome <= 0) return recommendations;

  const taxableIncome = taxResult?.taxableIncome || annualIncome;

  // 1. Pension Optimization
  if (!applyPension) {
    const pensionDeduction = annualIncome * PENSION_DEDUCTION_RATE;
    const potentialSavings = calculatePotentialSavings(pensionDeduction, taxableIncome);

    if (potentialSavings > 0) {
      recommendations.push({
        id: 'pension-optimization',
        title: 'Maximize Pension Contribution',
        description: `You can claim 8% pension deduction (${formatCurrency(pensionDeduction)}). This reduces your taxable income and could save you up to ${formatCurrency(potentialSavings)} in taxes.`,
        potentialSavings,
        category: 'deduction',
        priority: 'high',
        applicable: true,
        actionType: 'pension',
      });
    }
  }

  // 2. NHF Contribution
  if (!applyNHF) {
    const nhfDeduction = annualIncome * NHF_DEDUCTION_RATE;
    const potentialSavings = calculatePotentialSavings(nhfDeduction, taxableIncome);

    if (potentialSavings > 0) {
      recommendations.push({
        id: 'nhf-contribution',
        title: 'Claim NHF Deduction',
        description: `The 2.5% NHF contribution (${formatCurrency(nhfDeduction)}) is deductible. This could save you up to ${formatCurrency(potentialSavings)} in taxes.`,
        potentialSavings,
        category: 'deduction',
        priority: 'medium',
        applicable: true,
        actionType: 'nhf',
      });
    }
  }

  // 3. Rent Relief
  if (annualRent <= 0 && annualIncome > 800000) {
    const potentialSavings = calculatePotentialSavings(MAX_RENT_RELIEF, taxableIncome);

    recommendations.push({
      id: 'rent-relief',
      title: 'Claim Rent Relief',
      description: `You may be eligible for rent relief up to ${formatCurrency(MAX_RENT_RELIEF)} (20% of annual rent). If you're renting, enter your annual rent to claim this deduction.`,
      potentialSavings,
      category: 'deduction',
      priority: 'medium',
      applicable: true,
      actionType: 'rent',
    });
  }

  // 4. Share Transfer Exemption (NTA 2025)
  if (!hasShareTransfer && annualIncome > 25000000) {
    recommendations.push({
      id: 'share-transfer-exemption',
      title: 'Share Transfer Exemption Available',
      description: `Under NTA 2025, capital gains up to ${formatCurrency(SHARE_TRANSFER_EXEMPTION.maxExemptibleGain)} from share disposals below ${formatCurrency(SHARE_TRANSFER_EXEMPTION.threshold)} may be exempt. Consider this for investment planning.`,
      potentialSavings: SHARE_TRANSFER_EXEMPTION.maxExemptibleGain * 0.1, // 10% CGT rate estimate
      category: 'exemption',
      priority: 'low',
      applicable: annualIncome > 25000000,
      actionType: 'share_transfer',
    });
  }

  // 5. Compensation Exemption (NTA 2025)
  if (!hasCompensation && annualIncome > 12000000) {
    recommendations.push({
      id: 'compensation-exemption',
      title: 'Compensation Exemption Threshold',
      description: `Under NTA 2025, compensation for loss of office up to ${formatCurrency(COMPENSATION_EXEMPTION.threshold)} is tax-exempt. If you're receiving severance, this could provide significant tax savings.`,
      potentialSavings: COMPENSATION_EXEMPTION.threshold * 0.25, // Estimated top marginal rate
      category: 'exemption',
      priority: 'low',
      applicable: true,
      actionType: 'compensation',
    });
  }

  // 6. Income Splitting for High Earners
  if (annualIncome > 50000000) {
    recommendations.push({
      id: 'income-structuring',
      title: 'Consider Legal Income Structuring',
      description: 'For high income earners, consult a tax professional about legitimate income structuring options like family trusts, investment companies, or pension contributions beyond the minimum.',
      potentialSavings: 0,
      category: 'structure',
      priority: 'medium',
      applicable: true,
    });
  }

  // Sort by priority and potential savings
  const priorityOrder = { high: 0, medium: 1, low: 2 };
  recommendations.sort((a, b) => {
    const priorityDiff = priorityOrder[a.priority] - priorityOrder[b.priority];
    if (priorityDiff !== 0) return priorityDiff;
    return b.potentialSavings - a.potentialSavings;
  });

  return recommendations;
}

export interface CompanyRecommendationInput {
  companyResult: CompanyTaxResult | null;
  selectedBusinessType?: BusinessTypeInfo;
}

// Generate tax recommendations for a company, mirroring the same set of
// rules previously only surfaced inside the PDF report, so logged-in users
// see them on-page too rather than only after downloading.
export function generateCompanyTaxRecommendations(input: CompanyRecommendationInput): TaxRecommendation[] {
  const { companyResult: result, selectedBusinessType } = input;
  if (!result || result.assessableProfit <= 0) return [];

  const recommendations: TaxRecommendation[] = [];
  const sectorName = selectedBusinessType?.name || 'General';

  // 1. Capital Allowances - relevant for big/large companies paying CIT
  if (result.companySize !== 'small') {
    recommendations.push({
      id: 'capital-allowances',
      title: 'Maximize Capital Allowances',
      description: 'Claim up to 50% initial allowance + 25% annual allowance on qualifying assets (machinery, equipment, vehicles). Example: ₦100M in equipment could yield ₦15M in CIT savings (30% of a ₦50M allowance).',
      potentialSavings: 0,
      category: 'deduction',
      priority: 'high',
      applicable: true,
    });
  }

  // 2. Small Company Exemption - suggest if company is big but could qualify, or confirm if already small
  if (result.companySize !== 'small' && !result.isProfessionalService) {
    recommendations.push({
      id: 'small-company-exemption',
      title: 'Consider Small Company Exemption',
      description: 'Maintain turnover ≤ ₦100M and fixed assets < ₦250M to qualify for 0% CIT and exemption from the 4% Development Levy.',
      potentialSavings: 0,
      category: 'exemption',
      priority: 'high',
      applicable: true,
    });
  } else if (result.companySize === 'small') {
    recommendations.push({
      id: 'small-company-status',
      title: 'Maintain Small Company Status',
      description: 'Your company currently qualifies for 0% CIT and is exempt from the 4% Development Levy. Keep turnover ≤ ₦100M and fixed assets < ₦250M to retain this benefit.',
      potentialSavings: 0,
      category: 'exemption',
      priority: 'high',
      applicable: true,
    });
  }

  // 3. EDI - only for EDI-eligible sectors
  if (selectedBusinessType?.ediEligible) {
    const qceThreshold = selectedBusinessType.taxIncentives.find((i) => i.qceThreshold)?.qceThreshold;
    const qceInfo = qceThreshold ? ` (minimum QCE: ₦${(qceThreshold / 1000000).toFixed(0)}M)` : '';
    recommendations.push({
      id: 'edi-credit',
      title: 'Economic Development Incentive (EDI)',
      description: `As a ${sectorName} business, you qualify for a 5% annual tax credit on qualifying capital expenditure for up to 5 years${qceInfo}. Example: ₦500M QCE = ₦25M annual credit (₦125M over 5 years).`,
      potentialSavings: 0,
      category: 'structure',
      priority: 'medium',
      applicable: true,
    });
  }

  // 4. Sector-specific incentives from the selected business type
  if (selectedBusinessType) {
    for (const incentive of selectedBusinessType.taxIncentives) {
      if (
        incentive.name === 'Small Company Exemption' ||
        incentive.name === 'Tech Startup Exemption' ||
        incentive.name === 'Agribusiness Small Company Relief'
      ) continue;
      if (incentive.type === 'credit' && incentive.name.includes('EDI')) continue;

      const savingText = incentive.type === 'holiday'
        ? `Potential: ${incentive.rate || '100% tax exemption'} during the holiday period.`
        : incentive.type === 'deduction'
        ? incentive.rate ? `Deduction rate: ${incentive.rate}.` : 'Reduces taxable profit and CIT liability.'
        : incentive.type === 'credit'
        ? incentive.rate ? `Credit rate: ${incentive.rate}.` : 'Tax credit benefit.'
        : incentive.rate ? `Rate: ${incentive.rate}.` : 'Tax exemption benefit.';

      recommendations.push({
        id: `sector-incentive-${incentive.name.toLowerCase().replace(/\s+/g, '-')}`,
        title: incentive.name,
        description: `${incentive.description}${incentive.duration ? ` (${incentive.duration})` : ''}. ${savingText}`,
        potentialSavings: 0,
        category: incentive.type === 'deduction' ? 'deduction' : incentive.type === 'credit' ? 'structure' : 'exemption',
        priority: 'medium',
        applicable: true,
      });
    }
  }

  // 5. Non-Resident Levy Exemption
  if (result.isNonResident) {
    recommendations.push({
      id: 'non-resident-levy-exemption',
      title: 'Non-Resident Levy Exemption',
      description: `As a non-resident company, you are exempt from the 4% Development Levy — a saving of roughly ${formatCurrency(result.assessableProfit * 0.04)} on your assessable profit.`,
      potentialSavings: result.assessableProfit * 0.04,
      category: 'exemption',
      priority: 'medium',
      applicable: true,
    });
  }

  // 6. Document All Deductions - relevant for big/large companies
  if (result.companySize !== 'small') {
    recommendations.push({
      id: 'document-deductions',
      title: 'Document All Deductions',
      description: 'Maintain receipts for all business expenses: salaries, rent, utilities, marketing, travel, and professional fees. Every ₦1M in documented deductions saves roughly ₦300K in CIT.',
      potentialSavings: 0,
      category: 'deduction',
      priority: 'low',
      applicable: true,
    });
  }

  return recommendations;
}

// Calculate total potential savings from all applicable recommendations
export function calculateTotalPotentialSavings(recommendations: TaxRecommendation[]): number {
  return recommendations
    .filter(r => r.applicable && r.potentialSavings > 0)
    .reduce((sum, r) => sum + r.potentialSavings, 0);
}

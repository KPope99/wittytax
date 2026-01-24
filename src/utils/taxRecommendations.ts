// Tax Recommendations Engine - NTA 2025
import {
  PersonalTaxResult,
  PENSION_DEDUCTION_RATE,
  NHF_DEDUCTION_RATE,
  MAX_RENT_RELIEF,
  formatCurrency,
} from './taxCalculations';

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

// Calculate total potential savings from all applicable recommendations
export function calculateTotalPotentialSavings(recommendations: TaxRecommendation[]): number {
  return recommendations
    .filter(r => r.applicable && r.potentialSavings > 0)
    .reduce((sum, r) => sum + r.potentialSavings, 0);
}

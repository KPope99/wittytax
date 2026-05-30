import {
  calculateProgressiveTax,
  calculateRentRelief,
  calculatePersonalTax,
  determineCompanySize,
  calculateCompanyTax,
  calculateShareTransferTax,
  calculateCompensationTax,
  formatCurrency,
  formatNumber,
  getCountdown,
  PENSION_DEDUCTION_RATE,
  NHF_DEDUCTION_RATE,
  MAX_RENT_RELIEF,
  SHARE_TRANSFER_EXEMPTION,
  COMPENSATION_EXEMPTION,
} from './taxCalculations';

// ─── calculateProgressiveTax ────────────────────────────────────────────────

describe('calculateProgressiveTax', () => {
  it('returns zero tax for zero income', () => {
    const { totalTax } = calculateProgressiveTax(0);
    expect(totalTax).toBe(0);
  });

  it('returns zero tax for income within the tax-free band (₦800,000)', () => {
    const { totalTax } = calculateProgressiveTax(800000);
    expect(totalTax).toBe(0);
  });

  it('applies 15% only on income above ₦800,000 (₦2,000,000 income)', () => {
    // Roughly: ~₦1,200,000 at 15% ≈ ₦180,000
    const { totalTax } = calculateProgressiveTax(2000000);
    expect(totalTax).toBeCloseTo(180000, 0);
  });

  it('applies 18% band for income over ₦3,000,000', () => {
    // 15% band: ~₦2,200,000 → ₦330,000; then 18% on remaining ₦2,000,000 → ₦360,000
    const { totalTax } = calculateProgressiveTax(5000000);
    expect(totalTax).toBeCloseTo(690000, 0);
  });

  it('applies 21% band for income over ₦12,000,000', () => {
    // 15%: ~₦330,000 + 18%: ~₦1,620,000 + 21% on ₦3M → ₦630,000
    const { totalTax } = calculateProgressiveTax(15000000);
    expect(totalTax).toBeCloseTo(2580000, 0);
  });

  it('applies 23% band for income over ₦25,000,000', () => {
    const { totalTax } = calculateProgressiveTax(30000000);
    // 15%: 330k + 18%: 1,620k + 21%: 2,730k + 23% on ₦5M → 1,150k
    expect(totalTax).toBeCloseTo(5830000, 0);
  });

  it('applies 25% band for income over ₦50,000,000', () => {
    const { totalTax } = calculateProgressiveTax(60000000);
    // All lower bands + 25% on ₦10M → 2,500,000
    expect(totalTax).toBeGreaterThan(10000000);
  });

  it('returns a breakdown with correct number of bands used', () => {
    const { breakdown } = calculateProgressiveTax(5000000);
    expect(breakdown.length).toBe(3); // band 1 (0%), band 2 (15%), band 3 (18%)
  });

  it('breakdown entries have positive income and correct rates', () => {
    const { breakdown } = calculateProgressiveTax(2000000);
    breakdown.forEach(entry => {
      expect(entry.income).toBeGreaterThan(0);
      expect(entry.tax).toBeGreaterThanOrEqual(0);
    });
  });
});

// ─── calculateRentRelief ────────────────────────────────────────────────────

describe('calculateRentRelief', () => {
  it('returns 20% of rent when below the cap', () => {
    expect(calculateRentRelief(1000000)).toBe(200000);
    expect(calculateRentRelief(2000000)).toBe(400000);
  });

  it('caps relief at ₦500,000 regardless of rent amount', () => {
    expect(calculateRentRelief(3000000)).toBe(MAX_RENT_RELIEF); // 20% = 600k → capped at 500k
    expect(calculateRentRelief(10000000)).toBe(MAX_RENT_RELIEF);
  });

  it('returns 0 for zero rent', () => {
    expect(calculateRentRelief(0)).toBe(0);
  });

  it('returns exactly ₦500,000 at the ₦2,500,000 rent threshold', () => {
    expect(calculateRentRelief(2500000)).toBe(500000); // 20% = exactly 500k
  });
});

// ─── calculatePersonalTax ───────────────────────────────────────────────────

describe('calculatePersonalTax', () => {
  const baseInput = {
    annualIncome: 5000000,
    applyPension: false,
    applyNHF: false,
    annualRent: 0,
    additionalDeductions: [],
    ocrDeductions: 0,
  };

  it('calculates gross income correctly', () => {
    const result = calculatePersonalTax(baseInput);
    expect(result.grossIncome).toBe(5000000);
  });

  it('produces zero deductions when all deductions are off', () => {
    const result = calculatePersonalTax(baseInput);
    expect(result.totalDeductions).toBe(0);
    expect(result.pensionDeduction).toBe(0);
    expect(result.nhfDeduction).toBe(0);
    expect(result.rentRelief).toBe(0);
  });

  it('applies 8% pension deduction correctly', () => {
    const result = calculatePersonalTax({ ...baseInput, applyPension: true });
    expect(result.pensionDeduction).toBe(5000000 * PENSION_DEDUCTION_RATE);
    expect(result.taxableIncome).toBe(5000000 - 5000000 * PENSION_DEDUCTION_RATE);
  });

  it('applies 2.5% NHF deduction correctly', () => {
    const result = calculatePersonalTax({ ...baseInput, applyNHF: true });
    expect(result.nhfDeduction).toBe(5000000 * NHF_DEDUCTION_RATE);
  });

  it('applies both pension and NHF when both are enabled', () => {
    const result = calculatePersonalTax({ ...baseInput, applyPension: true, applyNHF: true });
    const expected = 5000000 * (PENSION_DEDUCTION_RATE + NHF_DEDUCTION_RATE);
    expect(result.totalDeductions).toBeCloseTo(expected, 2);
  });

  it('applies rent relief (20%, capped at ₦500k)', () => {
    const result = calculatePersonalTax({ ...baseInput, annualRent: 1200000 });
    expect(result.rentRelief).toBe(240000); // 20% of ₦1.2M
  });

  it('caps rent relief at ₦500,000', () => {
    const result = calculatePersonalTax({ ...baseInput, annualRent: 4000000 });
    expect(result.rentRelief).toBe(MAX_RENT_RELIEF);
  });

  it('includes additional deductions in total', () => {
    const deductions = [{ id: '1', description: 'Life insurance', amount: 200000 }];
    const result = calculatePersonalTax({ ...baseInput, additionalDeductions: deductions });
    expect(result.additionalDeductionsTotal).toBe(200000);
    expect(result.totalDeductions).toBe(200000);
  });

  it('includes OCR deductions', () => {
    const result = calculatePersonalTax({ ...baseInput, ocrDeductions: 150000 });
    expect(result.ocrDeductions).toBe(150000);
    expect(result.totalDeductions).toBe(150000);
  });

  it('taxable income cannot go below zero', () => {
    const result = calculatePersonalTax({
      ...baseInput,
      annualIncome: 100000,
      additionalDeductions: [{ id: '1', description: 'test', amount: 500000 }],
    });
    expect(result.taxableIncome).toBe(0);
    expect(result.totalTax).toBe(0);
  });

  it('calculates net income correctly', () => {
    const result = calculatePersonalTax(baseInput);
    expect(result.netIncome).toBeCloseTo(result.grossIncome - result.totalDeductions - result.totalTax, 2);
  });

  it('effective rate is 0 for zero income', () => {
    const result = calculatePersonalTax({ ...baseInput, annualIncome: 0 });
    expect(result.effectiveRate).toBe(0);
  });

  it('effective rate is positive for taxable income', () => {
    const result = calculatePersonalTax({ ...baseInput, annualIncome: 5000000 });
    expect(result.effectiveRate).toBeGreaterThan(0);
    expect(result.effectiveRate).toBeLessThan(25);
  });
});

// ─── determineCompanySize ───────────────────────────────────────────────────

describe('determineCompanySize', () => {
  it('classifies as small when turnover ≤ ₦100M and assets < ₦250M', () => {
    expect(determineCompanySize(50000000, 100000000, false)).toBe('small');
    expect(determineCompanySize(100000000, 249999999, false)).toBe('small');
  });

  it('classifies as big when turnover exceeds ₦100M', () => {
    expect(determineCompanySize(100000001, 100000000, false)).toBe('big');
    expect(determineCompanySize(200000000, 100000000, false)).toBe('big');
  });

  it('classifies as big when fixed assets are ₦250M or more', () => {
    expect(determineCompanySize(50000000, 250000000, false)).toBe('big');
    expect(determineCompanySize(50000000, 500000000, false)).toBe('big');
  });

  it('classifies professional services as big regardless of size', () => {
    expect(determineCompanySize(10000000, 10000000, true)).toBe('big');
    expect(determineCompanySize(100000000, 249999999, true)).toBe('big');
  });
});

// ─── calculateCompanyTax ────────────────────────────────────────────────────

describe('calculateCompanyTax', () => {
  const baseInput = {
    annualTurnover: 50000000,
    fixedAssets: 100000000,
    assessableProfit: 10000000,
    isProfessionalService: false,
    isNonResident: false,
    capitalAllowances: 0,
    otherDeductions: [],
    assetDisposalProceeds: 0,
    assetTaxWrittenDownValue: 0,
    isLargeCompany: false,
    isMNE: false,
  };

  // Small company
  it('small company pays zero CIT and zero development levy', () => {
    const result = calculateCompanyTax(baseInput);
    expect(result.companySize).toBe('small');
    expect(result.corporateTax).toBe(0);
    expect(result.developmentLevy).toBe(0);
    expect(result.totalTax).toBe(0);
  });

  // Big company
  it('big company pays 30% CIT on taxable profit', () => {
    const input = { ...baseInput, annualTurnover: 200000000 };
    const result = calculateCompanyTax(input);
    expect(result.companySize).toBe('big');
    expect(result.corporateTax).toBe(10000000 * 0.30);
  });

  it('big company pays 4% development levy on assessable profit', () => {
    const input = { ...baseInput, annualTurnover: 200000000 };
    const result = calculateCompanyTax(input);
    expect(result.developmentLevy).toBe(10000000 * 0.04);
  });

  it('big company total tax = CIT + development levy', () => {
    const input = { ...baseInput, annualTurnover: 200000000 };
    const result = calculateCompanyTax(input);
    expect(result.totalTax).toBe(result.corporateTax + result.developmentLevy);
  });

  // Professional service
  it('professional service company is always big regardless of size', () => {
    const input = { ...baseInput, isProfessionalService: true };
    const result = calculateCompanyTax(input);
    expect(result.companySize).toBe('big');
    expect(result.corporateTax).toBe(10000000 * 0.30);
  });

  // Non-resident
  it('non-resident company is exempt from development levy', () => {
    const input = { ...baseInput, annualTurnover: 200000000, isNonResident: true };
    const result = calculateCompanyTax(input);
    expect(result.developmentLevy).toBe(0);
    expect(result.totalTax).toBe(result.corporateTax);
  });

  // Capital allowances reduce taxable profit
  it('capital allowances reduce taxable profit', () => {
    const input = { ...baseInput, annualTurnover: 200000000, capitalAllowances: 2000000 };
    const result = calculateCompanyTax(input);
    expect(result.taxableProfit).toBe(8000000);
    expect(result.corporateTax).toBe(8000000 * 0.30);
  });

  // Asset disposal gain increases taxable profit
  it('asset disposal gain is added to taxable profit', () => {
    const input = {
      ...baseInput,
      annualTurnover: 200000000,
      assetDisposalProceeds: 5000000,
      assetTaxWrittenDownValue: 2000000,
    };
    const result = calculateCompanyTax(input);
    expect(result.assetDisposalGain).toBe(3000000);
    expect(result.taxableProfit).toBe(13000000);
  });

  it('asset disposal gain is zero when proceeds are less than written-down value', () => {
    const input = {
      ...baseInput,
      annualTurnover: 200000000,
      assetDisposalProceeds: 1000000,
      assetTaxWrittenDownValue: 3000000,
    };
    const result = calculateCompanyTax(input);
    expect(result.assetDisposalGain).toBe(0);
  });

  // Taxable profit cannot be negative
  it('taxable profit cannot go below zero', () => {
    const input = {
      ...baseInput,
      annualTurnover: 200000000,
      capitalAllowances: 20000000, // exceeds assessable profit
    };
    const result = calculateCompanyTax(input);
    expect(result.taxableProfit).toBe(0);
    expect(result.corporateTax).toBe(0);
  });

  // Large company — 15% minimum ETR
  it('large company is classified correctly when turnover exceeds ₦50B', () => {
    const input = { ...baseInput, annualTurnover: 60000000000 };
    const result = calculateCompanyTax(input);
    expect(result.companySize).toBe('large');
  });

  it('large company without incentives does NOT trigger ETR top-up (30% CIT > 15% floor)', () => {
    const input = { ...baseInput, annualTurnover: 60000000000, assessableProfit: 10000000 };
    const result = calculateCompanyTax(input);
    expect(result.minimumETRApplied).toBe(false);
    expect(result.effectiveRate).toBeGreaterThan(15);
  });

  it('large company with tax holiday triggers ETR top-up to reach 15% of assessable profit', () => {
    // Tax holiday wipes CIT + devLevy → effective rate = 0% → top-up kicks in
    const input = {
      ...baseInput,
      annualTurnover: 60000000000,
      assessableProfit: 10000000,
      businessSector: 'agriculture',
      isTaxHolidayActive: true,
    };
    const result = calculateCompanyTax(input);
    expect(result.minimumETRApplied).toBe(true);
    expect(result.etrTopUp).toBeCloseTo(10000000 * 0.15, 0);
    expect(result.effectiveRate).toBeCloseTo(15, 0);
  });

  it('large company with partial EDI credit triggers top-up only if net ETR falls below 15%', () => {
    // Large turnover, heavy capital allowances → taxable profit reduced,
    // EDI credit reduces tax further → net ETR could fall below 15%
    const input = {
      ...baseInput,
      annualTurnover: 60000000000,
      assessableProfit: 10000000,
      capitalAllowances: 8000000, // taxableProfit = ₦2M
      businessSector: 'manufacturing',
      qualifyingCapitalExpenditure: 200000000, // large EDI credit
    };
    const result = calculateCompanyTax(input);
    // Net tax after EDI could be below 15% of assessableProfit → top-up should apply
    expect(result.totalTax).toBeGreaterThanOrEqual(10000000 * 0.15);
  });

  // Tax holiday
  it('tax holiday exempts CIT and development levy for qualifying sectors', () => {
    const input = {
      ...baseInput,
      annualTurnover: 200000000,
      businessSector: 'agriculture',
      isTaxHolidayActive: true,
    };
    const result = calculateCompanyTax(input);
    expect(result.taxHolidaySavings).toBeGreaterThan(0);
    expect(result.totalTax).toBe(0);
  });

  it('tax holiday does NOT apply for ineligible sectors', () => {
    const input = {
      ...baseInput,
      annualTurnover: 200000000,
      businessSector: 'retail',
      isTaxHolidayActive: true,
    };
    const result = calculateCompanyTax(input);
    expect(result.taxHolidaySavings).toBe(0);
  });

  // EDI credit
  it('EDI credit reduces tax for eligible sectors', () => {
    const input = {
      ...baseInput,
      annualTurnover: 200000000,
      businessSector: 'manufacturing',
      qualifyingCapitalExpenditure: 10000000,
    };
    const result = calculateCompanyTax(input);
    expect(result.ediCredit).toBe(500000); // 5% of ₦10M
    expect(result.totalTax).toBe(result.corporateTax + result.developmentLevy - 500000);
  });

  it('EDI credit cannot exceed remaining tax liability', () => {
    const input = {
      ...baseInput,
      annualTurnover: 200000000,
      assessableProfit: 1000000, // small profit → small tax
      businessSector: 'manufacturing',
      qualifyingCapitalExpenditure: 500000000, // huge QCE → huge credit
    };
    const result = calculateCompanyTax(input);
    expect(result.ediCredit).toBeLessThanOrEqual(result.corporateTax + result.developmentLevy);
    expect(result.totalTax).toBeGreaterThanOrEqual(0);
  });
});

// ─── calculateShareTransferTax ──────────────────────────────────────────────

describe('calculateShareTransferTax', () => {
  it('is eligible for exemption when proceeds are below ₦150M threshold', () => {
    const result = calculateShareTransferTax({ disposalProceeds: 100000000, costBasis: 50000000 });
    expect(result.isEligibleForExemption).toBe(true);
  });

  it('is NOT eligible when proceeds exceed ₦150M', () => {
    const result = calculateShareTransferTax({ disposalProceeds: 200000000, costBasis: 50000000 });
    expect(result.isEligibleForExemption).toBe(false);
    expect(result.exemptAmount).toBe(0);
  });

  it('capital gain = proceeds minus cost basis', () => {
    const result = calculateShareTransferTax({ disposalProceeds: 50000000, costBasis: 30000000 });
    expect(result.capitalGain).toBe(20000000);
  });

  it('gain up to ₦10M is fully exempt for eligible disposal', () => {
    const result = calculateShareTransferTax({ disposalProceeds: 50000000, costBasis: 45000000 });
    expect(result.capitalGain).toBe(5000000);
    expect(result.exemptAmount).toBe(5000000);
    expect(result.taxableGain).toBe(0);
    expect(result.tax).toBe(0);
  });

  it('caps exemption at ₦10M — excess gain taxed at 10% CGT', () => {
    const result = calculateShareTransferTax({ disposalProceeds: 50000000, costBasis: 20000000 });
    expect(result.capitalGain).toBe(30000000);
    expect(result.exemptAmount).toBe(SHARE_TRANSFER_EXEMPTION.maxExemptibleGain); // ₦10M cap
    expect(result.taxableGain).toBe(20000000);
    expect(result.tax).toBe(20000000 * 0.10);
  });

  it('zero capital gain results in zero tax', () => {
    const result = calculateShareTransferTax({ disposalProceeds: 10000000, costBasis: 15000000 });
    expect(result.capitalGain).toBe(0);
    expect(result.tax).toBe(0);
  });

  it('reinvestment provides additional exemption', () => {
    const withoutReinvestment = calculateShareTransferTax({
      disposalProceeds: 50000000,
      costBasis: 20000000,
    });
    const withReinvestment = calculateShareTransferTax({
      disposalProceeds: 50000000,
      costBasis: 20000000,
      reinvestmentAmount: 5000000,
    });
    expect(withReinvestment.exemptAmount).toBeGreaterThan(withoutReinvestment.exemptAmount);
    expect(withReinvestment.tax).toBeLessThan(withoutReinvestment.tax);
  });
});

// ─── calculateCompensationTax ───────────────────────────────────────────────

describe('calculateCompensationTax', () => {
  it('compensation below ₦50M is fully exempt with zero tax', () => {
    const result = calculateCompensationTax({ totalCompensation: 30000000 });
    expect(result.exemptPortion).toBe(30000000);
    expect(result.taxablePortion).toBe(0);
    expect(result.tax).toBe(0);
  });

  it('compensation exactly at ₦50M is fully exempt', () => {
    const result = calculateCompensationTax({ totalCompensation: COMPENSATION_EXEMPTION.threshold });
    expect(result.taxablePortion).toBe(0);
    expect(result.tax).toBe(0);
  });

  it('only the amount above ₦50M is taxable', () => {
    const result = calculateCompensationTax({ totalCompensation: 60000000 });
    expect(result.exemptPortion).toBe(COMPENSATION_EXEMPTION.threshold);
    expect(result.taxablePortion).toBe(10000000);
    expect(result.tax).toBeGreaterThan(0);
  });

  it('taxable portion uses progressive personal income tax rates', () => {
    // ₦10M taxable portion spans 0% (₦800k) + 15% (₦2.2M) + 18% (remainder)
    // Band 1: 800,001 at 0% = 0; Band 2: 2,200,000 at 15% = 330,000; Band 3: ~6,999,999 at 18% ≈ 1,259,999
    const result = calculateCompensationTax({ totalCompensation: 60000000 });
    expect(result.tax).toBeCloseTo(1590000, 0);
  });
});

// ─── formatCurrency / formatNumber ──────────────────────────────────────────

describe('formatCurrency', () => {
  it('prefixes with ₦ symbol', () => {
    expect(formatCurrency(1000)).toContain('₦');
  });

  it('formats zero as ₦0', () => {
    expect(formatCurrency(0)).toBe('₦0');
  });

  it('rounds to nearest naira', () => {
    expect(formatCurrency(1000.6)).toBe('₦1,001');
    expect(formatCurrency(1000.4)).toBe('₦1,000');
  });
});

describe('formatNumber', () => {
  it('formats large numbers with commas', () => {
    expect(formatNumber(1000000)).toContain(',');
  });

  it('formats zero correctly', () => {
    expect(formatNumber(0)).toBe('0');
  });
});

// ─── getCountdown ────────────────────────────────────────────────────────────

describe('getCountdown', () => {
  it('returns isPast=true for a date in the past', () => {
    const past = new Date(Date.now() - 1000 * 60 * 60 * 24);
    const result = getCountdown(past);
    expect(result.isPast).toBe(true);
    expect(result.days).toBe(0);
  });

  it('returns isPast=false and positive days for a future date', () => {
    const future = new Date(Date.now() + 1000 * 60 * 60 * 24 * 10); // 10 days ahead
    const result = getCountdown(future);
    expect(result.isPast).toBe(false);
    expect(result.days).toBeGreaterThan(0);
  });

  it('all time components are non-negative integers', () => {
    const future = new Date(Date.now() + 1000 * 60 * 60 * 24 * 30);
    const { days, hours, minutes, seconds } = getCountdown(future);
    expect(days).toBeGreaterThanOrEqual(0);
    expect(hours).toBeGreaterThanOrEqual(0);
    expect(minutes).toBeGreaterThanOrEqual(0);
    expect(seconds).toBeGreaterThanOrEqual(0);
  });
});

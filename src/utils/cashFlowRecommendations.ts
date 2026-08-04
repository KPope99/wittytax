export type RecommendationSeverity = 'critical' | 'warning' | 'opportunity' | 'insight';
export type RecommendationArea = 'revenue' | 'expenses' | 'cashflow' | 'tax' | 'funding';

export interface CashFlowRecommendation {
  id: string;
  title: string;
  description: string;
  action: string;
  severity: RecommendationSeverity;
  area: RecommendationArea;
  impact: string;
}

// One data point per saved Company Tax calculation — Revenue/Expenses are
// derived (Turnover + Digital Asset Profit; Turnover - Assessable Profit),
// ordered oldest to newest, standing in for what used to be "months" when
// this analysis ran off dated Financials ledger entries.
export interface TaxPeriodPoint {
  date: Date;
  totalRevenue: number;
  totalExpenses: number;
}

export interface CashFlowAnalysis {
  totalRevenue: number;
  totalExpenses: number;
  netProfit: number;
  profitMargin: number | null;
  expenseRatio: number | null;
  trend: 'improving' | 'declining' | 'stable' | 'insufficient_data';
  revenueTrend: 'up' | 'down' | 'flat' | 'insufficient_data';
  expenseTrend: 'up' | 'down' | 'flat' | 'insufficient_data';
  recommendations: CashFlowRecommendation[];
  riskLevel: 'low' | 'medium' | 'high' | 'critical';
}

function calcLinearTrend(values: number[]): 'up' | 'down' | 'flat' | 'insufficient_data' {
  const nonZero = values.filter(v => v > 0);
  if (nonZero.length < 2) return 'insufficient_data';
  const n = values.length;
  const sumX = (n * (n - 1)) / 2;
  const sumX2 = ((n - 1) * n * (2 * n - 1)) / 6;
  const sumY = values.reduce((a, b) => a + b, 0);
  const sumXY = values.reduce((acc, v, i) => acc + i * v, 0);
  const slope = (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX);
  const avgRevenue = sumY / n;
  if (avgRevenue === 0) return 'flat';
  const slopeRatio = slope / (avgRevenue || 1);
  if (slopeRatio > 0.05) return 'up';
  if (slopeRatio < -0.05) return 'down';
  return 'flat';
}

export function analyzeCashFlow(periods: TaxPeriodPoint[]): CashFlowAnalysis {
  const sorted = [...periods].sort((a, b) => a.date.getTime() - b.date.getTime());
  const latest = sorted[sorted.length - 1];

  const totalRevenue = latest?.totalRevenue ?? 0;
  const totalExpenses = latest?.totalExpenses ?? 0;
  const netProfit = totalRevenue - totalExpenses;
  const profitMargin = totalRevenue > 0 ? (netProfit / totalRevenue) * 100 : null;
  const expenseRatio = totalRevenue > 0 ? (totalExpenses / totalRevenue) * 100 : null;

  const revenueTrend = calcLinearTrend(sorted.map(p => p.totalRevenue));
  const expenseTrend = calcLinearTrend(sorted.map(p => p.totalExpenses));
  const profitTrend = calcLinearTrend(sorted.map(p => p.totalRevenue - p.totalExpenses));
  const trend: CashFlowAnalysis['trend'] =
    profitTrend === 'up' ? 'improving' :
    profitTrend === 'down' ? 'declining' :
    profitTrend === 'flat' ? 'stable' : 'insufficient_data';

  const recommendations = generateRecommendations({
    totalRevenue,
    totalExpenses,
    netProfit,
    profitMargin,
    expenseRatio,
    revenueTrend,
    expenseTrend,
    trend,
    recentPeriods: sorted.slice(-3),
  });

  let riskLevel: CashFlowAnalysis['riskLevel'] = 'low';
  if (profitMargin === null || totalRevenue === 0) riskLevel = 'critical';
  else if (profitMargin < 0) riskLevel = 'critical';
  else if (profitMargin < 10) riskLevel = 'high';
  else if (profitMargin < 20) riskLevel = 'medium';

  return {
    totalRevenue,
    totalExpenses,
    netProfit,
    profitMargin,
    expenseRatio,
    trend,
    revenueTrend,
    expenseTrend,
    recommendations,
    riskLevel,
  };
}

interface RecommendationInput {
  totalRevenue: number;
  totalExpenses: number;
  netProfit: number;
  profitMargin: number | null;
  expenseRatio: number | null;
  revenueTrend: string;
  expenseTrend: string;
  trend: string;
  recentPeriods: TaxPeriodPoint[];
}

function fmt(n: number): string {
  if (n >= 1_000_000_000) return `₦${(n / 1_000_000_000).toFixed(1)}B`;
  if (n >= 1_000_000) return `₦${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `₦${(n / 1_000).toFixed(0)}K`;
  return `₦${n.toFixed(0)}`;
}

function generateRecommendations(input: RecommendationInput): CashFlowRecommendation[] {
  const recs: CashFlowRecommendation[] = [];
  const {
    totalRevenue, totalExpenses, netProfit, profitMargin, expenseRatio,
    revenueTrend, expenseTrend, trend, recentPeriods,
  } = input;

  const hasRevenue = totalRevenue > 0;
  const hasExpenses = totalExpenses > 0;

  // ── 1. NET LOSS / CRITICAL PROFITABILITY ────────────────────────────────
  if (hasRevenue && netProfit < 0) {
    const gap = Math.abs(netProfit);
    recs.push({
      id: 'net-loss',
      title: 'Business is Operating at a Net Loss',
      description: `Expenses exceed revenue by ${fmt(gap)} (${Math.abs(profitMargin!).toFixed(1)}% loss margin). Without corrective action this will deplete working capital and limit tax options.`,
      action: 'Prioritise cutting non-essential spending immediately. Review your largest cost drivers and set reduction targets of at least 15–20%. Simultaneously, review pricing to pass inflationary cost increases to customers.',
      severity: 'critical',
      area: 'cashflow',
      impact: `Eliminating the ${fmt(gap)} loss gap moves the business to break-even`,
    });
  }

  // ── 2. ZERO REVENUE ─────────────────────────────────────────────────────
  if (!hasRevenue && hasExpenses) {
    recs.push({
      id: 'no-revenue',
      title: 'No Revenue Recorded — Track All Income Sources',
      description: `${fmt(totalExpenses)} in implied costs are on record but no turnover has been calculated yet. Run a Company Tax calculation with your actual turnover to get an accurate picture.`,
      action: 'Use the Wizard or Detailed Calculator to enter your Annual Turnover. Accurate records are required for NTA 2025 compliance and for accessing BOI or SMEDAN financing.',
      severity: 'critical',
      area: 'revenue',
      impact: 'Enables accurate profit/loss assessment and tax filing',
    });
  }

  // ── 3. LOW PROFIT MARGIN ────────────────────────────────────────────────
  if (profitMargin !== null && profitMargin >= 0 && profitMargin < 10) {
    recs.push({
      id: 'low-margin',
      title: `Profit Margin is Very Thin (${profitMargin.toFixed(1)}%)`,
      description: `A margin below 10% leaves little buffer for market shocks, forex volatility, or CBN interest rate adjustments common in the Nigerian operating environment.`,
      action: 'Target a minimum 15–20% profit margin. Tactics: (1) raise prices by 5–10% for high-demand services, (2) renegotiate supplier terms for 30–60 day credit, (3) cut your lowest-ROI cost lines first.',
      severity: 'warning',
      area: 'cashflow',
      impact: `Each 5% margin improvement on ${fmt(totalRevenue)} revenue = ${fmt(totalRevenue * 0.05)} additional retained earnings`,
    });
  }

  // ── 4. HIGH EXPENSE RATIO ───────────────────────────────────────────────
  if (expenseRatio !== null && expenseRatio > 85) {
    recs.push({
      id: 'high-expense-ratio',
      title: `${expenseRatio.toFixed(0)}% of Revenue is Consumed by Expenses`,
      description: `Only ${(100 - expenseRatio).toFixed(0)}% of every naira earned is retained. Industry best practice for SMBs is keeping the expense ratio below 75%.`,
      action: 'Conduct a line-by-line expense audit of your largest cost categories. Challenge every vendor contract and eliminate any subscription or service unused for 60+ days.',
      severity: 'warning',
      area: 'expenses',
      impact: 'Reducing expense ratio by 10 percentage points adds significant cash to operations',
    });
  }

  // ── 5. DECLINING REVENUE TREND ─────────────────────────────────────────
  if (revenueTrend === 'down') {
    recs.push({
      id: 'declining-revenue',
      title: 'Revenue Is on a Declining Trend',
      description: 'Your saved tax calculations show turnover falling over time. Continued decline will erode profit margins and threaten operational sustainability.',
      action: '(1) Survey top clients to identify reasons for reduced spend. (2) Introduce a customer retention programme — loyalty discounts or extended payment terms. (3) Accelerate invoice collection — implement a 14-day payment policy and offer a 2% early-payment discount. (4) Launch a new product or service line to attract new revenue.',
      severity: 'critical',
      area: 'revenue',
      impact: 'Reversing a declining revenue trend prevents compounding losses',
    });
  }

  // ── 6. RISING EXPENSES WITH FLAT/DECLINING REVENUE ──────────────────────
  if (expenseTrend === 'up' && revenueTrend !== 'up') {
    recs.push({
      id: 'cost-creep',
      title: 'Costs Are Rising While Revenue Is Not',
      description: 'Expense growth is outpacing revenue growth across your recent tax calculations. This "cost creep" — common in inflationary environments — silently destroys profit margins.',
      action: 'Implement a period-over-period budget vs actual review. Set a cost freeze on discretionary spend until revenue recovers. Re-tender supplier contracts — use the opportunity of Nigeria\'s competitive market to secure better pricing.',
      severity: 'warning',
      area: 'cashflow',
      impact: 'Containing cost creep early prevents a future loss position',
    });
  }

  // ── 7. NTA 2025 SMALL COMPANY EXEMPTION ─────────────────────────────────
  if (hasRevenue && totalRevenue > 0 && totalRevenue <= 100_000_000) {
    recs.push({
      id: 'small-company-tax',
      title: 'You May Qualify for the NTA 2025 Small Company Exemption',
      description: `Your turnover of ${fmt(totalRevenue)} may be below the ₦100M threshold for small company CIT exemption under NTA 2025, provided fixed assets are under ₦250M.`,
      action: 'Confirm your fixed asset value with your accountant. If you qualify, you pay 0% Company Income Tax and are exempt from the 4% Development Levy — a significant cash saving. File a CIT return (even if nil) by June 30, 2026 to remain compliant.',
      severity: 'opportunity',
      area: 'tax',
      impact: `Saving 30% CIT + 4% levy on ${fmt(Math.max(0, netProfit))} taxable profit`,
    });
  }

  // ── 8. IMPROVING TREND — REINVESTMENT SIGNAL ────────────────────────────
  if (trend === 'improving' && (profitMargin ?? 0) > 20) {
    recs.push({
      id: 'reinvest-profits',
      title: 'Strong Performance — Time to Strategically Reinvest',
      description: `Profit margin is above 20% and trending upward across your recent calculations. This is the optimal time to deploy retained earnings rather than hold idle cash that loses value to inflation.`,
      action: 'Consider: (1) capital equipment investment (depreciation is tax-deductible), (2) pre-paying annual contracts to lock in current rates, (3) expanding into an adjacent market while cash flow is strong, (4) building a 3-month operating expense reserve fund.',
      severity: 'opportunity',
      area: 'cashflow',
      impact: 'Strategic reinvestment compounds growth and reduces future tax liability through allowable deductions',
    });
  }

  // ── 9. RECURRING LOSSES ACROSS RECENT CALCULATIONS ──────────────────────
  const hasNegativeRecentPeriods = recentPeriods.filter(p => p.totalRevenue - p.totalExpenses < 0).length >= 2;
  if (hasRevenue && hasNegativeRecentPeriods && netProfit > -totalRevenue * 0.5) {
    recs.push({
      id: 'invoice-financing',
      title: 'Consider Invoice Financing to Bridge Cash Flow Gaps',
      description: 'Two or more of your recent tax calculations show a loss despite recorded turnover. This often indicates delayed client payments creating a cash flow gap.',
      action: 'Explore invoice discounting/factoring available through Nigerian banks (Access Bank, GTB, Stanbic IBTC) or fintech lenders (Brass, Prospa, Evolve Credit). Also enforce 30-day payment terms on all new contracts and add a late-payment penalty clause of 2% per month.',
      severity: 'warning',
      area: 'funding',
      impact: 'Faster cash collection can eliminate operating deficits without new borrowing',
    });
  }

  // Sort: critical → warning → opportunity → insight
  const order: Record<RecommendationSeverity, number> = { critical: 0, warning: 1, opportunity: 2, insight: 3 };
  recs.sort((a, b) => order[a.severity] - order[b.severity]);

  return recs;
}

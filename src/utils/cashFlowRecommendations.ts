import { Revenue, Expense } from '../context/AuthContext';

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

export interface CashFlowAnalysis {
  totalRevenue: number;
  totalExpenses: number;
  netProfit: number;
  profitMargin: number | null;
  expenseRatio: number | null;
  trend: 'improving' | 'declining' | 'stable' | 'insufficient_data';
  revenueTrend: 'up' | 'down' | 'flat' | 'insufficient_data';
  expenseTrend: 'up' | 'down' | 'flat' | 'insufficient_data';
  topExpenseCategory: string | null;
  topRevenueCategory: string | null;
  revenueDiversityScore: number; // 0-100
  revenueCategories: Record<string, number>;
  expenseCategories: Record<string, number>;
  monthlyData: MonthlyData[];
  recommendations: CashFlowRecommendation[];
  riskLevel: 'low' | 'medium' | 'high' | 'critical';
}

interface MonthlyData {
  label: string;
  year: number;
  month: number;
  revenue: number;
  expenses: number;
  profit: number;
}

function groupByCategory(items: { category: string; amount: number }[]): Record<string, number> {
  return items.reduce((acc, item) => {
    acc[item.category] = (acc[item.category] || 0) + item.amount;
    return acc;
  }, {} as Record<string, number>);
}

function getLast6Months(): { label: string; year: number; month: number }[] {
  const now = new Date();
  return Array.from({ length: 6 }, (_, i) => {
    const d = new Date(now.getFullYear(), now.getMonth() - (5 - i), 1);
    return {
      label: d.toLocaleDateString('en-NG', { month: 'short', year: '2-digit' }),
      year: d.getFullYear(),
      month: d.getMonth(),
    };
  });
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

// Herfindahl-Hirschman style concentration → diversity score 0-100
function calcDiversityScore(categoryTotals: Record<string, number>): number {
  const total = Object.values(categoryTotals).reduce((a, b) => a + b, 0);
  if (total === 0) return 0;
  const hhi = Object.values(categoryTotals).reduce((acc, v) => acc + (v / total) ** 2, 0);
  return Math.round((1 - hhi) * 100);
}

export function analyzeCashFlow(revenues: Revenue[], expenses: Expense[]): CashFlowAnalysis {
  const totalRevenue = revenues.reduce((s, r) => s + r.amount, 0);
  const totalExpenses = expenses.reduce((s, e) => s + e.amount, 0);
  const netProfit = totalRevenue - totalExpenses;
  const profitMargin = totalRevenue > 0 ? (netProfit / totalRevenue) * 100 : null;
  const expenseRatio = totalRevenue > 0 ? (totalExpenses / totalRevenue) * 100 : null;

  const revenueCategories = groupByCategory(revenues);
  const expenseCategories = groupByCategory(expenses);

  const topExpenseCategory = Object.entries(expenseCategories).sort(([, a], [, b]) => b - a)[0]?.[0] ?? null;
  const topRevenueCategory = Object.entries(revenueCategories).sort(([, a], [, b]) => b - a)[0]?.[0] ?? null;

  const months = getLast6Months();
  const monthlyData: MonthlyData[] = months.map(m => {
    const rev = revenues.filter(r => {
      const d = new Date(r.date);
      return d.getFullYear() === m.year && d.getMonth() === m.month;
    }).reduce((s, r) => s + r.amount, 0);
    const exp = expenses.filter(e => {
      const d = new Date(e.date);
      return d.getFullYear() === m.year && d.getMonth() === m.month;
    }).reduce((s, e) => s + e.amount, 0);
    return { ...m, revenue: rev, expenses: exp, profit: rev - exp };
  });

  const revenueTrend = calcLinearTrend(monthlyData.map(m => m.revenue));
  const expenseTrend = calcLinearTrend(monthlyData.map(m => m.expenses));
  const profitTrend = calcLinearTrend(monthlyData.map(m => m.profit));
  const trend: CashFlowAnalysis['trend'] =
    profitTrend === 'up' ? 'improving' :
    profitTrend === 'down' ? 'declining' :
    profitTrend === 'flat' ? 'stable' : 'insufficient_data';

  const revenueDiversityScore = calcDiversityScore(revenueCategories);

  const recommendations = generateRecommendations({
    totalRevenue,
    totalExpenses,
    netProfit,
    profitMargin,
    expenseRatio,
    revenueCategories,
    expenseCategories,
    topExpenseCategory,
    topRevenueCategory,
    revenueTrend,
    expenseTrend,
    trend,
    revenueDiversityScore,
    monthlyData,
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
    topExpenseCategory,
    topRevenueCategory,
    revenueDiversityScore,
    revenueCategories,
    expenseCategories,
    monthlyData,
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
  revenueCategories: Record<string, number>;
  expenseCategories: Record<string, number>;
  topExpenseCategory: string | null;
  topRevenueCategory: string | null;
  revenueTrend: string;
  expenseTrend: string;
  trend: string;
  revenueDiversityScore: number;
  monthlyData: MonthlyData[];
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
    revenueCategories, expenseCategories, topExpenseCategory,
    revenueTrend, expenseTrend, trend, revenueDiversityScore, monthlyData,
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
      action: 'Prioritise cutting non-essential spending immediately. Identify the top two expense categories and set reduction targets of at least 15–20%. Simultaneously, review pricing to pass inflationary cost increases to customers.',
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
      description: `${fmt(totalExpenses)} in expenses are logged but no revenue entries exist. Either income is not being captured or the business is pre-revenue.`,
      action: 'Start recording every revenue stream — client invoices, bank credits, cash receipts. Accurate records are required for NTA 2025 compliance and for accessing BOI or SMEDAN financing.',
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
      action: 'Target a minimum 15–20% profit margin. Tactics: (1) raise prices by 5–10% for high-demand services, (2) renegotiate supplier terms for 30–60 day credit, (3) cut the lowest-ROI expense category first.',
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
      action: `Conduct a line-by-line expense audit. The highest category — ${topExpenseCategory ?? 'your top expense'} — should be your first target. Challenge every vendor contract and eliminate any subscription or service unused for 60+ days.`,
      severity: 'warning',
      area: 'expenses',
      impact: 'Reducing expense ratio by 10 percentage points adds significant cash to operations',
    });
  }

  // ── 5. SALARIES & WAGES ─────────────────────────────────────────────────
  const salaries = expenseCategories['Salaries & Wages'] ?? 0;
  if (hasRevenue && salaries > 0) {
    const salaryRatio = salaries / totalRevenue;
    if (salaryRatio > 0.45) {
      recs.push({
        id: 'high-salaries',
        title: `Payroll Consumes ${(salaryRatio * 100).toFixed(0)}% of Revenue`,
        description: `Salaries & Wages (${fmt(salaries)}) are very high relative to revenue. For service businesses the ideal range is 30–40%; for product businesses it should be under 25%.`,
        action: 'Options: (1) Performance-based pay tied to revenue targets, (2) outsource non-core functions to freelancers or PEO providers, (3) cross-train staff to reduce headcount needs, (4) leverage the SMEDAN workforce development grant to fund staff upskilling and reduce future hiring costs.',
        severity: 'warning',
        area: 'expenses',
        impact: `Reducing payroll ratio by 10pp saves ${fmt(totalRevenue * 0.1)} annually`,
      });
    } else if (salaryRatio > 0.3 && salaryRatio <= 0.45) {
      recs.push({
        id: 'moderate-salaries',
        title: 'Payroll Cost Is Within Range but Worth Monitoring',
        description: `Payroll is ${(salaryRatio * 100).toFixed(0)}% of revenue. This is acceptable but rising — track this monthly so it does not exceed 40%.`,
        action: 'Introduce productivity metrics per employee. Consider variable pay components (commissions, bonuses) to align compensation with performance.',
        severity: 'insight',
        area: 'expenses',
        impact: 'Proactive monitoring prevents payroll from becoming a cash flow crisis',
      });
    }
  }

  // ── 6. RENT & UTILITIES ─────────────────────────────────────────────────
  const rent = expenseCategories['Rent & Utilities'] ?? 0;
  if (hasRevenue && rent > 0) {
    const rentRatio = rent / totalRevenue;
    if (rentRatio > 0.2) {
      recs.push({
        id: 'high-rent',
        title: `Rent & Utilities Is ${(rentRatio * 100).toFixed(0)}% of Revenue`,
        description: `At ${fmt(rent)}, occupancy costs are exceeding the recommended 10–15% of revenue. High rent is a fixed cost that squeezes cash flow when revenue dips.`,
        action: 'Explore: (1) sublease unused office space to a co-tenant, (2) negotiate a rent-free period or step-up lease with the landlord, (3) adopt a hybrid/remote work model to downsize, (4) move non-customer-facing operations to lower-cost locations outside Lagos/Abuja CBDs.',
        severity: 'warning',
        area: 'expenses',
        impact: `Cutting rent cost by 20% frees up ${fmt(rent * 0.2)} per period`,
      });
    }
  }

  // ── 7. MARKETING WITHOUT REVENUE GROWTH ────────────────────────────────
  const marketing = expenseCategories['Marketing & Advertising'] ?? 0;
  if (hasRevenue && marketing > 0 && revenueTrend !== 'up') {
    const mktgRatio = marketing / totalRevenue;
    if (mktgRatio > 0.1) {
      recs.push({
        id: 'marketing-roi',
        title: 'Marketing Spend Is High but Revenue Is Not Growing',
        description: `Marketing & Advertising (${fmt(marketing)}, ${(mktgRatio * 100).toFixed(0)}% of revenue) is significant, yet revenue is ${revenueTrend === 'down' ? 'declining' : 'flat'}. Spend may not be converting.`,
        action: 'Audit each channel: track cost-per-lead and cost-per-sale. Shift budget toward highest-converting channels (often referrals and WhatsApp Business in Nigeria). Set a revenue-per-marketing-naira target of at least ₦5 return per ₦1 spent.',
        severity: 'warning',
        area: 'expenses',
        impact: 'Reallocation of ineffective spend directly improves profit margin',
      });
    }
  }

  // ── 8. PROFESSIONAL FEES ────────────────────────────────────────────────
  const profFees = expenseCategories['Professional Fees'] ?? 0;
  if (hasRevenue && profFees > 0) {
    const feeRatio = profFees / totalRevenue;
    if (feeRatio > 0.08) {
      recs.push({
        id: 'professional-fees',
        title: `Professional Fees Are ${(feeRatio * 100).toFixed(0)}% of Revenue`,
        description: `${fmt(profFees)} in professional fees (legal, accounting, consulting) is above the recommended 5% ceiling for SMBs.`,
        action: 'Review recurring retainers — switch to project-based billing where possible. For accounting, consider cloud-based tools (WittyTax, Sage, QuickBooks) that reduce manual accountant hours. Ensure Withholding Tax (WHT) at 10% is being deducted on these payments to stay NRS-compliant.',
        severity: 'insight',
        area: 'expenses',
        impact: `A 30% reduction in professional fees saves ${fmt(profFees * 0.3)} per period`,
      });
    }
  }

  // ── 9. TRAVEL & TRANSPORT ───────────────────────────────────────────────
  const travel = expenseCategories['Travel & Transport'] ?? 0;
  if (hasRevenue && travel > 0) {
    const travelRatio = travel / totalRevenue;
    if (travelRatio > 0.07) {
      recs.push({
        id: 'travel-costs',
        title: `Travel & Transport Is ${(travelRatio * 100).toFixed(0)}% of Revenue`,
        description: `${fmt(travel)} in travel costs is high relative to revenue. With fuel and transport inflation in Nigeria, this category can escalate quickly.`,
        action: 'Shift client meetings to video calls (Teams, Zoom, Google Meet). Where travel is unavoidable, implement a pre-approval policy for trips above a set threshold. Consolidate vendor visits on single days to reduce frequency.',
        severity: 'insight',
        area: 'expenses',
        impact: 'Digital-first client engagement can cut travel costs by 40–60%',
      });
    }
  }

  // ── 10. NO INSURANCE ────────────────────────────────────────────────────
  const insurance = expenseCategories['Insurance'] ?? 0;
  if (hasExpenses && insurance === 0) {
    recs.push({
      id: 'no-insurance',
      title: 'No Insurance Expense Recorded — Financial Risk Exposure',
      description: 'Insurance is not in your expense records. Operating without business insurance (fire, theft, professional indemnity, employer liability) exposes you to unquantified financial losses that can wipe out cash reserves overnight.',
      action: 'Obtain at minimum: Group Life Insurance (mandatory under the Pension Reform Act for companies with 3+ employees), Employer Liability, and Fire/Property cover. Cost is typically 0.5–2% of insured value and is a tax-deductible expense under NTA 2025.',
      severity: 'warning',
      area: 'expenses',
      impact: 'Insurance premiums are deductible; an uncovered loss can be devastating',
    });
  }

  // ── 11. NO TRAINING & DEVELOPMENT ───────────────────────────────────────
  const training = expenseCategories['Training & Development'] ?? 0;
  if (hasRevenue && training === 0 && totalRevenue > 500_000) {
    recs.push({
      id: 'no-training',
      title: 'No Training Investment — Long-Term Productivity Risk',
      description: 'Zero Training & Development spend often signals skills stagnation. In a competitive market, under-skilled teams reduce productivity and increase staff turnover costs.',
      action: 'Allocate 1–2% of payroll to staff training. Take advantage of SMEDAN\'s free and subsidised SME training programmes and the Industrial Training Fund (ITF) which mandates and reimburses training costs for eligible businesses.',
      severity: 'insight',
      area: 'expenses',
      impact: 'Well-trained staff reduce errors, improve output quality, and are less likely to leave',
    });
  }

  // ── 12. REVENUE CONCENTRATION RISK ─────────────────────────────────────
  if (hasRevenue && revenueDiversityScore < 30 && Object.keys(revenueCategories).length < 3) {
    const dominant = Object.entries(revenueCategories).sort(([, a], [, b]) => b - a)[0];
    const pct = dominant ? ((dominant[1] / totalRevenue) * 100).toFixed(0) : '0';
    recs.push({
      id: 'revenue-concentration',
      title: `${pct}% of Revenue From a Single Source`,
      description: `Your revenue is heavily concentrated in "${dominant?.[0] ?? 'one category'}". Single-source revenue is fragile — losing that client or contract creates an immediate cash crisis.`,
      action: 'Develop at least two additional revenue streams within 6 months. Options aligned to Nigerian SMBs: add a Service Income line (training, consulting, maintenance contracts), Rental Income (sublease equipment or space), or explore export income eligible for NEPC support.',
      severity: 'warning',
      area: 'revenue',
      impact: 'Diversified revenue reduces vulnerability and improves valuation multiples',
    });
  }

  // ── 13. GRANTS & SUBSIDIES NOT UTILISED ────────────────────────────────
  const grants = revenueCategories['Grants & Subsidies'] ?? 0;
  if (hasRevenue && grants === 0 && totalRevenue < 100_000_000) {
    recs.push({
      id: 'no-grants',
      title: 'Untapped Government Grants & SME Funding Available',
      description: 'No grants or subsidies are recorded. Nigerian SMBs with revenue under ₦100M have access to multiple low-cost financing programmes they consistently underutilise.',
      action: 'Apply for: (1) SMEDAN/NDE grants and free business development support, (2) Bank of Industry (BOI) loans at 9% p.a. vs commercial bank rates of 25%+, (3) Development Bank of Nigeria (DBN) credit lines through partner banks, (4) CBN Anchor Borrowers\' Programme if in agri-processing. Record any approved grants as income here.',
      severity: 'opportunity',
      area: 'funding',
      impact: 'BOI loans alone can reduce finance costs by 15–16% per annum vs commercial rates',
    });
  }

  // ── 14. NO INTEREST INCOME ──────────────────────────────────────────────
  const interest = revenueCategories['Interest Income'] ?? 0;
  if (hasRevenue && interest === 0 && totalRevenue > 1_000_000) {
    recs.push({
      id: 'no-interest-income',
      title: 'Idle Cash Is Not Earning Interest',
      description: 'No Interest Income is recorded. With CBN policy rates elevated, cash sitting in a current account earns nothing while inflation erodes its value.',
      action: 'Park surplus funds in: (1) a business savings account (2–5% p.a.), (2) CBN Treasury Bills (T-bills) currently offering 18–22% p.a., or (3) a money market fund accessible on banking apps. Small amounts compound quickly and constitute legitimate Other Income.',
      severity: 'opportunity',
      area: 'revenue',
      impact: 'Investing ₦5M at 18% T-bill yield generates ₦900K annual passive income',
    });
  }

  // ── 15. DECLINING REVENUE TREND ─────────────────────────────────────────
  if (revenueTrend === 'down') {
    recs.push({
      id: 'declining-revenue',
      title: 'Revenue Is on a Declining Trend',
      description: 'Month-over-month analysis shows revenue falling. Continued decline will erode profit margins and threaten operational sustainability.',
      action: '(1) Survey top 5 clients to identify reasons for reduced spend. (2) Introduce a customer retention programme — loyalty discounts or extended payment terms. (3) Accelerate invoice collection — implement a 14-day payment policy and offer a 2% early-payment discount. (4) Launch a new product or service SKU to attract new revenue.',
      severity: 'critical',
      area: 'revenue',
      impact: 'Stopping a 10% monthly revenue decline prevents compounding losses',
    });
  }

  // ── 16. RISING EXPENSES WITH FLAT REVENUE ───────────────────────────────
  if (expenseTrend === 'up' && revenueTrend !== 'up') {
    recs.push({
      id: 'cost-creep',
      title: 'Costs Are Rising While Revenue Is Not',
      description: 'Expense growth is outpacing revenue growth. This "cost creep" — common in inflationary environments — silently destroys profit margins.',
      action: 'Implement a monthly budget vs actual review. Set a cost freeze on discretionary spend (office supplies, travel, entertainment) until revenue recovers. Re-tender supplier contracts — use the opportunity of Nigeria\'s competitive market to secure better pricing.',
      severity: 'warning',
      area: 'cashflow',
      impact: 'Containing cost creep early prevents a future loss position',
    });
  }

  // ── 17. NTA 2025 SMALL COMPANY EXEMPTION ────────────────────────────────
  if (hasRevenue && totalRevenue > 0 && totalRevenue <= 100_000_000) {
    recs.push({
      id: 'small-company-tax',
      title: 'You May Qualify for the NTA 2025 Small Company Exemption',
      description: `Your revenue of ${fmt(totalRevenue)} may be below the ₦100M threshold for small company CIT exemption under NTA 2025, provided fixed assets are under ₦250M.`,
      action: 'Confirm your fixed asset value with your accountant. If you qualify, you pay 0% Company Income Tax and are exempt from the 4% Development Levy — a significant cash saving. File a CIT return (even if nil) by June 30, 2026 to remain compliant.',
      severity: 'opportunity',
      area: 'tax',
      impact: `Saving 30% CIT + 4% levy on ${fmt(Math.max(0, netProfit))} taxable profit`,
    });
  }

  // ── 18. IMPROVING TREND — REINVESTMENT SIGNAL ───────────────────────────
  if (trend === 'improving' && (profitMargin ?? 0) > 20) {
    recs.push({
      id: 'reinvest-profits',
      title: 'Strong Performance — Time to Strategically Reinvest',
      description: `Profit margin is above 20% and trending upward. This is the optimal time to deploy retained earnings rather than hold idle cash that loses value to inflation.`,
      action: 'Consider: (1) capital equipment investment (depreciation is tax-deductible), (2) pre-paying annual contracts to lock in current rates, (3) expanding into an adjacent market while cash flow is strong, (4) building a 3-month operating expense reserve fund.',
      severity: 'opportunity',
      area: 'cashflow',
      impact: 'Strategic reinvestment compounds growth and reduces future tax liability through allowable deductions',
    });
  }

  // ── 19. INVOICE FINANCING / CASHFLOW GAP ────────────────────────────────
  const recentMonths = monthlyData.slice(-3);
  const hasNegativeMonths = recentMonths.filter(m => m.profit < 0).length >= 2;
  if (hasRevenue && hasNegativeMonths && netProfit > -totalRevenue * 0.5) {
    recs.push({
      id: 'invoice-financing',
      title: 'Consider Invoice Financing to Bridge Cash Flow Gaps',
      description: 'Two or more of the last three months show negative cash flow despite recorded revenue. This often indicates delayed client payments creating a cash flow gap.',
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

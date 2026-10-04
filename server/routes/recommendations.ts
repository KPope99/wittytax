import { Router, Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import { prisma } from '../db';
import OpenAI from 'openai';

const router = Router();
const JWT_SECRET = process.env.JWT_SECRET!;

const RECOMMENDATIONS_SCHEMA = {
  type: 'object',
  properties: {
    recommendations: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          title: { type: 'string' },
          description: { type: 'string' },
          potentialSavings: { type: 'number' },
          category: { type: 'string', enum: ['deduction', 'exemption', 'timing', 'structure'] },
          priority: { type: 'string', enum: ['high', 'medium', 'low'] },
        },
        required: ['title', 'description', 'potentialSavings', 'category', 'priority'],
        additionalProperties: false,
      },
    },
  },
  required: ['recommendations'],
  additionalProperties: false,
};

router.post('/generate', async (req: Request, res: Response) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'No token provided' });
  }

  let userId: string;
  try {
    const decoded = jwt.verify(authHeader.substring(7), JWT_SECRET) as { userId: string };
    userId = decoded.userId;
  } catch {
    return res.status(401).json({ error: 'Invalid token' });
  }

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { role: true, group: true, companyName: true },
  });

  if (!user) return res.status(404).json({ error: 'User not found' });
  if (user.role !== 'admin' && user.group !== 'premium') {
    return res.status(403).json({ error: 'Premium subscription required' });
  }

  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    return res.status(500).json({ error: 'AI service not configured. Please contact support.' });
  }

  const { type, result } = req.body;
  if (type !== 'personal' && type !== 'company') {
    return res.status(400).json({ error: 'type must be "personal" or "company"' });
  }
  if (!result || typeof result !== 'object') {
    return res.status(400).json({ error: 'result is required — pass the most recent tax calculation' });
  }

  const client = new OpenAI({ apiKey });

  const profile = type === 'personal'
    ? `Taxpayer type: Individual (Personal Income Tax)
Gross Income: ₦${Number(result.grossIncome || 0).toLocaleString()}
Pension Deduction Applied: ₦${Number(result.pensionDeduction || 0).toLocaleString()}
Voluntary Pension Contribution: ₦${Number(result.voluntaryPensionContribution || 0).toLocaleString()}
NHF Deduction Applied: ₦${Number(result.nhfDeduction || 0).toLocaleString()}
Rent Relief Claimed: ₦${Number(result.rentRelief || 0).toLocaleString()}
Other Deductions: ₦${Number(result.additionalDeductionsTotal || 0).toLocaleString()}
Taxable Income: ₦${Number(result.taxableIncome || 0).toLocaleString()}
Total Tax Paid: ₦${Number(result.totalTax || 0).toLocaleString()}
Effective Tax Rate: ${Number(result.effectiveRate || 0).toFixed(2)}%`
    : `Taxpayer type: Company (Corporate Income Tax)
Company: ${user.companyName}
Annual Turnover: ₦${Number(result.annualTurnover || 0).toLocaleString()}
Assessable Profit: ₦${Number(result.assessableProfit || 0).toLocaleString()}
Capital Allowances Claimed: ₦${Number(result.capitalAllowances || 0).toLocaleString()}
Other Deductions: ₦${Number(result.otherDeductionsTotal || 0).toLocaleString()}
Employer Pension Contribution: ₦${Number(result.employerPensionContribution || 0).toLocaleString()}
Taxable Profit: ₦${Number(result.taxableProfit || 0).toLocaleString()}
Company Classification: ${result.companySize === 'small' ? 'Small' : 'Large'}
Professional Services Firm: ${result.isProfessionalService ? 'Yes' : 'No'}
Non-Resident: ${result.isNonResident ? 'Yes' : 'No'}
Corporate Tax: ₦${Number(result.corporateTax || 0).toLocaleString()}
Development Levy: ₦${Number(result.developmentLevy || 0).toLocaleString()}
Total Tax Paid: ₦${Number(result.totalTax || 0).toLocaleString()}
Effective Tax Rate: ${Number(result.effectiveRate || 0).toFixed(2)}%`;

  const referenceRules = type === 'personal'
    ? `NTA 2025 rules you must apply accurately (do not invent figures):
- 0% tax band on the first ₦800,000 of taxable income
- Pension contribution: 8% of gross income is tax-deductible; voluntary contributions up to 1/3 of monthly salary are also deductible
- National Housing Fund (NHF): 2.5% of income is tax-deductible
- Rent relief: 20% of annual rent paid, capped at ₦500,000
- Share transfer exemption: disposal proceeds under ₦150,000,000 may have gains up to ₦10,000,000 exempt from CGT
- Compensation for loss of office: exempt up to ₦50,000,000`
    : `NTA 2025 rules you must apply accurately (do not invent figures):
- Small company exemption: turnover ≤ ₦100,000,000 AND fixed assets < ₦250,000,000 → 0% CIT, exempt from 4% Development Levy (professional services firms never qualify as small, regardless of size)
- Standard CIT rate: 30% of taxable profit for companies that don't qualify as small
- Development Levy: 4% of assessable profit for non-small, resident companies
- Capital allowances reduce taxable profit — claiming the full allowance on qualifying assets (machinery, equipment, buildings) is a legitimate deduction
- Employer pension contributions (minimum 10% of payroll) are a fully deductible business expense
- 15% minimum effective tax rate applies only to companies with turnover >₦50 billion or multinational groups — not relevant for most companies`;

  const prompt = `You are an expert Nigerian tax advisor specialising in the Nigeria Tax Act (NTA) 2025.

Analyse this taxpayer's actual figures and produce a short, prioritised list of legally accurate, personalised tax-saving recommendations. Only recommend strategies that are genuinely applicable given the figures provided — do not suggest something they've already fully claimed, and do not invent tax rules beyond what NTA 2025 actually provides.

TAXPAYER PROFILE:
${profile}

${referenceRules}

Requirements:
- Each recommendation must be specific to THIS taxpayer's numbers, not generic advice.
- potentialSavings must be a realistic number in Nigerian Naira, calculated from the figures given.
- Prioritise by realistic impact: "high" for the largest savings or most clearly applicable, "low" for minor or situational ones.
- Limit to the 3-6 most relevant recommendations. Do not pad with irrelevant ones.
- category must be one of: deduction, exemption, timing, structure.`;

  try {
    const response = await client.responses.create({
      model: 'gpt-4o',
      text: {
        format: {
          type: 'json_schema',
          name: 'TaxRecommendations',
          schema: RECOMMENDATIONS_SCHEMA,
          strict: true,
        },
      },
      input: prompt,
    } as any, { timeout: 60_000 });

    const outputText = response.output_text;
    if (!outputText) {
      return res.status(502).json({ error: 'No recommendations generated. Please try again.' });
    }

    let parsed: { recommendations: any[] };
    try {
      parsed = JSON.parse(outputText);
    } catch {
      return res.status(502).json({ error: 'Failed to parse recommendations. Please try again.' });
    }

    const recommendations = parsed.recommendations.map((r, i) => ({
      id: `ai-${i}`,
      title: r.title,
      description: r.description,
      potentialSavings: r.potentialSavings,
      category: r.category,
      priority: r.priority,
      applicable: true,
    }));

    res.json({ recommendations });
  } catch (err: any) {
    console.error('Recommendations error:', err);
    res.status(500).json({ error: err?.message ?? 'Failed to generate recommendations. Please try again.' });
  }
});

// ─── Cash Flow AI Opportunities ─────────────────────────────────────────────
// Premium-gated, on-demand supplement to the free rule-based cash flow
// recommendations (src/utils/cashFlowRecommendations.ts). Takes the already-
// computed analysis + company profile (so the AI reasons from the exact same
// numbers the user sees, not a re-derivation) and asks for sector- and
// macro-aware opportunities the deterministic rules don't cover.

const CASHFLOW_AI_SCHEMA = {
  type: 'object',
  properties: {
    opportunities: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          title: { type: 'string' },
          description: { type: 'string' },
          action: { type: 'string' },
          impact: { type: 'string' },
          priority: { type: 'string', enum: ['high', 'medium', 'low'] },
          area: { type: 'string', enum: ['revenue', 'expenses', 'cashflow', 'tax', 'funding'] },
        },
        required: ['title', 'description', 'action', 'impact', 'priority', 'area'],
        additionalProperties: false,
      },
    },
  },
  required: ['opportunities'],
  additionalProperties: false,
};

router.post('/cashflow', async (req: Request, res: Response) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'No token provided' });
  }

  let userId: string;
  try {
    const decoded = jwt.verify(authHeader.substring(7), JWT_SECRET) as { userId: string };
    userId = decoded.userId;
  } catch {
    return res.status(401).json({ error: 'Invalid token' });
  }

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { role: true, group: true, companyName: true },
  });

  if (!user) return res.status(404).json({ error: 'User not found' });
  if (user.role !== 'admin' && user.group !== 'premium') {
    return res.status(403).json({ error: 'Premium subscription required' });
  }

  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    return res.status(500).json({ error: 'AI service not configured. Please contact support.' });
  }

  const { analysis, companyProfile, sectorName, dataSource } = req.body;
  if (!analysis || typeof analysis !== 'object') {
    return res.status(400).json({ error: 'analysis is required — pass the computed CashFlowAnalysis' });
  }

  const client = new OpenAI({ apiKey });

  const n = (v: any) => `₦${Number(v || 0).toLocaleString()}`;

  const financialSummary = `Company: ${user.companyName}
Sector: ${sectorName || 'Not specified'}
Data source: ${dataSource === 'monthly_ledger' ? 'Actual month-by-month bookkeeping (Monthly P&L records)' : 'Saved Company Tax calculation snapshots'}
Total Revenue (latest period): ${n(analysis.totalRevenue)}
Total Expenses (latest period): ${n(analysis.totalExpenses)}
Net Profit (latest period): ${n(analysis.netProfit)}
Profit Margin: ${analysis.profitMargin != null ? Number(analysis.profitMargin).toFixed(1) + '%' : 'N/A'}
Expense Ratio: ${analysis.expenseRatio != null ? Number(analysis.expenseRatio).toFixed(1) + '%' : 'N/A'}
Profit Trend: ${analysis.trend}
Revenue Trend: ${analysis.revenueTrend}
Expense Trend: ${analysis.expenseTrend}
Rule-based Risk Level: ${analysis.riskLevel}`;

  const companyProfileSummary = companyProfile
    ? `Annual Turnover: ${n(companyProfile.annualTurnover)}
Taxable Profit: ${n(companyProfile.taxableProfit)}
Company Classification (NTA 2025): ${companyProfile.companySize}
Corporate Tax Rate: ${companyProfile.taxRate}%
Large Company: ${companyProfile.isLargeCompany ? 'Yes' : 'No'}
Multinational Group: ${companyProfile.isMNE ? 'Yes' : 'No'}`
    : 'No saved Company Tax calculation on record.';

  const existingTitles: string[] = Array.isArray(analysis.recommendations)
    ? analysis.recommendations.map((r: any) => r.title).filter(Boolean)
    : [];

  const prompt = `You are a senior financial advisor and economist specialising in Nigerian SMEs and corporates, with deep knowledge of the sector's dynamics and Nigeria's current macroeconomic environment (inflation trajectory, naira/FX volatility, CBN monetary policy stance, import dependency, and typical seasonal or regulatory pressures for this specific sector).

A deterministic rules engine has already generated some baseline recommendations for this company from its financial data. Your job is different: produce 2-4 additional "opportunities" that go beyond simple threshold rules — ones that specifically require reasoning about this company's SECTOR and Nigeria's CURRENT macro/country situation, which a rules engine cannot do. Do not repeat or rephrase any of these already-shown recommendations:
${existingTitles.length > 0 ? existingTitles.map(t => `- ${t}`).join('\n') : '(none yet)'}

COMPANY FINANCIAL SUMMARY:
${financialSummary}

ANNUAL TAX PROFILE:
${companyProfileSummary}

Requirements:
- Every recommendation must be grounded in the actual figures above — no generic filler.
- Explicitly reason about the sector (e.g. a manufacturer facing FX-driven input costs vs. a technology firm with forex-denominated revenue) and the current Nigerian macro environment where relevant — do not give advice that could apply to any country or any sector.
- Prioritise by realistic impact: "high" for the most consequential, "low" for minor/situational.
- area must be one of: revenue, expenses, cashflow, tax, funding.
- Do not invent specific economic statistics (exact inflation %, exact exchange rates) you aren't certain of — reason directionally (e.g. "with the naira remaining volatile" rather than citing a specific rate) instead of a precise figure that could be stale or wrong.
- Limit to 2-4 recommendations. Quality over quantity.`;

  try {
    const response = await client.responses.create({
      model: 'gpt-4o',
      text: {
        format: {
          type: 'json_schema',
          name: 'CashFlowOpportunities',
          schema: CASHFLOW_AI_SCHEMA,
          strict: true,
        },
      },
      input: prompt,
    } as any, { timeout: 60_000 });

    const outputText = response.output_text;
    if (!outputText) {
      return res.status(502).json({ error: 'No opportunities generated. Please try again.' });
    }

    let parsed: { opportunities: any[] };
    try {
      parsed = JSON.parse(outputText);
    } catch {
      return res.status(502).json({ error: 'Failed to parse opportunities. Please try again.' });
    }

    const opportunities = parsed.opportunities.map((o, i) => ({
      id: `ai-cashflow-${i}`,
      title: o.title,
      description: o.description,
      action: o.action,
      impact: o.impact,
      priority: o.priority,
      area: o.area,
    }));

    res.json({ opportunities });
  } catch (err: any) {
    console.error('Cash flow AI opportunities error:', err);
    res.status(500).json({ error: err?.message ?? 'Failed to generate opportunities. Please try again.' });
  }
});

export default router;

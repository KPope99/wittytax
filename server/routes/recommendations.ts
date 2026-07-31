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
    } as any);

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

export default router;

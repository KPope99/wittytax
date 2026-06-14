import { Router, Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import { prisma } from '../db';
import OpenAI from 'openai';

const router = Router();
const JWT_SECRET = process.env.JWT_SECRET!;

const sendSSE = (res: Response, event: string, data: unknown) => {
  res.write(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`);
};

const FORECAST_SCHEMA = {
  type: 'object',
  properties: {
    executiveSummary: { type: 'string' },
    revenueForecasts: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          period: { type: 'string' },
          conservative: { type: 'number' },
          moderate: { type: 'number' },
          optimistic: { type: 'number' },
        },
        required: ['period', 'conservative', 'moderate', 'optimistic'],
        additionalProperties: false,
      },
    },
    profitabilityForecasts: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          period: { type: 'string' },
          grossMarginPct: { type: 'number' },
          netMarginPct: { type: 'number' },
          estimatedNetProfit: { type: 'number' },
        },
        required: ['period', 'grossMarginPct', 'netMarginPct', 'estimatedNetProfit'],
        additionalProperties: false,
      },
    },
    keyGrowthDrivers: { type: 'array', items: { type: 'string' } },
    risks: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          factor: { type: 'string' },
          impact: { type: 'string' },
          likelihood: { type: 'string', enum: ['Low', 'Medium', 'High'] },
        },
        required: ['factor', 'impact', 'likelihood'],
        additionalProperties: false,
      },
    },
    nigeriaPolicyImpacts: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          policy: { type: 'string' },
          effect: { type: 'string' },
          recommendation: { type: 'string' },
        },
        required: ['policy', 'effect', 'recommendation'],
        additionalProperties: false,
      },
    },
    sectorTrends: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          trend: { type: 'string' },
          localImpact: { type: 'string' },
          globalContext: { type: 'string' },
        },
        required: ['trend', 'localImpact', 'globalContext'],
        additionalProperties: false,
      },
    },
    taxOptimizations: { type: 'array', items: { type: 'string' } },
    strategicRecommendations: { type: 'array', items: { type: 'string' } },
  },
  required: [
    'executiveSummary',
    'revenueForecasts',
    'profitabilityForecasts',
    'keyGrowthDrivers',
    'risks',
    'nigeriaPolicyImpacts',
    'sectorTrends',
    'taxOptimizations',
    'strategicRecommendations',
  ],
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

  const {
    sector,
    businessType,
    annualRevenue,
    totalExpenses,
    taxPaid,
    employeeCount,
    yearsInOperation,
    forecastPeriod,
    additionalContext,
  } = req.body;

  if (!sector || !businessType || annualRevenue == null) {
    return res.status(400).json({ error: 'sector, businessType, and annualRevenue are required' });
  }

  // Switch to SSE
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.flushHeaders();

  const client = new OpenAI({ apiKey });

  const companyProfile = `
Company: ${user.companyName}
Business Type: ${businessType}
Sector: ${sector}
Annual Revenue: ₦${Number(annualRevenue).toLocaleString()}
Total Expenses: ${totalExpenses != null ? `₦${Number(totalExpenses).toLocaleString()}` : 'Not provided'}
Tax Paid: ${taxPaid != null ? `₦${Number(taxPaid).toLocaleString()}` : 'Not provided'}
Employees: ${employeeCount ?? 'Not provided'}
Years in Operation: ${yearsInOperation ?? 'Not provided'}
Forecast Period: ${forecastPeriod ?? '3 years'}
${additionalContext ? `Additional Context: ${additionalContext}` : ''}
  `.trim();

  const prompt = `You are an expert Nigerian business analyst and financial forecaster with deep knowledge of:
- Nigerian tax law (CITA, PITA, VAT, WHT, CIT) and FIRS regulations
- CBN monetary policy, interest rates, and exchange rate impacts
- Nigerian government budget priorities and economic policy
- Sector-specific dynamics in the Nigerian market
- Global trends affecting Nigerian businesses

Your task: generate a comprehensive, data-driven business forecast for this company.

COMPANY PROFILE:
${companyProfile}

INSTRUCTIONS:
1. Search the web for current Nigerian economic conditions, CBN interest rates, inflation data, and FIRS tax policies for ${new Date().getFullYear()}.
2. Search for recent trends in the ${sector} sector in Nigeria.
3. Search for global ${sector} industry trends that could affect Nigerian operations.
4. Search for Nigerian government budget policies or incentives relevant to ${businessType} businesses in ${sector}.
5. Using all gathered information plus the company's financial profile, produce a detailed forecast covering ${forecastPeriod ?? '3 years'}.

Requirements:
- All revenue/profit forecast figures must be numbers in Nigerian Naira (₦), NOT strings.
- Conservative estimates reflect downside risks; optimistic reflects best-case growth.
- Provide realistic projections based on the company's current revenue scale.
- Return your complete forecast as structured JSON matching the required schema exactly.`;

  try {
    sendSSE(res, 'progress', { step: 'Researching Nigerian economic conditions and government policies...' });

    const response = await client.responses.create({
      model: 'gpt-4o',
      tools: [{ type: 'web_search_preview' }],
      tool_choice: 'auto',
      text: {
        format: {
          type: 'json_schema',
          name: 'ForecastResult',
          schema: FORECAST_SCHEMA,
          strict: true,
        },
      },
      input: prompt,
    } as any);

    // Extract web search usage for progress events
    const hasSearchResults = response.output?.some((block: any) => block.type === 'web_search_call');
    if (hasSearchResults) {
      sendSSE(res, 'progress', { step: 'Analysing sector trends and policy impacts...' });
    }

    sendSSE(res, 'progress', { step: 'Generating your business forecast...' });

    const outputText = response.output_text;
    if (!outputText) {
      sendSSE(res, 'error', { message: 'No forecast generated. Please try again.' });
      return res.end();
    }

    let forecast: unknown;
    try {
      forecast = JSON.parse(outputText);
    } catch {
      sendSSE(res, 'error', { message: 'Failed to parse forecast data. Please try again.' });
      return res.end();
    }

    sendSSE(res, 'complete', { forecast });
    res.end();
  } catch (err: any) {
    console.error('Forecast error:', err);
    sendSSE(res, 'error', { message: err?.message ?? 'Forecast generation failed. Please try again.' });
    res.end();
  }
});

export default router;

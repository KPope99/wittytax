import fs from 'fs';
import path from 'path';
import { prisma } from '../db';

// Node 18+ provides global fetch at runtime, but @types/node here predates
// it, so tsconfig's ES2020 lib has no declaration for it.
declare const fetch: (input: string, init?: Record<string, unknown>) => Promise<{ ok: boolean; status: number; statusText: string }>;

// Mirrors src/utils/canonicalCompanyCalc.ts + src/utils/monthlyLedger.ts —
// kept as separate server-side copies since the frontend utils aren't
// importable here (same pattern as deadlineReminders.ts).
const TURNOVER_RE = /^(?:monthly|daily)-turnover:(\d{4})-(\d{2})(?:-\d{2})?$/;

export interface MsmeExportRow {
  companyName: string;
  year: number;
  revenue: number;
  taxPaid: number;
  profit: number;
}

interface CompanyResultJson {
  annualTurnover?: number;
  taxableProfit?: number;
  totalTax?: number;
  netProfit?: number;
  taxYear?: number;
}

// Builds one row per (company, year) for every user with at least one saved
// Company Tax calculation — i.e. the MSME population, not personal-only
// users. Revenue prefers that year's real Monthly P&L total when any exists
// (same precedent as Overview, Financials and Year Comparison), falling
// back to the calculation's declared annual turnover otherwise.
export async function buildMsmeExportRows(): Promise<MsmeExportRow[]> {
  const users = await prisma.user.findMany({
    select: {
      companyName: true,
      taxCalculations: { where: { type: 'company' }, select: { result: true, createdAt: true } },
      revenues: { select: { amount: true, reference: true } },
    },
  });

  const rows: MsmeExportRow[] = [];

  for (const user of users) {
    if (user.taxCalculations.length === 0) continue;

    const ledgerTurnoverByYear = new Map<number, number>();
    for (const r of user.revenues) {
      const m = r.reference?.match(TURNOVER_RE);
      if (!m) continue;
      const year = parseInt(m[1], 10);
      ledgerTurnoverByYear.set(year, (ledgerTurnoverByYear.get(year) ?? 0) + r.amount);
    }

    const canonicalByYear = new Map<number, { result: CompanyResultJson; createdAt: Date }>();
    for (const calc of user.taxCalculations) {
      let result: CompanyResultJson;
      try {
        result = JSON.parse(calc.result);
      } catch {
        continue;
      }
      const year = typeof result.taxYear === 'number' ? result.taxYear : calc.createdAt.getFullYear();
      const existing = canonicalByYear.get(year);
      if (!existing || calc.createdAt.getTime() > existing.createdAt.getTime()) {
        canonicalByYear.set(year, { result, createdAt: calc.createdAt });
      }
    }

    for (const [year, { result }] of Array.from(canonicalByYear.entries())) {
      const ledgerTurnover = ledgerTurnoverByYear.get(year);
      rows.push({
        companyName: user.companyName,
        year,
        revenue: ledgerTurnover !== undefined ? ledgerTurnover : (result.annualTurnover ?? 0),
        taxPaid: result.totalTax ?? 0,
        profit: result.netProfit ?? 0,
      });
    }
  }

  return rows.sort((a, b) => a.companyName.localeCompare(b.companyName) || a.year - b.year);
}

export interface PushResult {
  destination: 'webhook' | 'local-file';
  target: string;
  rowCount: number;
}

// Pushes the MSME dataset to a partner system. No real partner endpoint
// exists yet, so this is wired for one to be plugged in later: set
// PARTNER_EXPORT_URL (and optionally PARTNER_EXPORT_API_KEY) to POST there
// instead. Until then it writes a timestamped JSON file so the export is
// fully inspectable and the feature is testable end-to-end today.
export async function pushMsmeExport(rows: MsmeExportRow[]): Promise<PushResult> {
  const webhookUrl = process.env.PARTNER_EXPORT_URL;
  const payload = { source: 'WittyTax', exportedAt: new Date().toISOString(), records: rows };

  if (webhookUrl) {
    const apiKey = process.env.PARTNER_EXPORT_API_KEY;
    const res = await fetch(webhookUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(apiKey ? { Authorization: `Bearer ${apiKey}` } : {}),
      },
      body: JSON.stringify(payload),
    });
    if (!res.ok) {
      throw new Error(`Export webhook responded with ${res.status} ${res.statusText}`);
    }
    return { destination: 'webhook', target: webhookUrl, rowCount: rows.length };
  }

  const exportsDir = path.join(__dirname, '..', '..', 'exports');
  fs.mkdirSync(exportsDir, { recursive: true });
  const fileName = `msme-export-${new Date().toISOString().replace(/[:.]/g, '-')}.json`;
  const filePath = path.join(exportsDir, fileName);
  fs.writeFileSync(filePath, JSON.stringify(payload, null, 2));
  return { destination: 'local-file', target: `exports/${fileName}`, rowCount: rows.length };
}

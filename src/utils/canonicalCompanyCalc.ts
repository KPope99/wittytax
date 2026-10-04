import { TaxCalculation } from '../context/AuthContext';
import { CompanyTaxResult } from './taxCalculations';

export interface CanonicalCompanyCalc {
  result: CompanyTaxResult;
  taxYear: number;
  date: Date;
}

// Calculations saved before the Tax Year field existed don't have
// result.taxYear, so those fall back to the save date's year.
function resolveTaxYear(calc: TaxCalculation): number {
  const explicit = typeof calc.result?.taxYear === 'number' ? calc.result.taxYear : null;
  return explicit ?? new Date(calc.date).getFullYear();
}

// The most recent saved Company Tax calculation for a given year (or the
// most recent overall when no year is given). Used anywhere a *true annual*
// figure — turnover, company size classification, etc. — is needed, as
// opposed to a trend period which may be monthly (see monthlyLedger.ts).
export function getCanonicalCompanyCalc(taxHistory: TaxCalculation[], year?: number): CanonicalCompanyCalc | null {
  let best: CanonicalCompanyCalc | null = null;
  for (const calc of taxHistory) {
    if (calc.type !== 'company' || !calc.result) continue;
    const calcYear = resolveTaxYear(calc);
    if (year !== undefined && calcYear !== year) continue;
    const date = new Date(calc.date);
    if (!best || date.getTime() > best.date.getTime()) {
      best = { result: calc.result as CompanyTaxResult, taxYear: calcYear, date };
    }
  }
  return best;
}

export function getAllCanonicalCompanyCalcsByYear(taxHistory: TaxCalculation[]): Map<number, CanonicalCompanyCalc> {
  const map = new Map<number, CanonicalCompanyCalc>();
  for (const calc of taxHistory) {
    if (calc.type !== 'company' || !calc.result) continue;
    const year = resolveTaxYear(calc);
    const date = new Date(calc.date);
    const existing = map.get(year);
    if (!existing || date.getTime() > existing.date.getTime()) {
      map.set(year, { result: calc.result as CompanyTaxResult, taxYear: year, date });
    }
  }
  return map;
}

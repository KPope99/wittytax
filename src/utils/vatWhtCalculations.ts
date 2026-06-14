// Nigeria VAT & WHT Calculation Utilities
// VAT: Finance Act 2019 — 7.5% standard rate
// WHT: FIRS rates for residents

// ─── VAT ─────────────────────────────────────────────────────────────────────

export const VAT_RATE = 0.075; // 7.5%
export const VAT_REGISTRATION_THRESHOLD = 25_000_000; // ₦25 million annual turnover

export type VATSupplyType = 'standard' | 'zero_rated' | 'exempt';

export const VAT_SUPPLY_TYPES: { value: VATSupplyType; label: string; description: string }[] = [
  { value: 'standard',   label: 'Standard-Rated (7.5%)',  description: 'Most goods and services' },
  { value: 'zero_rated', label: 'Zero-Rated (0%)',        description: 'Exports, basic food items, medical/pharma supplies, educational materials, baby products' },
  { value: 'exempt',     label: 'Exempt',                 description: 'Medical services, educational services, residential rent, some financial services' },
];

export interface VATLineItem {
  id: string;
  description: string;
  amount: number;
  supplyType: VATSupplyType;
  isInclusive: boolean;
}

export interface VATResult {
  outputVAT: number;
  inputVAT: number;
  netVATPayable: number;
  netVATRefundable: number;
  totalSalesExclVAT: number;
  totalSalesInclVAT: number;
  totalPurchasesExclVAT: number;
  totalPurchasesInclVAT: number;
  standardRatedSales: number;
  zeroRatedSales: number;
  exemptSales: number;
  standardRatedPurchases: number;
}

export function extractVATAmount(amount: number, inclusive: boolean): { excl: number; vat: number } {
  if (inclusive) {
    const excl = amount / (1 + VAT_RATE);
    return { excl, vat: amount - excl };
  }
  return { excl: amount, vat: amount * VAT_RATE };
}

export function calculateVAT(sales: VATLineItem[], purchases: VATLineItem[]): VATResult {
  let outputVAT = 0;
  let totalSalesExclVAT = 0;
  let totalSalesInclVAT = 0;
  let standardRatedSales = 0;
  let zeroRatedSales = 0;
  let exemptSales = 0;

  for (const s of sales) {
    const { excl, vat } = extractVATAmount(s.amount, s.isInclusive);
    totalSalesExclVAT += excl;
    if (s.supplyType === 'standard') {
      outputVAT += vat;
      standardRatedSales += excl;
      totalSalesInclVAT += excl + vat;
    } else if (s.supplyType === 'zero_rated') {
      zeroRatedSales += excl;
      totalSalesInclVAT += excl;
    } else {
      exemptSales += excl;
      totalSalesInclVAT += excl;
    }
  }

  let inputVAT = 0;
  let totalPurchasesExclVAT = 0;
  let totalPurchasesInclVAT = 0;
  let standardRatedPurchases = 0;

  for (const p of purchases) {
    const { excl, vat } = extractVATAmount(p.amount, p.isInclusive);
    totalPurchasesExclVAT += excl;
    if (p.supplyType === 'standard') {
      inputVAT += vat;
      standardRatedPurchases += excl;
      totalPurchasesInclVAT += excl + vat;
    } else {
      totalPurchasesInclVAT += excl;
    }
  }

  // Partial exemption: input VAT only recoverable on taxable (standard + zero-rated) supplies
  const taxableSales = standardRatedSales + zeroRatedSales;
  const partialExemptionRatio = totalSalesExclVAT > 0 ? taxableSales / totalSalesExclVAT : 1;
  const recoverableInputVAT = inputVAT * partialExemptionRatio;

  const net = outputVAT - recoverableInputVAT;

  return {
    outputVAT,
    inputVAT: recoverableInputVAT,
    netVATPayable: net > 0 ? net : 0,
    netVATRefundable: net < 0 ? Math.abs(net) : 0,
    totalSalesExclVAT,
    totalSalesInclVAT,
    totalPurchasesExclVAT,
    totalPurchasesInclVAT,
    standardRatedSales,
    zeroRatedSales,
    exemptSales,
    standardRatedPurchases,
  };
}

// ─── WHT ─────────────────────────────────────────────────────────────────────

export type WHTRecipientType = 'company' | 'individual';

export interface WHTPaymentType {
  value: string;
  label: string;
  companyRate: number;
  individualRate: number;
  notes?: string;
}

export const WHT_PAYMENT_TYPES: WHTPaymentType[] = [
  { value: 'dividends',        label: 'Dividends',                          companyRate: 0.10, individualRate: 0.10 },
  { value: 'interest',         label: 'Interest',                           companyRate: 0.10, individualRate: 0.10 },
  { value: 'rent',             label: 'Rent (Buildings & Land)',             companyRate: 0.10, individualRate: 0.10 },
  { value: 'royalties',        label: 'Royalties',                          companyRate: 0.10, individualRate: 0.10 },
  { value: 'directors_fees',   label: "Directors' Fees",                    companyRate: 0.10, individualRate: 0.10 },
  { value: 'professional',     label: 'Professional Fees (Legal, Audit, Accounting, Consulting)', companyRate: 0.10, individualRate: 0.05 },
  { value: 'technical',        label: 'Technical / Management Services',    companyRate: 0.10, individualRate: 0.05 },
  { value: 'commission',       label: 'Commission / Agency Fees',           companyRate: 0.10, individualRate: 0.05 },
  { value: 'construction',     label: 'Construction Contracts',             companyRate: 0.05, individualRate: 0.05 },
  { value: 'supply_goods',     label: 'Supply of Goods (contract value > ₦10,000)', companyRate: 0.05, individualRate: 0.05 },
  { value: 'contract_other',   label: 'Contracts (Other)',                  companyRate: 0.05, individualRate: 0.05 },
];

export interface WHTLineItem {
  id: string;
  description: string;
  grossAmount: number;
  paymentType: string;
  recipientType: WHTRecipientType;
}

export interface WHTLineResult extends WHTLineItem {
  rate: number;
  whtAmount: number;
  netPayable: number;
}

export interface WHTSummary {
  lines: WHTLineResult[];
  totalGross: number;
  totalWHT: number;
  totalNet: number;
}

export function calculateWHT(items: WHTLineItem[]): WHTSummary {
  const lines: WHTLineResult[] = items.map((item) => {
    const type = WHT_PAYMENT_TYPES.find((t) => t.value === item.paymentType);
    const rate = type
      ? item.recipientType === 'company' ? type.companyRate : type.individualRate
      : 0;
    const whtAmount = item.grossAmount * rate;
    return { ...item, rate, whtAmount, netPayable: item.grossAmount - whtAmount };
  });

  return {
    lines,
    totalGross: lines.reduce((s, l) => s + l.grossAmount, 0),
    totalWHT: lines.reduce((s, l) => s + l.whtAmount, 0),
    totalNet: lines.reduce((s, l) => s + l.netPayable, 0),
  };
}

export function generateWHTId(): string {
  return `wht_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
}

export function generateVATId(): string {
  return `vat_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
}

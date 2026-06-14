import React, { useState, useMemo } from 'react';
import { formatCurrency } from '../utils/taxCalculations';
import {
  VAT_RATE, VAT_REGISTRATION_THRESHOLD, VAT_SUPPLY_TYPES,
  WHT_PAYMENT_TYPES,
  calculateVAT, calculateWHT,
  generateVATId, generateWHTId,
  VATLineItem, WHTLineItem, WHTRecipientType, VATSupplyType,
} from '../utils/vatWhtCalculations';

// ─── Shared helpers ───────────────────────────────────────────────────────────

const pct = (rate: number) => `${(rate * 100).toFixed(0)}%`;

const InfoBadge: React.FC<{ text: string }> = ({ text }) => (
  <span className="text-xs bg-blue-50 text-blue-700 border border-blue-200 px-2 py-0.5 rounded-full font-medium">
    {text}
  </span>
);

// ─── VAT Tab ─────────────────────────────────────────────────────────────────

const emptyVATLine = (): VATLineItem => ({
  id: generateVATId(),
  description: '',
  amount: 0,
  supplyType: 'standard',
  isInclusive: false,
});

export const VATTab: React.FC = () => {
  const [sales, setSales] = useState<VATLineItem[]>([emptyVATLine()]);
  const [purchases, setPurchases] = useState<VATLineItem[]>([emptyVATLine()]);

  const result = useMemo(() => calculateVAT(sales, purchases), [sales, purchases]);

  const updateLine = (
    list: VATLineItem[],
    setList: React.Dispatch<React.SetStateAction<VATLineItem[]>>,
    id: string,
    field: keyof VATLineItem,
    value: unknown,
  ) => {
    setList(list.map((l) => l.id === id ? { ...l, [field]: value } : l));
  };

  const addLine = (setList: React.Dispatch<React.SetStateAction<VATLineItem[]>>) =>
    setList((prev) => [...prev, emptyVATLine()]);

  const removeLine = (
    list: VATLineItem[],
    setList: React.Dispatch<React.SetStateAction<VATLineItem[]>>,
    id: string,
  ) => {
    if (list.length === 1) return;
    setList(list.filter((l) => l.id !== id));
  };

  const LineTable: React.FC<{
    title: string;
    icon: React.ReactNode;
    lines: VATLineItem[];
    setLines: React.Dispatch<React.SetStateAction<VATLineItem[]>>;
    color: string;
  }> = ({ title, icon, lines, setLines, color }) => (
    <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
      <div className={`px-5 py-3.5 border-b border-gray-100 flex items-center justify-between bg-${color}-50`}>
        <div className="flex items-center gap-2 font-semibold text-gray-800">
          {icon} {title}
        </div>
        <button
          onClick={() => addLine(setLines)}
          className={`text-xs px-3 py-1.5 bg-${color}-600 text-white rounded-lg hover:bg-${color}-700 transition-colors`}
        >
          + Add Line
        </button>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-gray-50 text-xs text-gray-500 uppercase tracking-wide">
              <th className="px-4 py-2 text-left font-medium">Description</th>
              <th className="px-4 py-2 text-left font-medium">Amount (₦)</th>
              <th className="px-4 py-2 text-left font-medium">Type</th>
              <th className="px-4 py-2 text-center font-medium">VAT incl?</th>
              <th className="px-4 py-2 text-right font-medium">VAT (₦)</th>
              <th className="px-1 py-2" />
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {lines.map((line) => {
              const excl = line.isInclusive ? line.amount / (1 + VAT_RATE) : line.amount;
              const vat = line.supplyType === 'standard' ? excl * VAT_RATE : 0;
              return (
                <tr key={line.id}>
                  <td className="px-4 py-2">
                    <input
                      type="text"
                      placeholder="e.g. Consulting services"
                      value={line.description}
                      onChange={(e) => updateLine(lines, setLines, line.id, 'description', e.target.value)}
                      className="w-full border border-gray-200 rounded px-2 py-1.5 text-sm focus:ring-1 focus:ring-primary-400 focus:border-transparent"
                    />
                  </td>
                  <td className="px-4 py-2">
                    <input
                      type="number"
                      min="0"
                      placeholder="0"
                      value={line.amount || ''}
                      onChange={(e) => updateLine(lines, setLines, line.id, 'amount', parseFloat(e.target.value) || 0)}
                      className="w-32 border border-gray-200 rounded px-2 py-1.5 text-sm focus:ring-1 focus:ring-primary-400 focus:border-transparent"
                    />
                  </td>
                  <td className="px-4 py-2">
                    <select
                      value={line.supplyType}
                      onChange={(e) => updateLine(lines, setLines, line.id, 'supplyType', e.target.value as VATSupplyType)}
                      className="border border-gray-200 rounded px-2 py-1.5 text-sm focus:ring-1 focus:ring-primary-400 focus:border-transparent"
                    >
                      {VAT_SUPPLY_TYPES.map((t) => (
                        <option key={t.value} value={t.value}>{t.label}</option>
                      ))}
                    </select>
                  </td>
                  <td className="px-4 py-2 text-center">
                    <input
                      type="checkbox"
                      checked={line.isInclusive}
                      onChange={(e) => updateLine(lines, setLines, line.id, 'isInclusive', e.target.checked)}
                      className="w-4 h-4 text-primary-600 rounded"
                    />
                  </td>
                  <td className="px-4 py-2 text-right font-medium text-gray-700">
                    {formatCurrency(vat)}
                  </td>
                  <td className="px-1 py-2">
                    <button
                      onClick={() => removeLine(lines, setLines, line.id)}
                      disabled={lines.length === 1}
                      className="text-gray-300 hover:text-red-400 transition-colors disabled:opacity-30"
                    >
                      ✕
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );

  return (
    <div className="space-y-5">
      {/* Info banner */}
      <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 flex gap-3 text-sm text-blue-800">
        <svg className="w-5 h-5 flex-shrink-0 text-blue-500 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
        <div>
          <p className="font-semibold mb-0.5">Nigeria VAT — Finance Act 2019</p>
          <p>Standard rate: <strong>7.5%</strong> · Registration threshold: <strong>{formatCurrency(VAT_REGISTRATION_THRESHOLD)}</strong> annual turnover · Returns filed <strong>monthly</strong> (21st of following month)</p>
        </div>
      </div>

      {/* VAT Return Summary */}
      <div className="grid md:grid-cols-4 gap-3">
        <div className="bg-green-50 border border-green-200 rounded-xl p-4">
          <p className="text-xs text-green-600 font-medium mb-1">Output VAT (on Sales)</p>
          <p className="text-xl font-bold text-green-800">{formatCurrency(result.outputVAT)}</p>
          <p className="text-xs text-green-600 mt-1">From {formatCurrency(result.standardRatedSales)} std-rated sales</p>
        </div>
        <div className="bg-orange-50 border border-orange-200 rounded-xl p-4">
          <p className="text-xs text-orange-600 font-medium mb-1">Input VAT (on Purchases)</p>
          <p className="text-xl font-bold text-orange-800">{formatCurrency(result.inputVAT)}</p>
          <p className="text-xs text-orange-600 mt-1">Recoverable input VAT</p>
        </div>
        <div className={`rounded-xl p-4 border ${result.netVATPayable > 0 ? 'bg-red-50 border-red-200' : 'bg-gray-50 border-gray-200'}`}>
          <p className={`text-xs font-medium mb-1 ${result.netVATPayable > 0 ? 'text-red-600' : 'text-gray-500'}`}>Net VAT Payable</p>
          <p className={`text-xl font-bold ${result.netVATPayable > 0 ? 'text-red-800' : 'text-gray-400'}`}>{formatCurrency(result.netVATPayable)}</p>
          <p className={`text-xs mt-1 ${result.netVATPayable > 0 ? 'text-red-600' : 'text-gray-400'}`}>Due to FIRS by 21st</p>
        </div>
        <div className={`rounded-xl p-4 border ${result.netVATRefundable > 0 ? 'bg-blue-50 border-blue-200' : 'bg-gray-50 border-gray-200'}`}>
          <p className={`text-xs font-medium mb-1 ${result.netVATRefundable > 0 ? 'text-blue-600' : 'text-gray-500'}`}>VAT Refundable</p>
          <p className={`text-xl font-bold ${result.netVATRefundable > 0 ? 'text-blue-800' : 'text-gray-400'}`}>{formatCurrency(result.netVATRefundable)}</p>
          <p className={`text-xs mt-1 ${result.netVATRefundable > 0 ? 'text-blue-600' : 'text-gray-400'}`}>Claimable from FIRS</p>
        </div>
      </div>

      {/* Sales breakdown */}
      {(result.zeroRatedSales > 0 || result.exemptSales > 0) && (
        <div className="grid md:grid-cols-3 gap-3 text-sm">
          <div className="bg-gray-50 rounded-lg p-3 border border-gray-100">
            <p className="text-gray-500 text-xs mb-0.5">Standard-Rated Sales</p>
            <p className="font-semibold text-gray-800">{formatCurrency(result.standardRatedSales)}</p>
          </div>
          <div className="bg-gray-50 rounded-lg p-3 border border-gray-100">
            <p className="text-gray-500 text-xs mb-0.5">Zero-Rated Sales</p>
            <p className="font-semibold text-gray-800">{formatCurrency(result.zeroRatedSales)}</p>
          </div>
          <div className="bg-gray-50 rounded-lg p-3 border border-gray-100">
            <p className="text-gray-500 text-xs mb-0.5">Exempt Sales</p>
            <p className="font-semibold text-gray-800">{formatCurrency(result.exemptSales)}</p>
          </div>
        </div>
      )}

      {/* Line entry tables */}
      <LineTable
        title="Sales / Revenue"
        icon={<svg className="w-4 h-4 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" /></svg>}
        lines={sales}
        setLines={setSales}
        color="green"
      />

      <LineTable
        title="Purchases / Expenses"
        icon={<svg className="w-4 h-4 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" /></svg>}
        lines={purchases}
        setLines={setPurchases}
        color="orange"
      />

      {/* Supply type guide */}
      <div className="bg-gray-50 rounded-xl border border-gray-200 p-4">
        <p className="text-xs font-semibold text-gray-600 uppercase tracking-wide mb-3">Supply Type Guide</p>
        <div className="grid md:grid-cols-3 gap-3">
          {VAT_SUPPLY_TYPES.map((t) => (
            <div key={t.value} className="text-xs">
              <p className="font-semibold text-gray-700">{t.label}</p>
              <p className="text-gray-500 mt-0.5">{t.description}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

// ─── WHT Tab ─────────────────────────────────────────────────────────────────

const emptyWHTLine = (): WHTLineItem => ({
  id: generateWHTId(),
  description: '',
  grossAmount: 0,
  paymentType: 'professional',
  recipientType: 'company',
});

export const WHTTab: React.FC = () => {
  const [items, setItems] = useState<WHTLineItem[]>([emptyWHTLine()]);

  const summary = useMemo(() => calculateWHT(items), [items]);

  const updateItem = (id: string, field: keyof WHTLineItem, value: unknown) => {
    setItems((prev) => prev.map((i) => i.id === id ? { ...i, [field]: value } : i));
  };

  const addItem = () => setItems((prev) => [...prev, emptyWHTLine()]);
  const removeItem = (id: string) => {
    if (items.length === 1) return;
    setItems((prev) => prev.filter((i) => i.id !== id));
  };

  return (
    <div className="space-y-5">
      {/* Info banner */}
      <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 flex gap-3 text-sm text-amber-800">
        <svg className="w-5 h-5 flex-shrink-0 text-amber-500 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
        <div>
          <p className="font-semibold mb-0.5">Nigeria Withholding Tax (WHT) — FIRS</p>
          <p>Deducted at source by the <strong>payer</strong> and remitted to FIRS within <strong>30 days</strong>. Recipient receives a WHT credit note to offset their annual tax liability. Different rates apply for <strong>companies vs individuals</strong>.</p>
        </div>
      </div>

      {/* Summary cards */}
      <div className="grid md:grid-cols-3 gap-3">
        <div className="bg-gray-50 border border-gray-200 rounded-xl p-4">
          <p className="text-xs text-gray-500 font-medium mb-1">Total Gross Amount</p>
          <p className="text-xl font-bold text-gray-800">{formatCurrency(summary.totalGross)}</p>
        </div>
        <div className="bg-red-50 border border-red-200 rounded-xl p-4">
          <p className="text-xs text-red-600 font-medium mb-1">Total WHT to Remit</p>
          <p className="text-xl font-bold text-red-800">{formatCurrency(summary.totalWHT)}</p>
          <p className="text-xs text-red-600 mt-1">Remit to FIRS within 30 days</p>
        </div>
        <div className="bg-green-50 border border-green-200 rounded-xl p-4">
          <p className="text-xs text-green-600 font-medium mb-1">Net Amount to Pay Recipient</p>
          <p className="text-xl font-bold text-green-800">{formatCurrency(summary.totalNet)}</p>
          <p className="text-xs text-green-600 mt-1">After WHT deduction</p>
        </div>
      </div>

      {/* Entry table */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="px-5 py-3.5 border-b border-gray-100 flex items-center justify-between bg-gray-50">
          <p className="font-semibold text-gray-800">Payment Lines</p>
          <button
            onClick={addItem}
            className="text-xs px-3 py-1.5 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors"
          >
            + Add Payment
          </button>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 text-xs text-gray-500 uppercase tracking-wide">
                <th className="px-4 py-2 text-left font-medium">Description</th>
                <th className="px-4 py-2 text-left font-medium">Payment Type</th>
                <th className="px-4 py-2 text-left font-medium">Recipient</th>
                <th className="px-4 py-2 text-right font-medium">Gross (₦)</th>
                <th className="px-4 py-2 text-center font-medium">WHT Rate</th>
                <th className="px-4 py-2 text-right font-medium">WHT (₦)</th>
                <th className="px-4 py-2 text-right font-medium">Net (₦)</th>
                <th className="px-1 py-2" />
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {summary.lines.map((line) => (
                <tr key={line.id} className="hover:bg-gray-50">
                  <td className="px-4 py-2">
                    <input
                      type="text"
                      placeholder="e.g. Audit fees"
                      value={line.description}
                      onChange={(e) => updateItem(line.id, 'description', e.target.value)}
                      className="w-full border border-gray-200 rounded px-2 py-1.5 text-sm focus:ring-1 focus:ring-primary-400 focus:border-transparent"
                    />
                  </td>
                  <td className="px-4 py-2">
                    <select
                      value={line.paymentType}
                      onChange={(e) => updateItem(line.id, 'paymentType', e.target.value)}
                      className="border border-gray-200 rounded px-2 py-1.5 text-sm focus:ring-1 focus:ring-primary-400 focus:border-transparent min-w-[180px]"
                    >
                      {WHT_PAYMENT_TYPES.map((t) => (
                        <option key={t.value} value={t.value}>{t.label}</option>
                      ))}
                    </select>
                  </td>
                  <td className="px-4 py-2">
                    <select
                      value={line.recipientType}
                      onChange={(e) => updateItem(line.id, 'recipientType', e.target.value as WHTRecipientType)}
                      className="border border-gray-200 rounded px-2 py-1.5 text-sm focus:ring-1 focus:ring-primary-400 focus:border-transparent"
                    >
                      <option value="company">Company</option>
                      <option value="individual">Individual</option>
                    </select>
                  </td>
                  <td className="px-4 py-2">
                    <input
                      type="number"
                      min="0"
                      placeholder="0"
                      value={line.grossAmount || ''}
                      onChange={(e) => updateItem(line.id, 'grossAmount', parseFloat(e.target.value) || 0)}
                      className="w-32 border border-gray-200 rounded px-2 py-1.5 text-sm text-right focus:ring-1 focus:ring-primary-400 focus:border-transparent"
                    />
                  </td>
                  <td className="px-4 py-2 text-center">
                    <span className="text-xs font-semibold text-red-600 bg-red-50 border border-red-100 px-2 py-0.5 rounded-full">
                      {pct(line.rate)}
                    </span>
                  </td>
                  <td className="px-4 py-2 text-right font-medium text-red-700">
                    {formatCurrency(line.whtAmount)}
                  </td>
                  <td className="px-4 py-2 text-right font-semibold text-gray-800">
                    {formatCurrency(line.netPayable)}
                  </td>
                  <td className="px-1 py-2">
                    <button
                      onClick={() => removeItem(line.id)}
                      disabled={items.length === 1}
                      className="text-gray-300 hover:text-red-400 transition-colors disabled:opacity-30"
                    >
                      ✕
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
            {summary.lines.length > 1 && (
              <tfoot>
                <tr className="bg-gray-50 font-semibold text-sm border-t border-gray-200">
                  <td className="px-4 py-3" colSpan={3}>Totals</td>
                  <td className="px-4 py-3 text-right">{formatCurrency(summary.totalGross)}</td>
                  <td />
                  <td className="px-4 py-3 text-right text-red-700">{formatCurrency(summary.totalWHT)}</td>
                  <td className="px-4 py-3 text-right text-gray-800">{formatCurrency(summary.totalNet)}</td>
                  <td />
                </tr>
              </tfoot>
            )}
          </table>
        </div>
      </div>

      {/* WHT rate reference */}
      <div className="bg-gray-50 rounded-xl border border-gray-200 p-4">
        <p className="text-xs font-semibold text-gray-600 uppercase tracking-wide mb-3">WHT Rate Reference</p>
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="text-gray-500 border-b border-gray-200">
                <th className="text-left py-1.5 font-medium">Payment Type</th>
                <th className="text-center py-1.5 font-medium px-3">Company</th>
                <th className="text-center py-1.5 font-medium px-3">Individual</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {WHT_PAYMENT_TYPES.map((t) => (
                <tr key={t.value}>
                  <td className="py-1.5 text-gray-700">{t.label}</td>
                  <td className="py-1.5 text-center px-3 font-semibold text-gray-800">{pct(t.companyRate)}</td>
                  <td className="py-1.5 text-center px-3 font-semibold text-gray-800">{pct(t.individualRate)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <p className="text-xs text-gray-400 text-center">
        WHT credit notes received should be held by recipient and submitted with annual tax return to offset CIT/PIT liability.
      </p>
    </div>
  );
};

// ─── Main component ───────────────────────────────────────────────────────────

type Tab = 'vat' | 'wht';

const VATWHTCalculator: React.FC = () => {
  const [activeTab, setActiveTab] = useState<Tab>('vat');

  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-xl font-bold text-gray-800">VAT & WHT Calculator</h2>
        <p className="text-sm text-gray-500 mt-1">
          Calculate your VAT return and withholding tax obligations in line with FIRS requirements.
        </p>
      </div>

      {/* Sub-tabs */}
      <div className="flex gap-1 border-b border-gray-200">
        {([
          { key: 'vat', label: 'Value Added Tax (VAT)', badge: '7.5%' },
          { key: 'wht', label: 'Withholding Tax (WHT)', badge: '5–10%' },
        ] as { key: Tab; label: string; badge: string }[]).map((t) => (
          <button
            key={t.key}
            onClick={() => setActiveTab(t.key)}
            className={`px-5 py-2.5 text-sm font-medium rounded-t-lg border-b-2 transition-colors flex items-center gap-2 -mb-px ${
              activeTab === t.key
                ? 'border-primary-600 text-primary-700 bg-primary-50'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            {t.label}
            <InfoBadge text={t.badge} />
          </button>
        ))}
      </div>

      {activeTab === 'vat' && <VATTab />}
      {activeTab === 'wht' && <WHTTab />}
    </div>
  );
};

export default VATWHTCalculator;

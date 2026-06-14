import React, { useState } from 'react';
import { useAuth, Revenue, Expense } from '../context/AuthContext';
import { formatCurrency } from '../utils/taxCalculations';
import { analytics } from '../utils/analytics';
import { VATTab, WHTTab } from './VATWHTCalculator';
import CashFlowRecommendations from './CashFlowRecommendations';

type FinancialType = 'revenue' | 'expense' | 'cashflow' | 'vat' | 'wht';

const REVENUE_CATEGORIES = [
  'Sales Revenue',
  'Service Income',
  'Interest Income',
  'Rental Income',
  'Grants & Subsidies',
  'Other Income',
];

const EXPENSE_CATEGORIES = [
  'Salaries & Wages',
  'Rent & Utilities',
  'Office Supplies',
  'Marketing & Advertising',
  'Travel & Transport',
  'Professional Fees',
  'Equipment & Assets',
  'Training & Development',
  'Insurance',
  'Repairs & Maintenance',
  'Other Expenses',
];

const EMPTY_FORM = {
  description: '',
  amount: '',
  category: '',
  date: new Date().toISOString().split('T')[0],
  reference: '',
  notes: '',
};

const FinancialTracker: React.FC = () => {
  const { revenues, expenses, addRevenue, removeRevenue, addExpense, removeExpense } = useAuth();
  const [activeType, setActiveType] = useState<FinancialType>('revenue');
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState(EMPTY_FORM);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  const totalRevenue = revenues.reduce((sum, r) => sum + r.amount, 0);
  const totalExpenses = expenses.reduce((sum, e) => sum + e.amount, 0);
  const netProfit = totalRevenue - totalExpenses;

  const isTrackerTab = activeType === 'revenue' || activeType === 'expense';
  const isCashFlow = activeType === 'cashflow';
  const entries: (Revenue | Expense)[] = activeType === 'revenue' ? revenues : expenses;
  const categories = activeType === 'revenue' ? REVENUE_CATEGORIES : EXPENSE_CATEGORIES;

  const handleTypeSwitch = (type: FinancialType) => {
    setActiveType(type);
    setShowForm(false);
    setFormData(EMPTY_FORM);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      const payload = {
        description: formData.description,
        amount: parseFloat(formData.amount),
        category: formData.category,
        date: new Date(formData.date),
        reference: formData.reference || undefined,
        notes: formData.notes || undefined,
      };
      if (activeType === 'revenue') {
        await addRevenue(payload);
        analytics.revenueAdded(payload.amount);
      } else {
        await addExpense(payload);
        analytics.expenseAdded(payload.amount);
      }
      setFormData(EMPTY_FORM);
      setShowForm(false);
    } finally {
      setIsSubmitting(false);
    }
  };

  const field = (key: keyof typeof formData) => (
    (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) =>
      setFormData((prev) => ({ ...prev, [key]: e.target.value }))
  );

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid md:grid-cols-3 gap-4">
        <div className="bg-green-50 rounded-lg p-4 border border-green-100">
          <div className="text-green-600 text-sm font-medium">Total Revenue</div>
          <div className="text-2xl font-bold text-green-800 mt-1">{formatCurrency(totalRevenue)}</div>
          <div className="text-xs text-green-600 mt-1">{revenues.length} {revenues.length === 1 ? 'entry' : 'entries'}</div>
        </div>
        <div className="bg-red-50 rounded-lg p-4 border border-red-100">
          <div className="text-red-600 text-sm font-medium">Total Expenses</div>
          <div className="text-2xl font-bold text-red-800 mt-1">{formatCurrency(totalExpenses)}</div>
          <div className="text-xs text-red-600 mt-1">{expenses.length} {expenses.length === 1 ? 'entry' : 'entries'}</div>
        </div>
        <div className={`rounded-lg p-4 border ${netProfit >= 0 ? 'bg-emerald-50 border-emerald-100' : 'bg-orange-50 border-orange-100'}`}>
          <div className={`text-sm font-medium ${netProfit >= 0 ? 'text-emerald-600' : 'text-orange-600'}`}>
            Net {netProfit >= 0 ? 'Profit' : 'Loss'}
          </div>
          <div className={`text-2xl font-bold mt-1 ${netProfit >= 0 ? 'text-emerald-800' : 'text-orange-800'}`}>
            {formatCurrency(Math.abs(netProfit))}
          </div>
          <div className={`text-xs mt-1 ${netProfit >= 0 ? 'text-emerald-600' : 'text-orange-600'}`}>
            Revenue minus expenses
          </div>
        </div>
      </div>

      {/* Type Toggle + Add Button */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex gap-1 p-1 bg-gray-100 rounded-lg">
          <button
            onClick={() => handleTypeSwitch('revenue')}
            className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
              activeType === 'revenue' ? 'bg-white shadow text-green-700' : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            Revenue
          </button>
          <button
            onClick={() => handleTypeSwitch('expense')}
            className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
              activeType === 'expense' ? 'bg-white shadow text-red-700' : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            Expenses
          </button>
          <button
            onClick={() => handleTypeSwitch('cashflow')}
            className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
              activeType === 'cashflow' ? 'bg-white shadow text-emerald-700' : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            Cash Flow
          </button>
          <button
            onClick={() => handleTypeSwitch('vat')}
            className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
              activeType === 'vat' ? 'bg-white shadow text-blue-700' : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            VAT
          </button>
          <button
            onClick={() => handleTypeSwitch('wht')}
            className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
              activeType === 'wht' ? 'bg-white shadow text-amber-700' : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            WHT
          </button>
        </div>
        {isTrackerTab && (
          <button
            onClick={() => setShowForm((v) => !v)}
            className={`px-4 py-2 rounded-lg text-sm font-medium text-white transition-colors ${
              activeType === 'revenue'
                ? 'bg-green-600 hover:bg-green-700'
                : 'bg-red-600 hover:bg-red-700'
            }`}
          >
            {showForm ? 'Cancel' : `+ Add ${activeType === 'revenue' ? 'Revenue' : 'Expense'}`}
          </button>
        )}
      </div>

      {/* Cash Flow */}
      {isCashFlow && (
        <div className="space-y-4">
          <div>
            <h3 className="text-base font-semibold text-gray-800">Cash Flow & Profit Recommendations</h3>
            <p className="text-xs text-gray-500 mt-0.5">
              AI-powered analysis of your revenue vs expenses with tailored actions for your Nigerian business.
            </p>
          </div>
          <CashFlowRecommendations revenues={revenues} expenses={expenses} />
        </div>
      )}

      {/* VAT / WHT calculators */}
      {activeType === 'vat' && <VATTab />}
      {activeType === 'wht' && <WHTTab />}

      {/* Add Form */}
      {isTrackerTab && showForm && (
        <form
          onSubmit={handleSubmit}
          className="bg-gray-50 rounded-lg p-5 border border-gray-200 space-y-4"
        >
          <h3 className="font-semibold text-gray-800">
            New {activeType === 'revenue' ? 'Revenue' : 'Expense'} Entry
          </h3>

          <div className="grid md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Description *</label>
              <input
                type="text"
                required
                value={formData.description}
                onChange={field('description')}
                placeholder={
                  activeType === 'revenue'
                    ? 'e.g., Client payment — Project X'
                    : 'e.g., Office rent — April'
                }
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent text-sm"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Amount (₦) *</label>
              <input
                type="number"
                required
                min="0"
                step="0.01"
                value={formData.amount}
                onChange={field('amount')}
                placeholder="0.00"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent text-sm"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Category *</label>
              <select
                required
                value={formData.category}
                onChange={field('category')}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent text-sm"
              >
                <option value="">Select category…</option>
                {categories.map((cat) => (
                  <option key={cat} value={cat}>{cat}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Date *</label>
              <input
                type="date"
                required
                value={formData.date}
                onChange={field('date')}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent text-sm"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Reference No.</label>
              <input
                type="text"
                value={formData.reference}
                onChange={field('reference')}
                placeholder="Invoice / receipt number"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent text-sm"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
              <input
                type="text"
                value={formData.notes}
                onChange={field('notes')}
                placeholder="Additional notes…"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent text-sm"
              />
            </div>
          </div>

          <div className="flex justify-end">
            <button
              type="submit"
              disabled={isSubmitting}
              className={`px-6 py-2 rounded-lg text-white text-sm font-medium transition-colors disabled:opacity-50 ${
                activeType === 'revenue'
                  ? 'bg-green-600 hover:bg-green-700'
                  : 'bg-red-600 hover:bg-red-700'
              }`}
            >
              {isSubmitting ? 'Saving…' : `Save ${activeType === 'revenue' ? 'Revenue' : 'Expense'}`}
            </button>
          </div>
        </form>
      )}

      {/* Entries List */}
      {isTrackerTab && <div>
        <h3 className="text-base font-semibold text-gray-800 mb-3">
          {activeType === 'revenue' ? 'Revenue' : 'Expense'} Entries ({entries.length})
        </h3>

        {entries.length === 0 ? (
          <div className="text-center py-10 text-gray-400">
            <div className={`w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-3 ${
              activeType === 'revenue' ? 'bg-green-50' : 'bg-red-50'
            }`}>
              <svg className={`w-6 h-6 ${activeType === 'revenue' ? 'text-green-400' : 'text-red-400'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
              </svg>
            </div>
            <p className="text-sm">No {activeType === 'revenue' ? 'revenue' : 'expense'} entries yet.</p>
            <p className="text-xs mt-1">Click the button above to add your first entry.</p>
          </div>
        ) : (
          <div className="space-y-2">
            {entries.map((entry) => (
              <div
                key={entry.id}
                className="flex items-center justify-between p-4 bg-white border border-gray-200 rounded-lg hover:border-gray-300 transition-colors"
              >
                <div className="flex items-center gap-3 flex-1 min-w-0">
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 ${
                    activeType === 'revenue' ? 'bg-green-100 text-green-600' : 'bg-red-100 text-red-600'
                  }`}>
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      {activeType === 'revenue' ? (
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 11l5-5m0 0l5 5m-5-5v12" />
                      ) : (
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 13l-5 5m0 0l-5-5m5 5V6" />
                      )}
                    </svg>
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="font-medium text-gray-800 truncate">{entry.description}</div>
                    <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                      <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                        activeType === 'revenue' ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'
                      }`}>
                        {entry.category}
                      </span>
                      <span className="text-xs text-gray-500">
                        {new Date(entry.date).toLocaleDateString('en-NG', { dateStyle: 'medium' })}
                      </span>
                      {entry.reference && (
                        <span className="text-xs text-gray-400">Ref: {entry.reference}</span>
                      )}
                    </div>
                    {entry.notes && (
                      <div className="text-xs text-gray-400 mt-0.5 truncate">{entry.notes}</div>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-3 flex-shrink-0 ml-4">
                  <div className={`font-semibold text-base ${activeType === 'revenue' ? 'text-green-600' : 'text-red-600'}`}>
                    {activeType === 'expense' ? '−' : '+'}{formatCurrency(entry.amount)}
                  </div>
                  {confirmDeleteId === entry.id ? (
                    <div className="flex items-center gap-1">
                      <span className="text-xs text-gray-500 mr-1">Delete?</span>
                      <button
                        onClick={() => {
                          activeType === 'revenue' ? removeRevenue(entry.id) : removeExpense(entry.id);
                          setConfirmDeleteId(null);
                        }}
                        className="px-2 py-1 text-xs bg-red-500 text-white rounded hover:bg-red-600 transition-colors font-medium"
                      >
                        Yes
                      </button>
                      <button
                        onClick={() => setConfirmDeleteId(null)}
                        className="px-2 py-1 text-xs border border-gray-300 text-gray-600 rounded hover:bg-gray-50 transition-colors"
                      >
                        No
                      </button>
                    </div>
                  ) : (
                    <button
                      onClick={() => setConfirmDeleteId(entry.id)}
                      className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                      title="Delete entry"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>}
    </div>
  );
};

export default FinancialTracker;

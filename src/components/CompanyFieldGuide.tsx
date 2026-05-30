import React from 'react';

interface CompanyFieldGuideProps {
  onClose: () => void;
}

const CompanyFieldGuide: React.FC<CompanyFieldGuideProps> = ({ onClose }) => (
  <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50" onClick={onClose}>
    <div className="bg-white rounded-xl shadow-2xl max-w-lg w-full max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
      <div className="flex items-center justify-between p-5 border-b border-gray-200 bg-primary-50 rounded-t-xl">
        <div className="flex items-center gap-2">
          <svg className="w-6 h-6 text-primary-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
          </svg>
          <h3 className="text-lg font-bold text-gray-800">Understanding the Fields</h3>
        </div>
        <button onClick={onClose} className="p-1 text-gray-400 hover:text-gray-600 rounded-full hover:bg-gray-100">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      <div className="p-5 space-y-5">
        <div className="p-4 bg-blue-50 rounded-lg border border-blue-100">
          <h4 className="text-sm font-bold text-blue-800 mb-2">Annual Turnover</h4>
          <p className="text-sm text-gray-700 mb-2">Your company's <strong>total revenue from sales</strong> of goods or services during the financial year, before subtracting any expenses.</p>
          <div className="text-xs text-gray-600 space-y-1">
            <p><strong>Example:</strong> If your shop sold goods worth ₦40M in the year, your annual turnover is ₦40,000,000.</p>
            <p><strong>Where to find it:</strong> Top line of your income statement / profit & loss account.</p>
            <p><strong>Why it matters:</strong> Determines your company size classification (small ≤ ₦100M = 0% CIT, exempt from 4% levy).</p>
          </div>
        </div>

        <div className="p-4 bg-green-50 rounded-lg border border-green-100">
          <h4 className="text-sm font-bold text-green-800 mb-2">Fixed Assets Value</h4>
          <p className="text-sm text-gray-700 mb-2">The <strong>total value of long-term physical assets</strong> your company owns and uses for business operations (not for resale).</p>
          <div className="text-xs text-gray-600 space-y-1">
            <p><strong>Includes:</strong> Land, buildings, machinery, equipment, vehicles, furniture, computers.</p>
            <p><strong>Example:</strong> Office building ₦100M + delivery vans ₦20M + computers ₦5M = ₦125,000,000.</p>
            <p><strong>Where to find it:</strong> Balance sheet under "Property, Plant & Equipment" or "Non-Current Assets".</p>
            <p><strong>Why it matters:</strong> Along with turnover, determines if your company qualifies as "small" (assets &lt; ₦250M).</p>
          </div>
        </div>

        <div className="p-4 bg-orange-50 rounded-lg border border-orange-100">
          <h4 className="text-sm font-bold text-orange-800 mb-2">Assessable Profit</h4>
          <p className="text-sm text-gray-700 mb-2">Your company's <strong>profit before tax deductions and capital allowances</strong> are applied. Think of it as your "starting profit" for tax purposes.</p>
          <div className="text-xs text-gray-600 space-y-1">
            <p><strong>How to calculate:</strong> Total Revenue - Operating Expenses (salaries, rent, utilities, materials, etc.).</p>
            <p><strong>Example:</strong> Revenue ₦40M - Expenses ₦28M = Assessable Profit of ₦12,000,000.</p>
            <p><strong>Where to find it:</strong> "Profit Before Tax" on your income statement (before applying capital allowances).</p>
            <p><strong>Why it matters:</strong> The 4% Development Levy is calculated on this figure. CIT is calculated after deductions.</p>
          </div>
        </div>

        <div className="p-4 bg-purple-50 rounded-lg border border-purple-100">
          <h4 className="text-sm font-bold text-purple-800 mb-2">Capital Allowances</h4>
          <p className="text-sm text-gray-700 mb-2">A <strong>tax deduction for wear and tear</strong> on your business assets. Similar to depreciation but uses rates set by tax law.</p>
          <div className="text-xs text-gray-600 space-y-1">
            <p><strong>Typical rates:</strong> Initial allowance (up to 50%) in the first year + annual allowance (10-25%) thereafter.</p>
            <p><strong>Example:</strong> You bought machinery for ₦10M. Year 1: 50% initial = ₦5M allowance. Year 2+: 25% annual on the remainder.</p>
            <p><strong>What qualifies:</strong> Machinery, equipment, vehicles, buildings, furniture, IT equipment used for business.</p>
            <p><strong>Why it matters:</strong> Reduces your taxable profit, directly lowering your CIT bill.</p>
          </div>
        </div>
      </div>

      <div className="p-4 border-t border-gray-200 bg-gray-50 rounded-b-xl">
        <button onClick={onClose} className="w-full px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors text-sm font-medium">
          Got it
        </button>
      </div>
    </div>
  </div>
);

export default CompanyFieldGuide;

import React from 'react';

interface CompanyTaxNotesProps {
  showNotes: boolean;
  onToggle: () => void;
}

const CompanyTaxNotes: React.FC<CompanyTaxNotesProps> = ({ showNotes, onToggle }) => (
  <div className="bg-white rounded-lg shadow-md overflow-hidden">
    <button
      onClick={onToggle}
      className="w-full px-6 py-4 flex items-center justify-between text-left hover:bg-gray-50 transition-colors"
    >
      <div className="flex items-center">
        <svg className="w-5 h-5 text-primary-600 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
        <div>
          <h3 className="text-lg font-semibold text-gray-800">Important Notes (NTA 2025)</h3>
          <p className="text-xs text-gray-500">Click to {showNotes ? 'hide' : 'view'} tax rules and guidelines</p>
        </div>
      </div>
      <svg
        className={`w-5 h-5 text-gray-400 transition-transform ${showNotes ? 'rotate-180' : ''}`}
        fill="none" stroke="currentColor" viewBox="0 0 24 24"
      >
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
      </svg>
    </button>

    {showNotes && (
      <div className="px-6 pb-6 border-t border-gray-100">
        <ul className="text-sm text-gray-600 space-y-2 mt-4">
          <li className="flex items-start">
            <span className="text-green-500 mr-2">•</span>
            <span><strong>Small Company Exemption:</strong> Turnover ≤ ₦100M AND Fixed Assets &lt; ₦250M = 0% CIT and exempt from 4% Development Levy</span>
          </li>
          <li className="flex items-start">
            <span className="text-red-500 mr-2">•</span>
            <span><strong>CIT (30%):</strong> Calculated on <strong>Taxable Profit</strong> (Assessable Profit - Allowable Deductions + Asset Gains)</span>
          </li>
          <li className="flex items-start">
            <span className="text-orange-500 mr-2">•</span>
            <span><strong>Development Levy (4%):</strong> Calculated on <strong>Assessable Profit only</strong> (non-residents exempt)</span>
          </li>
          <li className="flex items-start">
            <span className="text-purple-500 mr-2">•</span>
            <span><strong>15% Minimum ETR:</strong> Large companies (turnover &gt;₦50B) or MNEs (global turnover &gt;€750M) - OECD Pillar II</span>
          </li>
          <li className="flex items-start">
            <span className="text-primary-500 mr-2">•</span>
            <span><strong>Professional Services:</strong> Lawyers, accountants, consultants excluded from small company exemption</span>
          </li>
          <li className="flex items-start">
            <span className="text-primary-500 mr-2">•</span>
            <span><strong>Filing Deadline:</strong> Within 6 months of accounting year end</span>
          </li>
          <li className="flex items-start">
            <span className="text-gray-400 mr-2">•</span>
            <span>This calculator provides estimates. Consult Nigeria Revenue Service for official filing.</span>
          </li>
        </ul>
      </div>
    )}
  </div>
);

export default CompanyTaxNotes;

import React, { useState } from 'react';
import {
  TaxRecommendation,
  calculateTotalPotentialSavings,
} from '../utils/taxRecommendations';
import { formatCurrency } from '../utils/taxCalculations';

interface TaxRecommendationsProps {
  recommendations: TaxRecommendation[];
  onApplyRecommendation?: (actionType: string) => void;
}

const TaxRecommendations: React.FC<TaxRecommendationsProps> = ({
  recommendations,
  onApplyRecommendation,
}) => {
  const [expandedId, setExpandedId] = useState<string | null>(null);

  if (recommendations.length === 0) {
    return null;
  }

  const totalSavings = calculateTotalPotentialSavings(recommendations);

  const getCategoryIcon = (category: TaxRecommendation['category']) => {
    switch (category) {
      case 'deduction':
        return (
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 14l6-6m-5.5.5h.01m4.99 5h.01M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16l3.5-2 3.5 2 3.5-2 3.5 2z" />
          </svg>
        );
      case 'exemption':
        return (
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
          </svg>
        );
      case 'timing':
        return (
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        );
      case 'structure':
        return (
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
          </svg>
        );
    }
  };

  const getPriorityStyles = (priority: TaxRecommendation['priority']) => {
    switch (priority) {
      case 'high':
        return 'bg-red-100 text-red-700 border-red-200';
      case 'medium':
        return 'bg-yellow-100 text-yellow-700 border-yellow-200';
      case 'low':
        return 'bg-blue-100 text-blue-700 border-blue-200';
    }
  };

  const getPriorityLabel = (priority: TaxRecommendation['priority']) => {
    switch (priority) {
      case 'high':
        return 'High Priority';
      case 'medium':
        return 'Medium Priority';
      case 'low':
        return 'Low Priority';
    }
  };

  return (
    <div className="bg-white rounded-lg shadow-md p-6">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center">
          <svg className="w-6 h-6 text-primary-600 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
          </svg>
          <h2 className="text-xl font-semibold text-gray-800">Tax Optimization Recommendations</h2>
        </div>
        {totalSavings > 0 && (
          <div className="text-right">
            <p className="text-xs text-gray-500">Potential Savings</p>
            <p className="text-lg font-bold text-green-600">{formatCurrency(totalSavings)}</p>
          </div>
        )}
      </div>

      <div className="space-y-3">
        {recommendations.map((rec) => (
          <div
            key={rec.id}
            className={`border rounded-lg transition-all duration-200 ${
              expandedId === rec.id ? 'shadow-md' : 'hover:shadow-sm'
            }`}
          >
            <button
              onClick={() => setExpandedId(expandedId === rec.id ? null : rec.id)}
              className="w-full p-4 text-left"
            >
              <div className="flex items-start justify-between">
                <div className="flex items-start space-x-3">
                  <div className="flex-shrink-0 mt-0.5 text-primary-600">
                    {getCategoryIcon(rec.category)}
                  </div>
                  <div>
                    <h3 className="font-medium text-gray-800">{rec.title}</h3>
                    <div className="flex items-center space-x-2 mt-1">
                      <span className={`text-xs px-2 py-0.5 rounded-full border ${getPriorityStyles(rec.priority)}`}>
                        {getPriorityLabel(rec.priority)}
                      </span>
                      {rec.potentialSavings > 0 && (
                        <span className="text-xs text-green-600 font-medium">
                          Save up to {formatCurrency(rec.potentialSavings)}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
                <svg
                  className={`w-5 h-5 text-gray-400 transition-transform ${
                    expandedId === rec.id ? 'rotate-180' : ''
                  }`}
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </div>
            </button>

            {expandedId === rec.id && (
              <div className="px-4 pb-4 pt-0">
                <div className="pl-8">
                  <p className="text-sm text-gray-600 mb-3">{rec.description}</p>
                  {rec.actionType && onApplyRecommendation && (
                    <button
                      onClick={() => onApplyRecommendation(rec.actionType!)}
                      className="px-4 py-2 bg-primary-600 text-white text-sm rounded-lg hover:bg-primary-700 transition-colors flex items-center"
                    >
                      <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                      Apply This Recommendation
                    </button>
                  )}
                </div>
              </div>
            )}
          </div>
        ))}
      </div>

      <p className="text-xs text-gray-500 mt-4">
        * Recommendations are based on NTA 2025 provisions. Consult Nigeria Revenue Service for personalized advice.
      </p>
      <p className="text-xs text-gray-400 mt-2 text-center">© Tech84</p>
    </div>
  );
};

export default TaxRecommendations;

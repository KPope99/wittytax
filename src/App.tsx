import React, { useState } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import PersonalTaxCalculator from './components/PersonalTaxCalculator';
import CompanyTaxCalculator from './components/CompanyTaxCalculator';
import CountdownTimer from './components/CountdownTimer';
import TaxChat from './components/TaxChat';
import Login from './components/Login';
import Dashboard from './components/Dashboard';

type TabType = 'personal' | 'company';

const AppContent: React.FC = () => {
  const [activeTab, setActiveTab] = useState<TabType>('personal');
  const [showLogin, setShowLogin] = useState(false);
  const [showDashboard, setShowDashboard] = useState(false);
  const [showTaxBands, setShowTaxBands] = useState(false);
  const [showImportantNotes, setShowImportantNotes] = useState(false);

  const { isAuthenticated, user } = useAuth();

  return (
    <div className="min-h-screen bg-gray-100">
      {/* Header */}
      <header className="bg-gradient-to-r from-primary-700 to-primary-600 text-white shadow-lg">
        <div className="max-w-4xl mx-auto px-4 py-6">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center">
              <svg className="w-8 h-8 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
              </svg>
              <div>
                <h1 className="text-2xl md:text-3xl font-bold">WittyTax</h1>
                <p className="text-primary-100 text-sm">
                  Your Smart Tax Assistant for Small and Large Businesses
                </p>
              </div>
            </div>

            {/* Auth Buttons */}
            <div className="flex items-center gap-2">
              {isAuthenticated ? (
                <button
                  onClick={() => setShowDashboard(true)}
                  className="flex items-center gap-2 px-4 py-2 bg-white/20 hover:bg-white/30 rounded-lg text-sm font-medium transition-colors"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                  </svg>
                  <span className="hidden sm:inline">{user?.companyName}</span>
                  <span className="sm:hidden">Dashboard</span>
                </button>
              ) : (
                <button
                  onClick={() => setShowLogin(true)}
                  className="flex items-center gap-2 px-4 py-2 bg-white text-primary-700 hover:bg-primary-50 rounded-lg text-sm font-medium transition-colors"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 16l-4-4m0 0l4-4m-4 4h14m-5 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h7a3 3 0 013 3v1" />
                  </svg>
                  Login
                </button>
              )}
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-6">
        {/* Countdown Timer */}
        <div className="mb-6">
          <CountdownTimer />
        </div>

        {/* Tab Navigation */}
        <div className="bg-white rounded-lg shadow-md mb-6">
          <div className="flex border-b border-gray-200">
            <button
              onClick={() => setActiveTab('personal')}
              className={`flex-1 px-4 py-4 text-sm font-medium transition-colors ${
                activeTab === 'personal'
                  ? 'text-primary-700 border-b-2 border-primary-700 bg-primary-50'
                  : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'
              }`}
            >
              <div className="flex items-center justify-center">
                <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                </svg>
                Personal Tax
              </div>
            </button>
            <button
              onClick={() => setActiveTab('company')}
              className={`flex-1 px-4 py-4 text-sm font-medium transition-colors ${
                activeTab === 'company'
                  ? 'text-primary-700 border-b-2 border-primary-700 bg-primary-50'
                  : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'
              }`}
            >
              <div className="flex items-center justify-center">
                <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                </svg>
                Company Tax
              </div>
            </button>
          </div>
        </div>

        {/* Tab Content */}
        {activeTab === 'personal' && <PersonalTaxCalculator />}
        {activeTab === 'company' && <CompanyTaxCalculator />}

        {/* Tax Bands Reference - Collapsible */}
        {activeTab === 'personal' && (
          <div className="mt-6 bg-white rounded-lg shadow-md overflow-hidden">
            <button
              onClick={() => setShowTaxBands(!showTaxBands)}
              className="w-full px-6 py-4 flex items-center justify-between text-left hover:bg-gray-50 transition-colors"
            >
              <div className="flex items-center">
                <svg className="w-5 h-5 text-primary-600 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                </svg>
                <div>
                  <h3 className="text-lg font-semibold text-gray-800">
                    Personal Income Tax Bands (NTA 2025)
                  </h3>
                  <p className="text-xs text-gray-500">Click to {showTaxBands ? 'hide' : 'view'} tax rate details</p>
                </div>
              </div>
              <svg
                className={`w-5 h-5 text-gray-400 transition-transform ${showTaxBands ? 'rotate-180' : ''}`}
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </button>

            {showTaxBands && (
              <div className="px-6 pb-6 border-t border-gray-100">
                <div className="overflow-x-auto mt-4">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="bg-primary-50">
                        <th className="px-4 py-2 text-left text-primary-700">Annual Income Range</th>
                        <th className="px-4 py-2 text-right text-primary-700">Tax Rate</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr className="border-t border-gray-100">
                        <td className="px-4 py-2 text-gray-600">Up to N800,000</td>
                        <td className="px-4 py-2 text-right font-medium text-green-600">0%</td>
                      </tr>
                      <tr className="border-t border-gray-100 bg-gray-50">
                        <td className="px-4 py-2 text-gray-600">N800,001 - N3,000,000</td>
                        <td className="px-4 py-2 text-right font-medium text-yellow-600">15%</td>
                      </tr>
                      <tr className="border-t border-gray-100">
                        <td className="px-4 py-2 text-gray-600">N3,000,001 - N12,000,000</td>
                        <td className="px-4 py-2 text-right font-medium text-yellow-600">18%</td>
                      </tr>
                      <tr className="border-t border-gray-100 bg-gray-50">
                        <td className="px-4 py-2 text-gray-600">N12,000,001 - N25,000,000</td>
                        <td className="px-4 py-2 text-right font-medium text-orange-600">21%</td>
                      </tr>
                      <tr className="border-t border-gray-100">
                        <td className="px-4 py-2 text-gray-600">N25,000,001 - N50,000,000</td>
                        <td className="px-4 py-2 text-right font-medium text-orange-600">23%</td>
                      </tr>
                      <tr className="border-t border-gray-100 bg-gray-50">
                        <td className="px-4 py-2 text-gray-600">Over N50,000,000</td>
                        <td className="px-4 py-2 text-right font-medium text-red-600">25%</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
                <p className="text-xs text-gray-500 mt-3">
                  * Tax is calculated progressively. Each rate applies only to income within that band.
                </p>
              </div>
            )}
          </div>
        )}

        {/* Important Notes - Collapsible */}
        <div className="mt-6 bg-yellow-50 border border-yellow-200 rounded-lg overflow-hidden">
          <button
            onClick={() => setShowImportantNotes(!showImportantNotes)}
            className="w-full px-4 py-3 flex items-center justify-between text-left hover:bg-yellow-100 transition-colors"
          >
            <div className="flex items-center">
              <svg className="w-5 h-5 text-yellow-600 mr-2 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <div>
                <h4 className="text-sm font-semibold text-yellow-800">Important Notes (NTA 2025)</h4>
                <p className="text-xs text-yellow-600">Click for disclaimer and important information</p>
              </div>
            </div>
            <svg
              className={`w-5 h-5 text-yellow-600 transition-transform ${showImportantNotes ? 'rotate-180' : ''}`}
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </button>

          {showImportantNotes && (
            <div className="px-4 pb-4 border-t border-yellow-200">
              <div className="mt-3 space-y-3">
                <div className="flex items-start">
                  <svg className="w-4 h-4 text-yellow-600 mr-2 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                  </svg>
                  <div>
                    <p className="text-sm font-medium text-yellow-800">Disclaimer</p>
                    <p className="text-xs text-yellow-700 mt-1">
                      This calculator provides estimates based on the Nigeria Tax Act 2025.
                      For accurate tax calculations and filing, please consult a qualified tax professional
                      or the Nigeria Revenue Service (NRS). The calculations provided here are for
                      informational purposes only and should not be considered as tax advice.
                    </p>
                  </div>
                </div>

                <div className="flex items-start">
                  <svg className="w-4 h-4 text-yellow-600 mr-2 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <div>
                    <p className="text-sm font-medium text-yellow-800">NTA 2025 Key Changes</p>
                    <ul className="text-xs text-yellow-700 mt-1 list-disc list-inside space-y-1">
                      <li>New 0% tax band for income up to ₦800,000</li>
                      <li>Share transfer exemption threshold: ₦150M (up from ₦100M)</li>
                      <li>Compensation exemption threshold: ₦50M (up from ₦10M)</li>
                      <li>Small company exemption for turnover ≤ ₦50M</li>
                    </ul>
                  </div>
                </div>

                <div className="flex items-start">
                  <svg className="w-4 h-4 text-yellow-600 mr-2 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                  <div>
                    <p className="text-sm font-medium text-yellow-800">Filing Deadlines</p>
                    <p className="text-xs text-yellow-700 mt-1">
                      Personal Income Tax: March 31, 2026 | Company Income Tax: June 30, 2026
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </main>

      {/* Footer */}
      <footer className="bg-secondary-800 text-white mt-12">
        <div className="max-w-4xl mx-auto px-4 py-6">
          <div className="text-center">
            <p className="text-sm text-gray-300">
              WittyTax - Your Smart Tax Assistant for Small and Large Businesses
            </p>
            <p className="text-xs text-gray-400 mt-2">
              For official tax information, visit the Nigeria Revenue Service (NRS)
            </p>
            <p className="text-xs text-gray-500 mt-4">
              All currency amounts are in Nigerian Naira (₦)
            </p>
            <p className="text-xs text-gray-400 mt-4">
              © Tech84
            </p>
          </div>
        </div>
      </footer>

      {/* Tax Chat */}
      <TaxChat />

      {/* Login Modal */}
      {showLogin && <Login onClose={() => setShowLogin(false)} />}

      {/* Dashboard Modal */}
      {showDashboard && <Dashboard onClose={() => setShowDashboard(false)} />}
    </div>
  );
};

function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}

export default App;

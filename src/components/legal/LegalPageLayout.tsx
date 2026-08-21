import React from 'react';

interface LegalPageLayoutProps {
  title: string;
  subtitle: string;
  lastUpdated?: string;
  onBack: () => void;
  children: React.ReactNode;
}

const LegalPageLayout: React.FC<LegalPageLayoutProps> = ({ title, subtitle, lastUpdated, onBack, children }) => {
  return (
    <div className="min-h-screen bg-gray-100">
      <header className="bg-gradient-to-r from-primary-900 to-primary-700 text-white shadow-lg">
        <div className="max-w-4xl mx-auto px-4 py-8">
          <button
            onClick={onBack}
            className="flex items-center gap-2 text-primary-100 hover:text-white text-sm font-medium mb-4 transition-colors"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            Back to WittyTax
          </button>
          <h1 className="text-3xl font-bold">{title}</h1>
          <p className="text-primary-100 mt-1">{subtitle}</p>
          {lastUpdated && (
            <p className="text-primary-200 text-xs mt-3">Last updated: {lastUpdated}</p>
          )}
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-8">
        <div className="bg-white rounded-xl shadow-md p-6 md:p-8">
          {children}
        </div>
      </main>

      <footer className="border-t border-gray-200 py-6 text-center text-xs text-gray-400">
        <p className="text-gray-500 font-medium mb-1">WittyTax · Made for Nigerian Taxpayers</p>
        <p>© Tech84 Alliance · support@tech84alliance.com</p>
      </footer>
    </div>
  );
};

export default LegalPageLayout;

export const SectionHeading: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <h2 className="text-lg font-semibold text-gray-800 mt-6 mb-2 first:mt-0">{children}</h2>
);

export const P: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <p className="text-sm text-gray-600 leading-relaxed mb-3">{children}</p>
);

export const Ul: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <ul className="text-sm text-gray-600 leading-relaxed mb-3 list-disc list-inside space-y-1">{children}</ul>
);

import React from 'react';

type TabType = 'personal' | 'company';

interface HomePageProps {
  onGetStarted: (tab?: TabType) => void;
  onLogin: () => void;
}

const NigeriaFlag: React.FC<{ className?: string }> = ({ className = '' }) => (
  <svg
    viewBox="0 0 30 20"
    className={className}
    style={{ display: 'inline-block', verticalAlign: 'middle' }}
    aria-label="Nigerian flag"
  >
    <rect x="0" width="10" height="20" fill="#008751" />
    <rect x="10" width="10" height="20" fill="#FFFFFF" />
    <rect x="20" width="10" height="20" fill="#008751" />
  </svg>
);

const features = [
  {
    icon: (
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
    ),
    title: 'Personal Tax',
    description: 'Calculate your PAYE, pension, NHF, and relief deductions based on the Nigeria Tax Act 2025.',
  },
  {
    icon: (
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
    ),
    title: 'Company Tax',
    description: 'Estimate CIT, education levy, and exemptions for small and large businesses instantly.',
  },
  {
    icon: (
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
    ),
    title: 'Smart Reports',
    description: 'Generate downloadable PDF summaries of your tax position and recommended actions.',
  },
  {
    icon: (
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
    ),
    title: 'AI Tax Chat',
    description: 'Ask plain-English questions about Nigerian tax rules and get instant, accurate answers.',
  },
];

const steps = [
  {
    number: '01',
    title: 'Choose your tax type',
    description: 'Select Personal or Company tax — we tailor the form to what you need.',
  },
  {
    number: '02',
    title: 'Enter your figures',
    description: 'Input income, deductions, and allowances. The calculator updates in real time.',
  },
  {
    number: '03',
    title: 'Review & download',
    description: 'See your full tax breakdown and export a PDF report in seconds.',
  },
];

const stats = [
  { value: '₦800k', label: 'Tax-free threshold (NTA 2025)' },
  { value: '₦100M', label: 'Small company CIT exemption' },
  { value: '100%', label: 'Free & Simple' },
];

const HomePage: React.FC<HomePageProps> = ({ onGetStarted, onLogin }) => {
  return (
    <div className="min-h-screen bg-white flex flex-col">

      {/* Nigerian flag top accent bar */}
      <div className="flex h-1.5 w-full">
        <div className="flex-1 bg-primary-600" />
        <div className="flex-1 bg-white border-y border-gray-200" />
        <div className="flex-1 bg-primary-600" />
      </div>

      {/* Nav */}
      <nav className="border-b border-gray-100 bg-white">
        <div className="max-w-5xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <svg className="w-6 h-6 text-primary-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
            </svg>
            <span className="text-lg font-bold text-gray-900">WittyTax</span>
          </div>

          <div className="flex items-center gap-1 sm:gap-2">
            <button
              onClick={() => onGetStarted()}
              className="px-4 py-2 bg-primary-600 hover:bg-primary-700 text-white text-sm font-medium rounded-lg transition-colors"
            >
              Get Started
            </button>
            <button
              onClick={onLogin}
              className="flex items-center gap-1.5 px-4 py-2 text-sm font-medium text-gray-600 hover:text-primary-600 border border-gray-200 hover:border-primary-300 rounded-lg transition-colors"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 16l-4-4m0 0l4-4m-4 4h14m-5 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h7a3 3 0 013 3v1" />
              </svg>
              Login
            </button>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section
        className="relative text-white overflow-hidden"
        style={{
          backgroundImage: 'url(/backdrop.jpg)',
          backgroundSize: 'cover',
          backgroundPosition: 'center',
        }}
      >
        <div className="absolute inset-0 bg-gradient-to-br from-primary-900/90 via-primary-800/80 to-primary-700/75" />

        {/* Decorative flag stripe — left edge */}
        <div className="absolute inset-y-0 left-0 w-2 flex flex-col">
          <div className="flex-1 bg-primary-500/60" />
          <div className="flex-1 bg-white/20" />
          <div className="flex-1 bg-primary-500/60" />
        </div>

        <div className="relative max-w-5xl mx-auto px-6 py-20 text-center">
          {/* Nigeria badge */}
          <div className="inline-flex items-center gap-2 bg-white/15 border border-white/25 rounded-full px-4 py-1.5 mb-6 text-sm font-medium">
            <span>Built for Nigerian Taxpayers · NTA 2025 Compliant</span>
          </div>

          <h1 className="text-4xl md:text-5xl font-extrabold leading-tight mb-5">
            Smart Nigerian Tax<br />Calculations, Simplified
          </h1>
          <p className="text-lg text-primary-100 max-w-xl mx-auto mb-8">
            WittyTax helps individuals and businesses understand and calculate their Nigerian
            tax obligations in minutes — no jargon, no guesswork.
          </p>
          <button
            onClick={() => onGetStarted()}
            className="inline-flex items-center gap-2 px-8 py-3 bg-white text-primary-700 font-semibold rounded-xl shadow-lg hover:bg-primary-50 transition-colors text-base"
          >
            Get Started Free
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </button>
        </div>

        {/* Flag-colored bottom trim */}
        <div className="relative flex h-2">
          <div className="flex-1 bg-primary-500/70" />
          <div className="flex-1 bg-white/30" />
          <div className="flex-1 bg-primary-500/70" />
        </div>
      </section>

      {/* Stats bar */}
      <section className="border-b border-gray-100 bg-primary-50">
        <div className="max-w-5xl mx-auto px-6 py-6">
          <div className="grid grid-cols-3 gap-4 text-center">
            {stats.map((s) => (
              <div key={s.label}>
                <p className="text-xl md:text-2xl font-extrabold text-primary-600">{s.value}</p>
                <p className="text-xs text-gray-500 mt-0.5">{s.label}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* What is WittyTax */}
      <section className="max-w-5xl mx-auto px-6 py-16 text-center">
        <h2 className="text-2xl font-bold text-gray-900 mb-3">What is WittyTax?</h2>
        <p className="text-gray-500 max-w-2xl mx-auto leading-relaxed">
          WittyTax is a free Nigerian tax calculator built on the{' '}
          <span className="font-semibold text-gray-700">Nigeria Tax Act 2025</span>. It helps
          employees, freelancers, and business owners quickly estimate their tax liability,
          understand their deductions, and plan smarter — all without needing an accountant.
        </p>
      </section>

      {/* Features */}
      <section className="bg-gray-50 py-16">
        <div className="max-w-5xl mx-auto px-6">
          <h2 className="text-2xl font-bold text-gray-900 text-center mb-10">Everything you need</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {features.map((f) => (
              <div key={f.title} className="bg-white rounded-xl p-6 shadow-sm border border-gray-100 hover:border-primary-200 hover:shadow-md transition-all">
                <div className="w-10 h-10 bg-primary-50 rounded-lg flex items-center justify-center mb-4">
                  <svg className="w-5 h-5 text-primary-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    {f.icon}
                  </svg>
                </div>
                <h3 className="font-semibold text-gray-900 mb-1">{f.title}</h3>
                <p className="text-sm text-gray-500 leading-relaxed">{f.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* How it works */}
      <section className="max-w-5xl mx-auto px-6 py-16">
        <h2 className="text-2xl font-bold text-gray-900 text-center mb-12">How it works</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {steps.map((step, i) => (
            <div key={step.number} className="flex flex-col items-center text-center relative">
              {i < steps.length - 1 && (
                <div className="hidden md:block absolute top-6 left-[calc(50%+2.5rem)] right-0 h-px border-t-2 border-dashed border-gray-200" />
              )}
              <div className="w-12 h-12 rounded-full bg-primary-600 text-white text-sm font-bold flex items-center justify-center mb-4 z-10">
                {step.number}
              </div>
              <h3 className="font-semibold text-gray-900 mb-2">{step.title}</h3>
              <p className="text-sm text-gray-500 leading-relaxed">{step.description}</p>
            </div>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section className="bg-primary-600 py-14 text-center text-white relative overflow-hidden">
        {/* Subtle flag accent */}
        <div className="absolute inset-y-0 right-0 flex flex-col w-1.5">
          <div className="flex-1 bg-white/20" />
          <div className="flex-1 bg-white/40" />
          <div className="flex-1 bg-white/20" />
        </div>
        <div className="relative">
          <h2 className="text-2xl font-bold mb-3">Ready to calculate your taxes?</h2>
          <p className="text-primary-100 mb-6 text-sm">Takes less than 2 minutes. Free, private, and instant.</p>
          <button
            onClick={() => onGetStarted()}
            className="inline-flex items-center gap-2 px-8 py-3 bg-white text-primary-700 font-semibold rounded-xl shadow hover:bg-primary-50 transition-colors"
          >
            Start Calculating
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </button>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-gray-100 py-6 text-center text-xs text-gray-400">
        <p className="text-gray-500 font-medium mb-1">WittyTax · Made for Nigerian Taxpayers</p>
        <p>© Tech84 Alliance · All amounts in Nigerian Naira (₦)</p>
        <p className="mt-1">Estimates based on NTA 2025. Not professional tax advice.</p>
      </footer>
    </div>
  );
};

export default HomePage;

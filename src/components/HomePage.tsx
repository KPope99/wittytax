import React from 'react';
import { useAuth } from '../context/AuthContext';

type TabType = 'personal' | 'company';

interface HomePageProps {
  onGetStarted: (tab?: TabType) => void;
  onLogin: () => void;
  onOpenDashboard: () => void;
  onOpenPrivacy: () => void;
  onOpenTerms: () => void;
  onOpenAbout: () => void;
}

const scrollToId = (id: string) => {
  document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
};

const benefits = [
  {
    icon: (
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
    ),
    title: 'See your health score',
    description: 'One number that reflects profitability, margin and trend — updated every time you log a calculation or financial entry.',
  },
  {
    icon: (
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
    ),
    title: 'Know what to fix first',
    description: 'Ranked recommendations on revenue, expenses, and cash flow — not a wall of jargon, a short list of what actually moves the needle.',
  },
  {
    icon: (
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
    ),
    title: 'Forecast what’s coming',
    description: 'A rolling six-month forecast shows exactly what tax is coming due and how it affects working capital.',
  },
  {
    icon: (
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
    ),
    title: 'Compliance handled quietly',
    description: 'Your filings, deductions and deadlines are tracked and flagged automatically under NTA 2025 — so compliance stays out of your way.',
  },
];

const steps = [
  {
    number: '01',
    title: 'Connect your records',
    description: 'Link payroll, bank feeds and invoicing — or upload documents directly. The agent takes it from there.',
  },
  {
    number: '02',
    title: 'Get your health picture',
    description: 'Your income, turnover and expenses are turned into a health score, margin trend, and forecast — instantly.',
  },
  {
    number: '03',
    title: 'Act on what it shows you',
    description: 'See what to fix first, and let the agent keep your filings and deadlines current in the background.',
  },
];

const stats = [
  { value: 'Live', label: 'Business health score, recalculated every time you add data' },
  { value: '6 mo.', label: 'Cash-flow forecast, updated as your numbers change' },
  { value: 'Free', label: 'Core tax tools, no card required' },
];

const DashboardMock: React.FC = () => (
  <div className="rounded-2xl bg-cream-50 shadow-2xl border border-black/5 overflow-hidden">
    <div className="flex items-center gap-1.5 px-4 py-3 bg-cream-100 border-b border-black/5">
      <span className="w-2.5 h-2.5 rounded-full bg-red-300" />
      <span className="w-2.5 h-2.5 rounded-full bg-gold-300" />
      <span className="w-2.5 h-2.5 rounded-full bg-primary-300" />
    </div>
    <div className="p-5">
      <div className="flex flex-wrap items-center gap-2 mb-4">
        <span className="font-semibold text-gray-800 text-sm">Adaeze Textiles Ltd — FY2026</span>
        <span className="inline-flex items-center gap-1 text-[11px] font-semibold uppercase tracking-wide bg-gold-100 text-gold-800 px-2 py-0.5 rounded-full">
          <span className="w-1.5 h-1.5 rounded-full bg-gold-600" /> Agent active
        </span>
        <span className="text-[11px] font-semibold uppercase tracking-wide bg-primary-50 text-primary-700 px-2 py-0.5 rounded-full">
          Filing on track
        </span>
      </div>

      <div className="grid grid-cols-3 gap-2 mb-4">
        <div className="bg-white rounded-lg border border-gray-100 p-3">
          <p className="text-lg font-bold text-gray-900">31.8%</p>
          <p className="text-[10px] uppercase tracking-wide text-gray-400">Net margin</p>
        </div>
        <div className="bg-white rounded-lg border border-gray-100 p-3">
          <p className="text-lg font-bold text-gray-900">8 mo.</p>
          <p className="text-[10px] uppercase tracking-wide text-gray-400">Cash runway</p>
        </div>
        <div className="bg-white rounded-lg border border-gray-100 p-3">
          <p className="text-lg font-bold text-gray-900">18 days</p>
          <p className="text-[10px] uppercase tracking-wide text-gray-400">To deadline</p>
        </div>
      </div>

      <div className="bg-white rounded-lg border border-gray-100 p-3 mb-4">
        <p className="text-xs text-gray-500 mb-2">Cash-flow forecast (next 6 months)</p>
        <svg viewBox="0 0 300 80" className="w-full h-16" preserveAspectRatio="none">
          <polyline
            points="0,55 50,45 100,60 150,50 200,25 250,15 300,22"
            fill="none"
            stroke="#224a34"
            strokeWidth="2.5"
          />
          <polygon points="0,55 50,45 100,60 150,50 200,25 250,15 300,22 300,80 0,80" fill="#224a34" opacity="0.08" />
          <circle cx="300" cy="22" r="3.5" fill="#224a34" />
        </svg>
      </div>

      <div className="text-sm divide-y divide-gray-100">
        <div className="flex items-center justify-between py-2">
          <span className="text-gray-600">VAT Returns — Q2 2026</span>
          <span className="text-primary-700 font-medium text-xs">Verified</span>
        </div>
        <div className="flex items-center justify-between py-2">
          <span className="text-gray-600">Payroll Summary — June</span>
          <span className="text-primary-700 font-medium text-xs">Verified</span>
        </div>
        <div className="flex items-center justify-between py-2">
          <span className="text-gray-600">Import Duty Receipts</span>
          <span className="text-gray-400 font-medium text-xs">Pending review</span>
        </div>
      </div>
    </div>
  </div>
);

const HomePage: React.FC<HomePageProps> = ({ onGetStarted, onLogin, onOpenDashboard, onOpenPrivacy, onOpenTerms, onOpenAbout }) => {
  const { isAuthenticated } = useAuth();
  return (
    <div className="min-h-screen bg-cream-50 flex flex-col">

      {/* Nav */}
      <nav className="bg-cream-50 border-b border-black/5">
        <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="font-serif text-xl font-bold text-primary-800">WittyTax</span>
          </div>

          <div className="hidden md:flex items-center gap-8 text-sm text-gray-600">
            <button onClick={() => scrollToId('benefits')} className="hover:text-primary-700 transition-colors">Benefits</button>
            <button onClick={() => scrollToId('the-agent')} className="hover:text-primary-700 transition-colors">How it helps</button>
            <button onClick={() => scrollToId('how-it-works')} className="hover:text-primary-700 transition-colors">How it works</button>
            <button onClick={() => scrollToId('why-wittytax')} className="hover:text-primary-700 transition-colors">Why WittyTax</button>
          </div>

          <div className="flex items-center gap-3">
            {isAuthenticated ? (
              <button onClick={onOpenDashboard} className="text-sm font-semibold text-primary-800 hover:text-primary-600 transition-colors">
                Dashboard
              </button>
            ) : (
              <button onClick={onLogin} className="text-sm font-medium text-gray-600 hover:text-primary-700 transition-colors">
                Login
              </button>
            )}
            <button
              onClick={() => onGetStarted()}
              className="px-4 py-2 bg-primary-800 hover:bg-primary-900 text-white text-sm font-medium rounded-lg transition-colors"
            >
              Get Started
            </button>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section className="relative bg-primary-800 text-white overflow-hidden">
        <div className="absolute inset-0 opacity-[0.06] pointer-events-none" aria-hidden="true">
          <svg width="100%" height="100%">
            <defs>
              <pattern id="hexes" width="42" height="36" patternUnits="userSpaceOnUse">
                <polygon points="21,0 42,10 42,26 21,36 0,26 0,10" fill="none" stroke="white" strokeWidth="1" />
              </pattern>
            </defs>
            <rect width="100%" height="100%" fill="url(#hexes)" />
          </svg>
        </div>

        <div className="relative max-w-6xl mx-auto px-6 py-20 grid lg:grid-cols-2 gap-14 items-center">
          <div>
            <p className="font-serif italic text-gold-200/90 mb-3">For Nigerian MSMEs</p>
            <h1 className="font-serif text-4xl md:text-5xl font-bold leading-[1.1] mb-6">
              Know exactly how <span className="text-gold-300">healthy</span><br />
              your business is — and<br />
              what to do about it
            </h1>
            <p className="text-primary-100/90 max-w-lg mb-8 leading-relaxed">
              WittyTax reads your numbers and tells you where your margin is leaking, where your
              cash flow is about to get tight, and what to fix first — then keeps your tax
              compliance on autopilot in the background.
            </p>
            <div className="flex flex-wrap gap-3">
              <button
                onClick={() => onGetStarted()}
                className="px-6 py-3 bg-gold-400 hover:bg-gold-300 text-primary-900 font-semibold rounded-lg shadow-lg transition-colors"
              >
                See your business health score
              </button>
              <button
                onClick={() => scrollToId('how-it-works')}
                className="px-6 py-3 border border-white/30 hover:border-white/60 text-white font-medium rounded-lg transition-colors"
              >
                See how it works
              </button>
            </div>
          </div>

          <div className="relative">
            <DashboardMock />
          </div>
        </div>
      </section>

      {/* Stats bar */}
      <section className="border-b border-black/5 bg-cream-100">
        <div className="max-w-6xl mx-auto px-6 py-6">
          <div className="grid grid-cols-3 gap-4 text-center">
            {stats.map((s) => (
              <div key={s.label}>
                <p className="text-xl md:text-2xl font-serif font-bold text-primary-800">{s.value}</p>
                <p className="text-xs text-gray-500 mt-0.5">{s.label}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* The Agent */}
      <section id="the-agent" className="max-w-4xl mx-auto px-6 py-16 text-center">
        <h2 className="font-serif text-2xl md:text-3xl font-bold text-primary-900 mb-4">Built to show you what's actually happening in your business</h2>
        <p className="text-gray-500 max-w-2xl mx-auto leading-relaxed">
          WittyTax turns your income, turnover and expenses into a single health picture —
          profitability trend, margin, and where cash flow risk is building — then handles the{' '}
          <span className="font-semibold text-gray-700">Nigeria Tax Act 2025</span> compliance
          work underneath so that picture stays accurate without manual upkeep.
        </p>
      </section>

      {/* Benefits */}
      <section id="benefits" className="bg-cream-100 py-16">
        <div className="max-w-6xl mx-auto px-6">
          <h2 className="font-serif text-2xl md:text-3xl font-bold text-primary-900 text-center mb-10">Benefits</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {benefits.map((f) => (
              <div key={f.title} className="bg-white rounded-xl p-6 shadow-sm border border-black/5 hover:border-primary-200 hover:shadow-md transition-all">
                <div className="w-10 h-10 bg-primary-50 rounded-lg flex items-center justify-center mb-4">
                  <svg className="w-5 h-5 text-primary-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
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
      <section id="how-it-works" className="max-w-6xl mx-auto px-6 py-16">
        <h2 className="font-serif text-2xl md:text-3xl font-bold text-primary-900 text-center mb-12">How it works</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {steps.map((step, i) => (
            <div key={step.number} className="flex flex-col items-center text-center relative">
              {i < steps.length - 1 && (
                <div className="hidden md:block absolute top-6 left-[calc(50%+2.5rem)] right-0 h-px border-t-2 border-dashed border-gray-200" />
              )}
              <div className="w-12 h-12 rounded-full bg-primary-800 text-gold-300 font-serif text-sm font-bold flex items-center justify-center mb-4 z-10">
                {step.number}
              </div>
              <h3 className="font-semibold text-gray-900 mb-2">{step.title}</h3>
              <p className="text-sm text-gray-500 leading-relaxed">{step.description}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Why WittyTax / CTA */}
      <section id="why-wittytax" className="bg-primary-800 py-16 text-white relative overflow-hidden">
        <div className="relative max-w-4xl mx-auto px-6 text-center">
          <p className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-gold-300 mb-4">
            <span className="w-1.5 h-1.5 rounded-full bg-gold-400" />
            Why WittyTax
          </p>
          <h2 className="font-serif text-2xl md:text-3xl font-bold mb-4">Built for how Nigerian MSMEs actually run</h2>
          <p className="text-primary-100/90 mb-8 max-w-xl mx-auto leading-relaxed">
            Get full access to WittyTax's business health tools — scorecards, forecasting,
            cash-flow recommendations — plus full NTA 2025 compliance handling, free to start,
            no card required.
          </p>
          <div className="flex flex-wrap justify-center gap-3">
            <button
              onClick={() => onGetStarted()}
              className="px-8 py-3 bg-gold-400 hover:bg-gold-300 text-primary-900 font-semibold rounded-xl shadow-lg transition-colors"
            >
              Check your business health
            </button>
            <button
              onClick={onOpenAbout}
              className="px-8 py-3 border border-white/30 hover:border-white/60 text-white font-medium rounded-xl transition-colors"
            >
              Learn more
            </button>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-cream-50 border-t border-black/5 py-6 text-center text-xs text-gray-400">
        <p className="text-gray-500 font-medium mb-1">WittyTax · Built for Nigerian MSMEs</p>
        <p>© Tech84 Alliance · All amounts in Nigerian Naira (₦)</p>
        <p className="mt-1">Estimates based on NTA 2025. Not professional tax advice.</p>
        <p className="mt-3 space-x-3">
          <button onClick={onOpenPrivacy} className="text-gray-500 hover:text-primary-700 underline">
            Privacy Policy
          </button>
          <button onClick={onOpenTerms} className="text-gray-500 hover:text-primary-700 underline">
            Terms of Service
          </button>
          <button onClick={onOpenAbout} className="text-gray-500 hover:text-primary-700 underline">
            About
          </button>
        </p>
      </footer>
    </div>
  );
};

export default HomePage;

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
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
    ),
    title: 'Reads your documents',
    description: 'The agent ingests receipts, payroll records and import duty paperwork on its own — no manual data entry.',
  },
  {
    icon: (
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
    ),
    title: 'Files on schedule',
    description: 'VAT, PAYE and CIT filings go in on time under the Nigeria Tax Act 2025, with a countdown to every deadline.',
  },
  {
    icon: (
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
    ),
    title: 'Flags risk on its own',
    description: 'Unusual deductions, missing evidence and short-shipment-style discrepancies are surfaced before they become penalties.',
  },
  {
    icon: (
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
    ),
    title: 'Cash-flow forecasting',
    description: 'A rolling six-month forecast shows exactly what tax is coming due and how it affects working capital.',
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
    title: 'The agent verifies and files',
    description: 'Documents are read, cross-checked and filed automatically against NTA 2025 rules and your deadlines.',
  },
  {
    number: '03',
    title: 'You review and approve',
    description: 'You stay in the loop on every filing — approve, question, or let the agent proceed once trust is established.',
  },
];

const stats = [
  { value: '96%', label: 'Average document verification rate' },
  { value: '18 days', label: 'Median lead time before filing deadlines' },
  { value: '3 yrs', label: 'Free for Bank of Industry loan clients' },
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
          <p className="text-lg font-bold text-gray-900">₦2.4m</p>
          <p className="text-[10px] uppercase tracking-wide text-gray-400">Est. tax due</p>
        </div>
        <div className="bg-white rounded-lg border border-gray-100 p-3">
          <p className="text-lg font-bold text-gray-900">96%</p>
          <p className="text-[10px] uppercase tracking-wide text-gray-400">Docs verified</p>
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
            <span className="hidden sm:flex items-center gap-2 pl-3 border-l border-gray-300 text-[11px] tracking-wide text-gray-500 uppercase">
              In partnership with
              <span className="flex items-center gap-1 text-primary-700 font-semibold normal-case text-xs">
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 21h18M5 21V7l8-4 8 4v14M9 9h1m4 0h1m-6 4h1m4 0h1m-6 4h1m4 0h1" />
                </svg>
                Bank of Industry
              </span>
            </span>
          </div>

          <div className="hidden md:flex items-center gap-8 text-sm text-gray-600">
            <button onClick={() => scrollToId('benefits')} className="hover:text-primary-700 transition-colors">Benefits</button>
            <button onClick={() => scrollToId('the-agent')} className="hover:text-primary-700 transition-colors">The agent</button>
            <button onClick={() => scrollToId('how-it-works')} className="hover:text-primary-700 transition-colors">How it works</button>
            <button onClick={() => scrollToId('partnership')} className="hover:text-primary-700 transition-colors">Partnership</button>
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
            <p className="font-serif italic text-gold-200/90 mb-3">Bank of Industry · SME Loan Toolkit</p>
            <h1 className="font-serif text-4xl md:text-5xl font-bold leading-[1.1] mb-6">
              An <span className="text-gold-300">autonomous</span><br />
              <span className="text-gold-300">AI agent</span> that runs<br />
              your tax compliance
            </h1>
            <p className="text-primary-100/90 max-w-lg mb-8 leading-relaxed">
              WittyTax isn't a form to fill in — it's an agent that reads your documents, files on
              schedule, and flags risk on its own. Now part of the Bank of Industry toolkit for
              business loan clients, at no direct cost to businesses for three years.
            </p>
            <div className="flex flex-wrap gap-3">
              <button
                onClick={() => onGetStarted()}
                className="px-6 py-3 bg-gold-400 hover:bg-gold-300 text-primary-900 font-semibold rounded-lg shadow-lg transition-colors"
              >
                See the agent at work
              </button>
              <button
                onClick={() => scrollToId('partnership')}
                className="px-6 py-3 border border-white/30 hover:border-white/60 text-white font-medium rounded-lg transition-colors"
              >
                Talk to your BOI relationship manager
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
        <h2 className="font-serif text-2xl md:text-3xl font-bold text-primary-900 mb-4">Meet your tax compliance agent</h2>
        <p className="text-gray-500 max-w-2xl mx-auto leading-relaxed">
          WittyTax is an autonomous agent built on the{' '}
          <span className="font-semibold text-gray-700">Nigeria Tax Act 2025</span>. Rather than
          handing you another form, it reads your financial documents, reconciles them against
          what NTA 2025 requires, and takes action — filing on time, flagging risk, and giving you
          a plain-English reason for every decision it makes.
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

      {/* Partnership / CTA */}
      <section id="partnership" className="bg-primary-800 py-16 text-white relative overflow-hidden">
        <div className="relative max-w-4xl mx-auto px-6 text-center">
          <p className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-gold-300 mb-4">
            <span className="w-1.5 h-1.5 rounded-full bg-gold-400" />
            Bank of Industry Partnership
          </p>
          <h2 className="font-serif text-2xl md:text-3xl font-bold mb-4">Free compliance tooling for BOI loan clients</h2>
          <p className="text-primary-100/90 mb-8 max-w-xl mx-auto leading-relaxed">
            As part of the Bank of Industry's SME Loan Toolkit, eligible business-loan clients get
            full access to the WittyTax agent at no direct cost for three years — so compliance
            never competes with cash flow while you grow.
          </p>
          <div className="flex flex-wrap justify-center gap-3">
            <button
              onClick={() => onGetStarted()}
              className="px-8 py-3 bg-gold-400 hover:bg-gold-300 text-primary-900 font-semibold rounded-xl shadow-lg transition-colors"
            >
              Start Calculating
            </button>
            <button
              onClick={onOpenAbout}
              className="px-8 py-3 border border-white/30 hover:border-white/60 text-white font-medium rounded-xl transition-colors"
            >
              Learn more about the partnership
            </button>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-cream-50 border-t border-black/5 py-6 text-center text-xs text-gray-400">
        <p className="text-gray-500 font-medium mb-1">WittyTax · In partnership with Bank of Industry</p>
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

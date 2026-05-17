import React, { useState } from 'react';
import {
  calculatePersonalTax,
  calculateCompanyTax,
  PersonalTaxResult,
  CompanyTaxResult,
} from '../utils/taxCalculations';

type TaxType = 'personal' | 'company';

interface WizardState {
  taxType: TaxType | null;
  annualIncome: string;
  applyPension: boolean;
  applyNHF: boolean;
  annualRent: string;
  annualTurnover: string;
  assessableProfit: string;
  fixedAssets: string;
  isProfessionalService: boolean;
}

interface TaxWizardProps {
  initialTab?: TaxType;
  onOpenFullCalculator: (tab: TaxType) => void;
  onBack: () => void;
}

const initial: WizardState = {
  taxType: null,
  annualIncome: '',
  applyPension: true,
  applyNHF: true,
  annualRent: '',
  annualTurnover: '',
  assessableProfit: '',
  fixedAssets: '',
  isProfessionalService: false,
};

function fmt(n: number) {
  return '₦' + Math.round(n).toLocaleString('en-NG');
}

function parse(s: string): number {
  return parseFloat(s.replace(/,/g, '')) || 0;
}

function formatInput(raw: string): string {
  const n = raw.replace(/[^0-9]/g, '');
  return n ? parseInt(n, 10).toLocaleString('en-NG') : '';
}

// ─── Stable helper components (defined outside TaxWizard) ──────────────────

function ProgressBar({ step, total }: { step: number; total: number }) {
  return (
    <div className="flex items-center gap-2 mb-8">
      {Array.from({ length: total }).map((_, i) => (
        <div
          key={i}
          className={`h-1.5 flex-1 rounded-full transition-all duration-500 ${
            i < step ? 'bg-primary-600' : i === step ? 'bg-primary-300' : 'bg-gray-200'
          }`}
        />
      ))}
    </div>
  );
}

function NavRow({
  onBack,
  onNext,
  nextLabel = 'Continue',
  nextDisabled = false,
}: {
  onBack?: () => void;
  onNext?: () => void;
  nextLabel?: string;
  nextDisabled?: boolean;
}) {
  return (
    <div className="flex items-center justify-between mt-8 pt-6 border-t border-gray-100">
      {onBack ? (
        <button
          onClick={onBack}
          className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-800 transition-colors"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          Back
        </button>
      ) : <span />}
      {onNext && (
        <button
          onClick={onNext}
          disabled={nextDisabled}
          className={`flex items-center gap-2 px-6 py-2.5 rounded-xl text-sm font-semibold transition-all ${
            nextDisabled
              ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
              : 'bg-primary-600 hover:bg-primary-700 text-white shadow-sm hover:shadow'
          }`}
        >
          {nextLabel}
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
        </button>
      )}
    </div>
  );
}

function AmountInput({
  label,
  value,
  onChange,
  hint,
  autoFocus,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  hint?: string;
  autoFocus?: boolean;
}) {
  return (
    <div className="mb-4">
      <label className="block text-sm font-medium text-gray-700 mb-1.5">{label}</label>
      <div className="relative">
        <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 font-medium text-lg select-none">₦</span>
        <input
          autoFocus={autoFocus}
          type="text"
          inputMode="numeric"
          value={value}
          onChange={(e) => onChange(formatInput(e.target.value))}
          placeholder="0"
          className="w-full pl-10 pr-4 py-3.5 text-lg border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
        />
      </div>
      {hint && <p className="text-xs text-gray-400 mt-1.5">{hint}</p>}
    </div>
  );
}

function Toggle({
  label,
  sub,
  checked,
  onChange,
}: {
  label: string;
  sub: string;
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <button
      onClick={() => onChange(!checked)}
      className={`w-full flex items-center justify-between p-4 rounded-xl border-2 transition-all text-left ${
        checked ? 'border-primary-500 bg-primary-50' : 'border-gray-200 bg-white hover:border-gray-300'
      }`}
    >
      <div>
        <p className={`text-sm font-semibold ${checked ? 'text-primary-700' : 'text-gray-800'}`}>{label}</p>
        <p className="text-xs text-gray-500 mt-0.5">{sub}</p>
      </div>
      <div
        className={`w-11 h-6 rounded-full transition-colors flex-shrink-0 ml-4 relative ${
          checked ? 'bg-primary-600' : 'bg-gray-300'
        }`}
      >
        <span
          className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${
            checked ? 'translate-x-5' : ''
          }`}
        />
      </div>
    </button>
  );
}

// ─── Main Component ────────────────────────────────────────────────────────

const TaxWizard: React.FC<TaxWizardProps> = ({ initialTab, onOpenFullCalculator, onBack }) => {
  const [step, setStep] = useState(initialTab ? 1 : 0);
  const [state, setState] = useState<WizardState>({
    ...initial,
    taxType: initialTab || null,
  });

  const set = (patch: Partial<WizardState>) => setState((s) => ({ ...s, ...patch }));
  const totalSteps = 4;

  // Compute results once when on step 3
  let personalResult: PersonalTaxResult | null = null;
  let companyResult: CompanyTaxResult | null = null;

  if (step === 3) {
    if (state.taxType === 'personal') {
      personalResult = calculatePersonalTax({
        annualIncome: parse(state.annualIncome),
        applyPension: state.applyPension,
        applyNHF: state.applyNHF,
        annualRent: parse(state.annualRent),
        additionalDeductions: [],
        ocrDeductions: 0,
      });
    } else {
      const turnover = parse(state.annualTurnover);
      const profit = parse(state.assessableProfit) || turnover * 0.2;
      companyResult = calculateCompanyTax({
        annualTurnover: turnover,
        fixedAssets: parse(state.fixedAssets),
        assessableProfit: profit,
        isProfessionalService: state.isProfessionalService,
        isNonResident: false,
        capitalAllowances: 0,
        otherDeductions: [],
        assetDisposalProceeds: 0,
        assetTaxWrittenDownValue: 0,
        isLargeCompany: false,
        isMNE: false,
      });
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* Top bar */}
      <div className="bg-white border-b border-gray-100">
        <div className="max-w-lg mx-auto px-6 py-4 flex items-center justify-between">
          <button onClick={onBack} className="flex items-center gap-2 text-gray-600 hover:text-gray-900 transition-colors">
            <svg className="w-5 h-5 text-primary-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
            </svg>
            <span className="font-semibold text-gray-900">WittyTax</span>
          </button>
          <span className="text-xs text-gray-400">
            {state.taxType === 'personal' ? 'Personal Tax' : state.taxType === 'company' ? 'Company Tax' : 'Tax Calculator'}
          </span>
        </div>
      </div>

      {/* Card */}
      <div className="flex-1 flex items-start justify-center px-4 py-10">
        <div className="w-full max-w-lg bg-white rounded-2xl shadow-sm border border-gray-100 p-8">

          {/* ── Step 0: Who ── */}
          {step === 0 && (
            <div>
              <ProgressBar step={0} total={totalSteps} />
              <h2 className="text-2xl font-bold text-gray-900 mb-2">Who are you calculating tax for?</h2>
              <p className="text-gray-500 text-sm mb-6">Pick one to get started — takes less than 2 minutes.</p>
              <div className="grid grid-cols-2 gap-4">
                {([
                  {
                    type: 'personal' as TaxType,
                    title: 'Myself',
                    sub: 'PAYE / Personal Income Tax',
                    icon: 'M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z',
                  },
                  {
                    type: 'company' as TaxType,
                    title: 'My Business',
                    sub: 'Company Income Tax (CIT)',
                    icon: 'M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4',
                  },
                ] as const).map((opt) => (
                  <button
                    key={opt.type}
                    onClick={() => { set({ taxType: opt.type }); setStep(1); }}
                    className="flex flex-col items-center gap-3 p-6 border-2 border-gray-200 rounded-2xl hover:border-primary-500 hover:bg-primary-50 transition-all group"
                  >
                    <div className="w-12 h-12 bg-primary-100 group-hover:bg-primary-200 rounded-xl flex items-center justify-center transition-colors">
                      <svg className="w-6 h-6 text-primary-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={opt.icon} />
                      </svg>
                    </div>
                    <div className="text-center">
                      <p className="font-semibold text-gray-900">{opt.title}</p>
                      <p className="text-xs text-gray-500 mt-0.5">{opt.sub}</p>
                    </div>
                  </button>
                ))}
              </div>
              <NavRow onBack={onBack} />
            </div>
          )}

          {/* ── Step 1: Income / Turnover ── */}
          {step === 1 && (
            <div>
              <ProgressBar step={1} total={totalSteps} />
              {state.taxType === 'personal' ? (
                <>
                  <h2 className="text-2xl font-bold text-gray-900 mb-2">What's your annual gross income?</h2>
                  <p className="text-gray-500 text-sm mb-6">Enter the total before any deductions or tax — usually what's on your offer letter or payslip.</p>
                  <AmountInput
                    label="Annual gross income"
                    value={state.annualIncome}
                    onChange={(v) => set({ annualIncome: v })}
                    hint="E.g. if you earn ₦500,000/month, enter ₦6,000,000"
                    autoFocus
                  />
                </>
              ) : (
                <>
                  <h2 className="text-2xl font-bold text-gray-900 mb-2">What's your company's annual turnover?</h2>
                  <p className="text-gray-500 text-sm mb-6">Total revenue before any deductions. This determines your company size and tax rate.</p>
                  <AmountInput
                    label="Annual turnover"
                    value={state.annualTurnover}
                    onChange={(v) => set({ annualTurnover: v })}
                    hint="Companies with turnover ≤ ₦100M qualify for the small company exemption under NTA 2025"
                    autoFocus
                  />
                  <AmountInput
                    label="Assessable profit (optional)"
                    value={state.assessableProfit}
                    onChange={(v) => set({ assessableProfit: v })}
                    hint="Leave blank to use 20% of turnover as an estimate"
                  />
                </>
              )}
              <NavRow
                onBack={() => setStep(0)}
                onNext={() => setStep(2)}
                nextDisabled={
                  state.taxType === 'personal'
                    ? parse(state.annualIncome) <= 0
                    : parse(state.annualTurnover) <= 0
                }
              />
            </div>
          )}

          {/* ── Step 2: Deductions / Details ── */}
          {step === 2 && (
            <div>
              <ProgressBar step={2} total={totalSteps} />
              {state.taxType === 'personal' ? (
                <>
                  <h2 className="text-2xl font-bold text-gray-900 mb-2">Which deductions apply to you?</h2>
                  <p className="text-gray-500 text-sm mb-6">These reduce your taxable income. Toggle on anything that applies.</p>
                  <div className="space-y-3">
                    <Toggle
                      label="Pension (8%)"
                      sub={`Contributes ${fmt(parse(state.annualIncome) * 0.08)}/yr to your pension fund`}
                      checked={state.applyPension}
                      onChange={(v) => set({ applyPension: v })}
                    />
                    <Toggle
                      label="NHF (2.5%)"
                      sub={`National Housing Fund — ${fmt(parse(state.annualIncome) * 0.025)}/yr`}
                      checked={state.applyNHF}
                      onChange={(v) => set({ applyNHF: v })}
                    />
                  </div>
                  <div className="mt-4">
                    <AmountInput
                      label="Annual rent (optional)"
                      value={state.annualRent}
                      onChange={(v) => set({ annualRent: v })}
                      hint="20% of rent is deductible, capped at ₦500,000"
                    />
                  </div>
                </>
              ) : (
                <>
                  <h2 className="text-2xl font-bold text-gray-900 mb-2">A couple more details</h2>
                  <p className="text-gray-500 text-sm mb-6">These affect your company's tax rate and available exemptions.</p>
                  <div className="space-y-3 mb-4">
                    <Toggle
                      label="Professional services firm"
                      sub="Law, accounting, consulting, medicine — excluded from small company exemption"
                      checked={state.isProfessionalService}
                      onChange={(v) => set({ isProfessionalService: v })}
                    />
                  </div>
                  <AmountInput
                    label="Total fixed assets (optional)"
                    value={state.fixedAssets}
                    onChange={(v) => set({ fixedAssets: v })}
                    hint="Must be under ₦250M alongside turnover ≤ ₦100M to qualify as a small company"
                  />
                </>
              )}
              <NavRow
                onBack={() => setStep(1)}
                onNext={() => setStep(3)}
                nextLabel="Calculate"
              />
            </div>
          )}

          {/* ── Step 3: Result ── */}
          {step === 3 && (
            <div>
              <ProgressBar step={3} total={totalSteps} />

              {personalResult && (
                <>
                  <h2 className="text-2xl font-bold text-gray-900 mb-2">Your tax breakdown</h2>
                  <p className="text-gray-500 text-sm mb-6">Based on NTA 2025. Effective rate: {personalResult.effectiveRate.toFixed(1)}%</p>
                  <div className="grid grid-cols-3 gap-3 mb-6">
                    <div className="bg-red-50 border border-red-100 rounded-xl p-4 text-center">
                      <p className="text-xs text-red-500 mb-1">Tax owed</p>
                      <p className="text-lg font-bold text-red-600">{fmt(personalResult.totalTax)}</p>
                    </div>
                    <div className="bg-green-50 border border-green-100 rounded-xl p-4 text-center">
                      <p className="text-xs text-green-600 mb-1">Net income</p>
                      <p className="text-lg font-bold text-green-700">{fmt(personalResult.netIncome)}</p>
                    </div>
                    <div className="bg-blue-50 border border-blue-100 rounded-xl p-4 text-center">
                      <p className="text-xs text-blue-500 mb-1">Deductions</p>
                      <p className="text-lg font-bold text-blue-600">{fmt(personalResult.totalDeductions)}</p>
                    </div>
                  </div>
                  <div className="bg-gray-50 rounded-xl p-4 text-sm space-y-2 mb-4">
                    <div className="flex justify-between text-gray-600">
                      <span>Gross income</span><span className="font-medium">{fmt(personalResult.grossIncome)}</span>
                    </div>
                    {personalResult.pensionDeduction > 0 && (
                      <div className="flex justify-between text-gray-500">
                        <span>Pension (8%)</span><span>– {fmt(personalResult.pensionDeduction)}</span>
                      </div>
                    )}
                    {personalResult.nhfDeduction > 0 && (
                      <div className="flex justify-between text-gray-500">
                        <span>NHF (2.5%)</span><span>– {fmt(personalResult.nhfDeduction)}</span>
                      </div>
                    )}
                    {personalResult.rentRelief > 0 && (
                      <div className="flex justify-between text-gray-500">
                        <span>Rent relief</span><span>– {fmt(personalResult.rentRelief)}</span>
                      </div>
                    )}
                    <div className="border-t border-gray-200 pt-2 flex justify-between font-medium text-gray-800">
                      <span>Taxable income</span><span>{fmt(personalResult.taxableIncome)}</span>
                    </div>
                    <div className="flex justify-between font-semibold text-red-600">
                      <span>Total tax</span><span>{fmt(personalResult.totalTax)}</span>
                    </div>
                  </div>
                </>
              )}

              {companyResult && (
                <>
                  <h2 className="text-2xl font-bold text-gray-900 mb-2">Your company tax breakdown</h2>
                  <p className="text-gray-500 text-sm mb-6">
                    {companyResult.companySize === 'small'
                      ? 'Small company — exempt from CIT and 4% education levy under NTA 2025'
                      : 'Large company — standard CIT rates apply'}
                  </p>
                  <div className="grid grid-cols-3 gap-3 mb-6">
                    <div className="bg-red-50 border border-red-100 rounded-xl p-4 text-center">
                      <p className="text-xs text-red-500 mb-1">Total tax</p>
                      <p className="text-lg font-bold text-red-600">{fmt(companyResult.totalTax)}</p>
                    </div>
                    <div className="bg-blue-50 border border-blue-100 rounded-xl p-4 text-center">
                      <p className="text-xs text-blue-500 mb-1">Corporate tax</p>
                      <p className="text-lg font-bold text-blue-600">{fmt(companyResult.corporateTax)}</p>
                    </div>
                    <div className="bg-amber-50 border border-amber-100 rounded-xl p-4 text-center">
                      <p className="text-xs text-amber-600 mb-1">Dev. levy</p>
                      <p className="text-lg font-bold text-amber-700">{fmt(companyResult.developmentLevy)}</p>
                    </div>
                  </div>
                  <div className="bg-gray-50 rounded-xl p-4 text-sm space-y-2 mb-4">
                    <div className="flex justify-between text-gray-600">
                      <span>Annual turnover</span><span className="font-medium">{fmt(parse(state.annualTurnover))}</span>
                    </div>
                    <div className="flex justify-between text-gray-600">
                      <span>Assessable profit</span><span className="font-medium">{fmt(companyResult.assessableProfit)}</span>
                    </div>
                    <div className="flex justify-between text-gray-500">
                      <span>Capital allowances</span><span>– {fmt(companyResult.capitalAllowances)}</span>
                    </div>
                    <div className="border-t border-gray-200 pt-2 flex justify-between font-medium text-gray-800">
                      <span>Taxable profit</span><span>{fmt(companyResult.taxableProfit)}</span>
                    </div>
                    <div className="flex justify-between text-gray-600">
                      <span>Corporate tax ({companyResult.taxRate}%)</span><span>{fmt(companyResult.corporateTax)}</span>
                    </div>
                    <div className="flex justify-between font-semibold text-red-600">
                      <span>Total tax liability</span><span>{fmt(companyResult.totalTax)}</span>
                    </div>
                  </div>
                  {companyResult.companySize === 'small' && (
                    <div className="bg-green-50 border border-green-200 rounded-xl p-3 text-sm text-green-800 mb-4">
                      Your company qualifies for the NTA 2025 small company exemption — no CIT or education levy.
                    </div>
                  )}
                </>
              )}

              <div className="flex gap-3">
                <button
                  onClick={() => { setState({ ...initial }); setStep(0); }}
                  className="flex-1 px-4 py-2.5 border border-gray-200 text-sm font-medium text-gray-600 rounded-xl hover:bg-gray-50 transition-colors"
                >
                  Start over
                </button>
                <button
                  onClick={() => onOpenFullCalculator(state.taxType!)}
                  className="flex-1 px-4 py-2.5 bg-primary-600 hover:bg-primary-700 text-white text-sm font-semibold rounded-xl transition-colors"
                >
                  Full calculator + PDF
                </button>
              </div>

              <NavRow onBack={() => setStep(2)} />
            </div>
          )}

        </div>
      </div>
    </div>
  );
};

export default TaxWizard;

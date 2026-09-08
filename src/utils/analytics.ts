// Thin wrapper around GA4 gtag — safe no-op when GA is not configured
declare global {
  interface Window {
    gtag?: (...args: any[]) => void;
  }
}

function track(eventName: string, params?: Record<string, string | number | boolean>) {
  if (typeof window !== 'undefined' && typeof window.gtag === 'function') {
    window.gtag('event', eventName, params);
  }
}

export const analytics = {
  taxCalculated:  (type: 'personal' | 'company', totalTax: number) =>
    track('tax_calculated', { tax_type: type, total_tax: Math.round(totalTax) }),

  pdfDownloaded:  (type: 'personal' | 'company') =>
    track('pdf_downloaded', { tax_type: type }),

  userLoggedIn:   () => track('login'),
  userRegistered: () => track('sign_up'),

  dashboardOpened:    () => track('dashboard_opened'),
  premiumFeatureHit:  (feature: string) => track('premium_gate_hit', { feature }),

  revenueAdded:  (amount: number) => track('revenue_added',  { amount: Math.round(amount) }),
  expenseAdded:  (amount: number) => track('expense_added',  { amount: Math.round(amount) }),

  passwordChanged: () => track('password_changed'),

  // A calculation's line-item breakdown should always sum to its displayed
  // total by construction. If it ever doesn't, that's a real bug worth
  // knowing about -- but the user should never see raw "discrepancy
  // detected" debug language in a tax tool, so this reports it silently
  // instead of rendering it in the UI.
  calculationDiscrepancy: (context: string, expected: number, actual: number) =>
    track('calculation_discrepancy', { context, expected: Math.round(expected), actual: Math.round(actual) }),
};

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
};

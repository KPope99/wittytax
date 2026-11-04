import React, { useEffect } from 'react';
import { analytics } from '../utils/analytics';

interface PremiumPreviewProps {
  isPremium: boolean;
  featureName: string;
  teaser: React.ReactNode;
  children: React.ReactNode;
  unlockCopy?: string;
}

// Shared "show real value, then ask for upgrade" gate — replaces the old
// Dashboard-local all-or-nothing PremiumLock. Reuses the visual pattern
// already proven in CashFlowRecommendations.tsx's AI-Powered-Opportunities
// section (indigo/purple gradient card, lock icon, "Unlock X" line) so a
// second, different-looking lock treatment doesn't appear elsewhere on the
// same merged dashboard page.
const PremiumPreview: React.FC<PremiumPreviewProps> = ({ isPremium, featureName, teaser, children, unlockCopy }) => {
  useEffect(() => {
    if (!isPremium) analytics.premiumFeatureHit(featureName);
  }, [isPremium, featureName]);

  if (isPremium) return <>{children}</>;

  return (
    <>
      {teaser}
      <div className="flex items-center gap-3 p-4 bg-gradient-to-r from-indigo-50 to-purple-50 border border-indigo-200 rounded-xl mt-3">
        <div className="w-10 h-10 bg-indigo-100 rounded-full flex items-center justify-center flex-shrink-0">
          <svg className="w-5 h-5 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
          </svg>
        </div>
        <div>
          <p className="text-sm font-semibold text-indigo-800">Unlock {featureName}</p>
          <p className="text-xs text-indigo-700 mt-0.5">
            {unlockCopy || `See the rest of your ${featureName.toLowerCase()} — available on Premium.`}
          </p>
        </div>
      </div>
    </>
  );
};

export default PremiumPreview;

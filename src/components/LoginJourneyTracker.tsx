import React from 'react';

interface LoginJourneyTrackerProps {
  hasResult: boolean;
  isAuthenticated: boolean;
}

// Shared "Enter Details -> Review Results -> Login to Download" tracker used
// on the wizard's result step and both detailed calculators, so the journey
// reads the same everywhere in the app.
const LoginJourneyTracker: React.FC<LoginJourneyTrackerProps> = ({ hasResult, isAuthenticated }) => {
  // Step 1 completes once a result exists; step 2 ("review") completes once
  // they've had a result to look at and either logged in or are about to;
  // step 3 completes only once actually authenticated.
  const stepDone = [hasResult, hasResult, isAuthenticated];
  const currentStep = isAuthenticated ? -1 : !hasResult ? 0 : 2; // -1 = all done

  return (
    <div className="bg-white rounded-lg shadow-md px-3 py-3 sm:px-6">
      <ol className="flex items-center gap-1.5 sm:gap-3">
        {[
          { label: 'Enter Details' },
          { label: 'Review Results' },
          { label: 'Login to Download' },
        ].map((step, idx, arr) => {
          const isDone = stepDone[idx];
          const isCurrent = idx === currentStep;
          return (
            <React.Fragment key={step.label}>
              <li className="flex items-center gap-1.5 sm:gap-2 min-w-0">
                <span
                  className={`flex items-center justify-center w-6 h-6 rounded-full text-xs font-semibold flex-shrink-0 ${
                    isDone
                      ? 'bg-primary-600 text-white'
                      : isCurrent
                      ? 'bg-primary-100 text-primary-700 border-2 border-primary-500'
                      : 'bg-gray-100 text-gray-400 border border-gray-200'
                  }`}
                >
                  {isDone ? (
                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                    </svg>
                  ) : (
                    idx + 1
                  )}
                </span>
                <span
                  className={`text-[11px] leading-tight sm:text-sm font-medium ${
                    isDone ? 'text-primary-700' : isCurrent ? 'text-gray-800' : 'text-gray-400'
                  }`}
                >
                  {step.label}
                </span>
              </li>
              {idx < arr.length - 1 && (
                <li className={`flex-1 sm:flex-none sm:w-8 h-0.5 min-w-[10px] ${isDone ? 'bg-primary-400' : 'bg-gray-200'}`} />
              )}
            </React.Fragment>
          );
        })}
      </ol>
    </div>
  );
};

export default LoginJourneyTracker;

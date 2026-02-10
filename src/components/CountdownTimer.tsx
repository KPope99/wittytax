import React, { useState, useEffect } from 'react';
import { getCountdown, LODGEMENT_DATE } from '../utils/taxCalculations';

const CountdownTimer: React.FC = () => {
  const [countdown, setCountdown] = useState(getCountdown());

  useEffect(() => {
    const timer = setInterval(() => {
      setCountdown(getCountdown());
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  const formatDate = (date: Date): string => {
    return date.toLocaleDateString('en-NG', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  if (countdown.isPast) {
    return (
      <div className="bg-red-100 border border-red-300 rounded-lg p-4">
        <div className="flex items-center justify-center">
          <svg className="w-6 h-6 text-red-500 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
          <span className="text-red-700 font-semibold">Tax Filing Deadline Has Passed!</span>
        </div>
        <p className="text-center text-red-600 text-sm mt-2">
          The deadline was {formatDate(LODGEMENT_DATE)}. Please file immediately to avoid penalties.
        </p>
      </div>
    );
  }

  return (
    <div className="bg-gradient-to-r from-primary-700 to-primary-600 rounded-lg p-4 text-white shadow-lg">
      <div className="text-center mb-3">
        <h3 className="text-2xl font-medium opacity-90">Time Until Tax Filing Deadline</h3>
        <p className="text-xs opacity-75">{formatDate(LODGEMENT_DATE)}</p>
      </div>

      <div className="grid grid-cols-4 gap-2">
        <div className="bg-white/20 rounded-lg p-3 text-center backdrop-blur-sm">
          <div className="text-2xl md:text-3xl font-bold">{countdown.days}</div>
          <div className="text-xs uppercase tracking-wide opacity-80">Days</div>
        </div>
        <div className="bg-white/20 rounded-lg p-3 text-center backdrop-blur-sm">
          <div className="text-2xl md:text-3xl font-bold">{countdown.hours.toString().padStart(2, '0')}</div>
          <div className="text-xs uppercase tracking-wide opacity-80">Hours</div>
        </div>
        <div className="bg-white/20 rounded-lg p-3 text-center backdrop-blur-sm">
          <div className="text-2xl md:text-3xl font-bold">{countdown.minutes.toString().padStart(2, '0')}</div>
          <div className="text-xs uppercase tracking-wide opacity-80">Mins</div>
        </div>
        <div className="bg-white/20 rounded-lg p-3 text-center backdrop-blur-sm">
          <div className="text-2xl md:text-3xl font-bold">{countdown.seconds.toString().padStart(2, '0')}</div>
          <div className="text-xs uppercase tracking-wide opacity-80">Secs</div>
        </div>
      </div>

      {countdown.days <= 30 && (
        <div className="mt-3 text-center">
          <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-yellow-400 text-yellow-900">
            <svg className="w-4 h-4 mr-1" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
            </svg>
            {countdown.days <= 7 ? 'File Urgently!' : 'File Soon!'}
          </span>
        </div>
      )}
    </div>
  );
};

export default CountdownTimer;

import React from 'react';

const HeroSection: React.FC = () => (
  <div className="flex flex-col items-center justify-center h-full w-full text-center">
    {/* Placeholder SVG illustration */}
    <svg width="80" height="80" viewBox="0 0 80 80" fill="none" xmlns="http://www.w3.org/2000/svg" className="mb-4">
      <rect width="80" height="80" rx="16" fill="#E0E7FF" />
      <path d="M20 40h40M40 20v40" stroke="#6366F1" strokeWidth="4" strokeLinecap="round" />
    </svg>
    <h1 className="text-2xl font-extrabold text-primary mb-2">Insurance Renewals, Reinvented</h1>
    <div className="text-base text-gray-700 mb-2">No more manual spreadsheets. No more guesswork.</div>
    <div className="text-sm text-gray-500 max-w-xs mx-auto">
      Meet RenewalAI: The platform that automates, standardizes, and impresses—so you can focus on what matters.
    </div>
  </div>
);

export default HeroSection; 
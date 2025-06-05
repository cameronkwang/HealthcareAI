import React from 'react';

const carrierLogos = [
  { src: '/logos/aetna.png', alt: 'Aetna' },
  { src: 'https://1000logos.net/wp-content/uploads/2018/02/unitedhealthcare-emblem.png', alt: 'UHC' },
  { src: '/logos/cigna.png', alt: 'Cigna' },
  { src: '/logos/bcbs.png', alt: 'BCBS' },
];

const PortfolioSection: React.FC = () => (
  <div className="flex flex-col items-center justify-center h-full w-full text-center">
    {/* Placeholder SVG illustration */}
    <svg width="80" height="80" viewBox="0 0 80 80" fill="none" xmlns="http://www.w3.org/2000/svg" className="mb-4">
      <rect width="80" height="80" rx="16" fill="#E0E7FF" />
      <path d="M20 40h40M40 20v40" stroke="#6366F1" strokeWidth="4" strokeLinecap="round" />
    </svg>
    <h2 className="text-2xl font-extrabold text-primary mb-2">Real Results</h2>
    <div className="flex items-center justify-center gap-4 mb-2">
      {carrierLogos.map((logo) => (
        <img
          key={logo.alt}
          src={logo.src}
          alt={logo.alt}
          className="w-10 h-10 object-contain rounded bg-white border border-gray-200"
          onError={e => (e.currentTarget.src = 'https://placehold.co/40x40?text=?')}
        />
      ))}
    </div>
    <div className="text-sm text-gray-700 max-w-xs mx-auto mb-1">
      See how RenewalAI transformed a 500-life group's renewal process for Aetna—cutting analysis time from days to minutes.
    </div>
    <div className="text-xs text-gray-500 max-w-xs mx-auto">
      From small businesses to Fortune 500s, RenewalAI powers smarter renewals.
    </div>
  </div>
);

export default PortfolioSection; 
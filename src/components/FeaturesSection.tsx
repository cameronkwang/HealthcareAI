import React from 'react';

const features = [
  {
    icon: (
      <svg className="w-7 h-7 text-primary" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M12 4v16m8-8H4" /></svg>
    ),
    title: 'Automated Data Parsing',
    desc: 'Upload your data and let our system intelligently parse and pre-fill all required fields.'
  },
  {
    icon: (
      <svg className="w-7 h-7 text-primary" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><rect x="3" y="3" width="18" height="18" rx="2" /><path d="M3 9h18" /></svg>
    ),
    title: 'Carrier-Specific Calculations',
    desc: 'All projections use trusted, auditable formulas for Aetna, UHC, Cigna, and BCBS.'
  },
  {
    icon: (
      <svg className="w-7 h-7 text-primary" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10" /><path d="M8 12l2 2 4-4" /></svg>
    ),
    title: 'Instant, Auditable Reports',
    desc: 'Download audit-ready reports in seconds.'
  },
];

const FeaturesSection: React.FC = () => (
  <div className="flex flex-col items-center justify-center h-full w-full text-center">
    {/* Placeholder SVG illustration */}
    <svg width="80" height="80" viewBox="0 0 80 80" fill="none" xmlns="http://www.w3.org/2000/svg" className="mb-4">
      <rect width="80" height="80" rx="16" fill="#E0E7FF" />
      <path d="M20 40h40M40 20v40" stroke="#6366F1" strokeWidth="4" strokeLinecap="round" />
    </svg>
    <h2 className="text-2xl font-extrabold text-primary mb-2">How RenewalAI Works</h2>
    <div className="flex flex-col items-center gap-3 w-full max-w-xs mx-auto">
      {features.map((f) => (
        <div key={f.title} className="flex items-center gap-3 w-full">
          <span>{f.icon}</span>
          <div className="text-left">
            <div className="font-semibold text-primary text-sm">{f.title}</div>
            <div className="text-xs text-gray-600 leading-tight">{f.desc}</div>
          </div>
        </div>
      ))}
    </div>
  </div>
);

export default FeaturesSection; 
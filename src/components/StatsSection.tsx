import React from 'react';

const stats = [
  {
    icon: (
      <svg className="w-7 h-7 text-primary" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><rect x="4" y="4" width="16" height="16" rx="4" /></svg>
    ),
    label: '12,000+ Claims Processed',
  },
  {
    icon: (
      <svg className="w-7 h-7 text-primary" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M12 8v4l3 3" /><circle cx="12" cy="12" r="10" /></svg>
    ),
    label: '85% Avg. Time Saved',
  },
  {
    icon: (
      <svg className="w-7 h-7 text-primary" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M12 20l9-5-9-5-9 5 9 5z" /><path d="M12 12V4" /></svg>
    ),
    label: '100% Auditable Calculations',
  },
];

const StatsSection: React.FC = () => (
  <div className="flex flex-col items-center justify-center h-full w-full text-center">
    {/* Placeholder SVG illustration */}
    <svg width="80" height="80" viewBox="0 0 80 80" fill="none" xmlns="http://www.w3.org/2000/svg" className="mb-4">
      <rect width="80" height="80" rx="16" fill="#E0E7FF" />
      <path d="M20 40h40M40 20v40" stroke="#6366F1" strokeWidth="4" strokeLinecap="round" />
    </svg>
    <h2 className="text-2xl font-extrabold text-primary mb-2">Proof & Impact</h2>
    <div className="flex flex-col items-center gap-3 w-full max-w-xs mx-auto">
      {stats.map((s) => (
        <div key={s.label} className="flex items-center gap-3 w-full">
          <span>{s.icon}</span>
          <div className="font-semibold text-primary text-sm text-left">{s.label}</div>
        </div>
      ))}
    </div>
    <div className="text-sm text-gray-500 mt-2 max-w-xs mx-auto">
      Trusted by brokers and HR teams nationwide. RenewalAI delivers results you can measure.
    </div>
  </div>
);

export default StatsSection; 
import React from 'react';

interface CarrierSelectorProps {
  selected: string;
  onSelect: (carrier: string) => void;
}

const carriers = [
  { label: 'Aetna', value: 'AETNA' },
  { label: 'UHC', value: 'UHC' },
  { label: 'Cigna', value: 'CIGNA' },
  { label: 'BCBS', value: 'BCBS' },
];

const CarrierSelector: React.FC<CarrierSelectorProps> = ({ selected, onSelect }) => (
  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
    {carriers.map((carrier) => (
      <button
        key={carrier.value}
        className={`
          px-6 py-4 rounded-xl font-semibold text-center transition-all duration-200 border-2
          ${selected === carrier.value 
            ? 'bg-blue-600 text-white border-blue-600 shadow-lg transform scale-105' 
            : 'bg-white text-gray-700 border-gray-200 hover:border-blue-300 hover:shadow-md hover:bg-blue-50'
          }
        `}
        onClick={() => onSelect(carrier.value)}
      >
        <div className="flex flex-col items-center">
          <div className={`
            w-8 h-8 rounded-full flex items-center justify-center mb-2
            ${selected === carrier.value ? 'bg-white/20' : 'bg-blue-100'}
          `}>
            <svg className={`w-4 h-4 ${selected === carrier.value ? 'text-white' : 'text-blue-600'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"></path>
            </svg>
          </div>
          <span className="text-lg font-bold">{carrier.label}</span>
          {selected === carrier.value && (
            <span className="text-xs text-white/80 mt-1">Selected</span>
          )}
        </div>
      </button>
    ))}
  </div>
);

export default CarrierSelector; 
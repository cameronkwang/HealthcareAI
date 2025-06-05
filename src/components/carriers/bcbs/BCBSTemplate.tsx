import React from 'react';
import { CalculationResult } from '../../../types/common';

interface BCBSTemplateProps {
  result: CalculationResult;
}

const sectionIndices = {
  enrollment: 0,
  experience: 5,
  manual: 15,
  composite: 25,
};
const highlightRows = [14, 24, 29]; // Example key rows

const BCBSTemplate: React.FC<BCBSTemplateProps> = ({ result }) => {
  // Currency formatting function
  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);
  };

  // Format percentages
  const formatPercentage = (value: number) => {
    return `${(value * 100).toFixed(2)}%`;
  };

  // Format numbers with commas
  const formatNumber = (value: number) => {
    return new Intl.NumberFormat('en-US', {
      minimumFractionDigits: 0,
      maximumFractionDigits: 4,
    }).format(value);
  };

  // Determine formatting based on the step label and value
  const formatValue = (step: any) => {
    const { label, value } = step;
    
    if (typeof value !== 'number') {
      return value;
    }

    // Currency values - most monetary amounts
    if (
      label.includes('Claims') ||
      label.includes('Premium') ||
      label.includes('Charge') ||
      label.includes('Component') ||
      label.includes('Retention') ||
      label.includes('Admin') ||
      label.includes('Risk') ||
      label.includes('Profit') ||
      label.includes('Other') ||
      label.includes('Fee') ||
      label.includes('Revenue') ||
      label.includes('Cost') ||
      label.includes('Expected') ||
      label.includes('PMPM') ||
      label.includes('PEPM') ||
      label.includes('Tier') ||
      label.includes('Portfolio') ||
      label.includes('Composite')
    ) {
      return formatCurrency(value);
    }

    // Percentage values
    if (
      label.includes('Factor') ||
      label.includes('Weighting') ||
      label.includes('Credibility') ||
      label.includes('Change') ||
      label.includes('Rate') ||
      label.includes('%') ||
      label.includes('Action')
    ) {
      // Special case for factors that are typically > 1 (like trend factors)
      if ((label.includes('Factor') || label.includes('Adjustment')) && value > 0.5 && value < 5) {
        return formatNumber(value);
      }
      return formatPercentage(value);
    }

    // Regular numbers (enrollment, member counts, etc.)
    return formatNumber(value);
  };

  return (
    <div className="border rounded p-6 bg-red-50">
      <h3 className="text-xl font-bold text-red-900 mb-6 text-center">BCBS Multi-Plan Portfolio Analysis</h3>
      <div className="flex justify-center">
        <div className="w-full max-w-4xl">
          <div className="overflow-x-auto">
            <table className="w-full border border-red-200 bg-white rounded-lg shadow-sm">
              <thead className="bg-red-900">
                <tr>
                  <th className="text-white px-4 py-3 text-left font-semibold">Description</th>
                  <th className="text-white px-4 py-3 text-right font-semibold w-48">Value</th>
                </tr>
              </thead>
              <tbody>
                {/* Enrollment Summary */}
                <tr>
                  <td colSpan={2} className="bg-red-800 text-white font-bold px-4 py-3 text-center text-lg">
                    Enrollment Summary
                  </td>
                </tr>
                {result.calculationSteps.slice(sectionIndices.enrollment, sectionIndices.experience).map((step, idx) => (
                  <tr key={idx} className="hover:bg-gray-50 border-b border-gray-100">
                    <td className="px-4 py-3 text-gray-900">{step.label}</td>
                    <td className="px-4 py-3 text-right tabular-nums font-semibold text-gray-900">
                      {formatValue(step)}
                    </td>
                  </tr>
                ))}
                
                {/* Experience Rating by Plan */}
                <tr>
                  <td colSpan={2} className="bg-red-800 text-white font-bold px-4 py-3 text-center text-lg">
                    Experience Rating by Plan
                  </td>
                </tr>
                {result.calculationSteps.slice(sectionIndices.experience, sectionIndices.manual).map((step, idx) => (
                  <tr key={idx+sectionIndices.experience} className={`${
                    highlightRows.includes(idx+sectionIndices.experience) 
                      ? 'font-bold bg-red-100 border-l-4 border-red-500' 
                      : 'hover:bg-gray-50'
                  } border-b border-gray-100`}>
                    <td className="px-4 py-3 text-gray-900">{step.label}</td>
                    <td className="px-4 py-3 text-right tabular-nums font-semibold text-gray-900">
                      {formatValue(step)}
                    </td>
                  </tr>
                ))}
                
                {/* Manual Rating by Plan */}
                <tr>
                  <td colSpan={2} className="bg-red-800 text-white font-bold px-4 py-3 text-center text-lg">
                    Manual Rating by Plan
                  </td>
                </tr>
                {result.calculationSteps.slice(sectionIndices.manual, sectionIndices.composite).map((step, idx) => (
                  <tr key={idx+sectionIndices.manual} className={`${
                    highlightRows.includes(idx+sectionIndices.manual) 
                      ? 'font-bold bg-red-100 border-l-4 border-red-500' 
                      : 'hover:bg-gray-50'
                  } border-b border-gray-100`}>
                    <td className="px-4 py-3 text-gray-900">{step.label}</td>
                    <td className="px-4 py-3 text-right tabular-nums font-semibold text-gray-900">
                      {formatValue(step)}
                    </td>
                  </tr>
                ))}
                
                {/* Composite Results */}
                <tr>
                  <td colSpan={2} className="bg-red-900 text-white font-bold px-4 py-3 text-center text-lg">
                    Composite Results
                  </td>
                </tr>
                {result.calculationSteps.slice(sectionIndices.composite).map((step, idx) => (
                  <tr key={idx+sectionIndices.composite} className={`${
                    highlightRows.includes(idx+sectionIndices.composite) 
                      ? 'font-bold bg-red-100 border-l-4 border-red-500' 
                      : 'hover:bg-gray-50'
                  } border-b border-gray-100`}>
                    <td className="px-4 py-3 text-gray-900">{step.label}</td>
                    <td className="px-4 py-3 text-right tabular-nums font-semibold text-gray-900">
                      {formatValue(step)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
      
      <div className="mt-8 bg-white rounded-lg p-6 shadow-sm border border-gray-200">
        <h4 className="font-bold text-red-900 text-lg mb-4 text-center">Summary</h4>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-w-2xl mx-auto">
          <div className="flex justify-between items-center p-3 bg-red-50 rounded">
            <span className="text-sm text-gray-700 font-medium">Current Premium PMPM:</span>
            <span className="font-bold text-red-900">{formatCurrency(Number(result.currentPremiumPMPM))}</span>
          </div>
          <div className="flex justify-between items-center p-3 bg-red-50 rounded">
            <span className="text-sm text-gray-700 font-medium">Projected Premium PMPM:</span>
            <span className="font-bold text-red-900">{formatCurrency(Number(result.projectedPremiumPMPM))}</span>
          </div>
          <div className="flex justify-between items-center p-3 bg-red-50 rounded">
            <span className="text-sm text-gray-700 font-medium">Required Rate Change:</span>
            <span className="font-bold text-red-900">{formatPercentage(result.requiredRateChange)}</span>
          </div>
          <div className="flex justify-between items-center p-3 bg-red-50 rounded">
            <span className="text-sm text-gray-700 font-medium">Proposed Rate Change:</span>
            <span className="font-bold text-red-900">{formatPercentage(result.proposedRateChange)}</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default BCBSTemplate; 
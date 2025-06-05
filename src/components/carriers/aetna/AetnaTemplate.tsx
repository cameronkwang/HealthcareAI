import React from 'react';
import { AetnaResult, AetnaCalculationLine } from '../../../types/aetna';

interface AetnaTemplateProps {
  result: AetnaResult;
  onExport?: () => void;
}

export const AetnaTemplate: React.FC<AetnaTemplateProps> = ({ result, onExport }) => {
  const formatCurrency = (value: number): string => {
    return `$${value.toFixed(2)}`;
  };

  const formatPercent = (value: number): string => {
    return `${(value * 100).toFixed(2)}%`;
  };

  const formatFactor = (value: number): string => {
    return value.toFixed(4);
  };

  const getValueDisplay = (line: AetnaCalculationLine, column: 'medCap' | 'rx' | 'total', period: 'current' | 'prior'): string => {
    const value = line[period][column];
    
    // Special formatting based on line type
    if (['2', '7', '8', '9', '10', '12', '14', '16', '23'].includes(line.lineNumber)) {
      // These are factors/percentages
      return formatFactor(value);
    } else if (line.lineNumber === '28') {
      // Rate change is a percentage
      return formatPercent(value);
    } else {
      // Everything else is currency
      return formatCurrency(value);
    }
  };

  return (
    <div className="bg-white shadow-lg rounded-lg p-6">
      {/* Header Section */}
      <div className="mb-6">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-2xl font-bold text-gray-900">
            AETNA Renewal Analysis
          </h2>
          {onExport && (
            <button
              onClick={onExport}
              className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md text-sm font-medium"
            >
              Export Report
            </button>
          )}
        </div>
        
        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <div className="bg-blue-50 p-4 rounded-lg">
            <h3 className="text-sm font-medium text-blue-600">Current Premium PMPM</h3>
            <p className="text-2xl font-bold text-blue-900">
              {formatCurrency(result.calculations.find(c => c.lineNumber === '27')?.current.total || 0)}
            </p>
          </div>
          <div className="bg-green-50 p-4 rounded-lg">
            <h3 className="text-sm font-medium text-green-600">Projected Premium PMPM</h3>
            <p className="text-2xl font-bold text-green-900">
              {formatCurrency(result.finalPremiumPMPM)}
            </p>
          </div>
          <div className="bg-orange-50 p-4 rounded-lg">
            <h3 className="text-sm font-medium text-orange-600">Required Rate Change</h3>
            <p className="text-2xl font-bold text-orange-900">
              {formatPercent(result.rateChange)}
            </p>
          </div>
          <div className="bg-purple-50 p-4 rounded-lg">
            <h3 className="text-sm font-medium text-purple-600">Experience Credibility</h3>
            <p className="text-2xl font-bold text-purple-900">
              {formatPercent(result.dataQuality.credibilityScore)}
            </p>
          </div>
        </div>

        {/* Period Information */}
        <div className="bg-gray-50 p-4 rounded-lg mb-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-3">Experience Periods</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <h4 className="font-medium text-gray-700">Current Period</h4>
              <p className="text-sm text-gray-600">
                {result.periods.current.start.toLocaleDateString()} - {result.periods.current.end.toLocaleDateString()}
              </p>
              <p className="text-sm text-gray-600">
                {result.periods.current.months} months, {result.summary.memberMonthsUsed.current.toLocaleString()} member months
              </p>
              {result.dataQuality.annualizationApplied && (
                <p className="text-sm text-orange-600 font-medium">
                  ⚠️ Annualized due to partial year data
                </p>
              )}
            </div>
            {result.periods.prior && (
              <div>
                <h4 className="font-medium text-gray-700">Prior Period</h4>
                <p className="text-sm text-gray-600">
                  {result.periods.prior.start.toLocaleDateString()} - {result.periods.prior.end.toLocaleDateString()}
                </p>
                <p className="text-sm text-gray-600">
                  {result.periods.prior.months} months, {result.summary.memberMonthsUsed.prior.toLocaleString()} member months
                </p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Main Calculation Table */}
      <div className="overflow-x-auto">
        <table className="min-w-full border-collapse border border-gray-300">
          <thead>
            <tr className="bg-gray-100">
              <th className="border border-gray-300 px-3 py-2 text-left text-sm font-semibold text-gray-900">
                Line
              </th>
              <th className="border border-gray-300 px-3 py-2 text-left text-sm font-semibold text-gray-900">
                Description
              </th>
              <th className="border border-gray-300 px-3 py-2 text-center text-sm font-semibold text-gray-900">
                Current Med+Cap PMPM
              </th>
              <th className="border border-gray-300 px-3 py-2 text-center text-sm font-semibold text-gray-900">
                Current Rx PMPM
              </th>
              <th className="border border-gray-300 px-3 py-2 text-center text-sm font-semibold text-gray-900">
                Current Total PMPM
              </th>
              <th className="border border-gray-300 px-3 py-2 text-center text-sm font-semibold text-gray-900">
                Prior Med+Cap PMPM
              </th>
              <th className="border border-gray-300 px-3 py-2 text-center text-sm font-semibold text-gray-900">
                Prior Rx PMPM
              </th>
              <th className="border border-gray-300 px-3 py-2 text-center text-sm font-semibold text-gray-900">
                Prior Total PMPM
              </th>
            </tr>
          </thead>
          <tbody>
            {result.calculations.map((calc, index) => (
              <tr key={calc.lineNumber} className={index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                <td className="border border-gray-300 px-3 py-2 text-sm font-medium text-gray-900">
                  {calc.lineNumber}
                </td>
                <td className="border border-gray-300 px-3 py-2 text-sm text-gray-900">
                  <div>
                    {calc.description}
                    {calc.calculation && (
                      <div className="text-xs text-gray-500 mt-1">
                        {calc.calculation}
                      </div>
                    )}
                  </div>
                </td>
                <td className="border border-gray-300 px-3 py-2 text-sm text-right text-gray-900">
                  {getValueDisplay(calc, 'medCap', 'current')}
                </td>
                <td className="border border-gray-300 px-3 py-2 text-sm text-right text-gray-900">
                  {getValueDisplay(calc, 'rx', 'current')}
                </td>
                <td className="border border-gray-300 px-3 py-2 text-sm text-right font-medium text-gray-900">
                  {getValueDisplay(calc, 'total', 'current')}
                </td>
                <td className="border border-gray-300 px-3 py-2 text-sm text-right text-gray-900">
                  {getValueDisplay(calc, 'medCap', 'prior')}
                </td>
                <td className="border border-gray-300 px-3 py-2 text-sm text-right text-gray-900">
                  {getValueDisplay(calc, 'rx', 'prior')}
                </td>
                <td className="border border-gray-300 px-3 py-2 text-sm text-right font-medium text-gray-900">
                  {getValueDisplay(calc, 'total', 'prior')}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Summary Section */}
      <div className="mt-6 grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Claims Summary */}
        <div className="bg-gray-50 p-4 rounded-lg">
          <h3 className="text-lg font-semibold text-gray-900 mb-3">Claims Summary</h3>
          <div className="space-y-2">
            <div className="flex justify-between">
              <span className="text-sm text-gray-600">Incurred Medical Claims PMPM:</span>
              <span className="text-sm font-medium text-gray-900">
                {formatCurrency(result.summary.incurredClaimsPMPM.medCap)}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm text-gray-600">Incurred Rx Claims PMPM:</span>
              <span className="text-sm font-medium text-gray-900">
                {formatCurrency(result.summary.incurredClaimsPMPM.rx)}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm text-gray-600">Total Incurred Claims PMPM:</span>
              <span className="text-sm font-medium text-gray-900">
                {formatCurrency(result.summary.incurredClaimsPMPM.total)}
              </span>
            </div>
            <div className="border-t pt-2 mt-2">
              <div className="flex justify-between">
                <span className="text-sm text-gray-600">Projected Medical Claims PMPM:</span>
                <span className="text-sm font-medium text-gray-900">
                  {formatCurrency(result.summary.projectedClaimsPMPM.medCap)}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-gray-600">Projected Rx Claims PMPM:</span>
                <span className="text-sm font-medium text-gray-900">
                  {formatCurrency(result.summary.projectedClaimsPMPM.rx)}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-gray-600">Total Projected Claims PMPM:</span>
                <span className="text-sm font-medium text-gray-900">
                  {formatCurrency(result.summary.projectedClaimsPMPM.total)}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Data Quality Indicators */}
        <div className="bg-gray-50 p-4 rounded-lg">
          <h3 className="text-lg font-semibold text-gray-900 mb-3">Data Quality</h3>
          <div className="space-y-2">
            <div className="flex justify-between">
              <span className="text-sm text-gray-600">Experience Credibility:</span>
              <span className="text-sm font-medium text-gray-900">
                {formatPercent(result.dataQuality.credibilityScore)}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm text-gray-600">Data Completeness:</span>
              <span className="text-sm font-medium text-gray-900">
                {formatPercent(result.dataQuality.dataCompleteness)}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm text-gray-600">Annualization Applied:</span>
              <span className="text-sm font-medium text-gray-900">
                {result.dataQuality.annualizationApplied ? 'Yes' : 'No'}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm text-gray-600">Total Retention PMPM:</span>
              <span className="text-sm font-medium text-gray-900">
                {formatCurrency(result.summary.totalRetentionPMPM)}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Warnings Section */}
      {result.warnings.length > 0 && (
        <div className="mt-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-3">Data Quality Warnings</h3>
          <div className="space-y-2">
            {result.warnings.map((warning, index) => (
              <div key={index} className="bg-yellow-50 border border-yellow-200 rounded-md p-3">
                <div className="flex">
                  <div className="flex-shrink-0">
                    <svg className="h-5 w-5 text-yellow-400" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                    </svg>
                  </div>
                  <div className="ml-3">
                    <p className="text-sm text-yellow-800">{warning}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Footer */}
      <div className="mt-8 pt-4 border-t border-gray-200 text-center">
        <p className="text-sm text-gray-500">
          AETNA Renewal Analysis - Generated on {new Date().toLocaleDateString()}
        </p>
      </div>
    </div>
  );
};

export default AetnaTemplate; 
import React from 'react';
import { CignaResult } from '../../../types/cigna';

interface CignaTemplateProps {
  result: CignaResult;
}

const CignaTemplate: React.FC<CignaTemplateProps> = ({ result }) => {
  const formatCurrency = (value: number | string): string => {
    if (typeof value === 'string') return value;
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(value);
  };

  const formatNumber = (value: number): string => {
    return value.toLocaleString('en-US', {
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    });
  };

  const formatPercentage = (value: number): string => {
    return `${(value * 100).toFixed(2)}%`;
  };

  const getValueFormat = (value: number | string): string => {
    if (typeof value === 'string') {
      return value;
    }
    
    // For percentage values
    if (value < 10 && value > -1) {
      if (value < 1 && value > -1) {
        return formatPercentage(value);
      }
    }
    
    return formatCurrency(value);
  };

  const renderCalculationTable = () => (
    <div className="overflow-x-auto">
      <table className="min-w-full border-collapse border border-gray-300">
        <thead>
          <tr className="bg-orange-50">
            <th className="border border-gray-300 px-4 py-3 text-left font-semibold">Description</th>
            <th className="border border-gray-300 px-4 py-3 text-right font-semibold">PMPM</th>
            <th className="border border-gray-300 px-4 py-3 text-right font-semibold">Annual</th>
          </tr>
        </thead>
        <tbody>
          {result.calculations.map((calc, index) => {
            const isHeader = ['Experience Weight', 'Manual Weight', 'Claims Fluctuation Corridor'].includes(calc.description);
            const isSubtotal = ['Experience Claim Cost', 'Total Projected Claims', 'Blended Claims Cost', 'Final Claims Cost', 'Total Required Premium'].includes(calc.description);
            const isRateChange = calc.description === 'Required Rate Change';
            
            return (
              <tr 
                key={index} 
                className={`
                  ${index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}
                  ${isHeader ? 'bg-orange-100 font-medium' : ''}
                  ${isSubtotal ? 'bg-orange-50 font-semibold border-t-2 border-orange-200' : ''}
                  ${isRateChange ? 'bg-orange-200 font-bold text-orange-900' : ''}
                `}
              >
                <td className="border border-gray-300 px-4 py-2 text-sm">
                  {calc.description}
                </td>
                <td className="border border-gray-300 px-4 py-2 text-right text-sm font-mono">
                  {getValueFormat(calc.pmpm)}
                </td>
                <td className="border border-gray-300 px-4 py-2 text-right text-sm font-mono">
                  {getValueFormat(calc.annual)}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );

  const renderSummaryCards = () => (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
      <div className="bg-white p-4 rounded-lg shadow">
        <h3 className="text-sm font-medium text-gray-500 mb-1">Required Premium</h3>
        <p className="text-2xl font-bold text-orange-600">
          {formatCurrency(result.finalPremium.pmpm)}
        </p>
        <p className="text-xs text-gray-500">Per Member Per Month</p>
      </div>
      
      <div className="bg-white p-4 rounded-lg shadow">
        <h3 className="text-sm font-medium text-gray-500 mb-1">Rate Change</h3>
        <p className={`text-2xl font-bold ${result.rateChange >= 0 ? 'text-red-600' : 'text-green-600'}`}>
          {formatPercentage(result.rateChange)}
        </p>
        <p className="text-xs text-gray-500">From Current Premium</p>
      </div>
      
      <div className="bg-white p-4 rounded-lg shadow">
        <h3 className="text-sm font-medium text-gray-500 mb-1">Annual Premium</h3>
        <p className="text-2xl font-bold text-orange-600">
          {formatCurrency(result.finalPremium.annual)}
        </p>
        <p className="text-xs text-gray-500">Total Projected</p>
      </div>
      
      <div className="bg-white p-4 rounded-lg shadow">
        <h3 className="text-sm font-medium text-gray-500 mb-1">Experience Period</h3>
        <p className="text-2xl font-bold text-purple-600">
          {result.period.months}
        </p>
        <p className="text-xs text-gray-500">Months of Data</p>
      </div>
    </div>
  );

  const renderPeriodAnalysis = () => (
    <div className="bg-white p-6 rounded-lg shadow mb-6">
      <h3 className="text-lg font-semibold mb-4 text-gray-800">Experience Period Analysis</h3>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Single Period Details */}
        <div className="border-l-4 border-orange-500 pl-4">
          <h4 className="font-semibold text-orange-700 mb-2">
            Experience Period ({result.period.months} months)
          </h4>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-gray-600">Start Date:</span>
              <span className="font-mono">{result.period.start.toLocaleDateString()}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">End Date:</span>
              <span className="font-mono">{result.period.end.toLocaleDateString()}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Member Months:</span>
              <span className="font-mono">{formatNumber(result.period.memberMonths)}</span>
            </div>
            <div className="flex justify-between border-t pt-2">
              <span className="text-gray-600 font-semibold">Data Quality:</span>
              <span className="font-mono font-semibold">
                {result.dataQuality.dataCompleteness >= 1.0 ? 'Complete' : 'Partial'}
              </span>
            </div>
          </div>
        </div>

        {/* Claims Summary */}
        <div className="border-l-4 border-gray-500 pl-4">
          <h4 className="font-semibold text-gray-700 mb-2">Claims Summary</h4>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-gray-600">Total Paid Claims:</span>
              <span className="font-mono">{formatCurrency(result.summary.totalPaidClaims.pmpm)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Experience Claims:</span>
              <span className="font-mono">{formatCurrency(result.summary.experienceClaimCost.pmpm)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Projected Claims:</span>
              <span className="font-mono">{formatCurrency(result.summary.projectedClaimCost.pmpm)}</span>
            </div>
            <div className="flex justify-between border-t pt-2">
              <span className="text-gray-600 font-semibold">Total Expenses:</span>
              <span className="font-mono font-semibold">{formatCurrency(result.summary.totalExpenses.pmpm)}</span>
            </div>
          </div>
        </div>
      </div>

      {/* CIGNA Methodology Notes */}
      <div className="mt-6 p-4 bg-orange-50 rounded">
        <h4 className="font-semibold text-orange-800 mb-2">CIGNA Methodology Notes</h4>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
          <div>
            <p className="text-gray-700">
              <strong>Single Period:</strong> CIGNA uses the most recent 12-month experience period only
            </p>
          </div>
          <div>
            <p className="text-gray-700">
              <strong>Pooling Threshold:</strong> $50,000 (lowest among major carriers)
            </p>
          </div>
          <div>
            <p className="text-gray-700">
              <strong>Dual Columns:</strong> PMPM and Annual calculations displayed side by side
            </p>
          </div>
          <div>
            <p className="text-gray-700">
              <strong>CFC Analysis:</strong> Claims Fluctuation Corridor for rate stability
            </p>
          </div>
        </div>
      </div>
    </div>
  );

  const renderBreakdownAnalysis = () => (
    <div className="bg-white p-6 rounded-lg shadow mb-6">
      <h3 className="text-lg font-semibold mb-4 text-gray-800">Premium Breakdown Analysis</h3>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Claims Progression */}
        <div className="space-y-3">
          <h4 className="font-semibold text-orange-700">Claims Progression</h4>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between p-2 bg-gray-50 rounded">
              <span>Total Paid Claims</span>
              <span className="font-mono">{formatCurrency(result.summary.totalPaidClaims.pmpm)}</span>
            </div>
            <div className="flex justify-between p-2 bg-gray-50 rounded">
              <span>After Pooling</span>
              <span className="font-mono">{formatCurrency(result.summary.experienceClaimCost.pmpm)}</span>
            </div>
            <div className="flex justify-between p-2 bg-orange-100 rounded">
              <span>Final Projected</span>
              <span className="font-mono font-semibold">{formatCurrency(result.summary.projectedClaimCost.pmpm)}</span>
            </div>
          </div>
        </div>

        {/* Cost Components */}
        <div className="space-y-3">
          <h4 className="font-semibold text-orange-700">Cost Components</h4>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between p-2 bg-gray-50 rounded">
              <span>Claims Cost</span>
              <span className="font-mono">{formatCurrency(result.summary.projectedClaimCost.pmpm)}</span>
            </div>
            <div className="flex justify-between p-2 bg-gray-50 rounded">
              <span>Expenses</span>
              <span className="font-mono">{formatCurrency(result.summary.totalExpenses.pmpm)}</span>
            </div>
            <div className="flex justify-between p-2 bg-orange-100 rounded">
              <span>Total Premium</span>
              <span className="font-mono font-semibold">{formatCurrency(result.finalPremium.pmpm)}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Annual Projections */}
      <div className="mt-6 p-4 bg-orange-50 rounded">
        <h4 className="font-semibold text-orange-800 mb-3">Annual Projections</h4>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
          <div className="text-center">
            <p className="text-gray-600">Total Claims</p>
            <p className="text-xl font-bold text-orange-600">
              {formatCurrency(result.summary.projectedClaimCost.annual)}
            </p>
          </div>
          <div className="text-center">
            <p className="text-gray-600">Total Expenses</p>
            <p className="text-xl font-bold text-gray-600">
              {formatCurrency(result.summary.totalExpenses.annual)}
            </p>
          </div>
          <div className="text-center">
            <p className="text-gray-600">Total Premium</p>
            <p className="text-xl font-bold text-orange-600">
              {formatCurrency(result.finalPremium.annual)}
            </p>
          </div>
        </div>
      </div>
    </div>
  );

  const renderWarnings = () => {
    if (!result.warnings || result.warnings.length === 0) return null;

    return (
      <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4 mb-6">
        <div className="flex">
          <div className="flex-shrink-0">
            <svg className="h-5 w-5 text-yellow-400" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
            </svg>
          </div>
          <div className="ml-3">
            <h3 className="text-sm font-medium text-yellow-800">Data Quality Warnings</h3>
            <div className="mt-2 text-sm text-yellow-700">
              <ul className="list-disc list-inside space-y-1">
                {result.warnings.map((warning, index) => (
                  <li key={index}>{warning}</li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </div>
    );
  };

  const renderDataQuality = () => (
    <div className="bg-white p-6 rounded-lg shadow">
      <h3 className="text-lg font-semibold mb-4 text-gray-800">Data Quality Assessment</h3>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="flex justify-between">
          <span className="text-gray-600">Data Completeness:</span>
          <span className="font-mono">
            {result.dataQuality.dataCompleteness >= 1.0 ? 'Complete' : 'Partial'}
          </span>
        </div>
        <div className="flex justify-between">
          <span className="text-gray-600">Period Coverage:</span>
          <span className="font-mono">
            {result.period.months >= 12 ? 'Full Year' : 'Partial Year'}
          </span>
        </div>
        <div className="flex justify-between">
          <span className="text-gray-600">Annualized:</span>
          <span className="font-mono">
            {result.dataQuality.annualizationApplied ? 'Yes' : 'No'}
          </span>
        </div>
      </div>
      
      {result.cfcAnalysis && (
        <div className="mt-4 p-3 bg-orange-50 rounded">
          <h4 className="font-semibold text-orange-800 mb-2">Claims Fluctuation Corridor Analysis</h4>
          <div className="text-sm text-gray-700">
            {result.cfcAnalysis.adjustmentApplied ? (
              <p>
                CFC adjustment applied: {formatPercentage(result.cfcAnalysis.adjustmentPercent)}
                (Premium adjusted from {formatCurrency(result.cfcAnalysis.originalPremium)} to {formatCurrency(result.cfcAnalysis.adjustedPremium)})
              </p>
            ) : (
              <p>No CFC adjustment needed - premium within acceptable range</p>
            )}
          </div>
        </div>
      )}
    </div>
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-gradient-to-r from-orange-600 to-orange-700 text-white p-6 rounded-lg">
        <h1 className="text-2xl font-bold mb-2">CIGNA Renewal Analysis</h1>
        <p className="text-orange-100">PMPM/Annual Dual Column Methodology with $50K Pooling</p>
      </div>

      {/* Warnings */}
      {renderWarnings()}

      {/* Summary Cards */}
      {renderSummaryCards()}

      {/* Period Analysis */}
      {renderPeriodAnalysis()}

      {/* Breakdown Analysis */}
      {renderBreakdownAnalysis()}

      {/* Main Calculation Table */}
      <div className="bg-white p-6 rounded-lg shadow">
        <h3 className="text-lg font-semibold mb-4 text-gray-800">
          CIGNA PMPM/Annual Calculation Worksheet
        </h3>
        {renderCalculationTable()}
      </div>

      {/* Data Quality */}
      {renderDataQuality()}

      {/* Footer */}
      <div className="text-center text-gray-500 text-sm">
        <p>CIGNA Renewal Calculation - Generated {new Date().toLocaleDateString()}</p>
      </div>
    </div>
  );
};

export default CignaTemplate; 
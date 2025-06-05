import React from 'react';
import { UHCResult } from '../../../types/uhc';

interface UHCTemplateProps {
  result: UHCResult;
}

const UHCTemplate: React.FC<UHCTemplateProps> = ({ result }) => {
  const formatCurrency = (value: number): string => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(value);
  };

  const formatFactor = (value: number): string => {
    return value.toFixed(4);
  };

  const formatPercentage = (value: number): string => {
    return `${(value * 100).toFixed(2)}%`;
  };

  const formatNumber = (value: number): string => {
    return value.toLocaleString('en-US', {
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    });
  };

  const getValueFormat = (line: string, value: number): string => {
    // Lines with factors
    if (['E', 'F', 'G', 'H', 'M'].includes(line)) {
      return formatFactor(value);
    }
    // Rate change line
    if (line === 'Y') {
      return formatPercentage(value);
    }
    // All other lines are currency
    return formatCurrency(value);
  };

  const renderCalculationTable = () => (
    <div className="overflow-x-auto">
      <table className="min-w-full border-collapse border border-gray-300">
        <thead>
          <tr className="bg-blue-50">
            <th className="border border-gray-300 px-3 py-2 text-left font-semibold">Line</th>
            <th className="border border-gray-300 px-3 py-2 text-left font-semibold">Description</th>
            <th className="border border-gray-300 px-3 py-2 text-right font-semibold">Medical</th>
            <th className="border border-gray-300 px-3 py-2 text-right font-semibold">Rx</th>
            <th className="border border-gray-300 px-3 py-2 text-right font-semibold">Total</th>
          </tr>
        </thead>
        <tbody>
          {result.calculations.map((calc, index) => (
            <tr key={calc.line} className={index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
              <td className="border border-gray-300 px-3 py-2 font-mono text-sm font-semibold">
                {calc.line}
              </td>
              <td className="border border-gray-300 px-3 py-2 text-sm">
                {calc.description}
              </td>
              <td className="border border-gray-300 px-3 py-2 text-right text-sm font-mono">
                {getValueFormat(calc.line, calc.current.medical)}
              </td>
              <td className="border border-gray-300 px-3 py-2 text-right text-sm font-mono">
                {getValueFormat(calc.line, calc.current.rx)}
              </td>
              <td className="border border-gray-300 px-3 py-2 text-right text-sm font-mono font-semibold">
                {getValueFormat(calc.line, calc.current.total)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );

  const renderSummaryCards = () => (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
      <div className="bg-white p-4 rounded-lg shadow">
        <h3 className="text-sm font-medium text-gray-500 mb-1">Required Premium</h3>
        <p className="text-2xl font-bold text-blue-600">
          {formatCurrency(result.finalPremium.total)}
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
        <h3 className="text-sm font-medium text-gray-500 mb-1">Experience Weight</h3>
        <p className="text-2xl font-bold text-purple-600">
          {formatPercentage(result.summary.credibilityWeighting.credibilityFactor)}
        </p>
        <p className="text-xs text-gray-500">vs Manual Rates</p>
      </div>
      
      <div className="bg-white p-4 rounded-lg shadow">
        <h3 className="text-sm font-medium text-gray-500 mb-1">Total Retention</h3>
        <p className="text-2xl font-bold text-orange-600">
          {formatCurrency(result.summary.totalRetention)}
        </p>
        <p className="text-xs text-gray-500">Admin + Profit + Risk</p>
      </div>
    </div>
  );

  const renderPeriodAnalysis = () => (
    <div className="bg-white p-6 rounded-lg shadow mb-6">
      <h3 className="text-lg font-semibold mb-4 text-gray-800">Experience Period Analysis</h3>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Current Period */}
        <div className="border-l-4 border-blue-500 pl-4">
          <h4 className="font-semibold text-blue-700 mb-2">
            Current Period ({result.periods.current.months} months)
          </h4>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-gray-600">Member Months:</span>
              <span className="font-mono">{formatNumber(result.periodAnalysis.current.memberMonths)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Medical PMPM:</span>
              <span className="font-mono">{formatCurrency(result.periodAnalysis.current.medicalPMPM)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Rx PMPM:</span>
              <span className="font-mono">{formatCurrency(result.periodAnalysis.current.rxPMPM)}</span>
            </div>
            <div className="flex justify-between border-t pt-2">
              <span className="text-gray-600 font-semibold">Total PMPM:</span>
              <span className="font-mono font-semibold">{formatCurrency(result.periodAnalysis.current.totalPMPM)}</span>
            </div>
          </div>
        </div>

        {/* Prior Period */}
        {result.periodAnalysis.prior && (
          <div className="border-l-4 border-gray-500 pl-4">
            <h4 className="font-semibold text-gray-700 mb-2">
              Prior Period ({result.periods.prior?.months} months)
            </h4>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-600">Member Months:</span>
                <span className="font-mono">{formatNumber(result.periodAnalysis.prior.memberMonths)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Medical PMPM:</span>
                <span className="font-mono">{formatCurrency(result.periodAnalysis.prior.medicalPMPM)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Rx PMPM:</span>
                <span className="font-mono">{formatCurrency(result.periodAnalysis.prior.rxPMPM)}</span>
              </div>
              <div className="flex justify-between border-t pt-2">
                <span className="text-gray-600 font-semibold">Total PMPM:</span>
                <span className="font-mono font-semibold">{formatCurrency(result.periodAnalysis.prior.totalPMPM)}</span>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Period Weighting */}
      <div className="mt-6 p-4 bg-blue-50 rounded">
        <h4 className="font-semibold text-blue-800 mb-2">UHC Period Weighting (70%/30%)</h4>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
          <div className="flex justify-between">
            <span className="text-gray-600">Weighted Medical:</span>
            <span className="font-mono">{formatCurrency(result.summary.weightedExperience.medical)}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-600">Weighted Rx:</span>
            <span className="font-mono">{formatCurrency(result.summary.weightedExperience.rx)}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-600 font-semibold">Weighted Total:</span>
            <span className="font-mono font-semibold">{formatCurrency(result.summary.weightedExperience.total)}</span>
          </div>
        </div>
      </div>
    </div>
  );

  const renderCredibilityAnalysis = () => (
    <div className="bg-white p-6 rounded-lg shadow mb-6">
      <h3 className="text-lg font-semibold mb-4 text-gray-800">Credibility Analysis</h3>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="text-center p-4 bg-purple-50 rounded">
          <h4 className="font-semibold text-purple-700 mb-2">Experience Weight</h4>
          <p className="text-3xl font-bold text-purple-600">
            {formatPercentage(result.summary.credibilityWeighting.experience)}
          </p>
        </div>
        <div className="text-center p-4 bg-gray-50 rounded">
          <h4 className="font-semibold text-gray-700 mb-2">Manual Weight</h4>
          <p className="text-3xl font-bold text-gray-600">
            {formatPercentage(result.summary.credibilityWeighting.manual)}
          </p>
        </div>
        <div className="text-center p-4 bg-blue-50 rounded">
          <h4 className="font-semibold text-blue-700 mb-2">Total Members</h4>
          <p className="text-3xl font-bold text-blue-600">
            {formatNumber(result.periodAnalysis.current.memberMonths / result.periods.current.months)}
          </p>
          <p className="text-xs text-gray-500 mt-1">Average Monthly</p>
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
          <span className="font-mono">{formatPercentage(result.dataQuality.dataCompleteness)}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-gray-600">Credibility Score:</span>
          <span className="font-mono">{formatPercentage(result.dataQuality.credibilityScore)}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-gray-600">Annualized:</span>
          <span className="font-mono">{result.dataQuality.annualizationApplied ? 'Yes' : 'No'}</span>
        </div>
      </div>
    </div>
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-gradient-to-r from-blue-600 to-blue-700 text-white p-6 rounded-lg">
        <h1 className="text-2xl font-bold mb-2">UHC Renewal Analysis</h1>
        <p className="text-blue-100">Lines A-Y Methodology with $125K Pooling</p>
      </div>

      {/* Warnings */}
      {renderWarnings()}

      {/* Summary Cards */}
      {renderSummaryCards()}

      {/* Period Analysis */}
      {renderPeriodAnalysis()}

      {/* Credibility Analysis */}
      {renderCredibilityAnalysis()}

      {/* Main Calculation Table */}
      <div className="bg-white p-6 rounded-lg shadow">
        <h3 className="text-lg font-semibold mb-4 text-gray-800">
          UHC Lines A-Y Calculation Worksheet
        </h3>
        {renderCalculationTable()}
      </div>

      {/* Data Quality */}
      {renderDataQuality()}

      {/* Footer */}
      <div className="text-center text-gray-500 text-sm">
        <p>United HealthCare Renewal Calculation - Generated {new Date().toLocaleDateString()}</p>
      </div>
    </div>
  );
};

export default UHCTemplate; 
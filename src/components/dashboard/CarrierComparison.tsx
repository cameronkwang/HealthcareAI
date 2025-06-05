import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  BuildingOfficeIcon,
  ChartBarIcon,
  ArrowTrendingUpIcon,
  ArrowTrendingDownIcon,
  StarIcon,
  CheckCircleIcon,
  XCircleIcon,
  InformationCircleIcon
} from '@heroicons/react/24/outline';

// @ts-ignore
const MotionDiv: any = motion.div;

interface CarrierData {
  id: string;
  name: string;
  logo: string;
  color: string;
  metrics: {
    premiumProjection: number;
    lossRatio: number;
    renewalRate: number;
    memberMonths: number;
    avgClaimCost: number;
    totalClaims: number;
  };
  features: {
    networkSize: string;
    customerService: number; // 1-5 rating
    digitalTools: boolean;
    preventiveCare: boolean;
    specialtyAccess: string;
  };
  pricing: {
    baseRate: number;
    adminFee: number;
    stopLoss: number;
    total: number;
  };
  recommendations: string[];
  risks: string[];
}

interface CarrierComparisonProps {
  carriers: CarrierData[];
  loading?: boolean;
}

const CarrierComparison: React.FC<CarrierComparisonProps> = ({ 
  carriers = [], 
  loading = false 
}) => {
  const [activeTab, setActiveTab] = useState<'overview' | 'metrics' | 'features' | 'pricing'>('overview');
  const [selectedCarriers, setSelectedCarriers] = useState<string[]>(carriers.map(c => c.id));
  const [comparisonMode, setComparisonMode] = useState<'side-by-side' | 'detailed'>('side-by-side');

  const tabs = [
    { id: 'overview', label: 'Overview', icon: BuildingOfficeIcon },
    { id: 'metrics', label: 'Key Metrics', icon: ChartBarIcon },
    { id: 'features', label: 'Features', icon: StarIcon },
    { id: 'pricing', label: 'Pricing', icon: ArrowTrendingUpIcon }
  ];

  const toggleCarrierSelection = (carrierId: string) => {
    setSelectedCarriers(prev => 
      prev.includes(carrierId) 
        ? prev.filter(id => id !== carrierId)
        : [...prev, carrierId]
    );
  };

  const getSelectedCarriers = () => carriers.filter(c => selectedCarriers.includes(c.id));

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const formatPercentage = (value: number) => {
    return `${(value * 100).toFixed(1)}%`;
  };

  const formatNumber = (value: number) => {
    return new Intl.NumberFormat('en-US').format(Math.round(value));
  };

  const formatTrendPercentage = (value: number) => {
    const sign = value >= 0 ? '+' : '';
    return `${sign}${value.toFixed(1)}%`;
  };

  const getTrendIcon = (value: number, isGoodWhenHigh: boolean = true) => {
    const isPositive = isGoodWhenHigh ? value > 0 : value < 0;
    return isPositive ? (
      <ArrowTrendingUpIcon className="w-4 h-4 text-green-600" />
    ) : (
      <ArrowTrendingDownIcon className="w-4 h-4 text-red-600" />
    );
  };

  const getRatingStars = (rating: number) => {
    return Array.from({ length: 5 }, (_, i) => (
      <StarIcon
        key={i}
        className={`w-4 h-4 ${i < rating ? 'text-yellow-400 fill-current' : 'text-gray-300'}`}
      />
    ));
  };

  if (loading) {
    return (
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-1/3 mb-6"></div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {[1, 2, 3].map(i => (
              <div key={i} className="space-y-4">
                <div className="h-6 bg-gray-200 rounded"></div>
                <div className="h-32 bg-gray-200 rounded"></div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200">
      {/* Header */}
      <div className="border-b border-gray-200 p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold text-gray-900">Carrier Comparison</h2>
          <div className="flex items-center space-x-3">
            <select
              value={comparisonMode}
              onChange={(e) => setComparisonMode(e.target.value as 'side-by-side' | 'detailed')}
              className="px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="side-by-side">Side by Side</option>
              <option value="detailed">Detailed View</option>
            </select>
          </div>
        </div>

        {/* Carrier Selection */}
        <div className="flex flex-wrap gap-3">
          {carriers.map(carrier => (
            <button
              key={carrier.id}
              onClick={() => toggleCarrierSelection(carrier.id)}
              className={`flex items-center space-x-2 px-4 py-2 rounded-lg border transition-all ${
                selectedCarriers.includes(carrier.id)
                  ? `border-${carrier.color}-500 bg-${carrier.color}-50 text-${carrier.color}-700`
                  : 'border-gray-300 bg-white text-gray-700 hover:border-gray-400'
              }`}
            >
              <div 
                className={`w-3 h-3 rounded-full`}
                style={{ backgroundColor: carrier.color }}
              />
              <span className="font-medium">{carrier.name}</span>
              {selectedCarriers.includes(carrier.id) && (
                <CheckCircleIcon className="w-4 h-4" />
              )}
            </button>
          ))}
        </div>

        {/* Tabs */}
        <div className="flex space-x-1 mt-6">
          {tabs.map(tab => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`flex items-center space-x-2 px-4 py-2 rounded-lg font-medium transition-colors ${
                  activeTab === tab.id
                    ? 'bg-blue-100 text-blue-700'
                    : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
                }`}
              >
                <Icon className="w-4 h-4" />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Content */}
      <div className="p-6">
        <AnimatePresence mode="wait">
          <MotionDiv
            key={activeTab}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.2 }}
          >
            {activeTab === 'overview' && (
              <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
                {getSelectedCarriers().map(carrier => (
                  <div key={carrier.id} className="border border-gray-200 rounded-lg p-6">
                    <div className="flex items-center space-x-3 mb-4">
                      <div 
                        className="w-12 h-12 rounded-lg flex items-center justify-center text-white font-bold text-lg"
                        style={{ backgroundColor: carrier.color }}
                      >
                        {carrier.name.charAt(0)}
                      </div>
                      <div>
                        <h3 className="font-semibold text-gray-900">{carrier.name}</h3>
                        <p className="text-sm text-gray-500">Insurance Carrier</p>
                      </div>
                    </div>

                    <div className="space-y-3">
                      <div className="flex justify-between items-center">
                        <span className="text-sm text-gray-600">Premium Projection</span>
                        <span className="font-semibold">{formatCurrency(carrier.metrics.premiumProjection)}</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-sm text-gray-600">Loss Ratio</span>
                        <span className="font-semibold">{formatPercentage(carrier.metrics.lossRatio)}</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-sm text-gray-600">Renewal Rate</span>
                        <span className="font-semibold">{formatPercentage(carrier.metrics.renewalRate)}</span>
                      </div>
                    </div>

                    <div className="mt-4 pt-4 border-t border-gray-200">
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-gray-600">Customer Service</span>
                        <div className="flex space-x-1">
                          {getRatingStars(carrier.features.customerService)}
                        </div>
                      </div>
                    </div>

                    {carrier.recommendations.length > 0 && (
                      <div className="mt-4 p-3 bg-green-50 rounded-lg">
                        <div className="flex items-start space-x-2">
                          <CheckCircleIcon className="w-4 h-4 text-green-600 mt-0.5 flex-shrink-0" />
                          <div>
                            <p className="text-sm font-medium text-green-800">Recommended</p>
                            <p className="text-xs text-green-700">{carrier.recommendations[0]}</p>
                          </div>
                        </div>
                      </div>
                    )}

                    {carrier.risks.length > 0 && (
                      <div className="mt-2 p-3 bg-yellow-50 rounded-lg">
                        <div className="flex items-start space-x-2">
                          <InformationCircleIcon className="w-4 h-4 text-yellow-600 mt-0.5 flex-shrink-0" />
                          <div>
                            <p className="text-sm font-medium text-yellow-800">Consider</p>
                            <p className="text-xs text-yellow-700">{carrier.risks[0]}</p>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}

            {activeTab === 'metrics' && (
              <div className="overflow-x-auto">
                <table className="min-w-full">
                  <thead>
                    <tr className="border-b border-gray-200">
                      <th className="text-left py-3 px-4 font-medium text-gray-900">Metric</th>
                      {getSelectedCarriers().map(carrier => (
                        <th key={carrier.id} className="text-center py-3 px-4 font-medium text-gray-900">
                          <div className="flex items-center justify-center space-x-2">
                            <div 
                              className="w-3 h-3 rounded-full"
                              style={{ backgroundColor: carrier.color }}
                            />
                            <span>{carrier.name}</span>
                          </div>
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    <tr>
                      <td className="py-4 px-4 font-medium text-gray-900">Premium Projection</td>
                      {getSelectedCarriers().map(carrier => (
                        <td key={carrier.id} className="py-4 px-4 text-center">
                          {formatCurrency(carrier.metrics.premiumProjection)}
                        </td>
                      ))}
                    </tr>
                    <tr>
                      <td className="py-4 px-4 font-medium text-gray-900">Loss Ratio</td>
                      {getSelectedCarriers().map(carrier => (
                        <td key={carrier.id} className="py-4 px-4 text-center">
                          <div className="flex items-center justify-center space-x-2">
                            <span>{formatPercentage(carrier.metrics.lossRatio)}</span>
                            {getTrendIcon(carrier.metrics.lossRatio - 0.8, false)}
                          </div>
                        </td>
                      ))}
                    </tr>
                    <tr>
                      <td className="py-4 px-4 font-medium text-gray-900">Renewal Rate</td>
                      {getSelectedCarriers().map(carrier => (
                        <td key={carrier.id} className="py-4 px-4 text-center">
                          <div className="flex items-center justify-center space-x-2">
                            <span>{formatPercentage(carrier.metrics.renewalRate)}</span>
                            {getTrendIcon(carrier.metrics.renewalRate - 0.85)}
                          </div>
                        </td>
                      ))}
                    </tr>
                    <tr>
                      <td className="py-4 px-4 font-medium text-gray-900">Member Months</td>
                      {getSelectedCarriers().map(carrier => (
                        <td key={carrier.id} className="py-4 px-4 text-center">
                          {carrier.metrics.memberMonths.toLocaleString()}
                        </td>
                      ))}
                    </tr>
                    <tr>
                      <td className="py-4 px-4 font-medium text-gray-900">Avg Claim Cost</td>
                      {getSelectedCarriers().map(carrier => (
                        <td key={carrier.id} className="py-4 px-4 text-center">
                          {formatCurrency(carrier.metrics.avgClaimCost)}
                        </td>
                      ))}
                    </tr>
                    <tr>
                      <td className="py-4 px-4 font-medium text-gray-900">Total Claims</td>
                      {getSelectedCarriers().map(carrier => (
                        <td key={carrier.id} className="py-4 px-4 text-center">
                          {formatCurrency(carrier.metrics.totalClaims)}
                        </td>
                      ))}
                    </tr>
                  </tbody>
                </table>
              </div>
            )}

            {activeTab === 'features' && (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {getSelectedCarriers().map(carrier => (
                  <div key={carrier.id} className="border border-gray-200 rounded-lg p-6">
                    <div className="flex items-center space-x-3 mb-6">
                      <div 
                        className="w-8 h-8 rounded-lg flex items-center justify-center text-white font-bold"
                        style={{ backgroundColor: carrier.color }}
                      >
                        {carrier.name.charAt(0)}
                      </div>
                      <h3 className="font-semibold text-gray-900">{carrier.name}</h3>
                    </div>

                    <div className="space-y-4">
                      <div className="flex justify-between items-center">
                        <span className="text-sm text-gray-600">Network Size</span>
                        <span className="font-medium">{carrier.features.networkSize}</span>
                      </div>
                      
                      <div className="flex justify-between items-center">
                        <span className="text-sm text-gray-600">Customer Service</span>
                        <div className="flex space-x-1">
                          {getRatingStars(carrier.features.customerService)}
                        </div>
                      </div>
                      
                      <div className="flex justify-between items-center">
                        <span className="text-sm text-gray-600">Digital Tools</span>
                        {carrier.features.digitalTools ? (
                          <CheckCircleIcon className="w-5 h-5 text-green-600" />
                        ) : (
                          <XCircleIcon className="w-5 h-5 text-red-600" />
                        )}
                      </div>
                      
                      <div className="flex justify-between items-center">
                        <span className="text-sm text-gray-600">Preventive Care</span>
                        {carrier.features.preventiveCare ? (
                          <CheckCircleIcon className="w-5 h-5 text-green-600" />
                        ) : (
                          <XCircleIcon className="w-5 h-5 text-red-600" />
                        )}
                      </div>
                      
                      <div className="flex justify-between items-center">
                        <span className="text-sm text-gray-600">Specialty Access</span>
                        <span className="font-medium">{carrier.features.specialtyAccess}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {activeTab === 'pricing' && (
              <div className="overflow-x-auto">
                <table className="min-w-full">
                  <thead>
                    <tr className="border-b border-gray-200">
                      <th className="text-left py-3 px-4 font-medium text-gray-900">Cost Component</th>
                      {getSelectedCarriers().map(carrier => (
                        <th key={carrier.id} className="text-center py-3 px-4 font-medium text-gray-900">
                          <div className="flex items-center justify-center space-x-2">
                            <div 
                              className="w-3 h-3 rounded-full"
                              style={{ backgroundColor: carrier.color }}
                            />
                            <span>{carrier.name}</span>
                          </div>
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    <tr>
                      <td className="py-4 px-4 font-medium text-gray-900">Base Rate</td>
                      {getSelectedCarriers().map(carrier => (
                        <td key={carrier.id} className="py-4 px-4 text-center">
                          {formatCurrency(carrier.pricing.baseRate)}
                        </td>
                      ))}
                    </tr>
                    <tr>
                      <td className="py-4 px-4 font-medium text-gray-900">Admin Fee</td>
                      {getSelectedCarriers().map(carrier => (
                        <td key={carrier.id} className="py-4 px-4 text-center">
                          {formatCurrency(carrier.pricing.adminFee)}
                        </td>
                      ))}
                    </tr>
                    <tr>
                      <td className="py-4 px-4 font-medium text-gray-900">Stop Loss</td>
                      {getSelectedCarriers().map(carrier => (
                        <td key={carrier.id} className="py-4 px-4 text-center">
                          {formatCurrency(carrier.pricing.stopLoss)}
                        </td>
                      ))}
                    </tr>
                    <tr className="bg-gray-50">
                      <td className="py-4 px-4 font-bold text-gray-900">Total Cost</td>
                      {getSelectedCarriers().map(carrier => (
                        <td key={carrier.id} className="py-4 px-4 text-center font-bold">
                          {formatCurrency(carrier.pricing.total)}
                        </td>
                      ))}
                    </tr>
                  </tbody>
                </table>

                <div className="mt-6 grid grid-cols-1 lg:grid-cols-2 gap-6">
                  {getSelectedCarriers().map(carrier => (
                    <div key={carrier.id} className="border border-gray-200 rounded-lg p-4">
                      <div className="flex items-center space-x-2 mb-3">
                        <div 
                          className="w-4 h-4 rounded-full"
                          style={{ backgroundColor: carrier.color }}
                        />
                        <h4 className="font-medium text-gray-900">{carrier.name} Breakdown</h4>
                      </div>
                      <div className="space-y-2 text-sm">
                        <div className="flex justify-between">
                          <span className="text-gray-600">Base Rate</span>
                          <span>{((carrier.pricing.baseRate / carrier.pricing.total) * 100).toFixed(1)}%</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-600">Admin Fee</span>
                          <span>{((carrier.pricing.adminFee / carrier.pricing.total) * 100).toFixed(1)}%</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-600">Stop Loss</span>
                          <span>{((carrier.pricing.stopLoss / carrier.pricing.total) * 100).toFixed(1)}%</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </MotionDiv>
        </AnimatePresence>
      </div>
    </div>
  );
};

export default CarrierComparison; 
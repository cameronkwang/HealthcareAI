import React from 'react';
import { CalculationResult } from '../../../types/common';

interface BCBSTemplateProps {
  result: CalculationResult;
}

const BCBSTemplate: React.FC<BCBSTemplateProps> = ({ result }) => {
  // Currency formatting function
  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(value);
  };

  // Format percentages
  const formatPercentage = (value: number) => {
    return `${(value * 100).toFixed(2)}%`;
  };

  // Format numbers with commas
  const formatNumber = (value: number, decimals: number = 0) => {
    return new Intl.NumberFormat('en-US', {
      minimumFractionDigits: decimals,
      maximumFractionDigits: decimals,
    }).format(value);
  };

  // Extract multi-plan data from the calculation result
  const multiPlanData = (result as any).multiPlanData;
  const planNames = multiPlanData?.planNames || ['Plan 1', 'Plan 2', 'Plan 3', 'Plan 4'];
  
  // Mock data structure for demonstration - in real implementation this would come from BCBS calculator
  const planData = planNames.map((planName: string, index: number) => ({
    planName,
    planCode: ['PPO-H', 'PPO-S', 'HDHP-1', 'EPO-1'][index] || `PLAN-${index + 1}`,
    enrollment: {
      subscribers: [180, 120, 85, 45][index] || 100,
      members: [470, 335, 250, 160][index] || 200,
      averageFamily: [2.6, 2.8, 2.9, 3.6][index] || 2.5
    },
    experience: {
      memberMonths: [5310, 3780, 2700, 1755][index] || 2000,
      medicalClaims: [2065000, 1375000, 770000, 450000][index] || 1000000,
      rxClaims: [530000, 350000, 190000, 125000][index] || 200000,
      totalClaims: [2595000, 1725000, 960000, 575000][index] || 1200000,
      medicalPMPM: [388.91, 363.89, 285.19, 256.41][index] || 350.00,
      rxPMPM: [99.81, 92.59, 70.37, 71.23][index] || 75.00,
      totalPMPM: [488.72, 456.48, 355.56, 327.64][index] || 425.00
    },
    pooling: {
      largeClaimants: [2, 1, 1, 2][index] || 1,
      pooledAmount: [185000, 65000, 25000, 180000][index] || 100000,
      pooledPMPM: [34.84, 17.20, 9.26, 102.56][index] || 25.00,
      netClaimsPMPM: [453.88, 439.28, 346.30, 225.08][index] || 400.00
    },
    projection: {
      trendFactor: 1.04,
      projectedPMPM: [471.03, 456.85, 360.15, 234.08][index] || 416.00,
      targetLossRatio: 0.84,
      requiredPremiumPMPM: [560.75, 543.87, 428.75, 278.67][index] || 495.24,
      currentPremiumPMPM: [525.00, 510.00, 395.00, 265.00][index] || 475.00,
      rateChangeRequired: [0.068, 0.066, 0.085, 0.051][index] || 0.043
    }
  }));

  // Calculate composite results
  const totalMemberMonths = planData.reduce((sum: number, plan: any) => sum + plan.experience.memberMonths, 0);
  const totalEnrollment = planData.reduce((sum: number, plan: any) => sum + plan.enrollment.members, 0);
  const weightedCurrentPremium = planData.reduce((sum: number, plan: any) => 
    sum + (plan.projection.currentPremiumPMPM * plan.experience.memberMonths), 0) / totalMemberMonths;
  const weightedRequiredPremium = planData.reduce((sum: number, plan: any) => 
    sum + (plan.projection.requiredPremiumPMPM * plan.experience.memberMonths), 0) / totalMemberMonths;
  const compositeRateChange = (weightedRequiredPremium / weightedCurrentPremium) - 1;

  return (
    <div className="space-y-8">
      {/* Portfolio Overview */}
      <div className="bg-red-50 border border-red-200 rounded-lg p-6">
        <h3 className="text-2xl font-bold text-red-900 mb-6 text-center">BCBS Multi-Plan Portfolio Analysis</h3>
        
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <div className="bg-white rounded-lg p-4 text-center shadow-sm">
            <div className="text-3xl font-bold text-red-900">{planNames.length}</div>
            <div className="text-sm text-gray-600">Active Plans</div>
          </div>
          <div className="bg-white rounded-lg p-4 text-center shadow-sm">
            <div className="text-3xl font-bold text-red-900">{formatNumber(totalEnrollment)}</div>
            <div className="text-sm text-gray-600">Total Members</div>
          </div>
          <div className="bg-white rounded-lg p-4 text-center shadow-sm">
            <div className="text-3xl font-bold text-red-900">{formatNumber(totalMemberMonths)}</div>
            <div className="text-sm text-gray-600">Member Months</div>
          </div>
          <div className="bg-white rounded-lg p-4 text-center shadow-sm">
            <div className="text-3xl font-bold text-red-900">{formatPercentage(compositeRateChange)}</div>
            <div className="text-sm text-gray-600">Composite Rate Change</div>
          </div>
        </div>
      </div>

      {/* Individual Plan Analysis */}
      <div className="space-y-6">
        {planData.map((plan: any, index: number) => (
          <div key={index} className="bg-white border border-gray-200 rounded-lg shadow-sm overflow-hidden">
            {/* Plan Header */}
            <div className="bg-red-900 text-white px-6 py-4">
              <div className="flex justify-between items-center">
                <div>
                  <h4 className="text-xl font-bold">{plan.planName}</h4>
                  <div className="text-red-200">Plan Code: {plan.planCode}</div>
                </div>
                <div className="text-right">
                  <div className="text-2xl font-bold">
                    {formatPercentage(plan.projection.rateChangeRequired)}
                  </div>
                  <div className="text-red-200 text-sm">Rate Change Required</div>
                </div>
              </div>
            </div>

            {/* Plan Details */}
            <div className="p-6">
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Enrollment */}
                <div>
                  <h5 className="font-semibold text-gray-900 mb-3 pb-2 border-b border-gray-200">Enrollment</h5>
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span className="text-gray-600">Subscribers:</span>
                      <span className="font-medium">{formatNumber(plan.enrollment.subscribers)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Members:</span>
                      <span className="font-medium">{formatNumber(plan.enrollment.members)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Avg Family Size:</span>
                      <span className="font-medium">{plan.enrollment.averageFamily.toFixed(1)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Member Months:</span>
                      <span className="font-medium">{formatNumber(plan.experience.memberMonths)}</span>
                    </div>
                  </div>
                </div>

                {/* Experience */}
                <div>
                  <h5 className="font-semibold text-gray-900 mb-3 pb-2 border-b border-gray-200">Experience</h5>
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span className="text-gray-600">Medical PMPM:</span>
                      <span className="font-medium">{formatCurrency(plan.experience.medicalPMPM)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Rx PMPM:</span>
                      <span className="font-medium">{formatCurrency(plan.experience.rxPMPM)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Total PMPM:</span>
                      <span className="font-medium">{formatCurrency(plan.experience.totalPMPM)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Large Claimants:</span>
                      <span className="font-medium">{plan.pooling.largeClaimants}</span>
                    </div>
                  </div>
                </div>

                {/* Projection */}
                <div>
                  <h5 className="font-semibold text-gray-900 mb-3 pb-2 border-b border-gray-200">Projection</h5>
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span className="text-gray-600">Pooled PMPM:</span>
                      <span className="font-medium">{formatCurrency(plan.pooling.pooledPMPM)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Net Claims PMPM:</span>
                      <span className="font-medium">{formatCurrency(plan.pooling.netClaimsPMPM)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Projected PMPM:</span>
                      <span className="font-medium">{formatCurrency(plan.projection.projectedPMPM)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Required Premium:</span>
                      <span className="font-medium">{formatCurrency(plan.projection.requiredPremiumPMPM)}</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Plan Summary Bar */}
              <div className="mt-6 bg-gray-50 rounded-lg p-4">
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4 text-center">
                  <div>
                    <div className="text-lg font-bold text-gray-900">
                      {formatCurrency(plan.projection.currentPremiumPMPM)}
                    </div>
                    <div className="text-sm text-gray-600">Current Premium</div>
                  </div>
                  <div>
                    <div className="text-lg font-bold text-gray-900">
                      {formatCurrency(plan.projection.requiredPremiumPMPM)}
                    </div>
                    <div className="text-sm text-gray-600">Required Premium</div>
                  </div>
                  <div>
                    <div className={`text-lg font-bold ${
                      plan.projection.rateChangeRequired > 0.1 ? 'text-red-600' : 
                      plan.projection.rateChangeRequired > 0.05 ? 'text-yellow-600' : 'text-green-600'
                    }`}>
                      {formatPercentage(plan.projection.rateChangeRequired)}
                    </div>
                    <div className="text-sm text-gray-600">Rate Change</div>
                  </div>
                  <div>
                    <div className="text-lg font-bold text-gray-900">
                      {formatPercentage(plan.experience.memberMonths / totalMemberMonths)}
                    </div>
                    <div className="text-sm text-gray-600">Portfolio Weight</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Composite Results */}
      <div className="bg-red-50 border border-red-200 rounded-lg overflow-hidden">
        <div className="bg-red-900 text-white px-6 py-4">
          <h4 className="text-xl font-bold text-center">Portfolio Composite Results</h4>
        </div>
        <div className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <div className="bg-white rounded-lg p-4 text-center shadow-sm">
              <div className="text-2xl font-bold text-red-900">
                {formatCurrency(weightedCurrentPremium)}
              </div>
              <div className="text-sm text-gray-600">Weighted Current Premium</div>
            </div>
            <div className="bg-white rounded-lg p-4 text-center shadow-sm">
              <div className="text-2xl font-bold text-red-900">
                {formatCurrency(weightedRequiredPremium)}
              </div>
              <div className="text-sm text-gray-600">Weighted Required Premium</div>
            </div>
            <div className="bg-white rounded-lg p-4 text-center shadow-sm">
              <div className={`text-2xl font-bold ${
                compositeRateChange > 0.1 ? 'text-red-600' : 
                compositeRateChange > 0.05 ? 'text-yellow-600' : 'text-green-600'
              }`}>
                {formatPercentage(compositeRateChange)}
              </div>
              <div className="text-sm text-gray-600">Composite Rate Change</div>
            </div>
            <div className="bg-white rounded-lg p-4 text-center shadow-sm">
              <div className="text-2xl font-bold text-red-900">
                {formatCurrency((weightedRequiredPremium - weightedCurrentPremium) * totalMemberMonths / 12)}
              </div>
              <div className="text-sm text-gray-600">Annual Impact</div>
            </div>
          </div>

          {/* Plan Comparison Table */}
          <div className="mt-8">
            <h5 className="font-semibold text-gray-900 mb-4">Plan Comparison Summary</h5>
            <div className="overflow-x-auto">
              <table className="w-full border border-gray-200 rounded-lg">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">Plan</th>
                    <th className="px-4 py-3 text-right text-sm font-medium text-gray-700">Members</th>
                    <th className="px-4 py-3 text-right text-sm font-medium text-gray-700">Weight</th>
                    <th className="px-4 py-3 text-right text-sm font-medium text-gray-700">Current Premium</th>
                    <th className="px-4 py-3 text-right text-sm font-medium text-gray-700">Required Premium</th>
                    <th className="px-4 py-3 text-right text-sm font-medium text-gray-700">Rate Change</th>
                    <th className="px-4 py-3 text-right text-sm font-medium text-gray-700">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {planData.map((plan: any, index: number) => (
                    <tr key={index} className="hover:bg-gray-50">
                      <td className="px-4 py-3 text-sm font-medium text-gray-900">
                        {plan.planName}
                        <div className="text-xs text-gray-500">{plan.planCode}</div>
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-900 text-right">
                        {formatNumber(plan.enrollment.members)}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-900 text-right">
                        {formatPercentage(plan.experience.memberMonths / totalMemberMonths)}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-900 text-right">
                        {formatCurrency(plan.projection.currentPremiumPMPM)}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-900 text-right">
                        {formatCurrency(plan.projection.requiredPremiumPMPM)}
                      </td>
                      <td className={`px-4 py-3 text-sm text-right font-medium ${
                        plan.projection.rateChangeRequired > 0.1 ? 'text-red-600' : 
                        plan.projection.rateChangeRequired > 0.05 ? 'text-yellow-600' : 'text-green-600'
                      }`}>
                        {formatPercentage(plan.projection.rateChangeRequired)}
                      </td>
                      <td className="px-4 py-3 text-sm text-right">
                        <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${
                          plan.projection.rateChangeRequired > 0.1 ? 'bg-red-100 text-red-800' : 
                          plan.projection.rateChangeRequired > 0.05 ? 'bg-yellow-100 text-yellow-800' : 'bg-green-100 text-green-800'
                        }`}>
                          {plan.projection.rateChangeRequired > 0.1 ? 'High Increase' : 
                           plan.projection.rateChangeRequired > 0.05 ? 'Moderate Increase' : 'Low Increase'}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>

      {/* Rate Action Recommendations */}
      <div className="bg-white border border-gray-200 rounded-lg p-6">
        <h4 className="text-lg font-bold text-gray-900 mb-4">Rate Action Recommendations</h4>
        <div className="space-y-3">
          {planData.map((plan: any, index: number) => (
            <div key={index} className={`p-4 rounded-lg border-l-4 ${
              plan.projection.rateChangeRequired > 0.1 ? 'border-red-500 bg-red-50' : 
              plan.projection.rateChangeRequired > 0.05 ? 'border-yellow-500 bg-yellow-50' : 'border-green-500 bg-green-50'
            }`}>
              <div className="flex justify-between items-start">
                <div>
                  <h5 className="font-medium text-gray-900">{plan.planName}</h5>
                  <p className="text-sm text-gray-600 mt-1">
                    {plan.projection.rateChangeRequired > 0.1 
                      ? `Significant rate increase required. Consider plan design modifications to reduce claims costs.`
                      : plan.projection.rateChangeRequired > 0.05 
                      ? `Moderate rate increase needed. Monitor claims trends and consider minor benefit adjustments.`
                      : `Minimal rate adjustment required. Plan is performing well within expectations.`
                    }
                  </p>
                </div>
                <span className={`text-lg font-bold ${
                  plan.projection.rateChangeRequired > 0.1 ? 'text-red-600' : 
                  plan.projection.rateChangeRequired > 0.05 ? 'text-yellow-600' : 'text-green-600'
                }`}>
                  {formatPercentage(plan.projection.rateChangeRequired)}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default BCBSTemplate; 
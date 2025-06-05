import React from 'react';
import { 
  CurrencyDollarIcon,
  HeartIcon,
  ChartBarIcon,
  ArrowTrendingUpIcon,
  ArrowTrendingDownIcon,
  MinusIcon
} from '@heroicons/react/24/outline';
import { motion } from 'framer-motion';

// @ts-ignore
const MotionDiv: any = motion.div;

interface MetricCardProps {
  title: string;
  value: string;
  previousValue?: string;
  trend?: 'up' | 'down' | 'neutral';
  trendPercentage?: number;
  icon: any;
  iconColor: string;
  bgColor: string;
  isGood?: boolean;
  subtitle?: string;
  loading?: boolean;
}

interface MetricCardsProps {
  data?: {
    totalClaims: number;
    premium: number;
    lossRatio: number;
    renewalRate: number;
    memberMonths: number;
    avgClaimCost: number;
  };
  loading?: boolean;
}

const formatTrendPercentage = (value: number) => {
  const sign = value >= 0 ? '+' : '';
  return `${sign}${value.toFixed(1)}%`;
};

const MetricCard: React.FC<MetricCardProps> = ({
  title,
  value,
  previousValue,
  trend,
  trendPercentage,
  icon: Icon,
  iconColor,
  bgColor,
  isGood,
  subtitle,
  loading = false
}) => {
  const getTrendIcon = () => {
    switch (trend) {
      case 'up':
        return <ArrowTrendingUpIcon className={`w-4 h-4 ${isGood ? 'text-green-500' : 'text-red-500'}`} />;
      case 'down':
        return <ArrowTrendingDownIcon className={`w-4 h-4 ${isGood ? 'text-red-500' : 'text-green-500'}`} />;
      default:
        return <MinusIcon className="w-4 h-4 text-gray-400" />;
    }
  };

  const getTrendColor = () => {
    if (trend === 'neutral') return 'text-gray-500';
    if (trend === 'up') return isGood ? 'text-green-600' : 'text-red-600';
    if (trend === 'down') return isGood ? 'text-red-600' : 'text-green-600';
    return 'text-gray-500';
  };

  if (loading) {
    return (
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <div className="animate-pulse">
          <div className="flex items-center justify-between mb-4">
            <div className="h-4 bg-gray-200 rounded w-24"></div>
            <div className="h-8 w-8 bg-gray-200 rounded"></div>
          </div>
          <div className="h-8 bg-gray-200 rounded w-32 mb-2"></div>
          <div className="h-4 bg-gray-200 rounded w-20"></div>
        </div>
      </div>
    );
  }

  return (
    <MotionDiv
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 hover:shadow-md transition-shadow duration-200"
    >
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-medium text-gray-600">{title}</h3>
        <div className={`p-2 rounded-lg ${bgColor}`}>
          <Icon className={`w-5 h-5 ${iconColor}`} />
        </div>
      </div>
      
      <div className="flex items-baseline justify-between">
        <div>
          <p className="text-2xl font-bold text-gray-900">{value}</p>
          {subtitle && (
            <p className="text-sm text-gray-500 mt-1">{subtitle}</p>
          )}
        </div>
        
        {trend && trendPercentage !== undefined && (
          <div className={`flex items-center space-x-1 ${getTrendColor()}`}>
            {getTrendIcon()}
            <span className="text-sm font-medium">
              {formatTrendPercentage(trend === 'up' ? trendPercentage : -trendPercentage)}
            </span>
          </div>
        )}
      </div>

      {previousValue && (
        <div className="mt-3 pt-3 border-t border-gray-100">
          <p className="text-xs text-gray-500">
            Previous: <span className="font-medium">{previousValue}</span>
          </p>
        </div>
      )}
    </MotionDiv>
  );
};

const MetricCards: React.FC<MetricCardsProps> = ({ data, loading = false }) => {
  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);
  };

  const formatPercentage = (value: number) => {
    return `${(value * 100).toFixed(1)}%`;
  };

  const formatNumber = (value: number) => {
    return new Intl.NumberFormat('en-US').format(value);
  };

  // Mock previous period data for comparison (in real app, this would come from props)
  const previousData = {
    totalClaims: data ? data.totalClaims * 0.95 : 0,
    premium: data ? data.premium * 0.98 : 0,
    lossRatio: data ? data.lossRatio * 1.02 : 0,
    renewalRate: data ? data.renewalRate * 1.01 : 0,
    memberMonths: data ? data.memberMonths * 0.97 : 0,
    avgClaimCost: data ? data.avgClaimCost * 1.03 : 0,
  };

  const calculateTrend = (current: number, previous: number) => {
    const change = ((current - previous) / previous) * 100;
    if (Math.abs(change) < 0.1) return { trend: 'neutral' as const, percentage: 0 };
    return {
      trend: change > 0 ? 'up' as const : 'down' as const,
      percentage: Math.abs(change)
    };
  };

  const cards = [
    {
      title: 'Total Claims',
      value: data ? formatCurrency(data.totalClaims) : '$0',
      previousValue: formatCurrency(previousData.totalClaims),
      ...calculateTrend(data?.totalClaims || 0, previousData.totalClaims),
      icon: CurrencyDollarIcon,
      iconColor: 'text-blue-600',
      bgColor: 'bg-blue-50',
      isGood: false, // Lower claims are better
      subtitle: 'Medical + Rx Claims'
    },
    {
      title: 'Premium Projection',
      value: data ? formatCurrency(data.premium) : '$0',
      previousValue: formatCurrency(previousData.premium),
      ...calculateTrend(data?.premium || 0, previousData.premium),
      icon: ChartBarIcon,
      iconColor: 'text-green-600',
      bgColor: 'bg-green-50',
      isGood: true, // Higher premium is better for carrier
      subtitle: 'Annual Premium'
    },
    {
      title: 'Loss Ratio',
      value: data ? formatPercentage(data.lossRatio) : '0%',
      previousValue: formatPercentage(previousData.lossRatio),
      ...calculateTrend(data?.lossRatio || 0, previousData.lossRatio),
      icon: HeartIcon,
      iconColor: 'text-red-600',
      bgColor: 'bg-red-50',
      isGood: false, // Lower loss ratio is better
      subtitle: 'Claims / Premium'
    },
    {
      title: 'Renewal Rate',
      value: data ? formatPercentage(data.renewalRate) : '0%',
      previousValue: formatPercentage(previousData.renewalRate),
      ...calculateTrend(data?.renewalRate || 0, previousData.renewalRate),
      icon: ArrowTrendingUpIcon,
      iconColor: 'text-purple-600',
      bgColor: 'bg-purple-50',
      isGood: true, // Higher renewal rate is better
      subtitle: 'Projected Increase'
    },
    {
      title: 'Member Months',
      value: data ? formatNumber(data.memberMonths) : '0',
      previousValue: formatNumber(previousData.memberMonths),
      ...calculateTrend(data?.memberMonths || 0, previousData.memberMonths),
      icon: HeartIcon,
      iconColor: 'text-indigo-600',
      bgColor: 'bg-indigo-50',
      isGood: true, // Higher member months means more exposure
      subtitle: 'Total Exposure'
    },
    {
      title: 'Avg Claim Cost',
      value: data ? formatCurrency(data.avgClaimCost) : '$0',
      previousValue: formatCurrency(previousData.avgClaimCost),
      ...calculateTrend(data?.avgClaimCost || 0, previousData.avgClaimCost),
      icon: CurrencyDollarIcon,
      iconColor: 'text-orange-600',
      bgColor: 'bg-orange-50',
      isGood: false, // Lower average claim cost is better
      subtitle: 'Per Member Per Month'
    }
  ];

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
      {cards.map((card, index) => (
        <MetricCard
          key={card.title}
          {...card}
          loading={loading}
        />
      ))}
    </div>
  );
};

export default MetricCards; 
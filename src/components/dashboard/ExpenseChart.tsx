import React, { useState, useRef } from 'react';
import { motion } from 'framer-motion';
import {
  ChartPieIcon,
  ArrowsPointingOutIcon,
  ArrowsPointingInIcon,
  InformationCircleIcon
} from '@heroicons/react/24/outline';

// @ts-ignore
const MotionDiv: any = motion.div;

interface ExpenseData {
  category: string;
  amount: number;
  percentage: number;
  color: string;
  subcategories?: {
    name: string;
    amount: number;
    percentage: number;
  }[];
}

interface ExpenseChartProps {
  data: ExpenseData[];
  loading?: boolean;
  totalAmount?: number;
}

const ExpenseChart: React.FC<ExpenseChartProps> = ({ 
  data = [], 
  loading = false,
  totalAmount = 0
}) => {
  const [hoveredSegment, setHoveredSegment] = useState<string | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);
  
  const svgRef = useRef<SVGSVGElement>(null);
  
  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);
  };

  const formatPercentage = (value: number) => {
    return `${value.toFixed(1)}%`;
  };

  const formatTrendPercentage = (value: number, trend: 'up' | 'down' | 'stable') => {
    if (trend === 'stable') return '±0.0%';
    const sign = trend === 'up' ? '+' : '';
    return `${sign}${value.toFixed(1)}%`;
  };

  // Calculate donut chart paths
  const createArcPath = (
    centerX: number,
    centerY: number,
    radius: number,
    innerRadius: number,
    startAngle: number,
    endAngle: number
  ) => {
    const start = polarToCartesian(centerX, centerY, radius, endAngle);
    const end = polarToCartesian(centerX, centerY, radius, startAngle);
    const innerStart = polarToCartesian(centerX, centerY, innerRadius, endAngle);
    const innerEnd = polarToCartesian(centerX, centerY, innerRadius, startAngle);
    
    const largeArcFlag = endAngle - startAngle <= 180 ? "0" : "1";
    
    return [
      "M", start.x, start.y, 
      "A", radius, radius, 0, largeArcFlag, 0, end.x, end.y,
      "L", innerEnd.x, innerEnd.y,
      "A", innerRadius, innerRadius, 0, largeArcFlag, 1, innerStart.x, innerStart.y,
      "Z"
    ].join(" ");
  };

  const polarToCartesian = (centerX: number, centerY: number, radius: number, angleInDegrees: number) => {
    const angleInRadians = (angleInDegrees - 90) * Math.PI / 180.0;
    return {
      x: centerX + (radius * Math.cos(angleInRadians)),
      y: centerY + (radius * Math.sin(angleInRadians))
    };
  };

  const chartSize = 300;
  const centerX = chartSize / 2;
  const centerY = chartSize / 2;
  const outerRadius = 120;
  const innerRadius = 70;

  if (loading) {
    return (
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <div className="animate-pulse">
          <div className="h-6 bg-gray-200 rounded w-40 mb-4"></div>
          <div className="h-64 bg-gray-200 rounded"></div>
        </div>
      </div>
    );
  }

  if (data.length === 0) {
    return (
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <div className="text-center py-12">
          <ChartPieIcon className="w-12 h-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">No Expense Data</h3>
          <p className="text-gray-500">Upload data to see expense breakdown</p>
        </div>
      </div>
    );
  }

  let currentAngle = 0;
  const segments = data.map((item) => {
    const startAngle = currentAngle;
    const endAngle = currentAngle + (item.percentage / 100) * 360;
    currentAngle = endAngle;
    
    return {
      ...item,
      startAngle,
      endAngle,
      path: createArcPath(centerX, centerY, outerRadius, innerRadius, startAngle, endAngle)
    };
  });

  const selectedCategoryData = selectedCategory 
    ? data.find(d => d.category === selectedCategory)
    : null;

  return (
    <MotionDiv
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className={`bg-white rounded-lg shadow-sm border border-gray-200 ${
        isFullscreen ? 'fixed inset-4 z-50 overflow-auto' : ''
      }`}
    >
      {/* Header */}
      <div className="flex items-center justify-between p-6 border-b border-gray-200">
        <div>
          <h3 className="text-lg font-medium text-gray-900">Expense Breakdown</h3>
          <p className="text-sm text-gray-500">
            Total: {formatCurrency(totalAmount)} | Click segments for details
          </p>
        </div>
        
        <button
          onClick={() => setIsFullscreen(!isFullscreen)}
          className="p-2 rounded-md hover:bg-gray-100 transition-colors"
        >
          {isFullscreen ? (
            <ArrowsPointingInIcon className="w-5 h-5 text-gray-600" />
          ) : (
            <ArrowsPointingOutIcon className="w-5 h-5 text-gray-600" />
          )}
        </button>
      </div>

      <div className={`p-6 ${isFullscreen ? 'grid grid-cols-1 lg:grid-cols-2 gap-8' : ''}`}>
        {/* Chart */}
        <div className="flex flex-col items-center">
          <div className="relative">
            <svg
              ref={svgRef}
              width={chartSize}
              height={chartSize}
              className="transform transition-transform duration-300"
            >
              {/* Donut segments */}
              {segments.map((segment) => {
                const isHovered = hoveredSegment === segment.category;
                const isSelected = selectedCategory === segment.category;
                
                return (
                  <path
                    key={segment.category}
                    d={segment.path}
                    fill={segment.color}
                    stroke="white"
                    strokeWidth="2"
                    className={`cursor-pointer transition-all duration-200 ${
                      isHovered || isSelected ? 'opacity-100' : 'opacity-90'
                    }`}
                    style={{
                      filter: isHovered ? 'brightness(1.1)' : 'none',
                      transform: isSelected ? 'scale(1.05)' : 'scale(1)',
                      transformOrigin: `${centerX}px ${centerY}px`
                    }}
                    onMouseEnter={() => setHoveredSegment(segment.category)}
                    onMouseLeave={() => setHoveredSegment(null)}
                    onClick={() => setSelectedCategory(
                      selectedCategory === segment.category ? null : segment.category
                    )}
                  />
                );
              })}
              
              {/* Center text */}
              <text
                x={centerX}
                y={centerY - 10}
                textAnchor="middle"
                className="text-sm fill-gray-600 font-medium"
              >
                Total Claims
              </text>
              <text
                x={centerX}
                y={centerY + 10}
                textAnchor="middle"
                className="text-lg fill-gray-900 font-bold"
              >
                {formatCurrency(totalAmount)}
              </text>
            </svg>

            {/* Hover tooltip */}
            {hoveredSegment && (
              <div className="absolute top-0 left-full ml-4 bg-black bg-opacity-80 text-white p-3 rounded-lg pointer-events-none">
                {(() => {
                  const segment = segments.find(s => s.category === hoveredSegment);
                  if (!segment) return null;
                  
                  return (
                    <div className="text-sm">
                      <div className="font-medium">{segment.category}</div>
                      <div>{formatCurrency(segment.amount)}</div>
                      <div>{formatPercentage(segment.percentage)}</div>
                    </div>
                  );
                })()}
              </div>
            )}
          </div>

          {/* Legend */}
          <div className="mt-6 grid grid-cols-2 gap-3 w-full max-w-sm">
            {data.map((item) => (
              <button
                key={item.category}
                onClick={() => setSelectedCategory(
                  selectedCategory === item.category ? null : item.category
                )}
                className={`flex items-center space-x-2 p-2 rounded-md text-left transition-all ${
                  selectedCategory === item.category 
                    ? 'bg-gray-100 ring-2 ring-blue-500' 
                    : 'hover:bg-gray-50'
                }`}
              >
                <div 
                  className="w-3 h-3 rounded-full flex-shrink-0"
                  style={{ backgroundColor: item.color }}
                />
                <div className="min-w-0 flex-1">
                  <div className="text-sm font-medium text-gray-900 truncate">
                    {item.category}
                  </div>
                  <div className="text-xs text-gray-500">
                    {formatPercentage(item.percentage)}
                  </div>
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Detailed breakdown */}
        <div className={`${isFullscreen ? '' : 'mt-8'}`}>
          <h4 className="text-lg font-medium text-gray-900 mb-4">
            {selectedCategoryData ? `${selectedCategoryData.category} Details` : 'Category Breakdown'}
          </h4>
          
          {selectedCategoryData && selectedCategoryData.subcategories ? (
            <div className="space-y-3">
              {selectedCategoryData.subcategories.map((sub, index) => (
                <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div>
                    <div className="font-medium text-gray-900">{sub.name}</div>
                    <div className="text-sm text-gray-500">
                      {formatPercentage(sub.percentage)} of {selectedCategoryData.category}
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="font-medium text-gray-900">
                      {formatCurrency(sub.amount)}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="space-y-3">
              {data.map((item) => (
                <div key={item.category} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div className="flex items-center space-x-3">
                    <div 
                      className="w-4 h-4 rounded-full"
                      style={{ backgroundColor: item.color }}
                    />
                    <div>
                      <div className="font-medium text-gray-900">{item.category}</div>
                      <div className="text-sm text-gray-500">
                        {formatPercentage(item.percentage)} of total
                      </div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="font-medium text-gray-900">
                      {formatCurrency(item.amount)}
                    </div>
                    {item.subcategories && (
                      <div className="text-xs text-gray-500">
                        {item.subcategories.length} subcategories
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}

          {selectedCategoryData && (
            <div className="mt-4 p-3 bg-blue-50 rounded-lg">
              <div className="flex items-start space-x-2">
                <InformationCircleIcon className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
                <div className="text-sm text-blue-800">
                  <div className="font-medium">Category Total</div>
                  <div>
                    {formatCurrency(selectedCategoryData.amount)} ({formatPercentage(selectedCategoryData.percentage)} of total claims)
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </MotionDiv>
  );
};

export default ExpenseChart; 
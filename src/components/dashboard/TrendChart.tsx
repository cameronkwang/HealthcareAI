import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ChartBarIcon,
  ArrowsPointingOutIcon,
  ArrowsPointingInIcon,
  EyeIcon,
  EyeSlashIcon
} from '@heroicons/react/24/outline';

interface TrendDataPoint {
  Month: string;
  'Medical Claims': number;
  'Pharmacy Claims': number;
  'Total Claims': number;
  'Earned Premium': number;
  Members: number;
  Subscribers?: number;
  Capitation?: number;
  'Loss Ratio'?: number;
}

interface TrendChartProps {
  data: TrendDataPoint[];
  className?: string;
}

const TrendChart: React.FC<TrendChartProps> = ({ data, className = '' }) => {
  const [selectedSeries, setSelectedSeries] = useState({
    'Medical Claims': true,
    'Earned Premium': true,
    'Loss Ratio': false,
    Members: true
  });
  const [hoveredPoint, setHoveredPoint] = useState<{ x: number; y: number; data: any } | null>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);

  const chartConfig = {
    width: isFullscreen ? 1000 : 600,
    height: isFullscreen ? 500 : 300,
    margin: { top: 20, right: 80, bottom: 40, left: 80 }
  };

  const innerWidth = chartConfig.width - chartConfig.margin.left - chartConfig.margin.right;
  const innerHeight = chartConfig.height - chartConfig.margin.top - chartConfig.margin.bottom;

  // Calculate scales
  const xScale = useMemo(() => {
    const domain = data.map((_, i) => i);
    return {
      scale: (value: number) => (value / (data.length - 1)) * innerWidth,
      domain
    };
  }, [data, innerWidth]);

  const yScales = useMemo(() => {
    const claimsMax = Math.max(...data.map(d => d['Medical Claims'] + d['Pharmacy Claims']));
    const premiumMax = Math.max(...data.map(d => d['Earned Premium']));
    const lossRatioMax = Math.max(...data.map(d => d['Loss Ratio'] || 0));
    const memberMonthsMax = Math.max(...data.map(d => d.Members));

    const leftMax = Math.max(claimsMax, premiumMax);
    const rightMax = Math.max(lossRatioMax, memberMonthsMax);

    return {
      left: (value: number) => innerHeight - (value / leftMax) * innerHeight,
      right: (value: number) => innerHeight - (value / rightMax) * innerHeight,
      leftMax,
      rightMax
    };
  }, [data, innerHeight]);

  const seriesConfig = {
    'Medical Claims': { color: '#ef4444', yScale: 'left', label: 'Medical Claims ($)' },
    'Earned Premium': { color: '#3b82f6', yScale: 'left', label: 'Earned Premium ($)' },
    'Loss Ratio': { color: '#f59e0b', yScale: 'right', label: 'Loss Ratio (%)' },
    Members: { color: '#10b981', yScale: 'right', label: 'Members' }
  };

  const generatePath = (seriesKey: keyof typeof selectedSeries) => {
    const points = data.map((d, i) => {
      const x = xScale.scale(i);
      let value: number;
      
      // Get the correct value based on series key
      if (seriesKey === 'Medical Claims') {
        value = d['Medical Claims'];
      } else if (seriesKey === 'Earned Premium') {
        value = d['Earned Premium'];
      } else if (seriesKey === 'Loss Ratio') {
        value = d['Loss Ratio'] || 0;
      } else if (seriesKey === 'Members') {
        value = d.Members;
      } else {
        value = 0;
      }
      
      const y = seriesConfig[seriesKey].yScale === 'left' 
        ? yScales.left(value)
        : yScales.right(value);
      return `${i === 0 ? 'M' : 'L'} ${x} ${y}`;
    }).join(' ');
    return points;
  };

  const formatValue = (value: number, type: string) => {
    if (type === 'claims' || type === 'premium') {
      // Format currency values with $ symbol and proper abbreviations
      if (value >= 1000000) {
        return `$${(value / 1000000).toFixed(1)}M`;
      } else if (value >= 1000) {
        return `$${(value / 1000).toFixed(0)}K`;
      } else {
        return `$${value.toFixed(0)}`;
      }
    }
    if (type === 'lossRatio') {
      // Format as percentage with % symbol
      return `${value.toFixed(1)}%`;
    }
    if (type === 'memberMonths' || type === 'members') {
      // Format member counts with commas
      return new Intl.NumberFormat('en-US').format(Math.round(value));
    }
    if (type === 'percentage') {
      // Format percentages with % symbol
      return `${value.toFixed(1)}%`;
    }
    // Default number formatting with commas
    return new Intl.NumberFormat('en-US').format(value);
  };

  const toggleSeries = (series: keyof typeof selectedSeries) => {
    setSelectedSeries(prev => ({ ...prev, [series]: !prev[series] }));
  };

  const handlePointHover = (e: React.MouseEvent<SVGCircleElement>, dataPoint: any, index: number) => {
    const rect = e.currentTarget.getBoundingClientRect();
    setHoveredPoint({
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
      data: { ...dataPoint, index }
    });
  };

  if (data.length === 0) {
    return (
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <div className="text-center py-12">
          <ChartBarIcon className="w-12 h-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">No Chart Data</h3>
          <p className="text-gray-500">Upload data to see trend visualizations</p>
        </div>
      </div>
    );
  }

  return (
    <motion.div 
      // @ts-ignore
      className={`bg-white rounded-lg shadow-lg p-6 ${className}`}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
    >
      <div className="flex justify-between items-center mb-6">
        <h3 className="text-xl font-semibold text-gray-800">Trend Analysis</h3>
        <div className="flex gap-2">
          <button
            onClick={() => setIsFullscreen(!isFullscreen)}
            className="px-3 py-1 text-sm bg-gray-100 hover:bg-gray-200 rounded transition-colors"
          >
            {isFullscreen ? 'Exit Fullscreen' : 'Fullscreen'}
          </button>
        </div>
      </div>

      {/* Legend */}
      <div className="flex flex-wrap gap-4 mb-4">
        {Object.entries(seriesConfig).map(([key, config]) => (
          <button
            key={key}
            onClick={() => toggleSeries(key as keyof typeof selectedSeries)}
            className={`flex items-center gap-2 px-3 py-1 rounded transition-all ${
              selectedSeries[key as keyof typeof selectedSeries]
                ? 'bg-gray-100 shadow-sm'
                : 'opacity-50 hover:opacity-75'
            }`}
          >
            <div 
              className="w-3 h-3 rounded-full"
              style={{ backgroundColor: config.color }}
            />
            <span className="text-sm font-medium">{config.label}</span>
          </button>
        ))}
      </div>

      {/* Chart */}
      <div className="relative">
        <svg 
          width={chartConfig.width} 
          height={chartConfig.height}
          className="border border-gray-200 rounded"
        >
          {/* Grid lines */}
          <g transform={`translate(${chartConfig.margin.left}, ${chartConfig.margin.top})`}>
            {/* Horizontal grid lines */}
            {[0, 0.25, 0.5, 0.75, 1].map(ratio => (
              <line
                key={ratio}
                x1={0}
                y1={innerHeight * ratio}
                x2={innerWidth}
                y2={innerHeight * ratio}
                stroke="#f3f4f6"
                strokeWidth={1}
              />
            ))}
            
            {/* Vertical grid lines */}
            {data.map((_, i) => (
              <line
                key={i}
                x1={xScale.scale(i)}
                y1={0}
                x2={xScale.scale(i)}
                y2={innerHeight}
                stroke="#f3f4f6"
                strokeWidth={1}
              />
            ))}

            {/* Data lines */}
            <AnimatePresence>
              {Object.entries(selectedSeries).map(([seriesKey, isSelected]) => {
                if (!isSelected) return null;
                
                return (
                  <motion.path
                    key={seriesKey}
                    d={generatePath(seriesKey as keyof typeof selectedSeries)}
                    fill="none"
                    stroke={seriesConfig[seriesKey as keyof typeof seriesConfig].color}
                    strokeWidth={2}
                    initial={{ pathLength: 0, opacity: 0 }}
                    animate={{ pathLength: 1, opacity: 1 }}
                    exit={{ pathLength: 0, opacity: 0 }}
                    transition={{ duration: 1, ease: "easeInOut" }}
                  />
                );
              })}
            </AnimatePresence>

            {/* Data points */}
            {data.map((dataPoint, i) => (
              <g key={i}>
                {Object.entries(selectedSeries).map(([seriesKey, isSelected]) => {
                  if (!isSelected) return null;
                  
                  const config = seriesConfig[seriesKey as keyof typeof seriesConfig];
                  const x = xScale.scale(i);
                  
                  let value: number;
                  if (seriesKey === 'Medical Claims') {
                    value = dataPoint['Medical Claims'];
                  } else if (seriesKey === 'Earned Premium') {
                    value = dataPoint['Earned Premium'];
                  } else if (seriesKey === 'Loss Ratio') {
                    value = dataPoint['Loss Ratio'] || 0;
                  } else if (seriesKey === 'Members') {
                    value = dataPoint.Members;
                  } else {
                    value = 0;
                  }
                  
                  const y = config.yScale === 'left' 
                    ? yScales.left(value)
                    : yScales.right(value);

                  return (
                    <motion.circle
                      key={seriesKey}
                      cx={x}
                      cy={y}
                      r={4}
                      fill={config.color}
                      className="cursor-pointer hover:r-6 transition-all"
                      onMouseEnter={(e) => handlePointHover(e as React.MouseEvent<SVGCircleElement>, dataPoint, i)}
                      onMouseLeave={() => setHoveredPoint(null)}
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      transition={{ delay: i * 0.1 }}
                      whileHover={{ scale: 1.5 }}
                    />
                  );
                })}
              </g>
            ))}

            {/* X-axis labels */}
            {data.map((dataPoint, i) => (
              <text
                key={i}
                x={xScale.scale(i)}
                y={innerHeight + 20}
                textAnchor="middle"
                className="text-xs fill-gray-600"
              >
                {dataPoint.Month}
              </text>
            ))}

            {/* Y-axis labels - Left */}
            {[0, 0.25, 0.5, 0.75, 1].map(ratio => (
              <text
                key={`left-${ratio}`}
                x={-10}
                y={innerHeight * ratio + 4}
                textAnchor="end"
                className="text-xs fill-gray-600"
              >
                {formatValue(yScales.leftMax * (1 - ratio), 'claims')}
              </text>
            ))}

            {/* Y-axis labels - Right */}
            {[0, 0.25, 0.5, 0.75, 1].map(ratio => (
              <text
                key={`right-${ratio}`}
                x={innerWidth + 10}
                y={innerHeight * ratio + 4}
                textAnchor="start"
                className="text-xs fill-gray-600"
              >
                {formatValue(yScales.rightMax * (1 - ratio), 'claims')}
              </text>
            ))}
          </g>
        </svg>

        {/* Tooltip */}
        <AnimatePresence>
          {hoveredPoint && (
            <motion.div
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.8 }}
              // @ts-ignore
              className="absolute bg-gray-900 text-white p-3 rounded-lg shadow-lg pointer-events-none z-10"
              style={{
                left: hoveredPoint.x + 10,
                top: hoveredPoint.y - 10,
                transform: 'translateY(-100%)'
              }}
            >
              <div className="text-sm font-semibold mb-1">{hoveredPoint.data.Month}</div>
              <div className="space-y-1 text-xs">
                <div>Medical Claims: {formatValue(hoveredPoint.data['Medical Claims'], 'claims')}</div>
                <div>Pharmacy Claims: {formatValue(hoveredPoint.data['Pharmacy Claims'], 'claims')}</div>
                <div>Total Claims: {formatValue(hoveredPoint.data['Total Claims'], 'claims')}</div>
                <div>Earned Premium: {formatValue(hoveredPoint.data['Earned Premium'], 'premium')}</div>
                <div>Members: {formatValue(hoveredPoint.data.Members, 'members')}</div>
                {hoveredPoint.data['Loss Ratio'] && (
                  <div>Loss Ratio: {formatValue(hoveredPoint.data['Loss Ratio'], 'lossRatio')}</div>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  );
};

export default TrendChart; 
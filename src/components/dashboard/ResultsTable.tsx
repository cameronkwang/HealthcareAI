import React, { useState, useMemo } from 'react';
import {
  ChevronUpIcon,
  ChevronDownIcon,
  FunnelIcon,
  ArrowDownTrayIcon,
  MagnifyingGlassIcon,
  XMarkIcon
} from '@heroicons/react/24/outline';
import { motion, AnimatePresence } from 'framer-motion';

// @ts-ignore
const MotionDiv: any = motion.div;

interface ResultsTableData {
  month: string;
  memberMonths: number;
  incurredClaims: number;
  paidClaims: number;
  lossRatio: number;
  trend: number;
  projectedPremium: number;
  status: 'good' | 'warning' | 'critical';
}

interface ResultsTableProps {
  data: ResultsTableData[];
  loading?: boolean;
  onExport?: (format: 'csv' | 'excel') => void;
}

type SortField = keyof ResultsTableData;
type SortDirection = 'asc' | 'desc';

const ResultsTable: React.FC<ResultsTableProps> = ({ 
  data = [], 
  loading = false,
  onExport 
}) => {
  const [sortField, setSortField] = useState<SortField>('month');
  const [sortDirection, setSortDirection] = useState<SortDirection>('asc');
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [showFilters, setShowFilters] = useState(false);

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

  const formatTrendPercentage = (value: number) => {
    const sign = value >= 0 ? '+' : '';
    return `${sign}${(value * 100).toFixed(1)}%`;
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'good':
        return 'bg-green-100 text-green-800';
      case 'warning':
        return 'bg-yellow-100 text-yellow-800';
      case 'critical':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusDot = (status: string) => {
    switch (status) {
      case 'good':
        return 'bg-green-400';
      case 'warning':
        return 'bg-yellow-400';
      case 'critical':
        return 'bg-red-400';
      default:
        return 'bg-gray-400';
    }
  };

  const getTrendColor = (value: number) => {
    if (value > 0.05) return 'text-red-600'; // High positive trend is bad for claims
    if (value < -0.05) return 'text-green-600'; // Negative trend is good for claims
    return 'text-gray-600'; // Neutral
  };

  const getTrendIcon = (value: number) => {
    if (value > 0.01) return <ChevronUpIcon className="w-4 h-4" />;
    if (value < -0.01) return <ChevronDownIcon className="w-4 h-4" />;
    return <span className="w-4 h-4 text-center">-</span>;
  };

  // Sorting and filtering logic
  const filteredAndSortedData = useMemo(() => {
    let filtered = data.filter(row => {
      const matchesSearch = searchTerm === '' || 
        Object.values(row).some(value => 
          value.toString().toLowerCase().includes(searchTerm.toLowerCase())
        );
      
      const matchesStatus = filterStatus === 'all' || row.status === filterStatus;
      
      return matchesSearch && matchesStatus;
    });

    return filtered.sort((a, b) => {
      const aValue = a[sortField];
      const bValue = b[sortField];
      
      if (typeof aValue === 'string' && typeof bValue === 'string') {
        return sortDirection === 'asc' 
          ? aValue.localeCompare(bValue)
          : bValue.localeCompare(aValue);
      }
      
      if (typeof aValue === 'number' && typeof bValue === 'number') {
        return sortDirection === 'asc' 
          ? aValue - bValue 
          : bValue - aValue;
      }
      
      return 0;
    });
  }, [data, sortField, sortDirection, searchTerm, filterStatus]);

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };

  const handleExport = (format: 'csv' | 'excel') => {
    if (onExport) {
      onExport(format);
    } else {
      // Default CSV export
      const headers = [
        'Month', 'Member Months', 'Incurred Claims', 'Paid Claims', 
        'Loss Ratio', 'Trend', 'Projected Premium', 'Status'
      ];
      
      const csvContent = [
        headers.join(','),
        ...filteredAndSortedData.map(row => [
          row.month,
          row.memberMonths,
          row.incurredClaims,
          row.paidClaims,
          row.lossRatio,
          row.trend,
          row.projectedPremium,
          row.status
        ].join(','))
      ].join('\n');
      
      const blob = new Blob([csvContent], { type: 'text/csv' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `renewal-results-${new Date().toISOString().split('T')[0]}.csv`;
      a.click();
      window.URL.revokeObjectURL(url);
    }
  };

  const SortableHeader: React.FC<{ field: SortField; children: React.ReactNode }> = ({ 
    field, 
    children 
  }) => (
    <th
      className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-50 transition-colors"
      onClick={() => handleSort(field)}
    >
      <div className="flex items-center space-x-1">
        <span>{children}</span>
        <div className="flex flex-col">
          <ChevronUpIcon 
            className={`w-3 h-3 ${
              sortField === field && sortDirection === 'asc' 
                ? 'text-blue-600' 
                : 'text-gray-300'
            }`} 
          />
          <ChevronDownIcon 
            className={`w-3 h-3 -mt-1 ${
              sortField === field && sortDirection === 'desc' 
                ? 'text-blue-600' 
                : 'text-gray-300'
            }`} 
          />
        </div>
      </div>
    </th>
  );

  if (loading) {
    return (
      <div className="bg-white rounded-lg shadow-sm border border-gray-200">
        <div className="p-6">
          <div className="animate-pulse">
            <div className="h-4 bg-gray-200 rounded w-32 mb-4"></div>
            <div className="space-y-3">
              {[...Array(5)].map((_, i) => (
                <div key={i} className="h-4 bg-gray-200 rounded"></div>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200">
      {/* Header with search and filters */}
      <div className="px-6 py-4 border-b border-gray-200">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-medium text-gray-900">Results Summary</h3>
          <div className="flex items-center space-x-2">
            {/* Search */}
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <MagnifyingGlassIcon className="h-5 w-5 text-gray-400" />
              </div>
              <input
                type="text"
                className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md leading-5 bg-white placeholder-gray-500 focus:outline-none focus:placeholder-gray-400 focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                placeholder="Search..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>

            {/* Filter toggle */}
            <button
              onClick={() => setShowFilters(!showFilters)}
              className={`inline-flex items-center px-3 py-2 border border-gray-300 rounded-md text-sm font-medium transition-colors ${
                showFilters || filterStatus !== 'all'
                  ? 'bg-blue-50 text-blue-700 border-blue-300'
                  : 'bg-white text-gray-700 hover:bg-gray-50'
              }`}
            >
              <FunnelIcon className="w-4 h-4 mr-2" />
              Filters
            </button>

            {/* Export */}
            <div className="relative group">
              <button className="inline-flex items-center px-3 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 transition-colors">
                <ArrowDownTrayIcon className="w-4 h-4 mr-2" />
                Export
              </button>
              <div className="absolute right-0 mt-2 w-32 bg-white rounded-md shadow-lg border border-gray-200 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-10">
                <button
                  onClick={() => handleExport('csv')}
                  className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 rounded-t-md"
                >
                  Export CSV
                </button>
                <button
                  onClick={() => handleExport('excel')}
                  className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 rounded-b-md"
                >
                  Export Excel
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Filters panel */}
        <AnimatePresence>
          {showFilters && (
            <MotionDiv
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="mt-4 pt-4 border-t border-gray-200"
            >
              <div className="flex items-center space-x-4">
                <div className="flex items-center space-x-2">
                  <label className="text-sm font-medium text-gray-700">Status:</label>
                  <select
                    value={filterStatus}
                    onChange={(e) => setFilterStatus(e.target.value)}
                    className="block px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value="all">All</option>
                    <option value="good">Good</option>
                    <option value="warning">Warning</option>
                    <option value="critical">Critical</option>
                  </select>
                </div>

                {(searchTerm || filterStatus !== 'all') && (
                  <button
                    onClick={() => {
                      setSearchTerm('');
                      setFilterStatus('all');
                    }}
                    className="inline-flex items-center px-2 py-1 text-sm text-gray-500 hover:text-gray-700"
                  >
                    <XMarkIcon className="w-4 h-4 mr-1" />
                    Clear
                  </button>
                )}
              </div>
            </MotionDiv>
          )}
        </AnimatePresence>
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <SortableHeader field="month">Month</SortableHeader>
              <SortableHeader field="memberMonths">Member Months</SortableHeader>
              <SortableHeader field="incurredClaims">Incurred Claims</SortableHeader>
              <SortableHeader field="paidClaims">Paid Claims</SortableHeader>
              <SortableHeader field="lossRatio">Loss Ratio</SortableHeader>
              <SortableHeader field="trend">Trend</SortableHeader>
              <SortableHeader field="projectedPremium">Projected Premium</SortableHeader>
              <SortableHeader field="status">Status</SortableHeader>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            <AnimatePresence>
              {filteredAndSortedData.map((row, index) => (
                <MotionDiv
                  key={row.month}
                  component="tr"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.2, delay: index * 0.05 }}
                  className="hover:bg-gray-50 transition-colors"
                >
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                    {row.month}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {formatNumber(row.memberMonths)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {formatCurrency(row.incurredClaims)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {formatCurrency(row.paidClaims)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm">
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                      row.lossRatio > 0.8 ? 'bg-red-100 text-red-800' :
                      row.lossRatio > 0.6 ? 'bg-yellow-100 text-yellow-800' :
                      'bg-green-100 text-green-800'
                    }`}>
                      {formatPercentage(row.lossRatio)}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    <span className={`inline-flex items-center ${
                      row.trend > 1.05 ? 'text-red-600' :
                      row.trend > 1.02 ? 'text-yellow-600' :
                      'text-green-600'
                    }`}>
                      {formatTrendPercentage(row.trend - 1)}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {formatCurrency(row.projectedPremium)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <div className={`w-2 h-2 rounded-full mr-2 ${getStatusDot(row.status)}`}></div>
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(row.status)}`}>
                        {row.status.charAt(0).toUpperCase() + row.status.slice(1)}
                      </span>
                    </div>
                  </td>
                </MotionDiv>
              ))}
            </AnimatePresence>
          </tbody>
        </table>

        {filteredAndSortedData.length === 0 && (
          <div className="text-center py-12">
            <div className="text-gray-500">
              {searchTerm || filterStatus !== 'all' 
                ? 'No results match your filters' 
                : 'No data available'
              }
            </div>
          </div>
        )}
      </div>

      {/* Footer with summary */}
      {filteredAndSortedData.length > 0 && (
        <div className="px-6 py-3 bg-gray-50 border-t border-gray-200 text-sm text-gray-600">
          Showing {filteredAndSortedData.length} of {data.length} results
        </div>
      )}
    </div>
  );
};

export default ResultsTable; 
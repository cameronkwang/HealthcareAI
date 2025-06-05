import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ClockIcon,
  UserIcon,
  DocumentIcon,
  FunnelIcon,
  MagnifyingGlassIcon,
  ArrowDownTrayIcon,
  ChevronDownIcon,
  ChevronRightIcon,
  ExclamationTriangleIcon,
  CheckCircleIcon,
  InformationCircleIcon,
  XCircleIcon
} from '@heroicons/react/24/outline';

// @ts-ignore
const MotionDiv: any = motion.div;

interface AuditLogEntry {
  id: string;
  timestamp: Date;
  user: string;
  action: string;
  category: 'upload' | 'calculation' | 'export' | 'system' | 'user' | 'error';
  severity: 'info' | 'warning' | 'error' | 'success';
  description: string;
  details?: {
    fileName?: string;
    fileSize?: number;
    recordsProcessed?: number;
    carrier?: string;
    duration?: number;
    errorCode?: string;
    stackTrace?: string;
    metadata?: Record<string, any>;
  };
  relatedEntries?: string[]; // IDs of related log entries
}

interface AuditTrailProps {
  logs: AuditLogEntry[];
  loading?: boolean;
  onExport?: (format: 'csv' | 'json') => void;
}

const AuditTrail: React.FC<AuditTrailProps> = ({ 
  logs = [], 
  loading = false,
  onExport 
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [selectedSeverity, setSelectedSeverity] = useState<string>('all');
  const [dateRange, setDateRange] = useState<'today' | 'week' | 'month' | 'all'>('all');
  const [expandedEntries, setExpandedEntries] = useState<Set<string>>(new Set());
  const [showFilters, setShowFilters] = useState(false);

  const categories = [
    { value: 'all', label: 'All Categories' },
    { value: 'upload', label: 'File Upload' },
    { value: 'calculation', label: 'Calculations' },
    { value: 'export', label: 'Data Export' },
    { value: 'system', label: 'System Events' },
    { value: 'user', label: 'User Actions' },
    { value: 'error', label: 'Errors' }
  ];

  const severities = [
    { value: 'all', label: 'All Severities' },
    { value: 'info', label: 'Information' },
    { value: 'success', label: 'Success' },
    { value: 'warning', label: 'Warning' },
    { value: 'error', label: 'Error' }
  ];

  const filteredLogs = useMemo(() => {
    let filtered = logs;

    // Search filter
    if (searchTerm) {
      filtered = filtered.filter(log => 
        log.action.toLowerCase().includes(searchTerm.toLowerCase()) ||
        log.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
        log.user.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    // Category filter
    if (selectedCategory !== 'all') {
      filtered = filtered.filter(log => log.category === selectedCategory);
    }

    // Severity filter
    if (selectedSeverity !== 'all') {
      filtered = filtered.filter(log => log.severity === selectedSeverity);
    }

    // Date range filter
    if (dateRange !== 'all') {
      const now = new Date();
      const cutoff = new Date();
      
      switch (dateRange) {
        case 'today':
          cutoff.setHours(0, 0, 0, 0);
          break;
        case 'week':
          cutoff.setDate(now.getDate() - 7);
          break;
        case 'month':
          cutoff.setMonth(now.getMonth() - 1);
          break;
      }
      
      filtered = filtered.filter(log => log.timestamp >= cutoff);
    }

    return filtered.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
  }, [logs, searchTerm, selectedCategory, selectedSeverity, dateRange]);

  const toggleExpanded = (entryId: string) => {
    setExpandedEntries(prev => {
      const newSet = new Set(prev);
      if (newSet.has(entryId)) {
        newSet.delete(entryId);
      } else {
        newSet.add(entryId);
      }
      return newSet;
    });
  };

  const getSeverityIcon = (severity: string) => {
    switch (severity) {
      case 'success':
        return <CheckCircleIcon className="w-5 h-5 text-green-600" />;
      case 'warning':
        return <ExclamationTriangleIcon className="w-5 h-5 text-yellow-600" />;
      case 'error':
        return <XCircleIcon className="w-5 h-5 text-red-600" />;
      default:
        return <InformationCircleIcon className="w-5 h-5 text-blue-600" />;
    }
  };

  const getSeverityBadge = (severity: string) => {
    const baseClasses = "inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium";
    switch (severity) {
      case 'success':
        return `${baseClasses} bg-green-100 text-green-800`;
      case 'warning':
        return `${baseClasses} bg-yellow-100 text-yellow-800`;
      case 'error':
        return `${baseClasses} bg-red-100 text-red-800`;
      default:
        return `${baseClasses} bg-blue-100 text-blue-800`;
    }
  };

  const getCategoryBadge = (category: string) => {
    const baseClasses = "inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium";
    switch (category) {
      case 'upload':
        return `${baseClasses} bg-purple-100 text-purple-800`;
      case 'calculation':
        return `${baseClasses} bg-indigo-100 text-indigo-800`;
      case 'export':
        return `${baseClasses} bg-green-100 text-green-800`;
      case 'system':
        return `${baseClasses} bg-gray-100 text-gray-800`;
      case 'user':
        return `${baseClasses} bg-blue-100 text-blue-800`;
      case 'error':
        return `${baseClasses} bg-red-100 text-red-800`;
      default:
        return `${baseClasses} bg-gray-100 text-gray-800`;
    }
  };

  const formatTimestamp = (timestamp: Date) => {
    return new Intl.DateTimeFormat('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    }).format(timestamp);
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const handleExport = (format: 'csv' | 'json') => {
    if (onExport) {
      onExport(format);
    } else {
      // Default export implementation
      const dataToExport = filteredLogs.map(log => ({
        timestamp: log.timestamp.toISOString(),
        user: log.user,
        action: log.action,
        category: log.category,
        severity: log.severity,
        description: log.description,
        fileName: log.details?.fileName || '',
        fileSize: log.details?.fileSize || 0,
        recordsProcessed: log.details?.recordsProcessed || 0,
        carrier: log.details?.carrier || '',
        duration: log.details?.duration || 0,
        errorCode: log.details?.errorCode || ''
      }));

      if (format === 'csv') {
        const headers = Object.keys(dataToExport[0] || {});
        const csvContent = [
          headers.join(','),
          ...dataToExport.map(row => 
            headers.map(header => `"${(row as any)[header] || ''}"`).join(',')
          )
        ].join('\n');
        
        const blob = new Blob([csvContent], { type: 'text/csv' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `audit-trail-${new Date().toISOString().split('T')[0]}.csv`;
        a.click();
        URL.revokeObjectURL(url);
      } else {
        const jsonContent = JSON.stringify(dataToExport, null, 2);
        const blob = new Blob([jsonContent], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `audit-trail-${new Date().toISOString().split('T')[0]}.json`;
        a.click();
        URL.revokeObjectURL(url);
      }
    }
  };

  if (loading) {
    return (
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-1/3 mb-6"></div>
          <div className="space-y-4">
            {[1, 2, 3, 4, 5].map(i => (
              <div key={i} className="flex space-x-4">
                <div className="w-12 h-12 bg-gray-200 rounded"></div>
                <div className="flex-1 space-y-2">
                  <div className="h-4 bg-gray-200 rounded w-3/4"></div>
                  <div className="h-3 bg-gray-200 rounded w-1/2"></div>
                </div>
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
          <h2 className="text-xl font-semibold text-gray-900">Audit Trail</h2>
          <div className="flex items-center space-x-3">
            <button
              onClick={() => setShowFilters(!showFilters)}
              className="flex items-center space-x-2 px-4 py-2 text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200 transition-colors"
            >
              <FunnelIcon className="w-4 h-4" />
              <span>Filters</span>
            </button>
            <div className="relative">
              <select
                onChange={(e) => handleExport(e.target.value as 'csv' | 'json')}
                className="appearance-none px-4 py-2 pr-8 text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200 transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500"
                defaultValue=""
              >
                <option value="" disabled>Export</option>
                <option value="csv">Export as CSV</option>
                <option value="json">Export as JSON</option>
              </select>
              <ArrowDownTrayIcon className="w-4 h-4 text-gray-500 absolute right-2 top-1/2 transform -translate-y-1/2 pointer-events-none" />
            </div>
          </div>
        </div>

        {/* Search */}
        <div className="relative">
          <MagnifyingGlassIcon className="w-5 h-5 text-gray-400 absolute left-3 top-1/2 transform -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search logs..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        {/* Filters */}
        <AnimatePresence>
          {showFilters && (
            <MotionDiv
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="mt-4 grid grid-cols-1 md:grid-cols-4 gap-4"
            >
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Category</label>
                <select
                  value={selectedCategory}
                  onChange={(e) => setSelectedCategory(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  {categories.map(category => (
                    <option key={category.value} value={category.value}>
                      {category.label}
                    </option>
                  ))}
                </select>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Severity</label>
                <select
                  value={selectedSeverity}
                  onChange={(e) => setSelectedSeverity(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  {severities.map(severity => (
                    <option key={severity.value} value={severity.value}>
                      {severity.label}
                    </option>
                  ))}
                </select>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Date Range</label>
                <select
                  value={dateRange}
                  onChange={(e) => setDateRange(e.target.value as any)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="all">All Time</option>
                  <option value="today">Today</option>
                  <option value="week">Last 7 Days</option>
                  <option value="month">Last 30 Days</option>
                </select>
              </div>
              
              <div className="flex items-end">
                <button
                  onClick={() => {
                    setSearchTerm('');
                    setSelectedCategory('all');
                    setSelectedSeverity('all');
                    setDateRange('all');
                  }}
                  className="w-full px-4 py-2 text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200 transition-colors"
                >
                  Clear Filters
                </button>
              </div>
            </MotionDiv>
          )}
        </AnimatePresence>

        {/* Results Summary */}
        <div className="mt-4 flex items-center justify-between text-sm text-gray-600">
          <span>
            Showing {filteredLogs.length} of {logs.length} entries
          </span>
          {filteredLogs.length !== logs.length && (
            <span className="text-blue-600">
              {logs.length - filteredLogs.length} entries filtered out
            </span>
          )}
        </div>
      </div>

      {/* Log Entries */}
      <div className="divide-y divide-gray-200 max-h-96 overflow-y-auto">
        {filteredLogs.length === 0 ? (
          <div className="p-8 text-center">
            <DocumentIcon className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No log entries found</h3>
            <p className="text-gray-500">
              {logs.length === 0 
                ? "No audit logs have been recorded yet."
                : "Try adjusting your search criteria or filters."
              }
            </p>
          </div>
        ) : (
          filteredLogs.map((log) => (
            <MotionDiv
              key={log.id}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="p-4 hover:bg-gray-50 transition-colors"
            >
              <div className="flex items-start space-x-4">
                <div className="flex-shrink-0 mt-1">
                  {getSeverityIcon(log.severity)}
                </div>
                
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center space-x-3">
                      <h4 className="text-sm font-medium text-gray-900">{log.action}</h4>
                      <span className={getSeverityBadge(log.severity)}>
                        {log.severity}
                      </span>
                      <span className={getCategoryBadge(log.category)}>
                        {log.category}
                      </span>
                    </div>
                    <button
                      onClick={() => toggleExpanded(log.id)}
                      className="flex items-center space-x-1 text-gray-500 hover:text-gray-700 transition-colors"
                    >
                      {expandedEntries.has(log.id) ? (
                        <ChevronDownIcon className="w-4 h-4" />
                      ) : (
                        <ChevronRightIcon className="w-4 h-4" />
                      )}
                    </button>
                  </div>
                  
                  <p className="text-sm text-gray-600 mb-2">{log.description}</p>
                  
                  <div className="flex items-center space-x-4 text-xs text-gray-500">
                    <div className="flex items-center space-x-1">
                      <UserIcon className="w-3 h-3" />
                      <span>{log.user}</span>
                    </div>
                    <div className="flex items-center space-x-1">
                      <ClockIcon className="w-3 h-3" />
                      <span>{formatTimestamp(log.timestamp)}</span>
                    </div>
                  </div>
                  
                  {/* Expanded Details */}
                  <AnimatePresence>
                    {expandedEntries.has(log.id) && log.details && (
                      <MotionDiv
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        exit={{ opacity: 0, height: 0 }}
                        className="mt-4 p-4 bg-gray-50 rounded-lg"
                      >
                        <h5 className="text-sm font-medium text-gray-900 mb-3">Details</h5>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                          {log.details.fileName && (
                            <div>
                              <span className="text-gray-600">File Name:</span>
                              <span className="ml-2 font-medium">{log.details.fileName}</span>
                            </div>
                          )}
                          {log.details.fileSize && (
                            <div>
                              <span className="text-gray-600">File Size:</span>
                              <span className="ml-2 font-medium">{formatFileSize(log.details.fileSize)}</span>
                            </div>
                          )}
                          {log.details.recordsProcessed && (
                            <div>
                              <span className="text-gray-600">Records Processed:</span>
                              <span className="ml-2 font-medium">{log.details.recordsProcessed.toLocaleString()}</span>
                            </div>
                          )}
                          {log.details.carrier && (
                            <div>
                              <span className="text-gray-600">Carrier:</span>
                              <span className="ml-2 font-medium">{log.details.carrier}</span>
                            </div>
                          )}
                          {log.details.duration && (
                            <div>
                              <span className="text-gray-600">Duration:</span>
                              <span className="ml-2 font-medium">{log.details.duration}ms</span>
                            </div>
                          )}
                          {log.details.errorCode && (
                            <div>
                              <span className="text-gray-600">Error Code:</span>
                              <span className="ml-2 font-medium text-red-600">{log.details.errorCode}</span>
                            </div>
                          )}
                        </div>
                        
                        {log.details.stackTrace && (
                          <div className="mt-4">
                            <span className="text-gray-600 text-sm">Stack Trace:</span>
                            <pre className="mt-2 p-3 bg-gray-100 rounded text-xs text-gray-800 overflow-x-auto">
                              {log.details.stackTrace}
                            </pre>
                          </div>
                        )}
                        
                        {log.details.metadata && Object.keys(log.details.metadata).length > 0 && (
                          <div className="mt-4">
                            <span className="text-gray-600 text-sm">Additional Metadata:</span>
                            <pre className="mt-2 p-3 bg-gray-100 rounded text-xs text-gray-800 overflow-x-auto">
                              {JSON.stringify(log.details.metadata, null, 2)}
                            </pre>
                          </div>
                        )}
                      </MotionDiv>
                    )}
                  </AnimatePresence>
                </div>
              </div>
            </MotionDiv>
          ))
        )}
      </div>
    </div>
  );
};

export default AuditTrail; 
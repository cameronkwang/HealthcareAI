import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ChartBarIcon,
  DocumentArrowUpIcon,
  Cog6ToothIcon,
  EyeIcon,
  ArrowsPointingOutIcon,
  ArrowsPointingInIcon,
  FunnelIcon,
  ArrowDownTrayIcon,
  ShareIcon
} from '@heroicons/react/24/outline';

// Import all dashboard components
import DashboardLayout from './DashboardLayout';
import MetricCards from './MetricCards';
import TrendChart from './TrendChart';
import ExpenseChart from './ExpenseChart';
import CarrierComparison from './CarrierComparison';
import AuditTrail from './AuditTrail';
import ResultsTable from './ResultsTable';
import EnhancedFileUploader from '../common/EnhancedFileUploader';
import { NotificationProvider, useNotifications } from '../common/NotificationSystem';

// @ts-ignore
const MotionDiv: any = motion.div;

// Updated types to match component interfaces
interface DashboardData {
  metrics: {
    totalClaims: number;
    premium: number;
    lossRatio: number;
    renewalRate: number;
    memberMonths: number;
    avgClaimCost: number;
  };
  trendData: Array<{
    Month: string;
    'Medical Claims': number;
    'Pharmacy Claims': number;
    'Total Claims': number;
    'Earned Premium': number;
    Members: number;
    Subscribers?: number;
    Capitation?: number;
    'Loss Ratio'?: number;
  }>;
  expenseData: Array<{
    category: string;
    amount: number;
    percentage: number;
    trend: 'up' | 'down' | 'stable';
    color: string;
  }>;
  carrierData: Array<{
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
      customerService: number;
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
  }>;
  auditLogs: Array<{
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
    relatedEntries?: string[];
  }>;
  tableData: Array<{
    month: string;
    memberMonths: number;
    incurredClaims: number;
    paidClaims: number;
    lossRatio: number;
    trend: number;
    projectedPremium: number;
    status: 'good' | 'warning' | 'critical';
  }>;
}

interface ViewSettings {
  layout: 'grid' | 'tabs' | 'fullscreen';
  activeTab: string;
  fullscreenComponent: string | null;
  showFilters: boolean;
  compactMode: boolean;
}

interface FilterSettings {
  dateRange: { start: string; end: string };
  carriers: string[];
  statusFilter: string[];
  amountRange: { min: number; max: number };
}

const ComprehensiveDashboard: React.FC = () => {
  const { addNotification } = useNotifications();
  
  // State management
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(false);
  const [viewSettings, setViewSettings] = useState<ViewSettings>({
    layout: 'grid',
    activeTab: 'overview',
    fullscreenComponent: null,
    showFilters: false,
    compactMode: false
  });
  
  const [filters, setFilters] = useState<FilterSettings>({
    dateRange: { start: '', end: '' },
    carriers: [],
    statusFilter: [],
    amountRange: { min: 0, max: 1000000 }
  });

  // Responsive breakpoints
  const [screenSize, setScreenSize] = useState<'sm' | 'md' | 'lg' | 'xl'>('lg');

  // Handle screen size changes
  useEffect(() => {
    const handleResize = () => {
      const width = window.innerWidth;
      if (width < 640) setScreenSize('sm');
      else if (width < 768) setScreenSize('md');
      else if (width < 1024) setScreenSize('lg');
      else setScreenSize('xl');
    };

    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Utility formatting functions
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

  // Sample data generation
  const generateSampleData = useCallback((): DashboardData => {
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'];
    
    return {
      metrics: {
        totalClaims: 2450000,
        premium: 3200000,
        lossRatio: 0.765,
        renewalRate: 0.892,
        memberMonths: 12500,
        avgClaimCost: 1250
      },
      trendData: months.map(month => ({
        Month: month,
        'Medical Claims': Math.random() * 500000 + 200000,
        'Pharmacy Claims': Math.random() * 500000 + 200000,
        'Total Claims': Math.random() * 500000 + 200000,
        'Earned Premium': Math.random() * 600000 + 400000,
        Members: Math.random() * 1000 + 2000,
        Subscribers: Math.random() * 1000 + 2000,
        Capitation: Math.random() * 1000 + 2000,
        'Loss Ratio': Math.random() * 20 + 70
      })),
      expenseData: [
        { category: 'Medical Claims', amount: 1800000, percentage: 73.5, trend: 'up', color: '#ef4444' },
        { category: 'Pharmacy', amount: 420000, percentage: 17.1, trend: 'stable', color: '#3b82f6' },
        { category: 'Administrative', amount: 180000, percentage: 7.3, trend: 'down', color: '#10b981' },
        { category: 'Other', amount: 50000, percentage: 2.1, trend: 'stable', color: '#f59e0b' }
      ],
      carrierData: [
        {
          id: 'aetna',
          name: 'Aetna',
          logo: '/logos/aetna.png',
          color: '#6366f1',
          metrics: {
            premiumProjection: 850000,
            lossRatio: 0.729,
            renewalRate: 0.92,
            memberMonths: 3200,
            avgClaimCost: 1250,
            totalClaims: 620000
          },
          features: {
            networkSize: 'Large',
            customerService: 4.2,
            digitalTools: true,
            preventiveCare: true,
            specialtyAccess: 'Excellent'
          },
          pricing: {
            baseRate: 820000,
            adminFee: 20000,
            stopLoss: 10000,
            total: 850000
          },
          recommendations: ['Nationwide Network', 'Wellness Programs', 'Digital Tools'],
          risks: ['Higher admin costs', 'Complex approval process']
        },
        {
          id: 'uhc',
          name: 'UHC',
          logo: '/logos/uhc.png',
          color: '#3b82f6',
          metrics: {
            premiumProjection: 920000,
            lossRatio: 0.739,
            renewalRate: 0.89,
            memberMonths: 3500,
            avgClaimCost: 1180,
            totalClaims: 680000
          },
          features: {
            networkSize: 'Very Large',
            customerService: 4.1,
            digitalTools: true,
            preventiveCare: true,
            specialtyAccess: 'Good'
          },
          pricing: {
            baseRate: 890000,
            adminFee: 25000,
            stopLoss: 5000,
            total: 920000
          },
          recommendations: ['Large Network', 'Cost Management', 'Analytics'],
          risks: ['Higher premiums', 'Limited flexibility']
        }
      ],
      auditLogs: [
        {
          id: '1',
          timestamp: new Date(),
          user: 'John Smith',
          action: 'Data Upload',
          category: 'upload',
          severity: 'success',
          description: 'Uploaded Q1 claims data (2,450 records)',
          details: {
            fileName: 'q1_claims.csv',
            fileSize: 2048576,
            recordsProcessed: 2450,
            carrier: 'All'
          }
        },
        {
          id: '2',
          timestamp: new Date(Date.now() - 3600000),
          user: 'System',
          action: 'Calculation Complete',
          category: 'calculation',
          severity: 'info',
          description: 'Renewal projections calculated for all carriers',
          details: {
            duration: 45000,
            carrier: 'All'
          }
        }
      ],
      tableData: [
        {
          month: 'Jan 2024',
          memberMonths: 3200,
          incurredClaims: 425000,
          paidClaims: 398000,
          lossRatio: 0.729,
          trend: 0.082,
          projectedPremium: 920000,
          status: 'good'
        },
        {
          month: 'Feb 2024',
          memberMonths: 3150,
          incurredClaims: 463000,
          paidClaims: 445000,
          lossRatio: 0.759,
          trend: 0.095,
          projectedPremium: 995000,
          status: 'warning'
        }
      ]
    };
  }, []);

  // Data upload handler
  const handleDataUpload = useCallback(async (file: File, mapping: any[]) => {
    setLoading(true);
    try {
      // Simulate processing
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      const newData = generateSampleData();
      setData(newData);
      
      addNotification({
        type: 'success',
        title: 'Data Upload Successful',
        message: `Processed file "${file.name}" successfully`,
        duration: 5000
      });
    } catch (error) {
      addNotification({
        type: 'error',
        title: 'Upload Failed',
        message: 'Failed to process uploaded file',
        duration: 5000
      });
    } finally {
      setLoading(false);
    }
  }, [generateSampleData, addNotification]);

  const handleValidationComplete = useCallback((result: any) => {
    console.log('Validation complete:', result);
  }, []);

  // View controls
  const toggleFullscreen = (component: string) => {
    setViewSettings(prev => ({
      ...prev,
      fullscreenComponent: prev.fullscreenComponent === component ? null : component
    }));
  };

  const changeLayout = (layout: ViewSettings['layout']) => {
    setViewSettings(prev => ({ ...prev, layout }));
  };

  const exportData = () => {
    addNotification({
      type: 'info',
      title: 'Export Started',
      message: 'Preparing data export...',
      duration: 3000
    });
  };

  // Responsive grid classes
  const getGridClasses = () => {
    if (viewSettings.compactMode) {
      return 'grid-cols-1 lg:grid-cols-2 gap-4';
    }
    
    switch (screenSize) {
      case 'sm':
        return 'grid-cols-1 gap-3';
      case 'md':
        return 'grid-cols-1 lg:grid-cols-2 gap-4';
      case 'lg':
        return 'grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6';
      default:
        return 'grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 gap-6';
    }
  };

  // Initialize with sample data
  useEffect(() => {
    if (!data) {
      setData(generateSampleData());
    }
  }, [data, generateSampleData]);

  if (!data) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">
                Insurance Renewal Dashboard
              </h1>
              <p className="text-sm text-gray-600">
                Comprehensive analysis and projections
              </p>
            </div>
            
            <div className="flex items-center space-x-3">
              {/* Layout Controls */}
              <div className="hidden md:flex items-center space-x-2 bg-gray-100 rounded-lg p-1">
                <button
                  onClick={() => changeLayout('grid')}
                  className={`p-2 rounded ${
                    viewSettings.layout === 'grid'
                      ? 'bg-white shadow-sm text-blue-600'
                      : 'text-gray-600 hover:text-gray-900'
                  }`}
                >
                  <ChartBarIcon className="w-4 h-4" />
                </button>
                <button
                  onClick={() => changeLayout('tabs')}
                  className={`p-2 rounded ${
                    viewSettings.layout === 'tabs'
                      ? 'bg-white shadow-sm text-blue-600'
                      : 'text-gray-600 hover:text-gray-900'
                  }`}
                >
                  <EyeIcon className="w-4 h-4" />
                </button>
              </div>

              {/* Action Buttons */}
              <button
                onClick={() => setViewSettings(prev => ({ ...prev, showFilters: !prev.showFilters }))}
                className="p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <FunnelIcon className="w-5 h-5" />
              </button>
              
              <button
                onClick={exportData}
                className="p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <ArrowDownTrayIcon className="w-5 h-5" />
              </button>
              
              <button
                onClick={() => setViewSettings(prev => ({ ...prev, compactMode: !prev.compactMode }))}
                className="p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <Cog6ToothIcon className="w-5 h-5" />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Filters Panel */}
      <AnimatePresence>
        {viewSettings.showFilters && (
          <MotionDiv
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="bg-white border-b border-gray-200 overflow-hidden"
          >
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Date Range
                  </label>
                  <div className="flex space-x-2">
                    <input
                      type="date"
                      className="flex-1 rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 text-sm"
                      value={filters.dateRange.start}
                      onChange={(e) => setFilters(prev => ({
                        ...prev,
                        dateRange: { ...prev.dateRange, start: e.target.value }
                      }))}
                    />
                    <input
                      type="date"
                      className="flex-1 rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 text-sm"
                      value={filters.dateRange.end}
                      onChange={(e) => setFilters(prev => ({
                        ...prev,
                        dateRange: { ...prev.dateRange, end: e.target.value }
                      }))}
                    />
                  </div>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Carriers
                  </label>
                  <select
                    multiple
                    className="w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 text-sm"
                    value={filters.carriers}
                    onChange={(e) => setFilters(prev => ({
                      ...prev,
                      carriers: Array.from(e.target.selectedOptions, option => option.value)
                    }))}
                  >
                    <option value="aetna">Aetna</option>
                    <option value="uhc">UHC</option>
                    <option value="cigna">Cigna</option>
                    <option value="bcbs">BCBS</option>
                  </select>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Status
                  </label>
                  <select
                    multiple
                    className="w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 text-sm"
                    value={filters.statusFilter}
                    onChange={(e) => setFilters(prev => ({
                      ...prev,
                      statusFilter: Array.from(e.target.selectedOptions, option => option.value)
                    }))}
                  >
                    <option value="pending">Pending</option>
                    <option value="approved">Approved</option>
                    <option value="rejected">Rejected</option>
                  </select>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Amount Range
                  </label>
                  <div className="flex space-x-2">
                    <input
                      type="number"
                      placeholder="Min"
                      className="flex-1 rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 text-sm"
                      value={filters.amountRange.min}
                      onChange={(e) => setFilters(prev => ({
                        ...prev,
                        amountRange: { ...prev.amountRange, min: Number(e.target.value) }
                      }))}
                    />
                    <input
                      type="number"
                      placeholder="Max"
                      className="flex-1 rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 text-sm"
                      value={filters.amountRange.max}
                      onChange={(e) => setFilters(prev => ({
                        ...prev,
                        amountRange: { ...prev.amountRange, max: Number(e.target.value) }
                      }))}
                    />
                  </div>
                </div>
              </div>
            </div>
          </MotionDiv>
        )}
      </AnimatePresence>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {/* File Upload Section */}
        {data.trendData.length === 0 && (
          <div className="mb-8">
            <EnhancedFileUploader
              onFileUpload={handleDataUpload}
              onValidationComplete={handleValidationComplete}
              acceptedTypes={['.csv', '.xlsx', '.json']}
              maxFileSize={10}
              requiredColumns={[
                'Month', 
                'Medical Claims', 
                'Pharmacy Claims', 
                'Total Claims', 
                'Earned Premium', 
                'Members', 
                'Subscribers',
                'Capitation'
              ]}
              loading={loading}
            />
          </div>
        )}

        {/* Dashboard Content */}
        <AnimatePresence mode="wait">
          {viewSettings.fullscreenComponent ? (
            // Fullscreen Component View
            <MotionDiv
              key="fullscreen"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-50 bg-white"
            >
              <div className="h-full flex flex-col">
                <div className="flex justify-between items-center p-4 border-b border-gray-200">
                  <h2 className="text-xl font-semibold text-gray-900">
                    {viewSettings.fullscreenComponent}
                  </h2>
                  <button
                    onClick={() => toggleFullscreen('')}
                    className="p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg"
                  >
                    <ArrowsPointingInIcon className="w-5 h-5" />
                  </button>
                </div>
                <div className="flex-1 p-4 overflow-auto">
                  {viewSettings.fullscreenComponent === 'trends' && (
                    <TrendChart data={data.trendData} />
                  )}
                  {viewSettings.fullscreenComponent === 'expenses' && (
                    <ExpenseChart data={data.expenseData} />
                  )}
                  {viewSettings.fullscreenComponent === 'comparison' && (
                    <CarrierComparison carriers={data.carrierData} />
                  )}
                  {viewSettings.fullscreenComponent === 'audit' && (
                    <AuditTrail logs={data.auditLogs} />
                  )}
                  {viewSettings.fullscreenComponent === 'table' && (
                    <ResultsTable data={data.tableData} />
                  )}
                </div>
              </div>
            </MotionDiv>
          ) : viewSettings.layout === 'tabs' ? (
            // Tabbed Layout
            <MotionDiv
              key="tabs"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
            >
              <div className="border-b border-gray-200 mb-6">
                <nav className="-mb-px flex space-x-8">
                  {[
                    { id: 'overview', label: 'Overview' },
                    { id: 'trends', label: 'Trends' },
                    { id: 'expenses', label: 'Expenses' },
                    { id: 'comparison', label: 'Comparison' },
                    { id: 'audit', label: 'Audit' },
                    { id: 'data', label: 'Data' }
                  ].map((tab) => (
                    <button
                      key={tab.id}
                      onClick={() => setViewSettings(prev => ({ ...prev, activeTab: tab.id }))}
                      className={`py-2 px-1 border-b-2 font-medium text-sm ${
                        viewSettings.activeTab === tab.id
                          ? 'border-blue-500 text-blue-600'
                          : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                      }`}
                    >
                      {tab.label}
                    </button>
                  ))}
                </nav>
              </div>

              <div className="space-y-6">
                {viewSettings.activeTab === 'overview' && (
                  <>
                    <MetricCards data={data.metrics} />
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                      <TrendChart data={data.trendData} />
                      <ExpenseChart data={data.expenseData} />
                    </div>
                  </>
                )}
                {viewSettings.activeTab === 'trends' && <TrendChart data={data.trendData} />}
                {viewSettings.activeTab === 'expenses' && <ExpenseChart data={data.expenseData} />}
                {viewSettings.activeTab === 'comparison' && <CarrierComparison carriers={data.carrierData} />}
                {viewSettings.activeTab === 'audit' && <AuditTrail logs={data.auditLogs} />}
                {viewSettings.activeTab === 'data' && <ResultsTable data={data.tableData} />}
              </div>
            </MotionDiv>
          ) : (
            // Grid Layout
            <MotionDiv
              key="grid"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="space-y-6"
            >
              {/* Metrics Row */}
              <MetricCards data={data.metrics} />

              {/* Charts Grid */}
              <div className={`grid ${getGridClasses()}`}>
                <div className="relative">
                  <button
                    onClick={() => toggleFullscreen('trends')}
                    className="absolute top-4 right-4 z-10 p-1 text-gray-400 hover:text-gray-600 bg-white rounded shadow-sm"
                  >
                    <ArrowsPointingOutIcon className="w-4 h-4" />
                  </button>
                  <TrendChart data={data.trendData} />
                </div>

                <div className="relative">
                  <button
                    onClick={() => toggleFullscreen('expenses')}
                    className="absolute top-4 right-4 z-10 p-1 text-gray-400 hover:text-gray-600 bg-white rounded shadow-sm"
                  >
                    <ArrowsPointingOutIcon className="w-4 h-4" />
                  </button>
                  <ExpenseChart data={data.expenseData} />
                </div>

                <div className="relative lg:col-span-2 xl:col-span-1">
                  <button
                    onClick={() => toggleFullscreen('comparison')}
                    className="absolute top-4 right-4 z-10 p-1 text-gray-400 hover:text-gray-600 bg-white rounded shadow-sm"
                  >
                    <ArrowsPointingOutIcon className="w-4 h-4" />
                  </button>
                  <CarrierComparison carriers={data.carrierData} />
                </div>
              </div>

              {/* Full Width Components */}
              <div className="space-y-6">
                <div className="relative">
                  <button
                    onClick={() => toggleFullscreen('table')}
                    className="absolute top-4 right-4 z-10 p-1 text-gray-400 hover:text-gray-600 bg-white rounded shadow-sm"
                  >
                    <ArrowsPointingOutIcon className="w-4 h-4" />
                  </button>
                  <ResultsTable data={data.tableData} />
                </div>

                <div className="relative">
                  <button
                    onClick={() => toggleFullscreen('audit')}
                    className="absolute top-4 right-4 z-10 p-1 text-gray-400 hover:text-gray-600 bg-white rounded shadow-sm"
                  >
                    <ArrowsPointingOutIcon className="w-4 h-4" />
                  </button>
                  <AuditTrail logs={data.auditLogs} />
                </div>
              </div>
            </MotionDiv>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
};

// Wrapper with NotificationProvider
const ComprehensiveDashboardWithNotifications: React.FC = () => {
  return (
    <NotificationProvider>
      <ComprehensiveDashboard />
    </NotificationProvider>
  );
};

export default ComprehensiveDashboardWithNotifications; 
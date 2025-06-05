import React, { useState, ReactNode } from 'react';
import { 
  ArrowUpTrayIcon, 
  PresentationChartBarIcon, 
  ScaleIcon, 
  ClipboardDocumentListIcon,
  UserCircleIcon,
  Bars3Icon,
  XMarkIcon,
  ChevronLeftIcon,
  BellIcon,
  Cog6ToothIcon
} from '@heroicons/react/24/outline';
import { motion, AnimatePresence } from 'framer-motion';

// Create typed motion components
// @ts-ignore
const MotionDiv: any = motion.div;

interface DashboardLayoutProps {
  children: ReactNode;
  currentSection?: string;
  onSectionChange?: (section: string) => void;
}

interface NavItem {
  id: string;
  label: string;
  icon: any;
  description: string;
}

const navigationItems: NavItem[] = [
  {
    id: 'upload',
    label: 'Upload',
    icon: ArrowUpTrayIcon,
    description: 'Upload and validate data files'
  },
  {
    id: 'results',
    label: 'Results',
    icon: PresentationChartBarIcon,
    description: 'View calculation results and summaries'
  },
  {
    id: 'comparison',
    label: 'Comparison',
    icon: ScaleIcon,
    description: 'Compare carrier renewal options'
  },
  {
    id: 'audit',
    label: 'Audit Trail',
    icon: ClipboardDocumentListIcon,
    description: 'View calculation logs and history'
  }
];

const DashboardLayout: React.FC<DashboardLayoutProps> = ({ 
  children, 
  currentSection = 'upload',
  onSectionChange = () => {}
}) => {
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const currentNavItem = navigationItems.find(item => item.id === currentSection);

  return (
    <div className="min-h-screen bg-gray-50 flex">
      {/* Mobile menu backdrop */}
      <AnimatePresence>
        {mobileMenuOpen && (
          <MotionDiv
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-40 bg-black bg-opacity-50 lg:hidden"
            onClick={() => setMobileMenuOpen(false)}
          />
        )}
      </AnimatePresence>

      {/* Sidebar */}
      <AnimatePresence>
        <MotionDiv
          initial={false}
          animate={{ 
            width: sidebarOpen ? '16rem' : '4rem',
            transition: { duration: 0.3, ease: 'easeInOut' }
          }}
          className={`
            fixed lg:relative inset-y-0 left-0 z-50 w-64 lg:w-auto
            bg-white border-r border-gray-200 shadow-lg lg:shadow-none
            transform ${mobileMenuOpen ? 'translate-x-0' : '-translate-x-full'}
            lg:translate-x-0 transition-transform duration-300 ease-in-out
          `}
        >
          {/* Sidebar Header */}
          <div className="flex items-center justify-between h-16 px-4 border-b border-gray-200">
            <MotionDiv
              animate={{ opacity: sidebarOpen ? 1 : 0 }}
              className="flex items-center"
            >
              <div className="flex items-center">
                <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-purple-600 rounded-lg flex items-center justify-center">
                  <span className="text-white font-bold text-sm">RA</span>
                </div>
                <span className="ml-2 text-xl font-bold text-gray-900">RenewalAI</span>
              </div>
            </MotionDiv>
            
            {/* Toggle button for desktop */}
            <button
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className="hidden lg:flex p-1.5 rounded-md hover:bg-gray-100 transition-colors"
            >
              <ChevronLeftIcon 
                className={`w-5 h-5 text-gray-500 transition-transform duration-300 ${
                  sidebarOpen ? '' : 'rotate-180'
                }`} 
              />
            </button>

            {/* Close button for mobile */}
            <button
              onClick={() => setMobileMenuOpen(false)}
              className="lg:hidden p-1.5 rounded-md hover:bg-gray-100 transition-colors"
            >
              <XMarkIcon className="w-5 h-5 text-gray-500" />
            </button>
          </div>

          {/* Navigation */}
          <nav className="flex-1 px-4 py-4 space-y-2">
            {navigationItems.map((item) => {
              const isActive = currentSection === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => {
                    onSectionChange(item.id);
                    setMobileMenuOpen(false);
                  }}
                  className={`
                    w-full flex items-center px-3 py-2.5 rounded-lg text-left
                    transition-all duration-200 group relative
                    ${isActive 
                      ? 'bg-blue-50 text-blue-700 border border-blue-200' 
                      : 'text-gray-700 hover:bg-gray-50 hover:text-gray-900'
                    }
                  `}
                >
                  <item.icon 
                    className={`
                      w-5 h-5 flex-shrink-0
                      ${isActive ? 'text-blue-600' : 'text-gray-400 group-hover:text-gray-600'}
                    `} 
                  />
                  <MotionDiv
                    animate={{ 
                      opacity: sidebarOpen ? 1 : 0,
                      width: sidebarOpen ? 'auto' : 0
                    }}
                    className="ml-3 overflow-hidden"
                  >
                    <div className="font-medium">{item.label}</div>
                    {sidebarOpen && (
                      <div className="text-xs text-gray-500 mt-0.5">
                        {item.description}
                      </div>
                    )}
                  </MotionDiv>

                  {/* Tooltip for collapsed state */}
                  {!sidebarOpen && (
                    <div className="
                      absolute left-full ml-2 px-3 py-2 bg-gray-900 text-white text-sm 
                      rounded-lg opacity-0 group-hover:opacity-100 transition-opacity
                      pointer-events-none whitespace-nowrap z-50
                    ">
                      {item.label}
                      <div className="absolute left-0 top-1/2 -translate-y-1/2 -translate-x-1 
                        border-4 border-transparent border-r-gray-900"></div>
                    </div>
                  )}
                </button>
              );
            })}
          </nav>

          {/* User Section */}
          <div className="p-4 border-t border-gray-200">
            <MotionDiv
              animate={{ opacity: sidebarOpen ? 1 : 0 }}
              className="flex items-center"
            >
              <div className="flex items-center w-full">
                <UserCircleIcon className="w-8 h-8 text-gray-400" />
                <div className="ml-3 overflow-hidden">
                  <div className="text-sm font-medium text-gray-900">Actuarial User</div>
                  <div className="text-xs text-gray-500">Premium Account</div>
                </div>
              </div>
            </MotionDiv>
            
            {!sidebarOpen && (
              <div className="flex justify-center">
                <UserCircleIcon className="w-8 h-8 text-gray-400" />
              </div>
            )}
          </div>
        </MotionDiv>
      </AnimatePresence>

      {/* Main content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Header */}
        <header className="bg-white border-b border-gray-200 px-4 py-4 lg:px-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              {/* Mobile menu button */}
              <button
                onClick={() => setMobileMenuOpen(true)}
                className="lg:hidden p-2 rounded-md hover:bg-gray-100 transition-colors mr-2"
              >
                <Bars3Icon className="w-6 h-6 text-gray-600" />
              </button>

              {/* Breadcrumb */}
              <div className="flex items-center space-x-2">
                <h1 className="text-2xl font-bold text-gray-900">
                  {currentNavItem?.label || 'Dashboard'}
                </h1>
                {currentNavItem && (
                  <>
                    <span className="text-gray-400">/</span>
                    <span className="text-sm text-gray-600">
                      {currentNavItem.description}
                    </span>
                  </>
                )}
              </div>
            </div>

            {/* Header actions */}
            <div className="flex items-center space-x-4">
              {/* Notifications */}
              <button className="p-2 rounded-md hover:bg-gray-100 transition-colors relative">
                <BellIcon className="w-5 h-5 text-gray-600" />
                <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full"></span>
              </button>

              {/* Settings */}
              <button className="p-2 rounded-md hover:bg-gray-100 transition-colors">
                <Cog6ToothIcon className="w-5 h-5 text-gray-600" />
              </button>

              {/* User profile */}
              <div className="flex items-center space-x-3">
                <div className="hidden sm:block text-right">
                  <div className="text-sm font-medium text-gray-900">Actuarial User</div>
                  <div className="text-xs text-gray-500">Premium Account</div>
                </div>
                <UserCircleIcon className="w-8 h-8 text-gray-400" />
              </div>
            </div>
          </div>
        </header>

        {/* Main content area */}
        <main className="flex-1 overflow-auto bg-gray-50">
          <div className="h-full">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
};

export default DashboardLayout; 
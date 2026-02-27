/**
 * Phase 1-5: Three-column layout shell for Contact and Company record pages
 * REQ-01, 3.1, 5.4, REQ-09 - Responsive layout
 */

import React, { useState, useEffect } from 'react';
import { X, Menu } from 'lucide-react';

interface RecordPageLayoutProps {
  left: React.ReactNode;
  center: React.ReactNode;
  right?: React.ReactNode;
  breadcrumbs?: React.ReactNode;
}

const RecordPageLayout: React.FC<RecordPageLayoutProps> = ({ left, center, right, breadcrumbs }) => {
  const [isMobile, setIsMobile] = useState(false);
  const [isTablet, setIsTablet] = useState(false);
  const [isRightSidebarOpen, setIsRightSidebarOpen] = useState(false);
  const [isLeftSidebarCollapsed, setIsLeftSidebarCollapsed] = useState(false);

  useEffect(() => {
    const checkScreenSize = () => {
      const width = window.innerWidth;
      setIsMobile(width < 768);
      setIsTablet(width >= 768 && width < 1280);
      setIsLeftSidebarCollapsed(width >= 768 && width < 1280);
    };

    checkScreenSize();
    window.addEventListener('resize', checkScreenSize);
    return () => window.removeEventListener('resize', checkScreenSize);
  }, []);

  // Mobile: Single column layout
  if (isMobile) {
    return (
      <div className="h-full flex flex-col">
        {/* Breadcrumbs */}
        {breadcrumbs && (
          <div className="px-4 pt-4 pb-2 border-b border-slate-200">
            {breadcrumbs}
          </div>
        )}
        
        {/* Single column - Header → Quick Actions → Properties → Tabs */}
        <div className="flex-1 overflow-y-auto bg-slate-50">
          {center}
        </div>
        
        {/* Mobile: Left sidebar content integrated into center */}
        <div className="border-t border-slate-200 bg-white">
          {left}
        </div>
      </div>
    );
  }

  // Tablet: Left sidebar collapsed, right sidebar as slide-over
  if (isTablet) {
    return (
      <div className="h-full flex flex-col">
        {/* Breadcrumbs */}
        {breadcrumbs && (
          <div className="px-6 pt-4 pb-2 border-b border-slate-200">
            {breadcrumbs}
          </div>
        )}
        
        {/* Layout with collapsed left sidebar */}
        <div className="flex-1 flex overflow-hidden">
          {/* Left Sidebar - Icon-only mode */}
          <div className={`${isLeftSidebarCollapsed ? 'w-16' : 'w-[280px]'} border-r border-slate-200 overflow-y-auto bg-white transition-all duration-300`}>
            {left}
          </div>
          
          {/* Center Content */}
          <div className="flex-1 overflow-y-auto bg-slate-50 relative">
            {/* Right Sidebar Toggle Button */}
            {right && (
              <button
                onClick={() => setIsRightSidebarOpen(true)}
                className="fixed top-4 right-4 z-10 p-2 bg-white border border-slate-200 rounded-lg shadow-sm hover:bg-slate-50 transition-colors"
                aria-label="Open right sidebar"
              >
                <Menu className="w-5 h-5 text-slate-600" />
              </button>
            )}
            {center}
          </div>
        </div>
        
        {/* Right Sidebar Slide-over */}
        {right && isRightSidebarOpen && (
          <>
            <div 
              className="fixed inset-0 bg-black/50 z-40"
              onClick={() => setIsRightSidebarOpen(false)}
            />
            <div className="fixed right-0 top-0 bottom-0 w-[300px] bg-white border-l border-slate-200 shadow-xl z-50 overflow-y-auto">
              <div className="sticky top-0 bg-white border-b border-slate-200 px-4 py-3 flex items-center justify-between">
                <h3 className="text-sm font-semibold text-slate-900">Associations & Widgets</h3>
                <button
                  onClick={() => setIsRightSidebarOpen(false)}
                  className="p-1 text-slate-400 hover:text-slate-600"
                  aria-label="Close sidebar"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
              {right}
            </div>
          </>
        )}
      </div>
    );
  }

  // Desktop: Full three-column layout
  return (
    <div className="h-full flex flex-col">
      {/* Breadcrumbs */}
      {breadcrumbs && (
        <div className="px-8 pt-6 pb-2 border-b border-slate-200">
          {breadcrumbs}
        </div>
      )}
      
      {/* Three-column layout */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left Sidebar - ~280px fixed */}
        <div className="w-[280px] border-r border-slate-200 overflow-y-auto bg-white">
          {left}
        </div>
        
        {/* Center Content - flexible */}
        <div className="flex-1 overflow-y-auto bg-slate-50">
          {center}
        </div>
        
        {/* Right Sidebar - ~300px fixed (optional) */}
        {right && (
          <div className="w-[300px] border-l border-slate-200 overflow-y-auto bg-white">
            {right}
          </div>
        )}
      </div>
    </div>
  );
};

export default RecordPageLayout;

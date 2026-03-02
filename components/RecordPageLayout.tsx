/**
 * Phase 1-5: Three-column layout shell for Contact and Company record pages
 * REQ-01, 3.1, 5.4, REQ-09 - Responsive layout
 * Second Update: optional right-side "About" drawer with session persistence
 */

import React, { useState, useEffect } from 'react';
import { X, Menu, PanelRightOpen } from 'lucide-react';

const ABOUT_PANEL_KEY = 'recordPageAboutPanelOpen';

interface RecordPageLayoutProps {
  left: React.ReactNode;
  center: React.ReactNode;
  right?: React.ReactNode;
  breadcrumbs?: React.ReactNode;
  /** When true, left panel (About) can be shown in a right-side drawer on desktop */
  aboutAsRightDrawer?: boolean;
}

const RecordPageLayout: React.FC<RecordPageLayoutProps> = ({ left, center, right, breadcrumbs, aboutAsRightDrawer }) => {
  const [isMobile, setIsMobile] = useState(false);
  const [isTablet, setIsTablet] = useState(false);
  const [isRightSidebarOpen, setIsRightSidebarOpen] = useState(false);
  const [isLeftSidebarCollapsed, setIsLeftSidebarCollapsed] = useState(false);
  const [aboutPanelOpen, setAboutPanelOpen] = useState(() => {
    try {
      const s = sessionStorage.getItem(ABOUT_PANEL_KEY);
      return s ? JSON.parse(s) : true;
    } catch (_) {
      return true;
    }
  });

  useEffect(() => {
    const v = aboutPanelOpen;
    try {
      sessionStorage.setItem(ABOUT_PANEL_KEY, JSON.stringify(v));
    } catch (_) {}
  }, [aboutPanelOpen]);

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

  // Desktop: Full three-column layout, or center + optional right About drawer
  const showAboutDrawer = aboutAsRightDrawer && left;
  return (
    <div className="h-full flex flex-col">
      {breadcrumbs && (
        <div className={`px-8 pt-6 pb-2 border-b border-slate-200 flex items-center justify-between gap-4 ${showAboutDrawer ? '' : ''}`}>
          <div className="flex-1 min-w-0">{breadcrumbs}</div>
          {showAboutDrawer && (
            <button
              type="button"
              onClick={() => setAboutPanelOpen((o) => !o)}
              className="flex items-center gap-2 px-3 py-1.5 text-sm font-medium text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-colors shrink-0"
              aria-label={aboutPanelOpen ? 'Hide about panel' : 'Show about panel'}
            >
              <PanelRightOpen className="w-4 h-4" />
              {aboutPanelOpen ? 'Hide about' : 'About'}
            </button>
          )}
        </div>
      )}
      
      <div className="flex-1 flex overflow-hidden">
        {!showAboutDrawer && (
          <div className="w-[280px] min-w-[200px] border-r border-slate-200 overflow-y-auto bg-white shrink-0">
            {left}
          </div>
        )}
        <div className="flex-1 overflow-y-auto bg-slate-50 min-w-0">
          {center}
        </div>
        {showAboutDrawer && aboutPanelOpen && (
          <div className="w-[320px] border-l border-slate-200 overflow-y-auto bg-white shrink-0">
            {left}
          </div>
        )}
        {right && !showAboutDrawer && (
          <div className="w-[300px] border-l border-slate-200 overflow-y-auto bg-white shrink-0">
            {right}
          </div>
        )}
      </div>
    </div>
  );
};

export default RecordPageLayout;

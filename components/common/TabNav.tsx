/**
 * Phase 3: TabNav Component
 * REQ-04, 5.4 - Tab navigation with Overview, Activities, and More dropdown
 */

import React, { useState } from 'react';
import { ChevronDown } from 'lucide-react';

export type TabId = 'overview' | 'activities' | 'strategic-context' | 'playbooks';

interface TabNavProps {
  activeTab: TabId;
  onTabChange: (tab: TabId) => void;
  showMore?: boolean;
  moreTabs?: Array<{ id: TabId; label: string }>;
}

const TabNav: React.FC<TabNavProps> = ({
  activeTab,
  onTabChange,
  showMore = true,
  moreTabs = [
    { id: 'strategic-context' as TabId, label: 'Strategic Context' },
    { id: 'playbooks' as TabId, label: 'Playbooks' },
  ]
}) => {
  const [showMoreMenu, setShowMoreMenu] = useState(false);

  const mainTabs = [
    { id: 'overview' as TabId, label: 'Overview' },
    { id: 'activities' as TabId, label: 'Activities' },
  ];

  return (
    <div className="border-b border-slate-200 bg-white">
      <div className="flex items-center justify-between px-6">
        <div className="flex items-center gap-1">
          {mainTabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => onTabChange(tab.id)}
              role="tab"
              aria-selected={activeTab === tab.id}
              aria-controls={`tabpanel-${tab.id}`}
              className={`px-4 py-3 text-sm font-medium transition-colors relative focus:outline-none focus:ring-2 focus:ring-indigo-200 rounded-t-lg ${
                activeTab === tab.id
                  ? 'text-indigo-600 border-b-2 border-indigo-600'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              {tab.label}
            </button>
          ))}
          {showMore && moreTabs.length > 0 && (
            <div className="relative">
              <button
                onClick={() => setShowMoreMenu(!showMoreMenu)}
                className={`px-4 py-3 text-sm font-medium transition-colors flex items-center gap-1 ${
                  moreTabs.some(t => t.id === activeTab)
                    ? 'text-indigo-600 border-b-2 border-indigo-600'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                More
                <ChevronDown className={`w-4 h-4 transition-transform ${showMoreMenu ? 'rotate-180' : ''}`} />
              </button>
              {showMoreMenu && (
                <>
                  <div 
                    className="fixed inset-0 z-10" 
                    onClick={() => setShowMoreMenu(false)}
                  />
                  <div className="absolute top-full left-0 mt-1 bg-white border border-slate-200 rounded-lg shadow-lg z-20 min-w-[180px]">
                    {moreTabs.map((tab) => (
                      <button
                        key={tab.id}
                        onClick={() => {
                          onTabChange(tab.id);
                          setShowMoreMenu(false);
                        }}
                        className={`w-full text-left px-4 py-2 text-sm transition-colors ${
                          activeTab === tab.id
                            ? 'bg-indigo-50 text-indigo-600 font-medium'
                            : 'text-slate-700 hover:bg-slate-50'
                        }`}
                      >
                        {tab.label}
                      </button>
                    ))}
                  </div>
                </>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default TabNav;

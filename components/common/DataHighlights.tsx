/**
 * Phase 3: DataHighlights Component
 * REQ-05 - Key metrics card with configurable highlights
 */

import React, { useState } from 'react';
import { Settings2, Calendar, Clock, Users, Star, TrendingUp } from 'lucide-react';

export interface Highlight {
  id: string;
  label: string;
  value: string | number | null;
  icon?: React.ReactNode;
  onClick?: () => void;
  formatValue?: (value: any) => string;
}

interface DataHighlightsProps {
  highlights: Highlight[];
  onConfigure?: () => void;
  isAdmin?: boolean;
}

const DataHighlights: React.FC<DataHighlightsProps> = ({
  highlights,
  onConfigure,
  isAdmin = false
}) => {
  const formatDate = (dateStr: string | null | undefined) => {
    if (!dateStr) return '--';
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  };

  const formatRelativeDate = (dateStr: string | null | undefined) => {
    if (!dateStr) return '--';
    const date = new Date(dateStr);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    
    if (diffDays === 0) return 'Today';
    if (diffDays === 1) return 'Yesterday';
    if (diffDays < 7) return `${diffDays} days ago`;
    if (diffDays < 30) return `${Math.floor(diffDays / 7)} week${Math.floor(diffDays / 7) > 1 ? 's' : ''} ago`;
    return formatDate(dateStr);
  };

  return (
    <div className="bg-white border border-slate-200 rounded-lg p-6 mb-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider">Data Highlights</h3>
        {onConfigure && isAdmin && (
          <button
            onClick={onConfigure}
            className="p-1.5 text-slate-400 hover:text-slate-600 transition-colors"
            title="Configure highlights"
          >
            <Settings2 className="w-4 h-4" />
          </button>
        )}
      </div>
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
        {highlights.map((highlight) => {
          const displayValue = highlight.formatValue 
            ? highlight.formatValue(highlight.value)
            : highlight.value === null || highlight.value === undefined || highlight.value === ''
              ? '--'
              : String(highlight.value);
          
          return (
            <div
              key={highlight.id}
              onClick={highlight.onClick}
              className={`p-3 rounded-lg border border-slate-100 ${
                highlight.onClick ? 'cursor-pointer hover:bg-slate-50 transition-colors' : ''
              }`}
            >
              <div className="flex items-center gap-2 mb-1">
                {highlight.icon && (
                  <div className="text-slate-400">
                    {highlight.icon}
                  </div>
                )}
                <span className="text-xs font-medium text-slate-500 uppercase tracking-wider">
                  {highlight.label}
                </span>
              </div>
              <div className="text-lg font-bold text-slate-900">
                {displayValue}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default DataHighlights;

/**
 * Phase 3: AssociationPreview Component
 * REQ-04, REQ-07 - Compact association preview sections for Overview tab
 */

import React from 'react';
import { ChevronRight, Building2, TrendingUp, User } from 'lucide-react';

export interface AssociationItem {
  id: string;
  name: string;
  subtitle?: string;
  metadata?: Record<string, any>;
}

interface AssociationPreviewProps {
  title: string;
  items: AssociationItem[];
  icon?: React.ReactNode;
  onItemClick?: (item: AssociationItem) => void;
  onViewAll?: () => void;
  maxItems?: number;
}

const AssociationPreview: React.FC<AssociationPreviewProps> = ({
  title,
  items,
  icon,
  onItemClick,
  onViewAll,
  maxItems = 5
}) => {
  const displayItems = items.slice(0, maxItems);
  const hasMore = items.length > maxItems;

  if (items.length === 0) {
    return null;
  }

  return (
    <div className="bg-white border border-slate-200 rounded-lg p-4 mb-4">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          {icon && <div className="text-slate-400">{icon}</div>}
          <h4 className="text-sm font-bold text-slate-900">{title}</h4>
          <span className="text-xs text-slate-500">({items.length})</span>
        </div>
        {hasMore && onViewAll && (
          <button
            onClick={onViewAll}
            className="text-xs text-indigo-600 hover:text-indigo-700 font-medium"
          >
            View all
          </button>
        )}
      </div>
      <div className="space-y-2">
        {displayItems.map((item) => (
          <button
            key={item.id}
            onClick={() => onItemClick?.(item)}
            className="w-full flex items-center justify-between p-2 rounded-lg hover:bg-slate-50 transition-colors group"
          >
            <div className="flex-1 min-w-0 text-left">
              <p className="text-sm font-medium text-slate-900 truncate">
                {item.name}
              </p>
              {item.subtitle && (
                <p className="text-xs text-slate-500 truncate">
                  {item.subtitle}
                </p>
              )}
            </div>
            <ChevronRight className="w-4 h-4 text-slate-400 opacity-0 group-hover:opacity-100 transition-opacity" />
          </button>
        ))}
      </div>
    </div>
  );
};

export default AssociationPreview;

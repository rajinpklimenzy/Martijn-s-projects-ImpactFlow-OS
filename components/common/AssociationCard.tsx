/**
 * Phase 4: AssociationCard Component
 * REQ-07 - Reusable collapsible association card with item list and add button
 */

import React, { useState } from 'react';
import { ChevronDown, ChevronRight, Plus, X } from 'lucide-react';

export interface AssociationItem {
  id: string;
  name: string;
  subtitle?: string;
  metadata?: Record<string, any>;
}

interface AssociationCardProps {
  title: string;
  items: AssociationItem[];
  icon?: React.ReactNode;
  onItemClick?: (item: AssociationItem) => void;
  onAdd?: () => void;
  onRemove?: (itemId: string) => void;
  defaultCollapsed?: boolean;
  maxItems?: number;
  emptyMessage?: string;
}

const AssociationCard: React.FC<AssociationCardProps> = ({
  title,
  items,
  icon,
  onItemClick,
  onAdd,
  onRemove,
  defaultCollapsed = false,
  maxItems,
  emptyMessage = 'No items'
}) => {
  const [isCollapsed, setIsCollapsed] = useState(defaultCollapsed);
  const displayItems = maxItems ? items.slice(0, maxItems) : items;
  const hasMore = maxItems ? items.length > maxItems : false;

  return (
    <div className="border-b border-slate-200 last:border-0">
      {/* Header */}
      <button
        onClick={() => setIsCollapsed(!isCollapsed)}
        className="w-full flex items-center justify-between px-4 py-3 hover:bg-slate-50 transition-colors"
      >
        <div className="flex items-center gap-2">
          {isCollapsed ? (
            <ChevronRight className="w-4 h-4 text-slate-400" />
          ) : (
            <ChevronDown className="w-4 h-4 text-slate-400" />
          )}
          {icon && <div className="text-slate-400">{icon}</div>}
          <span className="text-sm font-semibold text-slate-900">{title}</span>
          <span className="text-xs text-slate-500">({items.length})</span>
        </div>
      </button>

      {/* Content */}
      {!isCollapsed && (
        <div className="px-4 pb-4">
          {items.length === 0 ? (
            <div className="py-4 text-center">
              <p className="text-sm text-slate-400">{emptyMessage}</p>
            </div>
          ) : (
            <div className="space-y-2">
              {displayItems.map((item) => (
                <div
                  key={item.id}
                  className="group flex items-center justify-between p-2 rounded-lg hover:bg-slate-50 transition-colors"
                >
                  <button
                    onClick={() => onItemClick?.(item)}
                    className="flex-1 min-w-0 text-left"
                  >
                    <p className="text-sm font-medium text-slate-900 truncate">
                      {item.name}
                    </p>
                    {item.subtitle && (
                      <p className="text-xs text-slate-500 truncate">
                        {item.subtitle}
                      </p>
                    )}
                  </button>
                  {onRemove && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onRemove(item.id);
                      }}
                      className="opacity-0 group-hover:opacity-100 p-1 text-slate-400 hover:text-red-600 transition-all"
                      title="Remove association"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  )}
                </div>
              ))}
              {hasMore && (
                <p className="text-xs text-slate-400 text-center pt-2">
                  +{items.length - (maxItems || 0)} more
                </p>
              )}
            </div>
          )}
          
          {onAdd && (
            <button
              onClick={onAdd}
              className="w-full mt-3 flex items-center justify-center gap-2 px-3 py-2 text-sm font-medium text-indigo-600 bg-indigo-50 hover:bg-indigo-100 rounded-lg transition-colors"
            >
              <Plus className="w-4 h-4" />
              Add
            </button>
          )}
        </div>
      )}
    </div>
  );
};

export default AssociationCard;

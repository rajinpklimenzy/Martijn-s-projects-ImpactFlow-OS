/**
 * Phase 2: View All Properties Slide-Over
 * REQ-03 - Right-side slide-over for viewing/editing all properties
 */

import React, { useState, useMemo } from 'react';
import { X, Search, EyeOff, Settings2 } from 'lucide-react';
import InlineEditField from './InlineEditField';

interface Property {
  key: string;
  label: string;
  value: any;
  type?: 'text' | 'email' | 'url' | 'phone' | 'dropdown' | 'date' | 'number' | 'textarea' | 'boolean' | 'calculated';
  options?: { value: string; label: string }[];
  category?: string;
  onSave?: (newValue: any) => Promise<void>;
  disabled?: boolean;
  calculatedValue?: string;
}

interface ViewAllPropertiesSlideOverProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  properties: Property[];
  onManageProperties?: () => void; // Admin-only, Phase 5
  isAdmin?: boolean;
}

const ViewAllPropertiesSlideOver: React.FC<ViewAllPropertiesSlideOverProps> = ({
  isOpen,
  onClose,
  title,
  properties,
  onManageProperties,
  isAdmin = false
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [hideBlankProperties, setHideBlankProperties] = useState(false);

  // Group properties by category
  const groupedProperties = useMemo(() => {
    const groups: Record<string, Property[]> = {};
    properties.forEach(prop => {
      const category = prop.category || 'Other';
      if (!groups[category]) {
        groups[category] = [];
      }
      groups[category].push(prop);
    });
    return groups;
  }, [properties]);

  // Filter properties based on search and hide blank
  const filteredGroups = useMemo(() => {
    const filtered: Record<string, Property[]> = {};
    Object.entries(groupedProperties).forEach(([category, props]) => {
      const filteredProps = props.filter(prop => {
        // Search filter
        if (searchQuery) {
          const query = searchQuery.toLowerCase();
          const matchesLabel = prop.label.toLowerCase().includes(query);
          const matchesValue = String(prop.value || '').toLowerCase().includes(query);
          if (!matchesLabel && !matchesValue) return false;
        }
        // Hide blank filter
        if (hideBlankProperties) {
          const hasValue = prop.value !== null && prop.value !== undefined && prop.value !== '';
          if (!hasValue && !prop.calculatedValue) return false;
        }
        return true;
      });
      if (filteredProps.length > 0) {
        filtered[category] = filteredProps;
      }
    });
    return filtered;
  }, [groupedProperties, searchQuery, hideBlankProperties]);

  if (!isOpen) return null;

  return (
    <>
      {/* Backdrop */}
      <div 
        className="fixed inset-0 bg-black/50 z-40 transition-opacity"
        onClick={onClose}
      />
      
      {/* Slide-over */}
      <div className="fixed right-0 top-0 bottom-0 w-full max-w-2xl bg-white shadow-2xl z-50 transform transition-transform overflow-hidden flex flex-col">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between">
          <h2 className="text-lg font-bold text-slate-900">{title}</h2>
          <div className="flex items-center gap-2">
            {onManageProperties && isAdmin && (
              <button
                onClick={onManageProperties}
                className="p-2 text-slate-400 hover:text-slate-600 transition-colors"
                title="Manage properties"
              >
                <Settings2 className="w-4 h-4" />
              </button>
            )}
            <button
              onClick={onClose}
              className="p-2 text-slate-400 hover:text-slate-600 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Search and Filters */}
        <div className="px-6 py-4 border-b border-slate-200 space-y-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              placeholder="Search properties..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-200"
            />
          </div>
          <label className="flex items-center gap-2 text-sm text-slate-600 cursor-pointer">
            <input
              type="checkbox"
              checked={hideBlankProperties}
              onChange={(e) => setHideBlankProperties(e.target.checked)}
              className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
            />
            <EyeOff className="w-4 h-4" />
            <span>Hide blank properties</span>
          </label>
        </div>

        {/* Properties List */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {Object.keys(filteredGroups).length === 0 ? (
            <div className="text-center py-12">
              <p className="text-sm text-slate-500">No properties found</p>
            </div>
          ) : (
            Object.entries(filteredGroups).map(([category, props]) => (
              <div key={category}>
                <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3">
                  {category}
                </h3>
                <div className="space-y-4">
                  {props.map((property) => (
                    <div key={property.key}>
                      {property.onSave ? (
                        <InlineEditField
                          value={property.value}
                          onSave={property.onSave}
                          type={property.type || 'text'}
                          options={property.options}
                          label={property.label}
                          disabled={property.disabled}
                          calculatedValue={property.calculatedValue}
                        />
                      ) : (
                        <div>
                          <div className="text-xs font-medium text-slate-500 mb-1">{property.label}</div>
                          <div className="text-sm text-slate-600">
                            {property.calculatedValue !== undefined 
                              ? property.calculatedValue 
                              : property.value || '--'}
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </>
  );
};

export default ViewAllPropertiesSlideOver;

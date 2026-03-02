/**
 * Phase 2: PropertyPanel Component
 * REQ-03, REQ-10 - "About this contact/company" section with inline-editable properties
 */

import React, { useState } from 'react';
import { Settings2, MoreVertical, Eye, History, GitMerge, Copy, Trash2, Download, X } from 'lucide-react';
import InlineEditField from './InlineEditField';

interface Property {
  key: string;
  label: string;
  value: any;
  type?: 'text' | 'email' | 'url' | 'phone' | 'dropdown' | 'date' | 'number' | 'textarea' | 'boolean' | 'calculated';
  options?: { value: string; label: string }[];
  onSave?: (newValue: any) => Promise<void>;
  disabled?: boolean;
  calculatedValue?: string;
}

interface PropertyPanelProps {
  title: string;
  properties: Property[];
  onViewAllProperties?: () => void;
  onViewPropertyHistory?: () => void;
  onMerge?: () => void;
  onClone?: () => void;
  onDelete?: () => void;
  onExport?: () => void;
  onManageProperties?: () => void; // Admin-only, Phase 5
  isAdmin?: boolean;
  entityType?: 'contact' | 'company';
}

const PropertyPanel: React.FC<PropertyPanelProps> = ({
  title,
  properties,
  onViewAllProperties,
  onViewPropertyHistory,
  onMerge,
  onClone,
  onDelete,
  onExport,
  onManageProperties,
  isAdmin = false,
  entityType
}) => {
  // Load property configuration from localStorage
  const getConfiguredProperties = () => {
    if (!entityType) return properties;
    
    try {
      // Load custom property order from propertyConfig
      const saved = localStorage.getItem(`propertyConfig_${entityType}`);
      const defaultVisibility = localStorage.getItem(`defaultPropertyVisibility_${entityType}`);
      
      if (saved) {
        const config = JSON.parse(saved);
        // Filter and reorder properties based on configuration
        const visibleKeys = config
          .filter((p: any) => p.visible)
          .sort((a: any, b: any) => a.order - b.order)
          .map((p: any) => p.key);
        
        const ordered = visibleKeys
          .map((key: string) => properties.find(p => p.key === key))
          .filter(Boolean) as Property[];
        
        // Add any properties not in config (new properties)
        const existingKeys = new Set(visibleKeys);
        const newProperties = properties.filter(p => !existingKeys.has(p.key));
        
        return [...ordered, ...newProperties];
      } else if (defaultVisibility) {
        // Apply default property visibility if available
        const visibility = JSON.parse(defaultVisibility);
        const visibilityMap = new Map(visibility.map((v: any) => [v.key, v.visible]));
        return properties.filter(p => visibilityMap.get(p.key) !== false);
      }
    } catch (error) {
      console.error('Error loading property configuration:', error);
    }
    
    return properties;
  };

  const displayProperties = getConfiguredProperties();
  const [showActionsMenu, setShowActionsMenu] = useState(false);

  return (
    <div className="p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider truncate" title={title}>{title}</h3>
        <div className="flex items-center gap-2">
          {onManageProperties && isAdmin && (
            <button
              onClick={onManageProperties}
              className="p-1.5 text-slate-400 hover:text-slate-600 transition-colors"
              title="Manage properties"
            >
              <Settings2 className="w-4 h-4" />
            </button>
          )}
          <div className="relative">
            <button
              onClick={() => setShowActionsMenu(!showActionsMenu)}
              className="p-1.5 text-slate-400 hover:text-slate-600 transition-colors"
              title="Actions"
            >
              <MoreVertical className="w-4 h-4" />
            </button>
            {showActionsMenu && (
              <>
                <div 
                  className="fixed inset-0 z-10" 
                  onClick={() => setShowActionsMenu(false)}
                />
                <div className="absolute right-0 top-full mt-1 bg-white border border-slate-200 rounded-lg shadow-lg z-20 min-w-[200px]">
                  {onViewAllProperties && (
                    <button
                      onClick={() => {
                        onViewAllProperties();
                        setShowActionsMenu(false);
                      }}
                      className="w-full text-left px-4 py-2 text-sm text-slate-700 hover:bg-slate-50 transition-colors flex items-center gap-2"
                    >
                      <Eye className="w-4 h-4" />
                      View all properties
                    </button>
                  )}
                  {onViewPropertyHistory && (
                    <button
                      onClick={() => {
                        onViewPropertyHistory();
                        setShowActionsMenu(false);
                      }}
                      className="w-full text-left px-4 py-2 text-sm text-slate-700 hover:bg-slate-50 transition-colors flex items-center gap-2"
                    >
                      <History className="w-4 h-4" />
                      View property history
                    </button>
                  )}
                  <div className="border-t border-slate-200 my-1" />
                  {onMerge && (
                    <button
                      onClick={() => {
                        onMerge();
                        setShowActionsMenu(false);
                      }}
                      className="w-full text-left px-4 py-2 text-sm text-slate-700 hover:bg-slate-50 transition-colors flex items-center gap-2"
                    >
                      <GitMerge className="w-4 h-4" />
                      Merge
                    </button>
                  )}
                  {onClone && (
                    <button
                      onClick={() => {
                        onClone();
                        setShowActionsMenu(false);
                      }}
                      className="w-full text-left px-4 py-2 text-sm text-slate-700 hover:bg-slate-50 transition-colors flex items-center gap-2"
                    >
                      <Copy className="w-4 h-4" />
                      Clone
                    </button>
                  )}
                  {onExport && (
                    <button
                      onClick={() => {
                        onExport();
                        setShowActionsMenu(false);
                      }}
                      className="w-full text-left px-4 py-2 text-sm text-slate-700 hover:bg-slate-50 transition-colors flex items-center gap-2"
                    >
                      <Download className="w-4 h-4" />
                      Export record data
                    </button>
                  )}
                  {onDelete && (
                    <>
                      <div className="border-t border-slate-200 my-1" />
                      <button
                        onClick={() => {
                          onDelete();
                          setShowActionsMenu(false);
                        }}
                        className="w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50 transition-colors flex items-center gap-2"
                      >
                        <Trash2 className="w-4 h-4" />
                        Delete
                      </button>
                    </>
                  )}
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Properties List */}
      <div className="space-y-4">
        {displayProperties.map((property) => (
          <div key={property.key} className="min-w-0">
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
              <div className="min-w-0">
                <div className="text-xs font-medium text-slate-500 mb-1 truncate" title={property.label}>{property.label}</div>
                <div className="text-sm text-slate-600 break-words">
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
  );
};

export default PropertyPanel;

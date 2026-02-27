/**
 * Phase 5: PropertyManagementModal Component
 * REQ-10 - Admin UI for managing property visibility and order
 */

import React, { useState, useEffect } from 'react';
import { X, GripVertical, Eye, EyeOff, Plus, Save, Loader2 } from 'lucide-react';
import { CustomProperty } from '../../types';
import { apiGetCustomProperties, apiCreateCustomProperty, apiUpdateCustomProperty } from '../../utils/api';

interface PropertyConfig {
  id: string;
  key: string;
  label: string;
  type: string;
  visible: boolean;
  order: number;
  isCustom?: boolean;
}

interface PropertyManagementModalProps {
  isOpen: boolean;
  onClose: () => void;
  entityType: 'contact' | 'company';
  defaultProperties: PropertyConfig[];
  onSave: (properties: PropertyConfig[]) => void;
  currentUser?: any;
}

const PropertyManagementModal: React.FC<PropertyManagementModalProps> = ({
  isOpen,
  onClose,
  entityType,
  defaultProperties,
  onSave,
  currentUser
}) => {
  const [properties, setProperties] = useState<PropertyConfig[]>(defaultProperties);
  const [customProperties, setCustomProperties] = useState<CustomProperty[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);
  const [showAddProperty, setShowAddProperty] = useState(false);
  const [newProperty, setNewProperty] = useState({
    name: '',
    key: '',
    type: 'text' as 'text' | 'number' | 'date' | 'dropdown_single' | 'checkbox' | 'url'
  });

  const isAdmin = currentUser?.role === 'Admin' || currentUser?.role === 'workspace_owner';

  useEffect(() => {
    if (isOpen && isAdmin) {
      loadCustomProperties();
    }
  }, [isOpen, entityType, isAdmin]);

  const loadCustomProperties = async () => {
    try {
      setIsLoading(true);
      const response = await apiGetCustomProperties(entityType);
      const custom = response.data || response || [];
      setCustomProperties(custom);
      
      // Merge custom properties with default properties
      const merged = [
        ...defaultProperties,
        ...custom.map((cp: CustomProperty) => ({
          id: cp.id,
          key: cp.key,
          label: cp.name,
          type: cp.type,
          visible: cp.isVisible !== false,
          order: cp.order || 999,
          isCustom: true
        }))
      ].sort((a, b) => a.order - b.order);
      
      setProperties(merged);
    } catch (error) {
      console.error('Error loading custom properties:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDragStart = (index: number) => {
    setDraggedIndex(index);
  };

  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    if (draggedIndex === null) return;

    const newProperties = [...properties];
    const draggedItem = newProperties[draggedIndex];
    newProperties.splice(draggedIndex, 1);
    newProperties.splice(index, 0, draggedItem);

    // Update order values
    newProperties.forEach((prop, idx) => {
      prop.order = idx;
    });

    setProperties(newProperties);
    setDraggedIndex(index);
  };

  const handleDragEnd = () => {
    setDraggedIndex(null);
  };

  const toggleVisibility = (index: number) => {
    const newProperties = [...properties];
    newProperties[index].visible = !newProperties[index].visible;
    setProperties(newProperties);
  };

  const handleSave = async () => {
    try {
      setIsLoading(true);
      
      // Update custom properties order and visibility
      for (const prop of properties.filter(p => p.isCustom)) {
        await apiUpdateCustomProperty(prop.id, {
          order: prop.order,
          sortOrder: prop.order, // Legacy alias
          isVisible: prop.visible
        });
      }
      
      // Update default properties visibility (store in localStorage)
      const defaultProps = properties.filter(p => !p.isCustom);
      localStorage.setItem(`defaultPropertyVisibility_${entityType}`, JSON.stringify(
        defaultProps.map(p => ({ key: p.key, visible: p.visible }))
      ));
      
      // Save configuration (could be to localStorage or backend)
      localStorage.setItem(`propertyConfig_${entityType}`, JSON.stringify(properties));
      
      onSave(properties);
      onClose();
    } catch (error) {
      console.error('Error saving property configuration:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleAddProperty = async () => {
    if (!newProperty.name.trim() || !newProperty.key.trim()) return;

    try {
      setIsLoading(true);
      const slug = newProperty.key.toLowerCase().replace(/\s+/g, '_');
      await apiCreateCustomProperty({
        name: newProperty.name,
        key: slug,
        entityType: entityType,
        type: newProperty.type,
        order: properties.length,
        isVisible: true
      });
      
      await loadCustomProperties();
      setShowAddProperty(false);
      setNewProperty({ name: '', key: '', type: 'text' });
    } catch (error: any) {
      console.error('Error creating custom property:', error);
      alert(error.message || 'Failed to create property');
    } finally {
      setIsLoading(false);
    }
  };

  if (!isOpen || !isAdmin) return null;

  return (
    <>
      {/* Backdrop */}
      <div 
        className="fixed inset-0 bg-black/50 z-50 transition-opacity"
        onClick={onClose}
      />
      
      {/* Modal */}
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl max-h-[80vh] flex flex-col">
          {/* Header */}
          <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between">
            <h2 className="text-lg font-bold text-slate-900">
              Manage Properties - {entityType === 'contact' ? 'Contacts' : 'Companies'}
            </h2>
            <button
              onClick={onClose}
              className="p-2 text-slate-400 hover:text-slate-600 transition-colors"
              aria-label="Close modal"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Content */}
          <div className="flex-1 overflow-y-auto px-6 py-4">
            {isLoading && properties.length === 0 ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="w-6 h-6 animate-spin text-indigo-600" />
              </div>
            ) : (
              <div className="space-y-2">
                <p className="text-sm text-slate-600 mb-4">
                  Drag to reorder properties. Toggle visibility to show/hide in the left sidebar.
                </p>
                
                {properties.map((prop, index) => (
                  <div
                    key={prop.id}
                    draggable
                    onDragStart={() => handleDragStart(index)}
                    onDragOver={(e) => handleDragOver(e, index)}
                    onDragEnd={handleDragEnd}
                    className={`flex items-center gap-3 p-3 rounded-lg border transition-colors ${
                      draggedIndex === index ? 'border-indigo-500 bg-indigo-50' : 'border-slate-200 hover:bg-slate-50'
                    }`}
                  >
                    <GripVertical className="w-5 h-5 text-slate-400 cursor-move" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-slate-900">{prop.label}</p>
                      <p className="text-xs text-slate-500">{prop.key} • {prop.type}</p>
                    </div>
                    <button
                      onClick={() => toggleVisibility(index)}
                      className={`p-2 rounded-lg transition-colors ${
                        prop.visible 
                          ? 'text-indigo-600 bg-indigo-50' 
                          : 'text-slate-400 bg-slate-50'
                      }`}
                      aria-label={prop.visible ? 'Hide property' : 'Show property'}
                    >
                      {prop.visible ? (
                        <Eye className="w-4 h-4" />
                      ) : (
                        <EyeOff className="w-4 h-4" />
                      )}
                    </button>
                  </div>
                ))}
              </div>
            )}

            {/* Add Property Form */}
            {showAddProperty && (
              <div className="mt-6 p-4 bg-slate-50 rounded-lg border border-slate-200">
                <h3 className="text-sm font-semibold text-slate-900 mb-3">Add Custom Property</h3>
                <div className="space-y-3">
                  <input
                    type="text"
                    placeholder="Property Name"
                    value={newProperty.name}
                    onChange={(e) => setNewProperty({ ...newProperty, name: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-200"
                  />
                  <input
                    type="text"
                    placeholder="Property Key (slug)"
                    value={newProperty.key}
                    onChange={(e) => setNewProperty({ ...newProperty, key: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-200"
                  />
                  <select
                    value={newProperty.type}
                    onChange={(e) => setNewProperty({ ...newProperty, type: e.target.value as any })}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-200"
                  >
                    <option value="text">Text</option>
                    <option value="number">Number</option>
                    <option value="date">Date</option>
                    <option value="dropdown_single">Dropdown</option>
                    <option value="checkbox">Checkbox</option>
                    <option value="url">URL</option>
                  </select>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={handleAddProperty}
                      disabled={isLoading || !newProperty.name.trim() || !newProperty.key.trim()}
                      className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      Add Property
                    </button>
                    <button
                      onClick={() => {
                        setShowAddProperty(false);
                        setNewProperty({ name: '', key: '', type: 'text' });
                      }}
                      className="px-4 py-2 text-sm font-medium text-slate-700 bg-white border border-slate-200 rounded-lg hover:bg-slate-50"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="px-6 py-4 border-t border-slate-200 flex items-center justify-between">
            <button
              onClick={() => setShowAddProperty(!showAddProperty)}
              className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-indigo-600 hover:text-indigo-700"
            >
              <Plus className="w-4 h-4" />
              Add Custom Property
            </button>
            <div className="flex items-center gap-3">
              <button
                onClick={onClose}
                className="px-4 py-2 text-sm font-medium text-slate-700 bg-white border border-slate-200 rounded-lg hover:bg-slate-50"
              >
                Cancel
              </button>
              <button
                onClick={handleSave}
                disabled={isLoading}
                className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 disabled:opacity-50"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Saving...
                  </>
                ) : (
                  <>
                    <Save className="w-4 h-4" />
                    Save Changes
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default PropertyManagementModal;

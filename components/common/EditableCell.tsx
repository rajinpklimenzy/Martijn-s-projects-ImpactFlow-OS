/**
 * @license
 * Copyright 2025 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 *
 * EditableCell Component - Phase 8.1
 * Provides inline editing for table cells
 */

import React, { useState, useRef, useEffect, useCallback } from 'react';
import { CheckCircle2, X, Loader2 } from 'lucide-react';

interface EditableCellProps {
  value: string | number | null | undefined;
  onSave: (newValue: any) => Promise<void>;
  type?: 'text' | 'number' | 'email' | 'tel' | 'select' | 'tags' | 'assignee';
  options?: { value: string; label: string }[];
  placeholder?: string;
  disabled?: boolean;
  className?: string;
  displayValue?: string; // For display when not editing
  TagPicker?: React.ComponentType<any>; // TagPicker component
  UserPicker?: React.ComponentType<any>; // UserPicker component
  tags?: string[];
  assigneeId?: string;
  users?: Array<{ id: string; name: string }>;
  tagsMap?: Map<string, { name: string; color: string }>;
}

const EditableCell: React.FC<EditableCellProps> = ({
  value,
  onSave,
  type = 'text',
  options = [],
  placeholder = '',
  disabled = false,
  className = '',
  displayValue,
  TagPicker,
  UserPicker,
  tags = [],
  assigneeId,
  users = [],
  tagsMap
}) => {
  const [isEditing, setIsEditing] = useState(false);
  const [editValue, setEditValue] = useState(value || '');
  const [isSaving, setIsSaving] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const inputRef = useRef<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>(null);
  const cellRef = useRef<HTMLDivElement>(null);
  const initialSelectValueRef = useRef<string | null>(null); // Track initial select value to prevent false onChange

  // Define handleSave BEFORE useEffect that uses it
  const handleSave = useCallback(async () => {
    if (isSaving) return;
    
    // Get current values at save time
    const currentEditValue = editValue;
    const currentValue = value;
    
    // Don't save if value hasn't changed
    const normalizedEditValue = currentEditValue === '' ? null : currentEditValue;
    const normalizedValue = currentValue === '' ? null : currentValue;
    
    if (normalizedEditValue === normalizedValue) {
      setIsEditing(false);
      return;
    }

    setIsSaving(true);
    try {
      await onSave(normalizedEditValue);
      setIsEditing(false);
      setShowSuccess(true);
      setTimeout(() => setShowSuccess(false), 2000);
    } catch (error) {
      console.error('Error saving cell:', error);
      // Keep editing mode on error so user can retry
      setIsSaving(false);
    }
  }, [isSaving, editValue, value, onSave]);

  const handleCancel = useCallback(() => {
    setEditValue(value || '');
    setIsEditing(false);
  }, [value]);

  const handleStartEdit = (e: React.MouseEvent) => {
    if (disabled) return;
    e.stopPropagation(); // Prevent row click from firing
    const initialValue = value || '';
    setEditValue(initialValue);
    initialSelectValueRef.current = initialValue; // Store initial value for select
    setIsEditing(true);
  };

  useEffect(() => {
    if (isEditing && inputRef.current) {
      // Small delay to ensure DOM is ready
      setTimeout(() => {
        if (inputRef.current) {
          inputRef.current.focus();
          if (type === 'text' || type === 'email' || type === 'tel') {
            (inputRef.current as HTMLInputElement).select();
          }
        }
      }, 10);
    }
  }, [isEditing, type]);
  
  // Update editValue when value prop changes (from external updates)
  useEffect(() => {
    if (!isEditing) {
      setEditValue(value || '');
    }
  }, [value, isEditing]);

  useEffect(() => {
    if (!isEditing) return;
    
    let saveTimeout: NodeJS.Timeout;
    
    const handleClickOutside = (event: MouseEvent) => {
      if (cellRef.current && !cellRef.current.contains(event.target as Node)) {
        // Don't save if clicking on buttons or other interactive elements
        const target = event.target as HTMLElement;
        if (!target.closest('button') && !target.closest('input') && !target.closest('select') && !target.closest('.editable-cell-actions')) {
          clearTimeout(saveTimeout);
          saveTimeout = setTimeout(() => {
            if (isEditing && !isSaving) {
              handleSave();
            }
          }, 150);
        }
      }
    };

    // Use mousedown instead of click to catch it before blur
    const timeoutId = setTimeout(() => {
      document.addEventListener('mousedown', handleClickOutside, true);
    }, 100);
    
    return () => {
      clearTimeout(timeoutId);
      clearTimeout(saveTimeout);
      document.removeEventListener('mousedown', handleClickOutside, true);
    };
  }, [isEditing, isSaving, handleSave]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSave();
    } else if (e.key === 'Escape') {
      e.preventDefault();
      handleCancel();
    }
  };

  // Display value
  const displayText = displayValue !== undefined ? displayValue : (value || '-');

  if (disabled) {
    return (
      <div className={`text-sm text-slate-600 ${className}`}>
        {displayText}
      </div>
    );
  }

  if (isEditing) {
    // Render appropriate input based on type
    if (type === 'select' && options.length > 0) {
      return (
        <div ref={cellRef} className="relative" onClick={(e) => e.stopPropagation()}>
          <select
            ref={inputRef as React.RefObject<HTMLSelectElement>}
            value={editValue as string}
            onChange={(e) => {
              const newValue = e.target.value;
              const initialValue = initialSelectValueRef.current || '';
              
              // Normalize values for comparison
              const normalizedNewValue = newValue === '' ? null : newValue;
              const normalizedInitialValue = initialValue === '' ? null : initialValue;
              
              // Update editValue immediately for UI responsiveness
              setEditValue(newValue);
              
              // Only save if value actually changed from initial value
              if (normalizedNewValue !== normalizedInitialValue && !isSaving) {
                // Auto-save on change for select dropdowns (better UX)
                setTimeout(async () => {
                  if (!isSaving) {
                    setIsSaving(true);
                    try {
                      await onSave(normalizedNewValue);
                      initialSelectValueRef.current = newValue; // Update initial value after successful save
                      setIsEditing(false);
                      setShowSuccess(true);
                      setTimeout(() => setShowSuccess(false), 2000);
                    } catch (error) {
                      console.error('Error saving cell:', error);
                      // Revert to initial value on error
                      setEditValue(initialValue);
                      setIsSaving(false);
                    }
                  }
                }, 100);
              }
            }}
            onKeyDown={handleKeyDown}
            onClick={(e) => e.stopPropagation()}
            onBlur={(e) => {
              // Don't auto-save on blur for select - onChange handles it
              // Just close if clicking outside and value hasn't changed
              const relatedTarget = e.relatedTarget as HTMLElement;
              if (!relatedTarget || (!relatedTarget.closest('select') && !relatedTarget.closest('option'))) {
                setTimeout(() => {
                  if (isEditing && !isSaving) {
                    // Check if value changed from initial
                    const normalizedEditValue = editValue === '' ? null : editValue;
                    const normalizedInitialValue = (initialSelectValueRef.current === '' || initialSelectValueRef.current === null) ? null : initialSelectValueRef.current;
                    if (normalizedEditValue === normalizedInitialValue) {
                      setIsEditing(false);
                    }
                  }
                }, 200);
              }
            }}
            className={`text-sm border-2 border-indigo-500 rounded-lg px-2 py-1 pr-8 focus:outline-none focus:ring-2 focus:ring-indigo-200 ${className}`}
            disabled={isSaving}
            autoFocus
          >
            {options.map(opt => (
              <option key={opt.value} value={opt.value}>{opt.label}</option>
            ))}
          </select>
          {isSaving && (
            <div className="absolute right-2 top-1/2 -translate-y-1/2">
              <Loader2 className="w-3 h-3 animate-spin text-indigo-600" />
            </div>
          )}
        </div>
      );
    }

    if (type === 'tags' && TagPicker) {
      return (
        <div ref={cellRef} className="relative">
          <TagPicker
            selectedTags={tags}
            onTagsChange={(newTags: string[]) => setEditValue(newTags)}
            onSave={handleSave}
            onCancel={handleCancel}
          />
        </div>
      );
    }

    if (type === 'assignee' && UserPicker) {
      return (
        <div ref={cellRef} className="relative">
          <UserPicker
            selectedUserId={assigneeId}
            users={users}
            onUserChange={(userId: string | null) => setEditValue(userId)}
            onSave={handleSave}
            onCancel={handleCancel}
          />
        </div>
      );
    }

    // Default text input
    return (
      <div ref={cellRef} className="relative" onClick={(e) => e.stopPropagation()}>
        <input
          ref={inputRef as React.RefObject<HTMLInputElement>}
          type={type === 'number' ? 'number' : type === 'email' ? 'email' : type === 'tel' ? 'tel' : 'text'}
          value={editValue as string}
          onChange={(e) => setEditValue(e.target.value)}
          onKeyDown={handleKeyDown}
          onBlur={(e) => {
            // Only save on blur if not clicking on a button or the save/cancel buttons
            const relatedTarget = e.relatedTarget as HTMLElement;
            if (!relatedTarget || (!relatedTarget.closest('button') && !relatedTarget.closest('.editable-cell-actions'))) {
              // Delay to check if click outside handler will handle it
              setTimeout(() => {
                if (isEditing && !isSaving) {
                  handleSave();
                }
              }, 150);
            }
          }}
          onClick={(e) => e.stopPropagation()}
          placeholder={placeholder}
          className={`text-sm border-2 border-indigo-500 rounded-lg px-2 py-1 focus:outline-none focus:ring-2 focus:ring-indigo-200 ${className}`}
          disabled={isSaving}
        />
        {isSaving && (
          <div className="absolute right-2 top-1/2 -translate-y-1/2">
            <Loader2 className="w-3 h-3 animate-spin text-indigo-600" />
          </div>
        )}
      </div>
    );
  }

  // Display mode with hover effect
  return (
    <div
      onClick={handleStartEdit}
      onMouseDown={(e) => e.stopPropagation()} // Prevent row click
      className={`text-sm text-slate-600 cursor-pointer hover:bg-indigo-50 rounded px-2 py-1 transition-colors group relative ${className}`}
      title="Click to edit"
    >
      {showSuccess && (
        <div className="absolute -top-1 -right-1 animate-in zoom-in duration-200">
          <CheckCircle2 className="w-4 h-4 text-green-500" />
        </div>
      )}
      {displayText}
      <span className="opacity-0 group-hover:opacity-100 ml-2 text-xs text-indigo-500">✎</span>
    </div>
  );
};

export default EditableCell;

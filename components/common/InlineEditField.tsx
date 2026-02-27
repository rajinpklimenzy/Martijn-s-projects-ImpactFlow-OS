/**
 * Phase 2: InlineEditField Component
 * REQ-03, 5.5, 5.6 - Enhanced inline editing with more field types
 */

import React, { useState, useRef, useEffect, useCallback } from 'react';
import { CheckCircle2, X, Loader2, Edit2, AlertCircle } from 'lucide-react';

export type InlineEditFieldType = 
  | 'text' 
  | 'email' 
  | 'url' 
  | 'phone' 
  | 'dropdown' 
  | 'multi-select' 
  | 'date' 
  | 'number' 
  | 'textarea' 
  | 'boolean' 
  | 'calculated';

interface InlineEditFieldProps {
  value: string | number | boolean | string[] | null | undefined;
  onSave: (newValue: any) => Promise<void>;
  type?: InlineEditFieldType;
  options?: { value: string; label: string }[];
  placeholder?: string;
  disabled?: boolean;
  className?: string;
  displayValue?: string;
  label?: string;
  error?: string;
  // For calculated fields
  calculatedValue?: string;
}

const InlineEditField: React.FC<InlineEditFieldProps> = ({
  value,
  onSave,
  type = 'text',
  options = [],
  placeholder = '',
  disabled = false,
  className = '',
  displayValue,
  label,
  error,
  calculatedValue
}) => {
  const [isEditing, setIsEditing] = useState(false);
  const [editValue, setEditValue] = useState(value || '');
  const [isSaving, setIsSaving] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement | null>(null);
  const fieldRef = useRef<HTMLDivElement>(null);

  // Calculated fields are read-only
  const isReadOnly = type === 'calculated' || disabled;

  const handleSave = useCallback(async () => {
    if (isSaving || isReadOnly) return;
    
    const normalizedEditValue = editValue === '' ? null : editValue;
    const normalizedValue = value === '' ? null : value;
    
    if (normalizedEditValue === normalizedValue) {
      setIsEditing(false);
      return;
    }

    setIsSaving(true);
    setSaveError(null);
    try {
      await onSave(normalizedEditValue);
      setIsSaving(false);
      setIsEditing(false);
      setShowSuccess(true);
      setTimeout(() => setShowSuccess(false), 2000);
    } catch (err: any) {
      console.error('Error saving field:', err);
      setSaveError(err.message || 'Failed to save');
      setIsSaving(false);
    }
  }, [isSaving, editValue, value, onSave, isReadOnly]);

  const handleCancel = useCallback(() => {
    setEditValue(value || '');
    setIsEditing(false);
    setSaveError(null);
  }, [value]);

  const handleStartEdit = (e: React.MouseEvent) => {
    if (isReadOnly) return;
    e.stopPropagation();
    setEditValue(value || '');
    setIsEditing(true);
    setSaveError(null);
  };

  useEffect(() => {
    if (isEditing && inputRef.current && !isReadOnly) {
      setTimeout(() => {
        if (inputRef.current) {
          inputRef.current.focus();
          if (type === 'text' || type === 'email' || type === 'url' || type === 'phone') {
            (inputRef.current as HTMLInputElement).select();
          }
        }
      }, 10);
    }
  }, [isEditing, type, isReadOnly]);

  useEffect(() => {
    if (!isEditing) {
      setEditValue(value || '');
    }
  }, [value, isEditing]);

  useEffect(() => {
    if (!isEditing) return;
    
    const handleClickOutside = (event: MouseEvent) => {
      if (fieldRef.current && !fieldRef.current.contains(event.target as Node)) {
        const target = event.target as HTMLElement;
        if (!target.closest('button') && !target.closest('input') && !target.closest('select') && !target.closest('textarea')) {
          handleSave();
        }
      }
    };

    const timeoutId = setTimeout(() => {
      document.addEventListener('mousedown', handleClickOutside, true);
    }, 100);
    
    return () => {
      clearTimeout(timeoutId);
      document.removeEventListener('mousedown', handleClickOutside, true);
    };
  }, [isEditing, handleSave]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey && type !== 'textarea') {
      e.preventDefault();
      handleSave();
    } else if (e.key === 'Escape') {
      e.preventDefault();
      handleCancel();
    }
  };

  // Display value
  const getDisplayText = () => {
    if (calculatedValue !== undefined) return calculatedValue;
    if (displayValue !== undefined) return displayValue;
    if (value === null || value === undefined || value === '') return '--';
    if (type === 'boolean') return value ? 'Yes' : 'No';
    if (Array.isArray(value)) return value.join(', ');
    return String(value);
  };

  const displayText = getDisplayText();

  if (isReadOnly) {
    return (
      <div className={`text-sm text-slate-600 ${className}`}>
        {label && <div className="text-xs font-medium text-slate-500 mb-1">{label}</div>}
        <div>{displayText}</div>
      </div>
    );
  }

  if (isEditing) {
    // Render appropriate input based on type
    if (type === 'dropdown' && options.length > 0) {
      return (
        <div ref={fieldRef} className="relative">
          {label && <div className="text-xs font-medium text-slate-500 mb-1">{label}</div>}
          <select
            ref={inputRef as React.RefObject<HTMLSelectElement>}
            value={editValue as string}
            onChange={(e) => setEditValue(e.target.value)}
            onKeyDown={handleKeyDown}
            onClick={(e) => e.stopPropagation()}
            className={`text-sm border-2 ${saveError ? 'border-red-500' : 'border-indigo-500'} rounded-lg px-2 py-1 pr-8 focus:outline-none focus:ring-2 focus:ring-indigo-200 w-full ${className}`}
            disabled={isSaving}
            autoFocus
          >
            {options.map(opt => (
              <option key={opt.value} value={opt.value}>{opt.label}</option>
            ))}
          </select>
          {isSaving && (
            <div className="absolute right-2 top-1/2 -translate-y-1/2">
              <Loader2 className="w-4 h-4 animate-spin text-indigo-600" />
            </div>
          )}
          {saveError && (
            <div className="mt-1 text-xs text-red-600 flex items-center gap-1">
              <AlertCircle className="w-3 h-3" />
              {saveError}
            </div>
          )}
        </div>
      );
    }

    if (type === 'boolean') {
      return (
        <div ref={fieldRef} className="relative">
          {label && <div className="text-xs font-medium text-slate-500 mb-1">{label}</div>}
          <select
            ref={inputRef as React.RefObject<HTMLSelectElement>}
            value={editValue ? 'true' : 'false'}
            onChange={(e) => setEditValue(e.target.value === 'true')}
            onKeyDown={handleKeyDown}
            className={`text-sm border-2 ${saveError ? 'border-red-500' : 'border-indigo-500'} rounded-lg px-2 py-1 focus:outline-none focus:ring-2 focus:ring-indigo-200 w-full ${className}`}
            disabled={isSaving}
            autoFocus
          >
            <option value="true">Yes</option>
            <option value="false">No</option>
          </select>
          {isSaving && (
            <div className="absolute right-2 top-1/2 -translate-y-1/2">
              <Loader2 className="w-4 h-4 animate-spin text-indigo-600" />
            </div>
          )}
          {saveError && (
            <div className="mt-1 text-xs text-red-600 flex items-center gap-1">
              <AlertCircle className="w-3 h-3" />
              {saveError}
            </div>
          )}
        </div>
      );
    }

    if (type === 'textarea') {
      return (
        <div ref={fieldRef} className="relative">
          {label && <div className="text-xs font-medium text-slate-500 mb-1">{label}</div>}
          <textarea
            ref={inputRef as React.RefObject<HTMLTextAreaElement>}
            value={editValue as string}
            onChange={(e) => setEditValue(e.target.value)}
            onKeyDown={handleKeyDown}
            onClick={(e) => e.stopPropagation()}
            placeholder={placeholder}
            className={`text-sm border-2 ${saveError ? 'border-red-500' : 'border-indigo-500'} rounded-lg px-2 py-1 focus:outline-none focus:ring-2 focus:ring-indigo-200 w-full min-h-[80px] ${className}`}
            disabled={isSaving}
            autoFocus
          />
          {isSaving && (
            <div className="absolute right-2 top-2">
              <Loader2 className="w-4 h-4 animate-spin text-indigo-600" />
            </div>
          )}
          {saveError && (
            <div className="mt-1 text-xs text-red-600 flex items-center gap-1">
              <AlertCircle className="w-3 h-3" />
              {saveError}
            </div>
          )}
        </div>
      );
    }

    // Default text/email/url/phone/number input
    return (
      <div ref={fieldRef} className="relative">
        {label && <div className="text-xs font-medium text-slate-500 mb-1">{label}</div>}
        <input
          ref={inputRef as React.RefObject<HTMLInputElement>}
          type={
            type === 'number' ? 'number' :
            type === 'email' ? 'email' :
            type === 'url' ? 'url' :
            type === 'phone' ? 'tel' :
            'text'
          }
          value={editValue as string}
          onChange={(e) => setEditValue(e.target.value)}
          onKeyDown={handleKeyDown}
          onBlur={(e) => {
            const relatedTarget = e.relatedTarget as HTMLElement;
            if (!relatedTarget || (!relatedTarget.closest('button'))) {
              setTimeout(() => {
                if (isEditing && !isSaving) {
                  handleSave();
                }
              }, 150);
            }
          }}
          onClick={(e) => e.stopPropagation()}
          placeholder={placeholder}
          className={`text-sm border-2 ${saveError ? 'border-red-500' : 'border-indigo-500'} rounded-lg px-2 py-1 focus:outline-none focus:ring-2 focus:ring-indigo-200 w-full ${className}`}
          disabled={isSaving}
        />
        {isSaving && (
          <div className="absolute right-2 top-1/2 -translate-y-1/2">
            <Loader2 className="w-4 h-4 animate-spin text-indigo-600" />
          </div>
        )}
        {saveError && (
          <div className="mt-1 text-xs text-red-600 flex items-center gap-1">
            <AlertCircle className="w-3 h-3" />
            {saveError}
          </div>
        )}
      </div>
    );
  }

  // Display mode with hover effect
  return (
    <div className={className}>
      {label && (
        <label className="text-xs font-medium text-slate-500 mb-1" htmlFor={`field-${label}`}>
          {label}
        </label>
      )}
      <div
        onClick={handleStartEdit}
        onMouseDown={(e) => e.stopPropagation()}
        role="button"
        tabIndex={0}
        aria-label={`Edit ${label || 'field'}`}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            handleStartEdit(e as any);
          }
        }}
        className={`text-sm text-slate-600 cursor-pointer hover:bg-indigo-50 rounded px-2 py-1 transition-colors group relative min-h-[24px] flex items-center focus:outline-none focus:ring-2 focus:ring-indigo-200 ${error ? 'border border-red-200 bg-red-50' : ''}`}
        title={error || "Click to edit"}
      >
        {showSuccess && (
          <div className="absolute -top-1 -right-1 animate-in zoom-in duration-200">
            <CheckCircle2 className="w-4 h-4 text-green-500" />
          </div>
        )}
        <span className="flex-1">{displayText}</span>
        <Edit2 className="w-3 h-3 text-slate-400 opacity-0 group-hover:opacity-100 transition-opacity ml-2" />
        {error && (
          <>
            <AlertCircle className="w-3 h-3 text-red-500 ml-1" aria-label="Error" />
            <span className="sr-only">{error}</span>
          </>
        )}
      </div>
      {error && (
        <div className="mt-1 text-xs text-red-600" role="alert" aria-live="polite">
          {error}
        </div>
      )}
    </div>
  );
};

export default InlineEditField;

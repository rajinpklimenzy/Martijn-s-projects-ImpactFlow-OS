/**
 * Phase 2: RecordHeader Component
 * REQ-02 - Header with avatar, name, subtitle, and status badge
 */

import React from 'react';
import { ImageWithFallback } from '../common';
import InlineEditField from './InlineEditField';
import { formatNameForDisplay } from '../../utils/validate';

interface RecordHeaderProps {
  name: string;
  avatar?: string;
  subtitle?: string;
  subtitleType?: 'email' | 'industry' | 'text';
  statusBadge?: { label: string; color: string };
  onNameSave?: (newName: string) => Promise<void>;
  disabled?: boolean;
}

const RecordHeader: React.FC<RecordHeaderProps> = ({
  name,
  avatar,
  subtitle,
  subtitleType = 'text',
  statusBadge,
  onNameSave,
  disabled = false
}) => {
  const getInitials = (name: string) => {
    const parts = name.trim().split(/\s+/);
    if (parts.length >= 2) {
      return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
    }
    return name.substring(0, 2).toUpperCase();
  };

  const renderSubtitle = () => {
    if (!subtitle) return null;
    
    if (subtitleType === 'email') {
      return (
        <a 
          href={`mailto:${subtitle}`}
          className="text-sm text-slate-600 hover:text-indigo-600 transition-colors"
          onClick={(e) => e.stopPropagation()}
        >
          {subtitle}
        </a>
      );
    }
    
    return (
      <p className="text-sm text-slate-600">{subtitle}</p>
    );
  };

  return (
    <div className="p-6 border-b border-slate-200">
      <div className="flex items-start gap-4">
        {/* Avatar */}
        <div className="shrink-0">
          {avatar ? (
            <ImageWithFallback
              src={avatar}
              fallbackText={name}
              className="w-12 h-12 rounded-full border-2 border-slate-200"
              isAvatar={true}
            />
          ) : (
            <div className="w-12 h-12 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-600 font-bold text-lg border-2 border-slate-200">
              {getInitials(name || '?')}
            </div>
          )}
        </div>

        {/* Name and Subtitle */}
        <div className="flex-1 min-w-0">
          {onNameSave && !disabled ? (
            <InlineEditField
              value={name}
              onSave={onNameSave}
              type="text"
              className="text-lg font-bold"
            />
          ) : (
            <h1 className="text-lg font-bold text-slate-900 truncate">{formatNameForDisplay(name) || 'Unnamed'}</h1>
          )}
          {renderSubtitle()}
          {statusBadge && (
            <div className="mt-2">
              <span 
                className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold"
                style={{ 
                  backgroundColor: `${statusBadge.color}20`,
                  color: statusBadge.color,
                  border: `1px solid ${statusBadge.color}40`
                }}
              >
                {statusBadge.label}
              </span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default RecordHeader;

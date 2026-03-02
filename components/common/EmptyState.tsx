/**
 * Reusable empty state: illustration/icon, heading, description, CTA.
 * Used across Products & Services, NPS, Shared Inbox, etc.
 */

import React from 'react';

interface EmptyStateProps {
  icon?: React.ReactNode;
  heading: string;
  description: string;
  ctaLabel?: string;
  onCtaClick?: () => void;
  className?: string;
}

const EmptyState: React.FC<EmptyStateProps> = ({
  icon,
  heading,
  description,
  ctaLabel,
  onCtaClick,
  className = '',
}) => {
  return (
    <div className={`bg-white rounded-xl border border-slate-200 p-8 sm:p-12 flex flex-col items-center justify-center min-h-[280px] text-center ${className}`}>
      {icon && (
        <div className="w-16 h-16 bg-slate-50 rounded-2xl flex items-center justify-center mb-5 text-slate-500">
          {icon}
        </div>
      )}
      <h2 className="text-lg font-semibold text-slate-800 mb-2">{heading}</h2>
      <p className="text-slate-500 text-sm max-w-md mb-6">{description}</p>
      {ctaLabel && onCtaClick && (
        <button
          type="button"
          onClick={onCtaClick}
          className="px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium rounded-lg transition-colors"
        >
          {ctaLabel}
        </button>
      )}
    </div>
  );
};

export default EmptyState;

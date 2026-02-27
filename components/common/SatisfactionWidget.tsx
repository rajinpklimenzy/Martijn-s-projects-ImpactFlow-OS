/**
 * Phase 4: SatisfactionWidget Component
 * REQ-07 - NPS summary widget for right sidebar
 */

import React from 'react';
import { Star, TrendingUp, TrendingDown, Minus } from 'lucide-react';

interface SatisfactionWidgetProps {
  npsScore?: number | null;
  npsCategory?: 'Promoter' | 'Passive' | 'Detractor' | null;
  latestResponseDate?: string | null;
  onViewDetails?: () => void;
}

const SatisfactionWidget: React.FC<SatisfactionWidgetProps> = ({
  npsScore,
  npsCategory,
  latestResponseDate,
  onViewDetails
}) => {
  const getScoreColor = (score?: number | null) => {
    if (score === null || score === undefined) return 'text-slate-400';
    if (score >= 9) return 'text-green-600';
    if (score >= 7) return 'text-amber-600';
    return 'text-red-600';
  };

  const getCategoryColor = (category?: string | null) => {
    if (!category) return 'bg-slate-100 text-slate-700';
    if (category === 'Promoter') return 'bg-green-100 text-green-700';
    if (category === 'Passive') return 'bg-amber-100 text-amber-700';
    return 'bg-red-100 text-red-700';
  };

  const getTrendIcon = (score?: number | null) => {
    if (score === null || score === undefined) return null;
    if (score >= 9) return <TrendingUp className="w-4 h-4 text-green-600" />;
    if (score >= 7) return <Minus className="w-4 h-4 text-amber-600" />;
    return <TrendingDown className="w-4 h-4 text-red-600" />;
  };

  return (
    <div className="border-b border-slate-200 last:border-0">
      <div className="px-4 py-3">
        <div className="flex items-center gap-2 mb-3">
          <Star className="w-4 h-4 text-slate-400" />
          <h3 className="text-sm font-semibold text-slate-900">Client Satisfaction</h3>
        </div>
        
        {npsScore !== null && npsScore !== undefined ? (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-slate-500 uppercase tracking-wider">
                NPS Score
              </span>
              {getTrendIcon(npsScore)}
            </div>
            <div className="flex items-center gap-3">
              <span className={`text-3xl font-black ${getScoreColor(npsScore)}`}>
                {npsScore}
              </span>
              {npsCategory && (
                <span className={`px-2 py-1 rounded-full text-[10px] font-bold uppercase ${getCategoryColor(npsCategory)}`}>
                  {npsCategory}
                </span>
              )}
            </div>
            {latestResponseDate && (
              <p className="text-xs text-slate-500">
                Last response: {new Date(latestResponseDate).toLocaleDateString()}
              </p>
            )}
            {onViewDetails && (
              <button
                onClick={onViewDetails}
                className="w-full mt-3 px-3 py-2 text-xs font-medium text-indigo-600 bg-indigo-50 hover:bg-indigo-100 rounded-lg transition-colors"
              >
                View Details
              </button>
            )}
          </div>
        ) : (
          <div className="py-4 text-center">
            <p className="text-sm text-slate-400 mb-3">No NPS score yet</p>
            {onViewDetails && (
              <button
                onClick={onViewDetails}
                className="px-3 py-2 text-xs font-medium text-indigo-600 bg-indigo-50 hover:bg-indigo-100 rounded-lg transition-colors"
              >
                Send Survey
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default SatisfactionWidget;

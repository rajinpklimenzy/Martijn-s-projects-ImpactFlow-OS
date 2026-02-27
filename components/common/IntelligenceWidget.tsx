/**
 * Phase 4: IntelligenceWidget Component
 * REQ-07 - Social signals and intelligence widget for right sidebar
 */

import React from 'react';
import { Sparkles, TrendingUp, Briefcase, Newspaper, DollarSign, Loader2 } from 'lucide-react';

export interface SocialSignal {
  id: string;
  type: 'funding' | 'hiring' | 'acquisition' | 'news';
  title: string;
  date: string;
  description?: string;
  isAiGenerated?: boolean;
}

interface IntelligenceWidgetProps {
  signals?: SocialSignal[];
  isLoading?: boolean;
  onExecuteScan?: () => void;
  onViewAll?: () => void;
}

const IntelligenceWidget: React.FC<IntelligenceWidgetProps> = ({
  signals = [],
  isLoading = false,
  onExecuteScan,
  onViewAll
}) => {
  const getSignalIcon = (type: string) => {
    switch (type) {
      case 'funding':
        return <DollarSign className="w-4 h-4" />;
      case 'hiring':
        return <Briefcase className="w-4 h-4" />;
      case 'acquisition':
        return <TrendingUp className="w-4 h-4" />;
      case 'news':
        return <Newspaper className="w-4 h-4" />;
      default:
        return <Sparkles className="w-4 h-4" />;
    }
  };

  const getSignalColor = (type: string) => {
    switch (type) {
      case 'funding':
        return 'bg-green-100 text-green-700';
      case 'hiring':
        return 'bg-blue-100 text-blue-700';
      case 'acquisition':
        return 'bg-purple-100 text-purple-700';
      case 'news':
        return 'bg-amber-100 text-amber-700';
      default:
        return 'bg-slate-100 text-slate-700';
    }
  };

  const displaySignals = signals.slice(0, 3);

  return (
    <div className="border-b border-slate-200 last:border-0">
      <div className="px-4 py-3">
        <div className="flex items-center gap-2 mb-3">
          <Sparkles className="w-4 h-4 text-slate-400" />
          <h3 className="text-sm font-semibold text-slate-900">Intelligence</h3>
        </div>
        
        {isLoading ? (
          <div className="py-4 flex items-center justify-center">
            <Loader2 className="w-5 h-5 animate-spin text-indigo-600" />
          </div>
        ) : displaySignals.length === 0 ? (
          <div className="py-4 text-center">
            <p className="text-sm text-slate-400 mb-3">No signals found</p>
            {onExecuteScan && (
              <button
                onClick={onExecuteScan}
                className="px-3 py-2 text-xs font-medium text-indigo-600 bg-indigo-50 hover:bg-indigo-100 rounded-lg transition-colors"
              >
                Execute Scan
              </button>
            )}
          </div>
        ) : (
          <div className="space-y-3">
            {displaySignals.map((signal) => (
              <div
                key={signal.id}
                className="p-3 bg-slate-50 rounded-lg border border-slate-200"
              >
                <div className="flex items-start gap-2 mb-2">
                  <div className={`p-1.5 rounded ${getSignalColor(signal.type)}`}>
                    {getSignalIcon(signal.type)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-slate-900 line-clamp-2">
                      {signal.title}
                    </p>
                    <p className="text-xs text-slate-500 mt-1">
                      {new Date(signal.date).toLocaleDateString()}
                    </p>
                  </div>
                </div>
                {signal.description && (
                  <p className="text-xs text-slate-600 line-clamp-2 mt-2">
                    {signal.description}
                  </p>
                )}
                {signal.isAiGenerated && (
                  <span className="inline-block mt-2 px-2 py-0.5 text-[10px] font-medium bg-indigo-100 text-indigo-700 rounded">
                    AI Generated
                  </span>
                )}
              </div>
            ))}
            {signals.length > 3 && onViewAll && (
              <button
                onClick={onViewAll}
                className="w-full mt-2 px-3 py-2 text-xs font-medium text-indigo-600 bg-indigo-50 hover:bg-indigo-100 rounded-lg transition-colors"
              >
                View All ({signals.length})
              </button>
            )}
            {onExecuteScan && (
              <button
                onClick={onExecuteScan}
                className="w-full mt-2 px-3 py-2 text-xs font-medium text-slate-700 bg-slate-50 hover:bg-slate-100 rounded-lg transition-colors"
              >
                Execute Intelligence Scan
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default IntelligenceWidget;

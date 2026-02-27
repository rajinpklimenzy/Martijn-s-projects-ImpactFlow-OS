/**
 * Phase 4: PlaybookWidget Component
 * REQ-07 - Playbooks widget for right sidebar
 */

import React from 'react';
import { BookOpen, CheckCircle2, Circle, Loader2 } from 'lucide-react';

export interface PlaybookInstance {
  id: string;
  name: string;
  status: 'active' | 'completed' | 'paused';
  progress?: number;
  stepsCompleted?: number;
  totalSteps?: number;
}

interface PlaybookWidgetProps {
  playbooks?: PlaybookInstance[];
  isLoading?: boolean;
  onViewAll?: () => void;
  onAdd?: () => void;
}

const PlaybookWidget: React.FC<PlaybookWidgetProps> = ({
  playbooks = [],
  isLoading = false,
  onViewAll,
  onAdd
}) => {
  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed':
        return <CheckCircle2 className="w-4 h-4 text-green-600" />;
      case 'active':
        return <Loader2 className="w-4 h-4 text-indigo-600 animate-spin" />;
      case 'paused':
        return <Circle className="w-4 h-4 text-amber-600" />;
      default:
        return <Circle className="w-4 h-4 text-slate-400" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed':
        return 'bg-green-100 text-green-700';
      case 'active':
        return 'bg-indigo-100 text-indigo-700';
      case 'paused':
        return 'bg-amber-100 text-amber-700';
      default:
        return 'bg-slate-100 text-slate-700';
    }
  };

  const displayPlaybooks = playbooks.slice(0, 3);

  return (
    <div className="border-b border-slate-200 last:border-0">
      <div className="px-4 py-3">
        <div className="flex items-center gap-2 mb-3">
          <BookOpen className="w-4 h-4 text-slate-400" />
          <h3 className="text-sm font-semibold text-slate-900">Playbooks</h3>
        </div>
        
        {isLoading ? (
          <div className="py-4 flex items-center justify-center">
            <Loader2 className="w-5 h-5 animate-spin text-indigo-600" />
          </div>
        ) : displayPlaybooks.length === 0 ? (
          <div className="py-4 text-center">
            <p className="text-sm text-slate-400 mb-3">No playbooks</p>
            {onAdd && (
              <button
                onClick={onAdd}
                className="px-3 py-2 text-xs font-medium text-indigo-600 bg-indigo-50 hover:bg-indigo-100 rounded-lg transition-colors"
              >
                Add Playbook
              </button>
            )}
          </div>
        ) : (
          <div className="space-y-3">
            {displayPlaybooks.map((playbook) => (
              <div
                key={playbook.id}
                className="p-3 bg-slate-50 rounded-lg border border-slate-200"
              >
                <div className="flex items-start gap-2 mb-2">
                  {getStatusIcon(playbook.status)}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-slate-900 truncate">
                      {playbook.name}
                    </p>
                    <div className="flex items-center gap-2 mt-1">
                      <span className={`px-2 py-0.5 text-[10px] font-medium rounded ${getStatusColor(playbook.status)}`}>
                        {playbook.status}
                      </span>
                      {playbook.stepsCompleted !== undefined && playbook.totalSteps !== undefined && (
                        <span className="text-xs text-slate-500">
                          {playbook.stepsCompleted}/{playbook.totalSteps} steps
                        </span>
                      )}
                    </div>
                    {playbook.progress !== undefined && (
                      <div className="mt-2 w-full bg-slate-200 rounded-full h-1.5">
                        <div
                          className="bg-indigo-600 h-1.5 rounded-full transition-all"
                          style={{ width: `${playbook.progress}%` }}
                        />
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}
            {playbooks.length > 3 && onViewAll && (
              <button
                onClick={onViewAll}
                className="w-full mt-2 px-3 py-2 text-xs font-medium text-indigo-600 bg-indigo-50 hover:bg-indigo-100 rounded-lg transition-colors"
              >
                View All ({playbooks.length})
              </button>
            )}
            {onAdd && (
              <button
                onClick={onAdd}
                className="w-full mt-2 px-3 py-2 text-xs font-medium text-slate-700 bg-slate-50 hover:bg-slate-100 rounded-lg transition-colors"
              >
                Add Playbook
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default PlaybookWidget;

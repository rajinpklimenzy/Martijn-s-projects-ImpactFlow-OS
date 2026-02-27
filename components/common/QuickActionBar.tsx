/**
 * Phase 2: QuickActionBar Component
 * REQ-02 - Quick action buttons for contacts and companies
 */

import React, { useState } from 'react';
import { MessageSquare, Mail, Phone, CheckSquare, Calendar, MoreVertical } from 'lucide-react';

interface QuickActionBarProps {
  type: 'contact' | 'company';
  onNote?: () => void;
  onEmail?: () => void;
  onCall?: () => void;
  onTask?: () => void;
  onMeeting?: () => void;
  onMore?: () => void;
}

const QuickActionBar: React.FC<QuickActionBarProps> = ({
  type,
  onNote,
  onEmail,
  onCall,
  onTask,
  onMeeting,
  onMore
}) => {
  const [showMoreMenu, setShowMoreMenu] = useState(false);

  const actions = [
    { icon: MessageSquare, label: 'Note', onClick: onNote, show: true },
    { icon: Mail, label: 'Email', onClick: onEmail, show: type === 'contact' },
    { icon: Phone, label: 'Call', onClick: onCall, show: type === 'contact' },
    { icon: CheckSquare, label: 'Task', onClick: onTask, show: true },
    { icon: Calendar, label: 'Meeting', onClick: onMeeting, show: type === 'contact' },
  ].filter(action => action.show);

  return (
    <div className="px-6 py-4 border-b border-slate-200">
      <div className="flex items-center gap-2 flex-wrap">
        {actions.map((action, index) => {
          const Icon = action.icon;
          return (
            <button
              key={index}
              onClick={action.onClick}
              className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-slate-700 bg-slate-50 hover:bg-slate-100 rounded-lg transition-colors"
              title={action.label}
            >
              <Icon className="w-4 h-4" />
              <span className="hidden sm:inline">{action.label}</span>
            </button>
          );
        })}
        {onMore && (
          <div className="relative">
            <button
              onClick={() => setShowMoreMenu(!showMoreMenu)}
              className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-slate-700 bg-slate-50 hover:bg-slate-100 rounded-lg transition-colors"
              title="More"
            >
              <MoreVertical className="w-4 h-4" />
              <span className="hidden sm:inline">More</span>
            </button>
            {showMoreMenu && (
              <div className="absolute top-full left-0 mt-1 bg-white border border-slate-200 rounded-lg shadow-lg z-10 min-w-[160px]">
                <button
                  onClick={() => {
                    onMore();
                    setShowMoreMenu(false);
                  }}
                  className="w-full text-left px-4 py-2 text-sm text-slate-700 hover:bg-slate-50 transition-colors"
                >
                  More actions...
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default QuickActionBar;

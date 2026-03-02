/**
 * Global command palette: Cmd+K / Ctrl+K.
 * Search across modules, recent searches, navigate to tabs.
 */

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Search, Home, Users, Briefcase, CheckSquare, Calendar, FileText, Star, DollarSign, Settings, X } from 'lucide-react';

const RECENT_KEY = 'commandPaletteRecent';
const MAX_RECENT = 5;

export interface CommandItem {
  id: string;
  label: string;
  subtitle?: string;
  icon: React.ReactNode;
  keywords?: string[];
}

const NAV_ITEMS: CommandItem[] = [
  { id: 'dashboard', label: 'Dashboard', icon: <Home className="w-4 h-4" />, keywords: ['home'] },
  { id: 'schedule', label: 'Schedule', icon: <Calendar className="w-4 h-4" />, keywords: ['calendar'] },
  { id: 'crm', label: 'CRM', icon: <Users className="w-4 h-4" />, keywords: ['contacts', 'companies'] },
  { id: 'pipeline', label: 'Deal Pipeline', icon: <Briefcase className="w-4 h-4" />, keywords: ['deals'] },
  { id: 'tasks', label: 'Tasks', icon: <CheckSquare className="w-4 h-4" />, keywords: [] },
  { id: 'projects', label: 'Projects', icon: <FileText className="w-4 h-4" />, keywords: [] },
  { id: 'satisfaction', label: 'Client Satisfaction', icon: <Star className="w-4 h-4" />, keywords: ['nps'] },
  { id: 'invoices', label: 'Billing & Invoicing', icon: <DollarSign className="w-4 h-4" />, keywords: ['billing'] },
  { id: 'settings', label: 'Settings', icon: <Settings className="w-4 h-4" />, keywords: [] },
];

interface CommandPaletteProps {
  isOpen: boolean;
  onClose: () => void;
  onNavigate: (tabId: string) => void;
}

const CommandPalette: React.FC<CommandPaletteProps> = ({ isOpen, onClose, onNavigate }) => {
  const [query, setQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [recent, setRecent] = useState<string[]>(() => {
    try {
      const s = localStorage.getItem(RECENT_KEY);
      return s ? JSON.parse(s) : [];
    } catch (_) {
      return [];
    }
  });
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  const filtered = query.trim()
    ? NAV_ITEMS.filter(
        (item) =>
          item.label.toLowerCase().includes(query.toLowerCase()) ||
          (item.keywords && item.keywords.some((k) => k.toLowerCase().includes(query.toLowerCase())))
      )
    : NAV_ITEMS;

  const addRecent = useCallback((id: string) => {
    setRecent((prev) => {
      const next = [id, ...prev.filter((x) => x !== id)].slice(0, MAX_RECENT);
      try {
        localStorage.setItem(RECENT_KEY, JSON.stringify(next));
      } catch (_) {}
      return next;
    });
  }, []);

  const handleSelect = useCallback(
    (id: string) => {
      addRecent(id);
      onNavigate(id);
      localStorage.setItem('activeTab', id);
      setQuery('');
      setSelectedIndex(0);
      onClose();
    },
    [onNavigate, onClose, addRecent]
  );

  useEffect(() => {
    if (isOpen) {
      setQuery('');
      setSelectedIndex(0);
      inputRef.current?.focus();
    }
  }, [isOpen]);

  useEffect(() => {
    setSelectedIndex(0);
  }, [query]);

  useEffect(() => {
    const el = listRef.current;
    if (!el) return;
    const child = el.children[selectedIndex] as HTMLElement;
    child?.scrollIntoView({ block: 'nearest' });
  }, [selectedIndex, filtered]);

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (!isOpen) return;
      if (e.key === 'Escape') {
        onClose();
        return;
      }
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setSelectedIndex((i) => (i + 1) % Math.max(1, filtered.length));
        return;
      }
      if (e.key === 'ArrowUp') {
        e.preventDefault();
        setSelectedIndex((i) => (i - 1 + filtered.length) % Math.max(1, filtered.length));
        return;
      }
      if (e.key === 'Enter' && filtered[selectedIndex]) {
        e.preventDefault();
        handleSelect(filtered[selectedIndex].id);
      }
    };
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [isOpen, filtered, selectedIndex, onClose, handleSelect]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[200] flex items-start justify-center pt-[15vh] px-4 bg-slate-900/50 backdrop-blur-sm animate-in fade-in duration-150">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-xl overflow-hidden border border-slate-200 animate-in zoom-in-95 duration-200">
        <div className="flex items-center gap-3 px-4 border-b border-slate-100">
          <Search className="w-5 h-5 text-slate-400 shrink-0" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search everywhere…"
            className="flex-1 py-3 bg-transparent border-none outline-none text-slate-900 placeholder:text-slate-400"
          />
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 hover:bg-slate-100 rounded-lg text-slate-400 hover:text-slate-600"
            aria-label="Close"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
        <div ref={listRef} className="max-h-[60vh] overflow-y-auto py-2">
          {filtered.length === 0 ? (
            <div className="px-4 py-8 text-center text-slate-500 text-sm">No matches</div>
          ) : (
            filtered.map((item, i) => (
              <button
                key={item.id}
                type="button"
                onClick={() => handleSelect(item.id)}
                className={`w-full flex items-center gap-3 px-4 py-2.5 text-left transition-colors ${
                  i === selectedIndex ? 'bg-indigo-50 text-indigo-700' : 'text-slate-700 hover:bg-slate-50'
                }`}
              >
                <span className="text-slate-400 shrink-0">{item.icon}</span>
                <span className="font-medium">{item.label}</span>
                {recent.includes(item.id) && (
                  <span className="ml-auto text-[10px] text-slate-400 uppercase tracking-wider">Recent</span>
                )}
              </button>
            ))
          )}
        </div>
        <div className="px-4 py-2 border-t border-slate-100 text-[10px] text-slate-400">
          ↑↓ navigate · Enter select · Esc close
        </div>
      </div>
    </div>
  );
};

export default CommandPalette;

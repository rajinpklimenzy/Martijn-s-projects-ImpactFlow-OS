/**
 * Phase 4: AssociationSearchModal Component
 * REQ-07 - Modal for searching and adding associations
 */

import React, { useState, useEffect } from 'react';
import { X, Search, Loader2 } from 'lucide-react';

export interface SearchableItem {
  id: string;
  name: string;
  subtitle?: string;
  type: 'contact' | 'company' | 'deal';
}

interface AssociationSearchModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelect: (item: SearchableItem) => void;
  searchFunction: (query: string) => Promise<SearchableItem[]>;
  title: string;
  placeholder?: string;
}

const AssociationSearchModal: React.FC<AssociationSearchModalProps> = ({
  isOpen,
  onClose,
  onSelect,
  searchFunction,
  title,
  placeholder = 'Search...'
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [results, setResults] = useState<SearchableItem[]>([]);
  const [isSearching, setIsSearching] = useState(false);

  useEffect(() => {
    if (!isOpen) {
      setSearchQuery('');
      setResults([]);
      return;
    }

    const performSearch = async () => {
      if (!searchQuery.trim()) {
        setResults([]);
        return;
      }

      setIsSearching(true);
      try {
        const items = await searchFunction(searchQuery);
        setResults(items);
      } catch (error) {
        // console.error('Search error:', error);
        setResults([]);
      } finally {
        setIsSearching(false);
      }
    };

    const timeoutId = setTimeout(performSearch, 300);
    return () => clearTimeout(timeoutId);
  }, [searchQuery, isOpen, searchFunction]);

  if (!isOpen) return null;

  return (
    <>
      {/* Backdrop */}
      <div 
        className="fixed inset-0 bg-black/50 z-50 transition-opacity"
        onClick={onClose}
      />
      
      {/* Modal */}
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-lg shadow-xl w-full max-w-md max-h-[80vh] flex flex-col">
          {/* Header */}
          <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between">
            <h2 className="text-lg font-bold text-slate-900">{title}</h2>
            <button
              onClick={onClose}
              className="p-2 text-slate-400 hover:text-slate-600 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Search */}
          <div className="px-6 py-4 border-b border-slate-200">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                type="text"
                placeholder={placeholder}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-200"
                autoFocus
              />
            </div>
          </div>

          {/* Results */}
          <div className="flex-1 overflow-y-auto px-6 py-4">
            {isSearching ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="w-6 h-6 animate-spin text-indigo-600" />
              </div>
            ) : results.length === 0 ? (
              <div className="py-8 text-center">
                <p className="text-sm text-slate-400">
                  {searchQuery.trim() ? 'No results found' : 'Start typing to search...'}
                </p>
              </div>
            ) : (
              <div className="space-y-2">
                {results.map((item) => (
                  <button
                    key={item.id}
                    onClick={() => {
                      onSelect(item);
                      onClose();
                    }}
                    className="w-full text-left p-3 rounded-lg hover:bg-slate-50 transition-colors border border-slate-200"
                  >
                    <p className="text-sm font-medium text-slate-900">{item.name}</p>
                    {item.subtitle && (
                      <p className="text-xs text-slate-500 mt-1">{item.subtitle}</p>
                    )}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );
};

export default AssociationSearchModal;

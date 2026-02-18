/**
 * @license
 * Copyright 2025 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 *
 * ColumnCustomizer Component - Phase 8.2
 * Allows users to show/hide and reorder table columns
 */

import React, { useState, useEffect } from 'react';
import { X, GripVertical, RotateCcw } from 'lucide-react';

export interface ColumnDefinition {
  key: string;
  label: string;
  locked?: boolean;
  visible: boolean;
  order: number;
}

interface ColumnCustomizerProps {
  columns: ColumnDefinition[];
  onColumnsChange: (columns: ColumnDefinition[]) => void;
  onReset: () => void;
  entityType: 'contact' | 'company';
}

const ColumnCustomizer: React.FC<ColumnCustomizerProps> = ({
  columns,
  onColumnsChange,
  onReset,
  entityType
}) => {
  const [localColumns, setLocalColumns] = useState<ColumnDefinition[]>(columns);
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);

  useEffect(() => {
    setLocalColumns(columns);
  }, [columns]);

  const handleToggleVisibility = (key: string) => {
    const updated = localColumns.map(col =>
      col.key === key ? { ...col, visible: !col.visible } : col
    );
    setLocalColumns(updated);
    onColumnsChange(updated);
  };

  const handleDragStart = (index: number) => {
    setDraggedIndex(index);
  };

  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    if (draggedIndex === null) return;

    const draggedColumn = localColumns[draggedIndex];
    if (draggedColumn.locked) return; // Don't allow dragging locked columns

    const newColumns = [...localColumns];
    newColumns.splice(draggedIndex, 1);
    newColumns.splice(index, 0, draggedColumn);

    // Update order values
    const reordered = newColumns.map((col, idx) => ({
      ...col,
      order: idx
    }));

    setLocalColumns(reordered);
    setDraggedIndex(index);
  };

  const handleDragEnd = () => {
    if (draggedIndex !== null) {
      onColumnsChange(localColumns);
    }
    setDraggedIndex(null);
  };

  const sortedColumns = [...localColumns].sort((a, b) => a.order - b.order);

  return (
    <div className="bg-white rounded-xl border border-slate-200 shadow-lg p-4 w-80 max-h-96 overflow-y-auto">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-bold text-slate-900">Columns</h3>
        <button
          onClick={() => {
            const updated = localColumns.map(col => ({ ...col, visible: true }));
            setLocalColumns(updated);
            onColumnsChange(updated);
          }}
          className="text-xs text-indigo-600 hover:text-indigo-700 font-semibold"
        >
          Show All
        </button>
      </div>

      <div className="space-y-1 mb-4">
        {sortedColumns.map((column, index) => (
          <div
            key={column.key}
            draggable={!column.locked}
            onDragStart={() => handleDragStart(index)}
            onDragOver={(e) => handleDragOver(e, index)}
            onDragEnd={handleDragEnd}
            className={`flex items-center gap-2 p-2 rounded-lg transition-colors ${
              draggedIndex === index ? 'bg-indigo-50' : 'hover:bg-slate-50'
            } ${column.locked ? 'opacity-60' : ''}`}
          >
            {!column.locked && (
              <GripVertical className="w-4 h-4 text-slate-400 cursor-move" />
            )}
            <input
              type="checkbox"
              checked={column.visible}
              onChange={() => handleToggleVisibility(column.key)}
              disabled={column.locked}
              className="w-4 h-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 disabled:opacity-50"
            />
            <span className={`flex-1 text-sm ${column.locked ? 'font-bold' : 'font-medium'} text-slate-700`}>
              {column.label}
            </span>
            {column.locked && (
              <span className="text-xs text-slate-400">(locked)</span>
            )}
          </div>
        ))}
      </div>

      <div className="flex items-center justify-between pt-4 border-t border-slate-200">
        <button
          onClick={onReset}
          className="flex items-center gap-2 px-3 py-2 text-sm font-semibold text-slate-600 hover:text-slate-700 hover:bg-slate-50 rounded-lg transition-colors"
        >
          <RotateCcw className="w-4 h-4" />
          Reset
        </button>
        <button
          onClick={() => onColumnsChange(localColumns)}
          className="px-4 py-2 bg-indigo-600 text-white text-sm font-semibold rounded-lg hover:bg-indigo-700 transition-colors"
        >
          Apply
        </button>
      </div>
    </div>
  );
};

export default ColumnCustomizer;

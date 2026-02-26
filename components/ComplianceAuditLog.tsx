
import React, { useState, useEffect, useCallback } from 'react';
import {
  Shield,
  RefreshCw,
  Loader2,
  Download,
  Filter,
} from 'lucide-react';
import {
  apiGetAuditLogs,
  apiGetComplianceAuditStats,
  apiExportAuditLogs,
  type AuditLogParams,
} from '../utils/api';
import { useToast } from '../contexts/ToastContext';

interface ComplianceAuditLogProps {
  currentUser: any;
}

type AuditLogEntry = {
  id: string;
  eventType: string;
  resourceType?: string;
  resourceId?: string;
  userId?: string;
  userEmail?: string;
  timestamp: string | { toDate?: () => Date };
  metadata?: Record<string, unknown>;
  ipAddress?: string;
};

const formatEventType = (s: string) => s.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());

const ComplianceAuditLog: React.FC<ComplianceAuditLogProps> = ({ currentUser }) => {
  const { showSuccess, showError } = useToast();
  const isAdmin = currentUser?.role === 'Admin';

  const [logs, setLogs] = useState<AuditLogEntry[]>([]);
  const [stats, setStats] = useState<{ totalActions: number; blockedOutboundAttempts: number; consentChanges: number } | null>(null);
  const [loading, setLoading] = useState(false);
  const [loadingStats, setLoadingStats] = useState(false);
  const [exporting, setExporting] = useState(false);

  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [eventType, setEventType] = useState('');
  const [userId, setUserId] = useState('');
  const [resourceId, setResourceId] = useState('');

  const loadLogs = useCallback(async () => {
    setLoading(true);
    try {
      const params: AuditLogParams = { limit: 100 };
      if (startDate) params.startDate = startDate;
      if (endDate) params.endDate = endDate;
      if (eventType) params.eventType = eventType;
      if (userId) params.userId = userId;
      if (resourceId) params.resourceId = resourceId;
      const res = await apiGetAuditLogs(params);
      const data = (res as any)?.data ?? (res as any)?.logs ?? [];
      setLogs(Array.isArray(data) ? data : []);
    } catch (e) {
      showError('Failed to load audit logs');
      setLogs([]);
    } finally {
      setLoading(false);
    }
  }, [startDate, endDate, eventType, userId, resourceId, showError]);

  const loadStats = useCallback(async () => {
    setLoadingStats(true);
    try {
      const res = await apiGetComplianceAuditStats(
        startDate && endDate ? { startDate, endDate } : undefined
      );
      const data = (res as any)?.data ?? res;
      setStats(data ? {
        totalActions: data.totalActions ?? 0,
        blockedOutboundAttempts: data.blockedOutboundAttempts ?? 0,
        consentChanges: data.consentChanges ?? 0,
      } : null);
    } catch {
      setStats(null);
    } finally {
      setLoadingStats(false);
    }
  }, [startDate, endDate]);

  useEffect(() => {
    if (!isAdmin) return;
    loadLogs();
  }, [isAdmin, loadLogs]);

  useEffect(() => {
    if (!isAdmin) return;
    loadStats();
  }, [isAdmin, loadStats]);

  const handleExport = async (format: 'csv' | 'json') => {
    setExporting(true);
    try {
      const params: AuditLogParams & { format?: 'json' | 'csv' } = { format };
      if (startDate) params.startDate = startDate;
      if (endDate) params.endDate = endDate;
      if (eventType) params.eventType = eventType;
      if (userId) params.userId = userId;
      if (resourceId) params.resourceId = resourceId;
      const blob = await apiExportAuditLogs(params);
      const url = URL.createObjectURL(new Blob([blob], { type: format === 'csv' ? 'text/csv' : 'application/json' }));
      const a = document.createElement('a');
      a.href = url;
      a.download = `compliance-audit-log-${new Date().toISOString().split('T')[0]}.${format === 'csv' ? 'csv' : 'json'}`;
      a.click();
      URL.revokeObjectURL(url);
      showSuccess(`Exported as ${format.toUpperCase()}`);
    } catch (e) {
      showError('Export failed');
    } finally {
      setExporting(false);
    }
  };

  const toDate = (t: string | { toDate?: () => Date }): Date => {
    if (!t) return new Date(0);
    if (typeof t === 'string') return new Date(t);
    if ((t as any).toDate) return (t as any).toDate();
    return new Date((t as any).seconds ? (t as any).seconds * 1000 : t);
  };

  if (!isAdmin) {
    return (
      <div className="p-8 max-w-2xl mx-auto">
        <div className="bg-amber-50 border border-amber-200 rounded-2xl p-6 text-center">
          <Shield className="w-12 h-12 text-amber-600 mx-auto mb-3" />
          <h2 className="text-lg font-bold text-amber-900 mb-2">Compliance Audit Log</h2>
          <p className="text-sm text-amber-800">
            Compliance Audit Log is available only to administrators. Contact your workspace admin if you need access.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 lg:p-8 max-w-7xl mx-auto">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Compliance Audit Log</h1>
          <p className="text-sm text-slate-500 mt-0.5">Privacy & consent events for regulatory reporting</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => { loadLogs(); loadStats(); }}
            disabled={loading}
            className="px-4 py-2 bg-slate-100 text-slate-700 rounded-xl text-xs font-bold uppercase tracking-wider hover:bg-slate-200 transition-all flex items-center gap-2 disabled:opacity-50"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} /> Refresh
          </button>
          <button
            type="button"
            onClick={() => handleExport('csv')}
            disabled={exporting}
            className="px-4 py-2 bg-indigo-600 text-white rounded-xl text-xs font-bold uppercase tracking-wider hover:bg-indigo-700 transition-all flex items-center gap-2 disabled:opacity-50"
          >
            <Download className="w-4 h-4" /> Export CSV
          </button>
        </div>
      </div>

      {/* Aggregate stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
        <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm">
          <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Total actions (period)</p>
          {loadingStats ? (
            <Loader2 className="w-6 h-6 animate-spin text-slate-300 mt-1" />
          ) : (
            <p className="mt-1 text-2xl font-black text-slate-900">{stats?.totalActions ?? 0}</p>
          )}
        </div>
        <div className="bg-white p-5 rounded-2xl border border-rose-100 shadow-sm">
          <p className="text-[10px] font-black uppercase tracking-widest text-rose-600">Blocked outbound attempts</p>
          {loadingStats ? (
            <Loader2 className="w-6 h-6 animate-spin text-slate-300 mt-1" />
          ) : (
            <p className="mt-1 text-2xl font-black text-rose-900">{stats?.blockedOutboundAttempts ?? 0}</p>
          )}
        </div>
        <div className="bg-white p-5 rounded-2xl border border-blue-100 shadow-sm">
          <p className="text-[10px] font-black uppercase tracking-widest text-blue-600">Consent changes</p>
          {loadingStats ? (
            <Loader2 className="w-6 h-6 animate-spin text-slate-300 mt-1" />
          ) : (
            <p className="mt-1 text-2xl font-black text-blue-900">{stats?.consentChanges ?? 0}</p>
          )}
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-4 mb-6">
        <div className="flex items-center gap-2 mb-3">
          <Filter className="w-4 h-4 text-slate-400" />
          <span className="text-xs font-bold uppercase tracking-wider text-slate-500">Filters</span>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
          <div>
            <label className="block text-[10px] font-bold uppercase text-slate-400 mb-1">Start date</label>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm"
            />
          </div>
          <div>
            <label className="block text-[10px] font-bold uppercase text-slate-400 mb-1">End date</label>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm"
            />
          </div>
          <div>
            <label className="block text-[10px] font-bold uppercase text-slate-400 mb-1">Action type</label>
            <input
              type="text"
              placeholder="e.g. consent_withdrawn"
              value={eventType}
              onChange={(e) => setEventType(e.target.value)}
              className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm"
            />
          </div>
          <div>
            <label className="block text-[10px] font-bold uppercase text-slate-400 mb-1">Actor (user ID)</label>
            <input
              type="text"
              placeholder="User ID"
              value={userId}
              onChange={(e) => setUserId(e.target.value)}
              className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm"
            />
          </div>
          <div>
            <label className="block text-[10px] font-bold uppercase text-slate-400 mb-1">Contact / resource ID</label>
            <input
              type="text"
              placeholder="Resource ID"
              value={resourceId}
              onChange={(e) => setResourceId(e.target.value)}
              className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm"
            />
          </div>
        </div>
        <button
          type="button"
          onClick={loadLogs}
          disabled={loading}
          className="mt-3 px-4 py-2 bg-indigo-600 text-white text-xs font-bold rounded-lg hover:bg-indigo-700 disabled:opacity-50"
        >
          Apply filters
        </button>
      </div>

      {/* Table */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          {loading ? (
            <div className="flex items-center justify-center py-16">
              <Loader2 className="w-8 h-8 text-indigo-600 animate-spin" />
            </div>
          ) : logs.length === 0 ? (
            <div className="py-16 text-center text-slate-500 text-sm">
              No audit log entries match the current filters.
            </div>
          ) : (
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50/50">
                  <th className="px-4 py-3 font-black uppercase tracking-wider text-slate-500">Time</th>
                  <th className="px-4 py-3 font-black uppercase tracking-wider text-slate-500">Actor</th>
                  <th className="px-4 py-3 font-black uppercase tracking-wider text-slate-500">Action</th>
                  <th className="px-4 py-3 font-black uppercase tracking-wider text-slate-500">Resource</th>
                  <th className="px-4 py-3 font-black uppercase tracking-wider text-slate-500">Details</th>
                </tr>
              </thead>
              <tbody>
                {logs.map((log) => (
                  <tr key={log.id} className="border-b border-slate-50 hover:bg-slate-50/30">
                    <td className="px-4 py-3 text-slate-600 whitespace-nowrap">
                      {toDate(log.timestamp).toLocaleString()}
                    </td>
                    <td className="px-4 py-3 text-slate-600">
                      {log.userEmail || log.userId || '—'}
                    </td>
                    <td className="px-4 py-3">
                      <span className="font-semibold text-slate-900">{formatEventType(log.eventType)}</span>
                    </td>
                    <td className="px-4 py-3 text-slate-600">
                      {log.resourceType || '—'} {log.resourceId ? `· ${log.resourceId.substring(0, 8)}…` : ''}
                    </td>
                    <td className="px-4 py-3 text-slate-500 max-w-xs truncate">
                      {log.metadata && typeof log.metadata === 'object'
                        ? JSON.stringify(log.metadata).slice(0, 80) + (JSON.stringify(log.metadata).length > 80 ? '…' : '')
                        : '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
};

export default ComplianceAuditLog;

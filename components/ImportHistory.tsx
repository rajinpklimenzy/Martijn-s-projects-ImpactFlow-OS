import React, { useState, useEffect, useCallback } from 'react';
import {
  History,
  Loader2,
  Filter,
  X,
  ChevronRight,
  ChevronDown,
  FileSpreadsheet,
  Building2,
  User,
  CheckCircle2,
  XCircle,
  Clock,
  Calendar,
  Download,
  Eye,
  RefreshCw,
} from 'lucide-react';
import { apiGetImportBatches, apiGetImportBatch, apiGetUsers } from '../utils/api';
import { useToast } from '../contexts/ToastContext';

interface ImportHistoryProps {
  currentUser: any;
}

interface ImportBatch {
  id: string;
  type: 'company' | 'contact';
  fileName: string;
  totalRows: number;
  successfulImports: number;
  failedRows: number;
  createdCompanies?: number;
  updatedCompanies?: number;
  createdContacts?: number;
  updatedContacts?: number;
  status: 'processing' | 'completed' | 'failed';
  uploadedBy: string;
  createdAt: any; // Firestore timestamp
  uploadId?: string;
}

const ImportHistory: React.FC<ImportHistoryProps> = ({ currentUser }) => {
  const { showSuccess, showError } = useToast();
  const [batches, setBatches] = useState<ImportBatch[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedBatch, setSelectedBatch] = useState<ImportBatch | null>(null);
  const [batchDetail, setBatchDetail] = useState<any>(null);
  const [loadingDetail, setLoadingDetail] = useState(false);
  const [users, setUsers] = useState<any[]>([]);
  
  // Filters - default to current user if not admin
  const isAdmin = currentUser?.role === 'Admin';
  const [filters, setFilters] = useState<{
    userId?: string;
    type?: 'company' | 'contact';
    status?: 'processing' | 'completed' | 'failed';
    startDate?: string;
    endDate?: string;
  }>(() => {
    // Default to current user's imports if not admin
    const defaultUserId = !isAdmin && currentUser?.id ? currentUser.id : undefined;
    return defaultUserId ? { userId: defaultUserId } : {};
  });
  const [showFilters, setShowFilters] = useState(false);

  // Load users for filter dropdown
  useEffect(() => {
    const loadUsers = async () => {
      try {
        const response = await apiGetUsers();
        setUsers(response?.data || []);
      } catch (err) {
        console.error('Failed to load users:', err);
      }
    };
    loadUsers();
  }, []);

  const fetchBatches = useCallback(async () => {
    setLoading(true);
    try {
      const response = await apiGetImportBatches({
        ...filters,
        limit: 100,
      });
      const data = response?.data || [];
      setBatches(data);
    } catch (err: any) {
      showError(err.message || 'Failed to load import history');
      setBatches([]);
    } finally {
      setLoading(false);
    }
  }, [filters, showError]);

  useEffect(() => {
    fetchBatches();
  }, [fetchBatches]);

  const handleViewBatch = async (batch: ImportBatch) => {
    setSelectedBatch(batch);
    setLoadingDetail(true);
    try {
      const response = await apiGetImportBatch(batch.id);
      setBatchDetail(response?.data || response);
    } catch (err: any) {
      showError(err.message || 'Failed to load batch details');
      setBatchDetail(null);
    } finally {
      setLoadingDetail(false);
    }
  };

  const formatDate = (timestamp: any) => {
    if (!timestamp) return 'N/A';
    try {
      const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
      return date.toLocaleString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch {
      return 'Invalid date';
    }
  };

  const getUserName = (userId: string) => {
    const user = users.find((u) => u.id === userId);
    return user?.name || userId || 'Unknown';
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed':
        return <CheckCircle2 className="w-5 h-5 text-green-600" />;
      case 'failed':
        return <XCircle className="w-5 h-5 text-red-600" />;
      case 'processing':
        return <Clock className="w-5 h-5 text-yellow-600" />;
      default:
        return <Clock className="w-5 h-5 text-slate-400" />;
    }
  };

  const getStatusBadge = (status: string) => {
    const baseClasses = 'px-2 py-1 rounded-full text-xs font-medium';
    switch (status) {
      case 'completed':
        return `${baseClasses} bg-green-100 text-green-700`;
      case 'failed':
        return `${baseClasses} bg-red-100 text-red-700`;
      case 'processing':
        return `${baseClasses} bg-yellow-100 text-yellow-700`;
      default:
        return `${baseClasses} bg-slate-100 text-slate-700`;
    }
  };

  const clearFilters = () => {
    setFilters({});
  };

  const hasActiveFilters = Object.keys(filters).length > 0;

  return (
    <div className="space-y-6 animate-in slide-in-from-bottom-2 duration-500 pb-10">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <History className="w-6 h-6 text-indigo-600" />
            Import History
          </h1>
          <p className="text-sm text-slate-500 mt-1">View and manage past import batches</p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => setShowFilters(!showFilters)}
            className={`px-4 py-2 rounded-lg text-sm font-medium flex items-center gap-2 transition-colors ${
              showFilters || hasActiveFilters
                ? 'bg-indigo-600 text-white'
                : 'bg-white border border-slate-200 text-slate-700 hover:bg-slate-50'
            }`}
          >
            <Filter className="w-4 h-4" />
            Filters
            {hasActiveFilters && (
              <span className="bg-white text-indigo-600 rounded-full px-2 py-0.5 text-xs font-bold">
                {Object.keys(filters).length}
              </span>
            )}
          </button>
          <button
            onClick={fetchBatches}
            disabled={loading}
            className="px-4 py-2 bg-white border border-slate-200 text-slate-700 rounded-lg text-sm font-medium hover:bg-slate-50 flex items-center gap-2 disabled:opacity-50"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </button>
        </div>
      </div>

      {/* Filters Panel */}
      {showFilters && (
        <div className="bg-white border border-slate-200 rounded-xl p-4 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold text-slate-700">Filter Imports</h3>
            <button
              onClick={clearFilters}
              className="text-xs text-indigo-600 hover:text-indigo-700 font-medium"
            >
              Clear all
            </button>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">User</label>
              <select
                value={filters.userId || ''}
                onChange={(e) =>
                  setFilters((f) => ({
                    ...f,
                    userId: e.target.value || undefined,
                  }))
                }
                className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm"
              >
                <option value="">All users</option>
                {users.map((user) => (
                  <option key={user.id} value={user.id}>
                    {user.name || user.email}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">Type</label>
              <select
                value={filters.type || ''}
                onChange={(e) =>
                  setFilters((f) => ({
                    ...f,
                    type: (e.target.value as 'company' | 'contact') || undefined,
                  }))
                }
                className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm"
              >
                <option value="">All types</option>
                <option value="company">Companies</option>
                <option value="contact">Contacts</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">Status</label>
              <select
                value={filters.status || ''}
                onChange={(e) =>
                  setFilters((f) => ({
                    ...f,
                    status: (e.target.value as 'processing' | 'completed' | 'failed') || undefined,
                  }))
                }
                className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm"
              >
                <option value="">All statuses</option>
                <option value="completed">Completed</option>
                <option value="failed">Failed</option>
                <option value="processing">Processing</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">Start Date</label>
              <input
                type="date"
                value={filters.startDate || ''}
                onChange={(e) =>
                  setFilters((f) => ({
                    ...f,
                    startDate: e.target.value || undefined,
                  }))
                }
                className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">End Date</label>
              <input
                type="date"
                value={filters.endDate || ''}
                onChange={(e) =>
                  setFilters((f) => ({
                    ...f,
                    endDate: e.target.value || undefined,
                  }))
                }
                className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm"
              />
            </div>
          </div>
        </div>
      )}

      {/* Batch Detail Modal */}
      {selectedBatch && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl max-w-3xl w-full max-h-[90vh] flex flex-col">
            <div className="flex items-center justify-between p-6 border-b border-slate-200">
              <div className="flex items-center gap-3">
                {getStatusIcon(selectedBatch.status)}
                <div>
                  <h2 className="text-lg font-bold text-slate-900">Import Batch Details</h2>
                  <p className="text-sm text-slate-500">{selectedBatch.fileName}</p>
                </div>
              </div>
              <button
                onClick={() => {
                  setSelectedBatch(null);
                  setBatchDetail(null);
                }}
                className="p-2 rounded-lg hover:bg-slate-100 text-slate-500"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-6 overflow-y-auto flex-1">
              {loadingDetail ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="w-8 h-8 animate-spin text-indigo-600" />
                </div>
              ) : (
                <div className="space-y-6">
                  {/* Summary Cards */}
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div className="bg-slate-50 rounded-lg p-4">
                      <p className="text-xs text-slate-500 mb-1">Total Rows</p>
                      <p className="text-2xl font-bold text-slate-900">{selectedBatch.totalRows}</p>
                    </div>
                    <div className="bg-green-50 rounded-lg p-4">
                      <p className="text-xs text-green-600 mb-1">Successful</p>
                      <p className="text-2xl font-bold text-green-700">{selectedBatch.successfulImports}</p>
                    </div>
                    <div className="bg-red-50 rounded-lg p-4">
                      <p className="text-xs text-red-600 mb-1">Failed</p>
                      <p className="text-2xl font-bold text-red-700">{selectedBatch.failedRows}</p>
                    </div>
                    <div className="bg-indigo-50 rounded-lg p-4">
                      <p className="text-xs text-indigo-600 mb-1">Status</p>
                      <span className={getStatusBadge(selectedBatch.status)}>{selectedBatch.status}</span>
                    </div>
                  </div>

                  {/* Detailed Info */}
                  <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <p className="text-xs font-medium text-slate-500 mb-1">Type</p>
                        <p className="text-sm text-slate-900 capitalize flex items-center gap-2">
                          {selectedBatch.type === 'company' ? (
                            <Building2 className="w-4 h-4" />
                          ) : (
                            <User className="w-4 h-4" />
                          )}
                          {selectedBatch.type}
                        </p>
                      </div>
                      <div>
                        <p className="text-xs font-medium text-slate-500 mb-1">Uploaded By</p>
                        <p className="text-sm text-slate-900">{getUserName(selectedBatch.uploadedBy)}</p>
                      </div>
                      <div>
                        <p className="text-xs font-medium text-slate-500 mb-1">Date</p>
                        <p className="text-sm text-slate-900 flex items-center gap-2">
                          <Calendar className="w-4 h-4" />
                          {formatDate(selectedBatch.createdAt)}
                        </p>
                      </div>
                      <div>
                        <p className="text-xs font-medium text-slate-500 mb-1">File Name</p>
                        <p className="text-sm text-slate-900 flex items-center gap-2">
                          <FileSpreadsheet className="w-4 h-4" />
                          {selectedBatch.fileName}
                        </p>
                      </div>
                    </div>

                    {selectedBatch.type === 'company' && (
                      <div className="grid grid-cols-2 gap-4">
                        <div className="bg-blue-50 rounded-lg p-4">
                          <p className="text-xs text-blue-600 mb-1">Created Companies</p>
                          <p className="text-xl font-bold text-blue-700">
                            {selectedBatch.createdCompanies || 0}
                          </p>
                        </div>
                        <div className="bg-purple-50 rounded-lg p-4">
                          <p className="text-xs text-purple-600 mb-1">Updated Companies</p>
                          <p className="text-xl font-bold text-purple-700">
                            {selectedBatch.updatedCompanies || 0}
                          </p>
                        </div>
                      </div>
                    )}

                    {selectedBatch.type === 'contact' && (
                      <div className="grid grid-cols-2 gap-4">
                        <div className="bg-blue-50 rounded-lg p-4">
                          <p className="text-xs text-blue-600 mb-1">Created Contacts</p>
                          <p className="text-xl font-bold text-blue-700">
                            {selectedBatch.createdContacts || 0}
                          </p>
                        </div>
                        <div className="bg-purple-50 rounded-lg p-4">
                          <p className="text-xs text-purple-600 mb-1">Updated Contacts</p>
                          <p className="text-xl font-bold text-purple-700">
                            {selectedBatch.updatedContacts || 0}
                          </p>
                        </div>
                      </div>
                    )}

                    {batchDetail && (
                      <div className="mt-4">
                        <p className="text-xs font-medium text-slate-500 mb-2">Batch ID</p>
                        <code className="text-xs bg-slate-100 px-2 py-1 rounded text-slate-700">
                          {selectedBatch.id}
                        </code>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Batches Table */}
      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-8 h-8 animate-spin text-indigo-600" />
          </div>
        ) : batches.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <History className="w-12 h-12 text-slate-300 mb-4" />
            <p className="text-slate-500 font-medium">No import batches found</p>
            <p className="text-sm text-slate-400 mt-1">
              {hasActiveFilters
                ? 'Try adjusting your filters'
                : 'Import batches will appear here after you upload companies or contacts'}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-slate-50 border-b border-slate-200">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-slate-700 uppercase">
                    File Name
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-slate-700 uppercase">
                    Type
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-slate-700 uppercase">
                    Status
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-slate-700 uppercase">
                    Results
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-slate-700 uppercase">
                    Uploaded By
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-slate-700 uppercase">
                    Date
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-semibold text-slate-700 uppercase">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {batches.map((batch) => (
                  <tr key={batch.id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <FileSpreadsheet className="w-4 h-4 text-slate-400" />
                        <span className="text-sm font-medium text-slate-900">{batch.fileName}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-slate-100 text-slate-700">
                        {batch.type === 'company' ? (
                          <Building2 className="w-3 h-3" />
                        ) : (
                          <User className="w-3 h-3" />
                        )}
                        {batch.type}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span className={getStatusBadge(batch.status)}>{batch.status}</span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="text-sm text-slate-600">
                        <span className="text-green-600 font-medium">{batch.successfulImports}</span>
                        {' / '}
                        <span className="text-slate-900">{batch.totalRows}</span>
                        {batch.failedRows > 0 && (
                          <>
                            {' '}
                            <span className="text-red-600">({batch.failedRows} failed)</span>
                          </>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <span className="text-sm text-slate-600">{getUserName(batch.uploadedBy)}</span>
                    </td>
                    <td className="px-4 py-3">
                      <span className="text-sm text-slate-600">{formatDate(batch.createdAt)}</span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <button
                        onClick={() => handleViewBatch(batch)}
                        className="inline-flex items-center gap-1 px-3 py-1.5 text-sm font-medium text-indigo-600 hover:text-indigo-700 hover:bg-indigo-50 rounded-lg transition-colors"
                      >
                        <Eye className="w-4 h-4" />
                        View
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

export default ImportHistory;

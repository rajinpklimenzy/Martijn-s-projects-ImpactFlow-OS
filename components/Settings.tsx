
import React, { useState, useEffect, useRef } from 'react';
import { 
  Bell, Mail, Smartphone, Shield, User, Save, Globe, 
  Link2, Calendar, RefreshCw, X, Plus, Trash2, Check,
  Mail as MailIcon, Layers, AlertCircle, ArrowRight, Loader2, Upload, Image as ImageIcon,
  Users, UserPlus, Edit2, Ban, CheckCircle2, Search, MoreVertical, MapPin, Globe2, Briefcase,
  Database, Archive, Download, Trash, Settings as SettingsIcon, FileText, Layout, Eye, Building2
} from 'lucide-react';
import { DEFAULT_NOTIFICATION_PREFERENCES, TIMEZONES, LANGUAGES, getSystemTimezone } from '../constants';
import { apiUpdateUserProfile, apiMe, apiGetGoogleCalendarStatus, apiGetGoogleCalendarAuthUrl, apiDisconnectGoogleCalendar, apiGetUsers, apiCreateUser, apiUpdateUser, apiDeleteUser, apiGetExcludedDomains, apiAddExcludedDomain, apiRemoveExcludedDomain, apiGetNotificationPreferences, apiUpdateNotificationPreferences, apiGetRetentionPolicy, apiUpdateRetentionPolicy, apiGetRetentionStats, apiTriggerArchive, apiTriggerCleanup, apiExportArchivedEmails, apiGetSignatures, apiCreateSignature, apiUpdateSignature, apiDeleteSignature, apiGetIndustries, apiCreateIndustry, apiUpdateIndustry, apiDeleteIndustry } from '../utils/api';
import { useToast } from '../contexts/ToastContext';
import { ImageWithFallback } from './common';
import ImageCropper from './ImageCropper';

interface SettingsProps {
  currentUser: any;
  onUserUpdate: (user: any) => void;
}

interface WorkspaceSettingsTabProps {
  currentUser: any;
  showSuccess: (message: string) => void;
  showError: (message: string) => void;
}

interface UserPreferencesTabProps {
  currentUser: any;
  showSuccess: (message: string) => void;
  showError: (message: string) => void;
}

const WorkspaceSettingsTab: React.FC<WorkspaceSettingsTabProps> = ({ currentUser, showSuccess, showError }) => {
  const [retentionPolicy, setRetentionPolicy] = useState({
    retentionYears: 7,
    coldStorageYears: 1,
    archiveEnabled: true,
    autoCleanupEnabled: true
  });
  const [retentionStats, setRetentionStats] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isLoadingStats, setIsLoadingStats] = useState(false);
  const [isArchiving, setIsArchiving] = useState(false);
  const [isCleaning, setIsCleaning] = useState(false);
  const [isExporting, setIsExporting] = useState(false);

  useEffect(() => {
    loadRetentionPolicy();
    loadRetentionStats();
  }, []);

  const loadRetentionPolicy = async () => {
    setIsLoading(true);
    try {
      const response = await apiGetRetentionPolicy('default');
      if (response.success && response.data) {
        setRetentionPolicy(response.data);
      }
    } catch (err: any) {
      showError('Failed to load retention policy');
    } finally {
      setIsLoading(false);
    }
  };

  const loadRetentionStats = async () => {
    setIsLoadingStats(true);
    try {
      const response = await apiGetRetentionStats('default');
      if (response.success && response.data) {
        setRetentionStats(response.data);
      }
    } catch (err: any) {
      console.error('Failed to load retention stats:', err);
    } finally {
      setIsLoadingStats(false);
    }
  };

  const handleSavePolicy = async () => {
    setIsSaving(true);
    try {
      const userId = currentUser?.id || JSON.parse(localStorage.getItem('user_data') || '{}').id;
      const response = await apiUpdateRetentionPolicy('default', {
        ...retentionPolicy,
        updatedBy: userId
      });
      if (response.success) {
        showSuccess('Retention policy updated successfully');
        await loadRetentionStats();
      }
    } catch (err: any) {
      showError(err.message || 'Failed to update retention policy');
    } finally {
      setIsSaving(false);
    }
  };

  const handleTriggerArchive = async () => {
    setIsArchiving(true);
    try {
      const response = await apiTriggerArchive('default', 50);
      if (response.success) {
        showSuccess(`Archive completed: ${response.data.archived} emails archived`);
        await loadRetentionStats();
      }
    } catch (err: any) {
      showError(err.message || 'Failed to trigger archive');
    } finally {
      setIsArchiving(false);
    }
  };

  const handleTriggerCleanup = async () => {
    setIsCleaning(true);
    try {
      const response = await apiTriggerCleanup('default', 50);
      if (response.success) {
        showSuccess(`Cleanup completed: ${response.data.deleted} emails deleted`);
        await loadRetentionStats();
      }
    } catch (err: any) {
      showError(err.message || 'Failed to trigger cleanup');
    } finally {
      setIsCleaning(false);
    }
  };

  const handleExportArchived = async () => {
    setIsExporting(true);
    try {
      const response = await apiExportArchivedEmails('default', { format: 'csv' });
      if (typeof response === 'string') {
        // CSV format - create download
        const blob = new Blob([response], { type: 'text/csv' });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `archived-emails-${new Date().toISOString().split('T')[0]}.csv`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        window.URL.revokeObjectURL(url);
        showSuccess('Archived emails exported successfully');
      } else {
        showError('Unexpected export format');
      }
    } catch (err: any) {
      showError(err.message || 'Failed to export archived emails');
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Data Retention Policy */}
      <div className="bg-white p-6 lg:p-8 rounded-2xl border border-slate-200 shadow-sm space-y-6 text-left">
        <div className="flex items-center gap-3 pb-4 border-b border-slate-100">
          <div className="w-10 h-10 bg-indigo-100 rounded-xl flex items-center justify-center">
            <Database className="w-5 h-5 text-indigo-600" />
          </div>
          <div>
            <h3 className="font-bold text-lg text-slate-900">Data Retention Policy</h3>
            <p className="text-xs text-slate-500">Configure how long emails are retained and archived</p>
          </div>
        </div>

        {isLoading ? (
          <div className="p-8 text-center">
            <Loader2 className="w-6 h-6 animate-spin mx-auto text-indigo-600" />
          </div>
        ) : (
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-400 uppercase tracking-widest">
                  Retention Period (Years)
                </label>
                <input
                  type="number"
                  min="1"
                  max="20"
                  value={retentionPolicy.retentionYears}
                  onChange={(e) => setRetentionPolicy({ ...retentionPolicy, retentionYears: parseInt(e.target.value) || 7 })}
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm"
                />
                <p className="text-xs text-slate-500">Emails older than this will be permanently deleted</p>
              </div>

              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-400 uppercase tracking-widest">
                  Cold Storage Threshold (Years)
                </label>
                <input
                  type="number"
                  min="0"
                  max={retentionPolicy.retentionYears}
                  value={retentionPolicy.coldStorageYears}
                  onChange={(e) => setRetentionPolicy({ ...retentionPolicy, coldStorageYears: parseInt(e.target.value) || 1 })}
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm"
                />
                <p className="text-xs text-slate-500">Emails older than this will be moved to cold storage</p>
              </div>
            </div>

            <div className="space-y-4">
              <div className="flex items-center justify-between p-4 bg-slate-50 rounded-xl">
                <div>
                  <label className="text-sm font-semibold text-slate-900">Enable Automatic Archiving</label>
                  <p className="text-xs text-slate-500 mt-1">Automatically move emails to cold storage</p>
                </div>
                <button
                  onClick={() => setRetentionPolicy({ ...retentionPolicy, archiveEnabled: !retentionPolicy.archiveEnabled })}
                  className={`relative w-12 h-6 rounded-full transition-colors ${
                    retentionPolicy.archiveEnabled ? 'bg-indigo-600' : 'bg-slate-300'
                  }`}
                >
                  <span
                    className={`absolute top-1 left-1 w-4 h-4 bg-white rounded-full transition-transform ${
                      retentionPolicy.archiveEnabled ? 'translate-x-6' : 'translate-x-0'
                    }`}
                  />
                </button>
              </div>

              <div className="flex items-center justify-between p-4 bg-slate-50 rounded-xl">
                <div>
                  <label className="text-sm font-semibold text-slate-900">Enable Automatic Cleanup</label>
                  <p className="text-xs text-slate-500 mt-1">Automatically delete emails past retention period</p>
                </div>
                <button
                  onClick={() => setRetentionPolicy({ ...retentionPolicy, autoCleanupEnabled: !retentionPolicy.autoCleanupEnabled })}
                  className={`relative w-12 h-6 rounded-full transition-colors ${
                    retentionPolicy.autoCleanupEnabled ? 'bg-indigo-600' : 'bg-slate-300'
                  }`}
                >
                  <span
                    className={`absolute top-1 left-1 w-4 h-4 bg-white rounded-full transition-transform ${
                      retentionPolicy.autoCleanupEnabled ? 'translate-x-6' : 'translate-x-0'
                    }`}
                  />
                </button>
              </div>
            </div>

            <button
              onClick={handleSavePolicy}
              disabled={isSaving}
              className="w-full px-6 py-3 bg-indigo-600 text-white font-bold rounded-xl flex items-center justify-center gap-2 hover:bg-indigo-700 transition-all shadow-lg active:scale-95 disabled:opacity-50"
            >
              {isSaving ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <Save className="w-4 h-4" />
                  Save Retention Policy
                </>
              )}
            </button>
          </div>
        )}
      </div>

      {/* Retention Statistics */}
      {retentionStats && (
        <div className="bg-white p-6 lg:p-8 rounded-2xl border border-slate-200 shadow-sm space-y-6 text-left">
          <div className="flex items-center gap-3 pb-4 border-b border-slate-100">
            <div className="w-10 h-10 bg-slate-100 rounded-xl flex items-center justify-center">
              <Archive className="w-5 h-5 text-slate-600" />
            </div>
            <div>
              <h3 className="font-bold text-lg text-slate-900">Retention Statistics</h3>
              <p className="text-xs text-slate-500">Current data retention status</p>
            </div>
          </div>

          {isLoadingStats ? (
            <div className="p-8 text-center">
              <Loader2 className="w-6 h-6 animate-spin mx-auto text-indigo-600" />
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="p-4 bg-slate-50 rounded-xl">
                <div className="text-2xl font-bold text-slate-900">{retentionStats.totalEmails || 0}</div>
                <div className="text-xs text-slate-500 mt-1">Total Emails</div>
              </div>
              <div className="p-4 bg-slate-50 rounded-xl">
                <div className="text-2xl font-bold text-indigo-600">{retentionStats.archivedEmails || 0}</div>
                <div className="text-xs text-slate-500 mt-1">Archived Emails</div>
              </div>
              <div className="p-4 bg-slate-50 rounded-xl">
                <div className="text-2xl font-bold text-amber-600">{retentionStats.eligibleForArchive || 0}</div>
                <div className="text-xs text-slate-500 mt-1">Eligible for Archive</div>
              </div>
              <div className="p-4 bg-slate-50 rounded-xl">
                <div className="text-2xl font-bold text-red-600">{retentionStats.eligibleForDeletion || 0}</div>
                <div className="text-xs text-slate-500 mt-1">Eligible for Deletion</div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Manual Actions */}
      <div className="bg-white p-6 lg:p-8 rounded-2xl border border-slate-200 shadow-sm space-y-6 text-left">
        <div className="flex items-center gap-3 pb-4 border-b border-slate-100">
          <div className="w-10 h-10 bg-slate-100 rounded-xl flex items-center justify-center">
            <RefreshCw className="w-5 h-5 text-slate-600" />
          </div>
          <div>
            <h3 className="font-bold text-lg text-slate-900">Manual Actions</h3>
            <p className="text-xs text-slate-500">Manually trigger archive, cleanup, or export</p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <button
            onClick={handleTriggerArchive}
            disabled={isArchiving}
            className="p-4 bg-indigo-50 border border-indigo-200 rounded-xl hover:bg-indigo-100 transition-colors disabled:opacity-50 flex flex-col items-center gap-2"
          >
            {isArchiving ? (
              <Loader2 className="w-5 h-5 animate-spin text-indigo-600" />
            ) : (
              <Archive className="w-5 h-5 text-indigo-600" />
            )}
            <span className="text-sm font-semibold text-indigo-900">Archive Emails</span>
            <span className="text-xs text-indigo-600">Move to cold storage</span>
          </button>

          <button
            onClick={handleTriggerCleanup}
            disabled={isCleaning}
            className="p-4 bg-red-50 border border-red-200 rounded-xl hover:bg-red-100 transition-colors disabled:opacity-50 flex flex-col items-center gap-2"
          >
            {isCleaning ? (
              <Loader2 className="w-5 h-5 animate-spin text-red-600" />
            ) : (
              <Trash className="w-5 h-5 text-red-600" />
            )}
            <span className="text-sm font-semibold text-red-900">Cleanup Emails</span>
            <span className="text-xs text-red-600">Delete old emails</span>
          </button>

          <button
            onClick={handleExportArchived}
            disabled={isExporting}
            className="p-4 bg-green-50 border border-green-200 rounded-xl hover:bg-green-100 transition-colors disabled:opacity-50 flex flex-col items-center gap-2"
          >
            {isExporting ? (
              <Loader2 className="w-5 h-5 animate-spin text-green-600" />
            ) : (
              <Download className="w-5 h-5 text-green-600" />
            )}
            <span className="text-sm font-semibold text-green-900">Export Archived</span>
            <span className="text-xs text-green-600">Download CSV</span>
          </button>
        </div>
      </div>
    </div>
  );
};

const UserPreferencesTab: React.FC<UserPreferencesTabProps> = ({ currentUser, showSuccess, showError }) => {
  const [signatures, setSignatures] = useState<any[]>([]);
  const [isLoadingSignatures, setIsLoadingSignatures] = useState(false);
  const [isSignatureModalOpen, setIsSignatureModalOpen] = useState(false);
  const [editingSignature, setEditingSignature] = useState<any | null>(null);
  const [signatureForm, setSignatureForm] = useState({ name: '', content: '', isDefault: false });
  const [isSavingSignature, setIsSavingSignature] = useState(false);
  const [deletingSignatureId, setDeletingSignatureId] = useState<string | null>(null);

  // Display preferences
  const [displayPreferences, setDisplayPreferences] = useState({
    layout: 'list', // 'list' | 'grid' | 'compact'
    density: 'comfortable', // 'comfortable' | 'compact' | 'spacious'
    emailFormat: 'html', // 'html' | 'plain' | 'rich'
    showPreview: true,
    previewLines: 3
  });

  useEffect(() => {
    loadSignatures();
    loadDisplayPreferences();
  }, []);

  const loadSignatures = async () => {
    setIsLoadingSignatures(true);
    try {
      const userId = currentUser?.id || JSON.parse(localStorage.getItem('user_data') || '{}').id;
      if (!userId) return;
      
      const response = await apiGetSignatures(userId);
      setSignatures(response.data || []);
    } catch (err: any) {
      console.error('Failed to load signatures:', err);
    } finally {
      setIsLoadingSignatures(false);
    }
  };

  const loadDisplayPreferences = () => {
    try {
      const saved = localStorage.getItem('user_display_preferences');
      if (saved) {
        setDisplayPreferences(JSON.parse(saved));
      }
    } catch (err) {
      console.error('Failed to load display preferences:', err);
    }
  };

  const saveDisplayPreferences = () => {
    try {
      localStorage.setItem('user_display_preferences', JSON.stringify(displayPreferences));
      showSuccess('Display preferences saved successfully');
    } catch (err) {
      showError('Failed to save display preferences');
    }
  };

  const handleSaveSignature = async () => {
    if (!signatureForm.name || !signatureForm.content) {
      showError('Name and content are required');
      return;
    }

    setIsSavingSignature(true);
    try {
      const userId = currentUser?.id || JSON.parse(localStorage.getItem('user_data') || '{}').id;
      if (!userId) {
        showError('Please log in to save signature');
        return;
      }

      if (editingSignature) {
        await apiUpdateSignature(editingSignature.id, {
          userId,
          ...signatureForm
        });
        showSuccess('Signature updated successfully');
      } else {
        await apiCreateSignature({
          userId,
          ...signatureForm
        });
        showSuccess('Signature created successfully');
      }

      setIsSignatureModalOpen(false);
      setEditingSignature(null);
      setSignatureForm({ name: '', content: '', isDefault: false });
      await loadSignatures();
    } catch (err: any) {
      showError(err.message || 'Failed to save signature');
    } finally {
      setIsSavingSignature(false);
    }
  };

  const handleDeleteSignature = async (signatureId: string) => {
    if (!confirm('Are you sure you want to delete this signature?')) return;

    setDeletingSignatureId(signatureId);
    try {
      const userId = currentUser?.id || JSON.parse(localStorage.getItem('user_data') || '{}').id;
      await apiDeleteSignature(signatureId, userId);
      showSuccess('Signature deleted successfully');
      await loadSignatures();
    } catch (err: any) {
      showError(err.message || 'Failed to delete signature');
    } finally {
      setDeletingSignatureId(null);
    }
  };

  const openSignatureModal = (signature?: any) => {
    if (signature) {
      setEditingSignature(signature);
      setSignatureForm({
        name: signature.name || '',
        content: signature.content || '',
        isDefault: signature.isDefault || false
      });
    } else {
      setEditingSignature(null);
      setSignatureForm({ name: '', content: '', isDefault: false });
    }
    setIsSignatureModalOpen(true);
  };

  return (
    <div className="space-y-6">
      {/* Signature Management */}
      <div className="bg-white p-6 lg:p-8 rounded-2xl border border-slate-200 shadow-sm space-y-6 text-left">
        <div className="flex items-center justify-between pb-4 border-b border-slate-100">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-indigo-100 rounded-xl flex items-center justify-center">
              <FileText className="w-5 h-5 text-indigo-600" />
            </div>
            <div>
              <h3 className="font-bold text-lg text-slate-900">Email Signatures</h3>
              <p className="text-xs text-slate-500">Manage your email signatures for replies and new emails</p>
            </div>
          </div>
          <button
            onClick={() => openSignatureModal()}
            className="px-4 py-2 bg-indigo-600 text-white text-sm font-bold rounded-xl hover:bg-indigo-700 transition-all flex items-center gap-2"
          >
            <Plus className="w-4 h-4" />
            Add Signature
          </button>
        </div>

        {isLoadingSignatures ? (
          <div className="p-8 text-center">
            <Loader2 className="w-6 h-6 animate-spin mx-auto text-indigo-600" />
          </div>
        ) : signatures.length === 0 ? (
          <div className="text-center py-8 text-slate-500">
            <FileText className="w-12 h-12 mx-auto mb-3 text-slate-300" />
            <p className="text-sm font-semibold">No signatures yet</p>
            <p className="text-xs mt-1">Create your first signature to get started</p>
          </div>
        ) : (
          <div className="space-y-3">
            {signatures.map((sig) => (
              <div
                key={sig.id}
                className="p-4 bg-slate-50 rounded-xl border border-slate-200 hover:border-indigo-300 transition-all"
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <h4 className="font-bold text-slate-900">{sig.name}</h4>
                      {sig.isDefault && (
                        <span className="px-2 py-0.5 bg-indigo-100 text-indigo-600 text-xs font-bold rounded">
                          Default
                        </span>
                      )}
                    </div>
                    <div
                      className="text-sm text-slate-600 prose prose-sm max-w-none"
                      dangerouslySetInnerHTML={{ __html: sig.content }}
                    />
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => openSignatureModal(sig)}
                      className="p-2 text-slate-400 hover:text-indigo-600 transition-colors"
                    >
                      <Edit2 className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleDeleteSignature(sig.id)}
                      disabled={deletingSignatureId === sig.id}
                      className="p-2 text-slate-400 hover:text-red-600 transition-colors disabled:opacity-50"
                    >
                      {deletingSignatureId === sig.id ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <Trash2 className="w-4 h-4" />
                      )}
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Display Preferences */}
      <div className="bg-white p-6 lg:p-8 rounded-2xl border border-slate-200 shadow-sm space-y-6 text-left">
        <div className="flex items-center gap-3 pb-4 border-b border-slate-100">
          <div className="w-10 h-10 bg-slate-100 rounded-xl flex items-center justify-center">
            <Layout className="w-5 h-5 text-slate-600" />
          </div>
          <div>
            <h3 className="font-bold text-lg text-slate-900">Display Preferences</h3>
            <p className="text-xs text-slate-500">Customize how content is displayed</p>
          </div>
        </div>

        <div className="space-y-6">
          <div className="space-y-2">
            <label className="text-xs font-bold text-slate-400 uppercase tracking-widest">
              Layout Style
            </label>
            <div className="grid grid-cols-3 gap-3">
              {['list', 'grid', 'compact'].map((layout) => (
                <button
                  key={layout}
                  onClick={() => setDisplayPreferences({ ...displayPreferences, layout })}
                  className={`p-4 rounded-xl border-2 transition-all ${
                    displayPreferences.layout === layout
                      ? 'border-indigo-600 bg-indigo-50'
                      : 'border-slate-200 hover:border-slate-300'
                  }`}
                >
                  <div className="text-sm font-semibold text-slate-900 capitalize">{layout}</div>
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-xs font-bold text-slate-400 uppercase tracking-widest">
              Density
            </label>
            <div className="grid grid-cols-3 gap-3">
              {['comfortable', 'compact', 'spacious'].map((density) => (
                <button
                  key={density}
                  onClick={() => setDisplayPreferences({ ...displayPreferences, density })}
                  className={`p-4 rounded-xl border-2 transition-all ${
                    displayPreferences.density === density
                      ? 'border-indigo-600 bg-indigo-50'
                      : 'border-slate-200 hover:border-slate-300'
                  }`}
                >
                  <div className="text-sm font-semibold text-slate-900 capitalize">{density}</div>
                </button>
              ))}
            </div>
          </div>

          <button
            onClick={saveDisplayPreferences}
            className="w-full px-6 py-3 bg-indigo-600 text-white font-bold rounded-xl flex items-center justify-center gap-2 hover:bg-indigo-700 transition-all shadow-lg"
          >
            <Save className="w-4 h-4" />
            Save Display Preferences
          </button>
        </div>
      </div>

      {/* Email Display Format Preferences */}
      <div className="bg-white p-6 lg:p-8 rounded-2xl border border-slate-200 shadow-sm space-y-6 text-left">
        <div className="flex items-center gap-3 pb-4 border-b border-slate-100">
          <div className="w-10 h-10 bg-slate-100 rounded-xl flex items-center justify-center">
            <Eye className="w-5 h-5 text-slate-600" />
          </div>
          <div>
            <h3 className="font-bold text-lg text-slate-900">Email Display Format</h3>
            <p className="text-xs text-slate-500">Choose how emails are displayed</p>
          </div>
        </div>

        <div className="space-y-6">
          <div className="space-y-2">
            <label className="text-xs font-bold text-slate-400 uppercase tracking-widest">
              Email Format
            </label>
            <select
              value={displayPreferences.emailFormat}
              onChange={(e) => setDisplayPreferences({ ...displayPreferences, emailFormat: e.target.value as any })}
              className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm"
            >
              <option value="html">HTML (Rich formatting)</option>
              <option value="plain">Plain Text</option>
              <option value="rich">Rich Text</option>
            </select>
          </div>

          <div className="flex items-center justify-between p-4 bg-slate-50 rounded-xl">
            <div>
              <label className="text-sm font-semibold text-slate-900">Show Email Preview</label>
              <p className="text-xs text-slate-500 mt-1">Display email preview in list view</p>
            </div>
            <button
              onClick={() => setDisplayPreferences({ ...displayPreferences, showPreview: !displayPreferences.showPreview })}
              className={`relative w-12 h-6 rounded-full transition-colors ${
                displayPreferences.showPreview ? 'bg-indigo-600' : 'bg-slate-300'
              }`}
            >
              <span
                className={`absolute top-1 left-1 w-4 h-4 bg-white rounded-full transition-transform ${
                  displayPreferences.showPreview ? 'translate-x-6' : 'translate-x-0'
                }`}
              />
            </button>
          </div>

          {displayPreferences.showPreview && (
            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-400 uppercase tracking-widest">
                Preview Lines
              </label>
              <input
                type="number"
                min="1"
                max="10"
                value={displayPreferences.previewLines}
                onChange={(e) => setDisplayPreferences({ ...displayPreferences, previewLines: parseInt(e.target.value) || 3 })}
                className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm"
              />
            </div>
          )}

          <button
            onClick={saveDisplayPreferences}
            className="w-full px-6 py-3 bg-indigo-600 text-white font-bold rounded-xl flex items-center justify-center gap-2 hover:bg-indigo-700 transition-all shadow-lg"
          >
            <Save className="w-4 h-4" />
            Save Email Format Preferences
          </button>
        </div>
      </div>

      {/* Signature Modal */}
      {isSignatureModalOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl shadow-xl max-w-2xl w-full p-6 space-y-4 text-left my-8">
            <div className="flex justify-between items-center">
              <h3 className="font-bold text-lg text-slate-900">
                {editingSignature ? 'Edit Signature' : 'Create Signature'}
              </h3>
              <button
                onClick={() => {
                  setIsSignatureModalOpen(false);
                  setEditingSignature(null);
                  setSignatureForm({ name: '', content: '', isDefault: false });
                }}
                className="p-2 hover:bg-slate-100 rounded-full text-slate-400 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                  Signature Name
                </label>
                <input
                  type="text"
                  value={signatureForm.name}
                  onChange={(e) => setSignatureForm({ ...signatureForm, name: e.target.value })}
                  placeholder="e.g. Professional, Personal"
                  className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                  Signature Content
                </label>
                <textarea
                  value={signatureForm.content}
                  onChange={(e) => setSignatureForm({ ...signatureForm, content: e.target.value })}
                  placeholder="Enter your signature (HTML supported)"
                  rows={8}
                  className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm resize-none font-mono"
                />
                <p className="text-xs text-slate-500">HTML is supported. Example: &lt;strong&gt;Name&lt;/strong&gt;&lt;br&gt;Title</p>
              </div>

              <div className="flex items-center justify-between p-4 bg-slate-50 rounded-xl">
                <div>
                  <label className="text-sm font-semibold text-slate-900">Set as Default</label>
                  <p className="text-xs text-slate-500 mt-1">Use this signature by default when composing emails</p>
                </div>
                <button
                  onClick={() => setSignatureForm({ ...signatureForm, isDefault: !signatureForm.isDefault })}
                  className={`relative w-12 h-6 rounded-full transition-colors ${
                    signatureForm.isDefault ? 'bg-indigo-600' : 'bg-slate-300'
                  }`}
                >
                  <span
                    className={`absolute top-1 left-1 w-4 h-4 bg-white rounded-full transition-transform ${
                      signatureForm.isDefault ? 'translate-x-6' : 'translate-x-0'
                    }`}
                  />
                </button>
              </div>
            </div>

            <div className="flex gap-3 pt-4 border-t border-slate-100">
              <button
                onClick={() => {
                  setIsSignatureModalOpen(false);
                  setEditingSignature(null);
                  setSignatureForm({ name: '', content: '', isDefault: false });
                }}
                className="flex-1 py-2.5 border border-slate-200 rounded-xl font-bold text-slate-600 hover:bg-slate-50 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveSignature}
                disabled={isSavingSignature || !signatureForm.name || !signatureForm.content}
                className="flex-1 py-2.5 bg-indigo-600 text-white rounded-xl font-bold shadow-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-indigo-700 transition-colors flex items-center justify-center gap-2"
              >
                {isSavingSignature ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Saving...
                  </>
                ) : (
                  <>
                    <Save className="w-4 h-4" />
                    {editingSignature ? 'Update' : 'Create'} Signature
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

const Settings: React.FC<SettingsProps> = ({ currentUser, onUserUpdate }) => {
  const { showSuccess, showError } = useToast();
  const [activeTab, setActiveTab] = useState<'profile' | 'notifications' | 'connections' | 'users' | 'workspace' | 'crm' | 'preferences'>('profile');
  const [preferences, setPreferences] = useState(DEFAULT_NOTIFICATION_PREFERENCES);
  const [isSyncing, setIsSyncing] = useState(false);
  const [excludedDomains, setExcludedDomains] = useState<any[]>([]);
  const [newDomain, setNewDomain] = useState('');
  const [isLoadingDomains, setIsLoadingDomains] = useState(false);
  const [isSavingDomain, setIsSavingDomain] = useState(false);
  
  const [isGoogleConnected, setIsGoogleConnected] = useState(false);
  const [googleUserEmail, setGoogleUserEmail] = useState<string | null>(null);
  const [isConnecting, setIsConnecting] = useState(false);
  const [isDisconnecting, setIsDisconnecting] = useState(false);

  const [users, setUsers] = useState<any[]>([]);
  const [isLoadingUsers, setIsLoadingUsers] = useState(false);
  const [userSearchQuery, setUserSearchQuery] = useState('');
  const [isUserModalOpen, setIsUserModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<any | null>(null);
  const [deletingUserId, setDeletingUserId] = useState<string | null>(null);
  const [deleteConfirmUser, setDeleteConfirmUser] = useState<any | null>(null);
  const [userFormData, setUserFormData] = useState({ 
    email: '', 
    name: '', 
    role: 'User',
    jobTitle: '',
    department: '',
    phone: '',
    bio: '',
    timezone: getSystemTimezone(), // Auto-detect system timezone
    language: 'English'
  });
  const [isSavingUser, setIsSavingUser] = useState(false);

  const [confirmModal, setConfirmModal] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    confirmText?: string;
    cancelText?: string;
    onConfirm: () => void;
    type?: 'danger' | 'warning' | 'info';
  }>({
    isOpen: false,
    title: '',
    message: '',
    confirmText: 'Confirm',
    cancelText: 'Cancel',
    onConfirm: () => {},
    type: 'info'
  });
  
  const [profileData, setProfileData] = useState({
    name: '',
    email: '',
    avatar: '',
    phone: '',
    jobTitle: '',
    department: '',
    bio: '',
    timezone: getSystemTimezone(), // Auto-detect system timezone
    language: 'English'
  });
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [avatarPreview, setAvatarPreview] = useState<string>('');
  const [isProcessingAvatar, setIsProcessingAvatar] = useState(false);
  const [isCropModalOpen, setIsCropModalOpen] = useState(false);
  const [imageToCrop, setImageToCrop] = useState<string>('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [industries, setIndustries] = useState<{ id: string; name: string; usageCount?: number }[]>([]);
  const [industriesLoading, setIndustriesLoading] = useState(false);
  const [industryModal, setIndustryModal] = useState<{ open: boolean; industry?: { id: string; name: string }; name: string }>({ open: false, name: '' });
  const [savingIndustry, setSavingIndustry] = useState(false);

  const togglePref = (id: string, type: 'inApp' | 'email') => {
    setPreferences(prev => prev.map(p => p.id === id ? { ...p, [type]: !p[type] } : p));
  };

  useEffect(() => {
    const checkGoogleConnection = async () => {
      const userId = currentUser?.id || JSON.parse(localStorage.getItem('user_data') || '{}').id;
      if (!userId) return;
      try {
        const response = await apiGetGoogleCalendarStatus(userId);
        setIsGoogleConnected(response.connected || false);
        setGoogleUserEmail(response.userEmail || null);
      } catch (err) {
        setIsGoogleConnected(false);
      }
    };
    if (activeTab === 'connections') checkGoogleConnection();
  }, [activeTab, currentUser]);

  const fetchUsers = async () => {
    setIsLoadingUsers(true);
    try {
      const response = await apiGetUsers(userSearchQuery || undefined);
      setUsers(response.data || []);
    } catch (err) {
      setUsers([]);
    } finally {
      setIsLoadingUsers(false);
    }
  };

  useEffect(() => {
    if (activeTab === 'users') fetchUsers();
  }, [activeTab, userSearchQuery]);

  const fetchIndustries = async () => {
    setIndustriesLoading(true);
    try {
      const res = await apiGetIndustries();
      setIndustries(res?.data || []);
    } catch {
      setIndustries([]);
    } finally {
      setIndustriesLoading(false);
    }
  };
  useEffect(() => {
    if (activeTab === 'crm') fetchIndustries();
  }, [activeTab]);

  // Load notification preferences when notifications tab is opened
  useEffect(() => {
    const loadNotificationPreferences = async () => {
      if (activeTab === 'notifications') {
        try {
          const userId = currentUser?.id || JSON.parse(localStorage.getItem('user_data') || '{}').id;
          if (!userId) return;
          
          const response = await apiGetNotificationPreferences(userId);
          const savedPreferences = response.data || [];
          
          // Merge saved preferences with defaults (saved preferences take precedence)
          if (savedPreferences.length > 0) {
            const mergedPreferences = DEFAULT_NOTIFICATION_PREFERENCES.map(defaultPref => {
              const savedPref = savedPreferences.find((sp: any) => sp.id === defaultPref.id);
              return savedPref || defaultPref;
            });
            setPreferences(mergedPreferences);
          } else {
            // No saved preferences, use defaults
            setPreferences(DEFAULT_NOTIFICATION_PREFERENCES);
          }
        } catch (err) {
          // If error (e.g., user not found or no preferences), use defaults
          console.error('[SETTINGS] Failed to load notification preferences:', err);
          setPreferences(DEFAULT_NOTIFICATION_PREFERENCES);
        }
      }
    };
    loadNotificationPreferences();
  }, [activeTab, currentUser]);

  const handleConnectGoogle = async () => {
    setIsConnecting(true);
    try {
      const userId = currentUser?.id || JSON.parse(localStorage.getItem('user_data') || '{}').id;
      const response = await apiGetGoogleCalendarAuthUrl(userId);
      if (response.authUrl) window.location.href = response.authUrl;
    } catch (err: any) {
      showError('Failed to connect Google Calendar');
      setIsConnecting(false);
    }
  };

  const handleDisconnectGoogle = async () => {
    setIsDisconnecting(true);
    try {
      const userId = currentUser?.id || JSON.parse(localStorage.getItem('user_data') || '{}').id;
      await apiDisconnectGoogleCalendar(userId);
      setIsGoogleConnected(false);
      setGoogleUserEmail(null);
      showSuccess('Google account disconnected successfully');
    } catch (err: any) {
      showError('Failed to disconnect Google account');
    } finally {
      setIsDisconnecting(false);
    }
  };

  useEffect(() => {
    const loadUserData = async () => {
      let user = currentUser || JSON.parse(localStorage.getItem('user_data') || 'null');
      if (user) {
        const systemTimezone = getSystemTimezone();
        setProfileData({
          name: user.name || '',
          email: user.email || '',
          avatar: user.avatar || '',
          phone: user.phone || '',
          jobTitle: user.jobTitle || '',
          department: user.department || '',
          bio: user.bio || '',
          timezone: user.timezone || systemTimezone, // Use system timezone if not set
          language: user.language || 'English'
        });
        setAvatarPreview(user.avatar || '');
      }
    };
    loadUserData();
  }, [currentUser]);

  // Helper function to compress and resize image
  const compressImage = (file: File, maxWidth: number = 400, maxHeight: number = 400, quality: number = 0.8): Promise<string> => {
    return new Promise((resolve, reject) => {
      // Check file size first (5MB limit before compression)
      const maxFileSize = 5 * 1024 * 1024; // 5MB
      if (file.size > maxFileSize) {
        reject(new Error('Image file is too large. Please use an image smaller than 5MB.'));
        return;
      }

      const reader = new FileReader();
      reader.onload = (e) => {
        const img = new Image();
        img.onload = () => {
          // Calculate new dimensions
          let width = img.width;
          let height = img.height;

          if (width > height) {
            if (width > maxWidth) {
              height = (height * maxWidth) / width;
              width = maxWidth;
            }
          } else {
            if (height > maxHeight) {
              width = (width * maxHeight) / height;
              height = maxHeight;
            }
          }

          // Create canvas and compress
          const canvas = document.createElement('canvas');
          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');
          
          if (!ctx) {
            reject(new Error('Failed to create canvas context'));
            return;
          }

          ctx.drawImage(img, 0, 0, width, height);
          
          // Convert to base64 with compression
          const compressedDataUrl = canvas.toDataURL('image/jpeg', quality);
          
          // Check if compressed size is still too large (Firestore limit is ~1MB)
          const base64Size = compressedDataUrl.length;
          const maxBase64Size = 900000; // ~900KB to be safe (base64 is ~33% larger than binary)
          
          if (base64Size > maxBase64Size) {
            // Try again with lower quality
            if (quality > 0.5) {
              compressImage(file, maxWidth, maxHeight, quality - 0.1)
                .then(resolve)
                .catch(reject);
              return;
            } else {
              reject(new Error('Image is too large even after compression. Please use a smaller image.'));
              return;
            }
          }

          resolve(compressedDataUrl);
        };
        img.onerror = () => reject(new Error('Failed to load image'));
        img.src = e.target?.result as string;
      };
      reader.onerror = () => reject(new Error('Failed to read file'));
      reader.readAsDataURL(file);
    });
  };

  const handleAvatarChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      showError('Please select a valid image file.');
      return;
    }

    setError(null);
    
    try {
      // Read file and show crop modal
      const reader = new FileReader();
      reader.onload = (event) => {
        const imageSrc = event.target?.result as string;
        setImageToCrop(imageSrc);
        setIsCropModalOpen(true);
      };
      reader.onerror = () => {
        showError('Failed to read image file.');
      };
      reader.readAsDataURL(file);
    } catch (err: any) {
      const errorMessage = err.message || 'Failed to load image. Please try a different image.';
      showError(errorMessage);
      setError(errorMessage);
      // Reset file input
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleCropComplete = async (croppedImage: string) => {
    setIsCropModalOpen(false);
    setIsProcessingAvatar(true);
    
    try {
      // Convert base64 to blob, then to file for compression
      const response = await fetch(croppedImage);
      const blob = await response.blob();
      const file = new File([blob], 'cropped-image.jpg', { type: 'image/jpeg' });
      
      // Compress the cropped image
      const compressedDataUrl = await compressImage(file, 400, 400, 0.8);
      setAvatarPreview(compressedDataUrl);
      setProfileData(prev => ({ ...prev, avatar: compressedDataUrl }));
      showSuccess('Image cropped and loaded successfully. Click "Save Changes" to update your profile.');
    } catch (err: any) {
      const errorMessage = err.message || 'Failed to process cropped image.';
      showError(errorMessage);
      setError(errorMessage);
    } finally {
      setIsProcessingAvatar(false);
      // Reset file input
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleCropCancel = () => {
    setIsCropModalOpen(false);
    setImageToCrop('');
    // Reset file input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleSaveChanges = async () => {
    if (!profileData.name.trim()) {
      setError('Full name is required.');
      return;
    }
    setIsSaving(true);
    try {
      const userId = currentUser?.id || JSON.parse(localStorage.getItem('user_data') || '{}').id;
      const response = await apiUpdateUserProfile(userId, profileData);
      const updatedUser = response.data || response;
      localStorage.setItem('user_data', JSON.stringify(updatedUser));
      onUserUpdate(updatedUser);
      showSuccess('Profile updated successfully!');
      setError(null);
    } catch (err: any) {
      showError('Failed to update profile.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="w-full space-y-8 animate-in fade-in duration-500 pb-20">
      <div className="flex justify-between items-end">
        <div>
          <h1 className="text-2xl font-bold text-left">Settings</h1>
          <p className="text-slate-500 text-sm">Manage your personal account and workspace preferences</p>
        </div>
        {activeTab === 'profile' && (
          <button 
            onClick={handleSaveChanges}
            disabled={isSaving}
            className="px-6 py-2.5 bg-indigo-600 text-white font-bold rounded-xl flex items-center gap-2 hover:bg-indigo-700 transition-all shadow-lg active:scale-95 disabled:opacity-50"
          >
            {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            Save Changes
          </button>
        )}
      </div>

      <div className="flex flex-col lg:flex-row gap-8">
        <aside className="w-full lg:w-64 space-y-1">
          {[
            { id: 'profile', label: 'Profile Settings', icon: <User className="w-4 h-4" /> },
            { id: 'notifications', label: 'Notifications', icon: <Bell className="w-4 h-4" /> },
            { id: 'preferences', label: 'User Preferences', icon: <SettingsIcon className="w-4 h-4" /> },
            { id: 'connections', label: 'Connections & Sync', icon: <Link2 className="w-4 h-4" /> },
            { id: 'users', label: 'Team Management', icon: <Users className="w-4 h-4" /> },
            { id: 'workspace', label: 'Workspace Settings', icon: <Database className="w-4 h-4" /> },
            { id: 'crm', label: 'CRM', icon: <Building2 className="w-4 h-4" /> },
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl font-semibold text-sm transition-all ${
                activeTab === tab.id ? 'bg-white text-indigo-600 shadow-sm border border-slate-200' : 'text-slate-500 hover:text-slate-900 hover:bg-slate-100'
              }`}
            >
              {tab.icon}
              {tab.label}
            </button>
          ))}
        </aside>

        <div className="flex-1 space-y-6">
          {activeTab === 'profile' && (
            <div className="bg-white p-6 lg:p-8 rounded-2xl border border-slate-200 shadow-sm space-y-8 text-left">
              {error && <div className="bg-red-50 border border-red-200 text-red-600 text-sm p-4 rounded-xl">{error}</div>}
              
              <div className="flex items-center gap-6 pb-8 border-b border-slate-100">
                <div className="relative group">
                  <ImageWithFallback
                    src={avatarPreview}
                    alt={profileData.name || 'User'}
                    fallbackText={profileData.name || profileData.email || 'U'}
                    className="w-24 h-24 shadow-lg border-2 border-white object-cover"
                    isAvatar={true}
                  />
                  {isProcessingAvatar && (
                    <div className="absolute inset-0 bg-black/60 rounded-3xl flex items-center justify-center z-10">
                      <Loader2 className="w-6 h-6 text-white animate-spin" />
                    </div>
                  )}
                  <button 
                    onClick={() => fileInputRef.current?.click()}
                    disabled={isProcessingAvatar}
                    className="absolute inset-0 bg-black/40 rounded-3xl opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white disabled:opacity-60 disabled:cursor-not-allowed"
                  >
                    <Upload className="w-6 h-6" />
                  </button>
                  <input ref={fileInputRef} type="file" accept="image/*" onChange={handleAvatarChange} className="hidden" disabled={isProcessingAvatar} />
                </div>
                <div>
                  <h3 className="font-bold text-xl text-slate-900">{profileData.name || 'Set Name'}</h3>
                  <p className="text-slate-500 text-sm">{profileData.jobTitle || 'No Title'} • {profileData.department || 'No Dept'}</p>
                  <p className="text-slate-400 text-xs mt-1">{profileData.email}</p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Full Name</label>
                  <input type="text" value={profileData.name} onChange={e => setProfileData({...profileData, name: e.target.value})} className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm" />
                </div>
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Job Title</label>
                  <div className="relative">
                    <Briefcase className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <input type="text" value={profileData.jobTitle} onChange={e => setProfileData({...profileData, jobTitle: e.target.value})} className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm" placeholder="e.g. Senior Logistics Analyst" />
                  </div>
                </div>
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Department</label>
                  <input type="text" value={profileData.department} onChange={e => setProfileData({...profileData, department: e.target.value})} className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm" placeholder="e.g. Operations" />
                </div>
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Phone Number</label>
                  <input type="tel" value={profileData.phone} onChange={e => setProfileData({...profileData, phone: e.target.value})} className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm" placeholder="+1 555-0000" />
                </div>
                <div className="space-y-1.5 md:col-span-2">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Professional Bio</label>
                  <textarea value={profileData.bio} onChange={e => setProfileData({...profileData, bio: e.target.value})} className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm min-h-[100px] resize-none" placeholder="Tell the team a bit about yourself..." />
                </div>
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest flex items-center gap-2"><Globe2 className="w-3.5 h-3.5" /> Timezone</label>
                  <select value={profileData.timezone} onChange={e => setProfileData({...profileData, timezone: e.target.value})} className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm">
                    {TIMEZONES.map(tz => (
                      <option key={tz.value} value={tz.value}>{tz.label}</option>
                    ))}
                  </select>
                </div>
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest flex items-center gap-2">Language</label>
                  <select value={profileData.language} onChange={e => setProfileData({...profileData, language: e.target.value})} className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm">
                    {LANGUAGES.map(lang => (
                      <option key={lang.value} value={lang.value}>{lang.label}</option>
                    ))}
                  </select>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'notifications' && (
            <div className="bg-white p-6 lg:p-8 rounded-2xl border border-slate-200 shadow-sm space-y-6 text-left">
              <div className="pb-6 border-b border-slate-100">
                <h3 className="font-bold text-xl text-slate-900 mb-2">Notification Preferences</h3>
                <p className="text-slate-500 text-sm">Choose how you want to be notified about important updates and activities.</p>
              </div>
              
              <div className="space-y-4">
                {preferences.map((pref) => (
                  <div key={pref.id} className="p-5 bg-slate-50 rounded-xl border border-slate-200 hover:border-indigo-300 transition-all">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1">
                        <h4 className="font-bold text-slate-900 text-sm mb-1">{pref.label}</h4>
                        <p className="text-xs text-slate-500">{pref.description}</p>
                      </div>
                      <div className="flex items-center gap-6">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-semibold text-slate-600">In-App</span>
                          <button
                            onClick={() => togglePref(pref.id, 'inApp')}
                            className={`relative w-11 h-6 rounded-full transition-colors ${
                              pref.inApp ? 'bg-indigo-600' : 'bg-slate-300'
                            }`}
                          >
                            <span
                              className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full transition-transform ${
                                pref.inApp ? 'translate-x-5' : 'translate-x-0'
                              }`}
                            />
                          </button>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-semibold text-slate-600">Email</span>
                          <button
                            onClick={() => togglePref(pref.id, 'email')}
                            className={`relative w-11 h-6 rounded-full transition-colors ${
                              pref.email ? 'bg-indigo-600' : 'bg-slate-300'
                            }`}
                          >
                            <span
                              className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full transition-transform ${
                                pref.email ? 'translate-x-5' : 'translate-x-0'
                              }`}
                            />
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              <div className="pt-4 border-t border-slate-100">
                <button
                  onClick={async () => {
                    try {
                      const userId = currentUser?.id || JSON.parse(localStorage.getItem('user_data') || '{}').id;
                      if (!userId) {
                        showError('Please log in to save preferences.');
                        return;
                      }
                      
                      await apiUpdateNotificationPreferences(userId, preferences);
                      showSuccess('Notification preferences saved successfully!');
                    } catch (err: any) {
                      console.error('[SETTINGS] Failed to save notification preferences:', err);
                      showError(err.message || 'Failed to save notification preferences.');
                    }
                  }}
                  className="px-6 py-2.5 bg-indigo-600 text-white font-bold rounded-xl flex items-center gap-2 hover:bg-indigo-700 transition-all shadow-lg active:scale-95"
                >
                  <Save className="w-4 h-4" /> Save Preferences
                </button>
              </div>
            </div>
          )}

          {activeTab === 'connections' && (
            <div className="space-y-6">
              {/* Google Integration */}
              <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
                <div className="p-6 border-b border-slate-100 bg-gradient-to-r from-blue-50 to-indigo-50">
                  <div className="flex items-center gap-4">
                    <div className="w-14 h-14 rounded-2xl bg-white shadow-md flex items-center justify-center">
                      <svg className="w-8 h-8" viewBox="0 0 48 48">
                        <path fill="#FFC107" d="M43.611,20.083H42V20H24v8h11.303c-1.649,4.657-6.08,8-11.303,8c-6.627,0-12-5.373-12-12c0-6.627,5.373-12,12-12c3.059,0,5.842,1.154,7.961,3.039l5.657-5.657C34.046,6.053,29.268,4,24,4C12.955,4,4,12.955,4,24c0,11.045,8.955,20,20,20c11.045,0,20-8.955,20-20C44,22.659,43.862,21.35,43.611,20.083z"/>
                        <path fill="#FF3D00" d="M6.306,14.691l6.571,4.819C14.655,15.108,18.961,12,24,12c3.059,0,5.842,1.154,7.961,3.039l5.657-5.657C34.046,6.053,29.268,4,24,4C16.318,4,9.656,8.337,6.306,14.691z"/>
                        <path fill="#4CAF50" d="M24,44c5.166,0,9.86-1.977,13.409-5.192l-6.19-5.238C29.211,35.091,26.715,36,24,36c-5.202,0-9.619-3.317-11.283-7.946l-6.522,5.025C9.505,39.556,16.227,44,24,44z"/>
                        <path fill="#1976D2" d="M43.611,20.083H42V20H24v8h11.303c-0.792,2.237-2.231,4.166-4.087,5.571c0.001-0.001,0.002-0.001,0.003-0.002l6.19,5.238C36.971,39.205,44,34,44,24C44,22.659,43.862,21.35,43.611,20.083z"/>
                      </svg>
                    </div>
                    <div className="flex-1">
                      <h3 className="text-xl font-black text-slate-900">Google Workspace</h3>
                      <p className="text-sm text-slate-500 font-medium mt-0.5">
                        Connect your Google account to sync Calendar, Drive, Docs, and Gmail
                      </p>
                    </div>
                  </div>
                </div>

                <div className="p-6">
                  {isGoogleConnected ? (
                    <div className="space-y-6">
                      {/* Connection Status */}
                      <div className="p-4 bg-emerald-50 border-2 border-emerald-200 rounded-xl">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                            <div>
                              <p className="text-sm font-bold text-emerald-900">Connected</p>
                              {googleUserEmail && (
                                <p className="text-xs text-emerald-700 mt-0.5">{googleUserEmail}</p>
                              )}
                            </div>
                          </div>
                          <button
                            onClick={handleDisconnectGoogle}
                            disabled={isDisconnecting}
                            className="px-4 py-2 bg-red-600 text-white text-xs font-bold uppercase tracking-widest rounded-lg hover:bg-red-700 transition-all disabled:opacity-50 flex items-center gap-2"
                          >
                            {isDisconnecting ? (
                              <>
                                <Loader2 className="w-3 h-3 animate-spin" />
                                Disconnecting...
                              </>
                            ) : (
                              'Disconnect'
                            )}
                          </button>
                        </div>
                      </div>

                      {/* Services Enabled */}
                      <div>
                        <h4 className="text-sm font-black text-slate-900 mb-4">Connected Services</h4>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div className="p-4 bg-slate-50 rounded-xl border border-slate-200">
                            <div className="flex items-center gap-3 mb-2">
                              <div className="w-8 h-8 rounded-lg bg-blue-100 flex items-center justify-center">
                                <Calendar className="w-4 h-4 text-blue-600" />
                              </div>
                              <span className="font-bold text-slate-900">Google Calendar</span>
                            </div>
                            <p className="text-xs text-slate-600">Sync events and schedules</p>
                          </div>

                          <div className="p-4 bg-slate-50 rounded-xl border border-slate-200">
                            <div className="flex items-center gap-3 mb-2">
                              <div className="w-8 h-8 rounded-lg bg-green-100 flex items-center justify-center">
                                <svg className="w-4 h-4 text-green-600" viewBox="0 0 24 24" fill="currentColor">
                                  <path d="M19.35 10.04C18.67 6.59 15.64 4 12 4c-1.48 0-2.85.43-4.01 1.17l1.46 1.46C10.21 6.23 11.08 6 12 6c3.04 0 5.5 2.46 5.5 5.5v.5H19c1.66 0 3 1.34 3 3 0 1.13-.64 2.11-1.56 2.62l1.45 1.45C23.16 18.16 24 16.68 24 15c0-2.64-2.05-4.78-4.65-4.96zM3 5.27l2.75 2.74C2.56 8.15 0 10.77 0 14c0 3.31 2.69 6 6 6h11.73l2 2L21 20.73 4.27 4 3 5.27zM7.73 10l8 8H6c-2.21 0-4-1.79-4-4s1.79-4 4-4h1.73z"/>
                                </svg>
                              </div>
                              <span className="font-bold text-slate-900">Google Drive</span>
                            </div>
                            <p className="text-xs text-slate-600">Store and access documents</p>
                          </div>

                          <div className="p-4 bg-slate-50 rounded-xl border border-slate-200">
                            <div className="flex items-center gap-3 mb-2">
                              <div className="w-8 h-8 rounded-lg bg-indigo-100 flex items-center justify-center">
                                <svg className="w-4 h-4 text-indigo-600" viewBox="0 0 24 24" fill="currentColor">
                                  <path d="M14,2H6A2,2 0 0,0 4,4V20A2,2 0 0,0 6,22H18A2,2 0 0,0 20,20V8L14,2M18,20H6V4H13V9H18V20Z"/>
                                </svg>
                              </div>
                              <span className="font-bold text-slate-900">Google Docs</span>
                            </div>
                            <p className="text-xs text-slate-600">Create and sign documents</p>
                          </div>

                          <div className="p-4 bg-slate-50 rounded-xl border border-slate-200">
                            <div className="flex items-center gap-3 mb-2">
                              <div className="w-8 h-8 rounded-lg bg-red-100 flex items-center justify-center">
                                <Mail className="w-4 h-4 text-red-600" />
                              </div>
                              <span className="font-bold text-slate-900">Gmail</span>
                            </div>
                            <p className="text-xs text-slate-600">Access email communications</p>
                          </div>
                        </div>
                      </div>

                      {/* Permissions Info */}
                      <div className="p-4 bg-blue-50 border border-blue-200 rounded-xl">
                        <div className="flex items-start gap-3">
                          <Shield className="w-5 h-5 text-blue-600 shrink-0 mt-0.5" />
                          <div>
                            <p className="text-sm font-bold text-blue-900 mb-1">Permissions Granted</p>
                            <ul className="text-xs text-blue-800 space-y-1">
                              <li>• View and manage calendar events</li>
                              <li>• Create, view, and manage files in Google Drive</li>
                              <li>• Create and edit documents in Google Docs</li>
                              <li>• Read email messages from Gmail</li>
                            </ul>
                          </div>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-6">
                      {/* Not Connected */}
                      <div className="text-center py-8">
                        <div className="w-16 h-16 rounded-full bg-slate-100 flex items-center justify-center mx-auto mb-4">
                          <Link2 className="w-8 h-8 text-slate-400" />
                        </div>
                        <h4 className="text-lg font-bold text-slate-900 mb-2">Not Connected</h4>
                        <p className="text-sm text-slate-600 max-w-md mx-auto mb-6">
                          Connect your Google account to unlock powerful integrations with Calendar, Drive, Docs, and Gmail
                        </p>
                        <button
                          onClick={handleConnectGoogle}
                          disabled={isConnecting}
                          className="px-6 py-3 bg-indigo-600 text-white font-bold text-sm rounded-xl hover:bg-indigo-700 transition-all shadow-lg disabled:opacity-50 inline-flex items-center gap-2"
                        >
                          {isConnecting ? (
                            <>
                              <Loader2 className="w-4 h-4 animate-spin" />
                              Connecting...
                            </>
                          ) : (
                            <>
                              <svg className="w-5 h-5" viewBox="0 0 48 48">
                                <path fill="#FFC107" d="M43.611,20.083H42V20H24v8h11.303c-1.649,4.657-6.08,8-11.303,8c-6.627,0-12-5.373-12-12c0-6.627,5.373-12,12-12c3.059,0,5.842,1.154,7.961,3.039l5.657-5.657C34.046,6.053,29.268,4,24,4C12.955,4,4,12.955,4,24c0,11.045,8.955,20,20,20c11.045,0,20-8.955,20-20C44,22.659,43.862,21.35,43.611,20.083z"/>
                                <path fill="#FF3D00" d="M6.306,14.691l6.571,4.819C14.655,15.108,18.961,12,24,12c3.059,0,5.842,1.154,7.961,3.039l5.657-5.657C34.046,6.053,29.268,4,24,4C16.318,4,9.656,8.337,6.306,14.691z"/>
                                <path fill="#4CAF50" d="M24,44c5.166,0,9.86-1.977,13.409-5.192l-6.19-5.238C29.211,35.091,26.715,36,24,36c-5.202,0-9.619-3.317-11.283-7.946l-6.522,5.025C9.505,39.556,16.227,44,24,44z"/>
                                <path fill="#1976D2" d="M43.611,20.083H42V20H24v8h11.303c-0.792,2.237-2.231,4.166-4.087,5.571c0.001-0.001,0.002-0.001,0.003-0.002l6.19,5.238C36.971,39.205,44,34,44,24C44,22.659,43.862,21.35,43.611,20.083z"/>
                              </svg>
                              Connect with Google
                            </>
                          )}
                        </button>
                      </div>

                      {/* Features Preview */}
                      <div>
                        <h4 className="text-sm font-black text-slate-900 mb-4">What You'll Get</h4>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                          <div className="flex items-start gap-3 p-3 bg-slate-50 rounded-lg">
                            <Calendar className="w-5 h-5 text-indigo-600 shrink-0 mt-0.5" />
                            <div>
                              <p className="text-sm font-bold text-slate-900">Calendar Sync</p>
                              <p className="text-xs text-slate-600 mt-0.5">Sync events and manage schedules</p>
                            </div>
                          </div>
                          <div className="flex items-start gap-3 p-3 bg-slate-50 rounded-lg">
                            <svg className="w-5 h-5 text-indigo-600 shrink-0 mt-0.5" viewBox="0 0 24 24" fill="currentColor">
                              <path d="M19.35 10.04C18.67 6.59 15.64 4 12 4c-1.48 0-2.85.43-4.01 1.17l1.46 1.46C10.21 6.23 11.08 6 12 6c3.04 0 5.5 2.46 5.5 5.5v.5H19c1.66 0 3 1.34 3 3 0 1.13-.64 2.11-1.56 2.62l1.45 1.45C23.16 18.16 24 16.68 24 15c0-2.64-2.05-4.78-4.65-4.96zM3 5.27l2.75 2.74C2.56 8.15 0 10.77 0 14c0 3.31 2.69 6 6 6h11.73l2 2L21 20.73 4.27 4 3 5.27zM7.73 10l8 8H6c-2.21 0-4-1.79-4-4s1.79-4 4-4h1.73z"/>
                            </svg>
                            <div>
                              <p className="text-sm font-bold text-slate-900">Drive Storage</p>
                              <p className="text-xs text-slate-600 mt-0.5">Store contracts and documents</p>
                            </div>
                          </div>
                          <div className="flex items-start gap-3 p-3 bg-slate-50 rounded-lg">
                            <svg className="w-5 h-5 text-indigo-600 shrink-0 mt-0.5" viewBox="0 0 24 24" fill="currentColor">
                              <path d="M14,2H6A2,2 0 0,0 4,4V20A2,2 0 0,0 6,22H18A2,2 0 0,0 20,20V8L14,2M18,20H6V4H13V9H18V20Z"/>
                            </svg>
                            <div>
                              <p className="text-sm font-bold text-slate-900">Document Signing</p>
                              <p className="text-xs text-slate-600 mt-0.5">E-signature via Google Docs</p>
                            </div>
                          </div>
                          <div className="flex items-start gap-3 p-3 bg-slate-50 rounded-lg">
                            <Mail className="w-5 h-5 text-indigo-600 shrink-0 mt-0.5" />
                            <div>
                              <p className="text-sm font-bold text-slate-900">Gmail Access</p>
                              <p className="text-xs text-slate-600 mt-0.5">View email communications</p>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Security Note */}
              <div className="bg-amber-50 border-2 border-amber-200 rounded-xl p-6">
                <div className="flex items-start gap-4">
                  <Shield className="w-6 h-6 text-amber-600 shrink-0 mt-0.5" />
                  <div>
                    <h4 className="text-sm font-black text-amber-900 mb-2">Security & Privacy</h4>
                    <ul className="text-xs text-amber-800 space-y-1">
                      <li>• Your data is encrypted and securely stored</li>
                      <li>• We only request the minimum permissions needed</li>
                      <li>• You can disconnect at any time</li>
                      <li>• We never share your data with third parties</li>
                    </ul>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'users' && (
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden text-left">
              <div className="p-6 border-b border-slate-100 bg-slate-50/50 flex justify-between items-center">
                <h3 className="font-bold text-slate-900">Team Management</h3>
                <button onClick={() => { 
                  setEditingUser(null); 
                  setUserFormData({ 
                    email: '', 
                    name: '', 
                    role: 'User',
                    jobTitle: '',
                    department: '',
                    phone: '',
                    bio: '',
                    timezone: getSystemTimezone(),
                    language: 'English'
                  }); 
                  setIsUserModalOpen(true); 
                }} className="px-4 py-2 bg-indigo-600 text-white text-xs font-bold rounded-lg flex items-center gap-2 shadow-md">
                  <UserPlus className="w-4 h-4" /> Add User
                </button>
              </div>
              <div className="p-4 border-b border-slate-100">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <input type="text" placeholder="Search team members..." value={userSearchQuery} onChange={e => setUserSearchQuery(e.target.value)} className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm" />
                </div>
              </div>
              <div className="divide-y divide-slate-100">
                {isLoadingUsers ? <div className="p-8 text-center"><Loader2 className="w-6 h-6 animate-spin mx-auto text-indigo-600" /></div> : users.map(user => (
                  <div key={user.id} className="p-4 flex items-center justify-between hover:bg-slate-50 transition-colors">
                    <div className="flex items-center gap-3">
                      <ImageWithFallback
                        src={user.avatar}
                        alt={user.name || ''}
                        fallbackText={user.name || user.email || 'U'}
                        className="w-10 h-10 border"
                        isAvatar={true}
                      />
                      <div>
                        <p className="font-bold text-slate-900 text-sm">{user.name}</p>
                        <p className="text-xs text-slate-500">{user.email} • <span className="font-bold text-indigo-600">{user.role}</span></p>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <button onClick={() => { 
                        setEditingUser(user); 
                        setUserFormData({ 
                          email: user.email, 
                          name: user.name, 
                          role: user.role || 'User',
                          jobTitle: user.jobTitle || '',
                          department: user.department || '',
                          phone: user.phone || '',
                          bio: user.bio || '',
                          timezone: user.timezone || getSystemTimezone(),
                          language: user.language || 'English'
                        }); 
                        setIsUserModalOpen(true); 
                      }} className="p-2 text-slate-400 hover:text-indigo-600"><Edit2 className="w-4 h-4" /></button>
                      <button 
                        onClick={() => setDeleteConfirmUser(user)}
                        className="p-2 text-slate-400 hover:text-red-600"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {activeTab === 'preferences' && (
            <UserPreferencesTab 
              currentUser={currentUser}
              showSuccess={showSuccess}
              showError={showError}
            />
          )}

          {activeTab === 'workspace' && (
            <WorkspaceSettingsTab 
              currentUser={currentUser}
              showSuccess={showSuccess}
              showError={showError}
            />
          )}

          {activeTab === 'crm' && (
            <div className="space-y-6">
              <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
                <div className="p-6 border-b border-slate-100 bg-gradient-to-r from-slate-50 to-indigo-50/30">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-xl bg-white shadow-sm flex items-center justify-center">
                      <Building2 className="w-6 h-6 text-indigo-600" />
                    </div>
                    <div>
                      <h3 className="text-lg font-bold text-slate-900">CRM Settings</h3>
                      <p className="text-sm text-slate-500 mt-0.5">Manage industries for company imports and CRM data.</p>
                    </div>
                  </div>
                </div>
                <div className="p-6">
                  <h4 className="text-sm font-bold text-slate-700 mb-3">Industries</h4>
                  <p className="text-xs text-slate-500 mb-4">Industries are used when uploading companies. Add any industry that may appear in your company import files. Only admins can add, edit, or delete.</p>
                  {industriesLoading ? (
                    <div className="flex items-center gap-2 text-slate-500 py-6">
                      <Loader2 className="w-5 h-5 animate-spin" />
                      <span className="text-sm">Loading industries...</span>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {(currentUser?.role === 'Admin') && (
                        <button
                          type="button"
                          onClick={() => setIndustryModal({ open: true, name: '' })}
                          className="flex items-center gap-2 px-4 py-2.5 bg-indigo-600 text-white rounded-xl text-sm font-semibold hover:bg-indigo-700 transition-colors"
                        >
                          <Plus className="w-4 h-4" />
                          Add industry
                        </button>
                      )}
                      {industries.length === 0 ? (
                        <p className="text-sm text-slate-500 py-4">No industries yet. Add one to use with company uploads.</p>
                      ) : (
                        <ul className="divide-y divide-slate-100">
                          {industries.map((ind) => (
                            <li key={ind.id} className="flex items-center justify-between py-3 px-3 rounded-lg hover:bg-slate-50">
                              <div>
                                <span className="font-medium text-slate-900">{ind.name}</span>
                                {ind.usageCount !== undefined && (
                                  <span className="text-xs text-slate-400 ml-2">({ind.usageCount} companies)</span>
                                )}
                              </div>
                              {currentUser?.role === 'Admin' && (
                                <div className="flex items-center gap-2">
                                  <button
                                    type="button"
                                    onClick={() => setIndustryModal({ open: true, industry: ind, name: ind.name })}
                                    className="p-2 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
                                    title="Edit"
                                  >
                                    <Edit2 className="w-4 h-4" />
                                  </button>
                                  <button
                                    type="button"
                                    onClick={async () => {
                                      if ((ind.usageCount || 0) > 0) {
                                        showError('Cannot delete: this industry is in use by companies.');
                                        return;
                                      }
                                      try {
                                        await apiDeleteIndustry(ind.id);
                                        showSuccess('Industry deleted');
                                        fetchIndustries();
                                      } catch (e: any) {
                                        showError(e?.message || 'Failed to delete industry');
                                      }
                                    }}
                                    className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                                    title="Delete"
                                  >
                                    <Trash2 className="w-4 h-4" />
                                  </button>
                                </div>
                              )}
                            </li>
                          ))}
                        </ul>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {industryModal.open && (
            <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
              <div className="bg-white rounded-2xl shadow-xl max-w-md w-full p-6">
                <h3 className="font-bold text-lg text-slate-900 mb-4">{industryModal.industry ? 'Edit industry' : 'Add industry'}</h3>
                <input
                  type="text"
                  value={industryModal.name}
                  onChange={e => setIndustryModal(prev => ({ ...prev, name: e.target.value }))}
                  placeholder="Industry name"
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm mb-4"
                />
                <div className="flex justify-end gap-2">
                  <button type="button" onClick={() => setIndustryModal({ open: false, name: '' })} className="px-4 py-2 rounded-xl text-slate-600 hover:bg-slate-100 font-medium text-sm">Cancel</button>
                  <button
                    type="button"
                    disabled={savingIndustry}
                    onClick={async () => {
                      const name = industryModal.name.trim();
                      if (!name) {
                        showError('Name is required');
                        return;
                      }
                      setSavingIndustry(true);
                      try {
                        if (industryModal.industry) {
                          await apiUpdateIndustry(industryModal.industry.id, { name });
                          showSuccess('Industry updated');
                        } else {
                          await apiCreateIndustry({ name });
                          showSuccess('Industry added');
                        }
                        setIndustryModal({ open: false, name: '' });
                        fetchIndustries();
                      } catch (e: any) {
                        showError(e?.message || 'Failed to save industry');
                      } finally {
                        setSavingIndustry(false);
                      }
                    }}
                    className="px-4 py-2 bg-indigo-600 text-white rounded-xl font-medium text-sm hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                  >
                    {savingIndustry && <Loader2 className="w-4 h-4 animate-spin" />}
                    {industryModal.industry ? 'Save' : 'Add'}
                  </button>
                </div>
              </div>
            </div>
          )}
          
          {/* Other tabs remain largely the same, integrated with consistent design */}
        </div>
      </div>

      {isUserModalOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl shadow-xl max-w-md w-full p-6 space-y-4 text-left my-8">
            <div className="flex justify-between items-center">
              <h3 className="font-bold text-lg text-slate-900">{editingUser ? 'Edit User' : 'Add New User'}</h3>
              <button onClick={() => setIsUserModalOpen(false)} className="p-2 hover:bg-slate-100 rounded-full text-slate-400 transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="space-y-4 max-h-[70vh] overflow-y-auto pr-2">
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Full Name</label>
                <input 
                  type="text" 
                  value={userFormData.name} 
                  onChange={e => setUserFormData({...userFormData, name: e.target.value})} 
                  placeholder="Full Name" 
                  className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm" 
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Email Address</label>
                <input 
                  type="email" 
                  value={userFormData.email} 
                  onChange={e => setUserFormData({...userFormData, email: e.target.value})} 
                  placeholder="Email Address" 
                  disabled={!!editingUser} 
                  className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm disabled:opacity-50" 
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Role</label>
                <select 
                  value={userFormData.role} 
                  onChange={e => setUserFormData({...userFormData, role: e.target.value as any})} 
                  className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm"
                >
                  <option value="Viewer">Viewer - Read-only access</option>
                  <option value="Collaborator">Collaborator - Can comment and draft</option>
                  <option value="Admin">Admin - Full access</option>
                  <option value="User">User (Legacy - maps to Collaborator)</option>
                </select>
                <p className="text-[10px] text-slate-400 mt-1">
                  {userFormData.role === 'Viewer' && 'Read-only access to shared inbox'}
                  {userFormData.role === 'Collaborator' && 'Can add notes, draft responses, manage own templates'}
                  {userFormData.role === 'Admin' && 'Full configuration access, can assign emails, send, manage accounts'}
                  {userFormData.role === 'User' && 'Legacy role - will be treated as Collaborator'}
                </p>
              </div>
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Job Title</label>
                <div className="relative">
                  <Briefcase className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <input 
                    type="text" 
                    value={userFormData.jobTitle} 
                    onChange={e => setUserFormData({...userFormData, jobTitle: e.target.value})} 
                    placeholder="e.g. Senior Logistics Analyst" 
                    className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm" 
                  />
                </div>
              </div>
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Department</label>
                <input 
                  type="text" 
                  value={userFormData.department} 
                  onChange={e => setUserFormData({...userFormData, department: e.target.value})} 
                  placeholder="e.g. Operations" 
                  className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm" 
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Phone Number</label>
                <input 
                  type="tel" 
                  value={userFormData.phone} 
                  onChange={e => setUserFormData({...userFormData, phone: e.target.value})} 
                  placeholder="+1 555-0000" 
                  className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm" 
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Professional Bio</label>
                <textarea 
                  value={userFormData.bio} 
                  onChange={e => setUserFormData({...userFormData, bio: e.target.value})} 
                  placeholder="Tell the team a bit about yourself..." 
                  rows={3}
                  className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm resize-none" 
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest flex items-center gap-2"><Globe2 className="w-3.5 h-3.5" /> Timezone</label>
                <select 
                  value={userFormData.timezone} 
                  onChange={e => setUserFormData({...userFormData, timezone: e.target.value})} 
                  className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm"
                >
                  {TIMEZONES.map(tz => (
                    <option key={tz.value} value={tz.value}>{tz.label}</option>
                  ))}
                </select>
              </div>
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Language</label>
                <select 
                  value={userFormData.language} 
                  onChange={e => setUserFormData({...userFormData, language: e.target.value})} 
                  className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm"
                >
                  {LANGUAGES.map(lang => (
                    <option key={lang.value} value={lang.value}>{lang.label}</option>
                  ))}
                </select>
              </div>
            </div>
            <div className="flex gap-3 pt-4 border-t border-slate-100">
              <button 
                onClick={() => setIsUserModalOpen(false)} 
                className="flex-1 py-2.5 border border-slate-200 rounded-xl font-bold text-slate-600 hover:bg-slate-50 transition-colors"
              >
                Cancel
              </button>
              <button 
                onClick={async () => {
                  setIsSavingUser(true);
                  try {
                    if (editingUser) await apiUpdateUser(editingUser.id, userFormData);
                    else await apiCreateUser(userFormData);
                    setIsUserModalOpen(false);
                    fetchUsers();
                    showSuccess(editingUser ? 'User updated successfully!' : 'User created successfully!');
                  } catch(err: any) { 
                    showError(err.message || 'Failed to save user'); 
                  }
                  finally { setIsSavingUser(false); }
                }} 
                disabled={isSavingUser || !userFormData.name || !userFormData.email}
                className="flex-1 py-2.5 bg-indigo-600 text-white rounded-xl font-bold shadow-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-indigo-700 transition-colors flex items-center justify-center gap-2"
              >
                {isSavingUser ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    {editingUser ? 'Updating...' : 'Creating...'}
                  </>
                ) : (
                  editingUser ? 'Update' : 'Invite'
                )}
              </button>
            </div>
          </div>
        </div>
      )      }

      {/* Delete User Confirmation Modal */}
      {deleteConfirmUser && (
        <div className="fixed inset-0 z-[130] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-300">
          <div className="bg-white rounded-[32px] w-full max-w-md shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="p-8 border-b border-slate-100">
              <div className="flex items-center gap-4 mb-6">
                <div className="w-12 h-12 rounded-2xl flex items-center justify-center bg-red-50 text-red-600">
                  <Trash2 className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-xl font-black text-slate-900">Delete User?</h3>
                  <p className="text-xs text-slate-400 font-medium mt-1">
                    This action cannot be undone. The user will be permanently removed from the system.
                  </p>
                </div>
              </div>
              <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200">
                <p className="text-sm font-bold text-slate-900 mb-1">{deleteConfirmUser.name}</p>
                <p className="text-xs text-slate-500">{deleteConfirmUser.email}</p>
                {deleteConfirmUser.role && (
                  <p className="text-xs text-slate-400 font-bold uppercase mt-1">{deleteConfirmUser.role}</p>
                )}
              </div>
            </div>
            <div className="p-6 flex gap-3">
              <button
                onClick={() => setDeleteConfirmUser(null)}
                disabled={deletingUserId === deleteConfirmUser.id}
                className="flex-1 py-3 border border-slate-200 text-slate-400 font-black uppercase text-xs tracking-widest rounded-xl hover:bg-slate-50 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Cancel
              </button>
              <button
                onClick={async () => {
                  setDeletingUserId(deleteConfirmUser.id);
                  try {
                    await apiDeleteUser(deleteConfirmUser.id);
                    await fetchUsers();
                    setDeleteConfirmUser(null);
                    showSuccess('User deleted successfully');
                  } catch (err: any) {
                    showError(err.message || 'Failed to delete user');
                  } finally {
                    setDeletingUserId(null);
                  }
                }}
                disabled={deletingUserId === deleteConfirmUser.id}
                className="flex-1 py-3 bg-red-600 text-white font-black uppercase text-xs tracking-widest rounded-xl hover:bg-red-700 transition-all shadow-lg disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {deletingUserId === deleteConfirmUser.id ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Deleting...
                  </>
                ) : (
                  'Delete User'
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Image Cropper Modal */}
      {isCropModalOpen && imageToCrop && (
        <ImageCropper
          imageSrc={imageToCrop}
          onCrop={handleCropComplete}
          onCancel={handleCropCancel}
          aspectRatio={1}
          circularCrop={true}
        />
      )}
    </div>
  );
};

export default Settings;

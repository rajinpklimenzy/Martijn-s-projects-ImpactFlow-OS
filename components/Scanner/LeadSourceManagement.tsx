import React, { useState, useEffect } from 'react';
import { Plus, Edit3, Trash2, Power, Tag, Search, Loader2, X, Save, AlertCircle } from 'lucide-react';
import { apiGetLeadSources, apiCreateLeadSource, apiUpdateLeadSource, apiDeleteLeadSource, apiToggleLeadSourceActive } from '../../utils/api';
import { LeadSource } from '../../types';
import { useToast } from '../../contexts/ToastContext';

interface LeadSourceManagementProps {
  currentUser: any;
}

export const LeadSourceManagement: React.FC<LeadSourceManagementProps> = ({ currentUser }) => {
  const { showSuccess, showError } = useToast();
  const [leadSources, setLeadSources] = useState<LeadSource[]>([]);
  const [filteredLeadSources, setFilteredLeadSources] = useState<LeadSource[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editingLeadSource, setEditingLeadSource] = useState<LeadSource | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<LeadSource | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Form state
  const [formData, setFormData] = useState({
    name: '',
    type: 'manual' as 'scanner' | 'manual' | 'import' | 'api',
    description: '',
    icon: 'tag'
  });
  const [formErrors, setFormErrors] = useState<{[key: string]: string}>({});
  const [isSaving, setIsSaving] = useState(false);

  const isAdmin = currentUser?.role === 'Admin';

  useEffect(() => {
    if (isAdmin) {
      fetchLeadSources();
    }
  }, [isAdmin]);

  useEffect(() => {
    // Filter lead sources based on search query
    if (!searchQuery.trim()) {
      setFilteredLeadSources(leadSources);
    } else {
      const query = searchQuery.toLowerCase();
      setFilteredLeadSources(
        leadSources.filter(ls => 
          ls.name.toLowerCase().includes(query) ||
          ls.type.toLowerCase().includes(query) ||
          ls.description.toLowerCase().includes(query)
        )
      );
    }
  }, [searchQuery, leadSources]);

  const fetchLeadSources = async () => {
    setIsLoading(true);
    try {
      const response = await apiGetLeadSources();
      setLeadSources(response.data || []);
    } catch (error: any) {
      showError('Failed to load lead sources');
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreate = () => {
    setEditingLeadSource(null);
    setFormData({ name: '', type: 'manual', description: '', icon: 'tag' });
    setFormErrors({});
    setIsEditModalOpen(true);
  };

  const handleEdit = (leadSource: LeadSource) => {
    setEditingLeadSource(leadSource);
    setFormData({
      name: leadSource.name,
      type: leadSource.type,
      description: leadSource.description,
      icon: leadSource.icon
    });
    setFormErrors({});
    setIsEditModalOpen(true);
  };

  const handleToggleActive = async (leadSource: LeadSource) => {
    try {
      await apiToggleLeadSourceActive(leadSource.id);
      showSuccess(`Lead source ${!leadSource.active ? 'activated' : 'deactivated'}`);
      fetchLeadSources();
    } catch (error: any) {
      showError('Failed to toggle lead source');
    }
  };

  const handleDelete = async () => {
    if (!deleteConfirm) return;

    setIsDeleting(true);
    try {
      await apiDeleteLeadSource(deleteConfirm.id);
      showSuccess('Lead source deleted successfully');
      setDeleteConfirm(null);
      fetchLeadSources();
    } catch (error: any) {
      if (error.message?.includes('in use')) {
        showError('Cannot delete lead source that is currently in use by contacts');
      } else {
        showError('Failed to delete lead source');
      }
    } finally {
      setIsDeleting(false);
    }
  };

  const validateForm = () => {
    const errors: {[key: string]: string} = {};

    if (!formData.name.trim()) {
      errors.name = 'Name is required';
    }

    if (!formData.type) {
      errors.type = 'Type is required';
    }

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSave = async () => {
    if (!validateForm()) return;

    setIsSaving(true);
    try {
      if (editingLeadSource) {
        // Update existing
        await apiUpdateLeadSource(editingLeadSource.id, formData);
        showSuccess('Lead source updated successfully');
      } else {
        // Create new
        await apiCreateLeadSource(formData);
        showSuccess('Lead source created successfully');
      }
      
      setIsEditModalOpen(false);
      fetchLeadSources();
    } catch (error: any) {
      showError(error.message || 'Failed to save lead source');
    } finally {
      setIsSaving(false);
    }
  };

  if (!isAdmin) {
    return (
      <div className="p-8 text-center">
        <AlertCircle className="w-16 h-16 mx-auto text-gray-400 mb-4" />
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Access Denied</h2>
        <p className="text-gray-600">Only administrators can manage lead sources.</p>
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="flex justify-between items-start mb-6">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Lead Source Management</h2>
          <p className="text-sm text-gray-600 mt-1">Manage lead sources for tracking contact origins</p>
        </div>
        <button
          onClick={handleCreate}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2"
        >
          <Plus className="w-5 h-5" />
          Add Lead Source
        </button>
      </div>

      {/* Search */}
      <div className="mb-6">
        <div className="relative">
          <Search className="absolute left-3 top-3 w-5 h-5 text-gray-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="Search lead sources..."
          />
        </div>
      </div>

      {/* Lead Sources Table */}
      {isLoading ? (
        <div className="text-center py-12">
          <Loader2 className="w-8 h-8 mx-auto text-gray-400 animate-spin" />
        </div>
      ) : filteredLeadSources.length === 0 ? (
        <div className="text-center py-12 bg-gray-50 rounded-lg">
          <Tag className="w-12 h-12 mx-auto text-gray-400 mb-4" />
          <p className="text-gray-600">
            {searchQuery ? 'No lead sources match your search' : 'No lead sources yet'}
          </p>
        </div>
      ) : (
        <div className="border border-gray-200 rounded-lg overflow-hidden">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Name</th>
                <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Type</th>
                <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Description</th>
                <th className="px-4 py-3 text-center text-sm font-semibold text-gray-700">Status</th>
                <th className="px-4 py-3 text-right text-sm font-semibold text-gray-700">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {filteredLeadSources.map((leadSource) => (
                <tr key={leadSource.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <Tag className="w-4 h-4 text-gray-400" />
                      <span className="font-medium text-gray-900">{leadSource.name}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`px-2 py-1 text-xs rounded-full ${
                      leadSource.type === 'scanner' ? 'bg-blue-100 text-blue-700' :
                      leadSource.type === 'manual' ? 'bg-gray-100 text-gray-700' :
                      leadSource.type === 'import' ? 'bg-green-100 text-green-700' :
                      'bg-purple-100 text-purple-700'
                    }`}>
                      {leadSource.type}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-600">
                    {leadSource.description}
                  </td>
                  <td className="px-4 py-3 text-center">
                    <span className={`px-2 py-1 text-xs rounded-full ${
                      leadSource.active ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                    }`}>
                      {leadSource.active ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex items-center justify-end gap-2">
                      <button
                        onClick={() => handleToggleActive(leadSource)}
                        className="p-1 text-gray-500 hover:text-blue-600 transition-colors"
                        title={leadSource.active ? 'Deactivate' : 'Activate'}
                      >
                        <Power className="w-5 h-5" />
                      </button>
                      <button
                        onClick={() => handleEdit(leadSource)}
                        className="p-1 text-gray-500 hover:text-blue-600 transition-colors"
                        title="Edit"
                      >
                        <Edit3 className="w-5 h-5" />
                      </button>
                      <button
                        onClick={() => setDeleteConfirm(leadSource)}
                        className="p-1 text-gray-500 hover:text-red-600 transition-colors"
                        title="Delete"
                      >
                        <Trash2 className="w-5 h-5" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Edit/Create Modal */}
      {isEditModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
          <div className="bg-white rounded-xl shadow-2xl max-w-lg w-full p-6">
            <div className="flex justify-between items-start mb-6">
              <h2 className="text-2xl font-bold text-gray-900">
                {editingLeadSource ? 'Edit Lead Source' : 'Create Lead Source'}
              </h2>
              <button onClick={() => setIsEditModalOpen(false)} className="text-gray-400 hover:text-gray-600">
                <X className="w-6 h-6" />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Name *</label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                    formErrors.name ? 'border-red-500' : 'border-gray-300'
                  }`}
                  placeholder="Webinar Signup"
                />
                {formErrors.name && <p className="text-xs text-red-600 mt-1">{formErrors.name}</p>}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Type *</label>
                <select
                  value={formData.type}
                  onChange={(e) => setFormData({ ...formData, type: e.target.value as any })}
                  className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                    formErrors.type ? 'border-red-500' : 'border-gray-300'
                  }`}
                >
                  <option value="scanner">Scanner</option>
                  <option value="manual">Manual</option>
                  <option value="import">Import</option>
                  <option value="api">API</option>
                </select>
                {formErrors.type && <p className="text-xs text-red-600 mt-1">{formErrors.type}</p>}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Brief description of this lead source..."
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Icon Name</label>
                <input
                  type="text"
                  value={formData.icon}
                  onChange={(e) => setFormData({ ...formData, icon: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="tag"
                />
                <p className="text-xs text-gray-500 mt-1">Lucide icon name (e.g., tag, linkedin, upload)</p>
              </div>
            </div>

            <div className="flex justify-end gap-3 mt-6">
              <button
                onClick={() => setIsEditModalOpen(false)}
                disabled={isSaving}
                className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                onClick={handleSave}
                disabled={isSaving}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2 disabled:opacity-50"
              >
                {isSaving ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Saving...
                  </>
                ) : (
                  <>
                    <Save className="w-4 h-4" />
                    {editingLeadSource ? 'Update' : 'Create'}
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deleteConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
          <div className="bg-white rounded-xl shadow-2xl max-w-md w-full p-6">
            <h2 className="text-xl font-bold text-gray-900 mb-4">Confirm Deletion</h2>
            <p className="text-gray-600 mb-6">
              Are you sure you want to delete the lead source "{deleteConfirm.name}"? This action cannot be undone.
            </p>
            <div className="flex justify-end gap-3">
              <button
                onClick={() => setDeleteConfirm(null)}
                disabled={isDeleting}
                className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                onClick={handleDelete}
                disabled={isDeleting}
                className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors flex items-center gap-2 disabled:opacity-50"
              >
                {isDeleting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Deleting...
                  </>
                ) : (
                  <>
                    <Trash2 className="w-4 h-4" />
                    Delete
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

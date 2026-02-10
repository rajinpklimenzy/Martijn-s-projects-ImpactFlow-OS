import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  BookOpen, Search, Plus, Edit2, Trash2, Copy, Filter, Loader2,
  ChevronRight, Calendar, Tag, ListChecks, FileText, X, MoreVertical,
  CheckCircle2, Clock, Building2, Briefcase, FolderKanban, ExternalLink
} from 'lucide-react';
import {
  usePlaybookTemplates,
  useDeletePlaybookTemplate,
  useCreatePlaybookTemplate,
  usePlaybookInstances,
  usePlaybookStepCompletions
} from '../hooks/usePlaybooks';
import { useToast } from '../contexts/ToastContext';
import { apiGetDeals, apiGetProjects, apiGetCompanies, apiGetUsers } from '../utils/api';
import { useUsers } from '../hooks/useUsers';
import PlaybookBuilder from './PlaybookBuilder';
import PlaybookInstanceView from './PlaybookInstanceView';
import AttachPlaybookModal from './AttachPlaybookModal';

interface PlaybooksProps {
  onNavigate: (tab: string) => void;
  currentUser?: any;
  playbookPrompt?: { dealId?: string; templateId?: string } | null;
  onClearPlaybookPrompt?: () => void;
}

type ViewMode = 'templates' | 'active';

// Playbook Instance Row Component - fetches completions to calculate accurate progress
const PlaybookInstanceRow: React.FC<{ 
  instance: any; 
  getCompanyName: (id: string) => string;
  getDealName: (id: string) => string;
  getProjectName: (id: string) => string;
  getUserName: (id: string) => string;
  onView: (id: string) => void;
}> = ({ instance, getCompanyName, getDealName, getProjectName, getUserName, onView }) => {
  const { data: completions = [] } = usePlaybookStepCompletions(instance.id);
  
  const totalSteps = instance.templateSnapshot?.sections?.reduce((total: number, section: any) => {
    return total + (section.steps?.length || 0);
  }, 0) || 0;
  const completedSteps = completions.length;
  const percentage = totalSteps > 0 ? Math.round((completedSteps / totalSteps) * 100) : 0;
  
  const attachedTo = instance.dealId 
    ? { type: 'Deal', name: getDealName(instance.dealId), id: instance.dealId }
    : instance.projectId
    ? { type: 'Project', name: getProjectName(instance.projectId), id: instance.projectId }
    : null;

  const formatDate = (dateString: string) => {
    if (!dateString) return '—';
    const date = new Date(dateString);
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    
    if (date.toDateString() === today.toDateString()) {
      return 'Today';
    } else if (date.toDateString() === yesterday.toDateString()) {
      return 'Yesterday';
    } else {
      return date.toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit', year: 'numeric' });
    }
  };

  return (
    <tr className="hover:bg-slate-50 transition-colors">
      <td className="px-6 py-4 whitespace-nowrap">
        <div className="flex items-center gap-2">
          <BookOpen className="w-4 h-4 text-indigo-600" />
          <span className="text-sm font-medium text-slate-900">
            {instance.templateSnapshot?.name || 'Unknown Playbook'}
          </span>
          {instance.templateSnapshot?.version && (
            <span className="text-xs text-slate-400">v{instance.templateSnapshot.version}</span>
          )}
        </div>
      </td>
      <td className="px-6 py-4 whitespace-nowrap">
        {attachedTo ? (
          <div className="flex items-center gap-2">
            {attachedTo.type === 'Deal' ? (
              <Briefcase className="w-4 h-4 text-slate-400" />
            ) : (
              <FolderKanban className="w-4 h-4 text-slate-400" />
            )}
            <span className="text-sm text-slate-600">{attachedTo.name}</span>
          </div>
        ) : (
          <span className="text-sm text-slate-400">—</span>
        )}
      </td>
      <td className="px-6 py-4 whitespace-nowrap">
        <div className="flex items-center gap-2">
          <Building2 className="w-4 h-4 text-slate-400" />
          <span className="text-sm text-slate-600">
            {instance.companyId ? getCompanyName(instance.companyId) : '—'}
          </span>
        </div>
      </td>
      <td className="px-6 py-4 whitespace-nowrap">
        <div className="flex items-center gap-3">
          <div className="flex-1 min-w-[120px]">
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs font-medium text-slate-600">
                {completedSteps} / {totalSteps}
              </span>
              <span className="text-xs text-slate-500">{percentage}%</span>
            </div>
            <div className="w-full bg-slate-200 rounded-full h-2">
              <div
                className={`h-2 rounded-full transition-all ${
                  percentage === 100
                    ? 'bg-green-500'
                    : percentage >= 50
                    ? 'bg-indigo-500'
                    : 'bg-yellow-500'
                }`}
                style={{ width: `${percentage}%` }}
              />
            </div>
          </div>
          {percentage === 100 && (
            <CheckCircle2 className="w-4 h-4 text-green-500" />
          )}
        </div>
      </td>
      <td className="px-6 py-4 whitespace-nowrap">
        <span className="text-sm text-slate-600">
          {instance.activatedBy ? getUserName(instance.activatedBy) : '—'}
        </span>
      </td>
      <td className="px-6 py-4 whitespace-nowrap">
        <div className="flex items-center gap-2">
          <Calendar className="w-4 h-4 text-slate-400" />
          <span className="text-sm text-slate-600">
            {formatDate(instance.activatedAt)}
          </span>
        </div>
      </td>
      <td className="px-6 py-4 whitespace-nowrap">
        <button
          onClick={() => onView(instance.id)}
          className="text-indigo-600 hover:text-indigo-700 text-sm font-semibold flex items-center gap-1.5 transition-colors"
        >
          View
          <ExternalLink className="w-3.5 h-3.5" />
        </button>
      </td>
    </tr>
  );
};

const Playbooks: React.FC<PlaybooksProps> = ({ onNavigate, currentUser, playbookPrompt, onClearPlaybookPrompt }) => {
  const { showSuccess, showError } = useToast();
  const [view, setView] = useState<ViewMode>('templates');
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [deleteConfirmTemplate, setDeleteConfirmTemplate] = useState<any | null>(null);
  const [isDeletingTemplate, setIsDeletingTemplate] = useState(false);
  const [availableCategories, setAvailableCategories] = useState<string[]>([]);
  const [isBuilderOpen, setIsBuilderOpen] = useState(false);
  const [editingTemplateId, setEditingTemplateId] = useState<string | null>(null);
  const [hasCheckedDefaults, setHasCheckedDefaults] = useState(false);
  const [viewingPlaybookInstanceId, setViewingPlaybookInstanceId] = useState<string | null>(null);
  const [isAttachPlaybookModalOpen, setIsAttachPlaybookModalOpen] = useState(false);
  const [attachModalDealId, setAttachModalDealId] = useState<string | undefined>(undefined);
  const [attachModalPreSelectedTemplateId, setAttachModalPreSelectedTemplateId] = useState<string | undefined>(undefined);
  
  // Active Playbooks filters
  const [instanceSearchQuery, setInstanceSearchQuery] = useState('');
  const [instanceCompanyFilter, setInstanceCompanyFilter] = useState<string>('all');
  const [instanceStatusFilter, setInstanceStatusFilter] = useState<string>('all');

  // React Query hooks
  const { data: templates = [], isLoading: isLoadingTemplates, error: templatesError } = usePlaybookTemplates({
    category: categoryFilter !== 'all' ? categoryFilter : undefined,
    search: searchQuery || undefined
  });
  const deleteTemplateMutation = useDeletePlaybookTemplate();
  const createTemplateMutation = useCreatePlaybookTemplate();
  
  // Active Playbooks hooks
  const { data: instances = [], isLoading: isLoadingInstances } = usePlaybookInstances({
    companyId: instanceCompanyFilter !== 'all' ? instanceCompanyFilter : undefined,
    status: instanceStatusFilter !== 'all' ? instanceStatusFilter : undefined
  });
  
  // Fetch companies, deals, and projects for filters and display
  const { data: companies = [] } = useQuery({
    queryKey: ['companies'],
    queryFn: async () => {
      const response = await apiGetCompanies();
      return response.data || response || [];
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
  
  const { data: deals = [] } = useQuery({
    queryKey: ['deals'],
    queryFn: async () => {
      const response = await apiGetDeals();
      return response.data || response || [];
    },
    staleTime: 5 * 60 * 1000,
  });
  
  const { data: projects = [] } = useQuery({
    queryKey: ['projects'],
    queryFn: async () => {
      const response = await apiGetProjects();
      return response.data || response || [];
    },
    staleTime: 5 * 60 * 1000,
  });

  const { data: users = [] } = useUsers();

  // Load available categories from templates
  // Use a ref to track previous categories to avoid infinite loops
  const prevCategoriesRef = useRef<string>('');
  
  useEffect(() => {
    const categories = new Set<string>();
    templates.forEach((template: any) => {
      if (template.category) {
        categories.add(template.category);
      }
    });
    const sortedCategories = Array.from(categories).sort();
    const categoryString = sortedCategories.join(',');
    
    // Only update if categories actually changed
    if (categoryString !== prevCategoriesRef.current) {
      prevCategoriesRef.current = categoryString;
      setAvailableCategories(sortedCategories);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [templates.length]); // Only depend on length, use ref to track actual category changes

  // Listen for refresh events
  useEffect(() => {
    const handleRefresh = () => {
      // Invalidate queries instead of full reload
      window.dispatchEvent(new Event('refresh-playbooks-queries'));
    };
    window.addEventListener('refresh-playbooks', handleRefresh);
    return () => window.removeEventListener('refresh-playbooks', handleRefresh);
  }, []);

  // Handle playbook prompt from URL (e.g. from Deal Won notification)
  useEffect(() => {
    if (playbookPrompt && playbookPrompt.dealId) {
      // Switch to templates view if not already there
      setView('templates');
      // Open attach modal with pre-selected template and deal
      setAttachModalDealId(playbookPrompt.dealId);
      setAttachModalPreSelectedTemplateId(playbookPrompt.templateId);
      setIsAttachPlaybookModalOpen(true);
      // Clear the prompt after handling
      if (onClearPlaybookPrompt) {
        onClearPlaybookPrompt();
      }
    }
  }, [playbookPrompt, onClearPlaybookPrompt]);

  // Load default templates on first load if no templates exist
  // Note: Default templates are seeded via backend script (seedDefaultPlaybookTemplates.js)
  // This effect just tracks that we've checked, so we don't keep checking
  useEffect(() => {
    if (hasCheckedDefaults || isLoadingTemplates) return;
    setHasCheckedDefaults(true);
    // If no templates exist, user can create them manually or run backend seed script
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [templates.length, isLoadingTemplates]); // Removed hasCheckedDefaults from deps to avoid loop

  const handleDeleteTemplate = async (template: any) => {
    setIsDeletingTemplate(true);
    try {
      await deleteTemplateMutation.mutateAsync(template.id);
      setDeleteConfirmTemplate(null);
    } catch (err: any) {
      showError(err.message || 'Failed to delete template');
    } finally {
      setIsDeletingTemplate(false);
    }
  };

  const handleDuplicateTemplate = async (template: any) => {
    try {
      await createTemplateMutation.mutateAsync({
        name: `${template.name} (Copy)`,
        category: template.category || 'Custom',
        description: template.description || '',
        sections: template.sections || []
      });
      showSuccess('Template duplicated successfully!');
    } catch (err: any) {
      showError(err.message || 'Failed to duplicate template');
    }
  };

  const calculateTotalSteps = (template: any): number => {
    if (!template.sections || !Array.isArray(template.sections)) return 0;
    return template.sections.reduce((total: number, section: any) => {
      return total + (section.steps?.length || 0);
    }, 0);
  };

  const formatDate = (dateString: string | undefined): string => {
    if (!dateString) return 'Never';
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    
    if (diffDays === 0) return 'Today';
    if (diffDays === 1) return 'Yesterday';
    if (diffDays < 7) return `${diffDays} days ago`;
    if (diffDays < 30) return `${Math.floor(diffDays / 7)} weeks ago`;
    return date.toLocaleDateString();
  };

  const getCategoryColor = (category: string): string => {
    const colors: Record<string, string> = {
      'Sales': 'bg-blue-100 text-blue-700',
      'Onboarding': 'bg-green-100 text-green-700',
      'Custom': 'bg-purple-100 text-purple-700'
    };
    return colors[category] || 'bg-slate-100 text-slate-700';
  };

  const filteredTemplates = useMemo(() => {
    if (!searchQuery) return templates;
    const query = searchQuery.toLowerCase();
    return templates.filter((template: any) =>
      template.name?.toLowerCase().includes(query) ||
      template.description?.toLowerCase().includes(query)
    );
  }, [templates, searchQuery]);

  // Helper functions for Active Playbooks
  const getCompanyName = (companyId: string) => {
    const company = companies.find((c: any) => c.id === companyId);
    return company?.name || 'Unknown Company';
  };

  const getDealName = (dealId: string) => {
    const deal = deals.find((d: any) => d.id === dealId);
    return deal?.title || deal?.name || 'Unknown Deal';
  };

  const getProjectName = (projectId: string) => {
    const project = projects.find((p: any) => p.id === projectId);
    return project?.title || project?.name || 'Unknown Project';
  };


  // Helper function to get user name from ID
  const getUserName = (userId: string) => {
    const user = users.find((u: any) => u.id === userId);
    return user?.name || userId;
  };

  // Filter instances based on search query
  const filteredInstances = useMemo(() => {
    let filtered = instances;
    
    // Search filter
    if (instanceSearchQuery) {
      const query = instanceSearchQuery.toLowerCase();
      filtered = filtered.filter((instance: any) => {
        const templateName = instance.templateSnapshot?.name || '';
        const companyName = instance.companyId ? getCompanyName(instance.companyId).toLowerCase() : '';
        const dealName = instance.dealId ? getDealName(instance.dealId).toLowerCase() : '';
        const projectName = instance.projectId ? getProjectName(instance.projectId).toLowerCase() : '';
        
        return templateName.toLowerCase().includes(query) ||
               companyName.includes(query) ||
               dealName.includes(query) ||
               projectName.includes(query);
      });
    }
    
    return filtered;
  }, [instances, instanceSearchQuery, companies, deals, projects]);

  return (
    <div className="h-full min-h-0 flex flex-col gap-6 animate-in slide-in-from-right-2 duration-500">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 shrink-0">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Playbooks</h1>
          <p className="text-slate-500 text-sm font-medium mt-1">Create and manage standardized workflows for your team</p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => setView('templates')}
            className={`px-4 py-2 rounded-xl font-semibold text-sm transition-all ${
              view === 'templates'
                ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-100'
                : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'
            }`}
          >
            Template Library
          </button>
          <button
            onClick={() => setView('active')}
            className={`px-4 py-2 rounded-xl font-semibold text-sm transition-all ${
              view === 'active'
                ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-100'
                : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'
            }`}
          >
            Active Playbooks
          </button>
        </div>
      </div>

      {/* Template Library View */}
      {view === 'templates' && (
        <div className="flex-1 min-h-0 flex flex-col gap-6">
          {/* Error Display */}
          {templatesError && (
            <div className="bg-red-50 border border-red-200 rounded-xl p-4">
              <p className="text-red-800 text-sm font-medium">
                Error loading playbooks: {templatesError instanceof Error ? templatesError.message : 'Unknown error'}
              </p>
            </div>
          )}
          {/* Search and Filters */}
          <div className="flex flex-col sm:flex-row gap-4 shrink-0">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
              <input
                type="text"
                placeholder="Search playbooks..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 bg-white border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-indigo-100 focus:border-indigo-300 outline-none transition-all"
              />
            </div>
            <div className="relative">
              <Filter className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
              <select
                value={categoryFilter}
                onChange={(e) => setCategoryFilter(e.target.value)}
                className="pl-10 pr-8 py-2.5 bg-white border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-indigo-100 focus:border-indigo-300 outline-none appearance-none cursor-pointer"
              >
                <option value="all">All Categories</option>
                {availableCategories.map((cat) => (
                  <option key={cat} value={cat}>{cat}</option>
                ))}
              </select>
              <ChevronRight className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none rotate-90" />
            </div>
            <button
              onClick={() => {
                setEditingTemplateId(null);
                setIsBuilderOpen(true);
              }}
              className="px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold rounded-xl flex items-center gap-2 transition-colors shadow-sm whitespace-nowrap"
            >
              <Plus className="w-4 h-4" />
              Create New Playbook
            </button>
          </div>

          {/* Templates Grid */}
          {isLoadingTemplates ? (
            <div className="flex-1 flex items-center justify-center">
              <div className="flex flex-col items-center gap-3">
                <Loader2 className="w-8 h-8 text-indigo-600 animate-spin" />
                <p className="text-sm text-slate-500">Loading playbooks...</p>
              </div>
            </div>
          ) : filteredTemplates.length === 0 ? (
            <div className="flex-1 flex items-center justify-center">
              <div className="text-center max-w-md">
                <BookOpen className="w-16 h-16 text-slate-300 mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-slate-900 mb-2">No playbooks found</h3>
                <p className="text-sm text-slate-500 mb-6">
                  {searchQuery || categoryFilter !== 'all'
                    ? 'Try adjusting your search or filters'
                    : 'Get started by creating your first playbook template'}
                </p>
                {!searchQuery && categoryFilter === 'all' && (
                  <button
                    onClick={() => {
                      setEditingTemplateId(null);
                      setIsBuilderOpen(true);
                    }}
                    className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold rounded-lg flex items-center gap-2 mx-auto transition-colors"
                  >
                    <Plus className="w-4 h-4" />
                    Create Your First Playbook
                  </button>
                )}
              </div>
            </div>
          ) : (
            <div className="flex-1 min-h-0 overflow-y-auto">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 pb-6">
                {filteredTemplates.map((template: any) => {
                  const totalSteps = calculateTotalSteps(template);
                  const totalSections = template.sections?.length || 0;
                  
                  return (
                    <div
                      key={template.id}
                      className="bg-white border border-slate-200 rounded-2xl p-6 hover:border-indigo-300 hover:shadow-lg transition-all cursor-pointer group"
                    >
                      <div className="flex items-start justify-between mb-4">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2">
                            <BookOpen className="w-5 h-5 text-indigo-600" />
                            <h3 className="text-lg font-bold text-slate-900 line-clamp-1">{template.name}</h3>
                          </div>
                          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-lg text-xs font-semibold ${getCategoryColor(template.category || 'Custom')}`}>
                            {template.category || 'Custom'}
                          </span>
                        </div>
                        <div className="relative">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              // TODO: Show dropdown menu (Phase 3)
                            }}
                            className="p-1.5 hover:bg-slate-100 rounded-lg transition-colors opacity-0 group-hover:opacity-100"
                          >
                            <MoreVertical className="w-4 h-4 text-slate-400" />
                          </button>
                        </div>
                      </div>

                      {template.description && (
                        <p className="text-sm text-slate-600 mb-4 line-clamp-2">{template.description}</p>
                      )}

                      <div className="flex items-center gap-4 text-xs text-slate-500 mb-4">
                        <div className="flex items-center gap-1.5">
                          <FileText className="w-4 h-4" />
                          <span>{totalSections} section{totalSections !== 1 ? 's' : ''}</span>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <ListChecks className="w-4 h-4" />
                          <span>{totalSteps} step{totalSteps !== 1 ? 's' : ''}</span>
                        </div>
                      </div>

                      <div className="flex items-center justify-between pt-4 border-t border-slate-100">
                        <div className="flex items-center gap-2 text-xs text-slate-500">
                          <Calendar className="w-3.5 h-3.5" />
                          <span>Updated {formatDate(template.updatedAt || template.createdAt)}</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <span className="text-xs font-semibold text-slate-400">v{template.version || 1}</span>
                        </div>
                      </div>

                      {/* Action Buttons */}
                      <div className="flex items-center gap-2 mt-4 pt-4 border-t border-slate-100">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setEditingTemplateId(template.id);
                            setIsBuilderOpen(true);
                          }}
                          className="flex-1 px-3 py-2 bg-slate-50 hover:bg-slate-100 text-slate-700 text-xs font-semibold rounded-lg flex items-center justify-center gap-1.5 transition-colors"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                          Edit
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDuplicateTemplate(template);
                          }}
                          className="flex-1 px-3 py-2 bg-slate-50 hover:bg-slate-100 text-slate-700 text-xs font-semibold rounded-lg flex items-center justify-center gap-1.5 transition-colors"
                        >
                          <Copy className="w-3.5 h-3.5" />
                          Duplicate
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setDeleteConfirmTemplate(template);
                          }}
                          className="px-3 py-2 bg-red-50 hover:bg-red-100 text-red-700 text-xs font-semibold rounded-lg flex items-center justify-center gap-1.5 transition-colors"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Active Playbooks View */}
      {view === 'active' && (
        <div className="flex-1 min-h-0 flex flex-col gap-6">
          {/* Search and Filters */}
          <div className="flex flex-col sm:flex-row gap-4 shrink-0">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
              <input
                type="text"
                placeholder="Search by playbook name, company, deal, or project..."
                value={instanceSearchQuery}
                onChange={(e) => setInstanceSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 bg-white border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-indigo-100 focus:border-indigo-300 outline-none transition-all"
              />
            </div>
            <div className="relative">
              <Filter className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
              <select
                value={instanceCompanyFilter}
                onChange={(e) => setInstanceCompanyFilter(e.target.value)}
                className="pl-10 pr-8 py-2.5 bg-white border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-indigo-100 focus:border-indigo-300 outline-none appearance-none cursor-pointer"
              >
                <option value="all">All Companies</option>
                {companies.map((company: any) => (
                  <option key={company.id} value={company.id}>{company.name}</option>
                ))}
              </select>
              <ChevronRight className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none rotate-90" />
            </div>
            <div className="relative">
              <Filter className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
              <select
                value={instanceStatusFilter}
                onChange={(e) => setInstanceStatusFilter(e.target.value)}
                className="pl-10 pr-8 py-2.5 bg-white border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-indigo-100 focus:border-indigo-300 outline-none appearance-none cursor-pointer"
              >
                <option value="all">All Status</option>
                <option value="active">Active</option>
                <option value="completed">Completed</option>
              </select>
              <ChevronRight className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none rotate-90" />
            </div>
          </div>

          {/* Instances List */}
          {isLoadingInstances ? (
            <div className="flex-1 flex items-center justify-center">
              <Loader2 className="w-8 h-8 animate-spin text-indigo-600" />
            </div>
          ) : filteredInstances.length === 0 ? (
            <div className="flex-1 flex items-center justify-center">
              <div className="text-center max-w-md">
                <FolderKanban className="w-16 h-16 text-slate-300 mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-slate-900 mb-2">No Active Playbooks</h3>
                <p className="text-sm text-slate-500">
                  {instanceSearchQuery || instanceCompanyFilter !== 'all' || instanceStatusFilter !== 'all'
                    ? 'No playbooks match your filters. Try adjusting your search criteria.'
                    : 'No active playbook instances found. Attach a playbook to a Deal or Project to get started.'}
                </p>
              </div>
            </div>
          ) : (
            <div className="flex-1 min-h-0 overflow-y-auto">
              <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-slate-50 border-b border-slate-200">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">Playbook Name</th>
                        <th className="px-6 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">Attached To</th>
                        <th className="px-6 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">Company</th>
                        <th className="px-6 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">Progress</th>
                        <th className="px-6 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">Activated By</th>
                        <th className="px-6 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">Activated Date</th>
                        <th className="px-6 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-slate-100">
                      {filteredInstances.map((instance: any) => (
                        <PlaybookInstanceRow
                          key={instance.id}
                          instance={instance}
                          getCompanyName={getCompanyName}
                          getDealName={getDealName}
                          getProjectName={getProjectName}
                          getUserName={getUserName}
                          onView={(id) => setViewingPlaybookInstanceId(id)}
                        />
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deleteConfirmTemplate && (
        <div className="fixed inset-0 z-[90] overflow-hidden pointer-events-none">
          <div
            className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm pointer-events-auto animate-in fade-in duration-300"
            onClick={() => setDeleteConfirmTemplate(null)}
          />
          <div className="absolute inset-0 flex items-center justify-center p-4 pointer-events-none">
            <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl pointer-events-auto animate-in zoom-in-95 duration-200">
              <div className="p-6 border-b border-slate-100">
                <h3 className="text-lg font-bold text-slate-900">Delete Playbook Template</h3>
                <p className="text-sm text-slate-600 mt-1">
                  Are you sure you want to delete "{deleteConfirmTemplate.name}"? This action cannot be undone.
                </p>
              </div>
              <div className="p-6 flex gap-3">
                <button
                  onClick={() => setDeleteConfirmTemplate(null)}
                  className="flex-1 py-2.5 text-sm font-semibold text-slate-600 hover:bg-slate-50 rounded-xl transition-colors border border-slate-200"
                  disabled={isDeletingTemplate}
                >
                  Cancel
                </button>
                <button
                  onClick={() => handleDeleteTemplate(deleteConfirmTemplate)}
                  disabled={isDeletingTemplate}
                  className="flex-1 py-2.5 bg-red-600 text-white text-sm font-semibold rounded-xl hover:bg-red-700 transition-all shadow-sm flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  {isDeletingTemplate ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Deleting...
                    </>
                  ) : (
                    'Delete'
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Playbook Builder Modal */}
      <PlaybookBuilder
        isOpen={isBuilderOpen}
        templateId={editingTemplateId}
        onClose={() => {
          setIsBuilderOpen(false);
          setEditingTemplateId(null);
        }}
        onSuccess={() => {
          // Queries are already invalidated and refetched by the hooks
          // This callback is just for any additional cleanup if needed
        }}
      />

      {/* Attach Playbook Modal */}
      <AttachPlaybookModal
        isOpen={isAttachPlaybookModalOpen}
        dealId={attachModalDealId}
        preSelectedTemplateId={attachModalPreSelectedTemplateId}
        onClose={() => {
          setIsAttachPlaybookModalOpen(false);
          setAttachModalDealId(undefined);
          setAttachModalPreSelectedTemplateId(undefined);
        }}
        onSuccess={() => {
          setIsAttachPlaybookModalOpen(false);
          setAttachModalDealId(undefined);
          setAttachModalPreSelectedTemplateId(undefined);
        }}
      />

      {/* Playbook Instance View */}
      {viewingPlaybookInstanceId && (
        <PlaybookInstanceView
          instanceId={viewingPlaybookInstanceId}
          isOpen={!!viewingPlaybookInstanceId}
          onClose={() => setViewingPlaybookInstanceId(null)}
        />
      )}
    </div>
  );
};

export default Playbooks;

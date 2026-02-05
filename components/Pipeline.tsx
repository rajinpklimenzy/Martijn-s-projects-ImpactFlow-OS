
import React, { useState, useEffect } from 'react';
import { 
  MoreHorizontal, Plus, Calendar, DollarSign, ArrowRight, Settings2, X, 
  Check, Building2, User, Clock, Trash2, Loader2, AlertCircle, 
  CheckSquare, AlertTriangle, ListChecks, ChevronDown, Layout, Save, Move,
  ChevronRight, ExternalLink, Briefcase, FileText, Users, TrendingUp, ShieldCheck, 
  History, Info, MessageSquare, PieChart, UserPlus, Search, Sparkles, Edit2, RefreshCw, Mail
} from 'lucide-react';
import { Deal, Company, User as UserType, Contact } from '../types';
import { apiGetDeals, apiUpdateDeal, apiDeleteDeal, apiGetCompanies, apiGetUsers, apiCreateNotification, apiGetContacts, apiGetAllPipelines, apiGetActivePipelineByType, apiCreatePipeline, apiUpdatePipeline, apiDeletePipeline, apiGetActivityFeed } from '../utils/api';
import { useToast } from '../contexts/ToastContext';
import { ImageWithFallback } from './common';
import { CURRENCIES, DEFAULT_CURRENCY, getCurrencySymbol, formatCurrency } from '../utils/currency';

interface PipelineConfig {
  id: string;
  name: string;
  type: 'sales' | 'operations';
  stages: string[];
  isActive?: boolean;
  createdAt?: string;
  updatedAt?: string;
}

const DEFAULT_PIPELINES: PipelineConfig[] = [
  { id: 'sales', name: 'Sales Pipeline', type: 'sales', stages: ['Discovery', 'Proposal', 'Negotiation', 'Won', 'Lost'] },
  { id: 'ops', name: 'Operations Flow', type: 'operations', stages: ['Order Received', 'Processing', 'In Transit', 'Delivered'] }
];

const Pipeline: React.FC<{ onNavigate: (tab: string) => void; onNewDeal: (stage?: string) => void; currentUser?: any }> = ({ onNavigate, onNewDeal, currentUser }) => {
  const { showSuccess, showError, showInfo } = useToast();
  const [deals, setDeals] = useState<Deal[]>([]);
  const [companies, setCompanies] = useState<Company[]>([]);
  const [users, setUsers] = useState<UserType[]>([]);
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  
  // Detail state
  const [selectedDeal, setSelectedDeal] = useState<Deal | null>(null);
  const [activeDetailTab, setActiveDetailTab] = useState<'overview' | 'activity' | 'stakeholders'>('overview');
  const [isLinkingStakeholder, setIsLinkingStakeholder] = useState(false);
  const [linkingStakeholderId, setLinkingStakeholderId] = useState<string | null>(null);
  const [removingStakeholderId, setRemovingStakeholderId] = useState<string | null>(null);
  const [stakeholderSearch, setStakeholderSearch] = useState('');
  const [deleteConfirmDeal, setDeleteConfirmDeal] = useState<Deal | null>(null);
  const [isDeletingDeal, setIsDeletingDeal] = useState(false);
  
  // Edit state
  const [isEditingDeal, setIsEditingDeal] = useState(false);
  const [isUpdatingDeal, setIsUpdatingDeal] = useState(false);
  const [editFormData, setEditFormData] = useState({
    title: '',
    companyId: '',
    value: '',
    currency: DEFAULT_CURRENCY,
    stage: 'Discovery' as Deal['stage'],
    ownerId: '',
    expectedCloseDate: '',
    description: ''
  });
  
  // Multi-select state
  const [selectedDealIds, setSelectedDealIds] = useState<string[]>([]);
  const [isBulkDeletingDeals, setIsBulkDeletingDeals] = useState(false);
  const [bulkDeleteConfirmOpen, setBulkDeleteConfirmOpen] = useState(false);
  
  // Activity feed state
  const [dealActivities, setDealActivities] = useState<any[]>([]);
  const [isLoadingActivities, setIsLoadingActivities] = useState(false);

  // Pipeline/Stage State - Only Sales Pipeline
  const [pipelines, setPipelines] = useState<PipelineConfig[]>([]);
  const [activePipelineId, setActivePipelineId] = useState<string>('');
  const [pipelineType] = useState<'sales' | 'operations'>('sales'); // Always sales
  const [isConfigOpen, setIsConfigOpen] = useState(false);
  const [isSettingsViewOpen, setIsSettingsViewOpen] = useState(false);
  const [isLoadingPipelines, setIsLoadingPipelines] = useState(true);
  const [isAddingStage, setIsAddingStage] = useState(false);
  const [removingStageIndex, setRemovingStageIndex] = useState<number | null>(null);
  const [newStageName, setNewStageName] = useState('');
  const [newPipelineName, setNewPipelineName] = useState('');
  const activePipeline = pipelines.find(p => p.id === activePipelineId) || null;

  // DnD State
  const [draggingDealId, setDraggingDealId] = useState<string | null>(null);

  // Fetch pipelines from database - Only Sales Pipelines
  const fetchPipelines = async () => {
    try {
      setIsLoadingPipelines(true);
      const response = await apiGetAllPipelines();
      const allPipelines = response?.data || [];
      
      // Filter to only show sales pipelines
      const salesPipelines = allPipelines.filter((p: any) => p.type === 'sales');
      
      // If no sales pipelines exist, create default one
      if (salesPipelines.length === 0) {
        try {
          // Create default sales pipeline
          const salesPipeline = await apiCreatePipeline({
            name: 'Sales Pipeline',
            type: 'sales',
            stages: ['Discovery', 'Proposal', 'Negotiation', 'Won', 'Lost']
          });
          
          // Set sales as active by default
          if (salesPipeline?.data?.id) {
            await apiUpdatePipeline(salesPipeline.data.id, { isActive: true });
          }
          
          // Fetch again after creating default
          const updatedResponse = await apiGetAllPipelines();
          const updatedPipelines = updatedResponse?.data || [];
          const updatedSalesPipelines = updatedPipelines.filter((p: any) => p.type === 'sales');
          setPipelines(updatedSalesPipelines);
          
          // Set active pipeline
          const activeSales = updatedSalesPipelines.find((p: any) => p.isActive) || updatedSalesPipelines[0];
          if (activeSales) {
            setActivePipelineId(activeSales.id);
          }
        } catch (createError) {
          console.error('[PIPELINE] Failed to create default sales pipeline:', createError);
          // Fallback to defaults (only sales)
          const defaultSales = DEFAULT_PIPELINES.filter(p => p.type === 'sales');
          setPipelines(defaultSales);
          if (defaultSales.length > 0) {
            setActivePipelineId(defaultSales[0].id);
          }
        }
      } else {
        setPipelines(salesPipelines);
        
        // Set active pipeline (prefer active, otherwise first one)
        const activePipeline = salesPipelines.find((p: any) => p.isActive) || salesPipelines[0];
        
        if (activePipeline) {
          setActivePipelineId(activePipeline.id);
        }
      }
    } catch (err) {
      console.error('[PIPELINE] Failed to fetch pipelines:', err);
      // Fallback to defaults (only sales)
      const defaultSales = DEFAULT_PIPELINES.filter(p => p.type === 'sales');
      setPipelines(defaultSales);
      if (defaultSales.length > 0) {
        setActivePipelineId(defaultSales[0].id);
      }
    } finally {
      setIsLoadingPipelines(false);
    }
  };

  useEffect(() => {
    fetchPipelines();
  }, []);

  const fetchData = async () => {
    setIsLoading(true);
    try {
      const userId = currentUser?.id || JSON.parse(localStorage.getItem('user_data') || '{}').id;
      // Fetch all deals (we'll filter by pipelineType client-side)
      const [dealsRes, compRes, userRes, contRes] = await Promise.all([
        apiGetDeals(userId),
        apiGetCompanies(),
        apiGetUsers(),
        apiGetContacts()
      ]);
      const allDeals = Array.isArray(dealsRes) ? dealsRes : dealsRes?.data || [];
      
      // Filter deals - only show sales pipeline deals (or deals without pipelineType for backward compatibility)
      const filteredDeals = allDeals.filter((deal: Deal) => {
        if (deal.pipelineType) {
          return deal.pipelineType === 'sales';
        } else {
          // Backward compatibility: exclude operations stages
          const operationsStages = ['Order Received', 'Processing', 'In Transit', 'Delivered'];
          return !operationsStages.includes(deal.stage);
        }
      });
      
      setDeals(filteredDeals);
      setCompanies(compRes?.data || []);
      setUsers(userRes?.data || []);
      setContacts(contRes?.data || []);
    } catch (err) { showError('Failed to load pipeline data'); }
    finally { setIsLoading(false); }
  };

  useEffect(() => { fetchData(); }, [currentUser, pipelineType]);

  useEffect(() => {
    const handleRefresh = () => fetchData();
    window.addEventListener('refresh-pipeline', handleRefresh);
    return () => window.removeEventListener('refresh-pipeline', handleRefresh);
  }, []);

  const handleDragStart = (e: React.DragEvent, dealId: string) => {
    setDraggingDealId(dealId);
    e.dataTransfer.setData('dealId', dealId);
  };

  const handleDrop = async (e: React.DragEvent, stage: string) => {
    e.preventDefault();
    const dealId = e.dataTransfer.getData('dealId');
    const deal = deals.find(d => d.id === dealId);
    if (!deal || deal.stage === stage) return;

    try {
      // Always set pipelineType to 'sales' when moving deal
      await apiUpdateDeal(dealId, { 
        stage,
        pipelineType: 'sales' // Always sales pipeline
      });
      setDeals(prev => prev.map(d => d.id === dealId ? { ...d, stage: stage as any } : d));
      showSuccess(`Deal moved to ${stage}`);
      
      if (deal.ownerId && deal.ownerId !== currentUser?.id) {
        await apiCreateNotification({
          userId: deal.ownerId,
          type: 'deal',
          title: 'Deal Advanced',
          message: `The deal "${deal.title}" was moved to ${stage}.`,
          link: '/?tab=pipeline'
        });
      }
    } catch (err) { showError('Failed to move deal'); }
    finally { setDraggingDealId(null); }
  };

  const addStage = async () => {
    if (!newStageName.trim() || !activePipelineId || isAddingStage) return;
    try {
      setIsAddingStage(true);
      const currentPipeline = pipelines.find(p => p.id === activePipelineId);
      if (!currentPipeline) return;
      
      const updatedStages = [...currentPipeline.stages, newStageName.trim()];
      await apiUpdatePipeline(activePipelineId, { stages: updatedStages });
      
      setPipelines(prev => prev.map(p => p.id === activePipelineId ? { ...p, stages: updatedStages } : p));
      setNewStageName('');
      showSuccess('Stage added successfully');
    } catch (err: any) {
      showError(err.message || 'Failed to add stage');
    } finally {
      setIsAddingStage(false);
    }
  };

  const removeStage = async (idx: number) => {
    if (!activePipelineId) return;
    try {
      const currentPipeline = pipelines.find(p => p.id === activePipelineId);
      if (!currentPipeline) return;
      
      const updatedStages = currentPipeline.stages.filter((_, i) => i !== idx);
      await apiUpdatePipeline(activePipelineId, { stages: updatedStages });
      
      setPipelines(prev => prev.map(p => p.id === activePipelineId ? { ...p, stages: updatedStages } : p));
      showSuccess('Stage removed successfully');
    } catch (err: any) {
      showError(err.message || 'Failed to remove stage');
    }
  };

  const createPipeline = async () => {
    if (!newPipelineName.trim()) return;
    try {
      const newPipeline = await apiCreatePipeline({
        name: newPipelineName.trim(),
        type: 'sales', // Always create sales pipeline
        stages: ['Discovery', 'Proposal', 'Negotiation', 'Won', 'Lost'] // Default stages
      });
      
      if (newPipeline?.data) {
        await fetchPipelines(); // Refresh pipelines list
        setActivePipelineId(newPipeline.data.id);
        setNewPipelineName('');
        setIsConfigOpen(false);
        showSuccess('Sales pipeline created successfully');
      }
    } catch (err: any) {
      showError(err.message || 'Failed to create pipeline');
    }
  };

  const switchPipeline = async (pipelineId: string) => {
    try {
      const pipeline = pipelines.find(p => p.id === pipelineId);
      if (!pipeline) return;
      
      // Set this pipeline as active (will deactivate others)
      await apiUpdatePipeline(pipelineId, { isActive: true });
      
      setActivePipelineId(pipelineId);
      await fetchPipelines(); // Refresh to get updated state
      await fetchData(); // Refresh deals
      showSuccess(`Switched to ${pipeline.name}`);
    } catch (err: any) {
      showError(err.message || 'Failed to switch pipeline');
    }
  };

  const deletePipelineById = async (pipelineId: string) => {
    try {
      await apiDeletePipeline(pipelineId);
      await fetchPipelines(); // Refresh pipelines list
      
      // If deleted pipeline was active, switch to another
      if (activePipelineId === pipelineId) {
        const remaining = pipelines.filter(p => p.id !== pipelineId);
        if (remaining.length > 0) {
          const nextPipeline = remaining.find(p => p.type === pipelineType) || remaining[0];
          if (nextPipeline) {
            await switchPipeline(nextPipeline.id);
          }
        }
      }
      
      showSuccess('Pipeline deleted successfully');
    } catch (err: any) {
      showError(err.message || 'Failed to delete pipeline');
    }
  };

  const handleDeleteDeal = async (id: string) => {
    setIsDeletingDeal(true);
    try {
      await apiDeleteDeal(id);
      setDeals(prev => prev.filter(d => d.id !== id));
      if (selectedDeal?.id === id) {
        setSelectedDeal(null);
      }
      setDeleteConfirmDeal(null);
      showSuccess('Opportunity removed from pipeline');
    } catch (err: any) {
      showError(err.message || 'Failed to delete opportunity');
    } finally {
      setIsDeletingDeal(false);
    }
  };

  // Multi-select handlers
  const selectAllDeals = () => {
    if (selectedDealIds.length === deals.length) {
      setSelectedDealIds([]);
    } else {
      setSelectedDealIds(deals.map(d => d.id));
    }
  };

  const handleBulkDeleteDeals = async () => {
    setIsBulkDeletingDeals(true);
    try {
      const targetIds = [...selectedDealIds];
      await Promise.all(targetIds.map(id => apiDeleteDeal(id)));
      setDeals(prev => prev.filter(d => !targetIds.includes(d.id)));
      if (selectedDeal && targetIds.includes(selectedDeal.id)) {
        setSelectedDeal(null);
      }
      setSelectedDealIds([]);
      setBulkDeleteConfirmOpen(false);
      showSuccess(`Successfully deleted ${targetIds.length} opportunit${targetIds.length > 1 ? 'ies' : 'y'}`);
    } catch (err: any) {
      showError(err.message || 'Failed to delete opportunities');
    } finally {
      setIsBulkDeletingDeals(false);
    }
  };

  const handleLinkStakeholder = async (contactId: string) => {
    if (!selectedDeal) return;
    
    // Check if already linked
    if (selectedDeal.stakeholderIds?.includes(contactId)) {
      showError('Stakeholder already linked');
      return;
    }
    
    setLinkingStakeholderId(contactId);
    const updatedIds = [...(selectedDeal.stakeholderIds || []), contactId];
    try {
      await apiUpdateDeal(selectedDeal.id, { stakeholderIds: updatedIds });
      const updatedDeal = { ...selectedDeal, stakeholderIds: updatedIds };
      setSelectedDeal(updatedDeal);
      setDeals(prev => prev.map(d => d.id === selectedDeal.id ? updatedDeal : d));
      setIsLinkingStakeholder(false);
      setStakeholderSearch('');
      showSuccess('Stakeholder linked to opportunity');
    } catch (err) { 
      showError('Link failed'); 
    } finally {
      setLinkingStakeholderId(null);
    }
  };

  const dealCompany = companies.find(c => c.id === selectedDeal?.companyId);
  const dealOwner = users.find(u => u.id === selectedDeal?.ownerId);
  const linkedStakeholders = contacts.filter(c => selectedDeal?.stakeholderIds?.includes(c.id));
  const otherContacts = contacts.filter(c => !selectedDeal?.stakeholderIds?.includes(c.id) && 
    (c.name.toLowerCase().includes(stakeholderSearch.toLowerCase()) || 
     c.email.toLowerCase().includes(stakeholderSearch.toLowerCase())));

  // Initialize edit form when deal is selected
  useEffect(() => {
    if (selectedDeal && !isEditingDeal) {
      setEditFormData({
        title: selectedDeal.title,
        companyId: selectedDeal.companyId || '',
        value: selectedDeal.value ? selectedDeal.value.toString() : '',
        currency: selectedDeal.currency || DEFAULT_CURRENCY,
        stage: selectedDeal.stage,
        ownerId: selectedDeal.ownerId,
        expectedCloseDate: selectedDeal.expectedCloseDate || '',
        description: selectedDeal.description || ''
      });
    }
  }, [selectedDeal]);

  // Handle deal update
  const handleUpdateDeal = async () => {
    if (!selectedDeal) return;

    if (!editFormData.title.trim()) {
      showError('Deal title is required');
      return;
    }

    if (!editFormData.ownerId) {
      showError('Opportunity lead is required');
      return;
    }

    setIsUpdatingDeal(true);
    try {
      // Always set pipelineType to 'sales' when updating deal
      const updateData: any = {
        title: editFormData.title.trim(),
        companyId: editFormData.companyId && editFormData.companyId.trim() !== '' ? editFormData.companyId : null,
        value: parseFloat(editFormData.value) || 0,
        currency: editFormData.currency || DEFAULT_CURRENCY,
        stage: editFormData.stage,
        pipelineType: 'sales', // Always sales pipeline
        ownerId: editFormData.ownerId,
        expectedCloseDate: editFormData.expectedCloseDate && editFormData.expectedCloseDate.trim() !== '' ? editFormData.expectedCloseDate : null,
        description: editFormData.description.trim() || null
      };

      await apiUpdateDeal(selectedDeal.id, updateData);
      
      const updatedDeal = {
        ...selectedDeal,
        ...updateData
      };
      
      setDeals(prev => prev.map(d => d.id === selectedDeal.id ? updatedDeal : d));
      setSelectedDeal(updatedDeal);
      setIsEditingDeal(false);
      showSuccess('Deal updated successfully');
    } catch (err: any) {
      showError(err.message || 'Failed to update deal');
    } finally {
      setIsUpdatingDeal(false);
    }
  };

  // Fetch activity feed for deal
  const fetchDealActivities = async () => {
    if (!selectedDeal || activeDetailTab !== 'activity') return;
    setIsLoadingActivities(true);
    try {
      const res = await apiGetActivityFeed('deal', selectedDeal.id);
      setDealActivities(res?.data || []);
    } catch (err: any) {
      console.error('[PIPELINE] Failed to fetch deal activities:', err);
      setDealActivities([]);
    } finally {
      setIsLoadingActivities(false);
    }
  };

  // Fetch activities when deal is selected and activity tab is active
  useEffect(() => {
    if (selectedDeal && activeDetailTab === 'activity') {
      fetchDealActivities();
    } else {
      setDealActivities([]);
    }
  }, [selectedDeal?.id, activeDetailTab]);

  // Timeline events
  const getTimelineEvents = () => {
    if (!selectedDeal) return [];
    const events: Array<{
      id: string;
      type: 'created' | 'stage' | 'stakeholder' | 'value' | 'close_date' | 'description' | 'email_linked';
      title: string;
      description: string;
      date: string;
      icon: React.ReactNode;
      color: string;
      emailId?: string;
    }> = [];

    // Deal creation
    if (selectedDeal.createdAt) {
      events.push({
        id: 'created',
        type: 'created',
        title: 'Opportunity Created',
        description: `Deal "${selectedDeal.title}" was created${dealOwner ? ` by ${dealOwner.name}` : ''}`,
        date: selectedDeal.createdAt,
        icon: <Plus className="w-4 h-4" />,
        color: 'indigo'
      });
    }

    // Current stage
    events.push({
      id: 'stage',
      type: 'stage',
      title: `Current Stage: ${selectedDeal.stage}`,
      description: `Opportunity is currently in the ${selectedDeal.stage} stage`,
      date: selectedDeal.updatedAt || selectedDeal.createdAt || new Date().toISOString(),
      icon: <TrendingUp className="w-4 h-4" />,
      color: selectedDeal.stage === 'Won' ? 'emerald' : selectedDeal.stage === 'Lost' ? 'red' : 'blue'
    });

    // Deal value
    if (selectedDeal.value > 0) {
      events.push({
        id: 'value',
        type: 'value',
        title: `Deal Value: ${formatCurrency(selectedDeal.value, selectedDeal.currency)}`,
        description: `Gross contract revenue for this opportunity: ${formatCurrency(selectedDeal.value, selectedDeal.currency)}`,
        date: selectedDeal.updatedAt || selectedDeal.createdAt || new Date().toISOString(),
        icon: <DollarSign className="w-4 h-4" />,
        color: 'emerald'
      });
    }

    // Expected close date
    if (selectedDeal.expectedCloseDate) {
      events.push({
        id: 'close_date',
        type: 'close_date',
        title: `Expected Close Date: ${selectedDeal.expectedCloseDate}`,
        description: 'Target date for closing this opportunity',
        date: selectedDeal.expectedCloseDate,
        icon: <Calendar className="w-4 h-4" />,
        color: 'amber'
      });
    }

    // Stakeholders added
    if (linkedStakeholders.length > 0) {
      events.push({
        id: 'stakeholders',
        type: 'stakeholder',
        title: `${linkedStakeholders.length} Stakeholder${linkedStakeholders.length > 1 ? 's' : ''} Linked`,
        description: linkedStakeholders.map(s => s.name).join(', '),
        date: selectedDeal.updatedAt || selectedDeal.createdAt || new Date().toISOString(),
        icon: <Users className="w-4 h-4" />,
        color: 'purple'
      });
    }

    // Description/notes
    if (selectedDeal.description) {
      events.push({
        id: 'description',
        type: 'description',
        title: 'Strategic Context Added',
        description: selectedDeal.description.substring(0, 100) + (selectedDeal.description.length > 100 ? '...' : ''),
        date: selectedDeal.updatedAt || selectedDeal.createdAt || new Date().toISOString(),
        icon: <MessageSquare className="w-4 h-4" />,
        color: 'slate'
      });
    }

    // Add email activities
    dealActivities.forEach((activity) => {
      if (activity.activityType === 'email_linked') {
        events.push({
          id: activity.id || `email-${activity.emailId}`,
          type: 'email_linked',
          title: activity.title || 'Email Linked',
          description: activity.description || `Email "${activity.emailSubject || 'Untitled'}" from ${activity.emailSender || 'Unknown'}`,
          date: activity.createdAt,
          icon: <Mail className="w-4 h-4" />,
          color: 'indigo',
          emailId: activity.emailId
        });
      }
    });

    // Sort by date (newest first)
    return events.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  };

  return (
    <div className="h-full flex flex-col gap-6 animate-in slide-in-from-right-2 duration-500 relative">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center shrink-0 gap-4">
        <div className="flex items-center gap-4">
          <div className="relative group">
            <button className="flex items-center gap-2 px-4 py-2 bg-white border border-slate-200 rounded-xl shadow-sm hover:border-indigo-300 transition-all font-bold">
              <Layout className="w-4 h-4 text-indigo-600" />
              <span className="text-slate-900">{activePipeline?.name || 'Loading...'}</span>
              <ChevronDown className="w-4 h-4 text-slate-400" />
            </button>
            <div className="absolute top-full left-0 mt-2 w-56 bg-white border border-slate-100 rounded-2xl shadow-xl z-50 overflow-hidden opacity-0 group-hover:opacity-100 invisible group-hover:visible transition-all">
              {pipelines.length > 0 ? pipelines.map(p => (
                <button key={p.id} onClick={() => switchPipeline(p.id)} className={`w-full px-4 py-3 text-left text-sm font-bold flex items-center justify-between hover:bg-indigo-50 transition-colors ${activePipelineId === p.id ? 'text-indigo-600' : 'text-slate-600'}`}>
                  {p.name} {activePipelineId === p.id && <Check className="w-4 h-4" />}
                </button>
              )) : (
                <div className="px-4 py-3 text-sm text-slate-400">No pipelines available</div>
              )}
              <div className="p-3 border-t border-slate-50 bg-slate-50/30">
                <button onClick={() => setIsConfigOpen(true)} className="w-full text-xs text-indigo-600 font-bold hover:text-indigo-700 flex items-center gap-2">
                  <Plus className="w-3 h-3" />
                  Manage Pipelines
                </button>
              </div>
              <div className="p-3 border-t border-slate-50 bg-slate-50/30">
                <input type="text" placeholder="New Pipeline Name..." value={newPipelineName} onChange={e => setNewPipelineName(e.target.value)} onKeyDown={e => e.key === 'Enter' && createPipeline()} className="w-full text-xs px-2 py-1.5 border border-slate-200 rounded-lg outline-none focus:ring-1 focus:ring-indigo-100" />
              </div>
            </div>
          </div>
          <p className="text-slate-400 text-xs hidden lg:block font-medium">Tracking {deals.length} active opportunities</p>
        </div>
        <div className="flex gap-2 w-full sm:w-auto">
          <button onClick={() => setIsConfigOpen(true)} className="p-2 border border-slate-200 bg-white text-slate-600 rounded-lg hover:bg-slate-50 shadow-sm transition-all"><Settings2 className="w-5 h-5" /></button>
          <button onClick={() => onNewDeal()} className="flex-1 sm:flex-none px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-bold flex items-center justify-center gap-2 hover:bg-indigo-700 shadow-lg shadow-indigo-100 transition-all"><Plus className="w-4 h-4" /> New Deal</button>
        </div>
      </div>

      {/* Select All Header */}
      {!isLoading && deals.length > 0 && (
        <div className="flex items-center gap-3 pb-2">
          <input 
            type="checkbox" 
            className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 w-4 h-4"
            checked={deals.length > 0 && selectedDealIds.length === deals.length}
            onChange={selectAllDeals}
          />
          <span className="text-sm font-semibold text-slate-600">
            Select All Opportunities
          </span>
        </div>
      )}

      <div className="flex-1 flex gap-6 overflow-x-auto pb-6 -mx-4 px-4 lg:mx-0 lg:px-0 scrollbar-hide">
        {isLoading || isLoadingPipelines || !activePipeline ? (
          <div className="flex items-center justify-center w-full min-h-[400px]"><Loader2 className="w-10 h-10 animate-spin text-indigo-600" /></div>
        ) : (
          activePipeline.stages.map(stage => {
            const stageDeals = deals.filter(d => d.stage === stage);
            return (
              <div key={stage} onDragOver={e => e.preventDefault()} onDrop={e => handleDrop(e, stage)} className="flex flex-col w-[85vw] sm:w-72 lg:w-80 shrink-0 bg-slate-100/40 rounded-3xl p-4 border border-slate-200/50">
                <div className="flex justify-between items-center mb-6 px-1">
                  <div className="flex items-center gap-3">
                    <h3 className="font-black text-slate-900 text-xs uppercase tracking-widest">{stage}</h3>
                    <span className="text-[10px] bg-white text-slate-400 px-2 py-0.5 rounded-full border border-slate-200 font-bold">{stageDeals.length}</span>
                  </div>
                  <Plus onClick={() => onNewDeal(stage)} className="w-4 h-4 text-slate-300 hover:text-indigo-600 cursor-pointer transition-colors" />
                </div>
                
                <div className="flex-1 space-y-4 overflow-y-auto pr-1">
                  {stageDeals.map(deal => {
                    const company = companies.find(c => c.id === deal.companyId);
                    const isSelected = selectedDealIds.includes(deal.id);
                    return (
                      <div 
                        onClick={() => setSelectedDeal(deal)} 
                        draggable 
                        onDragStart={e => handleDragStart(e, deal.id)} 
                        key={deal.id} 
                        className={`bg-white p-5 rounded-2xl border ${isSelected ? 'border-indigo-400 bg-indigo-50/30' : 'border-slate-200'} shadow-sm hover:border-indigo-300 hover:shadow-xl transition-all cursor-move group active:scale-[0.98] relative ${draggingDealId === deal.id ? 'opacity-30' : ''}`}
                      >
                        <div className="absolute top-3 right-3" onClick={(e) => e.stopPropagation()}>
                          <input 
                            type="checkbox" 
                            className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 w-4 h-4"
                            checked={isSelected}
                            onChange={() => setSelectedDealIds(prev => isSelected ? prev.filter(id => id !== deal.id) : [...prev, deal.id])}
                          />
                        </div>
                        <div className="flex items-start gap-2.5 mb-3">
                          <ImageWithFallback src={company?.logo} fallbackText={company?.name} className="w-5 h-5 shrink-0 mt-0.5" isAvatar={false} />
                          <h4 className="font-bold text-slate-900 text-sm group-hover:text-indigo-600 transition-colors break-words leading-tight flex-1 min-w-0">{deal.title}</h4>
                        </div>
                        <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mb-4">{company?.name || 'Independent'}</p>
                        <div className="flex items-center justify-between">
                          <span className="text-indigo-600 font-black text-xs">
                            {formatCurrency(deal.value, deal.currency)}
                          </span>
                          <div className="flex items-center gap-2">
                             <span className="text-[9px] font-bold text-slate-400 uppercase">{deal.expectedCloseDate}</span>
                             <div className="w-6 h-6 bg-slate-50 rounded-full flex items-center justify-center text-[8px] font-black text-slate-300 border border-slate-100 uppercase">DE</div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Sophisticated Deal Detail Drawer */}
      {selectedDeal && (
        <div className="fixed inset-0 z-[70] overflow-hidden pointer-events-none">
          <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-md pointer-events-auto animate-in fade-in duration-300" onClick={() => { setSelectedDeal(null); setIsLinkingStakeholder(false); }} />
          <div className="absolute right-0 inset-y-0 w-full max-w-2xl bg-white shadow-2xl pointer-events-auto animate-in slide-in-from-right duration-500 flex flex-col">
            {/* Header */}
            <div className="p-8 border-b border-slate-100 bg-slate-50/50">
              <div className="flex justify-between items-start mb-6">
                <div className="flex items-center gap-4 flex-1">
                  <div className="w-16 h-16 bg-indigo-600 rounded-[20px] flex items-center justify-center text-white shadow-2xl shadow-indigo-100 ring-4 ring-indigo-50">
                    <Briefcase className="w-8 h-8" />
                  </div>
                  <div className="flex-1">
                    {isEditingDeal ? (
                      <input
                        type="text"
                        value={editFormData.title}
                        onChange={(e) => setEditFormData(prev => ({ ...prev, title: e.target.value }))}
                        className="w-full px-4 py-2 bg-white border-2 border-indigo-200 rounded-xl text-2xl font-black text-slate-900 outline-none focus:ring-4 focus:ring-indigo-100"
                        placeholder="Deal title"
                      />
                    ) : (
                      <h2 className="text-2xl font-black text-slate-900 tracking-tight">{selectedDeal.title}</h2>
                    )}
                    <div className="flex items-center gap-3 mt-1">
                      {isEditingDeal ? (
                        <select
                          value={editFormData.stage}
                          onChange={(e) => setEditFormData(prev => ({ ...prev, stage: e.target.value as Deal['stage'] }))}
                          className="px-2.5 py-1 bg-indigo-100 text-indigo-700 text-[10px] font-black uppercase rounded-lg border border-indigo-200 outline-none focus:ring-2 focus:ring-indigo-300"
                        >
                          {activePipeline?.stages?.map(stage => (
                            <option key={stage} value={stage}>{stage}</option>
                          )) || []}
                        </select>
                      ) : (
                        <span className="px-2.5 py-1 bg-indigo-100 text-indigo-700 text-[10px] font-black uppercase rounded-lg border border-indigo-200">{selectedDeal.stage}</span>
                      )}
                      <span className="text-slate-400 text-xs font-bold">• Opportunity ID: #{selectedDeal.id.substring(0, 8)}</span>
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {isEditingDeal ? (
                    <>
                      <button
                        onClick={() => {
                          setIsEditingDeal(false);
                          setEditFormData({
                            title: selectedDeal.title,
                            companyId: selectedDeal.companyId || '',
                            value: selectedDeal.value ? selectedDeal.value.toString() : '',
                            currency: selectedDeal.currency || DEFAULT_CURRENCY,
                            stage: selectedDeal.stage,
                            ownerId: selectedDeal.ownerId,
                            expectedCloseDate: selectedDeal.expectedCloseDate || '',
                            description: selectedDeal.description || ''
                          });
                        }}
                        disabled={isUpdatingDeal}
                        className="px-4 py-2 border border-slate-200 text-slate-400 font-bold text-xs uppercase tracking-widest rounded-xl hover:bg-slate-50 transition-all disabled:opacity-50"
                      >
                        Cancel
                      </button>
                      <button
                        onClick={handleUpdateDeal}
                        disabled={isUpdatingDeal || !editFormData.title.trim() || !editFormData.ownerId}
                        className="px-4 py-2 bg-indigo-600 text-white font-bold text-xs uppercase tracking-widest rounded-xl hover:bg-indigo-700 transition-all shadow-lg flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {isUpdatingDeal ? (
                          <>
                            <Loader2 className="w-4 h-4 animate-spin" />
                            Saving...
                          </>
                        ) : (
                          <>
                            <Save className="w-4 h-4" />
                            Save Changes
                          </>
                        )}
                      </button>
                    </>
                  ) : (
                    <button
                      onClick={() => setIsEditingDeal(true)}
                      className="px-4 py-2 bg-indigo-600 text-white font-bold text-xs uppercase tracking-widest rounded-xl hover:bg-indigo-700 transition-all shadow-lg flex items-center gap-2"
                    >
                      <Edit2 className="w-4 h-4" />
                      Edit Deal
                    </button>
                  )}
                  <button onClick={() => { setSelectedDeal(null); setIsLinkingStakeholder(false); setIsEditingDeal(false); }} className="p-3 hover:bg-white rounded-full text-slate-400 shadow-sm transition-all"><X className="w-6 h-6" /></button>
                </div>
              </div>

              {/* Tabs */}
              <div className="flex bg-white p-1 rounded-2xl border border-slate-100 w-fit">
                {[
                  { id: 'overview', label: 'Overview', icon: <Info className="w-4 h-4" /> },
                  { id: 'activity', label: 'Timeline', icon: <History className="w-4 h-4" /> },
                  { id: 'stakeholders', label: 'Stakeholders', icon: <Users className="w-4 h-4" /> },
                ].map(tab => (
                  <button
                    key={tab.id}
                    onClick={() => { 
                      setActiveDetailTab(tab.id as any); 
                      setIsLinkingStakeholder(false);
                      setIsEditingDeal(false);
                    }}
                    className={`flex items-center gap-2 px-6 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${
                      activeDetailTab === tab.id ? 'bg-indigo-600 text-white shadow-lg' : 'text-slate-400 hover:text-slate-600 hover:bg-slate-50'
                    }`}
                  >
                    {tab.icon} {tab.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Content Area */}
            <div className="flex-1 overflow-y-auto p-8 space-y-10 custom-scrollbar">
              {activeDetailTab === 'overview' && (
                <div className="space-y-10 animate-in fade-in slide-in-from-bottom-2 duration-300">
                  {/* Financial Summary */}
                  {isEditingDeal ? (
                    <div className="space-y-6">
                      {/* Deal Value - Full Width When Editing */}
                      <div className="p-6 bg-slate-50 rounded-[32px] border border-slate-100 flex flex-col justify-between">
                        <div className="flex justify-between items-start mb-4">
                          <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Deal Value</p>
                          <PieChart className="w-4 h-4 text-indigo-400" />
                        </div>
                        <div className="space-y-3">
                          <div className="flex gap-3 items-center">
                            {/* Currency Dropdown */}
                            <select
                              value={editFormData.currency || DEFAULT_CURRENCY}
                              onChange={(e) => setEditFormData(prev => ({ ...prev, currency: e.target.value }))}
                              className="px-4 py-3 text-sm font-bold bg-white border-2 border-indigo-200 rounded-xl outline-none focus:ring-4 focus:ring-indigo-100 text-indigo-600 appearance-none min-w-[140px] h-[60px]"
                              style={{
                                backgroundImage: `url('data:image/svg+xml;charset=utf-8,%3Csvg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 20 20"%3E%3Cpath stroke="%236366f1" stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="m6 8 4 4 4-4"/%3E%3C/svg%3E')`,
                                backgroundRepeat: 'no-repeat',
                                backgroundPosition: 'right 8px center',
                                backgroundSize: '16px',
                                paddingRight: '32px',
                                height: '60px'
                              }}
                            >
                              {CURRENCIES.map(currency => (
                                <option key={currency.code} value={currency.code}>
                                  {currency.code} ({currency.symbol})
                                </option>
                              ))}
                            </select>
                            {/* Value Input */}
                            <div className="relative flex-1 min-w-[200px]">
                              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-indigo-600 font-black text-xl pointer-events-none z-10">
                                {getCurrencySymbol(editFormData.currency || DEFAULT_CURRENCY)}
                              </span>
                              <input
                                type="number"
                                step="0.01"
                                min="0"
                                value={editFormData.value || ''}
                                onChange={(e) => setEditFormData(prev => ({ ...prev, value: e.target.value }))}
                                className="w-full pl-10 pr-4 py-3 text-2xl font-black text-indigo-600 bg-white border-2 border-indigo-200 rounded-xl outline-none focus:ring-4 focus:ring-indigo-100 focus:border-indigo-400 placeholder:text-slate-300 h-[60px]"
                                placeholder="0"
                                autoFocus={false}
                                style={{ 
                                  WebkitAppearance: 'textfield',
                                  MozAppearance: 'textfield',
                                  appearance: 'textfield',
                                  color: '#4f46e5',
                                  fontSize: '1.5rem',
                                  fontWeight: '900',
                                  height: '60px'
                                }}
                              />
                            </div>
                          </div>
                        </div>
                        <p className="text-[10px] font-bold text-slate-400 mt-2">Gross Contract Revenue</p>
                      </div>
                      {/* Expected Close Date - New Line When Editing */}
                      <div className="p-6 bg-slate-50 rounded-[32px] border border-slate-100 flex flex-col justify-between">
                        <div className="flex justify-between items-start mb-4">
                          <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Expected Close Date</p>
                          <Calendar className="w-4 h-4 text-indigo-400" />
                        </div>
                        <input
                          type="date"
                          value={editFormData.expectedCloseDate}
                          onChange={(e) => setEditFormData(prev => ({ ...prev, expectedCloseDate: e.target.value }))}
                          className="text-xl font-black text-slate-900 bg-white border-2 border-indigo-200 rounded-xl px-3 py-2 outline-none focus:ring-4 focus:ring-indigo-100 w-full"
                        />
                        <p className="text-[10px] font-bold text-slate-400 mt-2">Target Implementation</p>
                      </div>
                    </div>
                  ) : (
                    <div className="grid grid-cols-2 gap-6">
                      <div className="p-6 bg-slate-50 rounded-[32px] border border-slate-100 flex flex-col justify-between">
                        <div className="flex justify-between items-start mb-4">
                          <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Deal Value</p>
                          <PieChart className="w-4 h-4 text-indigo-400" />
                        </div>
                        <h3 className="text-3xl font-black text-indigo-600">
                          {formatCurrency(selectedDeal.value, selectedDeal.currency)}
                        </h3>
                        <p className="text-[10px] font-bold text-slate-400 mt-2">Gross Contract Revenue</p>
                      </div>
                      <div className="p-6 bg-slate-50 rounded-[32px] border border-slate-100 flex flex-col justify-between">
                        <div className="flex justify-between items-start mb-4">
                          <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Expected Close Date</p>
                          <Calendar className="w-4 h-4 text-indigo-400" />
                        </div>
                        <h3 className="text-2xl font-black text-slate-900">{selectedDeal.expectedCloseDate || 'Not set'}</h3>
                        <p className="text-[10px] font-bold text-slate-400 mt-2">Target Implementation</p>
                      </div>
                    </div>
                  )}

                  {/* Account & Owner Info */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    <div className="space-y-4">
                      <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest flex items-center gap-2"><Building2 className="w-4 h-4" /> Account Association</h3>
                      {isEditingDeal ? (
                        <select
                          value={editFormData.companyId}
                          onChange={(e) => setEditFormData(prev => ({ ...prev, companyId: e.target.value }))}
                          className="w-full p-5 bg-white border-2 border-indigo-200 rounded-3xl shadow-sm outline-none focus:ring-4 focus:ring-indigo-100 text-sm font-bold"
                        >
                          <option value="">Independent/Direct</option>
                          {companies.map(company => (
                            <option key={company.id} value={company.id}>{company.name}</option>
                          ))}
                        </select>
                      ) : (
                        <div className="p-5 bg-white border border-slate-100 rounded-3xl shadow-sm hover:border-indigo-300 transition-all group flex items-center gap-4">
                          <ImageWithFallback src={dealCompany?.logo} className="w-14 h-14" fallbackText={dealCompany?.name || 'A'} isAvatar={false} />
                          <div className="flex-1">
                            <p className="font-black text-slate-900">{dealCompany?.name || 'Independent/Direct'}</p>
                            <p className="text-xs text-indigo-500 font-bold">{dealCompany?.industry || 'Uncategorized'}</p>
                          </div>
                          <button className="p-2 text-slate-300 hover:text-indigo-600 transition-colors"><ExternalLink className="w-4 h-4" /></button>
                        </div>
                      )}
                    </div>
                    <div className="space-y-4">
                      <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest flex items-center gap-2"><ShieldCheck className="w-4 h-4" /> Opportunity Lead</h3>
                      {isEditingDeal ? (
                        <select
                          value={editFormData.ownerId}
                          onChange={(e) => setEditFormData(prev => ({ ...prev, ownerId: e.target.value }))}
                          className="w-full p-5 bg-white border-2 border-indigo-200 rounded-3xl shadow-sm outline-none focus:ring-4 focus:ring-indigo-100 text-sm font-bold"
                          required
                        >
                          <option value="">Select Owner</option>
                          {users.map(user => (
                            <option key={user.id} value={user.id}>{user.name} ({user.role})</option>
                          ))}
                        </select>
                      ) : (
                        <div className="p-5 bg-white border border-slate-100 rounded-3xl shadow-sm flex items-center gap-4">
                          <ImageWithFallback src={dealOwner?.avatar} className="w-14 h-14" fallbackText={dealOwner?.name || 'U'} isAvatar={true} />
                          <div className="flex-1">
                            <p className="font-black text-slate-900">{dealOwner?.name || 'Unassigned'}</p>
                            <p className="text-xs text-slate-400 font-bold uppercase">{dealOwner?.role || 'Teammate'}</p>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Operational Notes */}
                  <div className="space-y-4">
                    <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest flex items-center gap-2"><MessageSquare className="w-4 h-4" /> Strategic Context</h3>
                    {isEditingDeal ? (
                      <textarea
                        value={editFormData.description}
                        onChange={(e) => setEditFormData(prev => ({ ...prev, description: e.target.value }))}
                        rows={6}
                        className="w-full p-8 bg-slate-950 rounded-[40px] text-indigo-50 border-2 border-indigo-200 outline-none focus:ring-4 focus:ring-indigo-100 resize-none text-sm leading-relaxed italic"
                        placeholder="Enter strategic context and operational notes..."
                      />
                    ) : (
                      <div className="p-8 bg-slate-950 rounded-[40px] text-indigo-50 relative overflow-hidden group">
                        <p className="text-sm leading-relaxed italic opacity-80 z-10 relative">
                          {selectedDeal.description || "The logistics assessment phase is currently gathering data points to populate this strategic summary. No specific operational notes are archived yet."}
                        </p>
                        <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-500/10 blur-[80px] rounded-full translate-x-1/2 -translate-y-1/2" />
                      </div>
                    )}
                  </div>
                  
                  {/* Strategic Roadmap (Formerly Generate Proposal) */}
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                       <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest">Digital Readiness & Proposal</h3>
                       <span className="px-2 py-0.5 bg-indigo-100 text-indigo-700 text-[9px] font-black uppercase rounded-full border border-indigo-200 flex items-center gap-1"><Sparkles className="w-2.5 h-2.5" /> AI Engine</span>
                    </div>
                    <div className="p-6 border-2 border-dashed border-slate-200 rounded-[32px] flex flex-col items-center text-center">
                       <div className="w-12 h-12 bg-slate-50 rounded-full flex items-center justify-center text-slate-300 mb-4"><FileText className="w-6 h-6" /></div>
                       <p className="text-sm font-bold text-slate-900 mb-1">Proposal Engine Coming Soon</p>
                       <p className="text-xs text-slate-400 mb-6 max-w-xs">Automated PDF generation and strategic roadmap visualization for this opportunity are in final audit.</p>
                       <button onClick={() => showInfo('Proposal engine is currently in development.')} className="px-6 py-2.5 bg-slate-900 text-white rounded-xl text-xs font-black uppercase tracking-widest hover:bg-slate-800 transition-all opacity-50 cursor-not-allowed">
                          Generate Proposal [LOCKED]
                       </button>
                    </div>
                  </div>
                </div>
              )}

              {activeDetailTab === 'activity' && (
                <div className="space-y-8 animate-in fade-in slide-in-from-left-4 duration-300">
                  <div>
                    <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest flex items-center gap-2 mb-6">
                      <History className="w-4 h-4 text-indigo-500" /> Opportunity Timeline
                    </h3>
                    {isLoadingActivities ? (
                      <div className="flex items-center justify-center py-20">
                        <Loader2 className="w-6 h-6 animate-spin text-indigo-600" />
                      </div>
                    ) : (() => {
                      const timelineEvents = getTimelineEvents();
                      if (timelineEvents.length === 0) {
                        return (
                          <div className="py-20 bg-white border border-dashed border-slate-200 rounded-3xl text-center">
                            <History className="w-12 h-12 text-slate-300 mx-auto mb-4" />
                            <p className="text-sm font-bold text-slate-400">No timeline events available</p>
                          </div>
                        );
                      }
                      return (
                        <div className="relative">
                          {/* Timeline line */}
                          <div className="absolute left-6 top-0 bottom-0 w-0.5 bg-slate-200" />
                          
                          <div className="space-y-6">
                            {timelineEvents.map((event, index) => {
                              const getColorClasses = (color: string) => {
                                const colors: { [key: string]: string } = {
                                  indigo: 'bg-indigo-50 text-indigo-600 border-indigo-200',
                                  blue: 'bg-blue-50 text-blue-600 border-blue-200',
                                  emerald: 'bg-emerald-50 text-emerald-600 border-emerald-200',
                                  amber: 'bg-amber-50 text-amber-600 border-amber-200',
                                  purple: 'bg-purple-50 text-purple-600 border-purple-200',
                                  red: 'bg-red-50 text-red-600 border-red-200',
                                  slate: 'bg-slate-50 text-slate-600 border-slate-200'
                                };
                                return colors[color] || colors.slate;
                              };

                              const eventDate = new Date(event.date);
                              const formattedDate = eventDate.toLocaleDateString('en-US', { 
                                month: 'short', 
                                day: 'numeric', 
                                year: 'numeric' 
                              });
                              const formattedTime = eventDate.toLocaleTimeString('en-US', { 
                                hour: '2-digit', 
                                minute: '2-digit' 
                              });

                              return (
                                <div key={event.id} className="relative flex items-start gap-4">
                                  {/* Timeline dot */}
                                  <div className={`relative z-10 w-12 h-12 rounded-full border-2 ${getColorClasses(event.color)} flex items-center justify-center flex-shrink-0`}>
                                    {event.icon}
                                  </div>
                                  
                                  {/* Event content */}
                                  <div className="flex-1 pb-6">
                                    <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm hover:shadow-md transition-all">
                                      <div className="flex items-start justify-between mb-2">
                                        <h4 className="font-black text-slate-900 text-sm">{event.title}</h4>
                                        <span className="text-[10px] font-bold text-slate-400 uppercase whitespace-nowrap ml-4">
                                          {formattedDate} {formattedTime}
                                        </span>
                                      </div>
                                      <p className="text-xs text-slate-600 leading-relaxed">{event.description}</p>
                                      {event.type === 'email_linked' && event.emailId && (
                                        <button
                                          onClick={() => {
                                            onNavigate('inbox');
                                            setTimeout(() => {
                                              window.location.hash = `email=${event.emailId}`;
                                            }, 100);
                                          }}
                                          className="mt-3 text-xs text-indigo-600 hover:text-indigo-700 font-bold flex items-center gap-1.5"
                                        >
                                          <ExternalLink className="w-3 h-3" /> View Email
                                        </button>
                                      )}
                                    </div>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      );
                    })()}
                  </div>

                  {/* Summary Cards */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-8 border-t border-slate-100">
                    <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200">
                      <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Days in Pipeline</p>
                      <p className="text-xl font-black text-slate-900">
                        {selectedDeal.createdAt 
                          ? Math.floor((new Date().getTime() - new Date(selectedDeal.createdAt).getTime()) / (1000 * 60 * 60 * 24))
                          : 'N/A'}
                      </p>
                    </div>
                    <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200">
                      <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Current Stage</p>
                      <p className="text-xl font-black text-slate-900">{selectedDeal.stage}</p>
                    </div>
                    <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200">
                      <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Stakeholders</p>
                      <p className="text-xl font-black text-slate-900">{linkedStakeholders.length}</p>
                    </div>
                  </div>
                </div>
              )}

              {activeDetailTab === 'stakeholders' && (
                <div className="space-y-8 animate-in fade-in slide-in-from-left-4 duration-300">
                  <div className="flex justify-between items-center">
                    <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest">Key Account Decision Makers</h3>
                    {!isLinkingStakeholder && (
                      <button onClick={() => setIsLinkingStakeholder(true)} className="flex items-center gap-2 text-[10px] font-black text-indigo-600 uppercase tracking-widest bg-indigo-50 px-3 py-1.5 rounded-xl hover:bg-indigo-100">
                        <UserPlus className="w-3 h-3" /> Link Person
                      </button>
                    )}
                  </div>

                  {isLinkingStakeholder ? (
                    <div className="p-6 bg-slate-50 border border-slate-200 rounded-[32px] animate-in slide-in-from-top-2">
                       <div className="flex justify-between items-center mb-6">
                         <h4 className="text-sm font-black text-slate-900">Select Existing Contact</h4>
                         <button onClick={() => setIsLinkingStakeholder(false)} className="p-1 hover:bg-white rounded-lg"><X className="w-4 h-4 text-slate-400" /></button>
                       </div>
                       <div className="relative mb-6">
                         <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                         <input type="text" placeholder="Search global registry..." value={stakeholderSearch} onChange={e => setStakeholderSearch(e.target.value)} className="w-full pl-10 pr-4 py-2.5 bg-white border border-slate-200 rounded-xl text-xs" />
                       </div>
                       <div className="space-y-2 max-h-[300px] overflow-y-auto pr-2 custom-scrollbar">
                         {otherContacts.length > 0 ? otherContacts.map(c => {
                           const isLinking = linkingStakeholderId === c.id;
                           return (
                             <button 
                               key={c.id} 
                               onClick={() => handleLinkStakeholder(c.id)} 
                               disabled={isLinking || !!linkingStakeholderId}
                               className="w-full p-4 bg-white border border-slate-100 rounded-2xl flex items-center gap-3 hover:border-indigo-400 hover:shadow-sm transition-all text-left group disabled:opacity-50 disabled:cursor-not-allowed"
                             >
                                <div className="w-10 h-10 bg-indigo-50 rounded-xl flex items-center justify-center text-indigo-600 font-black text-xs uppercase group-hover:scale-105 transition-transform">{c.name.charAt(0)}</div>
                                <div className="flex-1 overflow-hidden">
                                  <p className="font-bold text-xs text-slate-900 truncate">{c.name}</p>
                                  <p className="text-[10px] text-slate-500 font-bold uppercase truncate">{c.role}</p>
                                </div>
                                {isLinking ? (
                                  <Loader2 className="w-4 h-4 text-indigo-600 animate-spin" />
                                ) : (
                                  <Plus className="w-4 h-4 text-slate-300 group-hover:text-indigo-600" />
                                )}
                             </button>
                           );
                         }) : <div className="py-10 text-center text-xs text-slate-400">No matching contacts found in CRM.</div>}
                       </div>
                    </div>
                  ) : linkedStakeholders.length > 0 ? (
                    <div className="grid grid-cols-1 gap-3">
                      {linkedStakeholders.map(contact => (
                        <div key={contact.id} className="p-4 bg-white border border-slate-100 rounded-3xl flex items-center justify-between hover:border-indigo-200 transition-all shadow-sm">
                          <div className="flex items-center gap-4">
                            <div className="w-12 h-12 bg-indigo-50 rounded-2xl flex items-center justify-center text-indigo-600 font-black text-lg">{contact.name.charAt(0)}</div>
                            <div>
                              <p className="font-bold text-slate-900">{contact.name}</p>
                              <p className="text-[10px] text-slate-400 font-bold uppercase">{contact.role}</p>
                            </div>
                          </div>
                          <div className="flex gap-2">
                             <button 
                               onClick={async () => {
                                 if (!selectedDeal) return;
                                 setRemovingStakeholderId(contact.id);
                                 try {
                                   const updated = (selectedDeal.stakeholderIds || []).filter(id => id !== contact.id);
                                   await apiUpdateDeal(selectedDeal.id, { stakeholderIds: updated });
                                   const deal = { ...selectedDeal, stakeholderIds: updated };
                                   setSelectedDeal(deal);
                                   setDeals(prev => prev.map(d => d.id === selectedDeal.id ? deal : d));
                                   showSuccess('Stakeholder removed');
                                 } catch (err) {
                                   showError('Failed to remove stakeholder');
                                 } finally {
                                   setRemovingStakeholderId(null);
                                 }
                               }} 
                               disabled={removingStakeholderId === contact.id}
                               className="p-2 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-xl disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
                             >
                               {removingStakeholderId === contact.id ? (
                                 <Loader2 className="w-4 h-4 animate-spin text-red-500" />
                               ) : (
                                 <Trash2 className="w-4 h-4" />
                               )}
                             </button>
                             <button className="p-2 text-slate-300 hover:text-indigo-600"><ChevronRight className="w-5 h-5" /></button>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="p-12 border-2 border-dashed border-slate-100 rounded-[40px] text-center">
                      <Users className="w-12 h-12 text-slate-200 mx-auto mb-4" />
                      <p className="text-xs text-slate-400 font-medium">No stakeholders linked to this opportunity yet.</p>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Footer Actions */}
            <div className="p-8 border-t border-slate-100 bg-white flex gap-4">
              <button onClick={() => setDeleteConfirmDeal(selectedDeal)} className="px-6 py-4 border border-slate-200 bg-white text-red-500 hover:bg-red-50 rounded-[24px] transition-all group"><Trash2 className="w-6 h-6 group-hover:scale-110 transition-transform" /></button>
              <button onClick={() => showInfo('Lifecycle management automated through digital registry.')} className="flex-1 py-4 bg-slate-900 text-white font-black uppercase text-xs tracking-[0.2em] rounded-[24px] hover:bg-indigo-700 active:scale-95 transition-all shadow-2xl flex items-center justify-center gap-3">
                <CheckSquare className="w-5 h-5" /> Confirm Strategic Deployment
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deleteConfirmDeal && (
        <div className="fixed inset-0 z-[130] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-300">
          <div className="bg-white rounded-[32px] w-full max-w-md shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="p-8 border-b border-slate-100">
              <div className="flex items-center gap-4 mb-6">
                <div className="w-12 h-12 rounded-2xl flex items-center justify-center bg-red-50 text-red-600">
                  <Trash2 className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-xl font-black text-slate-900">Delete Opportunity?</h3>
                  <p className="text-xs text-slate-400 font-medium mt-1">
                    This action cannot be undone. The opportunity will be permanently removed from the pipeline.
                  </p>
                </div>
              </div>
              <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200">
                <div className="flex items-center gap-3 mb-2">
                  <Briefcase className="w-5 h-5 text-indigo-500" />
                  <div className="flex-1">
                    <p className="text-sm font-bold text-slate-900">{deleteConfirmDeal.title}</p>
                    <div className="flex items-center gap-2 mt-1">
                      <span className="text-[10px] text-slate-400 font-bold uppercase">{deleteConfirmDeal.stage}</span>
                      <span className="w-1 h-1 rounded-full bg-slate-300" />
                      <span className="text-[10px] text-indigo-600 font-black">${deleteConfirmDeal.value.toLocaleString()}</span>
                    </div>
                  </div>
                </div>
                {dealCompany && (
                  <div className="flex items-center gap-2 mt-3 pt-3 border-t border-slate-200">
                    <ImageWithFallback src={dealCompany.logo} fallbackText={dealCompany.name} className="w-6 h-6" isAvatar={false} />
                    <p className="text-xs font-bold text-slate-600">{dealCompany.name}</p>
                  </div>
                )}
              </div>
            </div>
            <div className="p-6 flex gap-3">
              <button
                onClick={() => setDeleteConfirmDeal(null)}
                disabled={isDeletingDeal}
                className="flex-1 py-3 border border-slate-200 text-slate-400 font-black uppercase text-xs tracking-widest rounded-xl hover:bg-slate-50 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Cancel
              </button>
              <button
                onClick={() => handleDeleteDeal(deleteConfirmDeal.id)}
                disabled={isDeletingDeal}
                className="flex-1 py-3 bg-red-600 text-white font-black uppercase text-xs tracking-widest rounded-xl hover:bg-red-700 transition-all shadow-lg disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {isDeletingDeal ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Deleting...
                  </>
                ) : (
                  'Delete Opportunity'
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Bulk Action Bar */}
      {selectedDealIds.length > 0 && (
        <div className="fixed bottom-8 left-1/2 -translate-x-1/2 z-[100] animate-in slide-in-from-bottom-10 duration-300">
          <div className="bg-slate-900 text-white rounded-3xl shadow-2xl px-8 py-4 flex items-center gap-8 border border-white/10 ring-4 ring-indigo-500/10">
            <span className="text-sm font-black flex items-center gap-3">
              <div className="w-6 h-6 bg-indigo-500 rounded-full flex items-center justify-center text-[10px]">
                {selectedDealIds.length}
              </div>
              Selected
            </span>
            <div className="h-8 w-px bg-white/10" />
            <div className="flex items-center gap-3">
              <button 
                onClick={(e) => { 
                  e.stopPropagation(); 
                  setBulkDeleteConfirmOpen(true);
                }}
                disabled={isBulkDeletingDeals}
                className="px-5 py-2 bg-red-600 hover:bg-red-700 rounded-xl text-xs font-black uppercase tracking-widest transition-all flex items-center gap-2 disabled:opacity-50"
              >
                {isBulkDeletingDeals ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <Trash2 className="w-3.5 h-3.5" />
                )}
                Delete
              </button>
              <button 
                onClick={() => setSelectedDealIds([])} 
                className="p-2 hover:bg-white/10 rounded-xl text-slate-400 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Bulk Delete Confirmation Modal */}
      {bulkDeleteConfirmOpen && selectedDealIds.length > 0 && (
        <div className="fixed inset-0 z-[130] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-300">
          <div className="bg-white rounded-[32px] w-full max-w-md shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="p-8 border-b border-slate-100">
              <div className="flex items-center gap-4 mb-6">
                <div className="w-12 h-12 rounded-2xl flex items-center justify-center bg-red-50 text-red-600">
                  <Trash2 className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-xl font-black text-slate-900">
                    Delete {selectedDealIds.length} Opportunit{selectedDealIds.length > 1 ? 'ies' : 'y'}?
                  </h3>
                  <p className="text-xs text-slate-400 font-medium mt-1">
                    This action cannot be undone. The opportunities will be permanently removed from the pipeline.
                  </p>
                </div>
              </div>
              <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 max-h-48 overflow-y-auto">
                {deals.filter(d => selectedDealIds.includes(d.id)).slice(0, 5).map(deal => {
                  const company = companies.find(c => c.id === deal.companyId);
                  return (
                    <div key={deal.id} className="flex items-center gap-3 mb-2 last:mb-0">
                      <Briefcase className="w-4 h-4 text-indigo-500" />
                      <div className="flex-1">
                        <p className="text-xs font-bold text-slate-900">{deal.title}</p>
                        <div className="flex items-center gap-2 mt-0.5">
                          <span className="text-[10px] text-slate-400 font-bold uppercase">{deal.stage}</span>
                          <span className="w-1 h-1 rounded-full bg-slate-300" />
                          <span className="text-[10px] text-indigo-600 font-black">${deal.value.toLocaleString()}</span>
                        </div>
                      </div>
                    </div>
                  );
                })}
                {selectedDealIds.length > 5 && (
                  <p className="text-xs text-slate-400 font-medium mt-2 text-center">
                    + {selectedDealIds.length - 5} more
                  </p>
                )}
              </div>
            </div>
            <div className="p-6 flex gap-3">
              <button
                onClick={() => setBulkDeleteConfirmOpen(false)}
                disabled={isBulkDeletingDeals}
                className="flex-1 py-3 border border-slate-200 text-slate-400 font-black uppercase text-xs tracking-widest rounded-xl hover:bg-slate-50 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Cancel
              </button>
              <button
                onClick={handleBulkDeleteDeals}
                disabled={isBulkDeletingDeals}
                className="flex-1 py-3 bg-red-600 text-white font-black uppercase text-xs tracking-widest rounded-xl hover:bg-red-700 transition-all shadow-lg disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {isBulkDeletingDeals ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Deleting...
                  </>
                ) : (
                  `Delete ${selectedDealIds.length} Opportunit${selectedDealIds.length > 1 ? 'ies' : 'y'}`
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Pipeline Settings Sidebar View */}
      {isSettingsViewOpen && (
        <div className="fixed inset-0 z-[140] flex">
          {/* Backdrop */}
          <div 
            className="flex-1 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-300"
            onClick={() => setIsSettingsViewOpen(false)}
          />
          
          {/* Settings Sidebar */}
          <div className="w-full max-w-md bg-white shadow-2xl animate-in slide-in-from-right duration-300 overflow-y-auto">
            <div className="sticky top-0 bg-white border-b border-slate-200 p-6 flex items-center justify-between z-10">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-indigo-100 rounded-xl flex items-center justify-center">
                  <Settings2 className="w-5 h-5 text-indigo-600" />
                </div>
                <div>
                  <h2 className="font-black text-xl text-slate-900">Pipeline Settings</h2>
                  <p className="text-xs text-slate-400 font-medium">Configure your pipeline stages</p>
                </div>
              </div>
              <button 
                onClick={() => setIsSettingsViewOpen(false)}
                className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
              >
                <X className="w-5 h-5 text-slate-400" />
              </button>
            </div>

            <div className="p-6 space-y-6">
              {/* Active Pipeline Selection */}
              <div className="space-y-3">
                <label className="text-xs font-black text-slate-400 uppercase tracking-widest">
                  Sales Pipelines
                </label>
                <div className="space-y-2">
                  {pipelines.map(pipeline => (
                    <button
                      key={pipeline.id}
                      onClick={() => switchPipeline(pipeline.id)}
                      className={`w-full p-4 rounded-xl border-2 transition-all text-left ${
                        activePipelineId === pipeline.id
                          ? 'border-indigo-500 bg-indigo-50'
                          : 'border-slate-200 bg-white hover:border-indigo-200'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="font-bold text-slate-900">{pipeline.name}</p>
                          <p className="text-xs text-slate-400 mt-1">{pipeline.stages.length} stages</p>
                        </div>
                        {activePipelineId === pipeline.id && (
                          <Check className="w-5 h-5 text-indigo-600" />
                        )}
                      </div>
                    </button>
                  ))}
                </div>
              </div>

              {/* Current Pipeline Stages */}
              {activePipeline && (
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-black text-slate-400 uppercase tracking-widest">Stages</label>
                    <span className="text-xs text-slate-400 font-bold">{activePipeline.stages.length} stages</span>
                  </div>
                  <div className="space-y-2">
                    {activePipeline.stages.map((stage, index) => (
                      <div
                        key={stage}
                        className="flex items-center gap-3 p-3 bg-slate-50 rounded-xl border border-slate-200"
                      >
                        <div className="w-6 h-6 bg-indigo-100 rounded-lg flex items-center justify-center text-xs font-black text-indigo-600">
                          {index + 1}
                        </div>
                        <div className="flex-1">
                          <p className="font-bold text-sm text-slate-900">{stage}</p>
                          <p className="text-xs text-slate-400">
                            {deals.filter(d => d.stage === stage).length} deals
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Pipeline Statistics */}
              <div className="p-4 bg-gradient-to-br from-indigo-50 to-purple-50 rounded-xl border border-indigo-100">
                <div className="flex items-center gap-3 mb-4">
                  <PieChart className="w-5 h-5 text-indigo-600" />
                  <h3 className="font-black text-slate-900">Pipeline Overview</h3>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="bg-white/60 rounded-lg p-3 border border-white/80">
                    <p className="text-xs text-slate-400 font-bold uppercase">Total Deals</p>
                    <p className="text-2xl font-black text-slate-900 mt-1">{deals.length}</p>
                  </div>
                  <div className="bg-white/60 rounded-lg p-3 border border-white/80">
                    <p className="text-xs text-slate-400 font-bold uppercase">Total Value</p>
                    <p className="text-lg font-black text-slate-900 mt-1">
                      ${deals.reduce((sum, d) => sum + (d.value || 0), 0).toLocaleString()}
                    </p>
                  </div>
                </div>
              </div>

              {/* Quick Actions */}
              <div className="space-y-3">
                <label className="text-xs font-black text-slate-400 uppercase tracking-widest">Quick Actions</label>
                <div className="space-y-2">
                  <button
                    onClick={() => {
                      setIsSettingsViewOpen(false);
                      setIsConfigOpen(true);
                    }}
                    className="w-full p-4 bg-white border-2 border-slate-200 rounded-xl hover:border-indigo-300 hover:bg-indigo-50 transition-all text-left flex items-center gap-3"
                  >
                    <Layout className="w-5 h-5 text-indigo-600" />
                    <div>
                      <p className="font-bold text-slate-900">Edit Pipeline</p>
                      <p className="text-xs text-slate-400">Add or remove stages</p>
                    </div>
                    <ChevronRight className="w-5 h-5 text-slate-300 ml-auto" />
                  </button>
                  <button
                    onClick={() => {
                      setIsSettingsViewOpen(false);
                      fetchData();
                      showSuccess('Pipeline refreshed');
                    }}
                    className="w-full p-4 bg-white border-2 border-slate-200 rounded-xl hover:border-indigo-300 hover:bg-indigo-50 transition-all text-left flex items-center gap-3"
                  >
                    <RefreshCw className="w-5 h-5 text-indigo-600" />
                    <div>
                      <p className="font-bold text-slate-900">Refresh Data</p>
                      <p className="text-xs text-slate-400">Reload all deals</p>
                    </div>
                    <ChevronRight className="w-5 h-5 text-slate-300 ml-auto" />
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Pipeline Configuration Modal */}
      {isConfigOpen && (
        <div className="fixed inset-0 z-[150] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-300">
          <div className="bg-white rounded-2xl w-full max-w-2xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="p-6 border-b border-slate-100 flex items-center justify-between">
              <h3 className="font-black text-xl text-slate-900">Pipeline Configuration</h3>
              <button onClick={() => setIsConfigOpen(false)} className="p-2 hover:bg-slate-100 rounded-lg">
                <X className="w-5 h-5 text-slate-400" />
              </button>
            </div>
            <div className="p-6 space-y-6 max-h-[70vh] overflow-y-auto">
              {/* Pipeline Selection */}
              <div>
                <label className="text-xs font-black text-slate-400 uppercase tracking-widest mb-3 block">Select Pipeline</label>
                <div className="space-y-2">
                  {pipelines.map(p => (
                    <button
                      key={p.id}
                      onClick={() => switchPipeline(p.id)}
                      className={`w-full p-3 rounded-xl border-2 text-left ${
                        activePipelineId === p.id ? 'border-indigo-500 bg-indigo-50' : 'border-slate-200'
                      }`}
                    >
                      <p className="font-bold">{p.name}</p>
                    </button>
                  ))}
                </div>
              </div>

              {/* Edit Stages */}
              {activePipeline && (
                <div>
                  <label className="text-xs font-black text-slate-400 uppercase tracking-widest mb-3 block">Edit Stages</label>
                  <div className="space-y-2">
                    {activePipeline.stages.map((stage, idx) => (
                      <div key={idx} className="flex items-center gap-2 p-3 bg-slate-50 rounded-xl">
                        <span className="text-sm font-bold text-slate-900 flex-1">{stage}</span>
                        <button
                          onClick={() => removeStage(idx)}
                          disabled={removingStageIndex !== null}
                          className="p-1.5 text-red-500 hover:bg-red-50 rounded-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
                        >
                          {removingStageIndex === idx ? (
                            <Loader2 className="w-4 h-4 animate-spin" />
                          ) : (
                            <Trash2 className="w-4 h-4" />
                          )}
                        </button>
                      </div>
                    ))}
                  </div>
                  <div className="flex gap-2 mt-3">
                    <input
                      type="text"
                      placeholder="New stage name..."
                      value={newStageName}
                      onChange={e => setNewStageName(e.target.value)}
                      onKeyDown={e => {
                        if (e.key === 'Enter' && newStageName.trim() && !isAddingStage) {
                          addStage();
                        }
                      }}
                      disabled={isAddingStage}
                      className="flex-1 px-4 py-2 border border-slate-200 rounded-xl text-sm disabled:opacity-50 disabled:cursor-not-allowed"
                    />
                    <button
                      onClick={addStage}
                      disabled={isAddingStage || !newStageName.trim()}
                      className="px-4 py-2 bg-indigo-600 text-white rounded-xl font-bold text-sm disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 min-w-[80px]"
                    >
                      {isAddingStage ? (
                        <>
                          <Loader2 className="w-4 h-4 animate-spin" />
                          <span>Adding...</span>
                        </>
                      ) : (
                        'Add'
                      )}
                    </button>
                  </div>
                </div>
              )}

              {/* Create New Sales Pipeline */}
              <div className="pt-4 border-t border-slate-100">
                <label className="text-xs font-black text-slate-400 uppercase tracking-widest mb-3 block">Create New Sales Pipeline</label>
                <div className="space-y-3">
                  <input
                    type="text"
                    placeholder="Pipeline name..."
                    value={newPipelineName}
                    onChange={e => setNewPipelineName(e.target.value)}
                    className="w-full px-4 py-2 border border-slate-200 rounded-xl text-sm"
                  />
                  <button
                    onClick={createPipeline}
                    className="w-full px-4 py-2 bg-indigo-600 text-white rounded-xl font-bold text-sm"
                  >
                    Create Sales Pipeline
                  </button>
                </div>
              </div>
            </div>
            <div className="p-6 border-t border-slate-100 flex justify-end">
              <button
                onClick={() => setIsConfigOpen(false)}
                className="px-6 py-2 bg-indigo-600 text-white rounded-xl font-bold"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Pipeline;

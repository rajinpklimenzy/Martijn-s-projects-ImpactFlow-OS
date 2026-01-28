
import React, { useState, useEffect } from 'react';
import { X, CheckCircle2, Building2, FolderKanban, CheckSquare, FileText, Plus, ChevronRight, User, Loader2, AlertCircle, Save, DollarSign, Calendar } from 'lucide-react';
import { apiCreateContact, apiCreateCompany, apiGetCompanies, apiCreateDeal, apiGetUsers, apiCreateProject, apiCreateTask, apiGetProjects, apiCreateInvoice, apiCreateNotification } from '../utils/api';
import { Company, User as UserType, Project } from '../types';

interface QuickCreateModalProps {
  type: 'deal' | 'project' | 'task' | 'invoice' | 'company' | 'contact';
  stage?: string;
  lockedType?: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

const QuickCreateModal: React.FC<QuickCreateModalProps> = ({ type: initialType, stage: initialStage, lockedType, onClose, onSuccess }) => {
  const [type, setType] = useState(initialType);
  const [step, setStep] = useState<'form' | 'success'>('form');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<{ [key: string]: string }>({});
  const [companies, setCompanies] = useState<Company[]>([]);
  const [users, setUsers] = useState<UserType[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [formData, setFormData] = useState({
    name: '',
    title: '',
    companyId: '',
    projectId: '',
    role: '',
    email: '',
    phone: '',
    assigneeId: '',
    ownerId: '',
    value: '',
    expectedCloseDate: '',
    stage: 'Discovery',
    status: 'Planning',
    progress: '0',
    description: '',
    industry: '',
    website: '',
    linkedin: '',
    priority: 'Medium',
    assignedUserIds: [] as string[]
  });

  useEffect(() => {
    setFormData(prev => ({
      ...prev,
      name: '', title: '', companyId: '', projectId: '', role: '', email: '', phone: '',
      assigneeId: '', ownerId: '', value: '', expectedCloseDate: '',
      stage: initialStage || 'Discovery', status: 'Planning', progress: '0',
      priority: 'Medium', description: '', industry: '', website: '', linkedin: '', assignedUserIds: []
    }));
    setError(null);
    setFieldErrors({});
    setStep('form');
  }, [initialType, initialStage]);

  useEffect(() => {
    const fetchData = async () => {
       try {
         const currentUser = JSON.parse(localStorage.getItem('user_data') || '{}');
         const userId = currentUser?.id;
         
         const [uRes, cRes, pRes] = await Promise.all([
           apiGetUsers(), 
           apiGetCompanies(), 
           apiGetProjects(userId, undefined, 'Active') // Only fetch Active projects
         ]);
         setUsers(uRes.data || []);
         setCompanies(cRes.data || []);
         // Filter to only show Active projects
         const allProjects = Array.isArray(pRes) ? pRes : pRes?.data || [];
         setProjects(allProjects.filter((p: Project) => p.status === 'Active'));
         
         if (userId) {
           setFormData(prev => ({ 
             ...prev, 
             ownerId: prev.ownerId || userId, 
             assigneeId: prev.assigneeId || userId 
           }));
         }
       } catch (err) {
         console.error('[QUICK-CREATE] Data fetch failed:', err);
       }
    };
    fetchData();
  }, [type]);

  const validateForm = (): boolean => {
    const errors: { [key: string]: string } = {};
    
    if (type === 'contact') {
      if (!formData.name?.trim()) errors.name = 'Full Name is required';
      if (!formData.email?.trim()) errors.email = 'Email Address is required';
      else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) errors.email = 'Please enter a valid email address';
    } else if (type === 'company') {
      if (!formData.name?.trim()) errors.name = 'Company Name is required';
    } else if (type === 'deal') {
      if (!formData.title?.trim()) errors.title = 'Opportunity Title is required';
      if (!formData.ownerId) errors.ownerId = 'Designated Lead / Assignee is required';
    } else if (type === 'project') {
      if (!formData.title?.trim()) errors.title = 'Project Identification (Title) is required';
      if (!formData.ownerId) errors.ownerId = 'Designated Lead / Assignee is required';
    } else if (type === 'task') {
      if (!formData.title?.trim()) errors.title = 'Task Title is required';
      if (!formData.assigneeId) errors.assigneeId = 'Designated Lead / Assignee is required';
    } else if (type === 'invoice') {
      if (!formData.companyId) errors.companyId = 'Linked Organization is required';
      if (!formData.value || parseFloat(formData.value) <= 0) errors.value = 'Economic Value must be greater than $0';
    }
    
    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmitting) return;

    // Clear previous errors
    setError(null);
    setFieldErrors({});

    // Validate form
    if (!validateForm()) {
      const errorMessages = Object.values(fieldErrors);
      setError(errorMessages.length > 0 ? errorMessages[0] : 'Please fill in all required fields');
      setIsSubmitting(false);
      return;
    }

    setIsSubmitting(true);

    // Troubleshoot Diagnostics
    console.debug(`[QUICK-CREATE] Deployment Start. Type: ${type}`, formData);

    try {
      const currentUser = JSON.parse(localStorage.getItem('user_data') || 'null');
      const userId = currentUser?.id;

      // Type-specific logic
      if (type === 'contact') {
        await apiCreateContact({ 
          name: formData.name, 
          companyId: formData.companyId || undefined, 
          role: formData.role, 
          email: formData.email, 
          phone: formData.phone, 
          linkedin: formData.linkedin || undefined 
        });
      } else if (type === 'company') {
        await apiCreateCompany({ 
          name: formData.name, 
          industry: formData.industry, 
          website: formData.website, 
          email: formData.email || undefined, 
          linkedin: formData.linkedin || undefined, 
          ownerId: formData.ownerId || userId 
        });
      } else if (type === 'deal') {
        await apiCreateDeal({ 
          title: formData.title, 
          companyId: formData.companyId && formData.companyId.trim() !== '' ? formData.companyId : undefined, // Allow undefined for standalone deals
          value: parseFloat(formData.value) || 0, 
          stage: formData.stage as any, 
          ownerId: formData.ownerId, 
          expectedCloseDate: formData.expectedCloseDate || undefined, 
          description: formData.description || undefined 
        });
      } else if (type === 'project') {
        console.debug('[QUICK-CREATE] Attempting Project Creation...', { title: formData.title, ownerId: formData.ownerId });
        
        await apiCreateProject({ 
          title: formData.title, 
          companyId: formData.companyId && formData.companyId.trim() !== '' ? formData.companyId : undefined, // Allow undefined for standalone projects
          status: formData.status as any, 
          ownerId: formData.ownerId, 
          progress: 0, 
          description: formData.description 
        });
      } else if (type === 'task') {
        console.debug('[QUICK-CREATE] Attempting Task Creation...', { title: formData.title, assigneeId: formData.assigneeId });

        await apiCreateTask({ 
          title: formData.title, 
          projectId: formData.projectId || undefined, 
          description: formData.description || undefined, 
          dueDate: formData.expectedCloseDate || undefined, 
          priority: formData.priority as any, 
          status: 'Todo', 
          assigneeId: formData.assigneeId 
        });
        
        // Dispatch event to refresh tasks list
        window.dispatchEvent(new Event('refresh-tasks'));
      } else if (type === 'invoice') {
        await apiCreateInvoice({ 
          companyId: formData.companyId, 
          amount: parseFloat(formData.value) || 0, 
          dueDate: formData.expectedCloseDate || undefined, 
          status: 'Draft', 
          userId: userId || undefined 
        });
      }

      console.debug('[QUICK-CREATE] Registry success. Finalizing UI update.');
      setStep('success');
      if (onSuccess) onSuccess();
      
      // Explicit delay before closing to show success state
      setTimeout(() => {
        onClose();
      }, 1500);

    } catch (err: any) {
      console.error('[QUICK-CREATE] Deployment failed:', err);
      setError(err.message || 'Operational error. Verify mandatory fields and team authorization.');
      setIsSubmitting(false);
    }
  };

  const getTitle = () => {
    switch(type) {
      case 'deal': return 'New Opportunity';
      case 'project': return 'Launch Project';
      case 'task': return 'New Task';
      case 'invoice': return 'Draft Invoice';
      case 'company': return 'Add Company';
      case 'contact': return 'Add Contact';
      default: return 'Quick Entry';
    }
  };

  const RequiredAsterisk = () => <span className="text-red-500 ml-1 font-black">*</span>;

  if (step === 'success') {
    return (
      <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-md z-[100] flex items-center justify-center p-4">
        <div className="bg-white rounded-[40px] w-full max-w-sm p-12 text-center animate-in zoom-in-95 duration-300 shadow-2xl">
          <div className="w-24 h-24 bg-emerald-50 rounded-full flex items-center justify-center mx-auto mb-8 text-emerald-500 ring-8 ring-emerald-50/50">
            <CheckCircle2 className="w-12 h-12 animate-in zoom-in duration-500" />
          </div>
          <h3 className="text-2xl font-black text-slate-900 mb-2 tracking-tight">Deployment Success</h3>
          <p className="text-slate-500 text-sm font-medium">Record integrated into ImpactFlow OS.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-md z-[100] flex items-center justify-center p-4 animate-in fade-in duration-300">
      <div className="bg-white rounded-[48px] w-full max-w-2xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
        <div className="p-8 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
          <div className="flex items-center gap-5">
            <div className="p-4 bg-indigo-600 rounded-[20px] text-white shadow-2xl shadow-indigo-100 ring-4 ring-indigo-50">
              {(type === 'deal' || type === 'company') && <Building2 className="w-6 h-6" />}
              {type === 'project' && <FolderKanban className="w-6 h-6" />}
              {type === 'task' && <CheckSquare className="w-6 h-6" />}
              {type === 'invoice' && <FileText className="w-6 h-6" />}
              {type === 'contact' && <User className="w-6 h-6" />}
            </div>
            <div>
              <h3 className="text-2xl font-black text-slate-900 tracking-tight leading-none mb-1">{getTitle()}</h3>
              <p className="text-[10px] text-slate-400 uppercase tracking-[0.2em] font-black">Digital Enterprise Registry</p>
            </div>
          </div>
          <button onClick={onClose} className="p-3 hover:bg-slate-100 rounded-full text-slate-400 transition-all"><X className="w-6 h-6" /></button>
        </div>

        <form onSubmit={handleSubmit} className="p-8 space-y-8 max-h-[75vh] overflow-y-auto custom-scrollbar">
          {!lockedType && (
            <div className="flex bg-slate-100 p-1 rounded-[20px] mb-4 overflow-x-auto scrollbar-hide border border-slate-200">
              {['deal', 'project', 'task', 'invoice', 'company', 'contact'].map(tab => (
                <button 
                  key={tab} 
                  type="button" 
                  onClick={() => setType(tab as any)} 
                  className={`flex-1 min-w-[80px] flex items-center justify-center py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all ${type === tab ? 'bg-white text-indigo-600 shadow-md border border-slate-100' : 'text-slate-400 hover:text-slate-600'}`}
                >
                  {tab}
                </button>
              ))}
            </div>
          )}

          {error && (
            <div className="bg-red-50 border border-red-200 text-red-600 text-xs p-5 rounded-3xl font-bold flex items-start gap-3 animate-in slide-in-from-top-2">
              <AlertCircle className="w-5 h-5 shrink-0" /> 
              <span>{error}</span>
            </div>
          )}
          
          {Object.keys(fieldErrors).length > 0 && !error && (
            <div className="bg-red-50 border border-red-200 text-red-600 text-xs p-5 rounded-3xl font-bold flex items-start gap-3 animate-in slide-in-from-top-2">
              <AlertCircle className="w-5 h-5 shrink-0" /> 
              <div className="flex-1">
                <p className="mb-2">Please correct the following errors:</p>
                <ul className="list-disc list-inside space-y-1">
                  {Object.entries(fieldErrors).map(([field, message]) => (
                    <li key={field}>{message}</li>
                  ))}
                </ul>
              </div>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {/* Common Name/Title Field */}
            <div className="md:col-span-2 space-y-2">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.15em] px-1">
                {type === 'deal' || type === 'project' || type === 'task' ? 'Official Identification' : 'Full Registered Name'} <RequiredAsterisk />
              </label>
              <input 
                required 
                type="text" 
                placeholder={type === 'deal' ? "e.g., Q4 Logistics Transformation" : "Provide identifier..."} 
                value={type === 'deal' || type === 'project' || type === 'task' ? formData.title : formData.name} 
                onChange={(e) => {
                  const fieldName = type === 'deal' || type === 'project' || type === 'task' ? 'title' : 'name';
                  setFormData(prev => ({ ...prev, [fieldName]: e.target.value }));
                  // Clear error when user starts typing
                  if (fieldErrors[fieldName]) {
                    setFieldErrors(prev => {
                      const newErrors = { ...prev };
                      delete newErrors[fieldName];
                      return newErrors;
                    });
                  }
                }} 
                className={`w-full px-6 py-4 rounded-[20px] text-sm outline-none transition-all font-bold placeholder:text-slate-300 ${
                  fieldErrors.title || fieldErrors.name 
                    ? 'bg-red-50 border-2 border-red-400 focus:ring-4 focus:ring-red-100 focus:border-red-500' 
                    : 'bg-slate-50 border border-slate-200 focus:ring-4 focus:ring-indigo-50 focus:border-indigo-600'
                }`}
              />
            </div>

            {/* Entity Associations */}
            {(type === 'deal' || type === 'project' || type === 'invoice' || type === 'contact') && (
              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.15em] px-1">Linked Organization {type === 'invoice' && <RequiredAsterisk />}</label>
                <select 
                  required={type === 'invoice'} 
                  value={formData.companyId} 
                  onChange={(e) => {
                    setFormData(prev => ({ ...prev, companyId: e.target.value }));
                    // Clear error when user selects
                    if (fieldErrors.companyId) {
                      setFieldErrors(prev => {
                        const newErrors = { ...prev };
                        delete newErrors.companyId;
                        return newErrors;
                      });
                    }
                  }} 
                  className={`w-full px-6 py-4 rounded-[20px] text-sm outline-none font-bold appearance-none bg-[length:20px_20px] bg-[right_16px_center] bg-no-repeat ${
                    fieldErrors.companyId 
                      ? 'bg-red-50 border-2 border-red-400 focus:ring-4 focus:ring-red-100 focus:border-red-500' 
                      : 'bg-slate-50 border border-slate-200 focus:ring-4 focus:ring-indigo-50'
                  } bg-[url('data:image/svg+xml;charset=utf-8,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20fill%3D%22none%22%20viewBox%3D%220%200%2020%22%3E%3Cpath%20stroke%3D%22${fieldErrors.companyId ? '%23ef4444' : '%236b7280'}%22%20stroke-linecap%3D%22round%22%20stroke-linejoin%3D%22round%22%20stroke-width%3D%221.5%22%20d%3D%22m6%208%204%204%204-4%22%2F%3E%3C%2Fsvg%3E')]`}
                >
                  <option value="">No Organization (Unassigned)</option>
                  {companies.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              </div>
            )}

            {/* Contact Email Field */}
            {type === 'contact' && (
              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.15em] px-1">
                  Email Address <RequiredAsterisk />
                </label>
                <input 
                  required
                  type="email" 
                  placeholder="contact@company.com" 
                  value={formData.email} 
                  onChange={(e) => {
                    setFormData(prev => ({ ...prev, email: e.target.value }));
                    // Clear error when user starts typing
                    if (fieldErrors.email) {
                      setFieldErrors(prev => {
                        const newErrors = { ...prev };
                        delete newErrors.email;
                        return newErrors;
                      });
                    }
                  }} 
                  className={`w-full px-6 py-4 rounded-[20px] text-sm outline-none transition-all font-bold placeholder:text-slate-300 ${
                    fieldErrors.email 
                      ? 'bg-red-50 border-2 border-red-400 focus:ring-4 focus:ring-red-100 focus:border-red-500' 
                      : 'bg-slate-50 border border-slate-200 focus:ring-4 focus:ring-indigo-50 focus:border-indigo-600'
                  }`}
                />
              </div>
            )}

            {/* Contact Role Field */}
            {type === 'contact' && (
              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.15em] px-1">Role / Title</label>
                <input 
                  type="text" 
                  placeholder="e.g., CEO, Manager" 
                  value={formData.role} 
                  onChange={(e) => setFormData(prev => ({ ...prev, role: e.target.value }))} 
                  className="w-full px-6 py-4 bg-slate-50 border border-slate-200 rounded-[20px] text-sm outline-none focus:ring-4 focus:ring-indigo-50 font-bold placeholder:text-slate-300" 
                />
              </div>
            )}

            {/* Contact Phone Field */}
            {type === 'contact' && (
              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.15em] px-1">Phone Number</label>
                <input 
                  type="tel" 
                  placeholder="+1 (555) 000-0000" 
                  value={formData.phone} 
                  onChange={(e) => setFormData(prev => ({ ...prev, phone: e.target.value }))} 
                  className="w-full px-6 py-4 bg-slate-50 border border-slate-200 rounded-[20px] text-sm outline-none focus:ring-4 focus:ring-indigo-50 font-bold placeholder:text-slate-300" 
                />
              </div>
            )}

            {/* Task specific Project Link */}
            {type === 'task' && (
              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.15em] px-1">Linked Project Workflow</label>
                <select 
                  value={formData.projectId || ''} 
                  onChange={(e) => {
                    const selectedProjectId = e.target.value;
                    setFormData(prev => ({ 
                      ...prev, 
                      projectId: selectedProjectId === '' ? '' : selectedProjectId // Keep empty string for "General / Standalone"
                    }));
                  }} 
                  className="w-full px-6 py-4 bg-slate-50 border border-slate-200 rounded-[20px] text-sm outline-none focus:ring-4 focus:ring-indigo-50 focus:border-indigo-600 transition-all font-bold appearance-none bg-[url('data:image/svg+xml;charset=utf-8,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20fill%3D%22none%22%20viewBox%3D%220%200%2020%22%3E%3Cpath%20stroke%3D%22%236b7280%22%20stroke-linecap%3D%22round%22%20stroke-linejoin%3D%22round%22%20stroke-width%3D%221.5%22%20d%3D%22m6%208%204%204%204-4%22%2F%3E%3C%2Fsvg%3E')] bg-[length:20px_20px] bg-[right_16px_center] bg-no-repeat"
                >
                  <option value="">General / Standalone</option>
                  {projects.filter((p: Project) => p.status === 'Active').map((p: Project) => (
                    <option key={p.id} value={p.id}>{p.title}</option>
                  ))}
                </select>
              </div>
            )}

            {/* Ownership/Assignment */}
            <div className="space-y-2">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.15em] px-1">
                Designated Lead / Assignee <RequiredAsterisk />
              </label>
              <select 
                required 
                value={type === 'task' ? formData.assigneeId : formData.ownerId} 
                onChange={(e) => {
                  const fieldName = type === 'task' ? 'assigneeId' : 'ownerId';
                  setFormData(prev => ({ ...prev, [fieldName]: e.target.value }));
                  // Clear error when user selects
                  if (fieldErrors[fieldName]) {
                    setFieldErrors(prev => {
                      const newErrors = { ...prev };
                      delete newErrors[fieldName];
                      return newErrors;
                    });
                  }
                }} 
                className={`w-full px-6 py-4 rounded-[20px] text-sm outline-none font-bold appearance-none ${
                  fieldErrors.ownerId || fieldErrors.assigneeId 
                    ? 'bg-red-50 border-2 border-red-400 focus:ring-4 focus:ring-red-100 focus:border-red-500' 
                    : 'bg-slate-50 border border-slate-200 focus:ring-4 focus:ring-indigo-50'
                }`}
              >
                <option value="">Select Resource Personnel</option>
                {users.map(u => <option key={u.id} value={u.id}>{u.name}</option>)}
              </select>
            </div>

            {/* Financial Value */}
            {(type === 'deal' || type === 'invoice') && (
              <div className="space-y-2">
                 <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.15em] px-1">Economic Value ($) <RequiredAsterisk /></label>
                 <div className="relative">
                   <DollarSign className="absolute left-6 top-1/2 -translate-y-1/2 w-4 h-4 text-indigo-500" />
                   <input 
                    required 
                    type="number" 
                    placeholder="0.00" 
                    value={formData.value} 
                    onChange={(e) => {
                      setFormData(prev => ({ ...prev, value: e.target.value }));
                      // Clear error when user starts typing
                      if (fieldErrors.value) {
                        setFieldErrors(prev => {
                          const newErrors = { ...prev };
                          delete newErrors.value;
                          return newErrors;
                        });
                      }
                    }} 
                    className={`w-full pl-12 pr-6 py-4 rounded-[20px] text-sm outline-none font-black transition-all ${
                      fieldErrors.value 
                        ? 'bg-red-50 border-2 border-red-400 focus:ring-4 focus:ring-red-100 focus:border-red-500 text-red-600' 
                        : 'bg-slate-50 border border-slate-200 focus:ring-4 focus:ring-indigo-50 text-indigo-600'
                    }`}
                   />
                 </div>
              </div>
            )}

            {/* Timeline */}
            <div className="space-y-2">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.15em] px-1">Target Milestone Date</label>
              <div className="relative">
                <Calendar className="absolute left-6 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input 
                  type="date" 
                  value={formData.expectedCloseDate} 
                  onChange={(e) => setFormData(prev => ({ ...prev, expectedCloseDate: e.target.value }))} 
                  className="w-full pl-12 pr-6 py-4 bg-slate-50 border border-slate-200 rounded-[20px] text-sm outline-none focus:ring-4 focus:ring-indigo-50 font-bold" 
                />
              </div>
            </div>

            {/* Task Priority */}
            {type === 'task' && (
              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.15em] px-1">Priority Classification</label>
                <div className="flex gap-2 p-1 bg-slate-100 rounded-2xl border border-slate-200">
                  {['Low', 'Medium', 'High'].map(p => (
                    <button
                      key={p}
                      type="button"
                      onClick={() => setFormData({...formData, priority: p as any})}
                      className={`flex-1 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${formData.priority === p ? 'bg-white text-indigo-600 shadow-md' : 'text-slate-400'}`}
                    >
                      {p}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Context/Description Area */}
            <div className="md:col-span-2 space-y-2">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.15em] px-1">Strategic Description / Context</label>
              <textarea 
                placeholder="Detail the operational scope or requirements..." 
                value={formData.description} 
                onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))} 
                rows={3} 
                className="w-full px-6 py-5 bg-slate-50 border border-slate-200 rounded-[32px] text-sm outline-none focus:ring-4 focus:ring-indigo-50 resize-none font-medium placeholder:text-slate-300" 
              />
            </div>
          </div>

          <div className="flex gap-6 pt-6 border-t border-slate-100">
            <button type="button" onClick={onClose} className="flex-1 py-5 text-sm font-black text-slate-400 hover:text-slate-600 transition-all uppercase tracking-[0.2em]">Abort</button>
            <button 
              type="submit" 
              disabled={isSubmitting} 
              className="flex-[2] py-5 bg-slate-900 text-white font-black uppercase text-xs tracking-[0.25em] rounded-[24px] shadow-2xl shadow-indigo-100 hover:bg-indigo-700 active:scale-95 transition-all flex items-center justify-center gap-4 disabled:opacity-50"
            >
              {isSubmitting ? <Loader2 className="w-5 h-5 animate-spin" /> : <Save className="w-5 h-5" />}
              Execute Deploy
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default QuickCreateModal;

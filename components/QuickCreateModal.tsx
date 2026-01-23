
import React, { useState, useEffect } from 'react';
import { X, CheckCircle2, Building2, FolderKanban, CheckSquare, FileText, Plus, ChevronRight, User, Loader2 } from 'lucide-react';
import { MOCK_PROJECTS, MOCK_USERS } from '../constants';
import { apiCreateContact, apiCreateCompany, apiGetCompanies, apiCreateDeal, apiGetUsers, apiCreateProject, apiCreateTask, apiGetProjects, apiCreateInvoice, apiCreateNotification } from '../utils/api';
import { Company, User as UserType, Project } from '../types';

interface QuickCreateModalProps {
  type: 'deal' | 'project' | 'task' | 'invoice' | 'company' | 'contact';
  stage?: string; // Optional stage for deals
  lockedType?: boolean; // If true, hide the switch tabs
  onClose: () => void;
  onSuccess?: () => void; // Callback to refresh data after creation
}

const QuickCreateModal: React.FC<QuickCreateModalProps> = ({ type: initialType, stage: initialStage, lockedType, onClose, onSuccess }) => {
  const [type, setType] = useState(initialType);
  const [step, setStep] = useState<'form' | 'success'>('form');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [companies, setCompanies] = useState<Company[]>([]);
  const [users, setUsers] = useState<UserType[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [formData, setFormData] = useState({
    name: '',
    title: '',
    companyId: '',
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
    priority: 'Medium',
    assignedUserIds: [] as string[]
  });

  useEffect(() => {
    setFormData({
      name: '',
      title: '',
      companyId: '',
      role: '',
      email: '',
      phone: '',
      assigneeId: '',
      ownerId: '',
      value: '',
      expectedCloseDate: '',
      stage: initialStage || 'Discovery',
      status: 'Planning',
      progress: '0',
      priority: 'Medium',
      description: '',
      industry: '',
      website: '',
      assignedUserIds: []
    });
    setError(null);
    setStep('form');
  }, [initialType, initialStage]);

  useEffect(() => {
    if (type === 'deal' || type === 'project') {
      apiGetUsers().then(response => {
        setUsers(response.data || []);
        const currentUser = JSON.parse(localStorage.getItem('user_data') || '{}');
        if (currentUser.id && !formData.ownerId) {
          setFormData(prev => ({ ...prev, ownerId: currentUser.id }));
        }
      }).catch(err => console.error('Failed to fetch users:', err));
    }
  }, [type]);

  useEffect(() => {
    if (type === 'contact' || type === 'deal' || type === 'project' || type === 'invoice') {
      apiGetCompanies().then(response => {
        setCompanies(response.data || []);
        if (response.data && response.data.length > 0 && !formData.companyId) {
          setFormData(prev => ({ ...prev, companyId: response.data[0].id }));
        }
      }).catch(err => console.error('Failed to fetch companies:', err));
    }
  }, [type]);

  useEffect(() => {
    if (type === 'task') {
      apiGetProjects().then(response => {
        const fetchedProjects = response?.data || response || [];
        setProjects(Array.isArray(fetchedProjects) ? fetchedProjects : []);
        if (Array.isArray(fetchedProjects) && fetchedProjects.length > 0 && !formData.companyId) {
          setFormData(prev => ({ ...prev, companyId: fetchedProjects[0].id }));
        }
      }).catch(err => console.error('Failed to fetch projects:', err));

      apiGetUsers().then(response => {
        const fetchedUsers = response?.data || response || [];
        setUsers(Array.isArray(fetchedUsers) ? fetchedUsers : []);
        const currentUser = JSON.parse(localStorage.getItem('user_data') || '{}');
        if (currentUser.id && !formData.assigneeId) {
          setFormData(prev => ({ ...prev, assigneeId: currentUser.id }));
        }
      }).catch(err => console.error('Failed to fetch users:', err));
    }
  }, [type]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError(null);

    try {
      const currentUser = JSON.parse(localStorage.getItem('user_data') || 'null');
      const userId = currentUser?.id;

      if (type === 'contact') {
        if (!formData.name || !formData.companyId) throw new Error('Name and Company are required');
        await apiCreateContact({
          name: formData.name,
          companyId: formData.companyId,
          role: formData.role,
          email: formData.email,
          phone: formData.phone
        });
        if (userId) {
          await apiCreateNotification({
            userId,
            type: 'lead',
            title: 'New Contact Added',
            message: `${formData.name} was added under ${companies.find(c => c.id === formData.companyId)?.name || 'a company'}.`,
            link: '/?tab=crm'
          });
        }
      } else if (type === 'company') {
        if (!formData.name) throw new Error('Company name is required');
        await apiCreateCompany({
          name: formData.name,
          industry: formData.industry,
          website: formData.website,
          email: formData.email || undefined
        });
        if (userId) {
          await apiCreateNotification({
            userId,
            type: 'lead',
            title: 'New Company Added',
            message: `${formData.name} was added to your CRM.`,
            link: '/?tab=crm'
          });
        }
      } else if (type === 'deal') {
        if (!formData.title || !formData.companyId || !formData.ownerId) throw new Error('Title, Company, and Assignee are required');
        await apiCreateDeal({
          title: formData.title,
          companyId: formData.companyId,
          value: parseFloat(formData.value) || 0,
          stage: formData.stage as any,
          ownerId: formData.ownerId,
          expectedCloseDate: formData.expectedCloseDate || undefined,
          description: formData.description || undefined
        });
        if (userId) {
          await apiCreateNotification({
            userId,
            type: 'deal',
            title: 'New Deal Created',
            message: `${formData.title} for ${companies.find(c => c.id === formData.companyId)?.name || 'a company'} was created.`,
            link: '/?tab=pipeline'
          });
        }
      } else if (type === 'project') {
        if (!formData.title || !formData.companyId || !formData.ownerId) throw new Error('Title, Company, and Assignee are required');
        await apiCreateProject({
          title: formData.title,
          companyId: formData.companyId,
          status: formData.status as any,
          ownerId: formData.ownerId,
          progress: parseFloat(formData.progress) || 0,
          description: formData.description || undefined,
          assignedUserIds: formData.assignedUserIds.length > 0 ? formData.assignedUserIds : undefined
        });
        if (userId) {
          await apiCreateNotification({
            userId,
            type: 'system',
            title: 'New Project Created',
            message: `${formData.title} project was created for ${companies.find(c => c.id === formData.companyId)?.name || 'a company'}.`,
            link: '/?tab=projects'
          });
        }
      } else if (type === 'task') {
        if (!formData.title || !formData.companyId || !formData.assigneeId) throw new Error('Title, Project, and Assignee are required');
        await apiCreateTask({
          title: formData.title,
          projectId: formData.companyId,
          description: formData.description || undefined,
          dueDate: formData.expectedCloseDate || undefined,
          priority: formData.priority as any,
          status: 'Todo',
          assigneeId: formData.assigneeId
        });
        if (userId) {
          const project = projects.find(p => p.id === formData.companyId);
          await apiCreateNotification({
            userId,
            type: 'task',
            title: 'New Task Created',
            message: `${formData.title} task was created${project ? ` under ${project.title}` : ''}.`,
            link: '/?tab=tasks'
          });
        }
      } else if (type === 'invoice') {
        if (!formData.companyId || !formData.value) throw new Error('Company and Amount are required');
        const userIdForInvoice = JSON.parse(localStorage.getItem('user_data') || '{}').id;
        // Invoice number will be auto-generated by backend, don't send it
        await apiCreateInvoice({
          companyId: formData.companyId,
          amount: parseFloat(formData.value) || 0,
          dueDate: formData.expectedCloseDate || undefined,
          status: 'Draft',
          description: formData.description || undefined,
          userId: userIdForInvoice || undefined
        });
        if (userIdForInvoice) {
          await apiCreateNotification({
            userId: userIdForInvoice,
            type: 'payment',
            title: 'New Invoice Created',
            message: `Invoice for ${companies.find(c => c.id === formData.companyId)?.name || 'a company'} was created for $${(parseFloat(formData.value) || 0).toLocaleString()}.`,
            link: '/?tab=invoices'
          });
        }
      }

      setStep('success');
      if (onSuccess) onSuccess();
      setTimeout(onClose, 2000);
    } catch (err: any) {
      console.error('Failed to create:', err);
      setError(err.message || 'Failed to create. Please try again.');
      setIsSubmitting(false);
    }
  };

  const getTitle = () => {
    switch(type) {
      case 'deal': return 'New Opportunity';
      case 'project': return 'Create Project';
      case 'task': return 'New Task';
      case 'invoice': return 'Create Invoice';
      case 'company': return 'Add Company';
      case 'contact': return 'Add Contact';
      default: return 'Quick Create';
    }
  };

  if (step === 'success') {
    return (
      <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4 animate-in fade-in duration-300">
        <div className="bg-white rounded-2xl w-full max-w-sm p-12 text-center animate-in zoom-in-95 duration-200">
          <div className="w-20 h-20 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-6 text-emerald-600">
            <CheckCircle2 className="w-10 h-10" />
          </div>
          <h3 className="text-xl font-bold text-slate-900 mb-2">Successfully Created!</h3>
          <p className="text-sm text-slate-500">Your {type} has been added to the ImpactFlow workspace.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4 animate-in fade-in duration-300">
      <div className="bg-white rounded-2xl w-full max-w-xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
        <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-indigo-600 rounded-lg text-white">
              {(type === 'deal' || type === 'company') && <Building2 className="w-5 h-5" />}
              {type === 'project' && <FolderKanban className="w-5 h-5" />}
              {type === 'task' && <CheckSquare className="w-5 h-5" />}
              {type === 'invoice' && <FileText className="w-5 h-5" />}
              {type === 'contact' && <User className="w-5 h-5" />}
            </div>
            <div>
              <h3 className="text-lg font-bold text-slate-900">{getTitle()}</h3>
              <p className="text-[10px] text-slate-400 uppercase tracking-widest font-bold">New ImpactFlow Entry</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-white rounded-full text-slate-400 transition-colors shadow-sm">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          {!lockedType && (
            <div className="flex bg-slate-100 p-1 rounded-xl mb-4 overflow-x-auto scrollbar-hide">
              {[
                { id: 'deal', icon: <Building2 className="w-3.5 h-3.5" />, label: 'Deal' },
                { id: 'project', icon: <FolderKanban className="w-3.5 h-3.5" />, label: 'Project' },
                { id: 'task', icon: <CheckSquare className="w-3.5 h-3.5" />, label: 'Task' },
                { id: 'invoice', icon: <FileText className="w-3.5 h-3.5" />, label: 'Invoice' },
              ].map(tab => (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setType(tab.id as any)}
                  className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-lg text-xs font-bold transition-all whitespace-nowrap px-4 ${
                    type === tab.id ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'
                  }`}
                >
                  {tab.icon}
                  {tab.label}
                </button>
              ))}
            </div>
          )}

          {error && (
            <div className="bg-red-50 border border-red-200 text-red-600 text-sm p-3 rounded-xl">
              {error}
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {type !== 'invoice' && (
              <div className="md:col-span-2 space-y-1.5">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                  {type === 'task' ? 'Task Title' : type === 'deal' || type === 'project' ? 'Title / Name' : type === 'company' ? 'Company Name' : 'Full Name'}
                </label>
                <input 
                  required 
                  type="text" 
                  placeholder={type === 'task' ? 'Enter task title...' : `Enter ${type === 'company' ? 'company' : type === 'contact' ? 'contact' : type} name...`} 
                  value={type === 'deal' || type === 'project' || type === 'task' ? formData.title : formData.name}
                  onChange={(e) => {
                    if (type === 'deal' || type === 'project' || type === 'task') {
                      setFormData(prev => ({ ...prev, title: e.target.value }));
                    } else {
                      setFormData(prev => ({ ...prev, name: e.target.value }));
                    }
                  }}
                  className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-indigo-100" 
                />
              </div>
            )}

            {type === 'invoice' && (
              <div className="md:col-span-2 space-y-1.5">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Invoice Number</label>
                <input 
                  type="text" 
                  value="Auto-generated" 
                  disabled
                  className="w-full px-4 py-2.5 bg-slate-100 border border-slate-200 rounded-xl text-sm outline-none text-slate-500 cursor-not-allowed" 
                />
                <p className="text-[10px] text-slate-400 italic">Invoice number will be generated automatically (e.g., INV-2024-0001)</p>
              </div>
            )}

            {(type === 'deal' || type === 'project' || type === 'invoice' || type === 'contact') && (
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Company</label>
                <select 
                  required={type === 'contact' || type === 'deal' || type === 'project'}
                  value={formData.companyId}
                  onChange={(e) => setFormData(prev => ({ ...prev, companyId: e.target.value }))}
                  className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-indigo-100"
                >
                  <option value="">Select a company</option>
                  {companies.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              </div>
            )}

            {type === 'contact' && (
              <>
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Role</label>
                  <input type="text" placeholder="e.g., COO, Manager" value={formData.role} onChange={(e) => setFormData(prev => ({ ...prev, role: e.target.value }))} className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-indigo-100" />
                </div>
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Email</label>
                  <input type="email" placeholder="email@example.com" value={formData.email} onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))} className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-indigo-100" />
                </div>
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Phone</label>
                  <input type="tel" placeholder="+1 555-0123" value={formData.phone} onChange={(e) => setFormData(prev => ({ ...prev, phone: e.target.value }))} className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-indigo-100" />
                </div>
              </>
            )}

            {type === 'company' && (
              <>
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Industry</label>
                  <input type="text" placeholder="e.g., Shipping, Tech" value={formData.industry} onChange={(e) => setFormData(prev => ({ ...prev, industry: e.target.value }))} className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-indigo-100" />
                </div>
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Website</label>
                  <input type="text" placeholder="example.com" value={formData.website} onChange={(e) => setFormData(prev => ({ ...prev, website: e.target.value }))} className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-indigo-100" />
                </div>
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Email</label>
                  <input type="email" placeholder="company@example.com" value={formData.email} onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))} className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-indigo-100" />
                </div>
              </>
            )}

            {type === 'task' && (
              <>
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Target Project</label>
                  <select required value={formData.companyId} onChange={(e) => setFormData(prev => ({ ...prev, companyId: e.target.value }))} className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-indigo-100">
                    <option value="">Select a project</option>
                    {projects.map(p => <option key={p.id} value={p.id}>{p.title}</option>)}
                  </select>
                </div>
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Priority</label>
                  <select value={formData.priority} onChange={(e) => setFormData(prev => ({ ...prev, priority: e.target.value }))} className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-indigo-100">
                    <option value="Low">Low</option>
                    <option value="Medium">Medium</option>
                    <option value="High">High</option>
                  </select>
                </div>
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Due Date</label>
                  <input type="date" value={formData.expectedCloseDate} onChange={(e) => setFormData(prev => ({ ...prev, expectedCloseDate: e.target.value }))} className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-indigo-100" />
                </div>
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Assignee</label>
                  <select required value={formData.assigneeId} onChange={(e) => setFormData(prev => ({ ...prev, assigneeId: e.target.value }))} className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-indigo-100">
                    <option value="">Select assignee</option>
                    {users.map(u => <option key={u.id} value={u.id}>{u.name}</option>)}
                  </select>
                </div>
              </>
            )}

            {type === 'deal' && (
              <>
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Expected Value</label>
                  <input type="number" placeholder="0.00" value={formData.value} onChange={(e) => setFormData(prev => ({ ...prev, value: e.target.value }))} className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-indigo-100" />
                </div>
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Expected Close</label>
                  <input type="date" value={formData.expectedCloseDate} onChange={(e) => setFormData(prev => ({ ...prev, expectedCloseDate: e.target.value }))} className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-indigo-100" />
                </div>
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Stage</label>
                  <select value={formData.stage} onChange={(e) => setFormData(prev => ({ ...prev, stage: e.target.value }))} className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-indigo-100">
                    <option value="Discovery">Discovery</option>
                    <option value="Proposal">Proposal</option>
                    <option value="Negotiation">Negotiation</option>
                    <option value="Won">Won</option>
                    <option value="Lost">Lost</option>
                  </select>
                </div>
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Owner</label>
                  <select required value={formData.ownerId} onChange={(e) => setFormData(prev => ({ ...prev, ownerId: e.target.value }))} className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-indigo-100">
                    <option value="">Select owner</option>
                    {users.map(u => <option key={u.id} value={u.id}>{u.name}</option>)}
                  </select>
                </div>
              </>
            )}

            {type === 'invoice' && (
              <>
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Amount</label>
                  <div className="relative">
                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 text-sm">$</span>
                    <input 
                      required
                      type="number" 
                      step="0.01"
                      placeholder="0.00" 
                      value={formData.value}
                      onChange={(e) => setFormData(prev => ({ ...prev, value: e.target.value }))}
                      className="w-full pl-8 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-indigo-100" 
                    />
                  </div>
                </div>
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Due Date</label>
                  <input 
                    required 
                    type="date" 
                    value={formData.expectedCloseDate}
                    onChange={(e) => setFormData(prev => ({ ...prev, expectedCloseDate: e.target.value }))}
                    className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-indigo-100" 
                  />
                </div>
              </>
            )}

            {(type === 'deal' || type === 'project' || type === 'task' || type === 'invoice') && (
              <div className="md:col-span-2 space-y-1.5">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Description</label>
                <textarea placeholder="Add relevant details..." value={formData.description} onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))} rows={3} className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-indigo-100 resize-none" />
              </div>
            )}
          </div>

          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onClose} className="flex-1 py-3 text-sm font-bold text-slate-500 hover:bg-slate-50 rounded-xl transition-colors border border-transparent hover:border-slate-200">Cancel</button>
            <button type="submit" disabled={isSubmitting} className="flex-[2] py-3 bg-indigo-600 text-white text-sm font-bold rounded-xl flex items-center justify-center gap-2 shadow-lg shadow-indigo-100 hover:bg-indigo-700 transition-all active:scale-[0.98]">
              {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
              Create {type}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default QuickCreateModal;

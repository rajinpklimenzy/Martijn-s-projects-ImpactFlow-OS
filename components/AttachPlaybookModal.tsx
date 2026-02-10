import React, { useState, useEffect } from 'react';
import { X, BookOpen, Search, Loader2, Tag, ListChecks, FileText, CheckSquare } from 'lucide-react';
import { usePlaybookTemplates } from '../hooks/usePlaybooks';
import { useCreatePlaybookInstance } from '../hooks/usePlaybooks';
import { useToast } from '../contexts/ToastContext';

interface AttachPlaybookModalProps {
  isOpen: boolean;
  dealId?: string;
  projectId?: string;
  preSelectedTemplateId?: string;
  onClose: () => void;
  onSuccess?: () => void;
}

const AttachPlaybookModal: React.FC<AttachPlaybookModalProps> = ({
  isOpen,
  dealId,
  projectId,
  preSelectedTemplateId,
  onClose,
  onSuccess
}) => {
  const { showError } = useToast();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTemplateId, setSelectedTemplateId] = useState<string | null>(null);
  const [isCreating, setIsCreating] = useState(false);

  // Set pre-selected template when modal opens
  useEffect(() => {
    if (isOpen && preSelectedTemplateId) {
      setSelectedTemplateId(preSelectedTemplateId);
    } else if (!isOpen) {
      // Reset selection when modal closes
      setSelectedTemplateId(null);
      setSearchQuery('');
    }
  }, [isOpen, preSelectedTemplateId]);

  const { data: templates = [], isLoading: isLoadingTemplates } = usePlaybookTemplates();
  const createInstanceMutation = useCreatePlaybookInstance();

  if (!isOpen) return null;

  const filteredTemplates = templates.filter((template: any) => {
    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase();
    return (
      template.name?.toLowerCase().includes(query) ||
      template.description?.toLowerCase().includes(query) ||
      template.category?.toLowerCase().includes(query)
    );
  });

  const calculateTotalSteps = (template: any): number => {
    if (!template.sections || !Array.isArray(template.sections)) return 0;
    return template.sections.reduce((total: number, section: any) => {
      return total + (section.steps?.length || 0);
    }, 0);
  };

  const getCategoryColor = (category: string) => {
    const colors: Record<string, string> = {
      'Sales': 'bg-blue-100 text-blue-700',
      'Onboarding': 'bg-green-100 text-green-700',
      'Custom': 'bg-purple-100 text-purple-700',
    };
    return colors[category] || 'bg-slate-100 text-slate-700';
  };

  const handleAttach = async () => {
    if (!selectedTemplateId) {
      showError('Please select a playbook template');
      return;
    }

    if (!dealId && !projectId) {
      showError('Either dealId or projectId must be provided');
      return;
    }

    setIsCreating(true);
    try {
      await createInstanceMutation.mutateAsync({
        templateId: selectedTemplateId,
        dealId: dealId || undefined,
        projectId: projectId || undefined,
      });
      onSuccess?.();
      onClose();
      setSelectedTemplateId(null);
      setSearchQuery('');
    } catch (err: any) {
      showError(err.message || 'Failed to attach playbook');
    } finally {
      setIsCreating(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[120] overflow-hidden pointer-events-none">
      <div
        className="absolute inset-0 bg-slate-900/60 backdrop-blur-md pointer-events-auto animate-in fade-in duration-300"
        onClick={onClose}
      />
      <div className="absolute inset-0 flex items-center justify-center p-4 pointer-events-none">
        <div className="bg-white rounded-[32px] shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-hidden pointer-events-auto animate-in zoom-in-95 duration-300 flex flex-col">
          {/* Header */}
          <div className="p-8 border-b border-slate-100 bg-gradient-to-r from-indigo-50 to-purple-50">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 rounded-2xl bg-indigo-600 flex items-center justify-center text-white shadow-lg">
                  <BookOpen className="w-7 h-7" />
                </div>
                <div>
                  <h2 className="text-2xl font-black text-slate-900">
                    {preSelectedTemplateId ? 'Activate Onboarding Playbook?' : 'Attach Playbook'}
                  </h2>
                  <p className="text-sm text-slate-500 font-medium mt-0.5">
                    {preSelectedTemplateId 
                      ? 'The Client Onboarding Playbook is ready to activate for this deal.'
                      : 'Select a playbook template to attach'}
                  </p>
                </div>
              </div>
              <button
                onClick={onClose}
                className="p-2 hover:bg-white rounded-full text-slate-400 hover:text-slate-600 transition-all"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Content */}
          <div className="flex-1 overflow-y-auto p-8 custom-scrollbar">
            {/* Search */}
            <div className="mb-6">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                <input
                  type="text"
                  placeholder="Search playbooks..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 bg-white border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-indigo-100 focus:border-indigo-300 outline-none transition-all"
                />
              </div>
            </div>

            {/* Templates Grid */}
            {isLoadingTemplates ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="w-8 h-8 animate-spin text-indigo-600" />
              </div>
            ) : filteredTemplates.length === 0 ? (
              <div className="text-center py-12">
                <BookOpen className="w-16 h-16 text-slate-300 mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-slate-900 mb-2">No Templates Found</h3>
                <p className="text-sm text-slate-500">
                  {searchQuery
                    ? 'No templates match your search. Try a different query.'
                    : 'No playbook templates available. Create one first.'}
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {filteredTemplates.map((template: any) => {
                  const totalSteps = calculateTotalSteps(template);
                  const totalSections = template.sections?.length || 0;
                  const isSelected = selectedTemplateId === template.id;

                  return (
                    <div
                      key={template.id}
                      onClick={() => setSelectedTemplateId(template.id)}
                      className={`p-6 border-2 rounded-xl cursor-pointer transition-all ${
                        isSelected
                          ? 'border-indigo-500 bg-indigo-50 shadow-lg'
                          : 'border-slate-200 hover:border-slate-300 hover:shadow-md bg-white'
                      }`}
                    >
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex-1">
                          <h3 className="text-lg font-bold text-slate-900 mb-1">{template.name}</h3>
                          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-lg text-xs font-semibold ${getCategoryColor(template.category || 'Custom')}`}>
                            {template.category || 'Custom'}
                          </span>
                        </div>
                        {isSelected && (
                          <div className="w-6 h-6 rounded-full bg-indigo-600 flex items-center justify-center">
                            <div className="w-2 h-2 rounded-full bg-white" />
                          </div>
                        )}
                      </div>

                      {template.description && (
                        <p className="text-sm text-slate-600 mb-4 line-clamp-2">{template.description}</p>
                      )}

                      <div className="flex items-center gap-4 text-xs text-slate-500">
                        <div className="flex items-center gap-1.5">
                          <FileText className="w-4 h-4" />
                          <span>{totalSections} section{totalSections !== 1 ? 's' : ''}</span>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <ListChecks className="w-4 h-4" />
                          <span>{totalSteps} step{totalSteps !== 1 ? 's' : ''}</span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="p-6 border-t border-slate-100 bg-slate-50/50">
            {preSelectedTemplateId && selectedTemplateId === preSelectedTemplateId ? (
              // Quick activate option when template is pre-selected from prompt
              <div className="flex flex-col gap-3">
                <button
                  onClick={handleAttach}
                  disabled={isCreating}
                  className="w-full px-6 py-3 bg-green-600 text-white text-sm font-semibold rounded-xl hover:bg-green-700 transition-all shadow-sm flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isCreating ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Activating...
                    </>
                  ) : (
                    <>
                      <CheckSquare className="w-4 h-4" />
                      Yes, Activate Onboarding Playbook
                    </>
                  )}
                </button>
                <button
                  onClick={onClose}
                  disabled={isCreating}
                  className="w-full px-6 py-2.5 text-sm font-semibold text-slate-600 hover:bg-white rounded-xl transition-colors border border-slate-200 disabled:opacity-50"
                >
                  Maybe Later
                </button>
              </div>
            ) : (
              // Standard attach flow
              <div className="flex items-center justify-end gap-3">
                <button
                  onClick={onClose}
                  disabled={isCreating}
                  className="px-6 py-2.5 text-sm font-semibold text-slate-600 hover:bg-white rounded-xl transition-colors border border-slate-200 disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  onClick={handleAttach}
                  disabled={!selectedTemplateId || isCreating}
                  className="px-6 py-2.5 bg-indigo-600 text-white text-sm font-semibold rounded-xl hover:bg-indigo-700 transition-all shadow-sm flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isCreating ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Attaching...
                    </>
                  ) : (
                    'Attach Playbook'
                  )}
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default AttachPlaybookModal;

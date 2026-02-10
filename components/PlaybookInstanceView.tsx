import React, { useState, useMemo, useEffect } from 'react';
import DOMPurify from 'dompurify';
import {
  X, BookOpen, ChevronDown, ChevronRight, CheckSquare, FileText, ExternalLink,
  Loader2, CheckCircle2, Clock, User, Download, Cloud, ListChecks
} from 'lucide-react';
import {
  usePlaybookInstance,
  usePlaybookStepCompletions,
  useMarkPlaybookStepComplete,
  useUpdatePlaybookInstanceStatus
} from '../hooks/usePlaybooks';
import { useToast } from '../contexts/ToastContext';
import { useUsers } from '../hooks/useUsers';

interface PlaybookInstanceViewProps {
  instanceId: string;
  isOpen: boolean;
  onClose: () => void;
}

const PlaybookInstanceView: React.FC<PlaybookInstanceViewProps> = ({
  instanceId,
  isOpen,
  onClose
}) => {
  const { showSuccess, showError } = useToast();
  const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set());
  const [expandedSteps, setExpandedSteps] = useState<Set<string>>(new Set());
  const [processingStepId, setProcessingStepId] = useState<string | null>(null);
  // Track completed checklist items: { stepId: Set<itemIndex> }
  const [completedChecklistItems, setCompletedChecklistItems] = useState<Map<string, Set<number>>>(new Map());

  // Load instance data
  const { data: instance, isLoading: isLoadingInstance } = usePlaybookInstance(instanceId);
  const { data: completions = [], isLoading: isLoadingCompletions } = usePlaybookStepCompletions(instanceId);
  const { data: users = [] } = useUsers();
  
  const markStepCompleteMutation = useMarkPlaybookStepComplete();
  const updateStatusMutation = useUpdatePlaybookInstanceStatus();

  // Helper function to get user name from ID
  const getUserName = (userId: string) => {
    const user = users.find((u: any) => u.id === userId);
    return user?.name || userId;
  };

  // Expand all sections by default when instance loads
  useEffect(() => {
    if (instance?.templateSnapshot?.sections) {
      const sectionIds: string[] = instance.templateSnapshot.sections.map((s: any) => String(s.id)).filter(Boolean);
      const allSectionIds = new Set<string>(sectionIds);
      setExpandedSections(allSectionIds);
    }
  }, [instance]);

  // Calculate progress
  const progress = useMemo(() => {
    if (!instance?.templateSnapshot?.sections) return { completed: 0, total: 0, percentage: 0 };
    
    let totalSteps = 0;
    instance.templateSnapshot.sections.forEach((section: any) => {
      if (section.steps) {
        totalSteps += section.steps.length;
      }
    });
    
    const completedSteps = completions.length;
    const percentage = totalSteps > 0 ? Math.round((completedSteps / totalSteps) * 100) : 0;
    
    return { completed: completedSteps, total: totalSteps, percentage };
  }, [instance, completions]);

  // Check if all steps are completed and update instance status
  useEffect(() => {
    if (instance && progress.total > 0 && progress.completed >= progress.total && instance.status !== 'completed') {
      updateStatusMutation.mutate({
        id: instanceId,
        status: 'completed'
      });
    }
  }, [progress.completed, progress.total, instance?.status, instanceId, instance, updateStatusMutation]);

  // Check if step is completed
  const isStepCompleted = (stepId: string) => {
    return completions.some((c: any) => c.stepId === stepId);
  };

  // Get step completion info
  const getStepCompletionInfo = (stepId: string) => {
    return completions.find((c: any) => c.stepId === stepId);
  };

  // Calculate section progress
  const getSectionProgress = (section: any) => {
    if (!section.steps) return { completed: 0, total: 0 };
    const total = section.steps.length;
    const completed = section.steps.filter((step: any) => isStepCompleted(step.id)).length;
    return { completed, total };
  };

  // Toggle section expansion
  const toggleSection = (sectionId: string) => {
    setExpandedSections(prev => {
      const newSet = new Set(prev);
      if (newSet.has(sectionId)) {
        newSet.delete(sectionId);
      } else {
        newSet.add(sectionId);
      }
      return newSet;
    });
  };

  // Toggle step expansion
  const toggleStep = (stepId: string) => {
    setExpandedSteps(prev => {
      const newSet = new Set(prev);
      if (newSet.has(stepId)) {
        newSet.delete(stepId);
      } else {
        newSet.add(stepId);
      }
      return newSet;
    });
  };

  // Handle step completion
  const handleStepComplete = async (stepId: string) => {
    if (isStepCompleted(stepId)) {
      // Step is already completed, don't allow unchecking for now
      return;
    }

    setProcessingStepId(stepId);
    try {
      await markStepCompleteMutation.mutateAsync({
        instanceId,
        stepId
      });
      // Clear processing state after a short delay to allow optimistic update to show
      setTimeout(() => {
        setProcessingStepId(null);
      }, 300);
    } catch (err: any) {
      setProcessingStepId(null);
      // Error handling is done in the mutation hook
    }
  };

  // Handle PDF download
  const handlePDFDownload = (url: string, name: string) => {
    const link = document.createElement('a');
    link.href = url;
    link.download = name;
    link.target = '_blank';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  if (!isOpen) return null;

  const isLoading = isLoadingInstance || isLoadingCompletions;

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
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 rounded-2xl bg-indigo-600 flex items-center justify-center text-white shadow-lg">
                  <BookOpen className="w-7 h-7" />
                </div>
                <div>
                  <h2 className="text-2xl font-black text-slate-900">
                    {instance?.templateSnapshot?.name || 'Loading...'}
                  </h2>
                  {(instance?.templateSnapshot?.version || instance?.templateVersion) && (
                    <p className="text-sm text-slate-500 font-medium mt-0.5">
                      Version {instance.templateSnapshot?.version || instance.templateVersion}
                    </p>
                  )}
                </div>
              </div>
              <button
                onClick={onClose}
                className="p-2 hover:bg-white rounded-full text-slate-400 hover:text-slate-600 transition-all"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Progress Bar */}
            {!isLoading && (
              <div className="mt-6">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-semibold text-slate-700">
                    {progress.completed} of {progress.total} steps complete
                  </span>
                  <span className="text-sm font-bold text-slate-900">{progress.percentage}%</span>
                </div>
                <div className="w-full bg-slate-200 rounded-full h-3">
                  <div
                    className={`h-3 rounded-full transition-all ${
                      progress.percentage === 100
                        ? 'bg-green-500'
                        : progress.percentage >= 50
                        ? 'bg-indigo-500'
                        : 'bg-yellow-500'
                    }`}
                    style={{ width: `${progress.percentage}%` }}
                  />
                </div>
                {progress.percentage === 100 && (
                  <div className="flex items-center gap-2 mt-2">
                    <CheckCircle2 className="w-4 h-4 text-green-500" />
                    <span className="text-xs font-semibold text-green-700">All steps completed!</span>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Content */}
          <div className="flex-1 overflow-y-auto p-8 custom-scrollbar">
            {isLoading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="w-8 h-8 animate-spin text-indigo-600" />
              </div>
            ) : !instance?.templateSnapshot?.sections ? (
              <div className="text-center py-12">
                <BookOpen className="w-16 h-16 text-slate-300 mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-slate-900 mb-2">No Playbook Data</h3>
                <p className="text-sm text-slate-500">Unable to load playbook instance data.</p>
              </div>
            ) : (
              <div className="space-y-4">
                {instance.templateSnapshot.sections
                  .sort((a: any, b: any) => (a.order || 0) - (b.order || 0))
                  .map((section: any) => {
                    const sectionProgress = getSectionProgress(section);
                    const isExpanded = expandedSections.has(section.id);

                    return (
                      <div
                        key={section.id}
                        className="border border-slate-200 rounded-xl overflow-hidden bg-white"
                      >
                        {/* Section Header */}
                        <button
                          onClick={() => toggleSection(section.id)}
                          className="w-full p-5 flex items-center justify-between hover:bg-slate-50 transition-colors"
                        >
                          <div className="flex items-center gap-4 flex-1 text-left">
                            <div className={`w-8 h-8 rounded-lg flex items-center justify-center transition-transform ${
                              isExpanded ? 'bg-indigo-100 text-indigo-600' : 'bg-slate-100 text-slate-400'
                            }`}>
                              <ChevronDown className={`w-5 h-5 transition-transform ${isExpanded ? '' : '-rotate-90'}`} />
                            </div>
                            <div className="flex-1">
                              <h3 className="text-lg font-bold text-slate-900">{section.name}</h3>
                              <p className="text-xs text-slate-500 mt-1">
                                {sectionProgress.completed} of {sectionProgress.total} steps completed
                              </p>
                            </div>
                          </div>
                          {sectionProgress.completed === sectionProgress.total && sectionProgress.total > 0 && (
                            <CheckCircle2 className="w-5 h-5 text-green-500" />
                          )}
                        </button>

                        {/* Section Content */}
                        {isExpanded && section.steps && (
                          <div className="border-t border-slate-100 bg-slate-50/50">
                            {section.steps
                              .sort((a: any, b: any) => (a.order || 0) - (b.order || 0))
                              .map((step: any) => {
                                const isCompleted = isStepCompleted(step.id);
                                const completionInfo = getStepCompletionInfo(step.id);
                                const isStepExpanded = expandedSteps.has(step.id);

                                return (
                                  <div
                                    key={step.id}
                                    className="border-b border-slate-100 last:border-b-0"
                                  >
                                    {/* Step Header */}
                                    <div className="p-4 flex items-start gap-4">
                                      <div className="pt-1">
                                        <button
                                          onClick={() => handleStepComplete(step.id)}
                                          disabled={isCompleted || processingStepId === step.id || markStepCompleteMutation.isPending}
                                          className={`w-6 h-6 rounded-lg border-2 flex items-center justify-center transition-all ${
                                            isCompleted
                                              ? 'bg-green-500 border-green-500 text-white'
                                              : processingStepId === step.id
                                              ? 'bg-indigo-50 border-indigo-500'
                                              : 'bg-white border-slate-300 hover:border-indigo-500'
                                          } disabled:opacity-50 disabled:cursor-not-allowed`}
                                        >
                                          {processingStepId === step.id ? (
                                            <Loader2 className="w-4 h-4 text-indigo-600 animate-spin" />
                                          ) : isCompleted ? (
                                            <CheckSquare className="w-4 h-4" />
                                          ) : null}
                                        </button>
                                      </div>
                                      <div className="flex-1 min-w-0">
                                        <div className="flex items-start justify-between gap-4">
                                          <div className="flex-1">
                                            <h4 className={`text-sm font-semibold ${isCompleted ? 'text-slate-600 line-through' : 'text-slate-900'}`}>
                                              {step.name}
                                            </h4>
                                            {completionInfo && (
                                              <div className="flex items-center gap-2 mt-1">
                                                <User className="w-3 h-3 text-slate-400" />
                                                <span className="text-xs text-slate-500">
                                                  Completed by {completionInfo.completedBy ? getUserName(completionInfo.completedBy) : 'Unknown'} on{' '}
                                                  {completionInfo.completedAt
                                                    ? new Date(completionInfo.completedAt).toLocaleDateString('en-GB', {
                                                        day: '2-digit',
                                                        month: '2-digit',
                                                        year: 'numeric'
                                                      })
                                                    : 'Unknown date'}
                                                </span>
                                              </div>
                                            )}
                                          </div>
                                          {(step.instructions || step.checklistItems?.length > 0 || step.attachments?.length > 0) && (
                                            <button
                                              onClick={() => toggleStep(step.id)}
                                              className="p-1 hover:bg-white rounded-lg transition-colors"
                                            >
                                              <ChevronRight className={`w-4 h-4 text-slate-400 transition-transform ${isStepExpanded ? 'rotate-90' : ''}`} />
                                            </button>
                                          )}
                                        </div>
                                      </div>
                                    </div>

                                    {/* Step Details */}
                                    {isStepExpanded && (
                                      <div className="px-4 pb-4 pl-14 space-y-4">
                                        {/* Instructions */}
                                        {step.instructions && (
                                          <div className="p-4 bg-white rounded-lg border border-slate-200">
                                            <h5 className="text-xs font-semibold text-slate-600 uppercase tracking-wider mb-2 flex items-center gap-2">
                                              <FileText className="w-3.5 h-3.5" />
                                              Instructions
                                            </h5>
                                            <div
                                              className="prose prose-sm max-w-none text-slate-700"
                                              dangerouslySetInnerHTML={{
                                                __html: DOMPurify.sanitize(step.instructions)
                                              }}
                                            />
                                          </div>
                                        )}

                                        {/* Checklist Items */}
                                        {step.checklistItems && step.checklistItems.length > 0 && (
                                          <div className="p-4 bg-white rounded-lg border border-slate-200">
                                            <h5 className="text-xs font-semibold text-slate-600 uppercase tracking-wider mb-3 flex items-center gap-2">
                                              <ListChecks className="w-3.5 h-3.5" />
                                              Checklist
                                            </h5>
                                            <div className="space-y-2">
                                              {step.checklistItems.map((item: string, index: number) => {
                                                const checklistKey = `${step.id}-${index}`;
                                                const stepCompletedItems = completedChecklistItems.get(step.id) || new Set<number>();
                                                const isItemCompleted = stepCompletedItems.has(index);
                                                
                                                return (
                                                  <div 
                                                    key={index} 
                                                    className="flex items-start gap-2 cursor-pointer hover:bg-slate-50 rounded-lg p-1 -ml-1 transition-colors"
                                                    onClick={() => {
                                                      const currentSet = completedChecklistItems.get(step.id) || new Set<number>();
                                                      const newSet = new Set(currentSet);
                                                      
                                                      if (isItemCompleted) {
                                                        newSet.delete(index);
                                                      } else {
                                                        newSet.add(index);
                                                      }
                                                      
                                                      setCompletedChecklistItems(prev => {
                                                        const updated = new Map(prev);
                                                        if (newSet.size > 0) {
                                                          updated.set(step.id, newSet);
                                                        } else {
                                                          updated.delete(step.id);
                                                        }
                                                        return updated;
                                                      });
                                                    }}
                                                  >
                                                    <div className={`w-4 h-4 rounded border-2 mt-0.5 flex-shrink-0 flex items-center justify-center transition-all ${
                                                      isItemCompleted
                                                        ? 'bg-green-500 border-green-500'
                                                        : 'border-slate-300 hover:border-indigo-500'
                                                    }`}>
                                                      {isItemCompleted && (
                                                        <CheckSquare className="w-3 h-3 text-white" />
                                                      )}
                                                    </div>
                                                    <span className={`text-sm flex-1 ${isItemCompleted ? 'text-slate-500 line-through' : 'text-slate-700'}`}>
                                                      {item}
                                                    </span>
                                                  </div>
                                                );
                                              })}
                                            </div>
                                          </div>
                                        )}

                                        {/* Attachments */}
                                        {step.attachments && step.attachments.length > 0 && (
                                          <div className="p-4 bg-white rounded-lg border border-slate-200">
                                            <h5 className="text-xs font-semibold text-slate-600 uppercase tracking-wider mb-3 flex items-center gap-2">
                                              <FileText className="w-3.5 h-3.5" />
                                              Attachments
                                            </h5>
                                            <div className="space-y-2">
                                              {step.attachments.map((attachment: any, index: number) => (
                                                <div
                                                  key={index}
                                                  className="flex items-center gap-3 p-3 bg-slate-50 rounded-lg hover:bg-slate-100 transition-colors"
                                                >
                                                  {attachment.type === 'pdf' ? (
                                                    <>
                                                      <div className="w-10 h-10 rounded-lg bg-red-50 flex items-center justify-center">
                                                        <FileText className="w-5 h-5 text-red-600" />
                                                      </div>
                                                      <div className="flex-1 min-w-0">
                                                        <p className="text-sm font-medium text-slate-900 truncate">
                                                          {attachment.name || 'Document.pdf'}
                                                        </p>
                                                        <p className="text-xs text-slate-500">PDF Document</p>
                                                      </div>
                                                      <button
                                                        onClick={() => handlePDFDownload(attachment.url, attachment.name || 'document.pdf')}
                                                        className="p-2 hover:bg-white rounded-lg transition-colors"
                                                        title="Download PDF"
                                                      >
                                                        <Download className="w-4 h-4 text-indigo-600" />
                                                      </button>
                                                    </>
                                                  ) : (
                                                    <>
                                                      <div className="w-10 h-10 rounded-lg bg-blue-50 flex items-center justify-center">
                                                        <Cloud className="w-5 h-5 text-blue-600" />
                                                      </div>
                                                      <div className="flex-1 min-w-0">
                                                        <p className="text-sm font-medium text-slate-900 truncate">
                                                          {attachment.name || 'Google Drive File'}
                                                        </p>
                                                        <p className="text-xs text-slate-500">Google Drive</p>
                                                      </div>
                                                      <a
                                                        href={attachment.url}
                                                        target="_blank"
                                                        rel="noopener noreferrer"
                                                        className="p-2 hover:bg-white rounded-lg transition-colors flex items-center gap-1 text-indigo-600 hover:text-indigo-700"
                                                        title="View in Google Drive"
                                                      >
                                                        <ExternalLink className="w-4 h-4" />
                                                      </a>
                                                    </>
                                                  )}
                                                </div>
                                              ))}
                                            </div>
                                          </div>
                                        )}
                                      </div>
                                    )}
                                  </div>
                                );
                              })}
                          </div>
                        )}
                      </div>
                    );
                  })}
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="p-6 border-t border-slate-100 bg-slate-50/50">
            <button
              onClick={onClose}
              className="w-full px-6 py-3 bg-indigo-600 text-white text-sm font-semibold rounded-xl hover:bg-indigo-700 transition-all shadow-sm"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PlaybookInstanceView;

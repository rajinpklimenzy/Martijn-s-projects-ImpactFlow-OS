import React, { useState, useEffect, useRef } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import DOMPurify from 'dompurify';
import ReactQuill from 'react-quill';
import 'react-quill/dist/quill.snow.css';
import {
  X, Save, Plus, Trash2, ChevronUp, ChevronDown, GripVertical,
  FileText, ListChecks, Paperclip, Cloud, ExternalLink, Loader2,
  AlertCircle, BookOpen, Tag, Edit2
} from 'lucide-react';
import {
  useCreatePlaybookTemplate,
  useUpdatePlaybookTemplate,
  usePlaybookTemplate
} from '../hooks/usePlaybooks';
import { useToast } from '../contexts/ToastContext';
import {
  apiGetGoogleDriveAccessToken
} from '../utils/api';

interface PlaybookBuilderProps {
  isOpen: boolean;
  templateId?: string | null; // If provided, edit mode; otherwise create mode
  onClose: () => void;
  onSuccess?: () => void;
}

interface PlaybookSection {
  id: string;
  name: string;
  order: number;
  steps: PlaybookStep[];
}

interface PlaybookStep {
  id: string;
  name: string;
  instructions: string; // Rich text HTML
  checklistItems: string[];
  attachments: Array<{
    type: 'pdf' | 'gdrive';
    url: string;
    name: string;
    fileId?: string;
  }>;
  order: number;
}

// Note: ReactQuill internally uses findDOMNode which triggers a deprecation warning in React 18+
// This is a known limitation of the react-quill library and cannot be fixed without modifying the library itself
// The warning is harmless and does not affect functionality

const PlaybookBuilder: React.FC<PlaybookBuilderProps> = ({
  isOpen,
  templateId,
  onClose,
  onSuccess
}) => {
  const { showSuccess, showError } = useToast();
  const queryClient = useQueryClient();
  const userId = JSON.parse(localStorage.getItem('user_data') || '{}').id;

  // React Query hooks
  const { data: existingTemplate, isLoading: isLoadingTemplate } = usePlaybookTemplate(templateId || '');
  const createTemplateMutation = useCreatePlaybookTemplate();
  const updateTemplateMutation = useUpdatePlaybookTemplate();

  // Form state
  const [name, setName] = useState('');
  const [category, setCategory] = useState('Custom');
  const [customCategory, setCustomCategory] = useState('');
  const [showCustomCategoryInput, setShowCustomCategoryInput] = useState(false);
  const [description, setDescription] = useState('');
  const [sections, setSections] = useState<PlaybookSection[]>([]);
  
  // UI state
  const [isSaving, setIsSaving] = useState(false);
  const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set());
  const [expandedSteps, setExpandedSteps] = useState<Set<string>>(new Set());
  const [editingStepId, setEditingStepId] = useState<string | null>(null);
  const [editingStepInstructions, setEditingStepInstructions] = useState<string>('');
  
  // Google Drive state
  const [isLoadingPicker, setIsLoadingPicker] = useState(false);
  const [isGoogleDriveConnected, setIsGoogleDriveConnected] = useState(false);

  // Refs
  const fileInputRefs = useRef<Record<string, HTMLInputElement | null>>({});

  // Load template data when editing
  useEffect(() => {
    if (templateId && existingTemplate && isOpen) {
      setName(existingTemplate.name || '');
      setCategory(existingTemplate.category || 'Custom');
      setDescription(existingTemplate.description || '');
      
      if (existingTemplate.sections && Array.isArray(existingTemplate.sections)) {
        setSections(existingTemplate.sections.map((section: any, index: number) => ({
          id: section.id || `section_${Date.now()}_${index}`,
          name: section.name || `Section ${index + 1}`,
          order: section.order !== undefined ? section.order : index,
          steps: (section.steps || []).map((step: any, stepIndex: number) => ({
            id: step.id || `step_${Date.now()}_${index}_${stepIndex}`,
            name: step.name || '',
            instructions: step.instructions || '',
            checklistItems: Array.isArray(step.checklistItems) ? step.checklistItems : [],
            attachments: Array.isArray(step.attachments) ? step.attachments : [],
            order: step.order !== undefined ? step.order : stepIndex
          }))
        })));
      } else {
        setSections([]);
      }
    } else if (!templateId && isOpen) {
      // Reset form for new template
      setName('');
      setCategory('Custom');
      setCustomCategory('');
      setShowCustomCategoryInput(false);
      setDescription('');
      setSections([]);
      setExpandedSections(new Set());
      setExpandedSteps(new Set());
    }
  }, [templateId, existingTemplate, isOpen]);

  // Check Google Drive connection
  useEffect(() => {
    const checkGoogleDriveConnection = async () => {
      if (!userId) return;
      try {
        await apiGetGoogleDriveAccessToken({ userId });
        setIsGoogleDriveConnected(true);
      } catch (err: any) {
        setIsGoogleDriveConnected(false);
      }
    };
    if (isOpen) {
      checkGoogleDriveConnection();
    }
  }, [userId, isOpen]);

  // Quill editor configuration
  const quillModules = {
    toolbar: [
      [{ 'header': [1, 2, 3, false] }],
      ['bold', 'italic', 'underline', 'strike'],
      [{ 'list': 'ordered'}, { 'list': 'bullet' }],
      ['link'],
      ['clean']
    ],
  };

  const quillFormats = [
    'header',
    'bold', 'italic', 'underline', 'strike',
    'list', 'bullet',
    'link'
  ];

  // Section management
  const addSection = () => {
    const newSection: PlaybookSection = {
      id: `section_${Date.now()}`,
      name: `Section ${sections.length + 1}`,
      order: sections.length,
      steps: []
    };
    setSections([...sections, newSection]);
    setExpandedSections(prev => new Set([...prev, newSection.id]));
  };

  const removeSection = (sectionId: string) => {
    setSections(sections.filter(s => s.id !== sectionId));
    setExpandedSections(prev => {
      const newSet = new Set(prev);
      newSet.delete(sectionId);
      return newSet;
    });
  };

  const updateSectionName = (sectionId: string, newName: string) => {
    setSections(sections.map(s =>
      s.id === sectionId ? { ...s, name: newName } : s
    ));
  };

  const moveSection = (sectionId: string, direction: 'up' | 'down') => {
    const index = sections.findIndex(s => s.id === sectionId);
    if (index === -1) return;
    
    const newIndex = direction === 'up' ? index - 1 : index + 1;
    if (newIndex < 0 || newIndex >= sections.length) return;

    const newSections = [...sections];
    [newSections[index], newSections[newIndex]] = [newSections[newIndex], newSections[index]];
    
    // Update order
    newSections.forEach((s, i) => {
      s.order = i;
    });
    
    setSections(newSections);
  };

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

  // Step management
  const addStep = (sectionId: string) => {
    const section = sections.find(s => s.id === sectionId);
    if (!section) return;

    const newStep: PlaybookStep = {
      id: `step_${Date.now()}`,
      name: `Step ${section.steps.length + 1}`,
      instructions: '',
      checklistItems: [],
      attachments: [],
      order: section.steps.length
    };

    setSections(sections.map(s =>
      s.id === sectionId
        ? { ...s, steps: [...s.steps, newStep] }
        : s
    ));
    
    setExpandedSteps(prev => new Set([...prev, newStep.id]));
  };

  const removeStep = (sectionId: string, stepId: string) => {
    setSections(sections.map(s =>
      s.id === sectionId
        ? { ...s, steps: s.steps.filter(st => st.id !== stepId) }
        : s
    ));
    setExpandedSteps(prev => {
      const newSet = new Set(prev);
      newSet.delete(stepId);
      return newSet;
    });
    setEditingStepId(null);
  };

  const updateStepName = (sectionId: string, stepId: string, newName: string) => {
    setSections(sections.map(s =>
      s.id === sectionId
        ? {
            ...s,
            steps: s.steps.map(st =>
              st.id === stepId ? { ...st, name: newName } : st
            )
          }
        : s
    ));
  };

  const moveStep = (sectionId: string, stepId: string, direction: 'up' | 'down') => {
    const section = sections.find(s => s.id === sectionId);
    if (!section) return;

    const index = section.steps.findIndex(st => st.id === stepId);
    if (index === -1) return;

    const newIndex = direction === 'up' ? index - 1 : index + 1;
    if (newIndex < 0 || newIndex >= section.steps.length) return;

    const newSteps = [...section.steps];
    [newSteps[index], newSteps[newIndex]] = [newSteps[newIndex], newSteps[index]];

    // Update order
    newSteps.forEach((st, i) => {
      st.order = i;
    });

    setSections(sections.map(s =>
      s.id === sectionId ? { ...s, steps: newSteps } : s
    ));
  };

  const toggleStep = (stepId: string) => {
    setExpandedSteps(prev => {
      const newSet = new Set(prev);
      if (newSet.has(stepId)) {
        newSet.delete(stepId);
        setEditingStepId(null);
      } else {
        newSet.add(stepId);
      }
      return newSet;
    });
  };

  // Step instructions (rich text)
  const startEditingStepInstructions = (sectionId: string, stepId: string) => {
    const section = sections.find(s => s.id === sectionId);
    const step = section?.steps.find(st => st.id === stepId);
    if (step) {
      setEditingStepId(stepId);
      setEditingStepInstructions(step.instructions);
    }
  };

  const saveStepInstructions = (sectionId: string, stepId: string) => {
    setSections(sections.map(s =>
      s.id === sectionId
        ? {
            ...s,
            steps: s.steps.map(st =>
              st.id === stepId
                ? { ...st, instructions: editingStepInstructions }
                : st
            )
          }
        : s
    ));
    setEditingStepId(null);
    setEditingStepInstructions('');
  };

  // Checklist items
  const addChecklistItem = (sectionId: string, stepId: string) => {
    setSections(sections.map(s =>
      s.id === sectionId
        ? {
            ...s,
            steps: s.steps.map(st =>
              st.id === stepId
                ? { ...st, checklistItems: [...st.checklistItems, ''] }
                : st
            )
          }
        : s
    ));
  };

  const updateChecklistItem = (sectionId: string, stepId: string, itemIndex: number, value: string) => {
    setSections(sections.map(s =>
      s.id === sectionId
        ? {
            ...s,
            steps: s.steps.map(st =>
              st.id === stepId
                ? {
                    ...st,
                    checklistItems: st.checklistItems.map((item, idx) =>
                      idx === itemIndex ? value : item
                    )
                  }
                : st
            )
          }
        : s
    ));
  };

  const removeChecklistItem = (sectionId: string, stepId: string, itemIndex: number) => {
    setSections(sections.map(s =>
      s.id === sectionId
        ? {
            ...s,
            steps: s.steps.map(st =>
              st.id === stepId
                ? {
                    ...st,
                    checklistItems: st.checklistItems.filter((_, idx) => idx !== itemIndex)
                  }
                : st
            )
          }
        : s
    ));
  };

  // PDF attachment
  const handlePDFSelect = (sectionId: string, stepId: string, e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.type !== 'application/pdf') {
      showError('Please select a PDF file');
      return;
    }

    if (file.size > 10 * 1024 * 1024) {
      showError('File size must be less than 10MB');
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      const base64 = reader.result as string;
      const attachment = {
        type: 'pdf' as const,
        url: base64,
        name: file.name
      };

      setSections(sections.map(s =>
        s.id === sectionId
          ? {
              ...s,
              steps: s.steps.map(st =>
                st.id === stepId
                  ? { ...st, attachments: [...st.attachments, attachment] }
                  : st
              )
            }
          : s
      ));

      showSuccess('PDF attached successfully');
    };
    reader.readAsDataURL(file);
  };

  // Google Drive attachment
  const openGoogleDrivePicker = async (sectionId: string, stepId: string) => {
    if (!userId) {
      showError('User not authenticated');
      return;
    }

    setIsLoadingPicker(true);
    try {
      const tokenResponse = await apiGetGoogleDriveAccessToken({ userId });
      const { accessToken } = tokenResponse?.data || {};

      if (!accessToken) {
        throw new Error('Failed to get Google Drive access token. Please ensure your Google account is connected in Settings.');
      }

      await new Promise<void>((resolve, reject) => {
        let attempts = 0;
        const maxAttempts = 50;
        const checkPicker = setInterval(() => {
          attempts++;
          if ((window as any).google && (window as any).google.picker) {
            clearInterval(checkPicker);
            resolve();
          } else if (attempts >= maxAttempts) {
            clearInterval(checkPicker);
            reject(new Error('Google Picker API not loaded. Please refresh the page.'));
          }
        }, 100);
      });

      const googlePicker = (window as any).google.picker;
      const picker = new googlePicker.PickerBuilder()
        .setOAuthToken(accessToken)
        .setCallback((data: any) => {
          setIsLoadingPicker(false);
          if (data[googlePicker.Response.ACTION] === googlePicker.Action.PICKED) {
            const documents = data[googlePicker.Response.DOCUMENTS];
            if (documents && documents.length > 0) {
              const file = documents[0];
              const attachment = {
                type: 'gdrive' as const,
                url: file.url || file.embedUrl || '',
                name: file.name || 'Untitled',
                fileId: file.id
              };

              setSections(sections.map(s =>
                s.id === sectionId
                  ? {
                      ...s,
                      steps: s.steps.map(st =>
                        st.id === stepId
                          ? { ...st, attachments: [...st.attachments, attachment] }
                          : st
                      )
                    }
                  : s
              ));

              showSuccess('File attached from Google Drive');
            }
          } else if (data[googlePicker.Response.ACTION] === googlePicker.Action.CANCEL) {
            setIsLoadingPicker(false);
          }
        })
        .addView(googlePicker.ViewId.DOCS)
        .enableFeature(googlePicker.Feature.NAV_HIDDEN)
        .setSize(1051, 650)
        .build();

      picker.setVisible(true);
    } catch (err: any) {
      setIsLoadingPicker(false);
      showError(err.message || 'Failed to open Google Drive picker');
    }
  };

  const removeAttachment = (sectionId: string, stepId: string, attachmentIndex: number) => {
    setSections(sections.map(s =>
      s.id === sectionId
        ? {
            ...s,
            steps: s.steps.map(st =>
              st.id === stepId
                ? {
                    ...st,
                    attachments: st.attachments.filter((_, idx) => idx !== attachmentIndex)
                  }
                : st
            )
          }
        : s
    ));
  };

  // Validation
  const validateTemplate = (): string | null => {
    if (!name.trim()) {
      return 'Template name is required';
    }

    if (sections.length === 0) {
      return 'At least one section is required';
    }

    for (const section of sections) {
      if (!section.name.trim()) {
        return `Section "${section.name || 'Unnamed'}" must have a name`;
      }
      if (section.steps.length === 0) {
        return `Section "${section.name}" must have at least one step`;
      }
      for (const step of section.steps) {
        if (!step.name.trim()) {
          return 'All steps must have a name';
        }
      }
    }

    return null;
  };

  // Save template
  const handleSave = async () => {
    const validationError = validateTemplate();
    if (validationError) {
      showError(validationError);
      return;
    }

    setIsSaving(true);
    try {
      const finalCategory = showCustomCategoryInput && customCategory.trim()
        ? customCategory.trim()
        : category;

      const templateData = {
        name: name.trim(),
        category: finalCategory,
        description: description,
        sections: sections.map(section => ({
          id: section.id,
          name: section.name.trim(),
          order: section.order,
          steps: section.steps.map(step => ({
            id: step.id,
            name: step.name.trim(),
            instructions: step.instructions,
            checklistItems: step.checklistItems.filter(item => item.trim() !== ''),
            attachments: step.attachments,
            order: step.order
          }))
        }))
      };

      if (templateId) {
        await updateTemplateMutation.mutateAsync({
          id: templateId,
          data: templateData
        });
      } else {
        await createTemplateMutation.mutateAsync(templateData);
      }

      // Hooks already handle success toast and cache invalidation
      // Just trigger the onSuccess callback and close the modal
      onSuccess?.();
      onClose();
    } catch (err: any) {
      showError(err.message || 'Failed to save template');
    } finally {
      setIsSaving(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[90] overflow-hidden pointer-events-none">
      <div
        className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm pointer-events-auto animate-in fade-in duration-300"
        onClick={onClose}
      />
      <div className="absolute inset-0 flex items-center justify-center p-4 pointer-events-none">
        <div className="bg-white rounded-2xl w-full max-w-6xl max-h-[90vh] shadow-2xl pointer-events-auto animate-in zoom-in-95 duration-200 flex flex-col">
          {/* Header */}
          <div className="p-6 border-b border-slate-100 flex items-center justify-between shrink-0">
            <div>
              <h2 className="text-xl font-bold text-slate-900">
                {templateId ? 'Edit Playbook Template' : 'Create New Playbook Template'}
              </h2>
              <p className="text-sm text-slate-500 mt-1">
                {templateId ? 'Update your playbook template' : 'Build a reusable workflow template'}
              </p>
            </div>
            <button
              onClick={onClose}
              className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
            >
              <X className="w-5 h-5 text-slate-400" />
            </button>
          </div>

          {/* Content */}
          <div className="flex-1 overflow-y-auto p-6 space-y-6">
            {isLoadingTemplate && templateId ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="w-8 h-8 text-indigo-600 animate-spin" />
              </div>
            ) : (
              <>
                {/* Basic Info */}
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-semibold text-slate-700 mb-2">
                      Template Name <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="e.g., Sales Playbook"
                      className="w-full px-4 py-2.5 bg-white border-2 border-slate-200 rounded-xl text-sm font-medium text-slate-900 outline-none focus:ring-4 focus:ring-indigo-100 focus:border-indigo-300"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-slate-700 mb-2">
                      Category
                    </label>
                    <div className="flex items-center gap-2">
                      {!showCustomCategoryInput ? (
                        <>
                          <select
                            value={category}
                            onChange={(e) => {
                              if (e.target.value === 'custom') {
                                setShowCustomCategoryInput(true);
                              } else {
                                setCategory(e.target.value);
                              }
                            }}
                            className="flex-1 px-4 py-2.5 bg-white border-2 border-slate-200 rounded-xl text-sm font-medium text-slate-900 outline-none focus:ring-4 focus:ring-indigo-100 focus:border-indigo-300"
                          >
                            <option value="Sales">Sales</option>
                            <option value="Onboarding">Onboarding</option>
                            <option value="Custom">Custom</option>
                            <option value="custom">+ Create New Category</option>
                          </select>
                        </>
                      ) : (
                        <>
                          <input
                            type="text"
                            value={customCategory}
                            onChange={(e) => setCustomCategory(e.target.value)}
                            placeholder="Enter category name"
                            className="flex-1 px-4 py-2.5 bg-white border-2 border-slate-200 rounded-xl text-sm font-medium text-slate-900 outline-none focus:ring-4 focus:ring-indigo-100 focus:border-indigo-300"
                          />
                          <button
                            onClick={() => {
                              setShowCustomCategoryInput(false);
                              setCustomCategory('');
                            }}
                            className="px-3 py-2.5 text-slate-500 hover:text-slate-700"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        </>
                      )}
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-slate-700 mb-2">
                      Description
                    </label>
                    <textarea
                      value={description}
                      onChange={(e) => setDescription(e.target.value)}
                      placeholder="Brief description of this playbook..."
                      rows={3}
                      className="w-full px-4 py-2.5 bg-white border-2 border-slate-200 rounded-xl text-sm font-medium text-slate-900 outline-none focus:ring-4 focus:ring-indigo-100 focus:border-indigo-300 resize-none"
                    />
                  </div>
                </div>

                {/* Sections */}
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="text-lg font-bold text-slate-900">Sections & Steps</h3>
                    <button
                      onClick={addSection}
                      className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold rounded-xl flex items-center gap-2 transition-colors"
                    >
                      <Plus className="w-4 h-4" />
                      Add Section
                    </button>
                  </div>

                  {sections.length === 0 ? (
                    <div className="text-center py-12 border-2 border-dashed border-slate-200 rounded-xl">
                      <BookOpen className="w-12 h-12 text-slate-300 mx-auto mb-3" />
                      <p className="text-sm text-slate-500">No sections yet. Add your first section to get started.</p>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {sections.map((section, sectionIndex) => (
                        <div
                          key={section.id}
                          className="border-2 border-slate-200 rounded-xl overflow-hidden"
                        >
                          {/* Section Header */}
                          <div className="bg-slate-50 p-4 flex items-center gap-3">
                            <button
                              onClick={() => toggleSection(section.id)}
                              className="p-1 hover:bg-white rounded-lg transition-colors"
                            >
                              <ChevronDown
                                className={`w-4 h-4 text-slate-400 transition-transform ${
                                  expandedSections.has(section.id) ? '' : '-rotate-90'
                                }`}
                              />
                            </button>
                            <input
                              type="text"
                              value={section.name}
                              onChange={(e) => updateSectionName(section.id, e.target.value)}
                              placeholder="Section name"
                              className="flex-1 px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-sm font-semibold text-slate-900 outline-none focus:ring-2 focus:ring-indigo-100 focus:border-indigo-300"
                            />
                            <div className="flex items-center gap-1">
                              <button
                                onClick={() => moveSection(section.id, 'up')}
                                disabled={sectionIndex === 0}
                                className="p-1.5 hover:bg-white rounded-lg transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                              >
                                <ChevronUp className="w-4 h-4 text-slate-400" />
                              </button>
                              <button
                                onClick={() => moveSection(section.id, 'down')}
                                disabled={sectionIndex === sections.length - 1}
                                className="p-1.5 hover:bg-white rounded-lg transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                              >
                                <ChevronDown className="w-4 h-4 text-slate-400" />
                              </button>
                              <button
                                onClick={() => removeSection(section.id)}
                                className="p-1.5 hover:bg-red-50 rounded-lg transition-colors text-red-600"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                          </div>

                          {/* Section Steps */}
                          {expandedSections.has(section.id) && (
                            <div className="p-4 space-y-3 bg-white">
                              <div className="flex items-center justify-between mb-2">
                                <span className="text-xs font-semibold text-slate-500 uppercase">
                                  {section.steps.length} Step{section.steps.length !== 1 ? 's' : ''}
                                </span>
                                <button
                                  onClick={() => addStep(section.id)}
                                  className="px-3 py-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 text-xs font-semibold rounded-lg flex items-center gap-1.5 transition-colors"
                                >
                                  <Plus className="w-3 h-3" />
                                  Add Step
                                </button>
                              </div>

                              {section.steps.length === 0 ? (
                                <div className="text-center py-8 border-2 border-dashed border-slate-200 rounded-lg">
                                  <FileText className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                                  <p className="text-xs text-slate-500">No steps yet. Add your first step.</p>
                                </div>
                              ) : (
                                <div className="space-y-3">
                                  {section.steps.map((step, stepIndex) => (
                                    <div
                                      key={step.id}
                                      className="border border-slate-200 rounded-lg overflow-hidden"
                                    >
                                      {/* Step Header */}
                                      <div className="bg-white p-3 flex items-center gap-2">
                                        <button
                                          onClick={() => toggleStep(step.id)}
                                          className="p-1 hover:bg-slate-50 rounded transition-colors"
                                        >
                                          <ChevronDown
                                            className={`w-3.5 h-3.5 text-slate-400 transition-transform ${
                                              expandedSteps.has(step.id) ? '' : '-rotate-90'
                                            }`}
                                          />
                                        </button>
                                        <input
                                          type="text"
                                          value={step.name}
                                          onChange={(e) => updateStepName(section.id, step.id, e.target.value)}
                                          placeholder="Step name"
                                          className="flex-1 px-2 py-1 bg-slate-50 border border-slate-200 rounded text-sm font-medium text-slate-900 outline-none focus:ring-2 focus:ring-indigo-100 focus:border-indigo-300"
                                        />
                                        <div className="flex items-center gap-1">
                                          <button
                                            onClick={() => moveStep(section.id, step.id, 'up')}
                                            disabled={stepIndex === 0}
                                            className="p-1 hover:bg-slate-50 rounded transition-colors disabled:opacity-30"
                                          >
                                            <ChevronUp className="w-3 h-3 text-slate-400" />
                                          </button>
                                          <button
                                            onClick={() => moveStep(section.id, step.id, 'down')}
                                            disabled={stepIndex === section.steps.length - 1}
                                            className="p-1 hover:bg-slate-50 rounded transition-colors disabled:opacity-30"
                                          >
                                            <ChevronDown className="w-3 h-3 text-slate-400" />
                                          </button>
                                          <button
                                            onClick={() => removeStep(section.id, step.id)}
                                            className="p-1 hover:bg-red-50 rounded transition-colors text-red-600"
                                          >
                                            <Trash2 className="w-3 h-3" />
                                          </button>
                                        </div>
                                      </div>

                                      {/* Step Details */}
                                      {expandedSteps.has(step.id) && (
                                        <div className="p-4 bg-slate-50 space-y-4">
                                          {/* Instructions */}
                                          <div>
                                            <label className="block text-xs font-semibold text-slate-700 mb-2">
                                              Instructions
                                            </label>
                                            {editingStepId === step.id ? (
                                              <div className="space-y-2">
                                                <div className="bg-white border border-slate-200 rounded-lg">
                                                  <ReactQuill
                                                    theme="snow"
                                                    value={editingStepInstructions}
                                                    onChange={setEditingStepInstructions}
                                                    modules={quillModules}
                                                    formats={quillFormats}
                                                    placeholder="Add instructions, best practices, talking points..."
                                                    className="text-sm"
                                                  />
                                                </div>
                                                <div className="flex items-center gap-2">
                                                  <button
                                                    onClick={() => saveStepInstructions(section.id, step.id)}
                                                    className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold rounded-lg transition-colors"
                                                  >
                                                    Save Instructions
                                                  </button>
                                                  <button
                                                    onClick={() => {
                                                      setEditingStepId(null);
                                                      setEditingStepInstructions('');
                                                    }}
                                                    className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-lg transition-colors"
                                                  >
                                                    Cancel
                                                  </button>
                                                </div>
                                              </div>
                                            ) : (
                                              <div className="space-y-2">
                                                {step.instructions ? (
                                                  <div
                                                    className="p-3 bg-white border border-slate-200 rounded-lg text-sm text-slate-700 prose prose-sm max-w-none"
                                                    dangerouslySetInnerHTML={{
                                                      __html: DOMPurify.sanitize(step.instructions)
                                                    }}
                                                  />
                                                ) : (
                                                  <div className="p-3 bg-white border-2 border-dashed border-slate-200 rounded-lg text-sm text-slate-400 text-center">
                                                    No instructions added
                                                  </div>
                                                )}
                                                <button
                                                  onClick={() => startEditingStepInstructions(section.id, step.id)}
                                                  className="px-3 py-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 text-xs font-semibold rounded-lg flex items-center gap-1.5 transition-colors"
                                                >
                                                  <Edit2 className="w-3 h-3" />
                                                  {step.instructions ? 'Edit Instructions' : 'Add Instructions'}
                                                </button>
                                              </div>
                                            )}
                                          </div>

                                          {/* Checklist Items */}
                                          <div>
                                            <label className="block text-xs font-semibold text-slate-700 mb-2">
                                              Checklist Items
                                            </label>
                                            <div className="space-y-2">
                                              {step.checklistItems.length === 0 ? (
                                                <div className="text-xs text-slate-400 text-center py-2">
                                                  No checklist items
                                                </div>
                                              ) : (
                                                step.checklistItems.map((item, itemIndex) => (
                                                  <div key={itemIndex} className="flex items-center gap-2">
                                                    <input
                                                      type="text"
                                                      value={item}
                                                      onChange={(e) => updateChecklistItem(section.id, step.id, itemIndex, e.target.value)}
                                                      placeholder="Checklist item"
                                                      className="flex-1 px-3 py-1.5 bg-white border border-slate-200 rounded text-sm text-slate-900 outline-none focus:ring-2 focus:ring-indigo-100 focus:border-indigo-300"
                                                    />
                                                    <button
                                                      onClick={() => removeChecklistItem(section.id, step.id, itemIndex)}
                                                      className="p-1.5 hover:bg-red-50 rounded text-red-600 transition-colors"
                                                    >
                                                      <X className="w-3.5 h-3.5" />
                                                    </button>
                                                  </div>
                                                ))
                                              )}
                                              <button
                                                onClick={() => addChecklistItem(section.id, step.id)}
                                                className="w-full px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-lg flex items-center justify-center gap-1.5 transition-colors"
                                              >
                                                <Plus className="w-3 h-3" />
                                                Add Checklist Item
                                              </button>
                                            </div>
                                          </div>

                                          {/* Attachments */}
                                          <div>
                                            <label className="block text-xs font-semibold text-slate-700 mb-2">
                                              Attachments
                                            </label>
                                            <div className="space-y-2">
                                              {step.attachments.length === 0 ? (
                                                <div className="text-xs text-slate-400 text-center py-2">
                                                  No attachments
                                                </div>
                                              ) : (
                                                step.attachments.map((attachment, attIndex) => (
                                                  <div
                                                    key={attIndex}
                                                    className="flex items-center justify-between p-2 bg-white border border-slate-200 rounded-lg"
                                                  >
                                                    <div className="flex items-center gap-2 flex-1 min-w-0">
                                                      {attachment.type === 'pdf' ? (
                                                        <FileText className="w-4 h-4 text-red-600 shrink-0" />
                                                      ) : (
                                                        <Cloud className="w-4 h-4 text-blue-600 shrink-0" />
                                                      )}
                                                      <span className="text-xs font-medium text-slate-700 truncate">
                                                        {attachment.name}
                                                      </span>
                                                      {attachment.type === 'gdrive' && (
                                                        <span className="text-xs text-blue-600 font-semibold shrink-0">
                                                          Google Drive
                                                        </span>
                                                      )}
                                                    </div>
                                                    <div className="flex items-center gap-1">
                                                      {attachment.type === 'gdrive' && (
                                                        <a
                                                          href={attachment.url}
                                                          target="_blank"
                                                          rel="noopener noreferrer"
                                                          className="p-1 hover:bg-blue-50 rounded text-blue-600"
                                                        >
                                                          <ExternalLink className="w-3.5 h-3.5" />
                                                        </a>
                                                      )}
                                                      <button
                                                        onClick={() => removeAttachment(section.id, step.id, attIndex)}
                                                        className="p-1 hover:bg-red-50 rounded text-red-600"
                                                      >
                                                        <X className="w-3.5 h-3.5" />
                                                      </button>
                                                    </div>
                                                  </div>
                                                ))
                                              )}
                                              <div className="flex items-center gap-2">
                                                <input
                                                  ref={(el) => {
                                                    fileInputRefs.current[`${section.id}_${step.id}_pdf`] = el;
                                                  }}
                                                  type="file"
                                                  accept=".pdf"
                                                  onChange={(e) => handlePDFSelect(section.id, step.id, e)}
                                                  className="hidden"
                                                />
                                                <button
                                                  onClick={() => fileInputRefs.current[`${section.id}_${step.id}_pdf`]?.click()}
                                                  className="flex-1 px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-lg flex items-center justify-center gap-1.5 transition-colors"
                                                >
                                                  <Paperclip className="w-3 h-3" />
                                                  Upload PDF
                                                </button>
                                                <button
                                                  onClick={() => openGoogleDrivePicker(section.id, step.id)}
                                                  disabled={isLoadingPicker || !isGoogleDriveConnected}
                                                  className="flex-1 px-3 py-2 bg-blue-50 hover:bg-blue-100 text-blue-700 text-xs font-semibold rounded-lg flex items-center justify-center gap-1.5 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                                                >
                                                  {isLoadingPicker ? (
                                                    <>
                                                      <Loader2 className="w-3 h-3 animate-spin" />
                                                      Loading...
                                                    </>
                                                  ) : (
                                                    <>
                                                      <Cloud className="w-3 h-3" />
                                                      Google Drive
                                                    </>
                                                  )}
                                                </button>
                                              </div>
                                            </div>
                                          </div>
                                        </div>
                                      )}
                                    </div>
                                  ))}
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </>
            )}
          </div>

          {/* Footer */}
          <div className="p-6 border-t border-slate-100 flex items-center justify-end gap-3 shrink-0">
            <button
              onClick={onClose}
              className="px-4 py-2.5 text-slate-600 hover:bg-slate-50 text-sm font-semibold rounded-xl transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              disabled={isSaving || isLoadingTemplate}
              className="px-6 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold rounded-xl flex items-center gap-2 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSaving ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <Save className="w-4 h-4" />
                  {templateId ? 'Update Template' : 'Create Template'}
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PlaybookBuilder;

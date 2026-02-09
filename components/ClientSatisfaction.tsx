import React, { useState, useEffect, useMemo } from 'react';
import {
  Star, Search, Send, TrendingUp, TrendingDown, Minus, ChevronRight,
  X, Calendar, User, Mail, Link2, Loader2, Plus, Edit3, Save, AlertCircle,
  CheckCircle2, Clock, MessageSquare, BarChart3, Filter, ArrowUpDown
} from 'lucide-react';
import {
  SatisfactionRecord,
  CompanySatisfactionSummary,
  Survey,
  SurveyResponse,
  NPSCategory,
  SatisfactionStatus
} from '../types';
import {
  apiGetSatisfactionRecords,
  apiGetSatisfactionRecord,
  apiCreateSatisfactionRecord,
  apiGetCompanySatisfaction,
  apiCreateSurvey,
  apiGetSurveyTemplate,
  apiUpdateSurveyTemplate,
  apiGetSurveys,
  apiGetContacts,
  apiGetUsers,
  apiGetCompanies
} from '../utils/api';
import { useToast } from '../contexts/ToastContext';
import { ImageWithFallback } from './common';

interface ClientSatisfactionProps {
  onNavigate: (tab: string) => void;
}

const ClientSatisfaction: React.FC<ClientSatisfactionProps> = ({ onNavigate }) => {
  const { showSuccess, showError } = useToast();
  const currentUser = localStorage.getItem('user_data') ? JSON.parse(localStorage.getItem('user_data') || '{}') : null;
  
  const [records, setRecords] = useState<CompanySatisfactionSummary[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedRecord, setSelectedRecord] = useState<SatisfactionRecord | null>(null);
  const [sortBy, setSortBy] = useState<'score' | 'date' | 'status'>('date');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  
  // Detail view state
  const [surveys, setSurveys] = useState<Survey[]>([]);
  const [isLoadingDetail, setIsLoadingDetail] = useState(false);
  
  // Send survey modal state
  const [isSendSurveyOpen, setIsSendSurveyOpen] = useState(false);
  const [selectedCompanyId, setSelectedCompanyId] = useState<string | null>(null);
  const [availableContacts, setAvailableContacts] = useState<any[]>([]);
  const [selectedContactIds, setSelectedContactIds] = useState<string[]>([]);
  const [deliveryMethod, setDeliveryMethod] = useState<'email' | 'link'>('email');
  const [isSendingSurvey, setIsSendingSurvey] = useState(false);
  
  // Survey builder state
  const [isSurveyBuilderOpen, setIsSurveyBuilderOpen] = useState(false);
  const [surveyTemplate, setSurveyTemplate] = useState<any>(null);
  const [isLoadingTemplate, setIsLoadingTemplate] = useState(false);
  
  const loadSurveyTemplate = async () => {
    try {
      setIsLoadingTemplate(true);
      const response = await apiGetSurveyTemplate();
      console.log('[SATISFACTION] Template response:', response);
      if (response && response.success && response.data) {
        setSurveyTemplate(response.data);
      } else {
        console.error('[SATISFACTION] Invalid response format:', response);
        showError(response?.error?.message || response?.message || 'Failed to load survey template');
      }
    } catch (err: any) {
      console.error('[SATISFACTION] Error loading template:', err);
      showError(err.message || 'Failed to load survey template');
    } finally {
      setIsLoadingTemplate(false);
    }
  };
  
  useEffect(() => {
    if (isSurveyBuilderOpen && !surveyTemplate) {
      loadSurveyTemplate();
    }
  }, [isSurveyBuilderOpen]);
  
  useEffect(() => {
    loadSatisfactionRecords();
  }, []);
  
  useEffect(() => {
    if (selectedRecord) {
      loadRecordDetail(selectedRecord.id);
    }
  }, [selectedRecord]);
  
  const loadSatisfactionRecords = async () => {
    try {
      setIsLoading(true);
      const response = await apiGetSatisfactionRecords(searchQuery);
      if (response.success && response.data) {
        // Transform data to CompanySatisfactionSummary format
        const summaries: CompanySatisfactionSummary[] = response.data.map((r: any) => ({
          companyId: r.companyId,
          companyName: r.company?.name || 'Unknown Company',
          latestNpsScore: r.latestNpsScore,
          npsCategory: r.npsCategory,
          accountManagerId: r.company?.ownerId,
          accountManagerName: null, // Will be populated if needed
          lastSurveyDate: r.lastSurveyDate,
          status: r.status || 'not_yet_sent',
          satisfactionRecordId: r.id
        }));
        setRecords(summaries);
      }
    } catch (err: any) {
      showError(err.message || 'Failed to load satisfaction records');
    } finally {
      setIsLoading(false);
    }
  };
  
  const loadRecordDetail = async (recordId: string) => {
    try {
      setIsLoadingDetail(true);
      const response = await apiGetSatisfactionRecord(recordId);
      if (response.success && response.data) {
        setSurveys(response.data.surveys || []);
      }
    } catch (err: any) {
      showError(err.message || 'Failed to load record details');
    } finally {
      setIsLoadingDetail(false);
    }
  };
  
  const getNpsColor = (score?: number): string => {
    if (score === undefined || score === null) return 'text-slate-400';
    if (score >= 9) return 'text-green-600';
    if (score >= 7) return 'text-yellow-600';
    return 'text-red-600';
  };
  
  const getNpsBgColor = (score?: number): string => {
    if (score === undefined || score === null) return 'bg-slate-100';
    if (score >= 9) return 'bg-green-50';
    if (score >= 7) return 'bg-yellow-50';
    return 'bg-red-50';
  };
  
  const getStatusBadge = (status: SatisfactionStatus) => {
    const badges = {
      'awaiting_response': { label: 'Awaiting Response', color: 'bg-yellow-100 text-yellow-700' },
      'completed': { label: 'Completed', color: 'bg-green-100 text-green-700' },
      'not_yet_sent': { label: 'Not Yet Sent', color: 'bg-slate-100 text-slate-700' }
    };
    const badge = badges[status];
    return (
      <span className={`px-2 py-1 rounded-full text-xs font-semibold ${badge.color}`}>
        {badge.label}
      </span>
    );
  };
  
  const sortedRecords = useMemo(() => {
    const filtered = records.filter(r =>
      r.companyName.toLowerCase().includes(searchQuery.toLowerCase())
    );
    
    return [...filtered].sort((a, b) => {
      let comparison = 0;
      
      if (sortBy === 'score') {
        const scoreA = a.latestNpsScore ?? -1;
        const scoreB = b.latestNpsScore ?? -1;
        comparison = scoreA - scoreB;
      } else if (sortBy === 'date') {
        const dateA = a.lastSurveyDate ? new Date(a.lastSurveyDate).getTime() : 0;
        const dateB = b.lastSurveyDate ? new Date(b.lastSurveyDate).getTime() : 0;
        comparison = dateA - dateB;
      } else if (sortBy === 'status') {
        comparison = a.status.localeCompare(b.status);
      }
      
      return sortOrder === 'asc' ? comparison : -comparison;
    });
  }, [records, searchQuery, sortBy, sortOrder]);
  
  const handleSendSurvey = async () => {
    if (!selectedCompanyId || selectedContactIds.length === 0) {
      showError('Please select a company and at least one contact');
      return;
    }
    
    try {
      setIsSendingSurvey(true);
      
      // Get satisfaction record for company
      const companyResponse = await apiGetCompanySatisfaction(selectedCompanyId);
      let recordId = companyResponse.data?.satisfactionRecordId;
      
      if (!recordId) {
        // Create satisfaction record
        const createResponse = await apiCreateSatisfactionRecord({
          companyId: selectedCompanyId,
          source: 'manual'
        });
        recordId = createResponse.data.id;
      }
      
      // Create survey
      const surveyResponse = await apiCreateSurvey({
        satisfactionRecordId: recordId,
        contactIds: selectedContactIds,
        deliveryMethod
      });
      
      // If link method, show the survey URL for copying
      if (deliveryMethod === 'link' && surveyResponse.data?.surveyUrl) {
        const surveyUrl = surveyResponse.data.surveyUrl;
        // Copy to clipboard
        if (navigator.clipboard) {
          navigator.clipboard.writeText(surveyUrl).then(() => {
            showSuccess(`Survey link copied to clipboard! Share: ${surveyUrl}`);
          }).catch(() => {
            showSuccess(`Survey created! Copy this link: ${surveyUrl}`);
          });
        } else {
          // Fallback for browsers without clipboard API
          showSuccess(`Survey created! Copy this link: ${surveyUrl}`);
        }
      } else {
        showSuccess('Survey sent successfully');
      }
      
      setIsSendSurveyOpen(false);
      setSelectedContactIds([]);
      loadSatisfactionRecords();
    } catch (err: any) {
      showError(err.message || 'Failed to send survey');
    } finally {
      setIsSendingSurvey(false);
    }
  };
  
  const openSendSurvey = async (companyId: string) => {
    setSelectedCompanyId(companyId);
    setIsSendSurveyOpen(true);
    
    // Load contacts for this company
    try {
      const contactsResponse = await apiGetContacts('', companyId);
      if (contactsResponse.success && contactsResponse.data) {
        const contactsWithEmail = contactsResponse.data.filter((c: any) => c.email);
        setAvailableContacts(contactsWithEmail);
      }
    } catch (err: any) {
      showError(err.message || 'Failed to load contacts');
    }
  };
  
  const canSendSurvey = (record: CompanySatisfactionSummary): boolean => {
    if (!currentUser) return false;
    const isAdmin = currentUser.role === 'Admin';
    const isAccountManager = currentUser.id === record.accountManagerId;
    return isAdmin || isAccountManager;
  };
  
  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="p-6 border-b border-slate-200 bg-white">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">Client Satisfaction</h1>
            <p className="text-sm text-slate-500 mt-1">Track NPS scores and client feedback</p>
          </div>
          <button
            onClick={() => setIsSurveyBuilderOpen(true)}
            className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-semibold text-sm flex items-center gap-2"
          >
            <Edit3 className="w-4 h-4" />
            Survey Builder
          </button>
        </div>
        
        {/* Search and Filters */}
        <div className="flex items-center gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
            <input
              type="text"
              placeholder="Search companies..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
            />
          </div>
          <div className="flex items-center gap-2">
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as any)}
              className="px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500"
            >
              <option value="date">Sort by Date</option>
              <option value="score">Sort by Score</option>
              <option value="status">Sort by Status</option>
            </select>
            <button
              onClick={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')}
              className="p-2 border border-slate-300 rounded-lg hover:bg-slate-50"
            >
              <ArrowUpDown className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
      
      {/* Content */}
      <div className="flex-1 overflow-y-auto p-6">
        {isLoading ? (
          <div className="flex items-center justify-center h-64">
            <Loader2 className="w-8 h-8 animate-spin text-indigo-600" />
          </div>
        ) : sortedRecords.length === 0 ? (
          <div className="text-center py-12">
            <Star className="w-12 h-12 text-slate-300 mx-auto mb-4" />
            <p className="text-slate-500">No satisfaction records found</p>
          </div>
        ) : (
          <div className="space-y-4">
            {sortedRecords.map((record) => (
              <div
                key={record.satisfactionRecordId}
                onClick={() => {
                  const rec: SatisfactionRecord = {
                    id: record.satisfactionRecordId,
                    companyId: record.companyId,
                    createdAt: '',
                    createdBy: '',
                    source: 'manual'
                  };
                  setSelectedRecord(rec);
                }}
                className="bg-white border border-slate-200 rounded-xl p-6 hover:shadow-md transition-shadow cursor-pointer"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4 flex-1">
                    <div className={`w-16 h-16 rounded-xl ${getNpsBgColor(record.latestNpsScore)} flex items-center justify-center`}>
                      {record.latestNpsScore !== undefined && record.latestNpsScore !== null ? (
                        <span className={`text-2xl font-bold ${getNpsColor(record.latestNpsScore)}`}>
                          {record.latestNpsScore}
                        </span>
                      ) : (
                        <Minus className="w-6 h-6 text-slate-400" />
                      )}
                    </div>
                    <div className="flex-1">
                      <h3 className="font-bold text-lg text-slate-900">{record.companyName}</h3>
                      <div className="flex items-center gap-4 mt-2">
                        {record.npsCategory && (
                          <span className={`px-2 py-1 rounded-full text-xs font-semibold ${
                            record.npsCategory === 'Promoter' ? 'bg-green-100 text-green-700' :
                            record.npsCategory === 'Passive' ? 'bg-yellow-100 text-yellow-700' :
                            'bg-red-100 text-red-700'
                          }`}>
                            {record.npsCategory}
                          </span>
                        )}
                        {getStatusBadge(record.status)}
                        {record.lastSurveyDate && (
                          <span className="text-xs text-slate-500 flex items-center gap-1">
                            <Calendar className="w-3 h-3" />
                            {new Date(record.lastSurveyDate).toLocaleDateString()}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {canSendSurvey(record) && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          openSendSurvey(record.companyId);
                        }}
                        className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-sm font-semibold flex items-center gap-2"
                      >
                        <Send className="w-4 h-4" />
                        Send Survey
                      </button>
                    )}
                    <ChevronRight className="w-5 h-5 text-slate-400" />
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
      
      {/* Detail Drawer */}
      {selectedRecord && (
        <div className="fixed inset-0 z-[70] overflow-hidden pointer-events-none">
          <div
            className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm pointer-events-auto animate-in fade-in duration-300"
            onClick={() => setSelectedRecord(null)}
          />
          <div className="absolute right-0 inset-y-0 w-full max-w-2xl bg-white shadow-2xl pointer-events-auto animate-in slide-in-from-right duration-500 flex flex-col">
            <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
              <h2 className="text-xl font-bold text-slate-900">Satisfaction Details</h2>
              <button
                onClick={() => setSelectedRecord(null)}
                className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
              >
                <X className="w-5 h-5 text-slate-500" />
              </button>
            </div>
            
            <div className="flex-1 overflow-y-auto p-6">
              {isLoadingDetail ? (
                <div className="flex items-center justify-center h-64">
                  <Loader2 className="w-8 h-8 animate-spin text-indigo-600" />
                </div>
              ) : (
                <div className="space-y-6">
                  {/* Survey History */}
                  <div>
                    <h3 className="text-lg font-bold text-slate-900 mb-4">Survey History</h3>
                    {surveys.length === 0 ? (
                      <p className="text-slate-500">No surveys sent yet</p>
                    ) : (
                      <div className="space-y-4">
                        {surveys.map((survey) => (
                          <div key={survey.id} className="border border-slate-200 rounded-lg p-4">
                            <div className="flex items-center justify-between mb-2">
                              <span className="text-sm font-semibold text-slate-900">
                                Sent {new Date(survey.sentAt).toLocaleDateString()}
                              </span>
                              <span className={`px-2 py-1 rounded-full text-xs font-semibold ${
                                survey.status === 'completed' ? 'bg-green-100 text-green-700' :
                                survey.status === 'sent' ? 'bg-yellow-100 text-yellow-700' :
                                'bg-slate-100 text-slate-700'
                              }`}>
                                {survey.status}
                              </span>
                            </div>
                            <div className="text-xs text-slate-500">
                              {survey.recipients?.length || 0} recipient(s) • {survey.responses?.length || 0} response(s)
                            </div>
                            {survey.responses && survey.responses.length > 0 && (
                              <div className="mt-4 space-y-3">
                                {survey.responses.map((response: SurveyResponse) => (
                                  <div key={response.id} className="bg-slate-50 rounded-lg p-3">
                                    <div className="flex items-center justify-between mb-2">
                                      <span className="text-sm font-semibold">NPS: {response.npsScore}</span>
                                      <span className="text-xs text-slate-500">
                                        {new Date(response.submittedAt).toLocaleDateString()}
                                      </span>
                                    </div>
                                    {response.answers.map((answer, idx) => (
                                      answer.questionText && answer.answer && (
                                        <div key={idx} className="mt-2 text-sm">
                                          <span className="font-medium text-slate-700">{answer.questionText}</span>
                                          <p className="text-slate-600 mt-1">{String(answer.answer)}</p>
                                        </div>
                                      )
                                    ))}
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
      
      {/* Send Survey Modal */}
      {isSendSurveyOpen && (
        <div className="fixed inset-0 z-[80] overflow-hidden pointer-events-none">
          <div
            className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm pointer-events-auto"
            onClick={() => setIsSendSurveyOpen(false)}
          />
          <div className="absolute inset-0 flex items-center justify-center p-4 pointer-events-none">
            <div
              className="bg-white rounded-xl shadow-2xl w-full max-w-md pointer-events-auto"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="p-6 border-b border-slate-200">
                <h3 className="text-lg font-bold text-slate-900">Send Survey</h3>
              </div>
              <div className="p-6 space-y-4">
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-2">Select Contacts</label>
                  <div className="border border-slate-300 rounded-lg max-h-48 overflow-y-auto">
                    {availableContacts.map((contact) => (
                      <label
                        key={contact.id}
                        className="flex items-center gap-3 p-3 hover:bg-slate-50 cursor-pointer border-b border-slate-100 last:border-b-0"
                      >
                        <input
                          type="checkbox"
                          checked={selectedContactIds.includes(contact.id)}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setSelectedContactIds([...selectedContactIds, contact.id]);
                            } else {
                              setSelectedContactIds(selectedContactIds.filter(id => id !== contact.id));
                            }
                          }}
                          className="w-4 h-4 text-indigo-600"
                        />
                        <div>
                          <div className="font-medium text-slate-900">{contact.name}</div>
                          <div className="text-xs text-slate-500">{contact.email}</div>
                        </div>
                      </label>
                    ))}
                  </div>
                </div>
                
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-2">Delivery Method</label>
                  <div className="flex gap-4">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="radio"
                        checked={deliveryMethod === 'email'}
                        onChange={() => setDeliveryMethod('email')}
                        className="w-4 h-4 text-indigo-600"
                      />
                      <Mail className="w-4 h-4" />
                      <span>Email</span>
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="radio"
                        checked={deliveryMethod === 'link'}
                        onChange={() => setDeliveryMethod('link')}
                        className="w-4 h-4 text-indigo-600"
                      />
                      <Link2 className="w-4 h-4" />
                      <span>Copy Link</span>
                    </label>
                  </div>
                  {deliveryMethod === 'link' && (
                    <p className="text-xs text-slate-500 mt-2">
                      A unique survey link will be generated after you send the survey. You can copy and share it via WhatsApp, SMS, or any other channel.
                    </p>
                  )}
                </div>
              </div>
              <div className="p-6 border-t border-slate-200 flex justify-end gap-3">
                <button
                  onClick={() => setIsSendSurveyOpen(false)}
                  className="px-4 py-2 border border-slate-300 rounded-lg text-slate-700 hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSendSurvey}
                  disabled={isSendingSurvey || selectedContactIds.length === 0}
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-semibold disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                >
                  {isSendingSurvey && <Loader2 className="w-4 h-4 animate-spin" />}
                  Send Survey
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
      
      {/* Survey Builder Modal */}
      {isSurveyBuilderOpen && (
        <div className="fixed inset-0 z-[80] overflow-hidden pointer-events-none">
          <div
            className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm pointer-events-auto"
            onClick={() => setIsSurveyBuilderOpen(false)}
          />
          <div className="absolute inset-0 flex items-center justify-center p-4 pointer-events-none">
            <div
              className="bg-white rounded-xl shadow-2xl w-full max-w-3xl max-h-[90vh] overflow-hidden flex flex-col pointer-events-auto"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="p-6 border-b border-slate-200 flex justify-between items-center">
                <h3 className="text-xl font-bold text-slate-900">Survey Builder</h3>
                <button
                  onClick={() => setIsSurveyBuilderOpen(false)}
                  className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
                >
                  <X className="w-5 h-5 text-slate-500" />
                </button>
              </div>
              
              <div className="flex-1 overflow-y-auto p-6">
                {isLoadingTemplate ? (
                  <div className="flex items-center justify-center h-64">
                    <Loader2 className="w-8 h-8 animate-spin text-indigo-600" />
                  </div>
                ) : surveyTemplate ? (
                  <SurveyBuilderContent
                    template={surveyTemplate}
                    setTemplate={setSurveyTemplate}
                    onClose={() => setIsSurveyBuilderOpen(false)}
                    showSuccess={showSuccess}
                    showError={showError}
                  />
                ) : (
                  <div className="text-center py-12">
                    <AlertCircle className="w-12 h-12 text-slate-300 mx-auto mb-4" />
                    <p className="text-slate-500 mb-2">Failed to load survey template</p>
                    <p className="text-xs text-slate-400 mb-4">Check browser console for details</p>
                    <button
                      onClick={() => {
                        loadSurveyTemplate();
                      }}
                      className="mt-4 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg"
                    >
                      Retry
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// Survey Builder Content Component
const SurveyBuilderContent: React.FC<{
  template: any;
  setTemplate: (template: any) => void;
  onClose: () => void;
  showSuccess: (message: string) => void;
  showError: (message: string) => void;
}> = ({ template, setTemplate, onClose, showSuccess, showError }) => {
  const [editedTemplate, setEditedTemplate] = useState(template);
  const [isSaving, setIsSaving] = useState(false);

  const handleSave = async () => {
    try {
      setIsSaving(true);
      const response = await apiUpdateSurveyTemplate({
        questions: editedTemplate.questions,
        name: editedTemplate.name
      });
      if (response.success) {
        showSuccess('Survey template updated successfully');
        setTemplate(editedTemplate);
        onClose();
      }
    } catch (err: any) {
      showError(err.message || 'Failed to update survey template');
    } finally {
      setIsSaving(false);
    }
  };

  const addQuestion = () => {
    const newQuestion = {
      id: `q${Date.now()}`,
      type: 'free_text',
      text: '',
      required: false,
      order: editedTemplate.questions.length + 1
    };
    setEditedTemplate({
      ...editedTemplate,
      questions: [...editedTemplate.questions, newQuestion]
    });
  };

  const removeQuestion = (questionId: string) => {
    const npsQuestion = editedTemplate.questions.find((q: any) => q.type === 'nps');
    if (npsQuestion && npsQuestion.id === questionId) {
      showError('Cannot delete the NPS question (Q1)');
      return;
    }
    setEditedTemplate({
      ...editedTemplate,
      questions: editedTemplate.questions.filter((q: any) => q.id !== questionId)
        .map((q: any, idx: number) => ({ ...q, order: idx + 1 }))
    });
  };

  const updateQuestion = (questionId: string, updates: any) => {
    setEditedTemplate({
      ...editedTemplate,
      questions: editedTemplate.questions.map((q: any) =>
        q.id === questionId ? { ...q, ...updates } : q
      )
    });
  };

  const moveQuestion = (questionId: string, direction: 'up' | 'down') => {
    const questions = [...editedTemplate.questions];
    const index = questions.findIndex((q: any) => q.id === questionId);
    if (index === -1) return;
    
    const npsQuestion = questions.find((q: any) => q.type === 'nps');
    const npsIndex = questions.findIndex((q: any) => q.type === 'nps');
    
    // Don't allow moving NPS question or moving questions before NPS
    if (npsQuestion && npsQuestion.id === questionId) {
      showError('NPS question must remain first');
      return;
    }
    if (direction === 'up' && index <= npsIndex + 1) {
      showError('Cannot move question before NPS question');
      return;
    }
    
    const newIndex = direction === 'up' ? index - 1 : index + 1;
    if (newIndex < 0 || newIndex >= questions.length) return;
    
    [questions[index], questions[newIndex]] = [questions[newIndex], questions[index]];
    const reordered = questions.map((q: any, idx: number) => ({ ...q, order: idx + 1 }));
    
    setEditedTemplate({
      ...editedTemplate,
      questions: reordered
    });
  };

  return (
    <div className="space-y-6">
      <div>
        <label className="block text-sm font-semibold text-slate-700 mb-2">Template Name</label>
        <input
          type="text"
          value={editedTemplate.name || ''}
          onChange={(e) => setEditedTemplate({ ...editedTemplate, name: e.target.value })}
          className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
        />
      </div>

      <div>
        <div className="flex items-center justify-between mb-4">
          <h4 className="text-lg font-semibold text-slate-900">Questions</h4>
          <button
            onClick={addQuestion}
            className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-sm font-semibold flex items-center gap-2"
          >
            <Plus className="w-4 h-4" />
            Add Question
          </button>
        </div>

        <div className="space-y-4">
          {editedTemplate.questions.map((question: any, idx: number) => (
            <div key={question.id} className="border border-slate-200 rounded-lg p-4">
              <div className="flex items-start justify-between mb-3">
                <span className="text-sm font-semibold text-slate-500">Q{question.order}</span>
                <div className="flex items-center gap-2">
                  {idx > 0 && question.type !== 'nps' && (
                    <>
                      <button
                        onClick={() => moveQuestion(question.id, 'up')}
                        className="p-1 hover:bg-slate-100 rounded"
                        title="Move up"
                      >
                        <TrendingUp className="w-4 h-4 text-slate-500" />
                      </button>
                      <button
                        onClick={() => moveQuestion(question.id, 'down')}
                        className="p-1 hover:bg-slate-100 rounded"
                        title="Move down"
                      >
                        <TrendingDown className="w-4 h-4 text-slate-500" />
                      </button>
                    </>
                  )}
                  {question.type !== 'nps' && (
                    <button
                      onClick={() => removeQuestion(question.id)}
                      className="p-1 hover:bg-red-50 rounded text-red-500"
                      title="Delete question"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  )}
                </div>
              </div>

              <div className="space-y-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">Question Type</label>
                  <select
                    value={question.type}
                    onChange={(e) => updateQuestion(question.id, { type: e.target.value })}
                    disabled={question.type === 'nps'}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm disabled:bg-slate-100"
                  >
                    <option value="nps">NPS (0-10 scale)</option>
                    <option value="multiple_choice">Multiple Choice</option>
                    <option value="free_text">Free Text</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">Question Text</label>
                  <input
                    type="text"
                    value={question.text}
                    onChange={(e) => updateQuestion(question.id, { text: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm"
                    placeholder="Enter question text..."
                  />
                </div>

                {question.type === 'multiple_choice' && (
                  <div>
                    <label className="block text-xs font-semibold text-slate-600 mb-1">Options (one per line)</label>
                    <textarea
                      value={question.options?.join('\n') || ''}
                      onChange={(e) => updateQuestion(question.id, {
                        options: e.target.value.split('\n').filter(o => o.trim())
                      })}
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm"
                      rows={4}
                      placeholder="Option 1&#10;Option 2&#10;Option 3"
                    />
                  </div>
                )}

                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={question.required}
                    onChange={(e) => updateQuestion(question.id, { required: e.target.checked })}
                    disabled={question.type === 'nps'}
                    className="w-4 h-4 text-indigo-600 disabled:opacity-50"
                  />
                  <label className="text-sm text-slate-700">Required</label>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="flex justify-end gap-3 pt-4 border-t border-slate-200">
        <button
          onClick={onClose}
          className="px-4 py-2 border border-slate-300 rounded-lg text-slate-700 hover:bg-slate-50"
        >
          Cancel
        </button>
        <button
          onClick={handleSave}
          disabled={isSaving}
          className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-semibold disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
        >
          {isSaving && <Loader2 className="w-4 h-4 animate-spin" />}
          Save Template
        </button>
      </div>
    </div>
  );
};

export default ClientSatisfaction;

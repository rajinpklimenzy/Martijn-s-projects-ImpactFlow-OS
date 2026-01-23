
import React, { useState, useEffect, useRef } from 'react';
import { MOCK_USERS, MOCK_PROJECTS } from '../constants';
import { 
  Star, MessageSquare, MoreVertical, Search, Filter, Mail, 
  CheckCircle, UserPlus, ArrowRight, ChevronLeft, Check, 
  Building2, CheckSquare, X, RefreshCw, ExternalLink, Loader2
} from 'lucide-react';
import { Thread, User } from '../types';
import { 
  apiGetGoogleCalendarStatus, 
  apiGetGoogleCalendarAuthUrl,
  apiSyncGmailEmails,
  apiGetSharedInboxEmails,
  apiGetEmailDetails,
  apiAssignEmail,
  apiGetUsers,
  apiToggleEmailStarred
} from '../utils/api';
import { useToast } from '../contexts/ToastContext';

interface InboxProps {
  currentUser?: any;
}

const Inbox: React.FC<InboxProps> = ({ currentUser }) => {
  const { showSuccess, showError } = useToast();
  const [threads, setThreads] = useState<Thread[]>([]);
  const [selectedThread, setSelectedThread] = useState<Thread | null>(null);
  const [isMobile, setIsMobile] = useState(false);
  const [showAssignDropdown, setShowAssignDropdown] = useState(false);
  const [showConvertModal, setShowConvertModal] = useState(false);
  const [isConnectingGoogle, setIsConnectingGoogle] = useState(false);
  const [isGoogleConnected, setIsGoogleConnected] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [isBackgroundSyncing, setIsBackgroundSyncing] = useState(false);
  const [isLoadingEmails, setIsLoadingEmails] = useState(false);
  const [users, setUsers] = useState<User[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [emailDetails, setEmailDetails] = useState<any>(null);
  const [syncStatus, setSyncStatus] = useState<string>('');
  
  const assignRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 1024);
    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Check Google Calendar connection status and auto-sync emails
  useEffect(() => {
    const checkConnectionAndSync = async () => {
      const userId = currentUser?.id || JSON.parse(localStorage.getItem('user_data') || '{}').id;
      if (!userId) return;

      try {
        const response = await apiGetGoogleCalendarStatus(userId);
        const connected = response.connected || false;
        setIsGoogleConnected(connected);
        
        // Auto-sync emails when Gmail is connected (background sync)
        if (connected) {
          setIsBackgroundSyncing(true);
          setSyncStatus('Syncing emails from Gmail...');
          
          try {
            const syncResponse = await apiSyncGmailEmails(userId);
            // Show sync results
            const syncData = syncResponse.data || syncResponse;
            if (syncData.newEmails > 0 || syncData.updatedEmails > 0) {
              setSyncStatus(`Synced ${syncData.newEmails} new, ${syncData.updatedEmails} updated emails`);
            } else {
              setSyncStatus('All emails are up to date');
            }
            
            // Fetch emails after sync
            const emailResponse = await apiGetSharedInboxEmails(userId, searchQuery || undefined);
            setThreads(emailResponse.data || []);
            
            // Clear status after 3 seconds
            setTimeout(() => {
              setSyncStatus('');
            }, 3000);
          } catch (syncErr) {
            console.error('Auto-sync failed:', syncErr);
            setSyncStatus('Sync failed. Showing existing emails...');
            // Still try to fetch existing emails even if sync fails
            try {
              const emailResponse = await apiGetSharedInboxEmails(userId, searchQuery || undefined);
              setThreads(emailResponse.data || []);
            } catch (fetchErr) {
              console.error('Failed to fetch emails:', fetchErr);
              setSyncStatus('');
            }
            setTimeout(() => {
              setSyncStatus('');
            }, 3000);
          } finally {
            setIsBackgroundSyncing(false);
          }
        } else {
          // If not connected, still try to fetch existing emails
          try {
            const emailResponse = await apiGetSharedInboxEmails(userId, searchQuery || undefined);
            setThreads(emailResponse.data || []);
          } catch (fetchErr) {
            console.error('Failed to fetch emails:', fetchErr);
          }
        }
      } catch (err) {
        setIsGoogleConnected(false);
      }
    };

    checkConnectionAndSync();
  }, [currentUser]);

  // Fetch users for assignment
  useEffect(() => {
    const fetchUsers = async () => {
      try {
        const response = await apiGetUsers();
        setUsers(response.data || []);
      } catch (err) {
        console.error('Failed to fetch users:', err);
      }
    };

    fetchUsers();
  }, []);

  // Fetch emails when search query changes (but not on initial load, handled by connection check)
  useEffect(() => {
    const fetchEmails = async () => {
      const userId = currentUser?.id || JSON.parse(localStorage.getItem('user_data') || '{}').id;
      if (!userId || !isGoogleConnected) {
        return; // Don't clear threads if not connected, let connection check handle it
      }

      setIsLoadingEmails(true);
      try {
        const response = await apiGetSharedInboxEmails(userId, searchQuery || undefined);
        setThreads(response.data || []);
      } catch (err) {
        console.error('Failed to fetch emails:', err);
        showError('Failed to load emails');
      } finally {
        setIsLoadingEmails(false);
      }
    };

    // Only fetch if we have a search query change (not on initial mount)
    if (isGoogleConnected && currentUser) {
      fetchEmails();
    }
  }, [searchQuery]); // Only depend on searchQuery, not isGoogleConnected or currentUser to avoid double fetching

  // Fetch email details when selected
  useEffect(() => {
    const fetchEmailDetails = async () => {
      if (!selectedThread) {
        setEmailDetails(null);
        return;
      }

      const userId = currentUser?.id || JSON.parse(localStorage.getItem('user_data') || '{}').id;
      if (!userId) return;

      try {
        const response = await apiGetEmailDetails(selectedThread.id, userId);
        setEmailDetails(response.data);
      } catch (err) {
        console.error('Failed to fetch email details:', err);
        showError('Failed to load email details');
      }
    };

    fetchEmailDetails();
  }, [selectedThread, currentUser]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (assignRef.current && !assignRef.current.contains(event.target as Node)) {
        setShowAssignDropdown(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleConnectGoogle = async () => {
    setIsConnectingGoogle(true);
    try {
      const userId = currentUser?.id || JSON.parse(localStorage.getItem('user_data') || '{}').id;
      if (!userId) {
        throw new Error('User ID not found. Please log in again.');
      }

      const response = await apiGetGoogleCalendarAuthUrl(userId);
      if (response.authUrl) {
        window.location.href = response.authUrl;
      } else {
        throw new Error('Failed to get authorization URL');
      }
    } catch (err: any) {
      console.error('Failed to connect Google:', err);
      showError(err.message || 'Failed to connect Google account');
      setIsConnectingGoogle(false);
    }
  };

  const handleSync = async () => {
    const userId = currentUser?.id || JSON.parse(localStorage.getItem('user_data') || '{}').id;
    if (!userId) {
      showError('User ID not found. Please log in again.');
      return;
    }

    setIsSyncing(true);
    setIsLoadingEmails(true);
    setSyncStatus('Syncing emails from Gmail...');
    
    try {
      const syncResponse = await apiSyncGmailEmails(userId);
      const syncData = syncResponse.data || syncResponse;
      
      // Show detailed sync results
      let message = '';
      if (syncData.newEmails > 0 && syncData.updatedEmails > 0) {
        message = `Synced ${syncData.newEmails} new and ${syncData.updatedEmails} updated emails`;
      } else if (syncData.newEmails > 0) {
        message = `Synced ${syncData.newEmails} new email${syncData.newEmails > 1 ? 's' : ''}`;
      } else if (syncData.updatedEmails > 0) {
        message = `Updated ${syncData.updatedEmails} email${syncData.updatedEmails > 1 ? 's' : ''}`;
      } else {
        message = 'All emails are up to date';
      }
      
      showSuccess(message);
      setSyncStatus(message);
      
      // Refresh email list
      const response = await apiGetSharedInboxEmails(userId, searchQuery || undefined);
      setThreads(response.data || []);
      
      // Clear status after 3 seconds
      setTimeout(() => {
        setSyncStatus('');
      }, 3000);
    } catch (err: any) {
      console.error('Failed to sync emails:', err);
      showError(err.message || 'Failed to sync emails');
      setSyncStatus('Sync failed');
      setTimeout(() => {
        setSyncStatus('');
      }, 3000);
    } finally {
      setIsSyncing(false);
      setIsLoadingEmails(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'open': return 'bg-amber-100 text-amber-700';
      case 'assigned': return 'bg-blue-100 text-blue-700';
      case 'resolved': return 'bg-emerald-100 text-emerald-700';
      default: return 'bg-slate-100 text-slate-700';
    }
  };

  const handleAssign = async (assignedToUserId: string) => {
    if (!selectedThread) return;

    const sharedByUserId = currentUser?.id || JSON.parse(localStorage.getItem('user_data') || '{}').id;
    if (!sharedByUserId) {
      showError('User ID not found. Please log in again.');
      return;
    }

    try {
      await apiAssignEmail(selectedThread.id, assignedToUserId, sharedByUserId);
      showSuccess('Email assigned successfully');
      
      // Refresh email list
      const response = await apiGetSharedInboxEmails(sharedByUserId, searchQuery || undefined);
      setThreads(response.data || []);
      
      // Update selected thread
      const updatedThread = response.data?.find((t: Thread) => t.id === selectedThread.id);
      if (updatedThread) {
        setSelectedThread(updatedThread);
      }
      
      setShowAssignDropdown(false);
    } catch (err: any) {
      console.error('Failed to assign email:', err);
      showError(err.message || 'Failed to assign email');
    }
  };

  const handleToggleStar = async (emailId: string, currentStarred: boolean) => {
    try {
      await apiToggleEmailStarred(emailId, !currentStarred);
      
      // Update local state
      const updatedThreads = threads.map(t => 
        t.id === emailId ? { ...t, isStarred: !currentStarred } : t
      );
      setThreads(updatedThreads);
      
      if (selectedThread?.id === emailId) {
        setSelectedThread({ ...selectedThread, isStarred: !currentStarred });
      }
    } catch (err: any) {
      console.error('Failed to toggle star:', err);
      showError('Failed to update star status');
    }
  };

  const handleConvertAction = (type: 'deal' | 'task') => {
    // In a real app, this would route to a form or trigger an API call
    console.log(`Converting thread ${selectedThread?.id} to a ${type}`);
    setShowConvertModal(false);
    // Visual feedback
    if (selectedThread) {
      const updated = threads.map(t => t.id === selectedThread.id ? { ...t, status: 'resolved' as const } : t);
      setThreads(updated);
      setSelectedThread(null);
    }
  };

  const currentAssignee = selectedThread?.assigneeId 
    ? users.find(u => u.id === selectedThread.assigneeId) 
    : null;

  const showList = !isMobile || (isMobile && !selectedThread);
  const showDetail = !isMobile || (isMobile && selectedThread);

  return (
    <div className="h-full flex flex-col gap-4 lg:gap-6 animate-in slide-in-from-bottom-2 duration-500">
      {showList && (
        <div className="flex justify-between items-center shrink-0">
          <div>
            <h1 className="text-xl lg:text-2xl font-bold">Shared Inbox</h1>
            <p className="text-slate-500 text-xs lg:text-sm">Collaborative communication</p>
          </div>
          <div className="flex items-center gap-2">
            {!isGoogleConnected ? (
              <button 
                onClick={handleConnectGoogle}
                disabled={isConnectingGoogle}
                className="flex items-center gap-2 px-3 py-2 bg-white border border-slate-200 text-slate-600 text-xs font-bold rounded-lg hover:bg-slate-50 transition-all shadow-sm active:scale-95 disabled:opacity-50"
              >
                {isConnectingGoogle ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <RefreshCw className="w-3.5 h-3.5" />}
                {isConnectingGoogle ? 'Connecting...' : 'Connect Gmail'}
              </button>
            ) : (
              <>
                {isBackgroundSyncing ? (
                  <div className="flex items-center gap-2 px-3 py-2 bg-blue-50 border border-blue-100 text-blue-700 text-[10px] font-bold rounded-lg">
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    {syncStatus || 'Syncing...'}
                  </div>
                ) : (
                  <div className="flex items-center gap-2 px-3 py-2 bg-emerald-50 border border-emerald-100 text-emerald-700 text-[10px] font-bold rounded-lg">
                    <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></div>
                    LIVE SYNC
                  </div>
                )}
                {syncStatus && !isBackgroundSyncing && (
                  <div className="px-3 py-2 bg-slate-50 border border-slate-200 text-slate-600 text-[10px] font-medium rounded-lg">
                    {syncStatus}
                  </div>
                )}
                <button
                  onClick={handleSync}
                  disabled={isSyncing || isBackgroundSyncing}
                  className="flex items-center gap-2 px-3 py-2 bg-white border border-slate-200 text-slate-600 text-xs font-bold rounded-lg hover:bg-slate-50 transition-all shadow-sm active:scale-95 disabled:opacity-50"
                >
                  {isSyncing ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <RefreshCw className="w-3.5 h-3.5" />}
                  {isSyncing ? 'Syncing...' : 'Sync Workspace'}
                </button>
              </>
            )}
            <div className="relative hidden md:block">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input 
                type="text" 
                placeholder="Search mail..." 
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 pr-4 py-2 bg-white border border-slate-200 rounded-lg text-sm w-48 outline-none focus:ring-2 focus:ring-indigo-100"
              />
            </div>
            <button className="p-2 border border-slate-200 rounded-lg bg-white hover:bg-slate-50 transition-colors">
              <Filter className="w-4 h-4 text-slate-600" />
            </button>
          </div>
        </div>
      )}

      <div className="flex-1 bg-white border border-slate-200 rounded-xl flex overflow-hidden shadow-sm h-full">
        {/* Thread List */}
        {showList && (
          <div className={`${isMobile ? 'w-full' : 'w-1/3 border-r border-slate-200'} flex flex-col overflow-hidden h-full`}>
            <div className="overflow-y-auto flex-1">
              {isLoadingEmails ? (
                <div className="flex items-center justify-center p-8">
                  <Loader2 className="w-6 h-6 animate-spin text-indigo-600" />
                </div>
              ) : threads.length === 0 ? (
                <div className="flex flex-col items-center justify-center p-8 text-center">
                  <Mail className="w-12 h-12 text-slate-300 mb-3" />
                  <p className="text-sm text-slate-500">
                    {isGoogleConnected ? 'No emails found' : 'Connect Gmail to view emails'}
                  </p>
                </div>
              ) : (
                threads.map((thread) => (
                <div 
                  key={thread.id} 
                  onClick={() => setSelectedThread(thread)}
                  className={`p-4 border-b border-slate-100 cursor-pointer hover:bg-slate-50 transition-colors ${selectedThread?.id === thread.id && !isMobile ? 'bg-indigo-50/50' : ''}`}
                >
                  <div className="flex justify-between items-start mb-1">
                    <span className="font-semibold text-sm text-slate-900 truncate">{thread.sender}</span>
                    <span className="text-[10px] lg:text-xs text-slate-400 whitespace-nowrap">{thread.timestamp}</span>
                  </div>
                  <p className="text-sm font-medium text-slate-800 truncate mb-1">{thread.subject}</p>
                  <p className="text-xs text-slate-500 truncate mb-2">{thread.lastMessage}</p>
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className={`text-[9px] lg:text-[10px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded ${getStatusColor(thread.status)}`}>
                      {thread.status}
                    </span>
                    {thread.sharedByName && (
                      <span className="text-[9px] text-indigo-600 bg-indigo-50 px-1.5 py-0.5 rounded font-medium">
                        Shared by {thread.sharedByName}
                      </span>
                    )}
                    {thread.assigneeId && (
                      <div className="flex items-center gap-1.5 min-w-0">
                        <img 
                          src={users.find(u => u.id === thread.assigneeId)?.avatar || `https://picsum.photos/seed/${thread.assigneeId}/100/100`} 
                          className="w-4 h-4 rounded-full border border-slate-200"
                          alt=""
                        />
                        <span className="text-[10px] text-slate-400 truncate">
                          {users.find(u => u.id === thread.assigneeId)?.name}
                        </span>
                      </div>
                    )}
                  </div>
                </div>
                ))
              )}
            </div>
          </div>
        )}

        {/* Thread Detail */}
        {showDetail && (
          <div className="flex-1 flex flex-col bg-slate-50/30 overflow-hidden h-full">
            {selectedThread ? (
              <>
                <div className="p-4 lg:p-6 bg-white border-b border-slate-200 flex flex-wrap gap-4 justify-between items-center shrink-0">
                  <div className="flex items-center gap-3 lg:gap-4 flex-1">
                    {isMobile && (
                      <button onClick={() => setSelectedThread(null)} className="p-2 -ml-2 hover:bg-slate-100 rounded-lg">
                        <ChevronLeft className="w-5 h-5 text-slate-600" />
                      </button>
                    )}
                    <div className="w-8 h-8 lg:w-10 lg:h-10 bg-indigo-100 rounded-full flex items-center justify-center text-indigo-700 font-bold shrink-0">
                      {selectedThread.sender.charAt(0)}
                    </div>
                    <div className="overflow-hidden">
                      <h3 className="font-bold text-slate-900 truncate text-sm lg:text-base">{selectedThread.subject}</h3>
                      <p className="text-[10px] lg:text-xs text-slate-500 truncate">{selectedThread.sender} &lt;{selectedThread.email}&gt;</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-1 lg:gap-2 relative" ref={assignRef}>
                    <button 
                      onClick={() => handleToggleStar(selectedThread.id, selectedThread.isStarred || false)}
                      className="p-2 hover:bg-slate-100 rounded-lg transition-colors text-slate-400 hidden sm:block"
                    >
                      <Star className={`w-5 h-5 ${selectedThread.isStarred ? 'fill-yellow-400 text-yellow-400' : ''}`} />
                    </button>
                    
                    <div className="relative">
                      <button 
                        onClick={() => setShowAssignDropdown(!showAssignDropdown)}
                        className={`flex items-center gap-2 px-3 py-1.5 text-[10px] lg:text-xs font-semibold rounded-lg transition-all active:scale-95 ${
                          currentAssignee 
                            ? 'bg-slate-100 text-slate-700 hover:bg-slate-200 border border-slate-200' 
                            : 'bg-slate-900 text-white hover:bg-slate-800'
                        }`}
                      >
                        {currentAssignee ? (
                          <>
                            <img src={currentAssignee.avatar} className="w-3.5 h-3.5 rounded-full" alt="" />
                            <span className="hidden sm:inline">{currentAssignee.name}</span>
                          </>
                        ) : (
                          <>
                            <UserPlus className="w-3.5 h-3.5" />
                            <span className="hidden sm:inline">Assign</span>
                          </>
                        )}
                      </button>
                      
                      {showAssignDropdown && (
                        <div className="absolute right-0 mt-2 w-56 bg-white border border-slate-200 rounded-xl shadow-xl z-50 overflow-hidden py-1 animate-in fade-in slide-in-from-top-2 duration-200">
                          <div className="px-3 py-2 border-b border-slate-50 bg-slate-50/50">
                            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Assign to team</span>
                          </div>
                          {users.length === 0 ? (
                            <div className="px-3 py-4 text-center text-xs text-slate-400">
                              No users available
                            </div>
                          ) : (
                            users.map(user => (
                            <button
                              key={user.id}
                              onClick={() => handleAssign(user.id)}
                              className="w-full flex items-center justify-between px-3 py-2.5 hover:bg-slate-50 transition-colors text-left"
                            >
                              <div className="flex items-center gap-3">
                                <img src={user.avatar} className="w-6 h-6 rounded-full border border-slate-200" alt="" />
                                <div className="min-w-0">
                                  <p className="text-xs font-bold text-slate-900 truncate">{user.name}</p>
                                  <p className="text-[10px] text-slate-500 truncate">{user.role}</p>
                                </div>
                              </div>
                              {selectedThread.assigneeId === user.id && (
                                <Check className="w-4 h-4 text-indigo-600 shrink-0" />
                              )}
                            </button>
                            ))
                          )}
                        </div>
                      )}
                    </div>

                    <button 
                      onClick={() => setShowConvertModal(true)}
                      className="flex items-center gap-2 px-3 py-1.5 bg-indigo-600 text-white text-[10px] lg:text-xs font-semibold rounded-lg transition-all hover:bg-indigo-700 active:scale-95 shadow-sm shadow-indigo-200"
                    >
                      <ArrowRight className="w-3.5 h-3.5" />
                      <span className="hidden sm:inline">Convert</span>
                    </button>
                    <button className="p-2 hover:bg-slate-100 rounded-lg transition-colors text-slate-400">
                      <MoreVertical className="w-5 h-5" />
                    </button>
                  </div>
                </div>

                <div className="flex-1 p-4 lg:p-8 overflow-y-auto space-y-4 lg:space-y-6">
                  <div className="bg-white p-4 lg:p-6 rounded-xl border border-slate-200 shadow-sm">
                    <div className="flex justify-between items-center mb-4">
                      <span className="font-bold text-xs lg:text-sm">{emailDetails?.sender || selectedThread.sender}</span>
                      <span className="text-[10px] lg:text-xs text-slate-400">{emailDetails?.timestamp || selectedThread.timestamp}</span>
                    </div>
                    <p className="text-xs lg:text-sm text-slate-700 leading-relaxed whitespace-pre-wrap">
                      {emailDetails?.body || selectedThread.lastMessage}
                    </p>
                    {selectedThread.sharedByName && (
                      <div className="mt-4 pt-4 border-t border-slate-100">
                        <span className="text-[10px] text-slate-500 bg-slate-100 px-2 py-1 rounded">
                          Shared by {selectedThread.sharedByName}
                        </span>
                      </div>
                    )}
                  </div>
                  
                  <div className="flex justify-center">
                    <span className="text-[9px] lg:text-[10px] text-slate-400 bg-slate-100 px-3 py-1 rounded-full uppercase tracking-widest font-bold">Internal Discussion</span>
                  </div>

                  <div className="bg-indigo-50 border border-indigo-100 p-3 lg:p-4 rounded-xl">
                    <p className="text-[10px] font-bold text-indigo-700 mb-1 flex items-center gap-1">
                      <MessageSquare className="w-3 h-3" /> Sarah Chen
                    </p>
                    <p className="text-xs lg:text-sm text-indigo-900">
                      I remember this account from the logistics summit. High priority.
                    </p>
                  </div>
                </div>

                <div className="p-4 lg:p-6 bg-white border-t border-slate-200 shrink-0">
                  <div className="relative">
                    <textarea 
                      placeholder="Type your message here..."
                      className="w-full p-3 lg:p-4 bg-slate-50 border border-slate-200 rounded-xl text-xs lg:text-sm focus:ring-2 focus:ring-indigo-100 outline-none resize-none min-h-[80px]"
                    />
                    <div className="flex justify-between items-center mt-3">
                      <div className="flex gap-2">
                        <button className="p-2 hover:bg-slate-100 rounded-lg text-slate-400"><Filter className="w-4 h-4" /></button>
                        <button className="p-2 hover:bg-slate-100 rounded-lg text-slate-400"><RefreshCw className="w-4 h-4" /></button>
                      </div>
                      <div className="flex gap-2">
                        <button className="px-3 lg:px-4 py-2 text-[10px] lg:text-xs font-bold text-slate-500 hover:bg-slate-100 rounded-lg uppercase tracking-widest transition-colors">Internal Note</button>
                        <button className="px-4 lg:px-6 py-2 bg-indigo-600 text-white text-[10px] lg:text-xs font-bold rounded-lg flex items-center gap-2 shadow-md transition-all hover:bg-indigo-700">
                          <Mail className="w-3.5 h-3.5" />
                          Send Reply
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              </>
            ) : (
              <div className="flex-1 flex flex-col items-center justify-center text-slate-400 p-8 text-center bg-white/50">
                <div className="w-20 h-20 bg-slate-100 rounded-full flex items-center justify-center mb-6">
                  <Mail className="w-10 h-10 opacity-20" />
                </div>
                <h3 className="text-lg lg:text-xl font-bold text-slate-900 mb-2">No message selected</h3>
                <p className="text-xs lg:text-sm max-w-xs text-slate-500">Pick a conversation from the list to start collaborating with your team.</p>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Convert Modal Simulation */}
      {showConvertModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[60] flex items-center justify-center p-4 animate-in fade-in duration-300">
          <div className="bg-white rounded-2xl w-full max-w-xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
              <div>
                <h3 className="text-lg font-bold text-slate-900">Convert to Action</h3>
                <p className="text-xs text-slate-500 mt-0.5">Moving inquiry from {selectedThread?.sender}</p>
              </div>
              <button onClick={() => setShowConvertModal(false)} className="p-2 hover:bg-white rounded-full text-slate-400 transition-colors shadow-sm">
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-4">
              <button 
                onClick={() => handleConvertAction('deal')}
                className="flex flex-col items-center p-8 border-2 border-slate-100 rounded-2xl hover:border-indigo-500 hover:bg-indigo-50/50 transition-all text-center group"
              >
                <div className="w-14 h-14 bg-indigo-100 rounded-2xl flex items-center justify-center text-indigo-600 mb-4 group-hover:scale-110 transition-transform shadow-sm">
                  <Building2 className="w-7 h-7" />
                </div>
                <h4 className="font-bold text-slate-900 mb-1">Create New Deal</h4>
                <p className="text-xs text-slate-500">Add to the Pipeline to start quoting and negotiating.</p>
              </button>
              
              <button 
                onClick={() => handleConvertAction('task')}
                className="flex flex-col items-center p-8 border-2 border-slate-100 rounded-2xl hover:border-emerald-500 hover:bg-emerald-50/50 transition-all text-center group"
              >
                <div className="w-14 h-14 bg-emerald-100 rounded-2xl flex items-center justify-center text-emerald-600 mb-4 group-hover:scale-110 transition-transform shadow-sm">
                  <CheckSquare className="w-7 h-7" />
                </div>
                <h4 className="font-bold text-slate-900 mb-1">Add as Task</h4>
                <p className="text-xs text-slate-500">Assign to an existing project to track the request.</p>
              </button>
            </div>
            
            <div className="p-6 bg-slate-50 border-t border-slate-100 flex justify-between items-center">
              <span className="text-xs font-medium text-slate-400">The conversation will be archived in the Inbox.</span>
              <button 
                onClick={() => setShowConvertModal(false)}
                className="px-4 py-2 text-sm font-bold text-slate-600 hover:bg-white rounded-lg transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Inbox;

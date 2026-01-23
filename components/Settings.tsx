
import React, { useState, useEffect, useRef } from 'react';
import { 
  Bell, Mail, Smartphone, Shield, User, Save, Globe, 
  Link2, Calendar, RefreshCw, X, Plus, Trash2, Check,
  Mail as MailIcon, Layers, AlertCircle, ArrowRight, Loader2, Upload, Image as ImageIcon,
  Users, UserPlus, Edit2, Ban, CheckCircle2, Search, MoreVertical
} from 'lucide-react';
import { DEFAULT_NOTIFICATION_PREFERENCES } from '../constants';
import { apiUpdateUserProfile, apiMe, apiGetGoogleCalendarStatus, apiGetGoogleCalendarAuthUrl, apiDisconnectGoogleCalendar, apiGetUsers, apiCreateUser, apiUpdateUser, apiDeleteUser, apiGetExcludedDomains, apiAddExcludedDomain, apiRemoveExcludedDomain } from '../utils/api';
import { useToast } from '../contexts/ToastContext';

interface SettingsProps {
  currentUser: any;
  onUserUpdate: (user: any) => void;
}

const Settings: React.FC<SettingsProps> = ({ currentUser, onUserUpdate }) => {
  const { showSuccess, showError } = useToast();
  const [activeTab, setActiveTab] = useState<'profile' | 'notifications' | 'connections' | 'users'>('profile');
  const [preferences, setPreferences] = useState(DEFAULT_NOTIFICATION_PREFERENCES);
  const [isSyncing, setIsSyncing] = useState(false);
  const [excludedDomains, setExcludedDomains] = useState<any[]>([]);
  const [newDomain, setNewDomain] = useState('');
  const [isLoadingDomains, setIsLoadingDomains] = useState(false);
  const [isSavingDomain, setIsSavingDomain] = useState(false);
  
  // Google Calendar connection state
  const [isGoogleConnected, setIsGoogleConnected] = useState(false);
  const [googleUserEmail, setGoogleUserEmail] = useState<string | null>(null);
  const [isConnecting, setIsConnecting] = useState(false);
  const [isDisconnecting, setIsDisconnecting] = useState(false);

  // User Management state
  const [users, setUsers] = useState<any[]>([]);
  const [isLoadingUsers, setIsLoadingUsers] = useState(false);
  const [userSearchQuery, setUserSearchQuery] = useState('');
  const [isUserModalOpen, setIsUserModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<any | null>(null);
  const [userFormData, setUserFormData] = useState({ email: '', name: '', role: 'user' });
  const [isSavingUser, setIsSavingUser] = useState(false);

  // Confirmation Modal state
  const [confirmModal, setConfirmModal] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    confirmText?: string;
    cancelText?: string;
    onConfirm: () => void;
    type?: 'danger' | 'warning' | 'info';
  }>({
    isOpen: false,
    title: '',
    message: '',
    confirmText: 'Confirm',
    cancelText: 'Cancel',
    onConfirm: () => {},
    type: 'info'
  });
  
  // Profile state
  const [profileData, setProfileData] = useState({
    name: '',
    email: '',
    avatar: ''
  });
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [avatarPreview, setAvatarPreview] = useState<string>('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const togglePref = (id: string, type: 'inApp' | 'email') => {
    setPreferences(prev => prev.map(p => p.id === id ? { ...p, [type]: !p[type] } : p));
  };

  // Check Google Calendar connection status
  useEffect(() => {
    const checkGoogleConnection = async () => {
      const userId = currentUser?.id || JSON.parse(localStorage.getItem('user_data') || '{}').id;
      if (!userId) return;

      try {
        const response = await apiGetGoogleCalendarStatus(userId);
        setIsGoogleConnected(response.connected || false);
        setGoogleUserEmail(response.userEmail || null);
      } catch (err) {
        console.error('Failed to check Google Calendar connection:', err);
        setIsGoogleConnected(false);
        setGoogleUserEmail(null);
      }
    };

    if (activeTab === 'connections') {
      checkGoogleConnection();
    }
  }, [activeTab, currentUser]);

  // Handle OAuth callback (when redirected back from Google)
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const connected = urlParams.get('connected');
    const error = urlParams.get('error');

    if (connected === 'true' && activeTab === 'connections') {
      // Refresh connection status
      const userId = currentUser?.id || JSON.parse(localStorage.getItem('user_data') || '{}').id;
      if (userId) {
        apiGetGoogleCalendarStatus(userId).then(response => {
          setIsGoogleConnected(response.connected || true);
          setGoogleUserEmail(response.userEmail || null);
          showSuccess('Google Calendar connected successfully!');
        }).catch(() => {
          setIsGoogleConnected(true);
          showSuccess('Google Calendar connected successfully!');
        });
      }
      // Clean URL
      const newUrl = window.location.pathname + (window.location.search.replace(/[?&]connected=true/, '').replace(/[?&]error=[^&]*/, '') || '');
      window.history.replaceState({}, '', newUrl);
    } else if (error && activeTab === 'connections') {
      const decodedError = decodeURIComponent(error);
      console.error('Google Calendar connection error:', decodedError);
      showError(`Failed to connect Google Calendar: ${decodedError}`);
      setIsGoogleConnected(false);
      // Clean URL
      const newUrl = window.location.pathname + (window.location.search.replace(/[?&]error=[^&]*/, '') || '');
      window.history.replaceState({}, '', newUrl);
    }
  }, [activeTab, currentUser]);

  // Fetch users for user management
  const fetchUsers = async () => {
    setIsLoadingUsers(true);
    try {
      const response = await apiGetUsers(userSearchQuery || undefined);
      setUsers(response.data || []);
    } catch (err) {
      console.error('Failed to fetch users:', err);
      showError('Failed to load users');
      setUsers([]);
    } finally {
      setIsLoadingUsers(false);
    }
  };

  // Fetch users when users tab is active or search query changes
  useEffect(() => {
    if (activeTab === 'users') {
      fetchUsers();
    }
  }, [activeTab, userSearchQuery]);

  const handleSync = async () => {
    setIsSyncing(true);
    try {
      // Trigger a refresh of Google Calendar events
      // Dispatch event that Schedule page can listen to
      window.dispatchEvent(new Event('google-calendar-sync'));
      showSuccess('Syncing Google Calendar...');
      // Wait a bit to show the sync animation
      await new Promise(resolve => setTimeout(resolve, 1500));
      showSuccess('Calendar synced successfully!');
    } catch (err) {
      showError('Failed to sync calendar');
    } finally {
      setIsSyncing(false);
    }
  };

  const handleConnectGoogle = async () => {
    setIsConnecting(true);
    try {
      const userId = currentUser?.id || JSON.parse(localStorage.getItem('user_data') || '{}').id;
      if (!userId) {
        throw new Error('User ID not found. Please log in again.');
      }

      const response = await apiGetGoogleCalendarAuthUrl(userId);
      if (response.authUrl) {
        // Redirect to Google OAuth
        window.location.href = response.authUrl;
      } else {
        throw new Error('Failed to get authorization URL');
      }
    } catch (err: any) {
      console.error('Failed to connect Google Calendar:', err);
      showError(err.message || 'Failed to connect Google Calendar');
      setIsConnecting(false);
    }
  };

  const handleDisconnectGoogle = () => {
    setConfirmModal({
      isOpen: true,
      title: 'Disconnect Google Calendar',
      message: 'Are you sure you want to disconnect Google Calendar? This will stop syncing your calendar events.',
      confirmText: 'Disconnect',
      cancelText: 'Cancel',
      type: 'warning',
      onConfirm: async () => {
        setConfirmModal(prev => ({ ...prev, isOpen: false }));
        setIsDisconnecting(true);
        try {
          const userId = currentUser?.id || JSON.parse(localStorage.getItem('user_data') || '{}').id;
          if (!userId) {
            throw new Error('User ID not found. Please log in again.');
          }

          await apiDisconnectGoogleCalendar(userId);
          setIsGoogleConnected(false);
          setGoogleUserEmail(null);
          showSuccess('Google Calendar disconnected successfully');
          
          // Trigger refresh on Schedule page
          window.dispatchEvent(new Event('google-calendar-disconnected'));
        } catch (err: any) {
          console.error('Failed to disconnect Google Calendar:', err);
          showError(err.message || 'Failed to disconnect Google Calendar');
        } finally {
          setIsDisconnecting(false);
        }
      }
    });
  };

  // Fetch excluded domains
  const fetchExcludedDomains = async () => {
    const userId = currentUser?.id || JSON.parse(localStorage.getItem('user_data') || '{}').id;
    if (!userId) return;

    setIsLoadingDomains(true);
    try {
      const response = await apiGetExcludedDomains(userId);
      setExcludedDomains(response.data || []);
    } catch (err) {
      console.error('Failed to fetch excluded domains:', err);
      showError('Failed to load excluded domains');
      setExcludedDomains([]);
    } finally {
      setIsLoadingDomains(false);
    }
  };

  // Fetch domains when connections tab is active
  useEffect(() => {
    if (activeTab === 'connections') {
      fetchExcludedDomains();
    }
  }, [activeTab, currentUser]);

  const addDomain = async () => {
    if (!newDomain || !newDomain.trim()) {
      showError('Please enter a domain');
      return;
    }

    const userId = currentUser?.id || JSON.parse(localStorage.getItem('user_data') || '{}').id;
    if (!userId) {
      showError('User ID not found. Please log in again.');
      return;
    }

    setIsSavingDomain(true);
    try {
      await apiAddExcludedDomain(userId, newDomain.trim());
      showSuccess('Domain added to exclusion list');
      setNewDomain('');
      fetchExcludedDomains();
    } catch (err: any) {
      showError(err.message || 'Failed to add domain');
    } finally {
      setIsSavingDomain(false);
    }
  };

  const removeDomain = async (domainId: string) => {
    const userId = currentUser?.id || JSON.parse(localStorage.getItem('user_data') || '{}').id;
    if (!userId) {
      showError('User ID not found. Please log in again.');
      return;
    }

    try {
      await apiRemoveExcludedDomain(domainId, userId);
      showSuccess('Domain removed from exclusion list');
      fetchExcludedDomains();
    } catch (err: any) {
      showError(err.message || 'Failed to remove domain');
    }
  };

  // Initialize profile data from current user
  useEffect(() => {
    const loadUserData = async () => {
      let user = currentUser;
      
      if (!user) {
        // Try to get user from localStorage
        const storedUser = localStorage.getItem('user_data');
        if (storedUser) {
          try {
            user = JSON.parse(storedUser);
          } catch (err) {
            console.error('Failed to parse user data:', err);
          }
        }
      }
      
      if (!user) {
        // Fetch user from API
        try {
          const response = await apiMe();
          user = response.data || response;
        } catch (err) {
          console.error('Failed to fetch user:', err);
        }
      }
      
      if (user) {
        const avatarUrl = user.avatar || `https://picsum.photos/seed/${user.email}/100/100`;
        setProfileData({
          name: user.name || '',
          email: user.email || '',
          avatar: avatarUrl
        });
        setAvatarPreview(avatarUrl);
      }
    };
    
    loadUserData();
  }, [currentUser]);

  const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      // Validate file type
      if (!file.type.startsWith('image/')) {
        setError('Please select an image file');
        return;
      }
      
      // Validate file size (max 5MB)
      if (file.size > 5 * 1024 * 1024) {
        setError('Image size must be less than 5MB');
        return;
      }

      // Create preview
      const reader = new FileReader();
      reader.onloadend = () => {
        const result = reader.result as string;
        setAvatarPreview(result);
        setProfileData(prev => ({ ...prev, avatar: result }));
      };
      reader.readAsDataURL(file);
      setError(null);
    }
  };

  const handleSaveChanges = async () => {
    setError(null);
    
    // Validate name
    if (!profileData.name || profileData.name.trim() === '') {
      setError('Full name is required. Please fill in your name before saving.');
      return;
    }

    // Validate email
    if (!profileData.email || !profileData.email.includes('@')) {
      setError('Please enter a valid email address');
      return;
    }

    setIsSaving(true);
    try {
      const userId = currentUser?.id || JSON.parse(localStorage.getItem('user_data') || '{}').id;
      
      if (!userId) {
        throw new Error('User ID not found. Please log in again.');
      }

      const updateData: any = {
        name: profileData.name.trim(),
        email: profileData.email.trim()
      };

      // Include avatar if it exists (can be URL or base64 data URL)
      // Firestore can store base64 data URLs
      if (profileData.avatar) {
        // If it's a base64 data URL, compress it first to reduce size
        if (profileData.avatar.startsWith('data:')) {
          // Compress image by creating a smaller canvas version
          const compressedAvatar = await new Promise<string>((resolve, reject) => {
            const img = new Image();
            img.onload = () => {
              const canvas = document.createElement('canvas');
              const maxWidth = 200;
              const maxHeight = 200;
              let width = img.width;
              let height = img.height;
              
              // Calculate new dimensions maintaining aspect ratio
              if (width > height) {
                if (width > maxWidth) {
                  height = (height * maxWidth) / width;
                  width = maxWidth;
                }
              } else {
                if (height > maxHeight) {
                  width = (width * maxHeight) / height;
                  height = maxHeight;
                }
              }
              
              canvas.width = width;
              canvas.height = height;
              const ctx = canvas.getContext('2d');
              if (ctx) {
                ctx.drawImage(img, 0, 0, width, height);
                const compressedDataUrl = canvas.toDataURL('image/jpeg', 0.85);
                resolve(compressedDataUrl);
              } else {
                // Fallback: use original if canvas fails
                resolve(profileData.avatar);
              }
            };
            img.onerror = () => {
              // If image fails to load, use original
              resolve(profileData.avatar);
            };
            img.src = profileData.avatar;
          });
          updateData.avatar = compressedAvatar;
        } else {
          // Regular URL, use as-is
          updateData.avatar = profileData.avatar;
        }
      }

      // Save profile update
      await saveProfileUpdate(userId, updateData);
    } catch (err: any) {
      console.error('Failed to update profile:', err);
      const errorMessage = err.message || 'Failed to update profile. Please try again.';
      setError(errorMessage);
      showError(errorMessage);
    } finally {
      setIsSaving(false);
    }
  };

  const saveProfileUpdate = async (userId: string, updateData: any) => {
    try {
      console.log('[Settings] Saving profile update:', { userId, hasAvatar: !!updateData.avatar, avatarType: updateData.avatar?.substring(0, 20) });
      const response = await apiUpdateUserProfile(userId, updateData);
      const updatedUser = response.data || response;
      console.log('[Settings] Profile update response:', { ...updatedUser, avatar: updatedUser.avatar?.substring(0, 50) });
      
      // Update localStorage
      localStorage.setItem('user_data', JSON.stringify(updatedUser));
      
      // Update parent component
      if (onUserUpdate) {
        onUserUpdate(updatedUser);
      }
      
      // Update local state to reflect the saved avatar
      // Use the avatar from the response (which comes from database) or from updateData
      const savedAvatar = updatedUser.avatar || updateData.avatar;
      if (savedAvatar) {
        setAvatarPreview(savedAvatar);
        setProfileData(prev => ({ ...prev, avatar: savedAvatar }));
      }
      
      // Show success toast
      showSuccess('Profile updated successfully!');
      setError(null);
    } catch (err: any) {
      console.error('[Settings] Failed to save profile update:', err);
      throw err; // Re-throw to be caught by caller
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-8 animate-in fade-in duration-500 pb-20">
      <div className="flex justify-between items-end">
        <div>
          <h1 className="text-2xl font-bold">Settings</h1>
          <p className="text-slate-500 text-sm">Manage your personal account and workspace preferences</p>
        </div>
        {activeTab === 'profile' && (
          <button 
            onClick={handleSaveChanges}
            disabled={isSaving}
            className="px-6 py-2.5 bg-indigo-600 text-white font-bold rounded-xl flex items-center gap-2 hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-100 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isSaving ? (
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
        )}
      </div>

      <div className="flex flex-col lg:flex-row gap-8">
        {/* Sidebar Tabs */}
        <aside className="w-full lg:w-64 space-y-1">
          {[
            { id: 'profile', label: 'Profile Settings', icon: <User className="w-4 h-4" /> },
            { id: 'notifications', label: 'Notifications', icon: <Bell className="w-4 h-4" /> },
            { id: 'connections', label: 'Connections & Workspace', icon: <Link2 className="w-4 h-4" /> },
            { id: 'users', label: 'Users', icon: <Users className="w-4 h-4" /> },
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl font-semibold text-sm transition-all ${
                activeTab === tab.id 
                  ? 'bg-white text-indigo-600 shadow-sm border border-slate-200' 
                  : 'text-slate-500 hover:text-slate-900 hover:bg-slate-100'
              }`}
            >
              {tab.icon}
              {tab.label}
            </button>
          ))}
        </aside>

        {/* Content Area */}
        <div className="flex-1 space-y-6">
          {activeTab === 'profile' && (
            <div className="bg-white p-6 lg:p-8 rounded-2xl border border-slate-200 shadow-sm space-y-6 text-left">
              {error && (
                <div className="bg-red-50 border border-red-200 text-red-600 text-sm p-4 rounded-xl">
                  {error}
                </div>
              )}
              
              <div className="flex items-center gap-6 pb-6 border-b border-slate-100 text-left">
                <div className="relative">
                  <img 
                    src={avatarPreview || profileData.avatar || 'https://picsum.photos/seed/user/100/100'} 
                    alt="Avatar" 
                    className="w-20 h-20 rounded-2xl shadow-md border-2 border-white object-cover" 
                  />
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    onChange={handleAvatarChange}
                    className="hidden"
                  />
                </div>
                <div className="text-left">
                  <h3 className="font-bold text-lg text-slate-900">{profileData.name || 'User'}</h3>
                  <p className="text-slate-500 text-sm mb-3">
                    {currentUser?.role || 'User'} at Impact 24x7
                  </p>
                  <button 
                    onClick={() => fileInputRef.current?.click()}
                    className="text-xs font-bold text-indigo-600 bg-indigo-50 px-3 py-1.5 rounded-lg hover:bg-indigo-100 transition-colors uppercase tracking-widest flex items-center gap-2"
                  >
                    <Upload className="w-3 h-3" />
                    Change Avatar
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-left">
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-400 uppercase tracking-widest">
                    Full Name {!profileData.name && <span className="text-red-500">*</span>}
                  </label>
                  <input 
                    type="text" 
                    value={profileData.name}
                    onChange={(e) => {
                      setProfileData(prev => ({ ...prev, name: e.target.value }));
                      setError(null);
                    }}
                    placeholder="Enter your full name"
                    className={`w-full px-4 py-2.5 bg-slate-50 border rounded-xl text-sm focus:ring-2 focus:ring-indigo-100 outline-none transition-all ${
                      !profileData.name ? 'border-red-200' : 'border-slate-200'
                    }`}
                  />
                  {!profileData.name && (
                    <p className="text-xs text-red-500 mt-1">Full name is required</p>
                  )}
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-400 uppercase tracking-widest">Email Address</label>
                  <input 
                    type="email" 
                    value={profileData.email}
                    onChange={(e) => {
                      setProfileData(prev => ({ ...prev, email: e.target.value }));
                      setError(null);
                    }}
                    placeholder="Enter your email"
                    className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-indigo-100 outline-none transition-all"
                  />
                </div>
              </div>
            </div>
          )}

          {activeTab === 'notifications' && (
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden text-left">
              <div className="p-6 border-b border-slate-100">
                <h3 className="font-bold text-lg text-slate-900">Notification Preferences</h3>
                <p className="text-slate-500 text-sm">Control how and when you receive alerts from ImpactFlow OS.</p>
              </div>
              <div className="divide-y divide-slate-100 text-left">
                {preferences.map(pref => (
                  <div key={pref.id} className="p-6 flex items-center justify-between hover:bg-slate-50/50 transition-colors">
                    <div className="text-left">
                      <p className="font-bold text-slate-900">{pref.label}</p>
                      <p className="text-xs text-slate-500 mt-0.5">{pref.description}</p>
                    </div>
                    <div className="flex gap-8">
                      <label className="flex items-center gap-3 cursor-pointer group">
                        <input type="checkbox" checked={pref.inApp} onChange={() => togglePref(pref.id, 'inApp')} className="w-4 h-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 transition-all" />
                        <div className="flex items-center gap-2">
                          <Smartphone className={`w-3.5 h-3.5 ${pref.inApp ? 'text-indigo-600' : 'text-slate-300'}`} />
                          <span className="text-xs font-bold text-slate-600 uppercase tracking-widest">In-App</span>
                        </div>
                      </label>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {activeTab === 'connections' && (
            <div className="space-y-6 animate-in slide-in-from-right-4 duration-300">
              {/* Google Workspace & Outlook Section */}
              <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
                <div className="p-6 border-b border-slate-100 bg-slate-50/50">
                  <h3 className="font-bold text-slate-900">Workspace Integrations</h3>
                  <p className="text-xs text-slate-500 mt-1">Connect your mail and calendar services for full sync.</p>
                </div>
                
                <div className="p-6 space-y-6">
                  {/* Google Card */}
                  <div className={`flex items-center justify-between p-4 border rounded-2xl transition-colors ${
                    isGoogleConnected 
                      ? 'border-slate-100 hover:bg-slate-50' 
                      : 'border-slate-100 border-dashed'
                  }`}>
                    <div className="flex items-center gap-4">
                      <div className={`w-12 h-12 bg-white rounded-xl border flex items-center justify-center shadow-sm ${
                        isGoogleConnected ? 'border-slate-200' : 'border-slate-200 opacity-50'
                      }`}>
                        <Globe className={`w-6 h-6 ${isGoogleConnected ? 'text-blue-500' : 'text-slate-400'}`} />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <h4 className="font-bold text-slate-900">Google Workspace</h4>
                          {isGoogleConnected ? (
                          <span className="px-2 py-0.5 bg-emerald-100 text-emerald-700 text-[10px] font-bold rounded uppercase">Connected</span>
                          ) : (
                            <span className="px-2 py-0.5 bg-slate-100 text-slate-500 text-[10px] font-bold rounded uppercase">Not Connected</span>
                          )}
                        </div>
                        {isGoogleConnected ? (
                          googleUserEmail ? (
                            <p className="text-xs text-slate-500">{googleUserEmail} • Email & Calendar Sync</p>
                          ) : (
                            <p className="text-xs text-slate-500">Connected • Email & Calendar Sync</p>
                          )
                        ) : (
                          <p className="text-xs text-slate-400">Connect your Google account to sync email and calendar.</p>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      {isGoogleConnected ? (
                        <>
                       <button 
                        onClick={handleSync}
                            disabled={isSyncing}
                            className="p-2 hover:bg-white rounded-lg text-slate-400 border border-transparent hover:border-slate-200 transition-all disabled:opacity-50"
                            title="Sync Calendar"
                       >
                        <RefreshCw className={`w-4 h-4 ${isSyncing ? 'animate-spin text-indigo-600' : ''}`} />
                       </button>
                          <button 
                            onClick={handleDisconnectGoogle}
                            disabled={isDisconnecting}
                            className="text-xs font-bold text-red-500 px-3 py-1.5 hover:bg-red-50 rounded-lg transition-colors disabled:opacity-50"
                          >
                            {isDisconnecting ? 'Disconnecting...' : 'Disconnect'}
                          </button>
                        </>
                      ) : (
                        <button 
                          onClick={handleConnectGoogle}
                          disabled={isConnecting}
                          className="px-4 py-2 bg-indigo-600 text-white text-xs font-bold rounded-lg hover:bg-indigo-700 transition-all shadow-md active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          {isConnecting ? 'Connecting...' : 'Connect'}
                        </button>
                      )}
                    </div>
                  </div>

                </div>
              </div>

              {/* Email Sync Filtering */}
              <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
                <div className="p-6 border-b border-slate-100 bg-slate-50/50">
                  <div className="flex items-center gap-2">
                    <Shield className="w-4 h-4 text-indigo-600" />
                    <h3 className="font-bold text-slate-900">Email Sync Filter</h3>
                  </div>
                  <p className="text-xs text-slate-500 mt-1">Emails from these domains will never be imported into ImpactFlow OS.</p>
                </div>
                
                <div className="p-6 space-y-6">
                  <div className="flex gap-2">
                    <div className="relative flex-1">
                      <Globe className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                      <input 
                        type="text" 
                        placeholder="e.g. competitors.com or internal.com" 
                        value={newDomain}
                        onChange={(e) => setNewDomain(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && addDomain()}
                        className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-indigo-100 outline-none transition-all"
                      />
                    </div>
                    <button 
                      onClick={addDomain}
                      disabled={isSavingDomain || !newDomain.trim()}
                      className="px-4 bg-slate-900 text-white font-bold rounded-xl text-xs hover:bg-slate-800 transition-all flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {isSavingDomain ? (
                        <>
                          <Loader2 className="w-4 h-4 animate-spin" />
                          Adding...
                        </>
                      ) : (
                        <>
                          <Plus className="w-4 h-4" />
                          Exclude
                        </>
                      )}
                    </button>
                  </div>

                  <div className="space-y-2">
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-3">Excluded Domains</p>
                    {isLoadingDomains ? (
                      <div className="flex items-center gap-2 text-xs text-slate-400">
                        <Loader2 className="w-4 h-4 animate-spin" />
                        Loading domains...
                      </div>
                    ) : (
                      <div className="flex flex-wrap gap-2">
                        {excludedDomains.map((domainItem: any) => (
                          <div key={domainItem.id} className="flex items-center gap-2 px-3 py-1.5 bg-slate-100 border border-slate-200 rounded-lg group hover:border-red-200 hover:bg-red-50 transition-all">
                            <span className="text-sm font-medium text-slate-700 group-hover:text-red-700">{domainItem.domain}</span>
                            <button 
                              onClick={() => removeDomain(domainItem.id)}
                              className="p-1 hover:bg-white rounded text-slate-400 hover:text-red-500 transition-colors"
                            >
                              <X className="w-3 h-3" />
                            </button>
                          </div>
                        ))}
                        {excludedDomains.length === 0 && (
                          <p className="text-xs text-slate-400 italic">No domains excluded yet. All emails will be synced.</p>
                        )}
                      </div>
                    )}
                  </div>

                  <div className="p-4 bg-amber-50 border border-amber-100 rounded-xl flex gap-3">
                    {/* Fixed: AlertCircle is now imported */}
                    <AlertCircle className="w-5 h-5 text-amber-500 shrink-0" />
                    <p className="text-xs text-amber-800 leading-relaxed">
                      <strong>Privacy Note:</strong> Domain exclusion applies to the <strong>Shared Inbox</strong> and <strong>Timeline</strong> sync. Historical emails already synced will remain unless manually deleted.
                    </p>
                  </div>
                </div>
              </div>

              {/* Automation Hint */}
              <div className="bg-indigo-900 rounded-3xl p-8 text-white relative overflow-hidden shadow-xl shadow-indigo-100">
                <div className="relative z-10">
                  <div className="p-3 bg-white/10 rounded-2xl w-fit mb-6">
                    <RefreshCw className="w-6 h-6 text-indigo-300" />
                  </div>
                  <h3 className="text-xl font-bold mb-2">Automated Data Enrichment</h3>
                  <p className="text-indigo-200 text-sm mb-8 max-w-sm leading-relaxed">Connected workspaces allow ImpactFlow to automatically suggest LinkedIn profiles and company data based on incoming email metadata.</p>
                  <button className="px-6 py-3 bg-white text-indigo-900 text-xs font-bold rounded-xl hover:bg-indigo-50 transition-all uppercase tracking-widest flex items-center gap-2">
                    {/* Fixed: ArrowRight is now imported */}
                    Explore Intelligence <ArrowRight className="w-4 h-4" />
                  </button>
                </div>
                <div className="absolute -right-12 -bottom-12 w-64 h-64 bg-indigo-500/20 rounded-full blur-3xl" />
              </div>
            </div>
          )}

          {activeTab === 'users' && (
            <div className="space-y-6 animate-in slide-in-from-right-4 duration-300">
              {/* User Management Header */}
              <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
                <div className="p-6 border-b border-slate-100 bg-slate-50/50 flex justify-between items-center">
                  <div>
                    <h3 className="font-bold text-slate-900">User Management</h3>
                    <p className="text-xs text-slate-500 mt-1">Add, edit, and manage user accounts</p>
                  </div>
                  <button
                    onClick={() => {
                      setEditingUser(null);
                      setUserFormData({ email: '', name: '', role: 'user' });
                      setIsUserModalOpen(true);
                    }}
                    className="px-4 py-2 bg-indigo-600 text-white text-xs font-bold rounded-lg hover:bg-indigo-700 transition-all shadow-md active:scale-95 flex items-center gap-2"
                  >
                    <UserPlus className="w-4 h-4" />
                    Add User
                  </button>
                </div>

                {/* Search Bar */}
                <div className="p-4 border-b border-slate-100">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <input
                      type="text"
                      placeholder="Search users by name or email..."
                      value={userSearchQuery}
                      onChange={(e) => setUserSearchQuery(e.target.value)}
                      className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-indigo-100 outline-none transition-all"
                    />
                  </div>
                </div>

                {/* Users List */}
                <div className="divide-y divide-slate-100">
                  {isLoadingUsers ? (
                    <div className="p-8 text-center">
                      <Loader2 className="w-6 h-6 animate-spin text-indigo-600 mx-auto mb-2" />
                      <p className="text-sm text-slate-500">Loading users...</p>
                    </div>
                  ) : users.length === 0 ? (
                    <div className="p-8 text-center">
                      <Users className="w-12 h-12 text-slate-300 mx-auto mb-3" />
                      <p className="text-sm text-slate-500">No users found</p>
                    </div>
                  ) : (
                    users.map((user) => (
                      <div key={user.id} className="p-4 hover:bg-slate-50 transition-colors">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <img
                              src={user.avatar || `https://picsum.photos/seed/${user.email}/100/100`}
                              alt={user.name}
                              className="w-10 h-10 rounded-full border border-slate-200"
                            />
                            <div>
                              <div className="flex items-center gap-2">
                                <p className="font-bold text-slate-900">{user.name}</p>
                                {user.active !== false ? (
                                  <span className="px-2 py-0.5 bg-emerald-100 text-emerald-700 text-[10px] font-bold rounded uppercase">Active</span>
                                ) : (
                                  <span className="px-2 py-0.5 bg-slate-100 text-slate-500 text-[10px] font-bold rounded uppercase">Disabled</span>
                                )}
                              </div>
                              <p className="text-xs text-slate-500">{user.email}</p>
                              <p className="text-xs text-slate-400 mt-0.5">Role: {user.role || 'user'}</p>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => {
                                setEditingUser(user);
                                setUserFormData({ email: user.email, name: user.name, role: user.role || 'user' });
                                setIsUserModalOpen(true);
                              }}
                              className="p-2 hover:bg-white rounded-lg text-slate-400 border border-transparent hover:border-slate-200 transition-all"
                              title="Edit User"
                            >
                              <Edit2 className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => {
                                setConfirmModal({
                                  isOpen: true,
                                  title: user.active === false ? 'Enable User' : 'Disable User',
                                  message: `Are you sure you want to ${user.active === false ? 'enable' : 'disable'} "${user.name}"?`,
                                  confirmText: user.active === false ? 'Enable' : 'Disable',
                                  cancelText: 'Cancel',
                                  type: user.active === false ? 'info' : 'warning',
                                  onConfirm: async () => {
                                    setConfirmModal(prev => ({ ...prev, isOpen: false }));
                                    try {
                                      await apiUpdateUser(user.id, { active: user.active === false });
                                      showSuccess(`User ${user.active === false ? 'enabled' : 'disabled'} successfully`);
                                      fetchUsers();
                                    } catch (err: any) {
                                      showError(err.message || 'Failed to update user');
                                    }
                                  }
                                });
                              }}
                              className="p-2 hover:bg-white rounded-lg text-slate-400 border border-transparent hover:border-slate-200 transition-all"
                              title={user.active === false ? 'Enable User' : 'Disable User'}
                            >
                              {user.active === false ? (
                                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                              ) : (
                                <Ban className="w-4 h-4 text-red-500" />
                              )}
                            </button>
                            <button
                              onClick={() => {
                                setConfirmModal({
                                  isOpen: true,
                                  title: 'Delete User',
                                  message: `Are you sure you want to delete user "${user.name}"? This action cannot be undone.`,
                                  confirmText: 'Delete',
                                  cancelText: 'Cancel',
                                  type: 'danger',
                                  onConfirm: async () => {
                                    setConfirmModal(prev => ({ ...prev, isOpen: false }));
                                    try {
                                      await apiDeleteUser(user.id);
                                      showSuccess('User deleted successfully');
                                      fetchUsers();
                                    } catch (err: any) {
                                      showError(err.message || 'Failed to delete user');
                                    }
                                  }
                                });
                              }}
                              className="p-2 hover:bg-red-50 rounded-lg text-red-500 border border-transparent hover:border-red-200 transition-all"
                              title="Delete User"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* User Modal */}
      {isUserModalOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl max-w-md w-full p-6 space-y-4">
            <div className="flex justify-between items-center">
              <h3 className="font-bold text-lg text-slate-900">
                {editingUser ? 'Edit User' : 'Add New User'}
              </h3>
              <button
                onClick={() => setIsUserModalOpen(false)}
                className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="text-xs font-bold text-slate-400 uppercase tracking-widest block mb-2">
                  Full Name
                </label>
                <input
                  type="text"
                  value={userFormData.name}
                  onChange={(e) => setUserFormData(prev => ({ ...prev, name: e.target.value }))}
                  placeholder="Enter full name"
                  className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-indigo-100 outline-none transition-all"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-slate-400 uppercase tracking-widest block mb-2">
                  Email Address
                </label>
                <input
                  type="email"
                  value={userFormData.email}
                  onChange={(e) => setUserFormData(prev => ({ ...prev, email: e.target.value }))}
                  placeholder="Enter email address"
                  disabled={!!editingUser}
                  className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-indigo-100 outline-none transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                />
                {editingUser && (
                  <p className="text-xs text-slate-400 mt-1">Email cannot be changed</p>
                )}
              </div>

              <div>
                <label className="text-xs font-bold text-slate-400 uppercase tracking-widest block mb-2">
                  Role
                </label>
                <select
                  value={userFormData.role}
                  onChange={(e) => setUserFormData(prev => ({ ...prev, role: e.target.value }))}
                  className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-indigo-100 outline-none transition-all"
                >
                  <option value="user">User</option>
                  <option value="admin">Admin</option>
                  <option value="manager">Manager</option>
                  <option value="staff">Staff</option>
                </select>
              </div>
            </div>

            <div className="flex gap-3 pt-4">
              <button
                onClick={() => setIsUserModalOpen(false)}
                className="flex-1 px-4 py-2.5 border border-slate-200 text-slate-700 font-bold rounded-xl hover:bg-slate-50 transition-all"
              >
                Cancel
              </button>
              <button
                onClick={async () => {
                  if (!userFormData.name || !userFormData.email) {
                    showError('Name and email are required');
                    return;
                  }

                  setIsSavingUser(true);
                  try {
                    if (editingUser) {
                      await apiUpdateUser(editingUser.id, {
                        name: userFormData.name,
                        role: userFormData.role
                      });
                      showSuccess('User updated successfully');
                    } else {
                      await apiCreateUser({
                        email: userFormData.email,
                        name: userFormData.name,
                        role: userFormData.role
                      });
                      showSuccess('User created successfully. Welcome email sent!');
                    }
                    setIsUserModalOpen(false);
                    fetchUsers();
                  } catch (err: any) {
                    showError(err.message || 'Failed to save user');
                  } finally {
                    setIsSavingUser(false);
                  }
                }}
                disabled={isSavingUser}
                className="flex-1 px-4 py-2.5 bg-indigo-600 text-white font-bold rounded-xl hover:bg-indigo-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {isSavingUser ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Saving...
                  </>
                ) : (
                  editingUser ? 'Update User' : 'Create User'
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Confirmation Modal */}
      {confirmModal.isOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl max-w-md w-full p-6 space-y-4">
            <div className="flex items-start gap-4">
              {confirmModal.type === 'danger' && (
                <div className="p-3 bg-red-100 rounded-xl">
                  <AlertCircle className="w-6 h-6 text-red-600" />
                </div>
              )}
              {confirmModal.type === 'warning' && (
                <div className="p-3 bg-amber-100 rounded-xl">
                  <AlertCircle className="w-6 h-6 text-amber-600" />
                </div>
              )}
              {confirmModal.type === 'info' && (
                <div className="p-3 bg-blue-100 rounded-xl">
                  <AlertCircle className="w-6 h-6 text-blue-600" />
                </div>
              )}
              <div className="flex-1">
                <h3 className="font-bold text-lg text-slate-900 mb-2">
                  {confirmModal.title}
                </h3>
                <p className="text-sm text-slate-600 leading-relaxed">
                  {confirmModal.message}
                </p>
              </div>
            </div>

            <div className="flex gap-3 pt-4">
              <button
                onClick={() => setConfirmModal(prev => ({ ...prev, isOpen: false }))}
                className="flex-1 px-4 py-2.5 border border-slate-200 text-slate-700 font-bold rounded-xl hover:bg-slate-50 transition-all"
              >
                {confirmModal.cancelText || 'Cancel'}
              </button>
              <button
                onClick={confirmModal.onConfirm}
                className={`flex-1 px-4 py-2.5 font-bold rounded-xl transition-all ${
                  confirmModal.type === 'danger'
                    ? 'bg-red-600 text-white hover:bg-red-700'
                    : confirmModal.type === 'warning'
                    ? 'bg-amber-600 text-white hover:bg-amber-700'
                    : 'bg-indigo-600 text-white hover:bg-indigo-700'
                }`}
              >
                {confirmModal.confirmText || 'Confirm'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Settings;

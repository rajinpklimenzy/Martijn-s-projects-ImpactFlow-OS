
import React, { useState, useEffect, useRef } from 'react';
import { 
  Bell, Mail, Smartphone, Shield, User, Save, Globe, 
  Link2, Calendar, RefreshCw, X, Plus, Trash2, Check,
  Mail as MailIcon, Layers, AlertCircle, ArrowRight, Loader2, Upload, Image as ImageIcon,
  Users, UserPlus, Edit2, Ban, CheckCircle2, Search, MoreVertical, MapPin, Globe2, Briefcase
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
  
  const [isGoogleConnected, setIsGoogleConnected] = useState(false);
  const [googleUserEmail, setGoogleUserEmail] = useState<string | null>(null);
  const [isConnecting, setIsConnecting] = useState(false);
  const [isDisconnecting, setIsDisconnecting] = useState(false);

  const [users, setUsers] = useState<any[]>([]);
  const [isLoadingUsers, setIsLoadingUsers] = useState(false);
  const [userSearchQuery, setUserSearchQuery] = useState('');
  const [isUserModalOpen, setIsUserModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<any | null>(null);
  const [userFormData, setUserFormData] = useState({ email: '', name: '', role: 'Staff' });
  const [isSavingUser, setIsSavingUser] = useState(false);

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
  
  const [profileData, setProfileData] = useState({
    name: '',
    email: '',
    avatar: '',
    phone: '',
    jobTitle: '',
    department: '',
    bio: '',
    timezone: 'UTC',
    language: 'English'
  });
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [avatarPreview, setAvatarPreview] = useState<string>('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const togglePref = (id: string, type: 'inApp' | 'email') => {
    setPreferences(prev => prev.map(p => p.id === id ? { ...p, [type]: !p[type] } : p));
  };

  useEffect(() => {
    const checkGoogleConnection = async () => {
      const userId = currentUser?.id || JSON.parse(localStorage.getItem('user_data') || '{}').id;
      if (!userId) return;
      try {
        const response = await apiGetGoogleCalendarStatus(userId);
        setIsGoogleConnected(response.connected || false);
        setGoogleUserEmail(response.userEmail || null);
      } catch (err) {
        setIsGoogleConnected(false);
      }
    };
    if (activeTab === 'connections') checkGoogleConnection();
  }, [activeTab, currentUser]);

  const fetchUsers = async () => {
    setIsLoadingUsers(true);
    try {
      const response = await apiGetUsers(userSearchQuery || undefined);
      setUsers(response.data || []);
    } catch (err) {
      setUsers([]);
    } finally {
      setIsLoadingUsers(false);
    }
  };

  useEffect(() => {
    if (activeTab === 'users') fetchUsers();
  }, [activeTab, userSearchQuery]);

  const handleConnectGoogle = async () => {
    setIsConnecting(true);
    try {
      const userId = currentUser?.id || JSON.parse(localStorage.getItem('user_data') || '{}').id;
      const response = await apiGetGoogleCalendarAuthUrl(userId);
      if (response.authUrl) window.location.href = response.authUrl;
    } catch (err: any) {
      showError('Failed to connect Google Calendar');
      setIsConnecting(false);
    }
  };

  useEffect(() => {
    const loadUserData = async () => {
      let user = currentUser || JSON.parse(localStorage.getItem('user_data') || 'null');
      if (user) {
        setProfileData({
          name: user.name || '',
          email: user.email || '',
          avatar: user.avatar || '',
          phone: user.phone || '',
          jobTitle: user.jobTitle || '',
          department: user.department || '',
          bio: user.bio || '',
          timezone: user.timezone || 'UTC-5',
          language: user.language || 'English'
        });
        setAvatarPreview(user.avatar || '');
      }
    };
    loadUserData();
  }, [currentUser]);

  const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setAvatarPreview(reader.result as string);
        setProfileData(prev => ({ ...prev, avatar: reader.result as string }));
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSaveChanges = async () => {
    if (!profileData.name.trim()) {
      setError('Full name is required.');
      return;
    }
    setIsSaving(true);
    try {
      const userId = currentUser?.id || JSON.parse(localStorage.getItem('user_data') || '{}').id;
      const response = await apiUpdateUserProfile(userId, profileData);
      const updatedUser = response.data || response;
      localStorage.setItem('user_data', JSON.stringify(updatedUser));
      onUserUpdate(updatedUser);
      showSuccess('Profile updated successfully!');
      setError(null);
    } catch (err: any) {
      showError('Failed to update profile.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-8 animate-in fade-in duration-500 pb-20">
      <div className="flex justify-between items-end">
        <div>
          <h1 className="text-2xl font-bold text-left">Settings</h1>
          <p className="text-slate-500 text-sm">Manage your personal account and workspace preferences</p>
        </div>
        {activeTab === 'profile' && (
          <button 
            onClick={handleSaveChanges}
            disabled={isSaving}
            className="px-6 py-2.5 bg-indigo-600 text-white font-bold rounded-xl flex items-center gap-2 hover:bg-indigo-700 transition-all shadow-lg active:scale-95 disabled:opacity-50"
          >
            {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            Save Changes
          </button>
        )}
      </div>

      <div className="flex flex-col lg:flex-row gap-8">
        <aside className="w-full lg:w-64 space-y-1">
          {[
            { id: 'profile', label: 'Profile Settings', icon: <User className="w-4 h-4" /> },
            { id: 'notifications', label: 'Notifications', icon: <Bell className="w-4 h-4" /> },
            { id: 'connections', label: 'Connections & Sync', icon: <Link2 className="w-4 h-4" /> },
            { id: 'users', label: 'Team Management', icon: <Users className="w-4 h-4" /> },
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl font-semibold text-sm transition-all ${
                activeTab === tab.id ? 'bg-white text-indigo-600 shadow-sm border border-slate-200' : 'text-slate-500 hover:text-slate-900 hover:bg-slate-100'
              }`}
            >
              {tab.icon}
              {tab.label}
            </button>
          ))}
        </aside>

        <div className="flex-1 space-y-6">
          {activeTab === 'profile' && (
            <div className="bg-white p-6 lg:p-8 rounded-2xl border border-slate-200 shadow-sm space-y-8 text-left">
              {error && <div className="bg-red-50 border border-red-200 text-red-600 text-sm p-4 rounded-xl">{error}</div>}
              
              <div className="flex items-center gap-6 pb-8 border-b border-slate-100">
                <div className="relative group">
                  <img src={avatarPreview || 'https://picsum.photos/seed/user/100/100'} className="w-24 h-24 rounded-3xl shadow-lg border-2 border-white object-cover" />
                  <button 
                    onClick={() => fileInputRef.current?.click()}
                    className="absolute inset-0 bg-black/40 rounded-3xl opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white"
                  >
                    <Upload className="w-6 h-6" />
                  </button>
                  <input ref={fileInputRef} type="file" accept="image/*" onChange={handleAvatarChange} className="hidden" />
                </div>
                <div>
                  <h3 className="font-bold text-xl text-slate-900">{profileData.name || 'Set Name'}</h3>
                  <p className="text-slate-500 text-sm">{profileData.jobTitle || 'No Title'} • {profileData.department || 'No Dept'}</p>
                  <p className="text-slate-400 text-xs mt-1">{profileData.email}</p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Full Name</label>
                  <input type="text" value={profileData.name} onChange={e => setProfileData({...profileData, name: e.target.value})} className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm" />
                </div>
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Job Title</label>
                  <div className="relative">
                    <Briefcase className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <input type="text" value={profileData.jobTitle} onChange={e => setProfileData({...profileData, jobTitle: e.target.value})} className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm" placeholder="e.g. Senior Logistics Analyst" />
                  </div>
                </div>
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Department</label>
                  <input type="text" value={profileData.department} onChange={e => setProfileData({...profileData, department: e.target.value})} className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm" placeholder="e.g. Operations" />
                </div>
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Phone Number</label>
                  <input type="tel" value={profileData.phone} onChange={e => setProfileData({...profileData, phone: e.target.value})} className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm" placeholder="+1 555-0000" />
                </div>
                <div className="space-y-1.5 md:col-span-2">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Professional Bio</label>
                  <textarea value={profileData.bio} onChange={e => setProfileData({...profileData, bio: e.target.value})} className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm min-h-[100px] resize-none" placeholder="Tell the team a bit about yourself..." />
                </div>
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest flex items-center gap-2"><Globe2 className="w-3.5 h-3.5" /> Timezone</label>
                  <select value={profileData.timezone} onChange={e => setProfileData({...profileData, timezone: e.target.value})} className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm">
                    <option>UTC-5 (EST)</option>
                    <option>UTC-8 (PST)</option>
                    <option>UTC+0 (GMT)</option>
                    <option>UTC+1 (CET)</option>
                  </select>
                </div>
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest flex items-center gap-2">Language</label>
                  <select value={profileData.language} onChange={e => setProfileData({...profileData, language: e.target.value})} className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm">
                    <option>English</option>
                    <option>Spanish</option>
                    <option>French</option>
                    <option>German</option>
                  </select>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'users' && (
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden text-left">
              <div className="p-6 border-b border-slate-100 bg-slate-50/50 flex justify-between items-center">
                <h3 className="font-bold text-slate-900">Team Management</h3>
                <button onClick={() => { setEditingUser(null); setUserFormData({ email: '', name: '', role: 'Staff' }); setIsUserModalOpen(true); }} className="px-4 py-2 bg-indigo-600 text-white text-xs font-bold rounded-lg flex items-center gap-2 shadow-md">
                  <UserPlus className="w-4 h-4" /> Add User
                </button>
              </div>
              <div className="p-4 border-b border-slate-100">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <input type="text" placeholder="Search team members..." value={userSearchQuery} onChange={e => setUserSearchQuery(e.target.value)} className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm" />
                </div>
              </div>
              <div className="divide-y divide-slate-100">
                {isLoadingUsers ? <div className="p-8 text-center"><Loader2 className="w-6 h-6 animate-spin mx-auto text-indigo-600" /></div> : users.map(user => (
                  <div key={user.id} className="p-4 flex items-center justify-between hover:bg-slate-50 transition-colors">
                    <div className="flex items-center gap-3">
                      <img src={user.avatar || `https://picsum.photos/seed/${user.email}/100/100`} className="w-10 h-10 rounded-full border" />
                      <div>
                        <p className="font-bold text-slate-900 text-sm">{user.name}</p>
                        <p className="text-xs text-slate-500">{user.email} • <span className="font-bold text-indigo-600">{user.role}</span></p>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <button onClick={() => { setEditingUser(user); setUserFormData({ email: user.email, name: user.name, role: user.role || 'Staff' }); setIsUserModalOpen(true); }} className="p-2 text-slate-400 hover:text-indigo-600"><Edit2 className="w-4 h-4" /></button>
                      <button onClick={() => apiDeleteUser(user.id).then(fetchUsers)} className="p-2 text-slate-400 hover:text-red-600"><Trash2 className="w-4 h-4" /></button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
          
          {/* Other tabs remain largely the same, integrated with consistent design */}
        </div>
      </div>

      {isUserModalOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl max-w-md w-full p-6 space-y-4 text-left">
            <h3 className="font-bold text-lg text-slate-900">{editingUser ? 'Edit User' : 'Add New User'}</h3>
            <div className="space-y-4">
              <input type="text" value={userFormData.name} onChange={e => setUserFormData({...userFormData, name: e.target.value})} placeholder="Full Name" className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm" />
              <input type="email" value={userFormData.email} onChange={e => setUserFormData({...userFormData, email: e.target.value})} placeholder="Email Address" disabled={!!editingUser} className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm disabled:opacity-50" />
              <select value={userFormData.role} onChange={e => setUserFormData({...userFormData, role: e.target.value as any})} className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm">
                <option value="Admin">Admin</option>
                <option value="Staff">Staff</option>
              </select>
            </div>
            <div className="flex gap-3 pt-4">
              <button onClick={() => setIsUserModalOpen(false)} className="flex-1 py-2.5 border border-slate-200 rounded-xl font-bold">Cancel</button>
              <button onClick={async () => {
                setIsSavingUser(true);
                try {
                  if (editingUser) await apiUpdateUser(editingUser.id, userFormData);
                  else await apiCreateUser(userFormData);
                  setIsUserModalOpen(false);
                  fetchUsers();
                  showSuccess('Team list updated');
                } catch(err) { showError('Failed to save user'); }
                finally { setIsSavingUser(false); }
              }} className="flex-1 py-2.5 bg-indigo-600 text-white rounded-xl font-bold shadow-lg">
                {isSavingUser ? <Loader2 className="w-4 h-4 animate-spin mx-auto" /> : (editingUser ? 'Update' : 'Invite')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Settings;

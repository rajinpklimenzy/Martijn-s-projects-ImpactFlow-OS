import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  FileText, Plus, X, Upload, Calendar, Building2, User, Tag, Clock,
  CheckCircle2, AlertCircle, Loader2, Eye, Edit2, Trash2, Download,
  FileSignature, ExternalLink, Filter, Search, Cloud, FileCheck
} from 'lucide-react';
import { Contract, Company, Contact } from '../types';
import {
  apiGetContracts, apiCreateContract, apiUpdateContract, apiDeleteContract,
  apiMarkContractAsSigned, apiGetCompanies, apiGetContacts,
  apiUploadToGoogleDrive, apiCreateGoogleDocForSignature,
  apiGetContractDocumentTypes, apiCreateContractDocumentType,
  apiListGoogleDriveFiles, apiGetGoogleDriveFile, apiGetGoogleDriveAccessToken
} from '../utils/api';
import { useToast } from '../contexts/ToastContext';

interface ContractsProps {
  currentUser?: any;
}

const CONTRACT_STATUSES = [
  'Draft',
  'Pending Signature',
  'Signed',
  'Expired',
  'Terminated'
];

const Contracts: React.FC<ContractsProps> = ({ currentUser }) => {
  const { showSuccess, showError } = useToast();
  const [contracts, setContracts] = useState<Contract[]>([]);
  const [companies, setCompanies] = useState<Company[]>([]);
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [documentTypes, setDocumentTypes] = useState<Array<{ id: string; name: string }>>([]);
  const [selectedContract, setSelectedContract] = useState<Contract | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [typeFilter, setTypeFilter] = useState<string>('');
  
  // Modal states
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isProcessingFile, setIsProcessingFile] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  // Google Drive states
  const [isUploadingToGoogleDrive, setIsUploadingToGoogleDrive] = useState(false);
  const [isCreatingSignatureDoc, setIsCreatingSignatureDoc] = useState(false);
  const [isGoogleDriveConnected, setIsGoogleDriveConnected] = useState(false);
  const [isLoadingPicker, setIsLoadingPicker] = useState(false);
  
  // Document Type Management Modal
  const [isDocTypeModalOpen, setIsDocTypeModalOpen] = useState(false);
  const [newDocTypeName, setNewDocTypeName] = useState('');
  const [isAddingDocType, setIsAddingDocType] = useState(false);
  
  const [formData, setFormData] = useState({
    title: '',
    documentType: '',
    contractParty: '',
    companyId: '',
    contactId: '',
    expirationDate: '',
    renewalDate: '',
    signedDate: '',
    status: 'Draft' as Contract['status'],
    description: '',
    tags: [] as string[],
    requiresSignature: false,
    file: null as File | null,
    fileUrl: '',
    fileName: '',
    fileMimeType: '',
    fileSize: 0,
    isGoogleDriveLinked: false,
    googleDriveFileId: '',
    googleDriveWebViewLink: '',
    googleDriveDownloadLink: '',
    googleDriveIconUrl: ''
  });

  const userId = currentUser?.id || JSON.parse(localStorage.getItem('user_data') || '{}').id;

  const fetchData = useCallback(async () => {
    setIsLoading(true);
    try {
      if (!userId) {
        setContracts([]);
        setIsLoading(false);
        return;
      }

      const [contractsResponse, companiesResponse, contactsResponse, documentTypesResponse] = await Promise.all([
        apiGetContracts({ userId }),
        apiGetCompanies(),
        apiGetContacts(),
        apiGetContractDocumentTypes()
      ]);

      setContracts(contractsResponse?.data || []);
      setCompanies(companiesResponse?.data || []);
      setContacts(contactsResponse?.data || []);
      setDocumentTypes(documentTypesResponse?.data || []);
    } catch (err: any) {
      showError(err.message || 'Failed to load contracts');
    } finally {
      setIsLoading(false);
    }
  }, [userId, showError]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Check Google Drive connection status
  useEffect(() => {
    const checkGoogleDriveConnection = async () => {
      if (!userId) return;
      try {
        // Try to get access token to check connection
        await apiGetGoogleDriveAccessToken({ userId });
        setIsGoogleDriveConnected(true);
      } catch (err: any) {
        setIsGoogleDriveConnected(false);
      }
    };
    checkGoogleDriveConnection();
  }, [userId]);

  // Google Picker API is loaded via script tag in index.html
  // No need to load it manually

  const openGoogleDrivePicker = async () => {
    if (!userId) {
      showError('User not authenticated');
      return;
    }

    setIsLoadingPicker(true);
    try {
      // Get access token and API key
      let tokenResponse;
      try {
        tokenResponse = await apiGetGoogleDriveAccessToken({ userId });
      } catch (err: any) {
        // Check if it's a connection error
        if (err.message?.includes('Failed to fetch') || err.message?.includes('ERR_CONNECTION_REFUSED') || err.message?.includes('NetworkError')) {
          throw new Error('Backend server is not running. Please start the server and try again.');
        }
        throw err;
      }

      const { accessToken, apiKey } = tokenResponse?.data || {};

      if (!accessToken) {
        throw new Error('Failed to get Google Drive access token. Please ensure your Google account is connected in Settings.');
      }

      console.log('Google Picker - Access Token:', accessToken ? 'Present' : 'Missing');
      console.log('Google Picker - API Key:', apiKey ? `Present (${apiKey.substring(0, 10)}...)` : 'Not using (optional with OAuth)');
      
      // Log full response for debugging
      console.log('Full token response:', tokenResponse?.data);

      // Wait for Google Picker API to be ready
      await new Promise<void>((resolve, reject) => {
        let attempts = 0;
        const maxAttempts = 50; // 5 seconds max wait
        
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
      
      // Create picker builder
      // Note: setDeveloperKey is NOT needed when using OAuth tokens
      // OAuth tokens provide full authentication for Google Picker API
      const picker = new googlePicker.PickerBuilder()
        .setOAuthToken(accessToken)
        .setCallback((data: any) => {
          setIsLoadingPicker(false);
          
          try {
            console.log('Google Picker Callback - Full response data:', JSON.stringify(data, null, 2));
            console.log('Google Picker Response Action:', data[googlePicker.Response.ACTION]);
            console.log('Google Picker Action Constants:', {
              PICKED: googlePicker.Action.PICKED,
              CANCEL: googlePicker.Action.CANCEL
            });
            
            if (data[googlePicker.Response.ACTION] === googlePicker.Action.PICKED) {
              const documents = data[googlePicker.Response.DOCUMENTS];
              console.log('Google Picker - Documents array:', documents);
              console.log('Google Picker - Number of documents:', documents?.length);
              
              if (documents && documents.length > 0) {
                const file = documents[0];
                console.log('Google Picker - Selected file data:', JSON.stringify(file, null, 2));
                console.log('Google Picker - File ID:', file.id);
                console.log('Google Picker - File Name:', file.name);
                console.log('Google Picker - File MIME Type:', file.mimeType);
                console.log('Google Picker - File URL:', file.url);
                console.log('Google Picker - File Service ID:', file.serviceId);
                handleGoogleDriveFileSelected(file);
              } else {
                console.error('Google Picker - No documents in response');
                showError('No file selected');
              }
            } else if (data[googlePicker.Response.ACTION] === googlePicker.Action.CANCEL) {
              // User cancelled - do nothing
            } else {
              // Handle other actions or errors
              const error = data[googlePicker.Response.ERROR];
              if (error) {
                console.error('Google Picker Error:', error);
                console.error('Error details:', JSON.stringify(data, null, 2));
                
                if (error === googlePicker.ResponseError.ACCESS_DENIED) {
                  showError('Access denied. Please reconnect your Google account in Settings.');
                } else if (error === googlePicker.ResponseError.INVALID_CREDENTIALS) {
                  showError('Invalid credentials. Please reconnect your Google account.');
                } else if (error === googlePicker.ResponseError.INVALID_DEVELOPER_KEY) {
                  // This shouldn't happen since we're not using developer key
                  showError('Google Picker configuration error. Please try again.');
                } else {
                  showError(`Google Picker error: ${error}. Check browser console for details.`);
                }
              }
            }
          } catch (err: any) {
            console.error('Error handling picker callback:', err);
            showError('Failed to process selected file');
          }
        })
        .addView(googlePicker.ViewId.DOCS)
        .enableFeature(googlePicker.Feature.NAV_HIDDEN)
        .setSize(1051, 650)
        .build();
      
      picker.setVisible(true);
    } catch (err: any) {
      setIsLoadingPicker(false);
      console.error('Google Drive Picker Error:', err);
      
      if (err.message?.includes('Backend server is not running')) {
        showError('Backend server is not running. Please start the server on port 8050 and try again.');
      } else if (err.message?.includes('not connected') || err.message?.includes('GOOGLE_NOT_CONNECTED')) {
        showError('Google Drive not connected. Please connect your Google account in Settings.');
      } else if (err.message?.includes('Failed to fetch') || err.message?.includes('ERR_CONNECTION_REFUSED')) {
        showError('Cannot connect to server. Please ensure the backend server is running on port 8050.');
      } else {
        showError(err.message || 'Failed to open Google Drive picker. Please check your connection and try again.');
      }
    }
  };

  const handleGoogleDriveFileSelected = async (file: any) => {
    if (!userId) return;

    console.log('handleGoogleDriveFileSelected called with file:', JSON.stringify(file, null, 2));
    console.log('File data from Google Picker:', {
      id: file.id,
      name: file.name,
      url: file.url,
      iconUrl: file.iconUrl,
      mimeType: file.mimeType,
      serviceId: file.serviceId,
      type: file.type,
      sizeBytes: file.sizeBytes
    });

    try {
      // Use data directly from Google Picker response
      // The picker already provides the public URL and icon URL
      const publicUrl = file.url || file.embedUrl || '';
      const iconUrl = file.iconUrl || '';
      const fileSize = file.sizeBytes ? parseInt(file.sizeBytes) : 0;

      console.log('Storing file data:', {
        googleDriveFileId: file.id,
        publicUrl,
        iconUrl,
        fileName: file.name,
        fileMimeType: file.mimeType
      });

      setFormData(prev => ({
        ...prev,
        isGoogleDriveLinked: true,
        googleDriveFileId: file.id,
        googleDriveWebViewLink: publicUrl,
        googleDriveDownloadLink: publicUrl,
        googleDriveIconUrl: iconUrl,
        fileName: file.name || 'Untitled',
        fileMimeType: file.mimeType || '',
        fileSize: fileSize,
        fileUrl: publicUrl, // Store public accessible URL from Google Picker
        file: null
      }));

      showSuccess('File attached from Google Drive');
    } catch (err: any) {
      console.error('Error handling Google Drive file selection:', err);
      showError(err.message || 'Failed to attach file from Google Drive');
    }
  };

  const handleAddDocumentType = async () => {
    if (!newDocTypeName.trim()) return;

    setIsAddingDocType(true);
    try {
      const response = await apiCreateContractDocumentType({ name: newDocTypeName.trim() });
      if (response?.data) {
        const newDocType = response.data;
        setDocumentTypes(prev => [...prev, newDocType]);
        setNewDocTypeName('');
        showSuccess('Document type added successfully');
      }
    } catch (err: any) {
      if (err.message?.includes('already exists') || err.message?.includes('TYPE_EXISTS')) {
        showError('Document type with this name already exists');
      } else {
        showError(err.message || 'Failed to add document type');
      }
    } finally {
      setIsAddingDocType(false);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file size (max 10MB)
    if (file.size > 10 * 1024 * 1024) {
      showError('File size must be less than 10MB');
      return;
    }

    setIsProcessingFile(true);
    const reader = new FileReader();
    
    reader.onload = () => {
      const base64 = reader.result as string;
      setFormData(prev => ({
        ...prev,
        file,
        fileUrl: base64,
        fileName: file.name,
        fileMimeType: file.type,
        fileSize: file.size
      }));
      setIsProcessingFile(false);
    };

    reader.onerror = () => {
      showError('Failed to read file');
      setIsProcessingFile(false);
    };

    reader.readAsDataURL(file);
  };

  const handleUploadToGoogleDrive = async () => {
    if (!formData.fileUrl || !userId) {
      showError('Please select a file first');
      return;
    }

    setIsUploadingToGoogleDrive(true);
    try {
      const response = await apiUploadToGoogleDrive({
        fileName: formData.fileName,
        fileContent: formData.fileUrl,
        fileMimeType: formData.fileMimeType,
        userId
      });

      setFormData(prev => ({
        ...prev,
        isGoogleDriveLinked: true,
        googleDriveFileId: response.data.id,
        googleDriveWebViewLink: response.data.webViewLink,
        googleDriveDownloadLink: response.data.webContentLink
      }));

      showSuccess('File uploaded to Google Drive successfully');
    } catch (err: any) {
      showError(err.message || 'Failed to upload to Google Drive');
    } finally {
      setIsUploadingToGoogleDrive(false);
    }
  };

  const handleCreateSignatureDoc = async (contractId: string, title: string) => {
    setIsCreatingSignatureDoc(true);
    try {
      const response = await apiCreateGoogleDocForSignature({
        contractId,
        userId,
        title
      });

      showSuccess('Signature document created in Google Docs');
      fetchData();
      
      // Open the document in a new tab
      window.open(response.data.documentLink, '_blank');
    } catch (err: any) {
      showError(err.message || 'Failed to create signature document');
    } finally {
      setIsCreatingSignatureDoc(false);
    }
  };

  const handleCreateContract = async () => {
    if (!formData.title || !formData.documentType || !formData.contractParty) {
      showError('Please fill in all required fields');
      return;
    }

    setIsSubmitting(true);
    try {
      await apiCreateContract({
        title: formData.title,
        documentType: formData.documentType,
        contractParty: formData.contractParty,
        companyId: formData.companyId || null,
        contactId: formData.contactId || null,
        expirationDate: formData.expirationDate || null,
        renewalDate: formData.renewalDate || null,
        signedDate: formData.signedDate || null,
        status: formData.status,
        description: formData.description || null,
        tags: formData.tags,
        requiresSignature: formData.requiresSignature,
        signatureStatus: formData.requiresSignature ? 'Pending' : 'Not Required',
        fileUrl: formData.fileUrl || null,
        fileName: formData.fileName || null,
        fileMimeType: formData.fileMimeType || null,
        fileSize: formData.fileSize || null,
        isGoogleDriveLinked: formData.isGoogleDriveLinked,
        googleDriveFileId: formData.googleDriveFileId || null,
        googleDriveWebViewLink: formData.googleDriveWebViewLink || null,
        googleDriveDownloadLink: formData.googleDriveDownloadLink || null,
        googleDriveIconUrl: formData.googleDriveIconUrl || null,
        userId
      });

      showSuccess('Contract created successfully');
      setIsCreateModalOpen(false);
      resetForm();
      fetchData();
    } catch (err: any) {
      showError(err.message || 'Failed to create contract');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleUpdateContract = async () => {
    if (!selectedContract) return;

    setIsSubmitting(true);
    try {
      await apiUpdateContract(selectedContract.id, {
        title: formData.title,
        documentType: formData.documentType,
        contractParty: formData.contractParty,
        companyId: formData.companyId || null,
        contactId: formData.contactId || null,
        expirationDate: formData.expirationDate || null,
        renewalDate: formData.renewalDate || null,
        signedDate: formData.signedDate || null,
        status: formData.status,
        description: formData.description || null,
        tags: formData.tags,
        requiresSignature: formData.requiresSignature,
        fileUrl: formData.fileUrl || null,
        fileName: formData.fileName || null,
        fileMimeType: formData.fileMimeType || null,
        fileSize: formData.fileSize || null,
        isGoogleDriveLinked: formData.isGoogleDriveLinked,
        googleDriveFileId: formData.googleDriveFileId || null,
        googleDriveWebViewLink: formData.googleDriveWebViewLink || null,
        googleDriveDownloadLink: formData.googleDriveDownloadLink || null,
        googleDriveIconUrl: formData.googleDriveIconUrl || null
      });

      showSuccess('Contract updated successfully');
      setIsEditModalOpen(false);
      setSelectedContract(null);
      resetForm();
      fetchData();
    } catch (err: any) {
      showError(err.message || 'Failed to update contract');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteContract = async () => {
    if (!selectedContract) return;

    setIsDeleting(true);
    try {
      await apiDeleteContract(selectedContract.id);
      showSuccess('Contract deleted successfully');
      setIsDeleteConfirmOpen(false);
      setSelectedContract(null);
      fetchData();
    } catch (err: any) {
      showError(err.message || 'Failed to delete contract');
    } finally {
      setIsDeleting(false);
    }
  };

  const handleMarkAsSigned = async (contract: Contract) => {
    try {
      await apiMarkContractAsSigned(contract.id, {
        signedBy: userId,
        signedDate: new Date().toISOString()
      });
      showSuccess('Contract marked as signed');
      fetchData();
    } catch (err: any) {
      showError(err.message || 'Failed to mark contract as signed');
    }
  };

  const resetForm = () => {
    setFormData({
      title: '',
      documentType: '',
      contractParty: '',
      companyId: '',
      contactId: '',
      expirationDate: '',
      renewalDate: '',
      signedDate: '',
      status: 'Draft',
      description: '',
      tags: [],
      requiresSignature: false,
      file: null,
      fileUrl: '',
      fileName: '',
      fileMimeType: '',
      fileSize: 0,
      isGoogleDriveLinked: false,
      googleDriveFileId: '',
      googleDriveWebViewLink: '',
      googleDriveDownloadLink: '',
      googleDriveIconUrl: ''
    });
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const openEditModal = (contract: Contract) => {
    setSelectedContract(contract);
    setFormData({
      title: contract.title,
      documentType: contract.documentType,
      contractParty: contract.contractParty,
      companyId: contract.companyId || '',
      contactId: contract.contactId || '',
      expirationDate: contract.expirationDate || '',
      renewalDate: contract.renewalDate || '',
      signedDate: contract.signedDate || '',
      status: contract.status,
      description: contract.description || '',
      tags: contract.tags || [],
      requiresSignature: contract.requiresSignature,
      file: null,
      fileUrl: contract.fileUrl || '',
      fileName: contract.fileName || '',
      fileMimeType: contract.fileMimeType || '',
      fileSize: contract.fileSize || 0,
      isGoogleDriveLinked: contract.isGoogleDriveLinked,
      googleDriveFileId: contract.googleDriveFileId || '',
      googleDriveWebViewLink: contract.googleDriveWebViewLink || '',
      googleDriveDownloadLink: contract.googleDriveDownloadLink || '',
      googleDriveIconUrl: (contract as any).googleDriveIconUrl || ''
    });
    setIsEditModalOpen(true);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Signed': return 'bg-emerald-50 text-emerald-600 border-emerald-200';
      case 'Pending Signature': return 'bg-amber-50 text-amber-600 border-amber-200';
      case 'Draft': return 'bg-slate-50 text-slate-600 border-slate-200';
      case 'Expired': return 'bg-red-50 text-red-600 border-red-200';
      case 'Terminated': return 'bg-gray-50 text-gray-600 border-gray-200';
      default: return 'bg-slate-50 text-slate-600 border-slate-200';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'Signed': return <CheckCircle2 className="w-4 h-4" />;
      case 'Pending Signature': return <Clock className="w-4 h-4" />;
      case 'Draft': return <FileText className="w-4 h-4" />;
      case 'Expired': return <AlertCircle className="w-4 h-4" />;
      case 'Terminated': return <X className="w-4 h-4" />;
      default: return <FileText className="w-4 h-4" />;
    }
  };

  const filteredContracts = contracts.filter(contract => {
    const matchesSearch = contract.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         contract.contractParty.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         contract.documentType.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = !statusFilter || contract.status === statusFilter;
    const matchesType = !typeFilter || contract.documentType === typeFilter;
    return matchesSearch && matchesStatus && matchesType;
  });

  const stats = {
    total: contracts.length,
    signed: contracts.filter(c => c.status === 'Signed').length,
    pending: contracts.filter(c => c.status === 'Pending Signature').length,
    expired: contracts.filter(c => c.status === 'Expired').length
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500 pb-10">
      {/* Header */}
      <div className="flex justify-between items-start">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Contracts & Legal Documents</h1>
          <p className="text-slate-500 text-sm font-medium mt-1">Manage contracts with e-signature and Google Drive integration</p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => setIsDocTypeModalOpen(true)}
            className="px-4 py-2 bg-white text-indigo-600 text-sm font-bold rounded-xl flex items-center gap-2 hover:bg-indigo-50 border-2 border-indigo-200 transition-all active:scale-95"
          >
            <Tag className="w-4 h-4" /> Manage Document Types
          </button>
          <button
            onClick={() => {
              resetForm();
              setIsCreateModalOpen(true);
            }}
            className="px-4 py-2 bg-indigo-600 text-white text-sm font-bold rounded-xl flex items-center gap-2 hover:bg-indigo-700 shadow-lg transition-all active:scale-95"
          >
            <Plus className="w-4 h-4" /> Add Contract
          </button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
          <div className="flex items-center gap-3 mb-2">
            <FileText className="w-5 h-5 text-indigo-600" />
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Total</p>
          </div>
          <h3 className="text-2xl font-black text-slate-900">{stats.total}</h3>
        </div>
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
          <div className="flex items-center gap-3 mb-2">
            <CheckCircle2 className="w-5 h-5 text-emerald-600" />
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Signed</p>
          </div>
          <h3 className="text-2xl font-black text-emerald-600">{stats.signed}</h3>
        </div>
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
          <div className="flex items-center gap-3 mb-2">
            <Clock className="w-5 h-5 text-amber-600" />
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Pending</p>
          </div>
          <h3 className="text-2xl font-black text-amber-600">{stats.pending}</h3>
        </div>
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
          <div className="flex items-center gap-3 mb-2">
            <AlertCircle className="w-5 h-5 text-red-600" />
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Expired</p>
          </div>
          <h3 className="text-2xl font-black text-red-600">{stats.expired}</h3>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search contracts..."
              className="w-full pl-11 pr-4 py-3 border border-slate-200 rounded-xl text-sm font-medium outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-4 py-3 border border-slate-200 rounded-xl text-sm font-bold text-slate-900 outline-none focus:ring-2 focus:ring-indigo-500"
          >
            <option value="">All Statuses</option>
            {CONTRACT_STATUSES.map(status => (
              <option key={status} value={status}>{status}</option>
            ))}
          </select>
          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
            className="px-4 py-3 border border-slate-200 rounded-xl text-sm font-bold text-slate-900 outline-none focus:ring-2 focus:ring-indigo-500"
          >
            <option value="">All Types</option>
            {documentTypes.map(type => (
              <option key={type.id} value={type.name}>{type.name}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Contracts List */}
      {isLoading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-8 h-8 text-indigo-600 animate-spin" />
        </div>
      ) : filteredContracts.length === 0 ? (
        <div className="bg-slate-50 border border-slate-200 rounded-2xl p-12 text-center">
          <FileText className="w-16 h-16 text-slate-300 mx-auto mb-4" />
          <h3 className="text-lg font-bold text-slate-900 mb-2">No contracts found</h3>
          <p className="text-sm text-slate-500 mb-6">
            {searchQuery || statusFilter || typeFilter
              ? 'Try adjusting your filters'
              : 'Create your first contract to get started'}
          </p>
          {!searchQuery && !statusFilter && !typeFilter && (
            <button
              onClick={() => {
                resetForm();
                setIsCreateModalOpen(true);
              }}
              className="px-6 py-3 bg-indigo-600 text-white font-bold text-sm uppercase tracking-widest rounded-xl hover:bg-indigo-700 shadow-lg transition-all flex items-center gap-2 mx-auto"
            >
              <Plus className="w-4 h-4" /> Add Contract
            </button>
          )}
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="divide-y divide-slate-100">
            {filteredContracts.map((contract) => (
              <div
                key={contract.id}
                className="p-6 hover:bg-slate-50 transition-colors cursor-pointer"
                onClick={() => setSelectedContract(contract)}
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <h3 className="text-base font-black text-slate-900">{contract.title}</h3>
                      <span className={`px-2 py-1 text-xs font-black uppercase rounded-lg border ${getStatusColor(contract.status)} flex items-center gap-1`}>
                        {getStatusIcon(contract.status)}
                        {contract.status}
                      </span>
                      {contract.isGoogleDriveLinked && (
                        <span className="px-2 py-1 bg-blue-50 text-blue-600 text-xs font-black uppercase rounded-lg border border-blue-200 flex items-center gap-1">
                          {(contract as any).googleDriveIconUrl ? (
                            <img 
                              src={(contract as any).googleDriveIconUrl} 
                              alt="File type" 
                              className="w-3 h-3"
                              onError={(e) => {
                                // Fallback to Cloud icon if image fails to load
                                (e.target as HTMLImageElement).style.display = 'none';
                              }}
                            />
                          ) : (
                            <Cloud className="w-3 h-3" />
                          )}
                          Drive
                        </span>
                      )}
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-3 mt-3">
                      <div className="flex items-center gap-2 text-sm text-slate-600">
                        <Tag className="w-4 h-4 text-slate-400" />
                        <span className="font-medium">{contract.documentType}</span>
                      </div>
                      <div className="flex items-center gap-2 text-sm text-slate-600">
                        <User className="w-4 h-4 text-slate-400" />
                        <span className="font-medium">{contract.contractParty}</span>
                      </div>
                      {contract.expirationDate && (
                        <div className="flex items-center gap-2 text-sm text-slate-600">
                          <Calendar className="w-4 h-4 text-slate-400" />
                          <span className="font-medium">Expires: {new Date(contract.expirationDate).toLocaleDateString()}</span>
                        </div>
                      )}
                      {contract.requiresSignature && (
                        <div className="flex items-center gap-2 text-sm text-amber-600">
                          <FileSignature className="w-4 h-4" />
                          <span className="font-bold">{contract.signatureStatus}</span>
                        </div>
                      )}
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-2">
                    {contract.googleDriveWebViewLink && (
                      <a
                        href={contract.googleDriveWebViewLink}
                        target="_blank"
                        rel="noopener noreferrer"
                        onClick={(e) => e.stopPropagation()}
                        className="p-2 hover:bg-blue-50 rounded-lg text-blue-600 transition-all"
                        title="View in Google Drive"
                      >
                        <ExternalLink className="w-4 h-4" />
                      </a>
                    )}
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        openEditModal(contract);
                      }}
                      className="p-2 hover:bg-indigo-50 rounded-lg text-indigo-600 transition-all"
                    >
                      <Edit2 className="w-4 h-4" />
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedContract(contract);
                        setIsDeleteConfirmOpen(true);
                      }}
                      className="p-2 hover:bg-red-50 rounded-lg text-red-600 transition-all"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Create/Edit Modal */}
      {(isCreateModalOpen || isEditModalOpen) && (
        <div className="fixed inset-0 z-[120] overflow-hidden pointer-events-none">
          <div
            className="absolute inset-0 bg-slate-900/60 backdrop-blur-md pointer-events-auto animate-in fade-in duration-300"
            onClick={() => {
              setIsCreateModalOpen(false);
              setIsEditModalOpen(false);
              resetForm();
            }}
          />
          <div className="absolute inset-0 flex items-center justify-center p-4 pointer-events-none">
            <div className="bg-white rounded-[32px] shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-hidden pointer-events-auto animate-in zoom-in-95 duration-300 flex flex-col">
              {/* Header */}
              <div className="p-8 border-b border-slate-100 bg-gradient-to-r from-indigo-50 to-purple-50">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="w-14 h-14 rounded-2xl bg-indigo-600 flex items-center justify-center text-white shadow-lg">
                      <FileText className="w-7 h-7" />
                    </div>
                    <div>
                      <h2 className="text-2xl font-black text-slate-900">
                        {isCreateModalOpen ? 'Add Contract' : 'Edit Contract'}
                      </h2>
                      <p className="text-sm text-slate-500 font-medium mt-0.5">
                        {isCreateModalOpen ? 'Create a new contract with metadata and documents' : 'Update contract details'}
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={() => {
                      setIsCreateModalOpen(false);
                      setIsEditModalOpen(false);
                      resetForm();
                    }}
                    className="p-2 hover:bg-white rounded-full text-slate-400 hover:text-slate-600 transition-all"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>
              </div>

              {/* Content - Scrollable */}
              <div className="flex-1 overflow-y-auto p-8 custom-scrollbar">
                <div className="space-y-6">
                  {/* Basic Info */}
                  <div className="grid grid-cols-2 gap-6">
                    <div className="col-span-2">
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 block">
                        Contract Title <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        value={formData.title}
                        onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
                        className="w-full px-4 py-3 bg-white border-2 border-slate-200 rounded-xl text-sm font-bold text-slate-900 outline-none focus:ring-4 focus:ring-indigo-100 focus:border-indigo-300"
                        placeholder="e.g., Service Agreement with Acme Corp"
                      />
                    </div>

                    <div>
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 block">
                        Document Type <span className="text-red-500">*</span>
                      </label>
                      <select
                        value={formData.documentType}
                        onChange={(e) => setFormData(prev => ({ ...prev, documentType: e.target.value }))}
                        className="w-full px-4 py-3 bg-white border-2 border-slate-200 rounded-xl text-sm font-bold text-slate-900 outline-none focus:ring-4 focus:ring-indigo-100 focus:border-indigo-300"
                      >
                        <option value="">Select type</option>
                        {documentTypes.map(type => (
                          <option key={type.id} value={type.name}>{type.name}</option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 block">
                        Contract Party <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        value={formData.contractParty}
                        onChange={(e) => setFormData(prev => ({ ...prev, contractParty: e.target.value }))}
                        className="w-full px-4 py-3 bg-white border-2 border-slate-200 rounded-xl text-sm font-bold text-slate-900 outline-none focus:ring-4 focus:ring-indigo-100 focus:border-indigo-300"
                        placeholder="Other party name"
                      />
                    </div>

                    <div>
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 block">
                        Link to Company
                      </label>
                      <select
                        value={formData.companyId}
                        onChange={(e) => setFormData(prev => ({ ...prev, companyId: e.target.value }))}
                        className="w-full px-4 py-3 bg-white border-2 border-slate-200 rounded-xl text-sm font-bold text-slate-900 outline-none focus:ring-4 focus:ring-indigo-100 focus:border-indigo-300"
                      >
                        <option value="">None</option>
                        {companies.map(company => (
                          <option key={company.id} value={company.id}>{company.name}</option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 block">
                        Link to Contact
                      </label>
                      <select
                        value={formData.contactId}
                        onChange={(e) => setFormData(prev => ({ ...prev, contactId: e.target.value }))}
                        className="w-full px-4 py-3 bg-white border-2 border-slate-200 rounded-xl text-sm font-bold text-slate-900 outline-none focus:ring-4 focus:ring-indigo-100 focus:border-indigo-300"
                      >
                        <option value="">None</option>
                        {contacts.map(contact => (
                          <option key={contact.id} value={contact.id}>{contact.name}</option>
                        ))}
                      </select>
                    </div>
                  </div>

                  {/* Dates */}
                  <div className="grid grid-cols-3 gap-6">
                    <div>
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 block">
                        Expiration Date
                      </label>
                      <input
                        type="date"
                        value={formData.expirationDate}
                        onChange={(e) => setFormData(prev => ({ ...prev, expirationDate: e.target.value }))}
                        className="w-full px-4 py-3 bg-white border-2 border-slate-200 rounded-xl text-sm font-bold text-slate-900 outline-none focus:ring-4 focus:ring-indigo-100 focus:border-indigo-300"
                      />
                    </div>

                    <div>
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 block">
                        Renewal Date
                      </label>
                      <input
                        type="date"
                        value={formData.renewalDate}
                        onChange={(e) => setFormData(prev => ({ ...prev, renewalDate: e.target.value }))}
                        className="w-full px-4 py-3 bg-white border-2 border-slate-200 rounded-xl text-sm font-bold text-slate-900 outline-none focus:ring-4 focus:ring-indigo-100 focus:border-indigo-300"
                      />
                    </div>

                    <div>
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 block">
                        Signed Date
                      </label>
                      <input
                        type="date"
                        value={formData.signedDate}
                        onChange={(e) => setFormData(prev => ({ ...prev, signedDate: e.target.value }))}
                        className="w-full px-4 py-3 bg-white border-2 border-slate-200 rounded-xl text-sm font-bold text-slate-900 outline-none focus:ring-4 focus:ring-indigo-100 focus:border-indigo-300"
                      />
                    </div>
                  </div>

                  {/* Status */}
                  <div className="grid grid-cols-2 gap-6">
                    <div>
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 block">
                        Status
                      </label>
                      <select
                        value={formData.status}
                        onChange={(e) => setFormData(prev => ({ ...prev, status: e.target.value as Contract['status'] }))}
                        className="w-full px-4 py-3 bg-white border-2 border-slate-200 rounded-xl text-sm font-bold text-slate-900 outline-none focus:ring-4 focus:ring-indigo-100 focus:border-indigo-300"
                      >
                        {CONTRACT_STATUSES.map(status => (
                          <option key={status} value={status}>{status}</option>
                        ))}
                      </select>
                    </div>

                    <div className="flex items-end">
                      <label className="flex items-center gap-3 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={formData.requiresSignature}
                          onChange={(e) => setFormData(prev => ({ ...prev, requiresSignature: e.target.checked }))}
                          className="w-5 h-5 rounded border-2 border-slate-300 text-indigo-600 focus:ring-2 focus:ring-indigo-500"
                        />
                        <span className="text-sm font-bold text-slate-900">Requires E-Signature</span>
                      </label>
                    </div>
                  </div>

                  {/* Description */}
                  <div>
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 block">
                      Description
                    </label>
                    <textarea
                      value={formData.description}
                      onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                      rows={3}
                      className="w-full px-4 py-3 bg-white border-2 border-slate-200 rounded-xl text-sm font-medium text-slate-900 outline-none focus:ring-4 focus:ring-indigo-100 focus:border-indigo-300 resize-none"
                      placeholder="Add notes or description..."
                    />
                  </div>

                  {/* File Upload */}
                  {(isCreateModalOpen || isEditModalOpen) && (
                    <div className="border-2 border-dashed border-slate-200 rounded-xl p-6">
                      <h3 className="text-sm font-black text-slate-900 mb-4 flex items-center gap-2">
                        <Upload className="w-4 h-4 text-indigo-600" /> Document Upload
                      </h3>
                      
                      <input
                        ref={fileInputRef}
                        type="file"
                        onChange={handleFileSelect}
                        className="hidden"
                        accept=".pdf,.doc,.docx,.txt"
                      />

                      {!formData.fileUrl && !formData.isGoogleDriveLinked ? (
                        <div className="space-y-3">
                          <button
                            onClick={() => fileInputRef.current?.click()}
                            disabled={isProcessingFile}
                            className="w-full py-4 border-2 border-slate-200 rounded-xl hover:border-indigo-300 hover:bg-indigo-50 transition-all flex items-center justify-center gap-2 text-sm font-bold text-slate-600"
                          >
                            {isProcessingFile ? (
                              <>
                                <Loader2 className="w-4 h-4 animate-spin" />
                                Processing...
                              </>
                            ) : (
                              <>
                                <Upload className="w-4 h-4" />
                                Choose File
                              </>
                            )}
                          </button>
                          
                          <div className="flex items-center gap-2">
                            <div className="flex-1 h-px bg-slate-200"></div>
                            <span className="text-xs text-slate-400 font-bold uppercase">OR</span>
                            <div className="flex-1 h-px bg-slate-200"></div>
                          </div>

                          <button
                            onClick={openGoogleDrivePicker}
                            disabled={!isGoogleDriveConnected || isLoadingPicker}
                            className="w-full py-4 border-2 border-slate-200 rounded-xl hover:border-indigo-300 hover:bg-indigo-50 transition-all flex items-center justify-center gap-2 text-sm font-bold text-slate-600 disabled:opacity-50 disabled:cursor-not-allowed"
                          >
                            {isLoadingPicker ? (
                              <>
                                <Loader2 className="w-4 h-4 animate-spin" />
                                Opening Google Drive...
                              </>
                            ) : (
                              <>
                                <Cloud className="w-4 h-4" />
                                Attach from Google Drive
                              </>
                            )}
                          </button>
                        </div>
                      ) : (
                        <div className="space-y-3">
                          <div className="p-4 bg-slate-50 rounded-xl flex items-center justify-between">
                            <div className="flex items-center gap-3">
                              {formData.isGoogleDriveLinked && formData.googleDriveIconUrl ? (
                                <img 
                                  src={formData.googleDriveIconUrl} 
                                  alt="File type icon" 
                                  className="w-5 h-5"
                                  onError={(e) => {
                                    // Fallback to Cloud icon if image fails to load
                                    (e.target as HTMLImageElement).style.display = 'none';
                                    const fallback = document.createElement('div');
                                    fallback.innerHTML = '<svg class="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"></path></svg>';
                                    (e.target as HTMLImageElement).parentNode?.appendChild(fallback);
                                  }}
                                />
                              ) : formData.isGoogleDriveLinked ? (
                                <Cloud className="w-5 h-5 text-blue-600" />
                              ) : (
                                <FileCheck className="w-5 h-5 text-emerald-600" />
                              )}
                              <div>
                                <p className="text-sm font-bold text-slate-900">{formData.fileName}</p>
                                <div className="flex items-center gap-2 mt-1">
                                  {formData.fileSize > 0 && (
                                    <p className="text-xs text-slate-500">{(formData.fileSize / 1024).toFixed(1)} KB</p>
                                  )}
                                  {formData.isGoogleDriveLinked && (
                                    <>
                                      {formData.fileSize > 0 && <span className="text-slate-300">•</span>}
                                      <span className="text-xs text-blue-600 font-bold">Google Drive</span>
                                    </>
                                  )}
                                </div>
                              </div>
                            </div>
                            <button
                              onClick={() => {
                                setFormData(prev => ({
                                  ...prev,
                                  file: null,
                                  fileUrl: '',
                                  fileName: '',
                                  fileMimeType: '',
                                  fileSize: 0,
                                  isGoogleDriveLinked: false,
                                  googleDriveFileId: '',
                                  googleDriveWebViewLink: '',
                                  googleDriveDownloadLink: '',
                                  googleDriveIconUrl: ''
                                }));
                                if (fileInputRef.current) {
                                  fileInputRef.current.value = '';
                                }
                              }}
                              className="p-2 hover:bg-red-50 rounded-lg text-red-600 transition-all"
                            >
                              <X className="w-4 h-4" />
                            </button>
                          </div>

                          {!formData.isGoogleDriveLinked && formData.fileUrl && (
                            <button
                              onClick={handleUploadToGoogleDrive}
                              disabled={isUploadingToGoogleDrive}
                              className="w-full py-3 bg-blue-600 text-white font-bold text-sm rounded-xl hover:bg-blue-700 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                            >
                              {isUploadingToGoogleDrive ? (
                                <>
                                  <Loader2 className="w-4 h-4 animate-spin" />
                                  Uploading to Drive...
                                </>
                              ) : (
                                <>
                                  <Cloud className="w-4 h-4" />
                                  Upload to Google Drive
                                </>
                              )}
                            </button>
                          )}

                          {formData.isGoogleDriveLinked && formData.googleDriveWebViewLink && (
                            <a
                              href={formData.googleDriveWebViewLink}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="block w-full py-3 bg-blue-50 border-2 border-blue-200 rounded-xl hover:bg-blue-100 transition-all flex items-center justify-center gap-2 text-sm font-bold text-blue-900"
                            >
                              {formData.googleDriveIconUrl ? (
                                <img 
                                  src={formData.googleDriveIconUrl} 
                                  alt="File type" 
                                  className="w-4 h-4"
                                  onError={(e) => {
                                    (e.target as HTMLImageElement).style.display = 'none';
                                  }}
                                />
                              ) : (
                                <ExternalLink className="w-4 h-4" />
                              )}
                              View in Google Drive
                            </a>
                          )}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>

              {/* Footer */}
              <div className="p-6 border-t border-slate-100 bg-slate-50 flex gap-3">
                <button
                  onClick={() => {
                    setIsCreateModalOpen(false);
                    setIsEditModalOpen(false);
                    resetForm();
                  }}
                  disabled={isSubmitting}
                  className="flex-1 py-3 border border-slate-200 text-slate-600 font-black uppercase text-xs tracking-widest rounded-xl hover:bg-white transition-all disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  onClick={isCreateModalOpen ? handleCreateContract : handleUpdateContract}
                  disabled={isSubmitting}
                  className="flex-1 py-3 bg-indigo-600 text-white font-black uppercase text-xs tracking-widest rounded-xl hover:bg-indigo-700 transition-all shadow-lg disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      {isCreateModalOpen ? 'Creating...' : 'Updating...'}
                    </>
                  ) : (
                    <>{isCreateModalOpen ? 'Create Contract' : 'Update Contract'}</>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Contract Detail View */}
      {selectedContract && !isEditModalOpen && !isDeleteConfirmOpen && (
        <div className="fixed inset-0 z-[120] overflow-hidden pointer-events-none">
          <div
            className="absolute inset-0 bg-slate-900/60 backdrop-blur-md pointer-events-auto animate-in fade-in duration-300"
            onClick={() => setSelectedContract(null)}
          />
          <div className="absolute inset-0 flex items-center justify-center p-4 pointer-events-none">
            <div className="bg-white rounded-[32px] shadow-2xl max-w-3xl w-full max-h-[90vh] overflow-hidden pointer-events-auto animate-in zoom-in-95 duration-300 flex flex-col">
              {/* Header */}
              <div className="p-8 border-b border-slate-100 bg-gradient-to-r from-indigo-50 to-purple-50">
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <h2 className="text-2xl font-black text-slate-900">{selectedContract.title}</h2>
                      <span className={`px-3 py-1 text-xs font-black uppercase rounded-lg border ${getStatusColor(selectedContract.status)} flex items-center gap-1`}>
                        {getStatusIcon(selectedContract.status)}
                        {selectedContract.status}
                      </span>
                    </div>
                    <p className="text-sm text-slate-500 font-medium">{selectedContract.documentType} - {selectedContract.contractParty}</p>
                  </div>
                  <button
                    onClick={() => setSelectedContract(null)}
                    className="p-2 hover:bg-white rounded-full text-slate-400 hover:text-slate-600 transition-all"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>
              </div>

              {/* Content */}
              <div className="flex-1 overflow-y-auto p-8 custom-scrollbar">
                <div className="space-y-6">
                  {/* Dates */}
                  <div className="grid grid-cols-3 gap-4">
                    {selectedContract.expirationDate && (
                      <div>
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Expiration</p>
                        <p className="text-sm font-bold text-slate-900">{new Date(selectedContract.expirationDate).toLocaleDateString()}</p>
                      </div>
                    )}
                    {selectedContract.renewalDate && (
                      <div>
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Renewal</p>
                        <p className="text-sm font-bold text-slate-900">{new Date(selectedContract.renewalDate).toLocaleDateString()}</p>
                      </div>
                    )}
                    {selectedContract.signedDate && (
                      <div>
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Signed</p>
                        <p className="text-sm font-bold text-slate-900">{new Date(selectedContract.signedDate).toLocaleDateString()}</p>
                      </div>
                    )}
                  </div>

                  {/* Description */}
                  {selectedContract.description && (
                    <div>
                      <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Description</p>
                      <p className="text-sm text-slate-600">{selectedContract.description}</p>
                    </div>
                  )}

                  {/* Documents */}
                  {(selectedContract.fileUrl || selectedContract.isGoogleDriveLinked) && (
                    <div>
                      <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3">Documents</p>
                      <div className="space-y-2">
                        {selectedContract.fileName && (
                          <div className="p-4 bg-slate-50 rounded-xl flex items-center justify-between">
                            <div className="flex items-center gap-3">
                              {selectedContract.isGoogleDriveLinked && (selectedContract as any).googleDriveIconUrl ? (
                                <img 
                                  src={(selectedContract as any).googleDriveIconUrl} 
                                  alt="File type" 
                                  className="w-5 h-5"
                                  onError={(e) => {
                                    // Fallback to FileText icon if image fails to load
                                    (e.target as HTMLImageElement).style.display = 'none';
                                  }}
                                />
                              ) : (
                                <FileText className="w-5 h-5 text-indigo-600" />
                              )}
                              <div>
                                <p className="text-sm font-bold text-slate-900">{selectedContract.fileName}</p>
                                {selectedContract.fileSize && (
                                  <p className="text-xs text-slate-500">{(selectedContract.fileSize / 1024).toFixed(1)} KB</p>
                                )}
                              </div>
                            </div>
                            {selectedContract.fileUrl && (
                              <a
                                href={selectedContract.fileUrl}
                                download={selectedContract.fileName}
                                className="p-2 hover:bg-indigo-50 rounded-lg text-indigo-600 transition-all"
                              >
                                <Download className="w-4 h-4" />
                              </a>
                            )}
                          </div>
                        )}
                        {selectedContract.isGoogleDriveLinked && selectedContract.googleDriveWebViewLink && (
                          <a
                            href={selectedContract.googleDriveWebViewLink}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="block p-4 bg-blue-50 border-2 border-blue-200 rounded-xl hover:bg-blue-100 transition-all"
                          >
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-3">
                                <Cloud className="w-5 h-5 text-blue-600" />
                                <span className="text-sm font-bold text-blue-900">View in Google Drive</span>
                              </div>
                              <ExternalLink className="w-4 h-4 text-blue-600" />
                            </div>
                          </a>
                        )}
                      </div>
                    </div>
                  )}

                  {/* E-Signature */}
                  {selectedContract.requiresSignature && (
                    <div className="border-2 border-amber-200 bg-amber-50 rounded-xl p-6">
                      <div className="flex items-center gap-3 mb-4">
                        <FileSignature className="w-5 h-5 text-amber-600" />
                        <h3 className="text-sm font-black text-amber-900">E-Signature Required</h3>
                      </div>
                      <p className="text-sm text-amber-800 mb-4">
                        Status: <span className="font-black">{selectedContract.signatureStatus}</span>
                      </p>
                      
                      {selectedContract.googleDocsSignatureLink ? (
                        <a
                          href={selectedContract.googleDocsSignatureLink}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="block py-3 bg-amber-600 text-white font-bold text-sm rounded-xl hover:bg-amber-700 transition-all text-center"
                        >
                          Open Signature Document
                        </a>
                      ) : (
                        <button
                          onClick={() => handleCreateSignatureDoc(selectedContract.id, selectedContract.title)}
                          disabled={isCreatingSignatureDoc}
                          className="w-full py-3 bg-amber-600 text-white font-bold text-sm rounded-xl hover:bg-amber-700 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                        >
                          {isCreatingSignatureDoc ? (
                            <>
                              <Loader2 className="w-4 h-4 animate-spin" />
                              Creating Document...
                            </>
                          ) : (
                            <>
                              <FileSignature className="w-4 h-4" />
                              Create Signature Document
                            </>
                          )}
                        </button>
                      )}

                      {selectedContract.status !== 'Signed' && (
                        <button
                          onClick={() => handleMarkAsSigned(selectedContract)}
                          className="w-full mt-3 py-3 bg-emerald-600 text-white font-bold text-sm rounded-xl hover:bg-emerald-700 transition-all flex items-center justify-center gap-2"
                        >
                          <CheckCircle2 className="w-4 h-4" />
                          Mark as Signed
                        </button>
                      )}
                    </div>
                  )}
                </div>
              </div>

              {/* Footer */}
              <div className="p-6 border-t border-slate-100 bg-slate-50 flex gap-3">
                <button
                  onClick={() => setSelectedContract(null)}
                  className="flex-1 py-3 border border-slate-200 text-slate-600 font-black uppercase text-xs tracking-widest rounded-xl hover:bg-white transition-all"
                >
                  Close
                </button>
                <button
                  onClick={() => {
                    openEditModal(selectedContract);
                  }}
                  className="flex-1 py-3 bg-indigo-600 text-white font-black uppercase text-xs tracking-widest rounded-xl hover:bg-indigo-700 transition-all shadow-lg flex items-center justify-center gap-2"
                >
                  <Edit2 className="w-4 h-4" />
                  Edit Contract
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {isDeleteConfirmOpen && selectedContract && (
        <div className="fixed inset-0 z-[130] overflow-hidden pointer-events-none">
          <div
            className="absolute inset-0 bg-slate-900/60 backdrop-blur-md pointer-events-auto animate-in fade-in duration-300"
            onClick={() => setIsDeleteConfirmOpen(false)}
          />
          <div className="absolute inset-0 flex items-center justify-center p-4 pointer-events-none">
            <div className="bg-white rounded-[28px] shadow-2xl max-w-md w-full pointer-events-auto animate-in zoom-in-95 duration-300 overflow-hidden">
              <div className="p-8 text-center">
                <div className="w-16 h-16 rounded-full bg-red-100 flex items-center justify-center text-red-600 mx-auto mb-6">
                  <AlertCircle className="w-8 h-8" />
                </div>
                <h2 className="text-2xl font-black text-slate-900 mb-3">Delete Contract?</h2>
                <p className="text-sm text-slate-600 mb-2">
                  Are you sure you want to delete <span className="font-black">{selectedContract.title}</span>?
                </p>
                <p className="text-sm text-slate-500">
                  This action cannot be undone.
                </p>
              </div>
              <div className="p-6 flex gap-3 bg-slate-50 border-t border-slate-100">
                <button
                  onClick={() => setIsDeleteConfirmOpen(false)}
                  disabled={isDeleting}
                  className="flex-1 py-3 border border-slate-200 text-slate-600 font-black uppercase text-xs tracking-widest rounded-xl hover:bg-white transition-all disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  onClick={handleDeleteContract}
                  disabled={isDeleting}
                  className="flex-1 py-3 bg-red-600 text-white font-black uppercase text-xs tracking-widest rounded-xl hover:bg-red-700 transition-all shadow-lg disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {isDeleting ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Deleting...
                    </>
                  ) : (
                    <>
                      <Trash2 className="w-4 h-4" />
                      Delete Contract
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Document Type Management Modal */}
      {isDocTypeModalOpen && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-300">
          <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="p-6 border-b border-slate-200 flex items-center justify-between">
              <div>
                <h3 className="text-lg font-black text-slate-900">Manage Document Types</h3>
                <p className="text-xs text-slate-400 mt-1">View and add contract document types</p>
              </div>
              <button
                onClick={() => {
                  setIsDocTypeModalOpen(false);
                  setNewDocTypeName('');
                }}
                className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
              >
                <X className="w-5 h-5 text-slate-400" />
              </button>
            </div>

            <div className="p-6 max-h-[400px] overflow-y-auto">
              <div className="space-y-2">
                {documentTypes.length === 0 ? (
                  <div className="text-center py-8">
                    <FileText className="w-12 h-12 text-slate-300 mx-auto mb-3" />
                    <p className="text-sm text-slate-500 font-medium">No document types yet</p>
                    <p className="text-xs text-slate-400 mt-1">Add your first document type below</p>
                  </div>
                ) : (
                  documentTypes.map(type => (
                    <div
                      key={type.id}
                      className="px-4 py-3 rounded-xl bg-slate-50 border-2 border-slate-100 flex items-center justify-between"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-lg bg-indigo-100 flex items-center justify-center">
                          <FileText className="w-4 h-4 text-indigo-600" />
                        </div>
                        <span className="font-bold text-sm text-slate-900">{type.name}</span>
                      </div>
                      <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                    </div>
                  ))
                )}
              </div>
            </div>

            <div className="p-6 border-t border-slate-200 space-y-3">
              <div className="flex gap-2">
                <input
                  type="text"
                  placeholder="New document type..."
                  value={newDocTypeName}
                  onChange={(e) => setNewDocTypeName(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && newDocTypeName.trim() && !isAddingDocType) {
                      e.preventDefault();
                      handleAddDocumentType();
                    }
                  }}
                  className="flex-1 px-4 py-2 bg-white border border-slate-200 rounded-xl text-sm font-bold text-slate-900 outline-none focus:ring-4 focus:ring-indigo-50"
                />
                <button
                  type="button"
                  onClick={handleAddDocumentType}
                  disabled={!newDocTypeName.trim() || isAddingDocType}
                  className="px-6 py-2 bg-indigo-600 text-white rounded-xl font-bold text-sm hover:bg-indigo-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                >
                  {isAddingDocType ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Adding...
                    </>
                  ) : (
                    <>
                      <Plus className="w-4 h-4" />
                      Add
                    </>
                  )}
                </button>
              </div>
              <p className="text-[10px] text-slate-400 font-medium">
                Document types help categorize your contracts and legal documents
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Contracts;

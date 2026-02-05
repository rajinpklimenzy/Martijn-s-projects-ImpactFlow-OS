import React, { useState } from 'react';
import { X, Loader2, CheckCircle2, Linkedin, AlertCircle } from 'lucide-react';
import { ScannerReviewForm } from './ScannerReviewForm';
import { apiFetchLinkedInProfile, apiConfirmLinkedInProfile, apiGetCompanies, apiGetLeadSources } from '../../utils/api';
import { Company, LeadSource, LinkedInProfile, ScanSuggestions } from '../../types';
import { useToast } from '../../contexts/ToastContext';

type ScannerMode = 'input' | 'fetching' | 'review' | 'success';

interface LinkedInScannerProps {
  onClose: () => void;
  onSuccess: () => void;
  currentUserId: string;
}

export const LinkedInScanner: React.FC<LinkedInScannerProps> = ({
  onClose,
  onSuccess,
  currentUserId
}) => {
  const { showSuccess, showError } = useToast();
  const [mode, setMode] = useState<ScannerMode>('input');
  const [linkedinUrl, setLinkedinUrl] = useState('');
  const [profileData, setProfileData] = useState<LinkedInProfile | null>(null);
  const [suggestions, setSuggestions] = useState<ScanSuggestions | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [companies, setCompanies] = useState<Company[]>([]);
  const [leadSources, setLeadSources] = useState<LeadSource[]>([]);

  // Load companies and lead sources
  React.useEffect(() => {
    const loadData = async () => {
      try {
        const [companiesRes, leadSourcesRes] = await Promise.all([
          apiGetCompanies(),
          apiGetLeadSources(true)
        ]);
        setCompanies(companiesRes.data || []);
        setLeadSources(leadSourcesRes.data || []);
      } catch (err) {
        console.error('Failed to load data:', err);
      }
    };
    loadData();
  }, []);

  // Validate LinkedIn URL
  const validateLinkedInUrl = (url: string): boolean => {
    const linkedinRegex = /^(https?:\/\/)?(www\.)?linkedin\.com\/in\/[a-zA-Z0-9-_]+\/?$/i;
    return linkedinRegex.test(url);
  };

  // Normalize LinkedIn URL
  const normalizeLinkedInUrl = (url: string): string => {
    let normalized = url.trim();
    if (!normalized.startsWith('http://') && !normalized.startsWith('https://')) {
      normalized = `https://${normalized}`;
    }
    if (!normalized.includes('www.')) {
      normalized = normalized.replace('linkedin.com', 'www.linkedin.com');
    }
    return normalized.replace(/\/$/, ''); // Remove trailing slash
  };

  // Handle URL input change
  const handleUrlChange = (value: string) => {
    setLinkedinUrl(value);
    setError(null);
  };

  // Fetch LinkedIn profile
  const handleFetchProfile = async () => {
    if (!linkedinUrl.trim()) {
      setError('Please enter a LinkedIn URL');
      return;
    }

    const normalizedUrl = normalizeLinkedInUrl(linkedinUrl);
    
    if (!validateLinkedInUrl(normalizedUrl)) {
      setError('Invalid LinkedIn URL format. Example: linkedin.com/in/johndoe');
      return;
    }

    setMode('fetching');
    setError(null);
    setIsProcessing(true);

    try {
      const response = await apiFetchLinkedInProfile({
        linkedinUrl: normalizedUrl,
        userId: currentUserId
      });

      if (response.success) {
        setProfileData(response.data.profile);
        setSuggestions(response.data.suggestions);
        setMode('review');
      } else {
        throw new Error('Failed to fetch LinkedIn profile');
      }
    } catch (err: any) {
      console.error('Fetch error:', err);
      let errorMessage = 'Failed to fetch LinkedIn profile';
      
      if (err.message?.includes('Invalid LinkedIn URL')) {
        errorMessage = 'Invalid LinkedIn URL format';
      } else if (err.message?.includes('private')) {
        errorMessage = 'This LinkedIn profile is private and cannot be accessed';
      } else if (err.message?.includes('rate limit')) {
        errorMessage = 'Rate limit exceeded. Please try again later';
      }
      
      setError(errorMessage);
      setMode('input');
    } finally {
      setIsProcessing(false);
    }
  };

  // Confirm and create contact
  const handleConfirm = async (contactData: any, companyData: any, linkToExistingCompany: string | null) => {
    setIsProcessing(true);
    setError(null);

    try {
      // Find LinkedIn scanner lead source
      const linkedInSource = leadSources.find(ls => ls.name === 'LinkedIn Scanner');
      
      const response = await apiConfirmLinkedInProfile({
        contactData,
        linkedinData: profileData ? {
          headline: profileData.headline,
          currentRole: profileData.currentRole,
          profileImageUrl: profileData.profileImageUrl
        } : undefined,
        companyData,
        linkToExistingCompany,
        leadSourceId: linkedInSource?.id || '',
        userId: currentUserId
      });

      if (response.success) {
        setMode('success');
        showSuccess('Contact created from LinkedIn profile!');
        
        // Auto-close after 2 seconds
        setTimeout(() => {
          onSuccess();
          onClose();
        }, 2000);
      } else {
        throw new Error('Failed to create contact');
      }
    } catch (err: any) {
      console.error('Confirm error:', err);
      setError(err.message || 'Failed to create contact. Please try again.');
      showError(err.message || 'Failed to create contact');
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
      <div className="bg-white rounded-xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        {/* Mode: URL Input */}
        {mode === 'input' && (
          <div className="p-6">
            <div className="flex justify-between items-start mb-6">
              <div>
                <h2 className="text-2xl font-bold text-gray-900">Scan LinkedIn Profile</h2>
                <p className="text-sm text-gray-600 mt-1">Import contact from LinkedIn profile</p>
              </div>
              <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
                <X className="w-6 h-6" />
              </button>
            </div>

            {error && (
              <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg flex items-start">
                <AlertCircle className="w-5 h-5 text-red-600 mr-3 mt-0.5 flex-shrink-0" />
                <div className="text-red-800">{error}</div>
              </div>
            )}

            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                LinkedIn Profile URL
              </label>
              <div className="relative">
                <Linkedin className="absolute left-3 top-3 w-5 h-5 text-gray-400" />
                <input
                  type="url"
                  value={linkedinUrl}
                  onChange={(e) => handleUrlChange(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && handleFetchProfile()}
                  className="w-full pl-10 pr-3 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="https://www.linkedin.com/in/johndoe"
                />
              </div>
              <p className="text-xs text-gray-500 mt-2">
                Example: linkedin.com/in/johndoe or https://www.linkedin.com/in/johndoe
              </p>
            </div>

            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
              <h3 className="font-semibold text-blue-900 mb-2">How it works</h3>
              <ul className="text-sm text-blue-800 space-y-1 list-disc list-inside">
                <li>Paste any public LinkedIn profile URL</li>
                <li>We'll extract available contact and company information</li>
                <li>Review and edit before saving to your CRM</li>
                <li>Note: Email and phone may not be publicly available</li>
              </ul>
            </div>

            <div className="flex justify-end">
              <button
                onClick={handleFetchProfile}
                disabled={!linkedinUrl.trim()}
                className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Linkedin className="w-5 h-5" />
                Fetch Profile
              </button>
            </div>
          </div>
        )}

        {/* Mode: Fetching */}
        {mode === 'fetching' && (
          <div className="p-12 text-center">
            <Loader2 className="w-16 h-16 mx-auto text-blue-600 animate-spin mb-4" />
            <h2 className="text-2xl font-bold text-gray-900 mb-2">Fetching LinkedIn Profile...</h2>
            <p className="text-gray-600">Extracting contact information</p>
          </div>
        )}

        {/* Mode: Review */}
        {mode === 'review' && profileData && (
          <ScannerReviewForm
            extractedData={profileData}
            suggestions={suggestions || { existingContact: null, existingCompany: null, createNewCompany: true }}
            source="linkedin"
            onConfirm={handleConfirm}
            onCancel={onClose}
            isProcessing={isProcessing}
            companies={companies}
          />
        )}

        {/* Mode: Success */}
        {mode === 'success' && (
          <div className="p-12 text-center">
            <CheckCircle2 className="w-16 h-16 mx-auto text-green-600 mb-4" />
            <h2 className="text-2xl font-bold text-gray-900 mb-2">Contact Created!</h2>
            <p className="text-gray-600">The contact has been successfully added to your CRM</p>
          </div>
        )}
      </div>
    </div>
  );
};

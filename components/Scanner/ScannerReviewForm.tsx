import React, { useState, useEffect } from 'react';
import { X, AlertTriangle, CheckCircle2, User, Mail, Phone, Briefcase, Building2, Globe, Linkedin } from 'lucide-react';
import { ExtractedData, Company, Contact, ScanSuggestions } from '../../types';

interface ScannerReviewFormProps {
  extractedData: ExtractedData | any;
  suggestions: ScanSuggestions;
  source: 'business_card' | 'linkedin';
  onConfirm: (contactData: any, companyData: any, linkToExistingCompany: string | null) => void;
  onCancel: () => void;
  isProcessing?: boolean;
  companies: Company[];
}

export const ScannerReviewForm: React.FC<ScannerReviewFormProps> = ({
  extractedData,
  suggestions,
  source,
  onConfirm,
  onCancel,
  isProcessing = false,
  companies
}) => {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [role, setRole] = useState('');
  const [linkedinUrl, setLinkedinUrl] = useState('');
  const [companyName, setCompanyName] = useState('');
  const [companyWebsite, setCompanyWebsite] = useState('');
  const [selectedCompanyId, setSelectedCompanyId] = useState<string | null>(null);
  const [errors, setErrors] = useState<{[key: string]: string}>({});

  useEffect(() => {
    // Pre-populate from extracted data
    if (source === 'business_card') {
      setName(extractedData?.name?.value || '');
      setEmail(extractedData?.email?.value || '');
      setPhone(extractedData?.phone?.value || '');
      setRole(extractedData?.title?.value || '');
      setLinkedinUrl(extractedData?.linkedin?.value || '');
      setCompanyName(extractedData?.company?.value || '');
      setCompanyWebsite(extractedData?.website?.value || '');
    } else if (source === 'linkedin') {
      setName(extractedData?.name || '');
      setEmail(extractedData?.email || '');
      setPhone(extractedData?.phone || '');
      setRole(extractedData?.currentRole || extractedData?.headline || '');
      setLinkedinUrl(extractedData?.profileImageUrl || '');
      setCompanyName(extractedData?.currentCompany || '');
      setCompanyWebsite(extractedData?.companyWebsite || '');
    }

    // Pre-select existing company if found
    if (suggestions?.existingCompany) {
      setSelectedCompanyId(suggestions.existingCompany.id);
    }
  }, [extractedData, suggestions, source]);

  const getConfidenceColor = (confidence: number) => {
    if (confidence >= 95) return 'text-green-600 bg-green-50';
    if (confidence >= 75) return 'text-yellow-600 bg-yellow-50';
    return 'text-red-600 bg-red-50';
  };

  const getConfidenceLabel = (confidence: number) => {
    if (confidence >= 95) return 'High Confidence';
    if (confidence >= 75) return 'Medium - Verify';
    return 'Low - Review';
  };

  const validateForm = () => {
    const newErrors: {[key: string]: string} = {};

    if (!name.trim()) {
      newErrors.name = 'Name is required';
    }

    if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      newErrors.email = 'Invalid email format';
    }

    if (!selectedCompanyId && !companyName.trim()) {
      newErrors.company = 'Company is required';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = () => {
    if (!validateForm()) {
      return;
    }

    const contactData = {
      name,
      email: email.toLowerCase(),
      phone,
      role,
      linkedin: linkedinUrl
    };

    const companyData = {
      name: companyName,
      website: companyWebsite
    };

    onConfirm(contactData, companyData, selectedCompanyId);
  };

  return (
    <div className="p-6">
      <div className="flex justify-between items-start mb-6">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Review & Confirm</h2>
          <p className="text-sm text-gray-600 mt-1">
            {source === 'business_card' ? 'Verify scanned business card data' : 'Verify LinkedIn profile data'}
          </p>
        </div>
        <button
          onClick={onCancel}
          className="text-gray-400 hover:text-gray-600 transition-colors"
        >
          <X className="w-6 h-6" />
        </button>
      </div>

      {/* Duplicate Warning */}
      {suggestions?.existingContact && (
        <div className="mb-6 p-4 bg-yellow-50 border border-yellow-200 rounded-lg flex items-start">
          <AlertTriangle className="w-5 h-5 text-yellow-600 mr-3 mt-0.5 flex-shrink-0" />
          <div>
            <h3 className="font-semibold text-yellow-900">Duplicate Contact Detected</h3>
            <p className="text-sm text-yellow-800 mt-1">
              A contact with email "{suggestions.existingContact.email}" already exists.
            </p>
            <div className="mt-2 flex gap-2">
              <button
                type="button"
                className="text-sm text-yellow-900 underline hover:no-underline"
                onClick={() => window.dispatchEvent(new CustomEvent('navigate-to-contact', { detail: suggestions.existingContact.id }))}
              >
                View Existing Contact
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Contact Information */}
      <div className="mb-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Contact Information</h3>
        
        {/* Name */}
        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Name *
          </label>
          <div className="relative">
            <User className="absolute left-3 top-3 w-5 h-5 text-gray-400" />
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className={`w-full pl-10 pr-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                errors.name ? 'border-red-500' : 'border-gray-300'
              }`}
              placeholder="John Doe"
            />
            {source === 'business_card' && extractedData?.name?.confidence > 0 && (
              <span className={`absolute right-3 top-2.5 text-xs px-2 py-1 rounded ${getConfidenceColor(extractedData.name.confidence)}`}>
                {getConfidenceLabel(extractedData.name.confidence)}
              </span>
            )}
          </div>
          {errors.name && <p className="text-xs text-red-600 mt-1">{errors.name}</p>}
        </div>

        {/* Email */}
        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Email
          </label>
          <div className="relative">
            <Mail className="absolute left-3 top-3 w-5 h-5 text-gray-400" />
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className={`w-full pl-10 pr-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                errors.email ? 'border-red-500' : 'border-gray-300'
              }`}
              placeholder="john@example.com"
            />
            {source === 'business_card' && extractedData?.email?.confidence > 0 && (
              <span className={`absolute right-3 top-2.5 text-xs px-2 py-1 rounded ${getConfidenceColor(extractedData.email.confidence)}`}>
                {getConfidenceLabel(extractedData.email.confidence)}
              </span>
            )}
          </div>
          {errors.email && <p className="text-xs text-red-600 mt-1">{errors.email}</p>}
        </div>

        {/* Phone */}
        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Phone
          </label>
          <div className="relative">
            <Phone className="absolute left-3 top-3 w-5 h-5 text-gray-400" />
            <input
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="+1 (555) 123-4567"
            />
            {source === 'business_card' && extractedData?.phone?.confidence > 0 && (
              <span className={`absolute right-3 top-2.5 text-xs px-2 py-1 rounded ${getConfidenceColor(extractedData.phone.confidence)}`}>
                {getConfidenceLabel(extractedData.phone.confidence)}
              </span>
            )}
          </div>
        </div>

        {/* Role/Title */}
        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Role/Title
          </label>
          <div className="relative">
            <Briefcase className="absolute left-3 top-3 w-5 h-5 text-gray-400" />
            <input
              type="text"
              value={role}
              onChange={(e) => setRole(e.target.value)}
              className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Chief Technology Officer"
            />
            {source === 'business_card' && extractedData?.title?.confidence > 0 && (
              <span className={`absolute right-3 top-2.5 text-xs px-2 py-1 rounded ${getConfidenceColor(extractedData.title.confidence)}`}>
                {getConfidenceLabel(extractedData.title.confidence)}
              </span>
            )}
          </div>
        </div>

        {/* LinkedIn URL */}
        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 mb-1">
            LinkedIn Profile
          </label>
          <div className="relative">
            <Linkedin className="absolute left-3 top-3 w-5 h-5 text-gray-400" />
            <input
              type="url"
              value={linkedinUrl}
              onChange={(e) => setLinkedinUrl(e.target.value)}
              className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="https://linkedin.com/in/johndoe"
            />
          </div>
        </div>
      </div>

      {/* Company Information */}
      <div className="mb-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Company Information</h3>
        
        {/* Company Selection */}
        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Company *
          </label>
          <select
            value={selectedCompanyId || 'new'}
            onChange={(e) => {
              const value = e.target.value;
              if (value === 'new') {
                setSelectedCompanyId(null);
              } else {
                setSelectedCompanyId(value);
                const selected = companies.find(c => c.id === value);
                if (selected) {
                  setCompanyName(selected.name);
                  setCompanyWebsite(selected.website);
                }
              }
            }}
            className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${
              errors.company ? 'border-red-500' : 'border-gray-300'
            }`}
          >
            <option value="new">+ Create New Company</option>
            {companies.map(company => (
              <option key={company.id} value={company.id}>
                {company.name}
              </option>
            ))}
          </select>
          {errors.company && <p className="text-xs text-red-600 mt-1">{errors.company}</p>}
        </div>

        {/* Company Name (editable only for new company) */}
        {!selectedCompanyId && (
          <>
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Company Name *
              </label>
              <div className="relative">
                <Building2 className="absolute left-3 top-3 w-5 h-5 text-gray-400" />
                <input
                  type="text"
                  value={companyName}
                  onChange={(e) => setCompanyName(e.target.value)}
                  className={`w-full pl-10 pr-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                    errors.company ? 'border-red-500' : 'border-gray-300'
                  }`}
                  placeholder="TechCorp Industries"
                />
              </div>
            </div>

            {/* Company Website */}
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Company Website
              </label>
              <div className="relative">
                <Globe className="absolute left-3 top-3 w-5 h-5 text-gray-400" />
                <input
                  type="url"
                  value={companyWebsite}
                  onChange={(e) => setCompanyWebsite(e.target.value)}
                  className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="https://www.techcorp.com"
                />
              </div>
            </div>
          </>
        )}
      </div>

      {/* Action Buttons */}
      <div className="flex justify-end gap-3">
        <button
          type="button"
          onClick={onCancel}
          disabled={isProcessing}
          className="px-6 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50"
        >
          Cancel
        </button>
        <button
          type="button"
          onClick={handleSubmit}
          disabled={isProcessing}
          className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2 disabled:opacity-50"
        >
          {isProcessing ? (
            <>
              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
              Creating...
            </>
          ) : (
            <>
              <CheckCircle2 className="w-5 h-5" />
              Confirm & Save
            </>
          )}
        </button>
      </div>
    </div>
  );
};

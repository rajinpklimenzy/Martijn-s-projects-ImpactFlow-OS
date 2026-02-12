/**
 * CRM Company Upload – 5-step wizard
 * Step 1: File upload | 2: Column mapping | 3: Validation & preview | 4: Merge explanation | 5: Execute
 */

import React, { useState, useCallback } from 'react';
import {
  X,
  Upload,
  Loader2,
  CheckCircle2,
  AlertCircle,
  ChevronRight,
  ChevronLeft,
  FileSpreadsheet,
  Map,
  Eye,
  Merge,
  Rocket,
  Download,
  Building2
} from 'lucide-react';
import {
  apiImportUpload,
  apiImportGoogleSheets,
  apiImportMapping,
  apiImportPreview,
  apiImportExecute
} from '../utils/api';
import { useToast } from '../contexts/ToastContext';

const COMPANY_TARGET_OPTIONS = [
  { value: 'companyName', label: 'Company Name', required: true },
  { value: 'domain', label: 'Domain', required: true },
  { value: 'industry', label: 'Industry', required: false }
];

const CONTACT_TARGET_OPTIONS = [
  { value: 'contactName', label: 'Contact Name', required: true },
  { value: 'companyDomain', label: 'Company Domain', required: true },
  { value: 'email', label: 'Email', required: false },
  { value: 'phone', label: 'Phone', required: false },
  { value: 'jobTitle', label: 'Job Title', required: false },
  { value: 'linkedinUrl', label: 'LinkedIn URL', required: false }
];

const COMPANY_AUTO_MAP_ALIASES: Record<string, string> = {
  company: 'companyName',
  organization: 'companyName',
  'business name': 'companyName',
  'company name': 'companyName',
  website: 'domain',
  domain: 'domain',
  url: 'domain',
  industry: 'industry',
  segment: 'industry',
  sector: 'industry'
};

const CONTACT_AUTO_MAP_ALIASES: Record<string, string> = {
  name: 'contactName',
  'contact name': 'contactName',
  'full name': 'contactName',
  'first name': 'contactName',
  'last name': 'contactName',
  'company domain': 'companyDomain',
  domain: 'companyDomain',
  website: 'companyDomain',
  'company website': 'companyDomain',
  email: 'email',
  'email address': 'email',
  phone: 'phone',
  'phone number': 'phone',
  'job title': 'jobTitle',
  title: 'jobTitle',
  position: 'jobTitle',
  role: 'jobTitle',
  linkedin: 'linkedinUrl',
  'linkedin url': 'linkedinUrl',
  'linkedin profile': 'linkedinUrl'
};

const COMPANY_SAMPLE_CSV = `Company,Website,Industry
Acme Corp,https://acme.com,Technology
Beta Inc,https://beta.io,Logistics
Gamma LLC,https://gamma.com,Healthcare
Delta Solutions,delta-solutions.com,Retail
Epsilon Group,www.epsilon-group.org,Technology`;

const CONTACT_SAMPLE_CSV = `Contact Name,Company Domain,Email,Phone,Job Title,LinkedIn URL
John Doe,acme.com,john.doe@acme.com,+1-555-0101,CEO,https://linkedin.com/in/johndoe
Jane Smith,beta.io,jane.smith@beta.io,+1-555-0102,CTO,https://linkedin.com/in/janesmith
Bob Johnson,gamma.com,bob.johnson@gamma.com,+1-555-0103,CFO,https://linkedin.com/in/bobjohnson`;

interface CRMCompanyUploadWizardProps {
  onClose: () => void;
  onSuccess?: () => void;
  type?: 'company' | 'contact';
}

const CRMCompanyUploadWizard: React.FC<CRMCompanyUploadWizardProps> = ({ onClose, onSuccess, type: propType = 'company' }) => {
  const importType = propType;
  const { showSuccess, showError } = useToast();
  const [step, setStep] = useState(1);
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadId, setUploadId] = useState<string | null>(null);
  const [headers, setHeaders] = useState<string[]>([]);
  const [rowCount, setRowCount] = useState(0);
  const [mapping, setMapping] = useState<Record<string, string>>({});
  const [mappingSaved, setMappingSaved] = useState(false);
  const [preview, setPreview] = useState<{
    summary: { total: number; new: number; updates: number; errors: number };
    rows: { rowIndex: number; status: string; data: any; companyId?: string; errors?: string[]; needsCompanySelection?: boolean; originalCompanyDomain?: string }[];
    errors: { rowIndex: number; message: string }[];
    companies?: Array<{ id: string; name: string; domain: string }>;
  } | null>(null);
  const [loadingPreview, setLoadingPreview] = useState(false);
  const [targetSelections, setTargetSelections] = useState<Record<string, boolean>>({});
  const [companySelections, setCompanySelections] = useState<Record<string, string>>({});
  const [executing, setExecuting] = useState(false);
  const [result, setResult] = useState<{ created: number; updated: number; targetAccounts: number; failed: number } | null>(null);
  const [previewFilter, setPreviewFilter] = useState<'all' | 'new' | 'update' | 'error'>('all');
  const [savingMapping, setSavingMapping] = useState(false);
  const [googleSheetsUrl, setGoogleSheetsUrl] = useState('');
  const [loadingGoogleSheets, setLoadingGoogleSheets] = useState(false);
  const [googleSheetsError, setGoogleSheetsError] = useState<string | null>(null);

  const targetOptions = importType === 'contact' ? CONTACT_TARGET_OPTIONS : COMPANY_TARGET_OPTIONS;
  const autoMapAliases = importType === 'contact' ? CONTACT_AUTO_MAP_ALIASES : COMPANY_AUTO_MAP_ALIASES;
  const sampleCsv = importType === 'contact' ? CONTACT_SAMPLE_CSV : COMPANY_SAMPLE_CSV;

  const downloadSampleCsv = () => {
    const blob = new Blob([sampleCsv], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${importType === 'contact' ? 'contacts' : 'companies'}-sample.csv`;
    a.click();
    URL.revokeObjectURL(url);
    showSuccess(`Sample CSV downloaded. Fill it with your ${importType} data and upload.`);
  };

  const handleGoogleSheets = async () => {
    if (!googleSheetsUrl.trim()) {
      setGoogleSheetsError('Please enter a Google Sheets URL');
      showError('Please enter a Google Sheets URL');
      return;
    }
    setGoogleSheetsError(null);
    setLoadingGoogleSheets(true);
    try {
      const data = await apiImportGoogleSheets(googleSheetsUrl.trim(), importType);
      if (!data.success) {
        // Backend returns: { success: false, message: "..." }
        const errorMsg = data.message || data.error?.message || 'Failed to load Google Sheets';
        console.log('[WIZARD] API returned error:', errorMsg);
        setGoogleSheetsError(errorMsg);
        showError(errorMsg);
        return;
      }
      
      const headersList = data.headers || [];
      if (headersList.length === 0) {
        const errorMsg = 'No columns found in the Google Sheet. Please ensure the first row contains column headers.';
        setGoogleSheetsError(errorMsg);
        showError(errorMsg);
        return;
      }
      
      console.log('[WIZARD] Google Sheets loaded:', { uploadId: data.uploadId, headers: headersList.length, rows: data.rowCount });
      
      setUploadId(data.uploadId);
      setHeaders(headersList);
      setRowCount(data.rowCount || 0);
      setGoogleSheetsError(null);
      setStep(2);
      showSuccess(`Google Sheets loaded successfully: ${headersList.length} columns, ${data.rowCount || 0} rows`);
    } catch (err: any) {
      console.error('[WIZARD] Google Sheets error:', err);
      
      // Extract error message - the backend returns: { success: false, message: "..." }
      // apiFetch attaches this to err.data.message, and also sets err.message
      let errorMessage = 'Failed to load Google Sheets.';
      
      // Priority order for extracting the exact backend message
      // 1. Check err.data.message first (this is where apiFetch stores the backend response)
      // 2. Check err.message (apiFetch and apiImportGoogleSheets extract and set this)
      // 3. Check other possible locations
      if (err.data?.message && typeof err.data.message === 'string' && err.data.message.trim()) {
        errorMessage = err.data.message;
      } else if (err.message && 
                 typeof err.message === 'string' && 
                 err.message.trim() &&
                 err.message !== 'Server Error 400' && 
                 err.message !== 'Failed to load Google Sheets.' && 
                 err.message !== 'Failed to import Google Sheets' &&
                 !err.message.startsWith('Server Error')) {
        errorMessage = err.message;
      } else if (err.response?.data?.message) {
        errorMessage = err.response.data.message;
      } else if (err.response?.data?.error?.message) {
        errorMessage = err.response.data.error.message;
      } else if (err.data?.error?.message) {
        errorMessage = err.data.error.message;
      } else if (err.error?.message) {
        errorMessage = err.error.message;
      } else if (err.error?.data?.message) {
        errorMessage = err.error.data.message;
      } else if (typeof err === 'string') {
        errorMessage = err;
      }
      
      // Log for debugging - log the full error structure
      console.log('[WIZARD] Extracted error message:', errorMessage);
      console.log('[WIZARD] Full error object:', JSON.stringify({
        message: err.message,
        data: err.data,
        response: err.response ? { status: err.response.status, data: err.response.data } : undefined,
        code: err.code || err.data?.code,
        error: err.error
      }, null, 2));
      
      // Set inline error and show toast with the exact API message
      // This will display: "Failed to fetch Google Sheets. Ensure the sheet is publicly accessible or shared with view permissions."
      setGoogleSheetsError(errorMessage);
      showError(errorMessage);
    } finally {
      setLoadingGoogleSheets(false);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (!f) return;
    const name = f.name.toLowerCase();
    if (!name.endsWith('.csv') && !name.endsWith('.xlsx') && !name.endsWith('.xls')) {
      showError('Please select a CSV or Excel (.xlsx) file.');
      return;
    }
    setFile(f);
  };

  const handleUpload = useCallback(async () => {
    if (!file) {
      showError('Please select a file first.');
      return;
    }
    setUploading(true);
    try {
      const data = await apiImportUpload(file, importType);
      setUploadId(data.uploadId);
      setHeaders(data.headers || []);
      setRowCount(data.rowCount || 0);
      setMapping({});
      setMappingSaved(false);
      setPreview(null);
      setTargetSelections({});
      setResult(null);
      setStep(2);
    } catch (e: any) {
      showError(e?.message || 'Upload failed');
    } finally {
      setUploading(false);
    }
  }, [file, showError]);

  const runAutoMap = useCallback(() => {
    const next: Record<string, string> = {};
    headers.forEach((h) => {
      const key = (h || '').trim().toLowerCase();
      const target = autoMapAliases[key];
      if (target) next[h] = target;
    });
    setMapping((prev) => ({ ...prev, ...next }));
  }, [headers, autoMapAliases]);

  const saveMapping = useCallback(async () => {
    const targetSet = new Set(Object.values(mapping).filter(Boolean));
    if (importType === 'company') {
      if (!targetSet.has('companyName') || !targetSet.has('domain')) {
        showError('Please map both Company Name and Domain.');
        return;
      }
    } else {
      if (!targetSet.has('contactName') || !targetSet.has('companyDomain')) {
        showError('Please map both Contact Name and Company Domain.');
        return;
      }
    }
    if (!uploadId) return;
    setSavingMapping(true);
    try {
      await apiImportMapping(uploadId, mapping);
      setMappingSaved(true);
      setStep(3);
      setLoadingPreview(true);
      try {
        const res = await apiImportPreview(uploadId);
        if (!res.success) {
          showError(res.message || 'Failed to load preview');
          setPreview(null);
          return;
        }
        setPreview({
          summary: res.summary || { total: 0, new: 0, updates: 0, errors: 0 },
          rows: res.rows || [],
          errors: res.errors || [],
          companies: res.companies || []
        });
        const sel: Record<string, boolean> = {};
        (res.rows || []).forEach((r: any) => {
          if (r.status === 'new' || r.status === 'update') sel[String(r.rowIndex - 1)] = false;
        });
        setTargetSelections(sel);
        // Reset company selections when preview loads
        setCompanySelections({});
      } catch (e: any) {
        showError(e?.message || 'Failed to load preview. Please try again.');
        setPreview(null);
      } finally {
        setLoadingPreview(false);
      }
    } catch (e: any) {
      showError(e?.message || 'Failed to save mapping');
    } finally {
      setSavingMapping(false);
    }
  }, [uploadId, mapping, showError]);

  const downloadErrorReport = useCallback(() => {
    if (!preview?.errors?.length) return;
    const lines = ['Row,Message', ...preview.errors.map((e) => `${e.rowIndex},${(e.message || '').replace(/"/g, '""')}`)];
    const blob = new Blob([lines.join('\n')], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'import-errors.csv';
    a.click();
    URL.revokeObjectURL(url);
  }, [preview?.errors]);

  const handleExecute = useCallback(async () => {
    if (!uploadId) return;
    
    // Check if there are contacts needing company selection
    if (importType === 'contact' && preview) {
      const needsSelection = preview.rows.some(r => r.needsCompanySelection && !companySelections[String(r.rowIndex - 1)]);
      if (needsSelection) {
        showError('Please select a company for all contacts that require it.');
        return;
      }
    }
    
    if (preview && preview.summary.errors > 0) {
      // Check if errors are only from contacts needing company selection (which we've now handled)
      const hasRealErrors = preview.errors.some(e => {
        const row = preview.rows.find(r => r.rowIndex === e.rowIndex);
        return row && !row.needsCompanySelection;
      });
      if (hasRealErrors) {
        showError('Fix all errors before importing. Download the error report and correct your file.');
        return;
      }
    }
    
    setExecuting(true);
    try {
      const data = await apiImportExecute(uploadId, targetSelections, importType === 'contact' ? companySelections : undefined);
      setResult(data.summary || { created: 0, updated: 0, targetAccounts: 0, failed: 0 });
      setStep(5);
      showSuccess(`Import complete: ${data.summary?.created || 0} created, ${data.summary?.updated || 0} updated.`);
      onSuccess?.();
    } catch (e: any) {
      showError(e?.message || 'Import failed');
    } finally {
      setExecuting(false);
    }
  }, [uploadId, preview, targetSelections, companySelections, importType, showError, showSuccess, onSuccess]);

  const filteredRows = preview?.rows?.filter((r) => {
    if (previewFilter === 'all') return true;
    if (previewFilter === 'error') {
      return r.status === 'error' || r.status === 'needs_company_selection';
    }
    return r.status === previewFilter;
  }) || [];
  const pageSize = 50;
  const [page, setPage] = useState(0);
  const paginatedRows = filteredRows.slice(page * pageSize, (page + 1) * pageSize);
  const totalPages = Math.ceil(filteredRows.length / pageSize) || 1;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl shadow-xl max-w-4xl w-full max-h-[90vh] flex flex-col">
        <div className="flex items-center justify-between p-6 border-b border-slate-200">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-indigo-100 flex items-center justify-center">
              <Building2 className="w-5 h-5 text-indigo-600" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-900">Upload {importType === 'contact' ? 'contacts' : 'companies'}</h2>
              <p className="text-sm text-slate-500">Step {step} of 5</p>
            </div>
          </div>
          <button type="button" onClick={onClose} className="p-2 rounded-lg hover:bg-slate-100 text-slate-500">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 overflow-y-auto flex-1">
          {/* Step 1: File upload */}
          {step === 1 && (
            <div className="space-y-4">
              <p className="text-sm text-slate-600">Upload a CSV or Excel file, or import from Google Sheets (max 1,000 rows). The first row will be used as headers.</p>
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-sm text-slate-500">Need a template?</span>
                <button
                  type="button"
                  onClick={downloadSampleCsv}
                  className="inline-flex items-center gap-2 px-3 py-2 rounded-lg border border-slate-200 bg-white text-slate-700 text-sm font-medium hover:bg-slate-50 hover:border-indigo-200 hover:text-indigo-700 transition-colors"
                >
                  <Download className="w-4 h-4" />
                  Download sample CSV
                </button>
              </div>
              
              {/* Google Sheets option */}
              <div className="border border-slate-200 rounded-xl p-4 space-y-3">
                <div className="flex items-center gap-2">
                  <FileSpreadsheet className="w-5 h-5 text-slate-500" />
                  <span className="text-sm font-semibold text-slate-700">Import from Google Sheets</span>
                </div>
                <div className="space-y-2">
                  <p className="text-xs text-slate-500">
                    Paste a Google Sheets URL. The sheet must be publicly accessible (Anyone with the link can view).
                  </p>
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                    <p className="text-xs font-medium text-blue-900 mb-1">How to make your sheet publicly accessible:</p>
                    <ol className="text-xs text-blue-800 space-y-1 ml-4 list-decimal">
                      <li>Open your Google Sheet</li>
                      <li>Click the <strong>"Share"</strong> button (top right)</li>
                      <li>Click <strong>"Change to anyone with the link"</strong></li>
                      <li>Set permission to <strong>"Viewer"</strong></li>
                      <li>Click <strong>"Done"</strong></li>
                    </ol>
                  </div>
                  <div className="flex items-center gap-2 text-xs flex-wrap">
                    <span className="text-slate-500">Example URL format:</span>
                    <code className="text-xs bg-slate-100 px-2 py-1 rounded text-slate-700">
                      https://docs.google.com/spreadsheets/d/YOUR_SHEET_ID/edit
                    </code>
                    <span className="text-slate-400 text-xs">(Make sure your sheet is publicly accessible)</span>
                  </div>
                </div>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={googleSheetsUrl}
                    onChange={(e) => {
                      setGoogleSheetsUrl(e.target.value);
                      setGoogleSheetsError(null); // Clear error when user types
                    }}
                    placeholder="https://docs.google.com/spreadsheets/d/..."
                    className={`flex-1 px-3 py-2 border rounded-lg text-sm ${
                      googleSheetsError ? 'border-red-300 bg-red-50' : 'border-slate-200'
                    }`}
                  />
                  <button
                    type="button"
                    disabled={!googleSheetsUrl.trim() || loadingGoogleSheets}
                    onClick={handleGoogleSheets}
                    className="px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                  >
                    {loadingGoogleSheets ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                    Import
                  </button>
                </div>
                {googleSheetsError && (
                  <div className="p-4 bg-red-50 border-2 border-red-300 rounded-lg">
                    <div className="flex items-start gap-3">
                      <AlertCircle className="w-5 h-5 text-red-600 shrink-0 mt-0.5" />
                      <div className="flex-1 space-y-2">
                        <p className="text-sm font-semibold text-red-900">Sheet Not Accessible</p>
                        <p className="text-sm text-red-800 whitespace-pre-line leading-relaxed">{googleSheetsError}</p>
                        {(googleSheetsError.includes('publicly accessible') || 
                          googleSheetsError.includes('Access denied') || 
                          googleSheetsError.includes('SHEET_FETCH_FAILED')) && (
                          <div className="mt-3 pt-3 border-t border-red-200">
                            <p className="text-xs font-semibold text-red-900 mb-2">Quick fix:</p>
                            <ol className="text-xs text-red-800 space-y-1.5 ml-4 list-decimal">
                              <li>Open your Google Sheet in a new tab</li>
                              <li>Click the <strong>"Share"</strong> button (top right corner)</li>
                              <li>Change access from "Restricted" to <strong>"Anyone with the link"</strong></li>
                              <li>Make sure the permission is set to <strong>"Viewer"</strong></li>
                              <li>Click <strong>"Done"</strong> and try importing again</li>
                            </ol>
                          </div>
                        )}
                      </div>
                      <button
                        type="button"
                        onClick={() => setGoogleSheetsError(null)}
                        className="shrink-0 p-1 hover:bg-red-100 rounded transition-colors"
                        aria-label="Dismiss error"
                      >
                        <X className="w-4 h-4 text-red-600" />
                      </button>
                    </div>
                  </div>
                )}
              </div>

              <div className="relative">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-slate-200"></div>
                </div>
                <div className="relative flex justify-center text-xs uppercase">
                  <span className="bg-white px-2 text-slate-500">Or</span>
                </div>
              </div>

              <label className="flex flex-col items-center justify-center w-full h-40 border-2 border-dashed border-slate-200 rounded-xl cursor-pointer hover:border-indigo-300 hover:bg-indigo-50/30 transition-colors">
                <input type="file" accept=".csv,.xlsx,.xls" onChange={handleFileSelect} className="hidden" />
                {file ? (
                  <div className="flex items-center gap-3 text-slate-700">
                    <FileSpreadsheet className="w-10 h-10 text-indigo-500" />
                    <span className="font-medium">{file.name}</span>
                    <span className="text-slate-400 text-sm">({(file.size / 1024).toFixed(1)} KB)</span>
                  </div>
                ) : (
                  <>
                    <Upload className="w-10 h-10 text-slate-400 mb-2" />
                    <span className="text-sm font-medium text-slate-600">Click to select CSV or Excel file</span>
                  </>
                )}
              </label>
              <button
                type="button"
                disabled={!file || uploading}
                onClick={handleUpload}
                className="w-full py-3 bg-indigo-600 text-white rounded-xl font-semibold flex items-center justify-center gap-2 disabled:opacity-50"
              >
                {uploading ? <Loader2 className="w-5 h-5 animate-spin" /> : null}
                Upload and continue
              </button>
            </div>
          )}

          {/* Step 2: Column mapping */}
          {step === 2 && (
            <div className="space-y-4">
              <p className="text-sm text-slate-600">
                Map your file columns to CRM fields. {importType === 'contact' ? 'Contact Name and Company Domain' : 'Company Name and Domain'} are required.
              </p>
              {headers.length === 0 ? (
                <div className="p-4 bg-red-50 border border-red-200 rounded-xl">
                  <p className="text-sm text-red-700">
                    No columns detected. Please go back and ensure your file has column headers in the first row.
                  </p>
                </div>
              ) : (
                <>
                  <button type="button" onClick={runAutoMap} className="text-sm font-medium text-indigo-600 hover:text-indigo-700">
                    Auto-map by column name
                  </button>
                  <div className="border border-slate-200 rounded-xl overflow-hidden">
                    <table className="w-full text-sm">
                      <thead className="bg-slate-50">
                        <tr>
                          <th className="text-left p-3 font-semibold text-slate-700">File column</th>
                          <th className="text-left p-3 font-semibold text-slate-700">Maps to</th>
                        </tr>
                      </thead>
                      <tbody>
                        {headers.map((h) => (
                      <tr key={h} className="border-t border-slate-100">
                        <td className="p-3 text-slate-700">{h}</td>
                        <td className="p-3">
                          <select
                            value={mapping[h] || ''}
                            onChange={(e) => setMapping((prev) => ({ ...prev, [h]: e.target.value }))}
                            className="w-full max-w-xs px-3 py-2 border border-slate-200 rounded-lg text-sm"
                          >
                            <option value="">— Ignore —</option>
                            {targetOptions.map((opt) => (
                              <option key={opt.value} value={opt.value}>
                                {opt.label} {opt.required ? '(required)' : ''}
                              </option>
                            ))}
                          </select>
                        </td>
                      </tr>
                    ))}
                      </tbody>
                    </table>
                  </div>
                </>
              )}
              <div className="flex gap-2">
                <button type="button" onClick={() => setStep(1)} className="px-4 py-2 rounded-xl border border-slate-200 text-slate-700 font-medium text-sm">
                  Back
                </button>
                <button
                  type="button"
                  onClick={saveMapping}
                  disabled={savingMapping}
                  className="px-4 py-2 bg-indigo-600 text-white rounded-xl font-medium text-sm hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                >
                  {savingMapping && <Loader2 className="w-4 h-4 animate-spin" />}
                  Continue to preview
                </button>
              </div>
            </div>
          )}

          {/* Step 3: Validation & preview */}
          {step === 3 && (
            <div className="space-y-4">
              {loadingPreview ? (
                <div className="flex items-center gap-2 text-slate-500 py-8">
                  <Loader2 className="w-6 h-6 animate-spin" />
                  <span>Validating and loading preview...</span>
                </div>
              ) : preview && preview.rows && preview.rows.length > 0 ? (
                <>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    <div className="bg-slate-50 rounded-xl p-3">
                      <p className="text-xs text-slate-500">Total</p>
                      <p className="text-lg font-bold text-slate-900">{preview.summary.total}</p>
                    </div>
                    <div className="bg-green-50 rounded-xl p-3">
                      <p className="text-xs text-green-600">New</p>
                      <p className="text-lg font-bold text-green-700">{preview.summary.new}</p>
                    </div>
                    <div className="bg-blue-50 rounded-xl p-3">
                      <p className="text-xs text-blue-600">Updates</p>
                      <p className="text-lg font-bold text-blue-700">{preview.summary.updates}</p>
                    </div>
                    <div className="bg-red-50 rounded-xl p-3">
                      <p className="text-xs text-red-600">Errors</p>
                      <p className="text-lg font-bold text-red-700">{preview.summary.errors}</p>
                    </div>
                  </div>
                  {preview.summary.errors > 0 && (
                    <div className="flex items-center justify-between p-4 bg-red-50 border border-red-200 rounded-xl">
                      <div className="flex items-center gap-2 text-red-700">
                        <AlertCircle className="w-5 h-5" />
                        <span className="text-sm font-medium">Fix all errors before importing. Download the error report and re-upload a corrected file.</span>
                      </div>
                      <button type="button" onClick={downloadErrorReport} className="flex items-center gap-2 px-3 py-2 bg-white border border-red-200 rounded-lg text-red-700 text-sm font-medium">
                        <Download className="w-4 h-4" />
                        Download error report
                      </button>
                    </div>
                  )}
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-sm text-slate-500">Filter:</span>
                    {(['all', 'new', 'update', 'error'] as const).map((f) => (
                      <button
                        key={f}
                        type="button"
                        onClick={() => { setPreviewFilter(f); setPage(0); }}
                        className={`px-3 py-1.5 rounded-lg text-sm font-medium ${previewFilter === f ? 'bg-indigo-600 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}
                      >
                        {f === 'all' ? 'All' : f === 'new' ? 'New' : f === 'update' ? 'Existing' : 'Errors'}
                      </button>
                    ))}
                  </div>
                  {importType === 'contact' && preview?.rows.some(r => r.needsCompanySelection) && (
                    <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl">
                      <p className="text-sm text-amber-800">
                        <strong>Note:</strong> Some contacts need a company selected. Please select a company from the dropdown for each contact marked in red.
                      </p>
                    </div>
                  )}
                  <div className="border border-slate-200 rounded-xl overflow-hidden max-h-64 overflow-y-auto">
                    <table className="w-full text-sm">
                      <thead className="bg-slate-50 sticky top-0">
                        <tr>
                          <th className="text-left p-2 font-semibold text-slate-700 w-12">Row</th>
                          {importType === 'contact' ? (
                            <>
                              <th className="text-left p-2 font-semibold text-slate-700">Contact Name</th>
                              <th className="text-left p-2 font-semibold text-slate-700">Company Domain</th>
                              <th className="text-left p-2 font-semibold text-slate-700">Email</th>
                              <th className="text-left p-2 font-semibold text-slate-700">Select Company</th>
                            </>
                          ) : (
                            <>
                              <th className="text-left p-2 font-semibold text-slate-700">Company</th>
                              <th className="text-left p-2 font-semibold text-slate-700">Domain</th>
                            </>
                          )}
                          <th className="text-left p-2 font-semibold text-slate-700">Status</th>
                          {importType === 'company' && (
                            <th className="text-left p-2 font-semibold text-slate-700">Target account</th>
                          )}
                        </tr>
                      </thead>
                      <tbody>
                        {paginatedRows.map((r) => {
                          const rowKey = String(r.rowIndex - 1);
                          const isNeedsCompany = importType === 'contact' && r.needsCompanySelection;
                          const selectedCompanyId = companySelections[rowKey] || '';
                          const isErrorStatus = r.status === 'error' || r.status === 'needs_company_selection';
                          
                          return (
                            <tr 
                              key={r.rowIndex} 
                              className={`border-t border-slate-100 ${isErrorStatus ? 'bg-red-50' : ''}`}
                            >
                              <td className="p-2 text-slate-500">{r.rowIndex}</td>
                              {importType === 'contact' ? (
                                <>
                                  <td className="p-2">{r.data?.contactName || '—'}</td>
                                  <td className="p-2">
                                    {r.originalCompanyDomain ? (
                                      <span className="text-red-600" title="Company not found">{r.data?.companyDomain || '—'}</span>
                                    ) : (
                                      r.data?.companyDomain || '—'
                                    )}
                                  </td>
                                  <td className="p-2">{r.data?.email || '—'}</td>
                                  <td className="p-2">
                                    {isNeedsCompany ? (
                                      <select
                                        value={selectedCompanyId}
                                        onChange={(e) => setCompanySelections((prev) => ({ ...prev, [rowKey]: e.target.value }))}
                                        className="w-full max-w-xs px-2 py-1.5 border border-red-300 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                                      >
                                        <option value="">— Select Company —</option>
                                        {preview?.companies?.map((company) => (
                                          <option key={company.id} value={company.id}>
                                            {company.name} {company.domain ? `(${company.domain})` : ''}
                                          </option>
                                        ))}
                                      </select>
                                    ) : (
                                      <span className="text-slate-400 text-xs">—</span>
                                    )}
                                  </td>
                                </>
                              ) : (
                                <>
                                  <td className="p-2">{r.data?.companyName || '—'}</td>
                                  <td className="p-2">{r.data?.domain || '—'}</td>
                                </>
                              )}
                              <td className="p-2">
                                <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium ${
                                  isErrorStatus ? 'bg-red-100 text-red-700' :
                                  r.status === 'new' ? 'bg-green-100 text-green-700' : 
                                  r.status === 'update' ? 'bg-blue-100 text-blue-700' : 'bg-slate-100 text-slate-700'
                                }`}>
                                  {isErrorStatus ? (r.status === 'needs_company_selection' ? 'Needs Company' : 'Error') : 
                                   r.status === 'new' ? 'New' : 
                                   r.status === 'update' ? 'Existing' : 'Error'}
                                </span>
                              </td>
                              {importType === 'company' && (
                                <td className="p-2">
                                  {r.status !== 'error' && (
                                    <input
                                      type="checkbox"
                                      checked={targetSelections[rowKey] || false}
                                      onChange={(e) => setTargetSelections((prev) => ({ ...prev, [rowKey]: e.target.checked }))}
                                      className="rounded border-slate-300"
                                    />
                                  )}
                                </td>
                              )}
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                  {totalPages > 1 && (
                    <div className="flex items-center gap-2 justify-center text-sm">
                      <button type="button" onClick={() => setPage((p) => Math.max(0, p - 1))} disabled={page === 0} className="p-2 rounded-lg border border-slate-200 disabled:opacity-50">Prev</button>
                      <span className="text-slate-600">Page {page + 1} of {totalPages}</span>
                      <button type="button" onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))} disabled={page >= totalPages - 1} className="p-2 rounded-lg border border-slate-200 disabled:opacity-50">Next</button>
                    </div>
                  )}
                  <div className="flex gap-2 pt-2">
                    <button type="button" onClick={() => setStep(2)} className="px-4 py-2 rounded-xl border border-slate-200 text-slate-700 font-medium text-sm">Back</button>
                    <button
                      type="button"
                      disabled={(() => {
                        // Check if there are contacts needing company selection that haven't been selected
                        if (importType === 'contact' && preview) {
                          const needsSelection = preview.rows.some(r => 
                            r.needsCompanySelection && !companySelections[String(r.rowIndex - 1)]
                          );
                          if (needsSelection) return true;
                        }
                        // Check for real errors (not just needs company selection)
                        const hasRealErrors = preview?.errors.some(e => {
                          const row = preview.rows.find(r => r.rowIndex === e.rowIndex);
                          return row && !row.needsCompanySelection;
                        });
                        return hasRealErrors || false;
                      })()}
                      onClick={() => setStep(4)}
                      className="px-4 py-2 bg-indigo-600 text-white rounded-xl font-medium text-sm hover:bg-indigo-700 disabled:opacity-50"
                    >
                      Next: Review merge rules
                    </button>
                  </div>
                </>
              ) : preview && preview.summary ? (
                <div className="p-8 text-center text-slate-500">
                  <AlertCircle className="w-12 h-12 mx-auto mb-3 text-slate-400" />
                  <p className="text-sm">No rows to preview. Please check your file and try again.</p>
                </div>
              ) : (
                <div className="p-8 text-center text-slate-500">
                  <AlertCircle className="w-12 h-12 mx-auto mb-3 text-red-400" />
                  <p className="text-sm text-red-600">Failed to load preview. Please go back and try again.</p>
                  <button
                    type="button"
                    onClick={() => setStep(2)}
                    className="mt-4 px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700"
                  >
                    Go Back
                  </button>
                </div>
              )}
            </div>
          )}

          {/* Step 4: Merge explanation */}
          {step === 4 && (
            <div className="space-y-4">
              <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl">
                <h4 className="font-semibold text-slate-900 mb-2">How we match and merge</h4>
                <ul className="text-sm text-slate-600 space-y-1 list-disc list-inside">
                  {importType === 'contact' ? (
                    <>
                      <li>Contacts are matched by <strong>email + company</strong>. Same email + company = update; new combination = create.</li>
                      <li>We only <strong>fill blank</strong> fields. Existing values are never overwritten.</li>
                      <li>The company domain must exist in your CRM. Import companies first if needed.</li>
                    </>
                  ) : (
                    <>
                      <li>Companies are matched by <strong>domain</strong> (case-insensitive). Same domain = update; new domain = create.</li>
                      <li>We only <strong>fill blank</strong> fields. Existing values are never overwritten.</li>
                      <li>Target account selection is applied to new and updated companies as you chose in the preview.</li>
                    </>
                  )}
                </ul>
              </div>
              <div className="flex gap-2">
                <button type="button" onClick={() => setStep(3)} className="px-4 py-2 rounded-xl border border-slate-200 text-slate-700 font-medium text-sm">Back</button>
                <button
                  type="button"
                  disabled={executing || (preview?.summary?.errors ?? 0) > 0}
                  onClick={handleExecute}
                  className="px-4 py-2 bg-indigo-600 text-white rounded-xl font-medium text-sm hover:bg-indigo-700 disabled:opacity-50 flex items-center gap-2"
                >
                  {executing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Rocket className="w-4 h-4" />}
                  Import {preview?.summary?.total ?? 0} companies
                </button>
              </div>
            </div>
          )}

          {/* Step 5: Result */}
          {step === 5 && result && (
            <div className="space-y-4">
              <div className="flex items-center gap-3 p-4 bg-green-50 border border-green-200 rounded-xl">
                <CheckCircle2 className="w-10 h-10 text-green-600 shrink-0" />
                <div>
                  <h4 className="font-bold text-green-900">Import completed</h4>
                  <p className="text-sm text-green-700">
                    {result.created} created, {result.updated} updated, {result.targetAccounts} marked as target accounts.
                  </p>
                </div>
              </div>
              <div className="flex gap-2">
                <button type="button" onClick={onClose} className="px-4 py-2 bg-indigo-600 text-white rounded-xl font-medium text-sm hover:bg-indigo-700">
                  Done
                </button>
                <button type="button" onClick={() => { setStep(1); setFile(null); setUploadId(null); setResult(null); }} className="px-4 py-2 rounded-xl border border-slate-200 text-slate-700 font-medium text-sm">
                  Upload another file
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default CRMCompanyUploadWizard;


import React, { useState, useEffect, useRef } from 'react';
import { X, CheckCircle2, Building2, FolderKanban, CheckSquare, FileText, Plus, ChevronRight, User, Loader2, AlertCircle, Save, DollarSign, Calendar, Search, ChevronDown, Merge } from 'lucide-react';
import { apiCreateContact, apiCreateCompany, apiGetCompanies, apiCreateDeal, apiGetUsers, apiCreateProject, apiCreateTask, apiGetProjects, apiCreateInvoice, apiCreateNotification, apiGetContacts, apiMergeContacts, apiUpdateContact } from '../utils/api';
import { Company, User as UserType, Project, Contact } from '../types';
import { extractDomain } from '../utils/validate';
import { findDuplicateContacts, findFuzzyDuplicateContacts } from '../utils/dedup';
import { CURRENCIES, DEFAULT_CURRENCY, getCurrencySymbol } from '../utils/currency';

interface QuickCreateModalProps {
  type: 'deal' | 'project' | 'task' | 'invoice' | 'company' | 'contact';
  stage?: string;
  lockedType?: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

// Common regions list
const REGIONS = [
  'North America',
  'South America',
  'Europe',
  'Asia',
  'Africa',
  'Middle East',
  'Oceania',
  'Central America',
  'Caribbean',
  'Eastern Europe',
  'Western Europe',
  'Northern Europe',
  'Southern Europe',
  'Southeast Asia',
  'East Asia',
  'South Asia',
  'Central Asia',
  'North Africa',
  'Sub-Saharan Africa',
  'Latin America',
  'United States',
  'Canada',
  'Mexico',
  'United Kingdom',
  'Germany',
  'France',
  'Italy',
  'Spain',
  'Netherlands',
  'Belgium',
  'Switzerland',
  'Austria',
  'Sweden',
  'Norway',
  'Denmark',
  'Finland',
  'Poland',
  'Russia',
  'China',
  'Japan',
  'India',
  'South Korea',
  'Singapore',
  'Australia',
  'New Zealand',
  'Brazil',
  'Argentina',
  'Chile',
  'United Arab Emirates',
  'Saudi Arabia',
  'Israel',
  'South Africa',
  'Global',
  'International'
];

const QuickCreateModal: React.FC<QuickCreateModalProps> = ({ type: initialType, stage: initialStage, lockedType, onClose, onSuccess }) => {
  const [type, setType] = useState(initialType);
  const [step, setStep] = useState<'form' | 'success'>('form');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<{ [key: string]: string }>({});
  const [companies, setCompanies] = useState<Company[]>([]);
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [users, setUsers] = useState<UserType[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [isRegionDropdownOpen, setIsRegionDropdownOpen] = useState(false);
  const [regionSearch, setRegionSearch] = useState('');
  const regionDropdownRef = useRef<HTMLDivElement>(null);
  const [mergeModal, setMergeModal] = useState<{
    open: boolean;
    duplicates: any[];
    newContact: any;
  } | null>(null);
  const [isMerging, setIsMerging] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    title: '',
    companyId: '',
    projectId: '',
    role: '',
    email: '',
    phone: '',
    assigneeId: '',
    ownerId: '',
    value: '',
    currency: DEFAULT_CURRENCY, // Default currency
    expectedCloseDate: '',
    stage: 'Discovery',
    status: 'Planning',
    progress: '0',
    description: '',
    industry: '',
    website: '',
    region: '',
    domain: '',
    linkedin: '',
    priority: 'Medium',
    assignedUserIds: [] as string[],
    engagement: '',
    startDate: '',
    endDate: '',
    lineItems: [] as Array<{ description: string; quantity: number; rate: number; amount: number }>
  });

  useEffect(() => {
    const resetData: any = {
      name: '', title: '', companyId: '', projectId: '', role: '', email: '', phone: '',
      assigneeId: '', ownerId: '', value: '', expectedCloseDate: '',
      stage: initialStage || 'Discovery', status: 'Planning', progress: '0',
      priority: 'Medium', description: '', industry: '', website: '', region: '', domain: '', linkedin: '', assignedUserIds: [],
      engagement: '', startDate: '', endDate: ''
    };
    
    // For invoice type, initialize with one empty line item and default currency
    if (initialType === 'invoice') {
      resetData.lineItems = [{ description: '', quantity: 1, rate: 0, amount: 0 }];
      resetData.currency = DEFAULT_CURRENCY;
    } else {
      resetData.lineItems = [];
      // For deal type, keep currency, otherwise reset to default
      if (initialType !== 'deal') {
        resetData.currency = DEFAULT_CURRENCY;
      }
    }
    
    setFormData(prev => ({ ...prev, ...resetData }));
    setError(null);
    setFieldErrors({});
    setStep('form');
  }, [initialType, initialStage]);


  useEffect(() => {
    const fetchData = async () => {
       try {
         const currentUser = JSON.parse(localStorage.getItem('user_data') || '{}');
         const userId = currentUser?.id;
         
         const [uRes, cRes, contRes, pRes] = await Promise.all([
           apiGetUsers(), 
           apiGetCompanies(),
           apiGetContacts(), // Fetch contacts for duplicate checking
           apiGetProjects(userId, undefined, 'Active') // Only fetch Active projects
         ]);
         setUsers(uRes.data || []);
         setCompanies(cRes.data || []);
         setContacts(contRes.data || []);
         // Filter to only show Active projects
         const allProjects = Array.isArray(pRes) ? pRes : pRes?.data || [];
         setProjects(allProjects.filter((p: Project) => p.status === 'Active'));
         
         if (userId) {
           setFormData(prev => ({ 
             ...prev, 
             ownerId: prev.ownerId || userId, 
             assigneeId: prev.assigneeId || userId 
           }));
         }
       } catch (err) {
         console.error('[QUICK-CREATE] Data fetch failed:', err);
       }
    };
    fetchData();
  }, [type]);

  // Close region dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (regionDropdownRef.current && !regionDropdownRef.current.contains(event.target as Node)) {
        setIsRegionDropdownOpen(false);
        setRegionSearch('');
      }
    };

    if (isRegionDropdownOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [isRegionDropdownOpen]);

  // Filter regions based on search
  const filteredRegions = REGIONS.filter(region =>
    region.toLowerCase().includes(regionSearch.toLowerCase())
  );

  const validateForm = (): boolean => {
    const errors: { [key: string]: string } = {};
    
    if (type === 'contact') {
      if (!formData.name?.trim()) errors.name = 'Full Name is required';
      if (!formData.email?.trim()) errors.email = 'Email Address is required';
      else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) errors.email = 'Please enter a valid email address';
    } else if (type === 'company') {
      if (!formData.name?.trim()) errors.name = 'Company Name is required';
      // Industry is now optional
      // Check region - must have a value (not empty string)
      if (!formData.region || formData.region.trim() === '') {
        errors.region = 'Region is required';
      }
      // Assignee / Lead (ownerId) is required for company
      if (!formData.ownerId?.trim()) errors.ownerId = 'Assignee / Lead is required';
      // Check domain - should be auto-populated from website or email
      let domain = formData.domain;
      if (!domain && formData.website) {
        domain = extractDomain(formData.website) || '';
      }
      if (!domain && formData.email) {
        domain = extractDomain(formData.email) || '';
      }
      if (!domain || domain.trim() === '') {
        errors.domain = 'Domain is required (can be auto-populated from website or email)';
        // Show on website field too so user sees which input to fix (Domain field is hidden when empty)
        errors.website = 'Add website or email to auto-populate domain';
      }
    } else if (type === 'deal') {
      if (!formData.title?.trim()) errors.title = 'Deal Name is required';
      if (!formData.companyId?.trim()) errors.companyId = 'Organization is required';
      if (!formData.value || parseFloat(formData.value) <= 0) errors.value = 'Amount is required and must be greater than $0';
      if (!formData.stage?.trim()) errors.stage = 'Stage is required';
      if (!formData.ownerId) errors.ownerId = 'Assignee / Lead is required';
    } else if (type === 'project') {
      if (!formData.title?.trim()) errors.title = 'Project Name is required';
      if (!formData.engagement?.trim()) errors.engagement = 'Engagement is required';
      if (!formData.startDate?.trim()) errors.startDate = 'Start Date is required';
      if (!formData.endDate?.trim()) errors.endDate = 'End Date is required';
      if (formData.startDate && formData.endDate) {
        const start = new Date(formData.startDate);
        const end = new Date(formData.endDate);
        if (!isNaN(start.getTime()) && !isNaN(end.getTime()) && start >= end) {
          errors.endDate = 'End Date must be after Start Date';
        }
      }
      if (!formData.ownerId) errors.ownerId = 'Assignee / Lead is required';
    } else if (type === 'task') {
      if (!formData.title?.trim()) errors.title = 'Task Title is required';
      if (!formData.assigneeId) errors.assigneeId = 'Designated Lead / Assignee is required';
    } else if (type === 'invoice') {
      if (!formData.companyId) errors.companyId = 'Client (Organization) is required';
      if (!formData.expectedCloseDate || formData.expectedCloseDate.trim() === '') {
        errors.expectedCloseDate = type === 'deal' ? 'Expected Close Date is required' : 'Due Date is required';
      }
      if (!formData.lineItems || formData.lineItems.length === 0) {
        errors.lineItems = 'At least one line item is required';
      } else {
        formData.lineItems.forEach((item, index) => {
          if (!item.description || !item.description.trim()) {
            errors[`lineItem_${index}_description`] = `Line item ${index + 1}: Description is required`;
          }
          if (!item.quantity || item.quantity <= 0) {
            errors[`lineItem_${index}_quantity`] = `Line item ${index + 1}: Quantity must be greater than 0`;
          }
          if (!item.rate || item.rate <= 0) {
            errors[`lineItem_${index}_rate`] = `Line item ${index + 1}: Rate must be greater than 0`;
          }
        });
        
        // Validate that total amount from line items is greater than 0
        const totalAmount = formData.lineItems.reduce((sum, item) => {
          const itemAmount = item.amount || (item.rate * item.quantity) || 0;
          return sum + itemAmount;
        }, 0);
        if (totalAmount <= 0) {
          errors.lineItems = 'Total amount must be greater than $0';
        }
      }
    }
    
    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmitting) return;

    // Clear only general error; keep field errors so validation can replace them (avoids red styling not showing)
    setError(null);

    // Validate form first – this sets fieldErrors so invalid fields show red on next render
    const isValid = validateForm();
    if (!isValid) {
      setIsSubmitting(false);
      return;
    }

    setIsSubmitting(true);

    // Troubleshoot Diagnostics
    console.debug(`[QUICK-CREATE] Deployment Start. Type: ${type}`, formData);

    try {
      const currentUser = JSON.parse(localStorage.getItem('user_data') || 'null');
      const userId = currentUser?.id;

      // Type-specific logic
      if (type === 'contact') {
        // Client-side duplicate check before submitting
        const newContact: Partial<Contact> = {
          name: formData.name,
          email: formData.email,
        };
        
        const exactDuplicates = findDuplicateContacts(newContact, contacts);
        const fuzzyDuplicates = findFuzzyDuplicateContacts(newContact, contacts, 0.8);
        
        if (exactDuplicates.length > 0 || fuzzyDuplicates.length > 0) {
          // Combine and deduplicate by contact ID (same contact might match both exact email and fuzzy name)
          // Also deduplicate by email as fallback if ID is missing
          const allDuplicatesMap = new Map<string, any>();
          const seenEmails = new Set<string>();
          
          // Add exact duplicates first (they have higher priority)
          exactDuplicates.forEach(d => {
            const contact = d.record;
            const key = contact.id || contact.email?.toLowerCase().trim() || '';
            if (key && !allDuplicatesMap.has(key)) {
              allDuplicatesMap.set(key, { ...contact, matchType: 'exact', matchReason: 'email' });
              if (contact.email) seenEmails.add(contact.email.toLowerCase().trim());
            }
          });
          
          // Add fuzzy duplicates (only if not already added as exact match)
          fuzzyDuplicates.forEach(d => {
            const contact = d.record;
            const key = contact.id || contact.email?.toLowerCase().trim() || '';
            const emailKey = contact.email?.toLowerCase().trim();
            
            // Skip if already added by ID or email
            if (key && !allDuplicatesMap.has(key) && (!emailKey || !seenEmails.has(emailKey))) {
              allDuplicatesMap.set(key, { 
                ...contact, 
                matchType: 'fuzzy', 
                matchReason: 'name',
                similarity: d.similarity 
              });
              if (emailKey) seenEmails.add(emailKey);
            }
          });
          
          const uniqueDuplicates = Array.from(allDuplicatesMap.values());
          
          setMergeModal({
            open: true,
            duplicates: uniqueDuplicates,
            newContact: {
              name: formData.name,
              email: formData.email,
              companyId: formData.companyId || undefined,
              role: formData.role,
              phone: formData.phone,
              linkedin: formData.linkedin || undefined
            }
          });
          setIsSubmitting(false);
          return;
        }
        
        await apiCreateContact({ 
          name: formData.name, 
          companyId: formData.companyId || undefined, 
          role: formData.role, 
          email: formData.email, 
          phone: formData.phone, 
          linkedin: formData.linkedin || undefined 
        });
      } else if (type === 'company') {
        // Auto-populate domain if not already set
        let domain = formData.domain;
        if (!domain && formData.website) {
          domain = extractDomain(formData.website) || undefined;
        }
        if (!domain && formData.email) {
          domain = extractDomain(formData.email) || undefined;
        }
        
        const companyPayload = { 
          name: formData.name?.trim(), 
          industry: formData.industry?.trim(),
          region: formData.region?.trim() || '',
          website: formData.website?.trim() || undefined, 
          email: formData.email?.trim() || undefined,
          domain: domain || '',
          linkedin: formData.linkedin?.trim() || undefined, 
          ownerId: formData.ownerId || userId 
        };
        
        // Ensure required fields are present
        if (!companyPayload.region) {
          setFieldErrors({ region: 'Region is required' });
          setIsSubmitting(false);
          return;
        }
        
        if (!companyPayload.domain) {
          setFieldErrors({ domain: 'Domain is required (can be auto-populated from website or email)' });
          setIsSubmitting(false);
          return;
        }
        
        await apiCreateCompany(companyPayload);
      } else if (type === 'deal') {
        // Ensure required fields are present
        if (!formData.companyId || formData.companyId.trim() === '') {
          setFieldErrors({ companyId: 'Organization is required' });
          setIsSubmitting(false);
          return;
        }
        if (!formData.value || parseFloat(formData.value) <= 0) {
          setFieldErrors({ value: 'Amount is required and must be greater than $0' });
          setIsSubmitting(false);
          return;
        }
        if (!formData.stage || formData.stage.trim() === '') {
          setFieldErrors({ stage: 'Stage is required' });
          setIsSubmitting(false);
          return;
        }
        
        // Always create sales pipeline deals
        await apiCreateDeal({ 
          title: formData.title, 
          companyId: formData.companyId.trim(), 
          value: parseFloat(formData.value), 
          currency: formData.currency || DEFAULT_CURRENCY,
          stage: formData.stage as any, 
          pipelineType: 'sales', // Always sales pipeline
          ownerId: formData.ownerId, 
          expectedCloseDate: formData.expectedCloseDate || undefined, 
          description: formData.description || undefined 
        });
      } else if (type === 'project') {
        // Double-check required fields (validateForm should have caught these, but extra safety check)
        const projectErrors: { [key: string]: string } = {};
        if (!formData.title?.trim()) projectErrors.title = 'Project Name is required';
        if (!formData.engagement?.trim()) projectErrors.engagement = 'Engagement is required';
        if (!formData.startDate?.trim()) projectErrors.startDate = 'Start Date is required';
        if (!formData.endDate?.trim()) projectErrors.endDate = 'End Date is required';
        if (!formData.ownerId?.trim()) projectErrors.ownerId = 'Assignee / Lead is required';
        
        if (formData.startDate && formData.endDate) {
          const start = new Date(formData.startDate);
          const end = new Date(formData.endDate);
          if (!isNaN(start.getTime()) && !isNaN(end.getTime()) && start >= end) {
            projectErrors.endDate = 'End Date must be after Start Date';
          }
        }
        
        if (Object.keys(projectErrors).length > 0) {
          setFieldErrors(projectErrors);
          setIsSubmitting(false);
          return;
        }
        
        console.debug('[QUICK-CREATE] Attempting Project Creation...', { 
          title: formData.title, 
          engagement: formData.engagement,
          startDate: formData.startDate,
          endDate: formData.endDate,
          ownerId: formData.ownerId 
        });
        
        const projectPayload = {
          title: formData.title.trim(), 
          engagement: formData.engagement.trim(),
          startDate: formData.startDate,
          endDate: formData.endDate,
          companyId: formData.companyId && formData.companyId.trim() !== '' ? formData.companyId : undefined, // Allow undefined for standalone projects
          status: formData.status as any, 
          ownerId: formData.ownerId, 
          projectManager: formData.ownerId, // projectManager is same as ownerId
          progress: 0, 
          description: formData.description || undefined
        };
        
        console.debug('[QUICK-CREATE] Project payload:', projectPayload);
        
        await apiCreateProject(projectPayload);
      } else if (type === 'task') {
        console.debug('[QUICK-CREATE] Attempting Task Creation...', { title: formData.title, assigneeId: formData.assigneeId });

        await apiCreateTask({ 
          title: formData.title, 
          projectId: formData.projectId || undefined, 
          description: formData.description || undefined, 
          dueDate: formData.expectedCloseDate || undefined, 
          priority: formData.priority as any, 
          status: 'Todo', 
          assigneeId: formData.assigneeId 
        });
        
        // Dispatch event to refresh tasks list
        window.dispatchEvent(new Event('refresh-tasks'));
      } else if (type === 'invoice') {
        // Ensure required fields are present
        const invoiceErrors: { [key: string]: string } = {};
        if (!formData.companyId?.trim()) invoiceErrors.companyId = 'Client (Organization) is required';
        if (!formData.expectedCloseDate?.trim()) invoiceErrors.expectedCloseDate = 'Due Date is required';
        if (!formData.lineItems || formData.lineItems.length === 0) {
          invoiceErrors.lineItems = 'At least one line item is required';
        }
        
        // Validate each line item
        if (formData.lineItems && formData.lineItems.length > 0) {
          formData.lineItems.forEach((item, index) => {
            if (!item.description || !item.description.trim()) {
              invoiceErrors[`lineItem_${index}_description`] = `Line item ${index + 1}: Description is required`;
            }
            if (!item.quantity || item.quantity <= 0) {
              invoiceErrors[`lineItem_${index}_quantity`] = `Line item ${index + 1}: Quantity must be greater than 0`;
            }
            if (!item.rate || item.rate <= 0) {
              invoiceErrors[`lineItem_${index}_rate`] = `Line item ${index + 1}: Rate must be greater than 0`;
            }
          });
        }
        
        if (Object.keys(invoiceErrors).length > 0) {
          setFieldErrors(invoiceErrors);
          setIsSubmitting(false);
          return;
        }
        
        // Calculate total amount from line items
        const lineItemsWithAmounts = formData.lineItems.map(item => ({
          description: item.description.trim(),
          quantity: item.quantity,
          rate: item.rate,
          amount: item.amount || (item.rate * item.quantity)
        }));
        
        // Calculate total from sum of all line items
        const totalAmount = lineItemsWithAmounts.reduce((sum, item) => sum + (item.amount || 0), 0);
        
        // Validate that total amount is greater than 0
        if (totalAmount <= 0) {
          setFieldErrors({ lineItems: 'At least one line item with a valid amount is required' });
          setIsSubmitting(false);
          return;
        }
        
        console.debug('[QUICK-CREATE] Creating invoice with:', {
          companyId: formData.companyId,
          amount: totalAmount,
          dueDate: formData.expectedCloseDate,
          lineItemsCount: lineItemsWithAmounts.length,
          lineItems: lineItemsWithAmounts,
          name: formData.name,
          description: formData.description
        });
        
        // Use the calculated total from line items
        await apiCreateInvoice({ 
          companyId: formData.companyId, 
          amount: totalAmount, 
          currency: formData.currency || DEFAULT_CURRENCY,
          dueDate: formData.expectedCloseDate, 
          description: formData.name || formData.description || '', // Use name field as description
          lineItems: lineItemsWithAmounts,
          items: lineItemsWithAmounts, // Also send as 'items' for backward compatibility
          status: 'Draft', 
          userId: userId || undefined 
        });
        
        // Dispatch refresh event for invoices
        window.dispatchEvent(new Event('refresh-invoices'));
      }

      console.debug('[QUICK-CREATE] Registry success. Finalizing UI update.');
      setStep('success');
      
      // Dispatch refresh event before calling onSuccess to ensure list updates
      if (type === 'project') {
        console.log('[QUICK-CREATE] Dispatching refresh-projects event');
        window.dispatchEvent(new Event('refresh-projects'));
      } else if (type === 'invoice') {
        console.log('[QUICK-CREATE] Dispatching refresh-invoices event');
        window.dispatchEvent(new Event('refresh-invoices'));
      }
      
      if (onSuccess) {
        console.log('[QUICK-CREATE] Calling onSuccess callback');
        onSuccess();
      }
      
      // Explicit delay before closing to show success state
      setTimeout(() => {
        onClose();
      }, 1500);

    } catch (err: any) {
      console.error('[QUICK-CREATE] Deployment failed:', err);
      console.error('[QUICK-CREATE] Error details:', {
        message: err.message,
        code: err.code,
        status: err.status,
        details: err.details,
        type: type
      });
      
      // Handle duplicate detection from backend (for contacts)
      if (err.code === 'DUPLICATE_DETECTED' && err.duplicates && type === 'contact') {
        // Deduplicate backend duplicates by contact ID (same contact might appear multiple times)
        const uniqueDuplicatesMap = new Map<string, any>();
        err.duplicates.forEach((dup: any) => {
          if (dup.id) {
            // Keep the first occurrence (or merge match types if needed)
            if (!uniqueDuplicatesMap.has(dup.id)) {
              uniqueDuplicatesMap.set(dup.id, dup);
            } else {
              // If already exists, prefer exact match over fuzzy match
              const existing = uniqueDuplicatesMap.get(dup.id);
              if (dup.matchType === 'exact' && existing.matchType !== 'exact') {
                uniqueDuplicatesMap.set(dup.id, dup);
              }
            }
          }
        });
        
        const uniqueDuplicates = Array.from(uniqueDuplicatesMap.values());
        
        setMergeModal({
          open: true,
          duplicates: uniqueDuplicates,
          newContact: {
            name: formData.name,
            email: formData.email,
            companyId: formData.companyId || undefined,
            role: formData.role,
            phone: formData.phone,
            linkedin: formData.linkedin || undefined
          }
        });
        setIsSubmitting(false);
        return;
      }
      
      // Handle validation errors from backend
      if (err.code === 'VALIDATION_ERROR' || (err.details && err.details.errors)) {
        const backendErrors: { [key: string]: string } = {};
        const errorMessages = err.details?.errors || (err.message ? [err.message] : []);
        
        errorMessages.forEach((errorMsg: string) => {
          const lowerMsg = errorMsg.toLowerCase();
          // Map backend error messages to field names
          if (lowerMsg.includes('name') || lowerMsg.includes('title')) {
            backendErrors.title = errorMsg;
          } else if (lowerMsg.includes('industry')) {
            backendErrors.industry = errorMsg;
          } else if (lowerMsg.includes('region')) {
            backendErrors.region = errorMsg;
          } else if (lowerMsg.includes('domain')) {
            backendErrors.domain = errorMsg;
          } else if (lowerMsg.includes('email')) {
            backendErrors.email = errorMsg;
          } else if (lowerMsg.includes('engagement')) {
            backendErrors.engagement = errorMsg;
          } else if (lowerMsg.includes('start date') || lowerMsg.includes('startdate')) {
            backendErrors.startDate = errorMsg;
          } else if (lowerMsg.includes('end date') || lowerMsg.includes('enddate')) {
            backendErrors.endDate = errorMsg;
          } else if (lowerMsg.includes('project manager') || lowerMsg.includes('manager')) {
            backendErrors.ownerId = errorMsg; // projectManager maps to ownerId field
          } else if (lowerMsg.includes('assignee') || lowerMsg.includes('lead') || lowerMsg.includes('owner')) {
            backendErrors.ownerId = errorMsg;
          } else if (lowerMsg.includes('client') || lowerMsg.includes('company')) {
            backendErrors.companyId = errorMsg;
          } else if (lowerMsg.includes('due date') || lowerMsg.includes('duedate')) {
            backendErrors.expectedCloseDate = errorMsg;
          } else if (lowerMsg.includes('line item')) {
            // Parse line item errors (e.g., "Line item 1: Description is required")
            const lineItemMatch = lowerMsg.match(/line item (\d+):\s*(.+)/);
            if (lineItemMatch) {
              const itemIndex = parseInt(lineItemMatch[1]) - 1; // Convert to 0-based index
              const errorDetail = lineItemMatch[2];
              if (errorDetail.includes('description')) {
                backendErrors[`lineItem_${itemIndex}_description`] = errorMsg;
              } else if (errorDetail.includes('quantity')) {
                backendErrors[`lineItem_${itemIndex}_quantity`] = errorMsg;
              } else if (errorDetail.includes('rate') || errorDetail.includes('amount')) {
                backendErrors[`lineItem_${itemIndex}_rate`] = errorMsg;
              }
            } else {
              // General line items error
              backendErrors.lineItems = errorMsg;
            }
          } else if (lowerMsg.includes('amount') && !lowerMsg.includes('line item')) {
            backendErrors.lineItems = errorMsg; // Amount errors relate to line items
          }
        });
        
        // If we have field-specific errors, set them
        if (Object.keys(backendErrors).length > 0) {
          setFieldErrors(backendErrors);
          setError('Please correct the validation errors below');
        } else {
          // Fallback: show general error message
          setError(err.message || 'Validation failed. Please check all required fields.');
        }
      } else {
        setError(err.message || 'Operational error. Verify mandatory fields and team authorization.');
      }
      
      setIsSubmitting(false);
    }
  };

  const getTitle = () => {
    switch(type) {
      case 'deal': return 'New Opportunity';
      case 'project': return 'New Project';
      case 'task': return 'New Task';
      case 'invoice': return 'New Invoice';
      case 'company': return 'Add Company';
      case 'contact': return 'Add Contact';
      default: return 'Quick Entry';
    }
  };

  const RequiredAsterisk = () => <span className="text-red-500 ml-1 font-black text-base">*</span>;

  if (step === 'success') {
    return (
      <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-md z-[100] flex items-center justify-center p-4">
        <div className="bg-white rounded-[40px] w-full max-w-sm p-12 text-center animate-in zoom-in-95 duration-300 shadow-2xl">
          <div className="w-24 h-24 bg-emerald-50 rounded-full flex items-center justify-center mx-auto mb-8 text-emerald-500 ring-8 ring-emerald-50/50">
            <CheckCircle2 className="w-12 h-12 animate-in zoom-in duration-500" />
          </div>
          <h3 className="text-2xl font-black text-slate-900 mb-2 tracking-tight">Deployment Success</h3>
          <p className="text-slate-500 text-sm font-medium">Record integrated into ImpactFlow OS.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-md z-[100] flex items-center justify-center p-4 animate-in fade-in duration-300">
      <div className="bg-white rounded-[48px] w-full max-w-2xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
        <div className="p-8 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
          <div className="flex items-center gap-5">
            <div className="p-4 bg-indigo-600 rounded-[20px] text-white shadow-2xl shadow-indigo-100 ring-4 ring-indigo-50">
              {(type === 'deal' || type === 'company') && <Building2 className="w-6 h-6" />}
              {type === 'project' && <FolderKanban className="w-6 h-6" />}
              {type === 'task' && <CheckSquare className="w-6 h-6" />}
              {type === 'invoice' && <FileText className="w-6 h-6" />}
              {type === 'contact' && <User className="w-6 h-6" />}
            </div>
            <div>
              <h3 className="text-2xl font-black text-slate-900 tracking-tight leading-none mb-1">{getTitle()}</h3>
              <p className="text-[10px] text-slate-400 uppercase tracking-[0.2em] font-black">Workspace Update</p>
            </div>
          </div>
          <button onClick={onClose} className="p-3 hover:bg-slate-100 rounded-full text-slate-400 transition-all"><X className="w-6 h-6" /></button>
        </div>

        <form onSubmit={handleSubmit} className="p-8 space-y-8 max-h-[75vh] overflow-y-auto custom-scrollbar">
          {!lockedType && (
            <div className="flex bg-slate-100 p-1 rounded-[20px] mb-4 overflow-x-auto scrollbar-hide border border-slate-200">
              {['deal', 'project', 'task', 'invoice', 'company', 'contact'].map(tab => (
                <button 
                  key={tab} 
                  type="button" 
                  onClick={() => setType(tab as any)} 
                  className={`flex-1 min-w-[80px] flex items-center justify-center py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all ${type === tab ? 'bg-white text-indigo-600 shadow-md border border-slate-100' : 'text-slate-400 hover:text-slate-600'}`}
                >
                  {tab}
                </button>
              ))}
            </div>
          )}

          {/* Only show general error if no field-specific errors */}
          {error && Object.keys(fieldErrors).length === 0 && (
            <div className="bg-red-50 border border-red-200 text-red-600 text-xs p-5 rounded-3xl font-bold flex items-start gap-3 animate-in slide-in-from-top-2">
              <AlertCircle className="w-5 h-5 shrink-0" /> 
              <span>{error}</span>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {/* Common Name/Title Field */}
            <div className="md:col-span-2 space-y-2">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.15em] px-1">
                {type === 'deal' || type === 'project' || type === 'task' ? 'Name' : 'Name'} <RequiredAsterisk />
              </label>
              <input 
                required 
                type="text" 
                placeholder={type === 'deal' ? "e.g., Q4 Logistics Transformation" : "Name..."} 
                value={type === 'deal' || type === 'project' || type === 'task' ? formData.title : formData.name} 
                onChange={(e) => {
                  const fieldName = type === 'deal' || type === 'project' || type === 'task' ? 'title' : 'name';
                  setFormData(prev => ({ ...prev, [fieldName]: e.target.value }));
                  // Clear error when user starts typing
                  if (fieldErrors[fieldName]) {
                    setFieldErrors(prev => {
                      const newErrors = { ...prev };
                      delete newErrors[fieldName];
                      return newErrors;
                    });
                  }
                }} 
                className={`w-full px-6 py-4 rounded-[20px] text-sm outline-none transition-all font-bold placeholder:text-slate-300 ${
                  fieldErrors.title || fieldErrors.name 
                    ? 'bg-red-50 border-2 border-red-500 focus:ring-4 focus:ring-red-100 focus:border-red-600' 
                    : 'bg-slate-50 border border-slate-200 focus:ring-4 focus:ring-indigo-50 focus:border-indigo-600'
                }`}
              />
              {(fieldErrors.title || fieldErrors.name) && (
                <p className="text-xs text-red-600 font-bold px-1 flex items-center gap-1">
                  <AlertCircle className="w-3 h-3" />
                  {fieldErrors.title || fieldErrors.name}
                </p>
              )}
            </div>

            {/* Entity Associations */}
            {(type === 'deal' || type === 'project' || type === 'invoice' || type === 'contact') && (
              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.15em] px-1">
                  Organization {(type === 'deal' || type === 'invoice') && <RequiredAsterisk />}
                </label>
                <select 
                  required={type === 'deal' || type === 'invoice'} 
                  value={formData.companyId} 
                  onChange={(e) => {
                    setFormData(prev => ({ ...prev, companyId: e.target.value }));
                    // Clear error when user selects
                    if (fieldErrors.companyId) {
                      setFieldErrors(prev => {
                        const newErrors = { ...prev };
                        delete newErrors.companyId;
                        return newErrors;
                      });
                    }
                  }} 
                  className={`w-full px-6 py-4 rounded-[20px] text-sm outline-none font-bold appearance-none bg-[length:20px_20px] bg-[right_16px_center] bg-no-repeat ${
                    fieldErrors.companyId 
                      ? 'bg-red-50 border-2 border-red-400 focus:ring-4 focus:ring-red-100 focus:border-red-500' 
                      : 'bg-slate-50 border border-slate-200 focus:ring-4 focus:ring-indigo-50'
                  } bg-[url('data:image/svg+xml;charset=utf-8,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20fill%3D%22none%22%20viewBox%3D%220%200%2020%22%3E%3Cpath%20stroke%3D%22${fieldErrors.companyId ? '%23ef4444' : '%236b7280'}%22%20stroke-linecap%3D%22round%22%20stroke-linejoin%3D%22round%22%20stroke-width%3D%221.5%22%20d%3D%22m6%208%204%204%204-4%22%2F%3E%3C%2Fsvg%3E')]`}
                >
                  <option value="">{type === 'deal' || type === 'invoice' ? 'Select Organization' : 'No Organization'}</option>
                  {companies.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
                {fieldErrors.companyId && (
                  <p className="text-xs text-red-600 font-bold px-1 flex items-center gap-1">
                    <AlertCircle className="w-3 h-3" />
                    {fieldErrors.companyId}
                  </p>
                )}
              </div>
            )}

            {/* Contact Email Field */}
            {type === 'contact' && (
              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.15em] px-1">
                  Email <RequiredAsterisk />
                </label>
                <input 
                  required
                  type="email" 
                  placeholder="contact@company.com" 
                  value={formData.email} 
                  onChange={(e) => {
                    setFormData(prev => ({ ...prev, email: e.target.value }));
                    // Clear error when user starts typing
                    if (fieldErrors.email) {
                      setFieldErrors(prev => {
                        const newErrors = { ...prev };
                        delete newErrors.email;
                        return newErrors;
                      });
                    }
                  }} 
                  className={`w-full px-6 py-4 rounded-[20px] text-sm outline-none transition-all font-bold placeholder:text-slate-300 ${
                    fieldErrors.email 
                      ? 'bg-red-50 border-2 border-red-500 focus:ring-4 focus:ring-red-100 focus:border-red-600' 
                      : 'bg-slate-50 border border-slate-200 focus:ring-4 focus:ring-indigo-50 focus:border-indigo-600'
                  }`}
                />
                {fieldErrors.email && type === 'contact' && (
                  <p className="text-xs text-red-600 font-bold px-1 flex items-center gap-1">
                    <AlertCircle className="w-3 h-3" />
                    {fieldErrors.email}
                  </p>
                )}
              </div>
            )}

            {/* Contact Role Field */}
            {type === 'contact' && (
              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.15em] px-1">Role / Title</label>
                <input 
                  type="text" 
                  placeholder="e.g., CEO, Manager" 
                  value={formData.role} 
                  onChange={(e) => setFormData(prev => ({ ...prev, role: e.target.value }))} 
                  className="w-full px-6 py-4 bg-slate-50 border border-slate-200 rounded-[20px] text-sm outline-none focus:ring-4 focus:ring-indigo-50 font-bold placeholder:text-slate-300" 
                />
              </div>
            )}

            {/* Contact Phone Field */}
            {type === 'contact' && (
              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.15em] px-1">Phone Number</label>
                <input 
                  type="tel" 
                  placeholder="+1 (555) 000-0000" 
                  value={formData.phone} 
                  onChange={(e) => setFormData(prev => ({ ...prev, phone: e.target.value }))} 
                  className="w-full px-6 py-4 bg-slate-50 border border-slate-200 rounded-[20px] text-sm outline-none focus:ring-4 focus:ring-indigo-50 font-bold placeholder:text-slate-300" 
                />
              </div>
            )}

            {/* Company Industry Field */}
            {type === 'company' && (
              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.15em] px-1">
                  Industry
                </label>
                <input 
                  type="text" 
                  placeholder="e.g., Technology, Healthcare" 
                  value={formData.industry} 
                  onChange={(e) => {
                    setFormData(prev => ({ ...prev, industry: e.target.value }));
                    if (fieldErrors.industry) {
                      setFieldErrors(prev => {
                        const newErrors = { ...prev };
                        delete newErrors.industry;
                        return newErrors;
                      });
                    }
                  }} 
                  className={`w-full px-6 py-4 rounded-[20px] text-sm outline-none transition-all font-bold placeholder:text-slate-300 ${
                    fieldErrors.industry 
                      ? 'bg-red-50 border-2 border-red-500 focus:ring-4 focus:ring-red-100 focus:border-red-600' 
                      : 'bg-slate-50 border border-slate-200 focus:ring-4 focus:ring-indigo-50 focus:border-indigo-600'
                  }`}
                />
                {fieldErrors.industry && (
                  <p className="text-xs text-red-600 font-bold px-1 flex items-center gap-1">
                    <AlertCircle className="w-3 h-3" />
                    {fieldErrors.industry}
                  </p>
                )}
              </div>
            )}

            {/* Company Region Field - Searchable Select */}
            {type === 'company' && (
              <div className="space-y-2 relative" ref={regionDropdownRef}>
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.15em] px-1">
                  Region <RequiredAsterisk />
                </label>
                <div className="relative">
                  <button
                    type="button"
                    onClick={() => {
                      setIsRegionDropdownOpen(!isRegionDropdownOpen);
                      if (!isRegionDropdownOpen) {
                        setRegionSearch('');
                      }
                    }}
                    className={`w-full px-6 py-4 rounded-[20px] text-sm outline-none transition-all font-bold text-left flex items-center justify-between ${
                      fieldErrors.region 
                        ? 'bg-red-50 border-2 border-red-500 focus:ring-4 focus:ring-red-100 focus:border-red-600' 
                        : 'bg-slate-50 border border-slate-200 focus:ring-4 focus:ring-indigo-50 focus:border-indigo-600'
                    } ${!formData.region ? 'text-slate-400' : 'text-slate-900'}`}
                  >
                    <span>{formData.region || 'Select Region'}</span>
                    <ChevronDown className={`w-4 h-4 text-slate-400 transition-transform ${isRegionDropdownOpen ? 'rotate-180' : ''}`} />
                  </button>
                  
                  {isRegionDropdownOpen && (
                    <div className="absolute z-50 w-full mt-2 bg-white border border-slate-200 rounded-[20px] shadow-2xl max-h-64 overflow-hidden">
                      {/* Search Input */}
                      <div className="p-3 border-b border-slate-100">
                        <div className="relative">
                          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                          <input
                            type="text"
                            placeholder="Search regions..."
                            value={regionSearch}
                            onChange={(e) => setRegionSearch(e.target.value)}
                            onClick={(e) => e.stopPropagation()}
                            className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold outline-none focus:ring-2 focus:ring-indigo-500"
                            autoFocus
                          />
                        </div>
                      </div>
                      
                      {/* Region Options */}
                      <div className="max-h-48 overflow-y-auto custom-scrollbar">
                        {filteredRegions.length > 0 ? (
                          filteredRegions.map((region) => (
                            <button
                              key={region}
                              type="button"
                              onClick={() => {
                                const trimmedRegion = region.trim();
                                setFormData(prev => ({ ...prev, region: trimmedRegion }));
                                setIsRegionDropdownOpen(false);
                                setRegionSearch('');
                                // Clear region error immediately when region is selected
                                setFieldErrors(prev => {
                                  const newErrors = { ...prev };
                                  delete newErrors.region;
                                  return newErrors;
                                });
                                // Also clear general error if it was about region
                                setError(null);
                              }}
                              className={`w-full px-6 py-3 text-left text-sm font-bold transition-colors hover:bg-indigo-50 ${
                                formData.region === region ? 'bg-indigo-50 text-indigo-600' : 'text-slate-900'
                              }`}
                            >
                              {region}
                            </button>
                          ))
                        ) : (
                          <div className="px-6 py-4 text-sm text-slate-400 font-bold text-center">
                            No regions found
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
                {fieldErrors.region && (
                  <p className="text-xs text-red-600 font-bold px-1 flex items-center gap-1 mt-1">
                    <AlertCircle className="w-3 h-3" />
                    {fieldErrors.region}
                  </p>
                )}
              </div>
            )}

            {/* Company Website Field */}
            {type === 'company' && (
              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.15em] px-1">Website</label>
                <input 
                  type="url" 
                  placeholder="https://www.example.com" 
                  value={formData.website} 
                  onChange={(e) => {
                    const website = e.target.value;
                    setFormData(prev => {
                      const updated = { ...prev, website };
                      // Always re-derive domain from website (or email if website empty)
                      const domainFromWebsite = website ? extractDomain(website) : null;
                      const domainFromEmail = prev.email ? extractDomain(prev.email) : null;
                      updated.domain = domainFromWebsite || domainFromEmail || '';
                      return updated;
                    });
                    if (fieldErrors.domain || fieldErrors.website) {
                      setFieldErrors(prev => {
                        const newErrors = { ...prev };
                        delete newErrors.domain;
                        delete newErrors.website;
                        return newErrors;
                      });
                    }
                  }} 
                  className={`w-full px-6 py-4 rounded-[20px] text-sm outline-none transition-all font-bold placeholder:text-slate-300 ${
                    fieldErrors.website 
                      ? 'bg-red-50 border-2 border-red-500 focus:ring-4 focus:ring-red-100 focus:border-red-600' 
                      : 'bg-slate-50 border border-slate-200 focus:ring-4 focus:ring-indigo-50 focus:border-indigo-600'
                  }`}
                />
                {fieldErrors.website && (
                  <p className="text-xs text-red-600 font-bold px-1 flex items-center gap-1">
                    <AlertCircle className="w-3 h-3" />
                    {fieldErrors.website}
                  </p>
                )}
              </div>
            )}

            {/* Company Email Field */}
            {type === 'company' && (
              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.15em] px-1">Email</label>
                <input 
                  type="email" 
                  placeholder="contact@company.com" 
                  value={formData.email} 
                  onChange={(e) => {
                    const email = e.target.value;
                    setFormData(prev => {
                      const updated = { ...prev, email };
                      // Re-derive domain: prefer website, then email
                      const domainFromWebsite = prev.website ? extractDomain(prev.website) : null;
                      const domainFromEmail = email ? extractDomain(email) : null;
                      updated.domain = domainFromWebsite || domainFromEmail || '';
                      return updated;
                    });
                    if (fieldErrors.email || fieldErrors.domain) {
                      setFieldErrors(prev => {
                        const newErrors = { ...prev };
                        delete newErrors.email;
                        delete newErrors.domain;
                        return newErrors;
                      });
                    }
                  }} 
                  className={`w-full px-6 py-4 rounded-[20px] text-sm outline-none transition-all font-bold placeholder:text-slate-300 ${
                    fieldErrors.email 
                      ? 'bg-red-50 border-2 border-red-500 focus:ring-4 focus:ring-red-100 focus:border-red-600' 
                      : 'bg-slate-50 border border-slate-200 focus:ring-4 focus:ring-indigo-50 focus:border-indigo-600'
                  }`}
                />
                {fieldErrors.email && type === 'contact' && (
                  <p className="text-xs text-red-600 font-bold px-1 flex items-center gap-1">
                    <AlertCircle className="w-3 h-3" />
                    {fieldErrors.email}
                  </p>
                )}
              </div>
            )}

            {/* Company Domain Field (read-only, auto-populated) */}
            {type === 'company' && formData.domain && (
              <div className="md:col-span-2 space-y-2">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.15em] px-1">
                  Domain <span className="text-xs text-slate-400">(auto-populated)</span>
                </label>
                <input 
                  type="text" 
                  value={formData.domain} 
                  readOnly
                  className={`w-full px-6 py-4 rounded-[20px] text-sm outline-none font-bold cursor-not-allowed ${
                    fieldErrors.domain 
                      ? 'bg-red-50 border-2 border-red-500 text-red-600' 
                      : 'bg-slate-100 border border-slate-200 text-slate-600'
                  }`}
                />
                {fieldErrors.domain && (
                  <p className="text-xs text-red-600 font-bold px-1 flex items-center gap-1">
                    <AlertCircle className="w-3 h-3" />
                    {fieldErrors.domain}
                  </p>
                )}
              </div>
            )}

            {/* Task specific Project Link */}
            {type === 'task' && (
              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.15em] px-1">Linked Project</label>
                <select 
                  value={formData.projectId || ''} 
                  onChange={(e) => {
                    const selectedProjectId = e.target.value;
                    setFormData(prev => ({ 
                      ...prev, 
                      projectId: selectedProjectId === '' ? '' : selectedProjectId // Keep empty string for "General / Standalone"
                    }));
                  }} 
                  className="w-full px-6 py-4 bg-slate-50 border border-slate-200 rounded-[20px] text-sm outline-none focus:ring-4 focus:ring-indigo-50 focus:border-indigo-600 transition-all font-bold appearance-none bg-[url('data:image/svg+xml;charset=utf-8,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20fill%3D%22none%22%20viewBox%3D%220%200%2020%22%3E%3Cpath%20stroke%3D%22%236b7280%22%20stroke-linecap%3D%22round%22%20stroke-linejoin%3D%22round%22%20stroke-width%3D%221.5%22%20d%3D%22m6%208%204%204%204-4%22%2F%3E%3C%2Fsvg%3E')] bg-[length:20px_20px] bg-[right_16px_center] bg-no-repeat"
                >
                  <option value="">None</option>
                  {projects.filter((p: Project) => p.status === 'Active').map((p: Project) => (
                    <option key={p.id} value={p.id}>{p.title}</option>
                  ))}
                </select>
              </div>
            )}

            {/* Ownership/Assignment */}
            <div className="space-y-2">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.15em] px-1">
                Assignee / Lead <RequiredAsterisk />
              </label>
              <select 
                required 
                value={type === 'task' ? formData.assigneeId : formData.ownerId} 
                onChange={(e) => {
                  const fieldName = type === 'task' ? 'assigneeId' : 'ownerId';
                  setFormData(prev => ({ ...prev, [fieldName]: e.target.value }));
                  // Clear error when user selects
                  if (fieldErrors[fieldName]) {
                    setFieldErrors(prev => {
                      const newErrors = { ...prev };
                      delete newErrors[fieldName];
                      return newErrors;
                    });
                  }
                }} 
                  className={`w-full px-6 py-4 rounded-[20px] text-sm outline-none font-bold appearance-none ${
                    fieldErrors.ownerId || fieldErrors.assigneeId 
                      ? 'bg-red-50 border-2 border-red-500 focus:ring-4 focus:ring-red-100 focus:border-red-600' 
                      : 'bg-slate-50 border border-slate-200 focus:ring-4 focus:ring-indigo-50 focus:border-indigo-600'
                  }`}
              >
                <option value="">Select Resource Personnel</option>
                {users.map(u => <option key={u.id} value={u.id}>{u.name}</option>)}
              </select>
              {(fieldErrors.ownerId || fieldErrors.assigneeId) && (
                <p className="text-xs text-red-600 font-bold px-1 flex items-center gap-1">
                  <AlertCircle className="w-3 h-3" />
                  {fieldErrors.ownerId || fieldErrors.assigneeId}
                </p>
              )}
            </div>

            {/* Financial Value - Only for Deals */}
            {type === 'deal' && (
              <div className="space-y-2">
                 <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.15em] px-1">
                   Value <RequiredAsterisk />
                 </label>
                 <div className="flex gap-3">
                   {/* Currency Dropdown */}
                   <div className="relative w-32">
                     <select
                       value={formData.currency || DEFAULT_CURRENCY}
                       onChange={(e) => {
                         setFormData(prev => ({ ...prev, currency: e.target.value }));
                       }}
                       className="w-full px-4 py-4 rounded-[20px] text-sm outline-none font-bold appearance-none bg-slate-50 border border-slate-200 focus:ring-4 focus:ring-indigo-50 text-indigo-600 cursor-pointer"
                       style={{
                         backgroundImage: `url('data:image/svg+xml;charset=utf-8,%3Csvg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 20 20"%3E%3Cpath stroke="%236b7280" stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="m6 8 4 4 4-4"/%3E%3C/svg%3E')`,
                         backgroundRepeat: 'no-repeat',
                         backgroundPosition: 'right 12px center',
                         backgroundSize: '16px'
                       }}
                     >
                       {CURRENCIES.map(currency => (
                         <option key={currency.code} value={currency.code}>
                           {currency.code} ({currency.symbol})
                         </option>
                       ))}
                     </select>
                   </div>
                   
                   {/* Value Input */}
                   <div className="relative flex-1">
                     <span className="absolute left-6 top-1/2 -translate-y-1/2 text-indigo-500 font-black text-sm">
                       {getCurrencySymbol(formData.currency)}
                     </span>
                     <input 
                      required 
                      type="number" 
                      step="0.01"
                      placeholder="0.00" 
                      value={formData.value} 
                      onChange={(e) => {
                        setFormData(prev => ({ ...prev, value: e.target.value }));
                        // Clear error when user starts typing
                        if (fieldErrors.value) {
                          setFieldErrors(prev => {
                            const newErrors = { ...prev };
                            delete newErrors.value;
                            return newErrors;
                          });
                        }
                      }} 
                      className={`w-full pl-12 pr-6 py-4 rounded-[20px] text-sm outline-none font-black transition-all ${
                        fieldErrors.value 
                          ? 'bg-red-50 border-2 border-red-500 focus:ring-4 focus:ring-red-100 focus:border-red-600 text-red-600' 
                          : 'bg-slate-50 border border-slate-200 focus:ring-4 focus:ring-indigo-50 text-indigo-600'
                      }`}
                     />
                   </div>
                 </div>
                 {fieldErrors.value && (
                   <p className="text-xs text-red-600 font-bold px-1 flex items-center gap-1">
                     <AlertCircle className="w-3 h-3" />
                     {fieldErrors.value}
                   </p>
                 )}
              </div>
            )}

            {/* Invoice Currency Selection - Before Line Items */}
            {type === 'invoice' && (
              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.15em] px-1">
                  Currency
                </label>
                <div className="relative w-full">
                  <select
                    value={formData.currency || DEFAULT_CURRENCY}
                    onChange={(e) => {
                      setFormData(prev => ({ ...prev, currency: e.target.value }));
                    }}
                    className="w-full px-4 py-4 rounded-[20px] text-sm outline-none font-bold appearance-none bg-slate-50 border border-slate-200 focus:ring-4 focus:ring-indigo-50 text-indigo-600 cursor-pointer"
                    style={{
                      backgroundImage: `url('data:image/svg+xml;charset=utf-8,%3Csvg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 20 20"%3E%3Cpath stroke="%236b7280" stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="m6 8 4 4 4-4"/%3E%3C/svg%3E')`,
                      backgroundRepeat: 'no-repeat',
                      backgroundPosition: 'right 12px center',
                      backgroundSize: '16px'
                    }}
                  >
                    {CURRENCIES.map(currency => (
                      <option key={currency.code} value={currency.code}>
                        {currency.code} ({currency.symbol})
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            )}

            {/* Line Items - Required for Invoice */}
            {type === 'invoice' && (
              <div className="md:col-span-2 space-y-2">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.15em] px-1">
                  Line Items <RequiredAsterisk />
                </label>
                <div className="space-y-3">
                  {formData.lineItems.map((item, index) => (
                    <div key={index} className="p-4 bg-slate-50 border border-slate-200 rounded-[20px] space-y-3">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-xs font-bold text-slate-600">Item {index + 1}</span>
                        {formData.lineItems.length > 1 && (
                          <button
                            type="button"
                            onClick={() => {
                              const newLineItems = formData.lineItems.filter((_, i) => i !== index);
                              setFormData(prev => ({ ...prev, lineItems: newLineItems }));
                              // Clear errors for this item
                              setFieldErrors(prev => {
                                const newErrors = { ...prev };
                                delete newErrors[`lineItem_${index}_description`];
                                delete newErrors[`lineItem_${index}_quantity`];
                                delete newErrors[`lineItem_${index}_rate`];
                                return newErrors;
                              });
                            }}
                            className="text-red-500 hover:text-red-700 text-xs font-bold"
                          >
                            Remove
                          </button>
                        )}
                      </div>
                      
                      {/* Description */}
                      <div>
                        <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest px-1 mb-1 block">
                          Description <span className="text-red-500">*</span>
                        </label>
                        <input
                          type="text"
                          placeholder="Item description"
                          value={item.description}
                          onChange={(e) => {
                            const newLineItems = [...formData.lineItems];
                            newLineItems[index] = { ...newLineItems[index], description: e.target.value };
                            setFormData(prev => ({ ...prev, lineItems: newLineItems }));
                            // Clear error
                            if (fieldErrors[`lineItem_${index}_description`]) {
                              setFieldErrors(prev => {
                                const newErrors = { ...prev };
                                delete newErrors[`lineItem_${index}_description`];
                                return newErrors;
                              });
                            }
                          }}
                          className={`w-full px-4 py-2 rounded-xl text-sm outline-none font-bold transition-all ${
                            fieldErrors[`lineItem_${index}_description`]
                              ? 'bg-red-50 border-2 border-red-500 focus:ring-4 focus:ring-red-100'
                              : 'bg-white border border-slate-200 focus:ring-4 focus:ring-indigo-50'
                          }`}
                        />
                        {fieldErrors[`lineItem_${index}_description`] && (
                          <p className="text-xs text-red-600 font-bold px-1 mt-1">
                            {fieldErrors[`lineItem_${index}_description`]}
                          </p>
                        )}
                      </div>

                      {/* Quantity and Rate */}
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest px-1 mb-1 block">
                            Quantity <span className="text-red-500">*</span>
                          </label>
                          <input
                            type="number"
                            step="0.01"
                            min="0.01"
                            placeholder="1"
                            value={item.quantity || ''}
                            onChange={(e) => {
                              const quantity = parseFloat(e.target.value) || 0;
                              const rate = item.rate || 0;
                              const newLineItems = [...formData.lineItems];
                              newLineItems[index] = {
                                ...newLineItems[index],
                                quantity,
                                amount: quantity * rate
                              };
                              setFormData(prev => ({ ...prev, lineItems: newLineItems }));
                              // Clear error
                              if (fieldErrors[`lineItem_${index}_quantity`]) {
                                setFieldErrors(prev => {
                                  const newErrors = { ...prev };
                                  delete newErrors[`lineItem_${index}_quantity`];
                                  return newErrors;
                                });
                              }
                            }}
                            className={`w-full px-4 py-2 rounded-xl text-sm outline-none font-bold transition-all ${
                              fieldErrors[`lineItem_${index}_quantity`]
                                ? 'bg-red-50 border-2 border-red-500 focus:ring-4 focus:ring-red-100'
                                : 'bg-white border border-slate-200 focus:ring-4 focus:ring-indigo-50'
                            }`}
                          />
                          {fieldErrors[`lineItem_${index}_quantity`] && (
                            <p className="text-xs text-red-600 font-bold px-1 mt-1">
                              {fieldErrors[`lineItem_${index}_quantity`]}
                            </p>
                          )}
                        </div>
                        <div>
                          <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest px-1 mb-1 block">
                            Rate ({getCurrencySymbol(formData.currency)}) <span className="text-red-500">*</span>
                          </label>
                          <input
                            type="number"
                            step="0.01"
                            min="0.01"
                            placeholder="0.00"
                            value={item.rate || ''}
                            onChange={(e) => {
                              const rate = parseFloat(e.target.value) || 0;
                              const quantity = item.quantity || 0;
                              const newLineItems = [...formData.lineItems];
                              newLineItems[index] = {
                                ...newLineItems[index],
                                rate,
                                amount: quantity * rate
                              };
                              setFormData(prev => ({ ...prev, lineItems: newLineItems }));
                              // Clear error
                              if (fieldErrors[`lineItem_${index}_rate`]) {
                                setFieldErrors(prev => {
                                  const newErrors = { ...prev };
                                  delete newErrors[`lineItem_${index}_rate`];
                                  return newErrors;
                                });
                              }
                            }}
                            className={`w-full px-4 py-2 rounded-xl text-sm outline-none font-bold transition-all ${
                              fieldErrors[`lineItem_${index}_rate`]
                                ? 'bg-red-50 border-2 border-red-500 focus:ring-4 focus:ring-red-100'
                                : 'bg-white border border-slate-200 focus:ring-4 focus:ring-indigo-50'
                            }`}
                          />
                          {fieldErrors[`lineItem_${index}_rate`] && (
                            <p className="text-xs text-red-600 font-bold px-1 mt-1">
                              {fieldErrors[`lineItem_${index}_rate`]}
                            </p>
                          )}
                        </div>
                      </div>

                      {/* Amount (calculated) */}
                      <div>
                        <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest px-1 mb-1 block">
                          Amount
                        </label>
                        <div className="px-4 py-2 bg-indigo-50 border border-indigo-200 rounded-xl">
                          <p className="text-sm font-black text-indigo-600">
                            {getCurrencySymbol(formData.currency)}{((item.quantity || 0) * (item.rate || 0)).toFixed(2)}
                          </p>
                        </div>
                      </div>
                    </div>
                  ))}
                  
                  {/* Add Line Item Button */}
                  <button
                    type="button"
                    onClick={() => {
                      setFormData(prev => ({
                        ...prev,
                        lineItems: [...prev.lineItems, { description: '', quantity: 1, rate: 0, amount: 0 }]
                      }));
                      // Clear lineItems error when adding first item
                      if (fieldErrors.lineItems) {
                        setFieldErrors(prev => {
                          const newErrors = { ...prev };
                          delete newErrors.lineItems;
                          return newErrors;
                        });
                      }
                    }}
                    className="w-full px-4 py-3 bg-indigo-50 border-2 border-dashed border-indigo-300 rounded-xl text-sm font-bold text-indigo-600 hover:bg-indigo-100 hover:border-indigo-400 transition-colors flex items-center justify-center gap-2"
                  >
                    <Plus className="w-4 h-4" />
                    Add Line Item
                  </button>
                  
                  {fieldErrors.lineItems && (
                    <p className="text-xs text-red-600 font-bold px-1 flex items-center gap-1">
                      <AlertCircle className="w-3 h-3" />
                      {fieldErrors.lineItems}
                    </p>
                  )}
                </div>
                
                {/* Total Amount - Calculated from Line Items (Read-only) */}
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.15em] px-1">
                    Total Amount ({getCurrencySymbol(formData.currency)})
                  </label>
                  <div className="relative">
                    <DollarSign className="absolute left-6 top-1/2 -translate-y-1/2 w-4 h-4 text-indigo-500" />
                    <div className="w-full pl-12 pr-6 py-4 rounded-[20px] text-sm font-black bg-indigo-50 border-2 border-indigo-200 text-indigo-600">
                      {getCurrencySymbol(formData.currency)}{formData.lineItems.reduce((sum, item) => {
                        const itemAmount = item.amount || (item.rate * item.quantity) || 0;
                        return sum + itemAmount;
                      }, 0).toFixed(2)}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Deal Stage Field */}
            {type === 'deal' && (
              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.15em] px-1">
                  Stage <RequiredAsterisk />
                </label>
                <select 
                  required
                  value={formData.stage} 
                  onChange={(e) => {
                    setFormData(prev => ({ ...prev, stage: e.target.value }));
                    // Clear error when user selects
                    if (fieldErrors.stage) {
                      setFieldErrors(prev => {
                        const newErrors = { ...prev };
                        delete newErrors.stage;
                        return newErrors;
                      });
                    }
                  }} 
                  className={`w-full px-6 py-4 rounded-[20px] text-sm outline-none font-bold appearance-none bg-[length:20px_20px] bg-[right_16px_center] bg-no-repeat ${
                    fieldErrors.stage 
                      ? 'bg-red-50 border-2 border-red-400 focus:ring-4 focus:ring-red-100 focus:border-red-500' 
                      : 'bg-slate-50 border border-slate-200 focus:ring-4 focus:ring-indigo-50'
                  } bg-[url('data:image/svg+xml;charset=utf-8,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20fill%3D%22none%22%20viewBox%3D%220%200%2020%22%3E%3Cpath%20stroke%3D%22${fieldErrors.stage ? '%23ef4444' : '%236b7280'}%22%20stroke-linecap%3D%22round%22%20stroke-linejoin%3D%22round%22%20stroke-width%3D%221.5%22%20d%3D%22m6%208%204%204%204-4%22%2F%3E%3C%2Fsvg%3E')]`}
                >
                  <option value="">Select Stage</option>
                  <option value="Discovery">Discovery</option>
                  <option value="Proposal">Proposal</option>
                  <option value="Negotiation">Negotiation</option>
                  <option value="Won">Won</option>
                  <option value="Lost">Lost</option>
                </select>
                {fieldErrors.stage && (
                  <p className="text-xs text-red-600 font-bold px-1 flex items-center gap-1">
                    <AlertCircle className="w-3 h-3" />
                    {fieldErrors.stage}
                  </p>
                )}
              </div>
            )}

            {/* Project Engagement Field */}
            {type === 'project' && (
              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.15em] px-1">
                  Engagement <RequiredAsterisk />
                </label>
                <input 
                  required
                  type="text" 
                  placeholder="e.g., Consulting, Implementation, Support" 
                  value={formData.engagement} 
                  onChange={(e) => {
                    setFormData(prev => ({ ...prev, engagement: e.target.value }));
                    // Clear error when user starts typing
                    if (fieldErrors.engagement) {
                      setFieldErrors(prev => {
                        const newErrors = { ...prev };
                        delete newErrors.engagement;
                        return newErrors;
                      });
                    }
                  }} 
                  className={`w-full px-6 py-4 rounded-[20px] text-sm outline-none transition-all font-bold placeholder:text-slate-300 ${
                    fieldErrors.engagement 
                      ? 'bg-red-50 border-2 border-red-500 focus:ring-4 focus:ring-red-100 focus:border-red-600' 
                      : 'bg-slate-50 border border-slate-200 focus:ring-4 focus:ring-indigo-50 focus:border-indigo-600'
                  }`}
                />
                {fieldErrors.engagement && (
                  <p className="text-xs text-red-600 font-bold px-1 flex items-center gap-1">
                    <AlertCircle className="w-3 h-3" />
                    {fieldErrors.engagement}
                  </p>
                )}
              </div>
            )}

            {/* Project Start Date Field */}
            {type === 'project' && (
              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.15em] px-1">
                  Start Date <RequiredAsterisk />
                </label>
                <div className="relative">
                  <Calendar className="absolute left-6 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <input 
                    required
                    type="date" 
                    value={formData.startDate} 
                    onChange={(e) => {
                      setFormData(prev => ({ ...prev, startDate: e.target.value }));
                      // Clear error when user selects
                      if (fieldErrors.startDate) {
                        setFieldErrors(prev => {
                          const newErrors = { ...prev };
                          delete newErrors.startDate;
                          return newErrors;
                        });
                      }
                      // Validate end date if both dates are set
                      if (e.target.value && formData.endDate) {
                        const start = new Date(e.target.value);
                        const end = new Date(formData.endDate);
                        if (!isNaN(start.getTime()) && !isNaN(end.getTime()) && start >= end) {
                          setFieldErrors(prev => ({ ...prev, endDate: 'End Date must be after Start Date' }));
                        } else if (fieldErrors.endDate === 'End Date must be after Start Date') {
                          setFieldErrors(prev => {
                            const newErrors = { ...prev };
                            delete newErrors.endDate;
                            return newErrors;
                          });
                        }
                      }
                    }} 
                    className={`w-full pl-12 pr-6 py-4 rounded-[20px] text-sm outline-none font-bold transition-all ${
                      fieldErrors.startDate 
                        ? 'bg-red-50 border-2 border-red-500 focus:ring-4 focus:ring-red-100 focus:border-red-600' 
                        : 'bg-slate-50 border border-slate-200 focus:ring-4 focus:ring-indigo-50'
                    }`}
                  />
                </div>
                {fieldErrors.startDate && (
                  <p className="text-xs text-red-600 font-bold px-1 flex items-center gap-1">
                    <AlertCircle className="w-3 h-3" />
                    {fieldErrors.startDate}
                  </p>
                )}
              </div>
            )}

            {/* Project End Date Field */}
            {type === 'project' && (
              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.15em] px-1">
                  End Date <RequiredAsterisk />
                </label>
                <div className="relative">
                  <Calendar className="absolute left-6 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <input 
                    required
                    type="date" 
                    value={formData.endDate} 
                    onChange={(e) => {
                      setFormData(prev => ({ ...prev, endDate: e.target.value }));
                      // Clear error when user selects
                      if (fieldErrors.endDate) {
                        setFieldErrors(prev => {
                          const newErrors = { ...prev };
                          delete newErrors.endDate;
                          return newErrors;
                        });
                      }
                      // Validate end date if both dates are set
                      if (formData.startDate && e.target.value) {
                        const start = new Date(formData.startDate);
                        const end = new Date(e.target.value);
                        if (!isNaN(start.getTime()) && !isNaN(end.getTime()) && start >= end) {
                          setFieldErrors(prev => ({ ...prev, endDate: 'End Date must be after Start Date' }));
                        }
                      }
                    }} 
                    className={`w-full pl-12 pr-6 py-4 rounded-[20px] text-sm outline-none font-bold transition-all ${
                      fieldErrors.endDate 
                        ? 'bg-red-50 border-2 border-red-500 focus:ring-4 focus:ring-red-100 focus:border-red-600' 
                        : 'bg-slate-50 border border-slate-200 focus:ring-4 focus:ring-indigo-50'
                    }`}
                  />
                </div>
                {fieldErrors.endDate && (
                  <p className="text-xs text-red-600 font-bold px-1 flex items-center gap-1">
                    <AlertCircle className="w-3 h-3" />
                    {fieldErrors.endDate}
                  </p>
                )}
              </div>
            )}

            {/* Due Date - Required for Invoice */}
            {type === 'invoice' && (
              <div className="md:col-span-2 space-y-2">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.15em] px-1">
                  Due Date <RequiredAsterisk />
                </label>
                <div className="relative">
                  <Calendar className="absolute left-6 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <input 
                    required
                    type="date" 
                    value={formData.expectedCloseDate} 
                    onChange={(e) => {
                      setFormData(prev => ({ ...prev, expectedCloseDate: e.target.value }));
                      // Clear error when user selects
                      if (fieldErrors.expectedCloseDate) {
                        setFieldErrors(prev => {
                          const newErrors = { ...prev };
                          delete newErrors.expectedCloseDate;
                          return newErrors;
                        });
                      }
                    }} 
                    className={`w-full pl-12 pr-6 py-4 rounded-[20px] text-sm outline-none font-bold transition-all ${
                      fieldErrors.expectedCloseDate 
                        ? 'bg-red-50 border-2 border-red-500 focus:ring-4 focus:ring-red-100 focus:border-red-600' 
                        : 'bg-slate-50 border border-slate-200 focus:ring-4 focus:ring-indigo-50'
                    }`}
                  />
                </div>
                {fieldErrors.expectedCloseDate && (
                  <p className="text-xs text-red-600 font-bold px-1 flex items-center gap-1">
                    <AlertCircle className="w-3 h-3" />
                    {fieldErrors.expectedCloseDate}
                  </p>
                )}
              </div>
            )}

            {/* Expected Close Date / Due Date - Conditional label based on type */}
            {type !== 'invoice' && (
              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.15em] px-1">
                  {type === 'deal' ? 'Expected Close Date' : 'Due Date'}
                </label>
                <div className="relative">
                  <Calendar className="absolute left-6 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <input 
                    type="date" 
                    value={formData.expectedCloseDate} 
                    onChange={(e) => setFormData(prev => ({ ...prev, expectedCloseDate: e.target.value }))} 
                    className="w-full pl-12 pr-6 py-4 bg-slate-50 border border-slate-200 rounded-[20px] text-sm outline-none focus:ring-4 focus:ring-indigo-50 font-bold" 
                  />
                </div>
              </div>
            )}

            {/* Task Priority */}
            {type === 'task' && (
              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.15em] px-1">Priority</label>
                <div className="flex gap-2 p-1 bg-slate-100 rounded-2xl border border-slate-200">
                  {['Low', 'Medium', 'High'].map(p => (
                    <button
                      key={p}
                      type="button"
                      onClick={() => setFormData({...formData, priority: p as any})}
                      className={`flex-1 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${formData.priority === p ? 'bg-white text-indigo-600 shadow-md' : 'text-slate-400'}`}
                    >
                      {p}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Context/Description Area */}
            <div className="md:col-span-2 space-y-2">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.15em] px-1">Description</label>
              <textarea 
                placeholder="Add Context or Notes..." 
                value={formData.description} 
                onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))} 
                rows={3} 
                className="w-full px-6 py-5 bg-slate-50 border border-slate-200 rounded-[32px] text-sm outline-none focus:ring-4 focus:ring-indigo-50 resize-none font-medium placeholder:text-slate-300" 
              />
            </div>
          </div>

          <div className="flex gap-6 pt-6 border-t border-slate-100">
            <button type="button" onClick={onClose} className="flex-1 py-5 text-sm font-black text-slate-400 hover:text-slate-600 transition-all uppercase tracking-[0.2em]">CANCEL</button>
            <button 
              type="submit" 
              disabled={isSubmitting} 
              className="flex-[2] py-5 bg-slate-900 text-white font-black uppercase text-xs tracking-[0.25em] rounded-[24px] shadow-2xl shadow-indigo-100 hover:bg-indigo-700 active:scale-95 transition-all flex items-center justify-center gap-4 disabled:opacity-50"
            >
              {isSubmitting ? <Loader2 className="w-5 h-5 animate-spin" /> : <Save className="w-5 h-5" />}
              SAVE
            </button>
          </div>
        </form>
      </div>

      {/* Merge Confirmation Modal for Contacts */}
      {mergeModal && mergeModal.open && (
        <div className="fixed inset-0 z-[100] overflow-hidden">
          <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={() => !isMerging && setMergeModal(null)} />
          <div className="absolute inset-0 flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl w-full max-w-2xl shadow-2xl max-h-[90vh] overflow-hidden flex flex-col">
              <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
                <div>
                  <h3 className="text-lg font-bold text-slate-900">Potential Duplicate Contact</h3>
                  <p className="text-sm text-slate-500 mt-1">
                    {mergeModal.duplicates.some((d: any) => d.matchType === 'exact' || d.matchReason === 'email')
                      ? 'A contact with this email already exists'
                      : 'A contact with a similar name was found'}
                  </p>
                </div>
                <button
                  onClick={() => !isMerging && setMergeModal(null)}
                  className="p-2 hover:bg-white rounded-full text-slate-400 transition-colors"
                  disabled={isMerging}
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
              
              <div className="p-6 overflow-y-auto flex-1">
                <div className="space-y-4">
                  <div className="bg-indigo-50 border border-indigo-200 rounded-xl p-4">
                    <p className="text-xs font-bold text-indigo-900 uppercase tracking-wider mb-2">New Contact Data</p>
                    <p className="font-semibold text-slate-900">{mergeModal.newContact.name || '—'}</p>
                    {mergeModal.newContact.email && (
                      <p className="text-sm text-slate-600 mt-1">{mergeModal.newContact.email}</p>
                    )}
                    {mergeModal.newContact.phone && (
                      <p className="text-xs text-slate-600 mt-1">📞 {mergeModal.newContact.phone}</p>
                    )}
                    {mergeModal.newContact.role && (
                      <p className="text-xs text-slate-600 mt-1">💼 {mergeModal.newContact.role}</p>
                    )}
                  </div>
                  
                  <div>
                    <p className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-3">Existing Contact{mergeModal.duplicates.length > 1 ? 's' : ''}</p>
                    <div className="space-y-3">
                      {mergeModal.duplicates.map((duplicate: any, idx: number) => (
                        <div key={duplicate.id || idx} className="border border-slate-200 rounded-xl p-4 bg-slate-50">
                          <div className="flex items-start justify-between gap-4">
                            <div className="flex-1">
                              <p className="font-semibold text-slate-900">{duplicate.name || '—'}</p>
                              {duplicate.email && (
                                <p className="text-sm text-slate-600 mt-1">{duplicate.email}</p>
                              )}
                              <div className="mt-2 space-y-1">
                                {duplicate.role ? (
                                  <p className="text-xs text-slate-500">💼 {duplicate.role}</p>
                                ) : mergeModal.newContact.role && (
                                  <p className="text-xs text-amber-600 font-medium">💼 {mergeModal.newContact.role} (will be added)</p>
                                )}
                                {duplicate.phone ? (
                                  <p className="text-xs text-slate-500">📞 {duplicate.phone}</p>
                                ) : mergeModal.newContact.phone && (
                                  <p className="text-xs text-amber-600 font-medium">📞 {mergeModal.newContact.phone} (will be added)</p>
                                )}
                                {!duplicate.companyId && mergeModal.newContact.companyId && (
                                  <p className="text-xs text-amber-600 font-medium">🏢 Organization (will be linked)</p>
                                )}
                              </div>
                              {duplicate.matchType === 'fuzzy' && duplicate.similarity && (
                                <p className="text-xs text-amber-600 mt-2 font-medium">
                                  {Math.round(duplicate.similarity * 100)}% name similarity
                                </p>
                              )}
                              {duplicate.matchType === 'exact' && (
                                <p className="text-xs text-red-600 mt-2 font-medium">Exact email match</p>
                              )}
                            </div>
                            <button
                              onClick={async () => {
                                if (isMerging) return;
                                setIsMerging(true);
                                try {
                                  // Intelligently merge: fill missing fields with new data, prefer non-empty values
                                  const updateData: any = {};
                                  
                                  // Name: prefer existing if both exist, otherwise use new
                                  if (mergeModal.newContact.name) {
                                    if (!duplicate.name || duplicate.name.trim() === '') {
                                      updateData.name = mergeModal.newContact.name;
                                    } else if (mergeModal.newContact.name.trim() !== duplicate.name.trim()) {
                                      // If both exist but different, prefer the more complete one
                                      updateData.name = mergeModal.newContact.name;
                                    }
                                  }
                                  
                                  // Email: prefer existing if both exist (email shouldn't change)
                                  if (mergeModal.newContact.email && (!duplicate.email || duplicate.email.trim() === '')) {
                                    updateData.email = mergeModal.newContact.email;
                                  }
                                  
                                  // Phone: merge if existing is empty or missing
                                  if (mergeModal.newContact.phone) {
                                    if (!duplicate.phone || duplicate.phone.trim() === '') {
                                      updateData.phone = mergeModal.newContact.phone;
                                    }
                                  }
                                  
                                  // Role: merge if existing is empty or missing
                                  if (mergeModal.newContact.role) {
                                    if (!duplicate.role || duplicate.role.trim() === '') {
                                      updateData.role = mergeModal.newContact.role;
                                    }
                                  }
                                  
                                  // Company: merge if existing is empty or missing
                                  if (mergeModal.newContact.companyId) {
                                    if (!duplicate.companyId || duplicate.companyId.trim() === '') {
                                      updateData.companyId = mergeModal.newContact.companyId;
                                    }
                                  }
                                  
                                  // LinkedIn: merge if existing is empty or missing
                                  if (mergeModal.newContact.linkedin) {
                                    if (!duplicate.linkedin || duplicate.linkedin.trim() === '') {
                                      updateData.linkedin = mergeModal.newContact.linkedin;
                                    }
                                  }
                                  
                                  if (Object.keys(updateData).length > 0) {
                                    await apiUpdateContact(duplicate.id, updateData);
                                  }
                                  
                                  setMergeModal(null);
                                  setStep('success');
                                  if (onSuccess) onSuccess();
                                  setTimeout(() => onClose(), 1500);
                                } catch (err: any) {
                                  console.error('[MERGE] Failed:', err);
                                  setError(err.message || 'Merge failed');
                                  setIsMerging(false);
                                }
                              }}
                              disabled={isMerging}
                              className="px-4 py-2 bg-indigo-600 text-white text-sm font-semibold rounded-xl hover:bg-indigo-700 flex items-center gap-2 disabled:opacity-60 transition-all whitespace-nowrap"
                            >
                              {isMerging ? <Loader2 className="w-4 h-4 animate-spin" /> : <Merge className="w-4 h-4" />}
                              Merge
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
              
              <div className="p-6 border-t border-slate-100 flex gap-3">
                <button
                  type="button"
                  onClick={() => setMergeModal(null)}
                  className="flex-1 py-3 text-sm font-bold text-slate-500 hover:bg-slate-50 rounded-xl border border-slate-200 transition-colors"
                  disabled={isMerging}
                >
                  Cancel
                </button>
                <button
                  onClick={async () => {
                    if (isMerging) return;
                    setIsMerging(true);
                    try {
                      // Create anyway (user confirmed it's not a duplicate)
                      await apiCreateContact(mergeModal.newContact);
                      setMergeModal(null);
                      setStep('success');
                      if (onSuccess) onSuccess();
                      setTimeout(() => onClose(), 1500);
                    } catch (err: any) {
                      console.error('[CREATE] Failed:', err);
                      setError(err.message || 'Failed to create contact');
                      setIsMerging(false);
                      setMergeModal(null);
                    }
                  }}
                  disabled={isMerging}
                  className="flex-[2] py-3 bg-slate-900 text-white text-sm font-bold rounded-xl hover:bg-indigo-700 flex items-center justify-center gap-2 disabled:opacity-60 transition-all"
                >
                  {isMerging ? <Loader2 className="w-5 h-5 animate-spin" /> : <Plus className="w-5 h-5" />}
                  Create Anyway
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default QuickCreateModal;

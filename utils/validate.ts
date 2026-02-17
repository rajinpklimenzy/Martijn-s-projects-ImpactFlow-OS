/**
 * Data Validation Utilities
 * Enforces required fields, format validation, and business rules
 */

import { Company, Contact, Deal, Project, Invoice } from '../types';

/**
 * Clean and format a name for display
 * - Removes trailing IDs/hashes (alphanumeric strings at the end)
 * - Proper capitalization (Title Case)
 * - Removes extra whitespace
 * - Handles edge cases
 */
export const formatNameForDisplay = (name: string | null | undefined): string => {
  if (!name || typeof name !== 'string') return '';
  
  let cleaned = name.trim();
  
  // Remove trailing alphanumeric IDs/hashes (e.g., "Rajin Pk 714295b8" -> "Rajin Pk")
  // Pattern: space followed by 6+ alphanumeric characters at the end
  cleaned = cleaned.replace(/\s+[a-zA-Z0-9]{6,}$/, '');
  
  // Remove common prefixes/suffixes that shouldn't be in names
  cleaned = cleaned.replace(/^(test|Test|TEST)\s+/i, ''); // Remove "test" prefix
  cleaned = cleaned.replace(/\s+(test|Test|TEST)$/i, ''); // Remove "test" suffix
  
  // Remove extra whitespace
  cleaned = cleaned.replace(/\s+/g, ' ').trim();
  
  // Convert to Title Case (capitalize first letter of each word)
  cleaned = cleaned
    .toLowerCase()
    .split(' ')
    .map(word => {
      // Skip very short words unless it's the first word
      if (word.length <= 1) return word;
      // Capitalize first letter
      return word.charAt(0).toUpperCase() + word.slice(1);
    })
    .join(' ');
  
  // Handle special cases (Mc, Mac, O', etc.)
  cleaned = cleaned.replace(/\bMc([a-z])/g, (match, letter) => `Mc${letter.toUpperCase()}`);
  cleaned = cleaned.replace(/\bMac([a-z])/g, (match, letter) => `Mac${letter.toUpperCase()}`);
  cleaned = cleaned.replace(/\bO'([a-z])/g, (match, letter) => `O'${letter.toUpperCase()}`);
  
  return cleaned;
};

/**
 * RFC 5322 compliant email validation
 */
export const isValidEmail = (email: string): boolean => {
  if (!email || typeof email !== 'string') return false;
  
  // RFC 5322 compliant regex (simplified but covers most cases)
  const emailRegex = /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/;
  return emailRegex.test(email.trim());
};

/** Free email provider domains – must not be used as company domain (per CRM redesign plan) */
export const FREE_EMAIL_DOMAINS = [
  'gmail.com', 'googlemail.com', 'gmail.co.uk', 'gmail.fr', 'gmail.de', 'gmail.it', 'gmail.es',
  'yahoo.com', 'yahoo.co.uk', 'yahoo.fr', 'yahoo.de', 'ymail.com',
  'hotmail.com', 'hotmail.co.uk', 'hotmail.fr', 'live.com', 'live.co.uk', 'outlook.com', 'msn.com',
  'icloud.com', 'me.com', 'mac.com',
  'protonmail.com', 'proton.me', 'pm.me',
  'aol.com', 'zoho.com',
  'gamil.com', 'gmial.com', 'gmai.com', 'gmal.com', 'gnail.com', 'gmaill.com', 'gmeil.com',
] as const;

/** Normalized set for fast lookup (includes base domains only; subdomains like mail.google.com not in list) */
const freeEmailSet = new Set(FREE_EMAIL_DOMAINS);

/**
 * Returns true if the domain is a known free/personal email provider (e.g. gmail.com).
 * Used so company domain is never set from personal email addresses.
 */
export const isFreeEmailDomain = (domain: string | null | undefined): boolean => {
  if (!domain || !domain.trim()) return false;
  return freeEmailSet.has(domain.toLowerCase().trim() as (typeof FREE_EMAIL_DOMAINS)[number]);
};

/**
 * Extract domain from website URL or email.
 * Returns null for incomplete input (e.g. "h" or "https:").
 */
export const extractDomain = (websiteOrEmail: string): string | null => {
  if (!websiteOrEmail || !websiteOrEmail.trim()) return null;
  const s = websiteOrEmail.trim();

  // If it's an email, extract domain (must have @ and part after @)
  if (s.includes('@')) {
    const parts = s.split('@');
    if (parts.length !== 2 || !parts[1]) return null;
    const domain = parts[1].toLowerCase().trim();
    // Must look like a domain (has a dot, e.g. wx.agency)
    return domain.includes('.') ? domain : null;
  }

  // If it's a URL, extract domain
  try {
    // Don't parse incomplete URLs like "h" or "https" or "https:"
    if (!s.includes('.') && !s.startsWith('http')) return null;
    const url = s.startsWith('http') ? new URL(s) : new URL(`https://${s}`);
    const hostname = url.hostname.replace(/^www\./, '').toLowerCase();
    // Reject placeholder/invalid hostnames (e.g. "h" from "https://h")
    return hostname.includes('.') ? hostname : null;
  } catch {
    // Manual strip: only accept if result looks like a domain (has a dot)
    const cleaned = s.replace(/^https?:\/\//, '').replace(/^www\./, '').split('/')[0];
    const domain = cleaned.toLowerCase().trim() || null;
    return domain && domain.includes('.') ? domain : null;
  }
};

/**
 * Get company domain: from website only, or from email only if it is not a free-email domain.
 * Prevents personal domains (gmail, yahoo, etc.) from being used as company domain.
 */
export const getCompanyDomain = (website?: string | null, email?: string | null): string | null => {
  const fromWebsite = website ? extractDomain(website) : null;
  if (fromWebsite) return fromWebsite;
  const fromEmail = email ? extractDomain(email) : null;
  if (fromEmail && !isFreeEmailDomain(fromEmail)) return fromEmail;
  return null;
};

/**
 * Standard INCOTERMS values
 */
const VALID_INCOTERMS = [
  'EXW', 'FCA', 'CPT', 'CIP', 'DAP', 'DPU', 'DDP',
  'FAS', 'FOB', 'CFR', 'CIF'
];

/**
 * Validate INCOTERMS value
 */
export const isValidIncoterms = (incoterms?: string): boolean => {
  if (!incoterms) return true; // Optional field
  return VALID_INCOTERMS.includes(incoterms.toUpperCase());
};

/**
 * Validation result interface
 */
export interface ValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
}

/**
 * Validate Company required fields and rules
 */
export const validateCompany = (company: Partial<Company>): ValidationResult => {
  const errors: string[] = [];
  const warnings: string[] = [];

  // Required fields
  if (!company.name || !company.name.trim()) {
    errors.push('Company name is required');
  }

  // Domain: prefer website; only use email if not a free-email provider (no gmail/yahoo etc.)
  let domain = company.domain && !isFreeEmailDomain(company.domain) ? company.domain : undefined;
  if (!domain && company.website) {
    domain = extractDomain(company.website) || undefined;
    if (domain) warnings.push(`Domain auto-populated from website: ${domain}`);
  }
  if (!domain && company.email) {
    const fromEmail = extractDomain(company.email) || undefined;
    if (fromEmail && !isFreeEmailDomain(fromEmail)) {
      domain = fromEmail;
      warnings.push(`Domain auto-populated from email: ${domain}`);
    } else if (fromEmail) {
      warnings.push('Personal email domains (e.g. Gmail, Yahoo) cannot be used as company domain. Add a company website.');
    }
  }

  if (!domain) {
    errors.push('Company domain is required (add a company website; personal email domains like Gmail are not allowed)');
  }

  // Industry is now optional - no validation needed

  // Region validation
  if (!company.region || !company.region.trim()) {
    errors.push('Region is required');
  }

  // Email format validation if provided
  if (company.email && !isValidEmail(company.email)) {
    errors.push('Invalid email format');
  }

  // Website format validation if provided
  if (company.website && !company.website.match(/^https?:\/\/.+/)) {
    warnings.push('Website should start with http:// or https://');
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings
  };
};

/**
 * Validate Contact required fields and domain consistency
 */
export const validateContact = (
  contact: Partial<Contact>, 
  company?: Company
): ValidationResult => {
  const errors: string[] = [];
  const warnings: string[] = [];

  // Required fields
  if (!contact.name || !contact.name.trim()) {
    errors.push('Contact name is required');
  }

  if (!contact.email || !contact.email.trim()) {
    errors.push('Contact email is required');
  } else if (!isValidEmail(contact.email)) {
    errors.push('Invalid email format');
  }

  if (!contact.companyId) {
    errors.push('Company is required');
  }

  // Domain consistency check
  if (contact.email && contact.companyId && company) {
    const contactDomain = extractDomain(contact.email);
    const companyDomain = company.domain || extractDomain(company.website || company.email || '');

    if (contactDomain && companyDomain && contactDomain !== companyDomain) {
      warnings.push(
        `Email domain (${contactDomain}) does not match company domain (${companyDomain})`
      );
    }
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings
  };
};

/**
 * Validate Deal required fields and rules
 */
export const validateDeal = (deal: Partial<Deal>): ValidationResult => {
  const errors: string[] = [];
  const warnings: string[] = [];

  if (!deal.name || !deal.name.trim()) {
    errors.push('Deal name is required');
  }

  if (!deal.account) {
    errors.push('Account (company) is required');
  }

  if (deal.amount === undefined || deal.amount === null) {
    errors.push('Deal amount is required');
  } else if (typeof deal.amount === 'number' && deal.amount <= 0) {
    errors.push('Deal amount must be greater than 0');
  }

  if (!deal.stage || !deal.stage.trim()) {
    errors.push('Deal stage is required');
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings
  };
};

/**
 * Validate Project required fields and rules
 */
export const validateProject = (project: Partial<Project>): ValidationResult => {
  const errors: string[] = [];
  const warnings: string[] = [];

  if (!project.name || !project.name.trim()) {
    errors.push('Project name is required');
  }

  if (!project.engagement) {
    errors.push('Engagement is required');
  }

  if (!project.startDate) {
    errors.push('Start date is required');
  }

  if (!project.endDate) {
    errors.push('End date is required');
  }

  if (project.startDate && project.endDate) {
    const start = new Date(project.startDate);
    const end = new Date(project.endDate);
    
    if (isNaN(start.getTime())) {
      errors.push('Invalid start date format');
    }
    
    if (isNaN(end.getTime())) {
      errors.push('Invalid end date format');
    }
    
    if (!isNaN(start.getTime()) && !isNaN(end.getTime()) && start >= end) {
      errors.push('Start date must be before end date');
    }
  }

  if (!project.projectManager) {
    errors.push('Project manager is required');
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings
  };
};

/**
 * Validate Invoice required fields and rules
 */
export const validateInvoice = (invoice: Partial<Invoice>): ValidationResult => {
  const errors: string[] = [];
  const warnings: string[] = [];

  if (!invoice.client) {
    errors.push('Client is required');
  }

  if (invoice.amount === undefined || invoice.amount === null) {
    errors.push('Invoice amount is required');
  } else if (typeof invoice.amount === 'number' && invoice.amount <= 0) {
    errors.push('Invoice amount must be greater than 0');
  }

  if (!invoice.lineItems || !Array.isArray(invoice.lineItems) || invoice.lineItems.length === 0) {
    errors.push('Invoice must have at least one line item');
  } else {
    invoice.lineItems.forEach((item, index) => {
      if (!item.description || !item.description.trim()) {
        errors.push(`Line item ${index + 1}: Description is required`);
      }
      if (item.amount === undefined || item.amount === null || item.amount <= 0) {
        errors.push(`Line item ${index + 1}: Amount must be greater than 0`);
      }
    });
  }

  if (!invoice.dueDate) {
    errors.push('Due date is required');
  } else {
    const dueDate = new Date(invoice.dueDate);
    if (isNaN(dueDate.getTime())) {
      errors.push('Invalid due date format');
    }
  }

  // INCOTERMS validation if provided
  if (invoice.incoterms && !isValidIncoterms(invoice.incoterms)) {
    errors.push(`Invalid INCOTERMS value. Must be one of: ${VALID_INCOTERMS.join(', ')}`);
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings
  };
};

/**
 * Auto-fill missing company fields
 */
export const autoFillCompany = (company: Partial<Company>): Partial<Company> => {
  const filled = { ...company };

  // Auto-populate domain if missing
  if (!filled.domain) {
    if (filled.website) {
      filled.domain = extractDomain(filled.website) || undefined;
    } else if (filled.email) {
      filled.domain = extractDomain(filled.email) || undefined;
    }
  }

  return filled;
};

/**
 * Deduplication Utilities
 * Detects duplicates and handles merging of records
 */

import { Company, Contact } from '../types';
import { extractDomain } from './validate';

/**
 * Calculate string similarity using Levenshtein distance
 * Returns a value between 0 (completely different) and 1 (identical)
 */
export const calculateSimilarity = (str1: string, str2: string): number => {
  if (!str1 || !str2) return 0;
  
  const s1 = str1.toLowerCase().trim();
  const s2 = str2.toLowerCase().trim();
  
  if (s1 === s2) return 1;
  
  const len1 = s1.length;
  const len2 = s2.length;
  
  if (len1 === 0 || len2 === 0) return 0;
  
  // Levenshtein distance
  const matrix: number[][] = [];
  
  for (let i = 0; i <= len1; i++) {
    matrix[i] = [i];
  }
  
  for (let j = 0; j <= len2; j++) {
    matrix[0][j] = j;
  }
  
  for (let i = 1; i <= len1; i++) {
    for (let j = 1; j <= len2; j++) {
      const cost = s1[i - 1] === s2[j - 1] ? 0 : 1;
      matrix[i][j] = Math.min(
        matrix[i - 1][j] + 1,      // deletion
        matrix[i][j - 1] + 1,      // insertion
        matrix[i - 1][j - 1] + cost // substitution
      );
    }
  }
  
  const distance = matrix[len1][len2];
  const maxLen = Math.max(len1, len2);
  return 1 - distance / maxLen;
};

/**
 * Duplicate detection result
 */
export interface DuplicateMatch {
  record: Company | Contact;
  matchType: 'exact' | 'fuzzy' | 'domain';
  confidence: number; // 0-1, where 1 is highest confidence
  similarity?: number; // For fuzzy matches
}

/**
 * Find duplicate companies by domain
 */
export const findDuplicateCompanies = (
  company: Partial<Company>,
  allCompanies: Company[]
): DuplicateMatch[] => {
  const matches: DuplicateMatch[] = [];
  
  if (!company.domain && !company.website && !company.email) {
    return matches;
  }
  
  const targetDomain = company.domain || 
    extractDomain(company.website || company.email || '');
  
  if (!targetDomain) return matches;
  
  allCompanies.forEach(existing => {
    if (existing.id === company.id) return; // Skip self
    
    const existingDomain = existing.domain || 
      extractDomain(existing.website || existing.email || '');
    
    if (existingDomain && existingDomain === targetDomain) {
      matches.push({
        record: existing,
        matchType: 'exact',
        confidence: 1.0
      });
    }
  });
  
  return matches;
};

/**
 * Find duplicate companies by fuzzy name matching
 */
export const findFuzzyDuplicateCompanies = (
  company: Partial<Company>,
  allCompanies: Company[],
  threshold: number = 0.8
): DuplicateMatch[] => {
  const matches: DuplicateMatch[] = [];
  
  if (!company.name) return matches;
  
  allCompanies.forEach(existing => {
    if (existing.id === company.id) return; // Skip self
    
    const similarity = calculateSimilarity(company.name || '', existing.name || '');
    
    if (similarity >= threshold) {
      matches.push({
        record: existing,
        matchType: 'fuzzy',
        confidence: similarity,
        similarity
      });
    }
  });
  
  return matches;
};

/**
 * Find duplicate contacts by email
 */
export const findDuplicateContacts = (
  contact: Partial<Contact>,
  allContacts: Contact[]
): DuplicateMatch[] => {
  const matches: DuplicateMatch[] = [];
  
  if (!contact.email) return matches;
  
  const normalizedEmail = contact.email.toLowerCase().trim();
  
  allContacts.forEach(existing => {
    if (existing.id === contact.id) return; // Skip self
    
    if (existing.email && existing.email.toLowerCase().trim() === normalizedEmail) {
      matches.push({
        record: existing,
        matchType: 'exact',
        confidence: 1.0
      });
    }
  });
  
  return matches;
};

/**
 * Find duplicate contacts by fuzzy name matching
 */
export const findFuzzyDuplicateContacts = (
  contact: Partial<Contact>,
  allContacts: Contact[],
  threshold: number = 0.8
): DuplicateMatch[] => {
  const matches: DuplicateMatch[] = [];
  
  if (!contact.name) return matches;
  
  allContacts.forEach(existing => {
    if (existing.id === contact.id) return; // Skip self
    
    const similarity = calculateSimilarity(contact.name || '', existing.name || '');
    
    if (similarity >= threshold) {
      matches.push({
        record: existing,
        matchType: 'fuzzy',
        confidence: similarity,
        similarity
      });
    }
  });
  
  return matches;
};

/**
 * Merge strategy: which record to keep as primary
 */
export type MergeStrategy = 'keep-newest' | 'keep-oldest' | 'keep-most-complete' | 'manual';

/**
 * Merge two companies
 * Returns the merged company data
 */
export const mergeCompanies = (
  primary: Company,
  secondary: Company,
  strategy: MergeStrategy = 'keep-most-complete'
): Partial<Company> => {
  const merged: Partial<Company> = { ...primary };
  
  // Merge fields, preferring non-empty values
  if (!merged.name && secondary.name) merged.name = secondary.name;
  if (!merged.industry && secondary.industry) merged.industry = secondary.industry;
  if (!merged.website && secondary.website) merged.website = secondary.website;
  if (!merged.email && secondary.email) merged.email = secondary.email;
  if (!merged.logo && secondary.logo) merged.logo = secondary.logo;
  if (!merged.domain && secondary.domain) merged.domain = secondary.domain;
  if (!merged.region && secondary.region) merged.region = secondary.region;
  
  // Merge arrays (e.g., tags, if they exist)
  if (secondary.tags && Array.isArray(secondary.tags)) {
    merged.tags = [...new Set([...(primary.tags || []), ...secondary.tags])];
  }
  
  // Keep the most recent updatedAt
  const primaryUpdated = primary.updatedAt ? new Date(primary.updatedAt).getTime() : 0;
  const secondaryUpdated = secondary.updatedAt ? new Date(secondary.updatedAt).getTime() : 0;
  merged.updatedAt = new Date(Math.max(primaryUpdated, secondaryUpdated)).toISOString();
  
  // Keep the oldest createdAt
  const primaryCreated = primary.createdAt ? new Date(primary.createdAt).getTime() : Date.now();
  const secondaryCreated = secondary.createdAt ? new Date(secondary.createdAt).getTime() : Date.now();
  merged.createdAt = new Date(Math.min(primaryCreated, secondaryCreated)).toISOString();
  
  return merged;
};

/**
 * Merge two contacts
 * Returns the merged contact data
 */
export const mergeContacts = (
  primary: Contact,
  secondary: Contact,
  strategy: MergeStrategy = 'keep-most-complete'
): Partial<Contact> => {
  const merged: Partial<Contact> = { ...primary };
  
  // Merge fields, preferring non-empty values
  if (!merged.name && secondary.name) merged.name = secondary.name;
  if (!merged.email && secondary.email) merged.email = secondary.email;
  if (!merged.phone && secondary.phone) merged.phone = secondary.phone;
  if (!merged.role && secondary.role) merged.role = secondary.role;
  if (!merged.linkedin && secondary.linkedin) merged.linkedin = secondary.linkedin;
  if (!merged.notes && secondary.notes) merged.notes = secondary.notes;
  
  // Keep the companyId from primary (or secondary if primary doesn't have one)
  if (!merged.companyId && secondary.companyId) {
    merged.companyId = secondary.companyId;
  }
  
  // Keep the most recent lastContacted
  const primaryContacted = primary.lastContacted ? new Date(primary.lastContacted).getTime() : 0;
  const secondaryContacted = secondary.lastContacted ? new Date(secondary.lastContacted).getTime() : 0;
  merged.lastContacted = new Date(Math.max(primaryContacted, secondaryContacted)).toISOString();
  
  return merged;
};

/**
 * Get merge preview - shows what will be merged
 */
export interface MergePreview {
  primary: Company | Contact;
  secondary: Company | Contact;
  merged: Partial<Company | Contact>;
  fieldsToUpdate: string[];
  relatedRecordsToUpdate: {
    deals?: number;
    projects?: number;
    contacts?: number;
    invoices?: number;
  };
}

export const getMergePreview = (
  primary: Company | Contact,
  secondary: Company | Contact,
  relatedCounts?: {
    deals?: number;
    projects?: number;
    contacts?: number;
    invoices?: number;
  }
): MergePreview => {
  const isCompany = 'industry' in primary;
  
  const merged = isCompany
    ? mergeCompanies(primary as Company, secondary as Company)
    : mergeContacts(primary as Contact, secondary as Contact);
  
  const fieldsToUpdate: string[] = [];
  Object.keys(merged).forEach(key => {
    if (merged[key as keyof typeof merged] !== primary[key as keyof typeof primary]) {
      fieldsToUpdate.push(key);
    }
  });
  
  return {
    primary,
    secondary,
    merged,
    fieldsToUpdate,
    relatedRecordsToUpdate: relatedCounts || {}
  };
};

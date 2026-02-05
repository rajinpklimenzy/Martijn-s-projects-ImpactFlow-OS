/**
 * Frontend Permissions Utility
 * Provides permission checking functions for UI components
 */

export type UserRole = 'Viewer' | 'Collaborator' | 'Admin' | 'User'; // 'User' is legacy

/**
 * Permission definitions (matches backend)
 */
const PERMISSIONS = {
  // Shared Inbox - View
  'shared-inbox:read': ['Viewer', 'Collaborator', 'Admin'],
  'shared-inbox:view-emails': ['Viewer', 'Collaborator', 'Admin'],
  'shared-inbox:view-notes': ['Viewer', 'Collaborator', 'Admin'],
  'shared-inbox:view-assignments': ['Viewer', 'Collaborator', 'Admin'],
  
  // Shared Inbox - Actions
  'shared-inbox:add-note': ['Collaborator', 'Admin'],
  'shared-inbox:edit-note': ['Collaborator', 'Admin'],
  'shared-inbox:delete-note': ['Collaborator', 'Admin'],
  'shared-inbox:assign-email': ['Admin'],
  'shared-inbox:unassign-email': ['Admin'],
  'shared-inbox:send-email': ['Admin'],
  'shared-inbox:reply-email': ['Admin'],
  'shared-inbox:forward-email': ['Admin'],
  'shared-inbox:star-email': ['Collaborator', 'Admin'],
  'shared-inbox:archive-email': ['Admin'],
  'shared-inbox:delete-email': ['Admin'],
  'shared-inbox:update-metadata': ['Admin'],
  
  // Configuration
  'shared-inbox:manage-accounts': ['Admin'],
  'shared-inbox:manage-routing-rules': ['Admin'],
  'shared-inbox:manage-templates': ['Collaborator', 'Admin'],
  'shared-inbox:manage-signatures': ['Collaborator', 'Admin'],
  'shared-inbox:manage-labels': ['Admin'],
  'shared-inbox:sync-emails': ['Admin'],
  
  // Admin
  'admin:manage-users': ['Admin'],
  'admin:manage-settings': ['Admin'],
  'admin:view-analytics': ['Admin'],
} as const;

/**
 * Normalize role (handle legacy 'User' role)
 */
const normalizeRole = (role: UserRole | string | undefined): UserRole => {
  if (!role) return 'Viewer';
  if (role === 'User' || role === 'user') return 'Collaborator';
  if (role === 'Admin' || role === 'admin') return 'Admin';
  if (role === 'Viewer' || role === 'viewer') return 'Viewer';
  if (role === 'Collaborator' || role === 'collaborator') return 'Collaborator';
  return 'Viewer'; // Default to Viewer for unknown roles
};

/**
 * Check if user has a specific permission
 */
export const hasPermission = (userRole: UserRole | string | undefined, permission: keyof typeof PERMISSIONS): boolean => {
  const role = normalizeRole(userRole);
  const allowedRoles = PERMISSIONS[permission] || [];
  return allowedRoles.includes(role);
};

/**
 * Check if user has any of the specified permissions
 */
export const hasAnyPermission = (
  userRole: UserRole | string | undefined,
  permissions: Array<keyof typeof PERMISSIONS>
): boolean => {
  return permissions.some(permission => hasPermission(userRole, permission));
};

/**
 * Check if user has all of the specified permissions
 */
export const hasAllPermissions = (
  userRole: UserRole | string | undefined,
  permissions: Array<keyof typeof PERMISSIONS>
): boolean => {
  return permissions.every(permission => hasPermission(userRole, permission));
};

/**
 * Check if user is Admin
 */
export const isAdmin = (userRole: UserRole | string | undefined): boolean => {
  return normalizeRole(userRole) === 'Admin';
};

/**
 * Check if user is Collaborator or Admin
 */
export const isCollaboratorOrAdmin = (userRole: UserRole | string | undefined): boolean => {
  const role = normalizeRole(userRole);
  return role === 'Collaborator' || role === 'Admin';
};

/**
 * Check if user is Viewer (read-only)
 */
export const isViewer = (userRole: UserRole | string | undefined): boolean => {
  return normalizeRole(userRole) === 'Viewer';
};

/**
 * Get user's effective role
 */
export const getEffectiveRole = (userRole: UserRole | string | undefined): UserRole => {
  return normalizeRole(userRole);
};

/**
 * Get role display name
 */
export const getRoleDisplayName = (role: UserRole | string | undefined): string => {
  const normalized = normalizeRole(role);
  const displayNames: Record<UserRole, string> = {
    Viewer: 'Viewer',
    Collaborator: 'Collaborator',
    Admin: 'Admin',
    User: 'Collaborator' // Legacy
  };
  return displayNames[normalized] || 'Viewer';
};

/**
 * Get role description
 */
export const getRoleDescription = (role: UserRole | string | undefined): string => {
  const normalized = normalizeRole(role);
  const descriptions: Record<UserRole, string> = {
    Viewer: 'Read-only access to shared inbox',
    Collaborator: 'Can comment and draft responses',
    Admin: 'Full configuration access',
    User: 'Can comment and draft responses' // Legacy
  };
  return descriptions[normalized] || descriptions.Viewer;
};

// Enhanced contractor permissions system

export function hasContractorPermission(
  user: any,
  permission: string,
  context?: { application?: any; companyId?: number }
): boolean {
  if (!user) return false;

  // System admin has all permissions
  if (user.role === 'system_admin') return true;

  // For contractor applications, apply enhanced logic
  if (context?.application && user.role?.startsWith('contractor_')) {
    // Account owners automatically have view and edit permissions (but NOT submit)
    if (['contractor_account_owner', 'contractor_individual'].includes(user.role)) {
      return permission === 'view' || permission === 'edit';
    }
    
    // Managers have view and edit permissions (but NOT submit)
    if (user.role === 'contractor_manager') {
      return permission === 'view' || permission === 'edit';
    }
    
    // For team members, check assignment permissions
    const assignment = context.application.assignedToUsers?.find((u: any) => u.id === user.id);
    if (assignment) {
      return assignment.permissions?.includes(permission) || false;
    }
    return false;
  }

  // Default permission check
  return false;
}

export function canManageContractorTeam(user: any): boolean {
  return ['contractor_account_owner', 'contractor_individual', 'contractor_manager'].includes(user.role || '');
}

export function canEditApplicationPermissions(user: any): boolean {
  return ['contractor_account_owner', 'contractor_individual', 'contractor_manager'].includes(user.role || '');
}
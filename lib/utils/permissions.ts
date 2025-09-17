import type { UserRole } from '@/lib/types/database'

/**
 * Permission definitions for the application
 */
export enum Permission {
  // User Management
  VIEW_ALL_USERS = 'view_all_users',
  CREATE_USER = 'create_user',
  UPDATE_USER = 'update_user',
  DELETE_USER = 'delete_user',
  MANAGE_USER_ROLES = 'manage_user_roles',

  // Project Management
  VIEW_ALL_PROJECTS = 'view_all_projects',
  CREATE_PROJECT = 'create_project',
  UPDATE_PROJECT = 'update_project',
  DELETE_PROJECT = 'delete_project',
  MANAGE_PROJECT_REPRESENTATIVES = 'manage_project_representatives',

  // Income Management
  VIEW_ALL_INCOMES = 'view_all_incomes',
  CREATE_INCOME = 'create_income',
  UPDATE_INCOME = 'update_income',
  DELETE_INCOME = 'delete_income',

  // Balance Management
  VIEW_ALL_BALANCES = 'view_all_balances',
  UPDATE_BALANCE = 'update_balance',
  VIEW_BALANCE_TRANSACTIONS = 'view_balance_transactions',
  CREATE_BALANCE_ADJUSTMENT = 'create_balance_adjustment',

  // Payment Instructions
  VIEW_ALL_PAYMENT_INSTRUCTIONS = 'view_all_payment_instructions',
  CREATE_PAYMENT_INSTRUCTION = 'create_payment_instruction',
  UPDATE_PAYMENT_INSTRUCTION = 'update_payment_instruction',
  APPROVE_PAYMENT_INSTRUCTION = 'approve_payment_instruction',
  EXPORT_PAYMENT_INSTRUCTIONS = 'export_payment_instructions',

  // Reporting
  VIEW_ALL_REPORTS = 'view_all_reports',
  CREATE_REPORT = 'create_report',
  EXPORT_REPORT = 'export_report',
  VIEW_COMPANY_REPORTS = 'view_company_reports',
  VIEW_FINANCIAL_SUMMARY = 'view_financial_summary',

  // System Management
  VIEW_AUDIT_LOGS = 'view_audit_logs',
  MANAGE_SYSTEM_SETTINGS = 'manage_system_settings',
  VIEW_SYSTEM_STATS = 'view_system_stats',
}

/**
 * Role-based permission mapping
 */
const ROLE_PERMISSIONS: Record<UserRole, Permission[]> = {
  admin: [
    // Full access to everything
    ...Object.values(Permission),
  ],

  finance_officer: [
    // User Management (limited)
    Permission.VIEW_ALL_USERS,

    // Project Management (view only)
    Permission.VIEW_ALL_PROJECTS,

    // Income Management (full access)
    Permission.VIEW_ALL_INCOMES,
    Permission.CREATE_INCOME,
    Permission.UPDATE_INCOME,
    Permission.DELETE_INCOME,

    // Balance Management (full access)
    Permission.VIEW_ALL_BALANCES,
    Permission.UPDATE_BALANCE,
    Permission.VIEW_BALANCE_TRANSACTIONS,
    Permission.CREATE_BALANCE_ADJUSTMENT,

    // Payment Instructions (full access)
    Permission.VIEW_ALL_PAYMENT_INSTRUCTIONS,
    Permission.CREATE_PAYMENT_INSTRUCTION,
    Permission.UPDATE_PAYMENT_INSTRUCTION,
    Permission.APPROVE_PAYMENT_INSTRUCTION,
    Permission.EXPORT_PAYMENT_INSTRUCTIONS,

    // Reporting (full access)
    Permission.VIEW_ALL_REPORTS,
    Permission.CREATE_REPORT,
    Permission.EXPORT_REPORT,
    Permission.VIEW_COMPANY_REPORTS,
    Permission.VIEW_FINANCIAL_SUMMARY,
  ],

  academician: [
    // Limited permissions - only own data
    Permission.CREATE_REPORT, // Can create reports for own projects
    Permission.EXPORT_REPORT, // Can export own reports
  ],
}

/**
 * Check if user has specific permission
 */
export function hasPermission(userRole: UserRole, permission: Permission): boolean {
  return ROLE_PERMISSIONS[userRole]?.includes(permission) ?? false
}

/**
 * Check if user has any of the specified permissions
 */
export function hasAnyPermission(userRole: UserRole, permissions: Permission[]): boolean {
  return permissions.some(permission => hasPermission(userRole, permission))
}

/**
 * Check if user has all of the specified permissions
 */
export function hasAllPermissions(userRole: UserRole, permissions: Permission[]): boolean {
  return permissions.every(permission => hasPermission(userRole, permission))
}

/**
 * Get all permissions for a specific role
 */
export function getRolePermissions(role: UserRole): Permission[] {
  return ROLE_PERMISSIONS[role] || []
}

/**
 * Permission checker class for easier usage
 */
export class PermissionChecker {
  constructor(private userRole: UserRole) {}

  can(permission: Permission): boolean {
    return hasPermission(this.userRole, permission)
  }

  canAny(permissions: Permission[]): boolean {
    return hasAnyPermission(this.userRole, permissions)
  }

  canAll(permissions: Permission[]): boolean {
    return hasAllPermissions(this.userRole, permissions)
  }

  // Convenience methods for common checks
  canManageUsers(): boolean {
    return this.can(Permission.CREATE_USER) && this.can(Permission.UPDATE_USER)
  }

  canManageProjects(): boolean {
    return this.can(Permission.CREATE_PROJECT) && this.can(Permission.UPDATE_PROJECT)
  }

  canManageFinances(): boolean {
    return this.canAny([
      Permission.CREATE_INCOME,
      Permission.CREATE_PAYMENT_INSTRUCTION,
      Permission.UPDATE_BALANCE,
    ])
  }

  canViewAllData(): boolean {
    return this.canAny([
      Permission.VIEW_ALL_PROJECTS,
      Permission.VIEW_ALL_INCOMES,
      Permission.VIEW_ALL_BALANCES,
    ])
  }

  canExportData(): boolean {
    return this.canAny([
      Permission.EXPORT_PAYMENT_INSTRUCTIONS,
      Permission.EXPORT_REPORT,
    ])
  }

  isAdmin(): boolean {
    return this.userRole === 'admin'
  }

  isFinanceOrAdmin(): boolean {
    return this.userRole === 'admin' || this.userRole === 'finance_officer'
  }

  isAcademician(): boolean {
    return this.userRole === 'academician'
  }
}

/**
 * Resource access control
 */
export interface ResourceAccess {
  canView: boolean
  canCreate: boolean
  canUpdate: boolean
  canDelete: boolean
  canExport?: boolean
  canApprove?: boolean
}

/**
 * Get resource access permissions for a role
 */
export function getResourceAccess(userRole: UserRole, resource: string): ResourceAccess {
  const checker = new PermissionChecker(userRole)

  switch (resource) {
    case 'users':
      return {
        canView: checker.can(Permission.VIEW_ALL_USERS),
        canCreate: checker.can(Permission.CREATE_USER),
        canUpdate: checker.can(Permission.UPDATE_USER),
        canDelete: checker.can(Permission.DELETE_USER),
      }

    case 'projects':
      return {
        canView: checker.can(Permission.VIEW_ALL_PROJECTS),
        canCreate: checker.can(Permission.CREATE_PROJECT),
        canUpdate: checker.can(Permission.UPDATE_PROJECT),
        canDelete: checker.can(Permission.DELETE_PROJECT),
      }

    case 'incomes':
      return {
        canView: checker.can(Permission.VIEW_ALL_INCOMES),
        canCreate: checker.can(Permission.CREATE_INCOME),
        canUpdate: checker.can(Permission.UPDATE_INCOME),
        canDelete: checker.can(Permission.DELETE_INCOME),
      }

    case 'balances':
      return {
        canView: checker.can(Permission.VIEW_ALL_BALANCES),
        canCreate: false, // Balances are auto-created
        canUpdate: checker.can(Permission.UPDATE_BALANCE),
        canDelete: false, // Balances cannot be deleted
      }

    case 'payment_instructions':
      return {
        canView: checker.can(Permission.VIEW_ALL_PAYMENT_INSTRUCTIONS),
        canCreate: checker.can(Permission.CREATE_PAYMENT_INSTRUCTION),
        canUpdate: checker.can(Permission.UPDATE_PAYMENT_INSTRUCTION),
        canDelete: false, // Payment instructions cannot be deleted
        canExport: checker.can(Permission.EXPORT_PAYMENT_INSTRUCTIONS),
        canApprove: checker.can(Permission.APPROVE_PAYMENT_INSTRUCTION),
      }

    case 'reports':
      return {
        canView: checker.can(Permission.VIEW_ALL_REPORTS),
        canCreate: checker.can(Permission.CREATE_REPORT),
        canUpdate: false, // Reports are immutable
        canDelete: false, // Reports cannot be deleted
        canExport: checker.can(Permission.EXPORT_REPORT),
      }

    default:
      return {
        canView: false,
        canCreate: false,
        canUpdate: false,
        canDelete: false,
      }
  }
}

/**
 * Menu access control for UI
 */
export interface MenuItem {
  key: string
  label: string
  path: string
  permission?: Permission
  roles?: UserRole[]
  children?: MenuItem[]
}

/**
 * Filter menu items based on user permissions
 */
export function filterMenuItems(items: MenuItem[], userRole: UserRole): MenuItem[] {
  return items
    .filter(item => {
      // Check role-based access
      if (item.roles && !item.roles.includes(userRole)) {
        return false
      }

      // Check permission-based access
      if (item.permission && !hasPermission(userRole, item.permission)) {
        return false
      }

      return true
    })
    .map(item => ({
      ...item,
      children: item.children ? filterMenuItems(item.children, userRole) : undefined,
    }))
    .filter(item => !item.children || item.children.length > 0) // Remove empty parent items
}

/**
 * Get user role display information
 */
export function getRoleInfo(role: UserRole) {
  const roleInfo = {
    admin: {
      name: 'Sistem Yöneticisi',
      description: 'Tüm sistem işlevlerine erişim',
      color: 'red',
      priority: 3,
    },
    finance_officer: {
      name: 'Finans Sorumlusu',
      description: 'Gelir ve ödeme yönetimi',
      color: 'blue',
      priority: 2,
    },
    academician: {
      name: 'Akademisyen',
      description: 'Proje temsilcisi',
      color: 'green',
      priority: 1,
    },
  }

  return roleInfo[role]
}
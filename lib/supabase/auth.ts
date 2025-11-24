import { createClient } from './server'
import { supabase } from './client'
import type { UserRole } from '@/lib/types/database'

export interface AuthUser {
  id: string
  email: string
  full_name: string
  role: UserRole
  phone?: string | null
  iban?: string | null
  is_active: boolean
}

export interface SignUpData {
  email: string
  password: string
  full_name: string
  role?: UserRole
  phone?: string
  iban?: string
}

export interface SignInData {
  email: string
  password: string
}

/**
 * Client-side authentication functions
 */
export const authClient = {
  /**
   * Sign up new user
   */
  async signUp(data: SignUpData) {
    const { data: authData, error: authError } = await supabase.auth.signUp({
      email: data.email,
      password: data.password,
      options: {
        data: {
          full_name: data.full_name,
          role: data.role || 'manager',
          phone: data.phone,
          iban: data.iban,
        },
      },
    })

    if (authError) {
      throw new Error(`Registration failed: ${authError.message}`)
    }

    return authData
  },

  /**
   * Sign in user
   */
  async signIn(data: SignInData) {
    const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
      email: data.email,
      password: data.password,
    })

    if (authError) {
      throw new Error(`Login failed: ${authError.message}`)
    }

    return authData
  },

  /**
   * Sign out user
   */
  async signOut() {
    const { error } = await supabase.auth.signOut()
    if (error) {
      throw new Error(`Sign out failed: ${error.message}`)
    }
  },

  /**
   * Get current session
   */
  async getSession() {
    const { data: { session }, error } = await supabase.auth.getSession()
    if (error) {
      throw new Error(`Failed to get session: ${error.message}`)
    }
    return session
  },

  /**
   * Get current user with profile
   */
  async getCurrentUser(): Promise<AuthUser | null> {
    const session = await this.getSession()
    if (!session?.user) return null

    const { data: profile, error } = await supabase
      .from('users')
      .select('*')
      .eq('id', session.user.id)
      .single()

    if (error) {
      console.error('Failed to get user profile:', error)
      return null
    }

    return profile
  },

  /**
   * Update user profile
   */
  async updateProfile(updates: Partial<Omit<AuthUser, 'id' | 'email'>>) {
    const session = await this.getSession()
    if (!session?.user) {
      throw new Error('Not authenticated')
    }

    const { data, error } = await supabase
      .from('users')
      .update(updates)
      .eq('id', session.user.id)
      .select()
      .single()

    if (error) {
      throw new Error(`Failed to update profile: ${error.message}`)
    }

    return data
  },

  /**
   * Listen to auth state changes
   */
  onAuthStateChange(callback: (user: AuthUser | null) => void) {
    return supabase.auth.onAuthStateChange(async (event, session) => {
      if (session?.user) {
        const profile = await this.getCurrentUser()
        callback(profile)
      } else {
        callback(null)
      }
    })
  },
}

/**
 * Server-side authentication functions
 */
export const authServer = {
  /**
   * Get current user from server
   */
  async getCurrentUser(): Promise<AuthUser | null> {
    const supabase = await createClient()

    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) return null

    const { data: profile, error: profileError } = await supabase
      .from('users')
      .select('*')
      .eq('id', user.id)
      .single()

    if (profileError) {
      console.error('Failed to get user profile:', profileError)
      return null
    }

    return profile
  },

  /**
   * Require authentication (throws if not authenticated)
   */
  async requireAuth(): Promise<AuthUser> {
    const user = await this.getCurrentUser()
    if (!user) {
      throw new Error('Authentication required')
    }
    return user
  },

  /**
   * Require specific role
   */
  async requireRole(requiredRoles: UserRole | UserRole[]): Promise<AuthUser> {
    const user = await this.requireAuth()
    const roles = Array.isArray(requiredRoles) ? requiredRoles : [requiredRoles]

    if (!roles.includes(user.role)) {
      throw new Error(`Access denied. Required role: ${roles.join(' or ')}`)
    }

    return user
  },

  /**
   * Check if user has permission for project
   */
  async hasProjectAccess(projectId: string): Promise<boolean> {
    const user = await this.getCurrentUser()
    if (!user) return false

    // Admin and managers have access to all projects
    if (user.role === 'admin' || user.role === 'manager') {
      return true
    }

    // Check if user is a representative of the project
    const supabase = await createClient()
    const { data, error } = await supabase
      .from('project_representatives')
      .select('id')
      .eq('project_id', projectId)
      .eq('user_id', user.id)
      .single()

    return !error && !!data
  },

  /**
   * Get user balance (only for authenticated user or finance/admin)
   */
  async getUserBalance(userId?: string): Promise<any> {
    const currentUser = await this.requireAuth()
    const targetUserId = userId || currentUser.id

    // Only allow viewing own balance or if user is finance/admin
    if (targetUserId !== currentUser.id &&
      !['admin', 'manager'].includes(currentUser.role)) {
      throw new Error('Access denied')
    }

    const supabase = await createClient()
    const { data, error } = await supabase
      .from('balances')
      .select('*')
      .eq('user_id', targetUserId)
      .single()

    if (error) {
      throw new Error(`Failed to get balance: ${error.message}`)
    }

    return data
  },
}

/**
 * Auth utility functions
 */
export const authUtils = {
  /**
   * Check if role has admin privileges
   */
  isAdmin(role: UserRole): boolean {
    return role === 'admin'
  },

  /**
   * Check if role has manager privileges
   */
  isManagerOrAdmin(role: UserRole): boolean {
    return role === 'admin' || role === 'manager'
  },

  /**
   * Get role display name in Turkish
   */
  getRoleDisplayName(role: UserRole): string {
    const roleNames: Record<UserRole, string> = {
      admin: 'Sistem Yöneticisi',
      manager: 'Yönetici',
    }
    return roleNames[role]
  },

  /**
   * Get available roles for user creation
   */
  getAvailableRoles(currentUserRole: UserRole): UserRole[] {
    if (currentUserRole === 'admin') {
      return ['admin', 'manager']
    }
    return ['manager'] // Default for self-registration
  },
}
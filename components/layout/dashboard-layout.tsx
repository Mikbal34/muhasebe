'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  Building2,
  Users,
  Wallet,
  FileText,
  PiggyBank,
  BarChart3,
  Settings,
  LogOut,
  Menu,
  X,
  Bell,
  Briefcase,
  Receipt,
  ChevronDown,
  ChevronRight,
  CreditCard,
  UserCog
} from 'lucide-react'
import { NotificationBell } from '@/components/ui/notification'

interface DashboardLayoutProps {
  children: React.ReactNode
  user?: {
    id: string
    full_name: string
    email: string
    role: 'admin' | 'manager'
  }
}

const navigationItems = [
  {
    title: 'Dashboard',
    href: '/dashboard',
    icon: BarChart3,
    roles: ['admin', 'manager']
  },
  {
    title: 'Projeler',
    href: '/dashboard/projects',
    icon: Building2,
    roles: ['admin', 'manager']
  },
  {
    title: 'Gelirler',
    href: '/dashboard/incomes',
    icon: Wallet,
    roles: ['admin', 'manager']
  },
  {
    title: 'Giderler',
    href: '/dashboard/expenses',
    icon: Receipt,
    roles: ['admin', 'manager']
  },
  {
    title: 'Ödemeler',
    icon: CreditCard,
    roles: ['admin', 'manager'],
    submenu: [
      {
        title: 'Ödeme Talimatları',
        href: '/dashboard/payments',
        icon: FileText
      },
      {
        title: 'Bakiyeler',
        href: '/dashboard/balances',
        icon: PiggyBank
      }
    ]
  },
  {
    title: 'Kullanıcılar',
    icon: UserCog,
    roles: ['admin', 'manager'],
    submenu: [
      {
        title: 'Kullanıcılar',
        href: '/dashboard/users',
        icon: Users
      },
      {
        title: 'Personel',
        href: '/dashboard/personnel',
        icon: Briefcase
      }
    ]
  },
  {
    title: 'Raporlar',
    href: '/dashboard/reports',
    icon: BarChart3,
    roles: ['admin', 'manager']
  },
  {
    title: 'Bildirimler',
    href: '/dashboard/notifications',
    icon: Bell,
    roles: ['admin', 'manager']
  },
  {
    title: 'Ayarlar',
    href: '/dashboard/settings',
    icon: Settings,
    roles: ['admin', 'manager']
  }
]

export default function DashboardLayout({ children, user: propUser }: DashboardLayoutProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false) // Mobile sidebar
  const [desktopSidebarCollapsed, setDesktopSidebarCollapsed] = useState(false) // Desktop sidebar
  const [user, setUser] = useState(propUser)
  const [openMenus, setOpenMenus] = useState<Record<string, boolean>>({})
  const pathname = usePathname()

  useEffect(() => {
    // If no user prop is passed, try to get from localStorage
    if (!propUser) {
      const storedUser = localStorage.getItem('user')
      if (storedUser) {
        try {
          const parsed = JSON.parse(storedUser)
          setUser(parsed)
          // Manager için sidebar varsayılan kapalı
          if (parsed.role === 'manager') {
            setDesktopSidebarCollapsed(true)
          }
        } catch (error) {
          console.error('Failed to parse stored user:', error)
        }
      }
    } else {
      setUser(propUser)
      // Manager için sidebar varsayılan kapalı
      if (propUser.role === 'manager') {
        setDesktopSidebarCollapsed(true)
      }
    }
  }, [propUser])

  // Auto-expand submenu if current page is in it
  useEffect(() => {
    const newOpenMenus: Record<string, boolean> = {}

    navigationItems.forEach(item => {
      if ('submenu' in item && item.submenu) {
        const hasActiveSub = item.submenu.some((sub: any) =>
          pathname === sub.href || pathname.startsWith(sub.href + '/')
        )
        if (hasActiveSub) {
          newOpenMenus[item.title] = true
        }
      }
    })

    setOpenMenus(newOpenMenus)
  }, [pathname])

  const filteredNavigation = user?.role
    ? navigationItems.filter(item => item.roles.includes(user.role))
    : navigationItems

  const handleLogout = async () => {
    try {
      const response = await fetch('/api/auth/logout', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      })

      if (response.ok) {
        window.location.href = '/login'
      }
    } catch (error) {
      console.error('Logout failed:', error)
    }
  }

  return (
    <div className="h-screen bg-slate-50 overflow-hidden">
      {/* Mobile sidebar backdrop */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-40 bg-black bg-opacity-50 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Desktop sidebar backdrop (for manager when sidebar is open) */}
      {!desktopSidebarCollapsed && user?.role === 'manager' && (
        <div
          className="hidden lg:block fixed inset-0 z-40 bg-black bg-opacity-30"
          onClick={() => setDesktopSidebarCollapsed(true)}
        />
      )}

      {/* Desktop Layout */}
      <div className="flex h-full overflow-hidden">
        {/* Sidebar */}
        <aside className={`
          fixed inset-y-0 left-0 z-50 w-64 bg-sidebar shadow-lg transform transition-all duration-300 ease-in-out
          ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}
          ${user?.role === 'manager'
            ? desktopSidebarCollapsed
              ? 'lg:-translate-x-full'
              : 'lg:translate-x-0 lg:shadow-xl'
            : 'lg:translate-x-0 lg:static lg:inset-auto lg:h-full lg:flex lg:flex-col lg:shadow-xl'}
        `}>
          <div className="flex items-center justify-between h-16 px-4 border-b border-slate-700">
            <h1 className="text-lg font-semibold text-white">
              Gelir Dağıtım
            </h1>
            {/* Mobile close button */}
            <button
              onClick={() => setSidebarOpen(false)}
              className="lg:hidden p-1 rounded-md text-slate-400 hover:text-slate-300"
            >
              <X className="h-6 w-6" />
            </button>
            {/* Desktop close button for manager */}
            {user?.role === 'manager' && (
              <button
                onClick={() => setDesktopSidebarCollapsed(true)}
                className="hidden lg:block p-1 rounded-md text-slate-400 hover:text-slate-300"
              >
                <X className="h-6 w-6" />
              </button>
            )}
          </div>

          <nav className="flex-1 mt-4 px-2 overflow-y-auto">
            <div className="space-y-1">
              {filteredNavigation.map((item) => {
                const Icon = item.icon
                const hasSubmenu = 'submenu' in item && item.submenu
                const isOpen = openMenus[item.title]

                // Check if any submenu item is active
                const isSubmenuActive = hasSubmenu && item.submenu?.some((sub: any) =>
                  pathname === sub.href || pathname.startsWith(sub.href + '/')
                )

                const isActive = item.href && (
                  item.href === '/dashboard'
                    ? pathname === '/dashboard'
                    : (pathname === item.href || pathname.startsWith(item.href + '/'))
                )

                if (hasSubmenu) {
                  return (
                    <div key={item.title}>
                      <button
                        onClick={() => setOpenMenus({ ...openMenus, [item.title]: !isOpen })}
                        className={`
                          w-full group flex items-center justify-between px-3 py-2.5 text-sm font-medium rounded-lg transition-all duration-200
                          ${isSubmenuActive
                            ? 'bg-sidebar-active text-accent-teal'
                            : 'text-slate-300 hover:bg-sidebar-hover hover:text-white'
                          }
                        `}
                      >
                        <div className="flex items-center">
                          <Icon className={`
                            mr-3 h-5 w-5 flex-shrink-0 transition-colors
                            ${isSubmenuActive ? 'text-accent-teal' : 'text-slate-400 group-hover:text-accent-teal'}
                          `} />
                          <span>{item.title}</span>
                        </div>
                        {isOpen ? (
                          <ChevronDown className="h-4 w-4" />
                        ) : (
                          <ChevronRight className="h-4 w-4" />
                        )}
                      </button>

                      {isOpen && (
                        <div className="ml-8 mt-1 space-y-1">
                          {item.submenu?.map((subItem: any) => {
                            const SubIcon = subItem.icon
                            const isSubActive = pathname === subItem.href || pathname.startsWith(subItem.href + '/')

                            return (
                              <Link
                                key={subItem.href}
                                href={subItem.href}
                                className={`
                                  group flex items-center px-3 py-2 text-sm font-medium rounded-lg transition-all duration-200
                                  ${isSubActive
                                    ? 'bg-sidebar-active text-accent-teal-light'
                                    : 'text-slate-400 hover:bg-sidebar-hover hover:text-slate-200'
                                  }
                                `}
                                onClick={() => setSidebarOpen(false)}
                              >
                                <SubIcon className={`
                                  mr-3 h-4 w-4 flex-shrink-0 transition-colors
                                  ${isSubActive ? 'text-accent-teal-light' : 'text-slate-500 group-hover:text-accent-teal-light'}
                                `} />
                                {subItem.title}
                              </Link>
                            )
                          })}
                        </div>
                      )}
                    </div>
                  )
                }

                return (
                  <Link
                    key={item.href}
                    href={item.href as any}
                    className={`
                      group flex items-center px-3 py-2.5 text-sm font-medium rounded-lg transition-all duration-200
                      ${isActive
                        ? 'bg-sidebar-active text-accent-teal'
                        : 'text-slate-300 hover:bg-sidebar-hover hover:text-white'
                      }
                    `}
                    onClick={() => setSidebarOpen(false)}
                  >
                    <Icon className={`
                      mr-3 h-5 w-5 flex-shrink-0 transition-colors
                      ${isActive ? 'text-accent-teal' : 'text-slate-400 group-hover:text-accent-teal'}
                    `} />
                    {item.title}
                  </Link>
                )
              })}
            </div>
          </nav>

          {/* User section */}
          <div className="mt-auto p-4 border-t border-slate-700">
            <div className="flex items-center">
              <Link
                href="/dashboard/profile"
                className="flex items-center flex-1 min-w-0 p-2 rounded-lg hover:bg-sidebar-hover transition-all duration-200"
                onClick={() => setSidebarOpen(false)}
              >
                <div className="flex-shrink-0">
                  <div className="h-9 w-9 bg-gradient-to-br from-accent-teal to-accent-cyan rounded-full flex items-center justify-center ring-2 ring-accent-teal/20">
                    <span className="text-sm font-semibold text-white">
                      {user?.full_name?.charAt(0).toUpperCase() || 'U'}
                    </span>
                  </div>
                </div>
                <div className="ml-3 flex-1 min-w-0">
                  <p className="text-sm font-medium text-white truncate">
                    {user?.full_name || 'Kullanıcı'}
                  </p>
                  <p className="text-xs text-slate-400 capitalize">
                    {user?.role === 'admin' ? 'Yönetici (Admin)' :
                      user?.role === 'manager' ? 'Yönetici' : 'Kullanıcı'}
                  </p>
                </div>
              </Link>
              <button
                onClick={handleLogout}
                className="ml-2 flex-shrink-0 p-2 text-slate-400 hover:text-accent-teal hover:bg-sidebar-hover rounded-lg transition-all duration-200"
                title="Çıkış Yap"
              >
                <LogOut className="h-5 w-5" />
              </button>
            </div>
          </div>
        </aside>

        {/* Main content */}
        <div className="flex-1 flex flex-col min-h-0 overflow-hidden">
          {/* Top navigation bar */}
          <header className="flex-shrink-0 bg-white shadow-sm border-b border-gray-200 lg:shadow-none">
            <div className="flex items-center justify-between h-16 px-4">
              {/* Mobile menu button */}
              <button
                onClick={() => setSidebarOpen(true)}
                className="lg:hidden p-1 rounded-md text-gray-400 hover:text-gray-500"
              >
                <Menu className="h-6 w-6" />
              </button>

              {/* Desktop sidebar toggle button (only for manager) */}
              {user?.role === 'manager' && (
                <button
                  onClick={() => setDesktopSidebarCollapsed(!desktopSidebarCollapsed)}
                  className="hidden lg:flex p-2 rounded-md text-slate-500 hover:text-teal-600 hover:bg-slate-100 transition-colors"
                  title={desktopSidebarCollapsed ? 'Menüyü Aç' : 'Menüyü Kapat'}
                >
                  <Menu className="h-5 w-5" />
                </button>
              )}

              <div className="flex-1 lg:flex lg:items-center lg:justify-between">
                <div className="min-w-0 flex-1">
                  <h2 className="text-2xl font-bold leading-7 text-gray-900 sm:truncate">
                    {getPageTitle(pathname)}
                  </h2>
                </div>
                <div className="ml-4 flex items-center space-x-4">
                  <NotificationBell />
                </div>
              </div>
            </div>
          </header>

          {/* Main content area */}
          <main className="flex-1 h-0 p-4 lg:p-6 overflow-y-auto">
            {children}
          </main>
        </div>
      </div>
    </div>
  )
}

function getPageTitle(pathname: string): string {
  const segments = pathname.split('/').filter(Boolean)
  const lastSegment = segments[segments.length - 1]

  const titles: Record<string, string> = {
    'dashboard': 'Dashboard',
    'projects': 'Projeler',
    'incomes': 'Gelirler',
    'expenses': 'Giderler',
    'payments': 'Ödeme Talimatları',
    'balances': 'Bakiyeler',
    'users': 'Kullanıcılar',
    'personnel': 'Personel',
    'reports': 'Raporlar',
    'notifications': 'Bildirimler',
    'profile': 'Profil Ayarları',
    'settings': 'Ayarlar'
  }

  return titles[lastSegment] || 'Dashboard'
}
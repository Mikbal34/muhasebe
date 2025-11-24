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
    title: 'Ödeme ve Bakiye İşlemleri',
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
    title: 'Sistem Kullanıcıları ve Personeller',
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
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [user, setUser] = useState(propUser)
  const [openMenus, setOpenMenus] = useState<Record<string, boolean>>({})
  const pathname = usePathname()

  useEffect(() => {
    // If no user prop is passed, try to get from localStorage
    if (!propUser) {
      const storedUser = localStorage.getItem('user')
      if (storedUser) {
        try {
          setUser(JSON.parse(storedUser))
        } catch (error) {
          console.error('Failed to parse stored user:', error)
        }
      }
    } else {
      setUser(propUser)
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
    <div className="min-h-screen bg-gray-50">
      {/* Mobile sidebar backdrop */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-40 bg-black bg-opacity-50 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Desktop Layout */}
      <div className="lg:flex lg:h-screen">
        {/* Sidebar */}
        <aside className={`
          fixed inset-y-0 left-0 z-50 w-64 bg-white shadow-lg transform transition-transform duration-300 ease-in-out
          ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}
          lg:translate-x-0 lg:static lg:inset-auto lg:h-screen lg:flex lg:flex-col lg:shadow-md
        `}>
          <div className="flex items-center justify-between h-16 px-4 border-b border-gray-200">
            <h1 className="text-lg font-semibold text-gray-900">
              Gelir Dağıtım
            </h1>
            <button
              onClick={() => setSidebarOpen(false)}
              className="lg:hidden p-1 rounded-md text-gray-400 hover:text-gray-500"
            >
              <X className="h-6 w-6" />
            </button>
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

                const isActive = item.href && (pathname === item.href || pathname.startsWith(item.href + '/'))

                if (hasSubmenu) {
                  return (
                    <div key={item.title}>
                      <button
                        onClick={() => setOpenMenus({ ...openMenus, [item.title]: !isOpen })}
                        className={`
                          w-full group flex items-center justify-between px-2 py-2 text-sm font-medium rounded-md transition-colors
                          ${isSubmenuActive
                            ? 'bg-blue-50 text-blue-700'
                            : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
                          }
                        `}
                      >
                        <div className="flex items-center">
                          <Icon className={`
                            mr-3 h-5 w-5 flex-shrink-0
                            ${isSubmenuActive ? 'text-blue-500' : 'text-gray-400 group-hover:text-gray-500'}
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
                                  group flex items-center px-2 py-2 text-sm font-medium rounded-md transition-colors
                                  ${isSubActive
                                    ? 'bg-blue-100 text-blue-700'
                                    : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
                                  }
                                `}
                                onClick={() => setSidebarOpen(false)}
                              >
                                <SubIcon className={`
                                  mr-3 h-4 w-4 flex-shrink-0
                                  ${isSubActive ? 'text-blue-500' : 'text-gray-400 group-hover:text-gray-500'}
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
                      group flex items-center px-2 py-2 text-sm font-medium rounded-md transition-colors
                      ${isActive
                        ? 'bg-blue-100 text-blue-700'
                        : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
                      }
                    `}
                    onClick={() => setSidebarOpen(false)}
                  >
                    <Icon className={`
                      mr-3 h-5 w-5 flex-shrink-0
                      ${isActive ? 'text-blue-500' : 'text-gray-400 group-hover:text-gray-500'}
                    `} />
                    {item.title}
                  </Link>
                )
              })}
            </div>
          </nav>

          {/* User section */}
          <div className="mt-auto p-4 border-t border-gray-200">
            <div className="flex items-center">
              <Link
                href="/dashboard/profile"
                className="flex items-center flex-1 min-w-0 p-2 rounded-md hover:bg-gray-100 transition-colors"
                onClick={() => setSidebarOpen(false)}
              >
                <div className="flex-shrink-0">
                  <div className="h-8 w-8 bg-blue-500 rounded-full flex items-center justify-center">
                    <span className="text-sm font-medium text-white">
                      {user?.full_name?.charAt(0).toUpperCase() || 'U'}
                    </span>
                  </div>
                </div>
                <div className="ml-3 flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900 truncate">
                    {user?.full_name || 'Kullanıcı'}
                  </p>
                  <p className="text-xs text-gray-500 capitalize">
                    {user?.role === 'admin' ? 'Yönetici (Admin)' :
                      user?.role === 'manager' ? 'Yönetici' : 'Kullanıcı'}
                  </p>
                </div>
              </Link>
              <button
                onClick={handleLogout}
                className="ml-2 flex-shrink-0 p-1 text-gray-400 hover:text-gray-500"
                title="Çıkış Yap"
              >
                <LogOut className="h-5 w-5" />
              </button>
            </div>
          </div>
        </aside>

        {/* Main content */}
        <div className="flex-1 lg:flex lg:flex-col lg:min-h-screen lg:overflow-hidden">
          {/* Top navigation bar */}
          <header className="bg-white shadow-sm border-b border-gray-200 lg:shadow-none">
            <div className="flex items-center justify-between h-16 px-4">
              <button
                onClick={() => setSidebarOpen(true)}
                className="lg:hidden p-1 rounded-md text-gray-400 hover:text-gray-500"
              >
                <Menu className="h-6 w-6" />
              </button>

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
          <main className="flex-1 p-4 lg:p-6 overflow-auto lg:overflow-y-auto">
            <div className="lg:pl-0">
              {children}
            </div>
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
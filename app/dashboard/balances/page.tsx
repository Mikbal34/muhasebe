'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import DashboardLayout from '@/components/layout/dashboard-layout'
import Link from 'next/link'
import {
  Wallet,
  Search,
  Download,
  Users,
  UserCheck,
  Clock,
  ChevronDown,
  ChevronRight,
  X,
  Receipt,
  Building2,
  TrendingUp,
  TrendingDown,
  FolderOpen,
  History,
  ArrowUpRight,
  ArrowDownRight,
  CreditCard,
  FileText,
  Gavel,
  MoreVertical,
  Eye
} from 'lucide-react'
import PersonBadge from '@/components/ui/person-badge'
import { StatCardSkeleton, Skeleton } from '@/components/ui/skeleton'
import { useBalances, useBalanceTransactions } from '@/hooks/use-balances'
import { useProjects } from '@/hooks/use-projects'
import { turkishIncludes } from '@/lib/utils/string'

interface User {
  id: string
  full_name: string
  email: string
  role: 'admin' | 'manager'
}

interface Person {
  id: string
  full_name: string
  email: string
  iban: string | null
}

interface Project {
  id: string
  code: string
  name: string
}

interface Balance {
  id: string
  user_id: string | null
  personnel_id: string | null
  project_id: string | null
  available_amount: number
  debt_amount: number
  reserved_amount: number
  last_updated: string
  user: Person | null
  personnel: Person | null
  project: Project | null
}

interface PersonSummary {
  id: string
  type: 'user' | 'personnel'
  full_name: string
  email: string
  iban: string | null
  totalBalance: number
  projectBalances: Array<{
    balanceId: string
    projectId: string
    projectCode: string
    projectName: string
    available: number
    debt: number
    reserved: number
  }>
}

export default function BalancesPage() {
  const [user, setUser] = useState<User | null>(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [typeFilter, setTypeFilter] = useState<string>('')
  const [projectFilter, setProjectFilter] = useState<string>('')
  const [expandedPersons, setExpandedPersons] = useState<Record<string, boolean>>({})
  const [selectedBalanceId, setSelectedBalanceId] = useState<string | null>(null)
  const [selectedPerson, setSelectedPerson] = useState<PersonSummary | null>(null)
  const [showTransactionPanel, setShowTransactionPanel] = useState(false)
  const router = useRouter()

  const { data: balances = [], isLoading: balancesLoading } = useBalances()
  const { data: projects = [] } = useProjects()
  const { data: transactions = [] } = useBalanceTransactions(selectedBalanceId)

  useEffect(() => {
    const token = localStorage.getItem('token')
    const userData = localStorage.getItem('user')

    if (!token || !userData) {
      router.push('/login')
      return
    }

    try {
      const parsedUser = JSON.parse(userData)
      setUser(parsedUser)
    } catch (err) {
      router.push('/login')
    }
  }, [router])

  // Group balances by person
  const personSummaries: PersonSummary[] = (() => {
    const personMap = new Map<string, PersonSummary>()

    balances.forEach(balance => {
      const person = balance.user || balance.personnel
      if (!person) return

      const personId = person.id
      const personType = balance.user_id ? 'user' : 'personnel'

      if (!personMap.has(personId)) {
        personMap.set(personId, {
          id: personId,
          type: personType as 'user' | 'personnel',
          full_name: person.full_name,
          email: person.email,
          iban: person.iban,
          totalBalance: 0,
          projectBalances: []
        })
      }

      const personSummary = personMap.get(personId)!
      personSummary.totalBalance += balance.available_amount

      if (balance.project) {
        personSummary.projectBalances.push({
          balanceId: balance.id,
          projectId: balance.project.id,
          projectCode: balance.project.code,
          projectName: balance.project.name,
          available: balance.available_amount,
          debt: balance.debt_amount,
          reserved: balance.reserved_amount
        })
      }
    })

    return Array.from(personMap.values()).sort((a, b) => b.totalBalance - a.totalBalance)
  })()

  // Filter persons
  const filteredPersons = personSummaries.filter(person => {
    const matchesSearch = turkishIncludes(person.full_name, searchTerm) ||
                         turkishIncludes(person.email, searchTerm)
    const matchesType = !typeFilter || person.type === typeFilter
    const matchesProject = !projectFilter || person.projectBalances.some(pb => pb.projectId === projectFilter)
    return matchesSearch && matchesType && matchesProject
  })

  // Calculate KPI stats
  const totalBalance = personSummaries.reduce((sum, p) => sum + p.totalBalance, 0)
  const userBalance = personSummaries.filter(p => p.type === 'user').reduce((sum, p) => sum + p.totalBalance, 0)
  const personnelBalance = personSummaries.filter(p => p.type === 'personnel').reduce((sum, p) => sum + p.totalBalance, 0)
  const userCount = personSummaries.filter(p => p.type === 'user').length
  const personnelCount = personSummaries.filter(p => p.type === 'personnel').length

  const togglePerson = (personId: string) => {
    setExpandedPersons(prev => ({
      ...prev,
      [personId]: !prev[personId]
    }))
  }

  const openTransactionHistory = (person: PersonSummary, balanceId: string) => {
    setSelectedPerson(person)
    setSelectedBalanceId(balanceId)
    setShowTransactionPanel(true)
  }

  const getInitials = (name: string) => {
    return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)
  }

  const getTransactionTypeInfo = (type: string, description?: string | null) => {
    if (description?.includes('Damga vergisi')) {
      return { color: 'text-gold', bgColor: 'bg-gold/10', icon: FileText, text: 'Damga Vergisi' }
    }
    if (description?.includes('Hakem heyeti')) {
      return { color: 'text-navy', bgColor: 'bg-navy/10', icon: Gavel, text: 'Hakem Heyeti' }
    }

    switch (type) {
      case 'income':
        return { color: 'text-navy', bgColor: 'bg-navy/10', icon: ArrowUpRight, text: 'Gelir' }
      case 'payment':
        return { color: 'text-gold', bgColor: 'bg-gold/10', icon: ArrowDownRight, text: 'Ödeme' }
      case 'debt':
        return { color: 'text-slate-600', bgColor: 'bg-slate-100', icon: CreditCard, text: 'Borç' }
      case 'adjustment':
        return { color: 'text-slate-600', bgColor: 'bg-slate-100', icon: History, text: 'Düzeltme' }
      default:
        return { color: 'text-slate-600', bgColor: 'bg-slate-100', icon: History, text: type }
    }
  }

  if (balancesLoading || !user) {
    return (
      <DashboardLayout user={user || { id: '', full_name: 'Yükleniyor...', email: '', role: 'manager' }}>
        <div className="space-y-8">
          <div className="flex justify-between items-start">
            <div>
              <Skeleton className="h-12 w-48 mb-2" />
              <Skeleton className="h-6 w-96" />
            </div>
            <div className="flex gap-3">
              <Skeleton className="h-11 w-32" />
              <Skeleton className="h-11 w-36" />
            </div>
          </div>
          <StatCardSkeleton count={4} />
          <Skeleton className="h-14 w-full rounded-xl" />
          <Skeleton className="h-96 w-full rounded-xl" />
        </div>
      </DashboardLayout>
    )
  }

  return (
    <DashboardLayout user={user}>
      <div className="space-y-8">
        {/* Page Header */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
          <div>
            <h1 className="text-navy text-4xl font-black tracking-tight mb-1">Bakiyeler</h1>
            <p className="text-slate-500 text-base">Kullanıcı ve personel bakiyelerini görüntüleyin ve yönetin.</p>
          </div>
          <div className="flex gap-3">
            <button className="flex items-center gap-2 px-5 py-2.5 border-2 border-slate-200 rounded-lg hover:bg-white transition-all font-bold text-sm text-slate-700">
              <Download className="w-5 h-5" />
              Dışa Aktar
            </button>
            <Link
              href="/dashboard/balances/allocate"
              className="flex items-center gap-2 px-6 py-2.5 bg-navy text-white rounded-lg hover:bg-navy/90 transition-all font-bold shadow-lg shadow-navy/20 text-sm"
            >
              <Wallet className="w-5 h-5" />
              Dağıtım Yap
            </Link>
          </div>
        </div>

        {/* KPI Stats */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
          {/* Toplam Bakiye */}
          <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200 relative overflow-hidden">
            <div className="h-1 w-full bg-gradient-to-r from-navy to-gold absolute top-0 left-0" />
            <div className="flex items-center justify-between mb-4">
              <span className="text-slate-500 text-sm font-bold uppercase tracking-wider">Toplam Bakiye</span>
              <Wallet className="w-6 h-6 text-navy" />
            </div>
            <p className="text-3xl font-black text-navy tracking-tight">
              ₺{totalBalance.toLocaleString('tr-TR', { minimumFractionDigits: 2 })}
            </p>
            <p className="text-xs text-slate-400 mt-1">{personSummaries.length} kişi</p>
          </div>

          {/* Kişi Sayısı */}
          <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200 relative overflow-hidden">
            <div className="h-1 w-full bg-gradient-to-r from-navy to-gold absolute top-0 left-0" />
            <div className="flex items-center justify-between mb-4">
              <span className="text-slate-500 text-sm font-bold uppercase tracking-wider">Kişi Sayısı</span>
              <Users className="w-6 h-6 text-navy" />
            </div>
            <p className="text-3xl font-black text-navy tracking-tight">
              {userCount + personnelCount}
            </p>
            <p className="text-xs text-slate-400 mt-1">{userCount} kullanıcı, {personnelCount} personel</p>
          </div>

          {/* Aktif Projeler */}
          <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200 relative overflow-hidden">
            <div className="h-1 w-full bg-gradient-to-r from-navy to-gold absolute top-0 left-0" />
            <div className="flex items-center justify-between mb-4">
              <span className="text-slate-500 text-sm font-bold uppercase tracking-wider">Aktif Projeler</span>
              <Building2 className="w-6 h-6 text-navy" />
            </div>
            <p className="text-3xl font-black text-navy tracking-tight">
              {new Set(balances.filter(b => b.project).map(b => b.project!.id)).size}
            </p>
            <p className="text-xs text-slate-400 mt-1">bakiye dağıtılmış</p>
          </div>
        </div>

        {/* Filter Bar */}
        <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-200">
          <div className="flex flex-wrap items-center gap-4">
            {/* Search */}
            <div className="flex-1 min-w-[280px] relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 w-5 h-5" />
              <input
                type="text"
                placeholder="İsim veya e-posta ara..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-11 pr-4 h-11 bg-slate-50 border-none rounded-lg text-sm focus:ring-2 focus:ring-navy/20 placeholder:text-slate-400"
              />
            </div>

            {/* Type Filter */}
            <div className="relative">
              <select
                value={typeFilter}
                onChange={(e) => setTypeFilter(e.target.value)}
                className="pl-4 pr-10 h-11 bg-slate-50 border-none rounded-lg text-sm font-semibold text-slate-700 focus:ring-2 focus:ring-navy/20 appearance-none cursor-pointer min-w-[150px]"
              >
                <option value="">Tümü (Tip)</option>
                <option value="user">Kullanıcı</option>
                <option value="personnel">Personel</option>
              </select>
              <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4 pointer-events-none" />
            </div>

            {/* Project Filter */}
            <div className="relative">
              <FolderOpen className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4 pointer-events-none" />
              <select
                value={projectFilter}
                onChange={(e) => setProjectFilter(e.target.value)}
                className="pl-10 pr-10 h-11 bg-slate-50 border-none rounded-lg text-sm font-semibold text-slate-700 focus:ring-2 focus:ring-navy/20 appearance-none cursor-pointer min-w-[180px]"
              >
                <option value="">Tüm Projeler</option>
                {projects.map((project: any) => (
                  <option key={project.id} value={project.id}>
                    {project.code}
                  </option>
                ))}
              </select>
              <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4 pointer-events-none" />
            </div>

            <div className="h-8 w-px bg-slate-200 mx-1 hidden md:block" />

            {/* Count Badge */}
            <div className="bg-navy/10 text-navy px-4 py-2 rounded-lg text-xs font-black uppercase tracking-wider">
              {filteredPersons.length} Kişi Görüntüleniyor
            </div>
          </div>
        </div>

        {/* Person List - Accordion */}
        <div className="space-y-3">
          {filteredPersons.length === 0 ? (
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-16 text-center">
              <div className="w-20 h-20 bg-gradient-to-br from-navy to-gold rounded-2xl flex items-center justify-center mx-auto mb-6">
                <Wallet className="w-10 h-10 text-white" />
              </div>
              <h3 className="text-xl font-black text-navy mb-2">
                {searchTerm || typeFilter || projectFilter ? 'Sonuç bulunamadı' : 'Henüz bakiye kaydı yok'}
              </h3>
              <p className="text-slate-500">
                {searchTerm || typeFilter || projectFilter
                  ? 'Arama kriterlerinizi değiştirmeyi deneyin'
                  : 'Dağıtım yaparak bakiye oluşturabilirsiniz'
                }
              </p>
            </div>
          ) : (
            filteredPersons.map((person) => {
              const isExpanded = expandedPersons[person.id]

              return (
                <div
                  key={person.id}
                  className={`bg-white border rounded-xl overflow-hidden transition-all ${
                    isExpanded
                      ? 'border-2 border-navy shadow-lg shadow-navy/5'
                      : 'border-slate-200 hover:border-navy/30'
                  }`}
                >
                  {/* Person Header */}
                  <button
                    onClick={() => togglePerson(person.id)}
                    className={`w-full flex items-center justify-between p-5 transition-colors ${
                      isExpanded ? 'bg-navy/5' : 'hover:bg-slate-50'
                    }`}
                  >
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 rounded-full bg-gradient-to-br from-navy to-navy/80 flex items-center justify-center text-white font-bold text-lg">
                        {getInitials(person.full_name)}
                      </div>
                      <div className="text-left">
                        <div className="flex items-center gap-2">
                          <h3 className={`font-bold ${isExpanded ? 'text-navy' : 'text-slate-900'}`}>
                            {person.full_name}
                          </h3>
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded uppercase bg-navy/10 text-navy">
                            {person.type === 'user' ? 'Kullanıcı' : 'Personel'}
                          </span>
                          {!person.iban && (
                            <span className="text-[10px] font-bold px-2 py-0.5 rounded uppercase bg-gold/20 text-gold">
                              IBAN Eksik
                            </span>
                          )}
                        </div>
                        <p className="text-sm text-slate-500">{person.email}</p>
                      </div>
                    </div>

                    <div className="flex items-center gap-6 md:gap-10">
                      <div className="text-right hidden sm:block">
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Proje Sayısı</p>
                        <p className="font-black text-slate-700">{person.projectBalances.length}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Toplam Bakiye</p>
                        <p className="font-black text-navy text-lg">
                          ₺{person.totalBalance.toLocaleString('tr-TR', { minimumFractionDigits: 2 })}
                        </p>
                      </div>
                      <ChevronDown className={`w-5 h-5 text-slate-400 transition-transform ${isExpanded ? 'rotate-180' : ''}`} />
                    </div>
                  </button>

                  {/* Expanded Content - Project Balances */}
                  {isExpanded && (
                    <div className="border-t border-slate-100">
                      {person.projectBalances.length === 0 ? (
                        <div className="p-8 text-center">
                          <Building2 className="w-10 h-10 text-slate-300 mx-auto mb-3" />
                          <p className="text-slate-500">Bu kişinin henüz proje bakiyesi yok</p>
                        </div>
                      ) : (
                        <div className="overflow-x-auto">
                          <table className="w-full text-sm">
                            <thead className="bg-slate-50 text-[11px] font-black text-slate-500 uppercase tracking-widest">
                              <tr>
                                <th className="px-6 py-4 text-left">Proje</th>
                                <th className="px-6 py-4 text-right">Kullanılabilir</th>
                                <th className="px-6 py-4 text-right">Borç</th>
                                <th className="px-6 py-4 text-right">Rezerve</th>
                                <th className="px-6 py-4 text-center">İşlemler</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                              {person.projectBalances.map((pb, index) => (
                                <tr key={pb.balanceId} className={`${index % 2 === 0 ? 'bg-white' : 'bg-slate-50/50'} hover:bg-slate-100/50 transition-colors`}>
                                  <td className="px-6 py-4">
                                    <div className="flex items-center gap-3">
                                      <div className="w-8 h-8 rounded-lg bg-navy/10 flex items-center justify-center">
                                        <Building2 className="w-4 h-4 text-navy" />
                                      </div>
                                      <div>
                                        <p className="font-bold text-navy">{pb.projectCode}</p>
                                        <p className="text-xs text-slate-500">{pb.projectName}</p>
                                      </div>
                                    </div>
                                  </td>
                                  <td className="px-6 py-4 text-right">
                                    <p className="font-black text-navy">
                                      ₺{pb.available.toLocaleString('tr-TR', { minimumFractionDigits: 2 })}
                                    </p>
                                  </td>
                                  <td className="px-6 py-4 text-right">
                                    <p className={`font-bold ${pb.debt > 0 ? 'text-gold' : 'text-slate-400'}`}>
                                      ₺{pb.debt.toLocaleString('tr-TR', { minimumFractionDigits: 2 })}
                                    </p>
                                  </td>
                                  <td className="px-6 py-4 text-right">
                                    <p className={`font-bold ${pb.reserved > 0 ? 'text-slate-600' : 'text-slate-400'}`}>
                                      ₺{pb.reserved.toLocaleString('tr-TR', { minimumFractionDigits: 2 })}
                                    </p>
                                  </td>
                                  <td className="px-6 py-4">
                                    <div className="flex justify-center gap-2">
                                      <button
                                        onClick={(e) => {
                                          e.stopPropagation()
                                          openTransactionHistory(person, pb.balanceId)
                                        }}
                                        className="p-2 text-slate-500 hover:text-navy hover:bg-navy/10 rounded-lg transition-all"
                                        title="İşlem Geçmişi"
                                      >
                                        <History className="w-4 h-4" />
                                      </button>
                                      <Link
                                        href={`/dashboard/payments/new?person=${person.id}&type=${person.type}&project=${pb.projectId}`}
                                        onClick={(e) => e.stopPropagation()}
                                        className="p-2 text-slate-500 hover:text-gold hover:bg-gold/10 rounded-lg transition-all"
                                        title="Ödeme Talimatı"
                                      >
                                        <Receipt className="w-4 h-4" />
                                      </Link>
                                    </div>
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                            <tfoot className="bg-navy/5">
                              <tr>
                                <td className="px-6 py-4 font-black text-navy">TOPLAM</td>
                                <td className="px-6 py-4 text-right font-black text-navy">
                                  ₺{person.projectBalances.reduce((sum, pb) => sum + pb.available, 0).toLocaleString('tr-TR', { minimumFractionDigits: 2 })}
                                </td>
                                <td className="px-6 py-4 text-right font-black text-gold">
                                  ₺{person.projectBalances.reduce((sum, pb) => sum + pb.debt, 0).toLocaleString('tr-TR', { minimumFractionDigits: 2 })}
                                </td>
                                <td className="px-6 py-4 text-right font-black text-slate-600">
                                  ₺{person.projectBalances.reduce((sum, pb) => sum + pb.reserved, 0).toLocaleString('tr-TR', { minimumFractionDigits: 2 })}
                                </td>
                                <td></td>
                              </tr>
                            </tfoot>
                          </table>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )
            })
          )}
        </div>
      </div>

      {/* Transaction History Panel */}
      {showTransactionPanel && (
        <>
          {/* Backdrop */}
          <div
            className="fixed inset-0 bg-black/20 z-40"
            onClick={() => setShowTransactionPanel(false)}
          />

          {/* Panel */}
          <div className="fixed right-0 top-0 h-full w-full max-w-lg bg-white shadow-2xl z-50 overflow-hidden flex flex-col">
            {/* Panel Header */}
            <div className="bg-gradient-to-r from-navy to-navy/90 p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-white font-bold text-lg">İşlem Geçmişi</h2>
                <button
                  onClick={() => setShowTransactionPanel(false)}
                  className="p-2 text-white/70 hover:text-white hover:bg-white/10 rounded-lg transition-all"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
              {selectedPerson && (
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-gold/30 flex items-center justify-center text-white font-bold">
                    {getInitials(selectedPerson.full_name)}
                  </div>
                  <div>
                    <p className="text-white font-bold">{selectedPerson.full_name}</p>
                    <p className="text-white/70 text-sm">{selectedPerson.email}</p>
                  </div>
                </div>
              )}
            </div>

            {/* Transaction List */}
            <div className="flex-1 overflow-y-auto p-4">
              {transactions.length === 0 ? (
                <div className="text-center py-12">
                  <History className="w-12 h-12 text-slate-300 mx-auto mb-4" />
                  <p className="text-slate-500 font-medium">Henüz işlem geçmişi yok</p>
                  <p className="text-slate-400 text-sm">Bu bakiye için kayıtlı işlem bulunmuyor</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {transactions.map((transaction: any) => {
                    const typeInfo = getTransactionTypeInfo(transaction.type, transaction.description)
                    const TypeIcon = typeInfo.icon

                    return (
                      <div key={transaction.id} className="bg-slate-50 rounded-xl p-4 hover:bg-slate-100 transition-colors">
                        <div className="flex items-start gap-3">
                          <div className={`w-10 h-10 rounded-xl ${typeInfo.bgColor} flex items-center justify-center flex-shrink-0`}>
                            <TypeIcon className={`w-5 h-5 ${typeInfo.color}`} />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between gap-2">
                              <span className={`text-sm font-bold ${typeInfo.color}`}>{typeInfo.text}</span>
                              <span className={`text-lg font-black ${
                                transaction.type === 'income' ? 'text-navy' : 'text-gold'
                              }`}>
                                {transaction.type === 'income' ? '+' : '-'}₺{Math.abs(transaction.amount).toLocaleString('tr-TR')}
                              </span>
                            </div>
                            <p className="text-sm text-slate-600 truncate mt-1">
                              {transaction.description || 'İşlem açıklaması yok'}
                            </p>
                            <div className="flex items-center justify-between mt-2">
                              <span className="text-xs text-slate-400">
                                {new Date(transaction.created_at).toLocaleString('tr-TR')}
                              </span>
                              <span className="text-xs text-slate-500">
                                Bakiye: ₺{transaction.balance_after.toLocaleString('tr-TR')}
                              </span>
                            </div>
                          </div>
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          </div>
        </>
      )}
    </DashboardLayout>
  )
}

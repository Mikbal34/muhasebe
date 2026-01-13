'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import DashboardLayout from '@/components/layout/dashboard-layout'
import Link from 'next/link'
import {
  PiggyBank,
  Search,
  Calendar,
  DollarSign,
  TrendingUp,
  TrendingDown,
  CreditCard,
  History,
  FileText,
  Gavel
} from 'lucide-react'
import PersonBadge from '@/components/ui/person-badge'
import { ListItemSkeleton, DetailCardSkeleton, Skeleton } from '@/components/ui/skeleton'
import { useBalances, useBalanceTransactions } from '@/hooks/use-balances'

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

interface Transaction {
  id: string
  type: 'income' | 'payment' | 'debt' | 'adjustment'
  amount: number
  balance_before: number
  balance_after: number
  description: string | null
  created_at: string
}

export default function BalancesPage() {
  const [user, setUser] = useState<User | null>(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedPerson, setSelectedPerson] = useState<string | null>(null)
  const [selectedBalanceId, setSelectedBalanceId] = useState<string | null>(null)
  const router = useRouter()

  // React Query hooks - 5 dakika cache
  const { data: balances = [], isLoading: balancesLoading } = useBalances()
  const { data: transactions = [] } = useBalanceTransactions(selectedBalanceId)

  // Sadece user kontrolü - data fetching React Query'de
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

  // Group balances by person and aggregate project balances
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

    return Array.from(personMap.values())
  })()

  const handlePersonSelect = (personId: string) => {
    setSelectedPerson(personId)
    setSelectedBalanceId(null) // Reset balance selection when person changes
  }

  const handleBalanceSelect = (balanceId: string) => {
    setSelectedBalanceId(balanceId)
  }

  const filteredPersons = personSummaries.filter(person => {
    return person.full_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
           person.email.toLowerCase().includes(searchTerm.toLowerCase())
  })

  const getTransactionTypeInfo = (type: string, description?: string | null) => {
    // Özel gider türlerini kontrol et
    if (description?.includes('Damga vergisi')) {
      return { color: 'text-orange-600', icon: FileText, text: 'Damga Vergisi' }
    }
    if (description?.includes('Hakem heyeti')) {
      return { color: 'text-purple-600', icon: Gavel, text: 'Hakem Heyeti' }
    }

    switch (type) {
      case 'income':
        return { color: 'text-green-600', icon: TrendingUp, text: 'Gelir' }
      case 'payment':
        return { color: 'text-red-600', icon: TrendingDown, text: 'Ödeme' }
      case 'debt':
        return { color: 'text-yellow-600', icon: CreditCard, text: 'Borç' }
      case 'adjustment':
        return { color: 'text-blue-600', icon: History, text: 'Düzeltme' }
      default:
        return { color: 'text-gray-600', icon: History, text: type }
    }
  }

  const selectedPersonData = personSummaries.find(p => p.id === selectedPerson)
  const selectedBalanceData = balances.find(b => b.id === selectedBalanceId)

  if (balancesLoading || !user) {
    return (
      <DashboardLayout user={user || { id: '', full_name: 'Yükleniyor...', email: '', role: 'manager' }}>
        <div className="space-y-6">
          {/* Header Skeleton */}
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div>
              <Skeleton className="h-8 w-32 mb-2" />
              <Skeleton className="h-5 w-96" />
            </div>
          </div>

          {/* Two Column Layout */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Balances List Skeleton */}
            <div className="bg-white rounded-lg shadow-sm border">
              <div className="p-6 border-b border-gray-200">
                <Skeleton className="h-6 w-48 mb-4" />
                <Skeleton className="h-10 w-full" />
              </div>
              <div className="max-h-96 overflow-y-auto p-4">
                <ListItemSkeleton count={5} />
              </div>
            </div>

            {/* Transaction History Skeleton */}
            <div className="bg-white rounded-lg shadow-sm border">
              <div className="p-6 border-b border-gray-200">
                <Skeleton className="h-6 w-48" />
              </div>
              <div className="max-h-96 overflow-y-auto p-4">
                <div className="text-center py-8">
                  <Skeleton className="h-8 w-8 rounded-full mx-auto mb-2" />
                  <Skeleton className="h-4 w-64 mx-auto" />
                </div>
              </div>
            </div>
          </div>

          {/* Balance Details Skeleton */}
          <DetailCardSkeleton rows={4} />
        </div>
      </DashboardLayout>
    )
  }

  return (
    <DashboardLayout user={user}>
      <div className="space-y-6">
        {/* Header */}
        <div className="bg-white rounded-lg shadow-sm p-4 border border-slate-200">
          <div>
            <h1 className="text-xl font-bold text-slate-900">
              Bakiyeler
            </h1>
            <p className="text-sm text-slate-600">
              Personel ve kullanıcı bakiyelerini görüntüleyin ve yönetin
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Person List */}
          <div className="bg-white rounded-lg shadow-sm border">
            <div className="p-4 border-b border-gray-200">
              <h2 className="text-base font-semibold text-gray-900 mb-4">
                Personel & Kullanıcılar
              </h2>

              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                <input
                  type="text"
                  placeholder="Ad veya e-posta ara..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10 w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-teal-500"
                />
              </div>
            </div>

            <div className="max-h-96 overflow-y-auto">
              {filteredPersons.map((person) => (
                <div
                  key={person.id}
                  className={`p-4 border-b border-gray-100 cursor-pointer hover:bg-gray-50 transition-colors ${
                    selectedPerson === person.id ? 'bg-teal-50 border-teal-200' : ''
                  }`}
                  onClick={() => handlePersonSelect(person.id)}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center">
                      <div className="h-10 w-10 bg-slate-700 rounded-lg flex items-center justify-center mr-3">
                        <span className="text-sm font-medium text-white">
                          {person.full_name.charAt(0).toUpperCase()}
                        </span>
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <p className="font-medium text-gray-900">{person.full_name}</p>
                          <PersonBadge type={person.type} />
                        </div>
                        <p className="text-sm text-gray-600">{person.email}</p>
                        {!person.iban && (
                          <p className="text-xs text-red-500">IBAN eksik</p>
                        )}
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="font-semibold text-green-600">
                        ₺{person.totalBalance.toLocaleString('tr-TR')}
                      </p>
                      <p className="text-xs text-gray-500">
                        {person.projectBalances.length} proje
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {filteredPersons.length === 0 && (
              <div className="text-center py-8">
                <PiggyBank className="h-8 w-8 text-gray-400 mx-auto mb-2" />
                <p className="text-gray-600">
                  {searchTerm ? 'Kişi bulunamadı' : 'Henüz bakiye kaydı yok'}
                </p>
              </div>
            )}
          </div>

          {/* Project Balances */}
          <div className="bg-white rounded-lg shadow-sm border">
            <div className="p-4 border-b border-gray-200">
              <h2 className="text-base font-semibold text-gray-900">
                Proje Bazlı Bakiyeler
                {selectedPersonData && (
                  <span className="text-sm font-normal text-gray-600 ml-2">
                    - {selectedPersonData.full_name}
                  </span>
                )}
              </h2>
            </div>

            <div className="max-h-96 overflow-y-auto">
              {selectedPersonData ? (
                selectedPersonData.projectBalances.length > 0 ? (
                  <div className="divide-y divide-gray-100">
                    {selectedPersonData.projectBalances.map((projectBalance) => (
                      <div
                        key={projectBalance.balanceId}
                        className={`p-4 cursor-pointer hover:bg-gray-50 transition-colors ${
                          selectedBalanceId === projectBalance.balanceId ? 'bg-blue-50 border-l-4 border-blue-500' : ''
                        }`}
                        onClick={() => handleBalanceSelect(projectBalance.balanceId)}
                      >
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="font-medium text-gray-900">{projectBalance.projectCode}</p>
                            <p className="text-sm text-gray-600">{projectBalance.projectName}</p>
                          </div>
                          <div className="text-right">
                            <p className="font-semibold text-green-600">
                              ₺{projectBalance.available.toLocaleString('tr-TR')}
                            </p>
                            {projectBalance.debt > 0 && (
                              <p className="text-xs text-red-600">
                                Borç: ₺{projectBalance.debt.toLocaleString('tr-TR')}
                              </p>
                            )}
                            {projectBalance.reserved > 0 && (
                              <p className="text-xs text-blue-600">
                                Rezerve: ₺{projectBalance.reserved.toLocaleString('tr-TR')}
                              </p>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <PiggyBank className="h-8 w-8 text-gray-400 mx-auto mb-2" />
                    <p className="text-gray-600">Bu kişinin henüz proje bakiyesi yok</p>
                  </div>
                )
              ) : (
                <div className="text-center py-8">
                  <PiggyBank className="h-8 w-8 text-gray-400 mx-auto mb-2" />
                  <p className="text-gray-600">
                    Proje bakiyelerini görmek için bir kişi seçin
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Transaction History */}
          <div className="bg-white rounded-lg shadow-sm border">
            <div className="p-4 border-b border-gray-200">
              <h2 className="text-base font-semibold text-gray-900">
                İşlem Geçmişi
                {selectedBalanceData?.project && (
                  <span className="text-sm font-normal text-gray-600 ml-2">
                    - {selectedBalanceData.project.code}
                  </span>
                )}
              </h2>
            </div>

            <div className="max-h-96 overflow-y-auto">
              {selectedBalanceId ? (
                transactions.length > 0 ? (
                  <div className="divide-y divide-gray-100">
                    {transactions.map((transaction) => {
                      const typeInfo = getTransactionTypeInfo(transaction.type, transaction.description)
                      const TypeIcon = typeInfo.icon

                      return (
                        <div key={transaction.id} className="p-4 hover:bg-gray-50">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center">
                              <div className="p-2 rounded-full bg-gray-100 mr-3">
                                <TypeIcon className={`h-4 w-4 ${typeInfo.color}`} />
                              </div>
                              <div>
                                <p className="font-medium text-gray-900">{typeInfo.text}</p>
                                <p className="text-sm text-gray-600 max-w-[200px] truncate">
                                  {transaction.description || 'İşlem açıklaması yok'}
                                </p>
                                <p className="text-xs text-gray-500">
                                  {new Date(transaction.created_at).toLocaleString('tr-TR')}
                                </p>
                              </div>
                            </div>
                            <div className="text-right">
                              <p className={`font-semibold ${
                                transaction.type === 'income' ? 'text-green-600' : 'text-red-600'
                              }`}>
                                {transaction.type === 'income' ? '+' : '-'}₺{Math.abs(transaction.amount).toLocaleString('tr-TR')}
                              </p>
                              <p className="text-xs text-gray-500">
                                Bakiye: ₺{transaction.balance_after.toLocaleString('tr-TR')}
                              </p>
                            </div>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <History className="h-8 w-8 text-gray-400 mx-auto mb-2" />
                    <p className="text-gray-600">Henüz işlem geçmişi yok</p>
                  </div>
                )
              ) : (
                <div className="text-center py-8">
                  <History className="h-8 w-8 text-gray-400 mx-auto mb-2" />
                  <p className="text-gray-600">
                    İşlem geçmişini görmek için bir proje bakiyesi seçin
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Selected Balance Details */}
        {selectedBalanceData && (
          <div className="bg-white p-4 rounded-lg shadow-sm border">
            <h2 className="text-base font-semibold text-gray-900 mb-4">Detaylı Bakiye Bilgisi</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="bg-green-50 p-3 rounded-lg">
                <div className="flex items-center">
                  <DollarSign className="h-5 w-5 text-green-600 mr-2" />
                  <div>
                    <p className="text-xs text-green-800">Kullanılabilir</p>
                    <p className="text-base font-bold text-green-600">
                      ₺{selectedBalanceData.available_amount.toLocaleString('tr-TR')}
                    </p>
                    {selectedBalanceData.reserved_amount > 0 && (
                      <p className="text-xs text-green-600 mt-1">
                        + Rezerve: ₺{selectedBalanceData.reserved_amount.toLocaleString('tr-TR')}
                      </p>
                    )}
                  </div>
                </div>
              </div>

              <div className="bg-red-50 p-3 rounded-lg">
                <div className="flex items-center">
                  <CreditCard className="h-5 w-5 text-red-600 mr-2" />
                  <div>
                    <p className="text-xs text-red-800">Borç</p>
                    <p className="text-base font-bold text-red-600">
                      ₺{selectedBalanceData.debt_amount.toLocaleString('tr-TR')}
                    </p>
                  </div>
                </div>
              </div>

              <div className="bg-blue-50 p-3 rounded-lg">
                <div className="flex items-center">
                  <PiggyBank className="h-5 w-5 text-blue-600 mr-2" />
                  <div>
                    <p className="text-xs text-blue-800">Rezerve</p>
                    <p className="text-base font-bold text-blue-600">
                      ₺{selectedBalanceData.reserved_amount.toLocaleString('tr-TR')}
                    </p>
                  </div>
                </div>
              </div>

              <div className="bg-gray-50 p-3 rounded-lg">
                <div className="flex items-center">
                  <Calendar className="h-5 w-5 text-gray-600 mr-2" />
                  <div>
                    <p className="text-xs text-gray-800">Son Güncelleme</p>
                    <p className="text-xs font-medium text-gray-600">
                      {new Date(selectedBalanceData.last_updated).toLocaleDateString('tr-TR')}
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* IBAN Info */}
            <div className="mt-4 p-4 bg-gray-50 rounded-lg">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-900">IBAN Bilgisi</p>
                  <p className="text-sm text-gray-600">
                    {(selectedBalanceData.user || selectedBalanceData.personnel)?.iban || 'IBAN tanımlanmamış'}
                  </p>
                </div>
                {!(selectedBalanceData.user || selectedBalanceData.personnel)?.iban && (
                  <div className="px-3 py-1 bg-red-100 text-red-800 text-xs rounded-full">
                    IBAN Eksik
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

      </div>
    </DashboardLayout>
  )
}
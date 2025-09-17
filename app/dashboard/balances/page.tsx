'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import DashboardLayout from '@/components/layout/dashboard-layout'
import Link from 'next/link'
import {
  PiggyBank,
  Search,
  Filter,
  Eye,
  User,
  Calendar,
  DollarSign,
  TrendingUp,
  TrendingDown,
  CreditCard,
  History
} from 'lucide-react'

interface User {
  id: string
  full_name: string
  email: string
  role: 'admin' | 'finance_officer' | 'academician'
}

interface Balance {
  id: string
  user_id: string
  available_amount: number
  debt_amount: number
  reserved_amount: number
  last_updated: string
  user: {
    id: string
    full_name: string
    email: string
    iban: string | null
  }
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
  const [balances, setBalances] = useState<Balance[]>([])
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedBalance, setSelectedBalance] = useState<string | null>(null)
  const router = useRouter()

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
      fetchBalances(token)

      // If academician, show only their own balance
      if (parsedUser.role === 'academician') {
        const userBalance = balances.find(b => b.user_id === parsedUser.id)
        if (userBalance) {
          setSelectedBalance(userBalance.id)
        }
      }
    } catch (err) {
      router.push('/login')
    }
  }, [router])

  const fetchBalances = async (token: string) => {
    try {
      const response = await fetch('/api/balances', {
        headers: { 'Authorization': `Bearer ${token}` }
      })
      const data = await response.json()

      if (data.success) {
        setBalances(data.data.balances || [])
      }
    } catch (err) {
      console.error('Failed to fetch balances:', err)
    } finally {
      setLoading(false)
    }
  }

  const fetchTransactions = async (token: string, balanceId: string) => {
    try {
      const response = await fetch(`/api/balances/${balanceId}/transactions`, {
        headers: { 'Authorization': `Bearer ${token}` }
      })
      const data = await response.json()

      if (data.success) {
        setTransactions(data.data.transactions || [])
      }
    } catch (err) {
      console.error('Failed to fetch transactions:', err)
    }
  }

  const handleBalanceSelect = (balanceId: string) => {
    setSelectedBalance(balanceId)
    const token = localStorage.getItem('token')
    if (token) {
      fetchTransactions(token, balanceId)
    }
  }

  const filteredBalances = balances.filter(balance =>
    balance.user.full_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    balance.user.email.toLowerCase().includes(searchTerm.toLowerCase())
  )

  const getTransactionTypeInfo = (type: string) => {
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

  const selectedBalanceData = balances.find(b => b.id === selectedBalance)

  const totalStats = filteredBalances.reduce((acc, balance) => ({
    totalAvailable: acc.totalAvailable + balance.available_amount,
    totalDebt: acc.totalDebt + balance.debt_amount,
    totalReserved: acc.totalReserved + balance.reserved_amount,
    userCount: acc.userCount + 1
  }), { totalAvailable: 0, totalDebt: 0, totalReserved: 0, userCount: 0 })

  if (loading || !user) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-2 text-gray-600">Yükleniyor...</p>
        </div>
      </div>
    )
  }

  return (
    <DashboardLayout user={user}>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">
              {user.role === 'academician' ? 'Bakiyem' : 'Bakiyeler'}
            </h1>
            <p className="text-gray-600">
              {user.role === 'academician'
                ? 'Bakiye durumunuzu ve işlem geçmişinizi görüntüleyin'
                : 'Kullanıcı bakiyelerini görüntüleyin ve yönetin'
              }
            </p>
          </div>

          {user.role === 'academician' && (
            <Link
              href="/dashboard/payments/request"
              className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700"
            >
              <DollarSign className="h-4 w-4 mr-2" />
              Ödeme Talep Et
            </Link>
          )}
        </div>

        {/* Stats Cards */}
        {user.role !== 'academician' && (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <div className="bg-white p-6 rounded-lg shadow-sm border">
              <div className="flex items-center">
                <DollarSign className="h-8 w-8 text-green-600 bg-green-100 rounded-lg p-2" />
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">Toplam Bakiye</p>
                  <p className="text-xl font-bold text-green-600">
                    ₺{totalStats.totalAvailable.toLocaleString('tr-TR')}
                  </p>
                </div>
              </div>
            </div>

            <div className="bg-white p-6 rounded-lg shadow-sm border">
              <div className="flex items-center">
                <CreditCard className="h-8 w-8 text-red-600 bg-red-100 rounded-lg p-2" />
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">Toplam Borç</p>
                  <p className="text-xl font-bold text-red-600">
                    ₺{totalStats.totalDebt.toLocaleString('tr-TR')}
                  </p>
                </div>
              </div>
            </div>

            <div className="bg-white p-6 rounded-lg shadow-sm border">
              <div className="flex items-center">
                <PiggyBank className="h-8 w-8 text-blue-600 bg-blue-100 rounded-lg p-2" />
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">Rezerve</p>
                  <p className="text-xl font-bold text-blue-600">
                    ₺{totalStats.totalReserved.toLocaleString('tr-TR')}
                  </p>
                </div>
              </div>
            </div>

            <div className="bg-white p-6 rounded-lg shadow-sm border">
              <div className="flex items-center">
                <User className="h-8 w-8 text-purple-600 bg-purple-100 rounded-lg p-2" />
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">Kullanıcı</p>
                  <p className="text-xl font-bold text-purple-600">
                    {totalStats.userCount}
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Balances List */}
          <div className="bg-white rounded-lg shadow-sm border">
            <div className="p-6 border-b border-gray-200">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">
                {user.role === 'academician' ? 'Bakiye Durumu' : 'Kullanıcı Bakiyeleri'}
              </h2>

              {user.role !== 'academician' && (
                <div className="relative mb-4">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                  <input
                    type="text"
                    placeholder="Kullanıcı adı veya e-posta ara..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10 w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              )}
            </div>

            <div className="max-h-96 overflow-y-auto">
              {filteredBalances.map((balance) => (
                <div
                  key={balance.id}
                  className={`p-4 border-b border-gray-100 cursor-pointer hover:bg-gray-50 transition-colors ${
                    selectedBalance === balance.id ? 'bg-blue-50 border-blue-200' : ''
                  }`}
                  onClick={() => handleBalanceSelect(balance.id)}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center">
                      <div className="h-10 w-10 bg-blue-500 rounded-full flex items-center justify-center mr-3">
                        <span className="text-sm font-medium text-white">
                          {balance.user.full_name.charAt(0).toUpperCase()}
                        </span>
                      </div>
                      <div>
                        <p className="font-medium text-gray-900">{balance.user.full_name}</p>
                        <p className="text-sm text-gray-600">{balance.user.email}</p>
                        {!balance.user.iban && (
                          <p className="text-xs text-red-500">IBAN eksik</p>
                        )}
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="font-semibold text-green-600">
                        ₺{balance.available_amount.toLocaleString('tr-TR')}
                      </p>
                      {balance.debt_amount > 0 && (
                        <p className="text-sm text-red-600">
                          Borç: ₺{balance.debt_amount.toLocaleString('tr-TR')}
                        </p>
                      )}
                      {balance.reserved_amount > 0 && (
                        <p className="text-sm text-blue-600">
                          Rezerve: ₺{balance.reserved_amount.toLocaleString('tr-TR')}
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {filteredBalances.length === 0 && (
              <div className="text-center py-8">
                <PiggyBank className="h-8 w-8 text-gray-400 mx-auto mb-2" />
                <p className="text-gray-600">
                  {searchTerm ? 'Kullanıcı bulunamadı' : 'Henüz bakiye kaydı yok'}
                </p>
              </div>
            )}
          </div>

          {/* Transaction History */}
          <div className="bg-white rounded-lg shadow-sm border">
            <div className="p-6 border-b border-gray-200">
              <h2 className="text-lg font-semibold text-gray-900">
                İşlem Geçmişi
                {selectedBalanceData && (
                  <span className="text-sm font-normal text-gray-600 ml-2">
                    - {selectedBalanceData.user.full_name}
                  </span>
                )}
              </h2>
            </div>

            <div className="max-h-96 overflow-y-auto">
              {selectedBalance ? (
                transactions.length > 0 ? (
                  <div className="divide-y divide-gray-100">
                    {transactions.map((transaction) => {
                      const typeInfo = getTransactionTypeInfo(transaction.type)
                      const TypeIcon = typeInfo.icon

                      return (
                        <div key={transaction.id} className="p-4 hover:bg-gray-50">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center">
                              <div className={`p-2 rounded-full bg-gray-100 mr-3`}>
                                <TypeIcon className={`h-4 w-4 ${typeInfo.color}`} />
                              </div>
                              <div>
                                <p className="font-medium text-gray-900">{typeInfo.text}</p>
                                <p className="text-sm text-gray-600">
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
                  <PiggyBank className="h-8 w-8 text-gray-400 mx-auto mb-2" />
                  <p className="text-gray-600">
                    İşlem geçmişini görmek için bir kullanıcı seçin
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Selected Balance Details */}
        {selectedBalanceData && (
          <div className="bg-white p-6 rounded-lg shadow-sm border">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Detaylı Bakiye Bilgisi</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="bg-green-50 p-4 rounded-lg">
                <div className="flex items-center">
                  <DollarSign className="h-6 w-6 text-green-600 mr-2" />
                  <div>
                    <p className="text-sm text-green-800">Kullanılabilir</p>
                    <p className="text-lg font-bold text-green-600">
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

              <div className="bg-red-50 p-4 rounded-lg">
                <div className="flex items-center">
                  <CreditCard className="h-6 w-6 text-red-600 mr-2" />
                  <div>
                    <p className="text-sm text-red-800">Borç</p>
                    <p className="text-lg font-bold text-red-600">
                      ₺{selectedBalanceData.debt_amount.toLocaleString('tr-TR')}
                    </p>
                  </div>
                </div>
              </div>

              <div className="bg-blue-50 p-4 rounded-lg">
                <div className="flex items-center">
                  <PiggyBank className="h-6 w-6 text-blue-600 mr-2" />
                  <div>
                    <p className="text-sm text-blue-800">Rezerve</p>
                    <p className="text-lg font-bold text-blue-600">
                      ₺{selectedBalanceData.reserved_amount.toLocaleString('tr-TR')}
                    </p>
                  </div>
                </div>
              </div>

              <div className="bg-gray-50 p-4 rounded-lg">
                <div className="flex items-center">
                  <Calendar className="h-6 w-6 text-gray-600 mr-2" />
                  <div>
                    <p className="text-sm text-gray-800">Son Güncelleme</p>
                    <p className="text-sm font-medium text-gray-600">
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
                    {selectedBalanceData.user.iban || 'IBAN tanımlanmamış'}
                  </p>
                </div>
                {!selectedBalanceData.user.iban && (
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
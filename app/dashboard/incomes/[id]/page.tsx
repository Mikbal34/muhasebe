'use client'

import { useState, useEffect } from 'react'
import { useRouter, useParams } from 'next/navigation'
import DashboardLayout from '@/components/layout/dashboard-layout'
import Link from 'next/link'
import {
  ArrowLeft,
  Calendar,
  FileText,
  Building2,
  DollarSign,
  Percent,
  Users,
  Edit,
  Trash2
} from 'lucide-react'

interface Income {
  id: string
  project_id: string
  gross_amount: number
  vat_rate: number
  vat_amount: number
  net_amount: number
  description?: string
  income_date: string
  created_at: string
  project: {
    id: string
    name: string
    code: string
    company_rate: number
  }
  created_by_user: {
    full_name: string
  }
  distributions: Array<{
    id: string
    amount: number
    share_percentage: number
    user: {
      id: string
      full_name: string
      email: string
    }
  }>
  commission?: {
    rate: number
    amount: number
  }
}

interface User {
  id: string
  full_name: string
  email: string
  role: 'admin' | 'finance_officer' | 'academician'
}

export default function IncomeDetailPage() {
  const [user, setUser] = useState<User | null>(null)
  const [income, setIncome] = useState<Income | null>(null)
  const [loading, setLoading] = useState(true)
  const router = useRouter()
  const params = useParams()
  const id = params.id as string

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
      fetchIncomeDetail(token)
    } catch (err) {
      router.push('/login')
    }
  }, [router, id])

  const fetchIncomeDetail = async (token: string) => {
    try {
      const response = await fetch(`/api/incomes/${id}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      })
      const data = await response.json()

      if (data.success) {
        // Fetch commission details separately
        const commissionResponse = await fetch(`/api/incomes/${id}/commission`, {
          headers: { 'Authorization': `Bearer ${token}` }
        })
        const commissionData = await commissionResponse.json()

        if (commissionData.success && commissionData.data) {
          data.data.income.commission = commissionData.data
        }

        setIncome(data.data.income)
      } else if (response.status === 404) {
        router.push('/dashboard/incomes')
      }
    } catch (err) {
      console.error('Failed to fetch income detail:', err)
    } finally {
      setLoading(false)
    }
  }

  const handleDelete = async () => {
    if (!confirm('Bu gelir kaydını silmek istediğinizden emin misiniz?')) {
      return
    }

    const token = localStorage.getItem('token')
    if (!token) return

    try {
      const response = await fetch(`/api/incomes/${id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      })

      if (response.ok) {
        router.push('/dashboard/incomes')
      }
    } catch (err) {
      console.error('Failed to delete income:', err)
    }
  }

  if (loading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-green-600"></div>
        </div>
      </DashboardLayout>
    )
  }

  if (!income) {
    return (
      <DashboardLayout>
        <div className="p-6">
          <div className="text-center">
            <p className="text-gray-600">Gelir kaydı bulunamadı.</p>
            <Link href="/dashboard/incomes" className="text-green-600 hover:text-green-700 mt-2 inline-block">
              Gelirler listesine dön
            </Link>
          </div>
        </div>
      </DashboardLayout>
    )
  }

  const companyAmount = income.net_amount * (income.project.company_rate / 100)

  return (
    <DashboardLayout>
      <div className="p-6">
        {/* Header */}
        <div className="flex justify-between items-center mb-6">
          <div className="flex items-center space-x-4">
            <Link
              href="/dashboard/incomes"
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <ArrowLeft className="h-5 w-5 text-gray-600" />
            </Link>
            <h1 className="text-2xl font-bold text-gray-900">Gelir Detayı</h1>
          </div>

          {user && (user.role === 'admin' || user.role === 'finance_officer') && (
            <div className="flex gap-2">
              <Link
                href={`/dashboard/incomes/${id}/edit`}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2"
              >
                <Edit className="h-4 w-4" />
                Düzenle
              </Link>
              <button
                onClick={handleDelete}
                className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors flex items-center gap-2"
              >
                <Trash2 className="h-4 w-4" />
                Sil
              </button>
            </div>
          )}
        </div>

        {/* Project Info */}
        <div className="bg-blue-50 rounded-lg border border-blue-200 p-6 mb-6">
          <h2 className="text-lg font-semibold text-blue-900 mb-4 flex items-center">
            <Building2 className="h-5 w-5 mr-2" />
            Proje Bilgileri
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <p className="text-sm text-blue-700">Proje Adı</p>
              <p className="text-base font-medium text-blue-900">{income.project.name}</p>
            </div>
            <div>
              <p className="text-sm text-blue-700">Proje Kodu</p>
              <p className="text-base font-medium text-blue-900">{income.project.code}</p>
            </div>
            <div>
              <p className="text-sm text-blue-700">Şirket Komisyonu</p>
              <p className="text-base font-medium text-blue-900">%{income.project.company_rate}</p>
            </div>
          </div>
        </div>

        {/* Income Details */}
        <div className="bg-white rounded-lg shadow-sm border p-6 mb-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
            <DollarSign className="h-5 w-5 mr-2" />
            Gelir Detayları
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <div className="space-y-4">
                <div>
                  <p className="text-sm text-gray-600">Brüt Tutar</p>
                  <p className="text-xl font-bold text-green-600">
                    ₺{income.gross_amount.toLocaleString('tr-TR', { minimumFractionDigits: 2 })}
                  </p>
                </div>

                <div>
                  <p className="text-sm text-gray-600">KDV (%{income.vat_rate})</p>
                  <p className="text-lg font-semibold text-red-600">
                    -₺{income.vat_amount.toLocaleString('tr-TR', { minimumFractionDigits: 2 })}
                  </p>
                </div>

                <div className="border-t pt-4">
                  <p className="text-sm text-gray-600">Net Tutar</p>
                  <p className="text-xl font-bold text-blue-600">
                    ₺{income.net_amount.toLocaleString('tr-TR', { minimumFractionDigits: 2 })}
                  </p>
                </div>
              </div>
            </div>

            <div className="space-y-4">
              <div>
                <p className="text-sm text-gray-600">Gelir Tarihi</p>
                <p className="text-base font-medium flex items-center">
                  <Calendar className="h-4 w-4 mr-2 text-gray-400" />
                  {new Date(income.income_date).toLocaleDateString('tr-TR')}
                </p>
              </div>

              {income.description && (
                <div>
                  <p className="text-sm text-gray-600">Açıklama</p>
                  <p className="text-base text-gray-700 flex items-start">
                    <FileText className="h-4 w-4 mr-2 mt-0.5 text-gray-400" />
                    <span>{income.description}</span>
                  </p>
                </div>
              )}

              <div>
                <p className="text-sm text-gray-600">Kayıt Tarihi</p>
                <p className="text-base text-gray-700">
                  {new Date(income.created_at).toLocaleDateString('tr-TR', {
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit'
                  })}
                </p>
              </div>

              <div>
                <p className="text-sm text-gray-600">Kaydeden</p>
                <p className="text-base text-gray-700">{income.created_by_user.full_name}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Distribution */}
        <div className="bg-white rounded-lg shadow-sm border p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
            <Users className="h-5 w-5 mr-2" />
            Gelir Dağıtımı
          </h2>

          <div className="space-y-3">
            {/* Company Commission */}
            <div className="bg-orange-50 p-4 rounded-lg border border-orange-200">
              <div className="flex justify-between items-center">
                <div className="flex items-center">
                  <Building2 className="h-5 w-5 text-orange-600 mr-3" />
                  <div>
                    <p className="font-medium text-gray-900">Şirket Komisyonu</p>
                    <p className="text-sm text-gray-600">%{income.project.company_rate} oran</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-lg font-bold text-orange-600">
                    ₺{companyAmount.toLocaleString('tr-TR', { minimumFractionDigits: 2 })}
                  </p>
                </div>
              </div>
            </div>

            {/* Academician Distributions */}
            {income.distributions.map((dist) => (
              <div key={dist.id} className="bg-purple-50 p-4 rounded-lg border border-purple-200">
                <div className="flex justify-between items-center">
                  <div className="flex items-center">
                    <Users className="h-5 w-5 text-purple-600 mr-3" />
                    <div>
                      <p className="font-medium text-gray-900">{dist.user.full_name}</p>
                      <p className="text-sm text-gray-600">%{dist.share_percentage} pay</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-lg font-bold text-purple-600">
                      ₺{dist.amount.toLocaleString('tr-TR', { minimumFractionDigits: 2 })}
                    </p>
                  </div>
                </div>
              </div>
            ))}

            {/* Total Check */}
            <div className="mt-4 pt-4 border-t border-gray-200">
              <div className="flex justify-between items-center">
                <p className="font-semibold text-gray-700">Toplam Dağıtım</p>
                <p className="text-lg font-bold text-gray-900">
                  ₺{income.net_amount.toLocaleString('tr-TR', { minimumFractionDigits: 2 })}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </DashboardLayout>
  )
}
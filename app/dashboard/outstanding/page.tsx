'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import DashboardLayout from '@/components/layout/dashboard-layout'
import {
  ArrowLeft,
  AlertTriangle,
  Building2,
  TrendingUp,
  ChevronDown,
  ChevronUp,
  Search,
  FileText
} from 'lucide-react'

interface User {
  id: string
  full_name: string
  email: string
  role: 'admin' | 'manager'
}

// Mock Data - Açık bakiyesi olan projeler
const MOCK_OUTSTANDING_DATA = {
  total: 11463348.04,
  projectCount: 8,
  projects: [
    {
      id: '1',
      code: 'TTO-2024-042',
      name: 'Yapay Zeka Destekli Kalite Kontrol Sistemi',
      company: 'ABC Teknoloji A.Ş.',
      budget: 2500000,
      invoiced: 1800000,
      collected: 1200000,
      outstanding: 600000,
      incomes: [
        { id: '1', description: 'Başlangıç Ödemesi', date: '2024-03-15', gross: 500000, collected: 500000, outstanding: 0 },
        { id: '2', description: 'Ara Ödeme 1 - Faz 1 Teslim', date: '2024-06-20', gross: 400000, collected: 400000, outstanding: 0 },
        { id: '3', description: 'Ara Ödeme 2 - Faz 2 Teslim', date: '2024-09-10', gross: 500000, collected: 300000, outstanding: 200000 },
        { id: '4', description: 'Ara Ödeme 3 - Test Aşaması', date: '2024-12-05', gross: 400000, collected: 0, outstanding: 400000 },
      ]
    },
    {
      id: '2',
      code: 'TTO-2024-038',
      name: 'Akıllı Şehir IoT Altyapısı Projesi',
      company: 'SmartCity Solutions',
      budget: 5000000,
      invoiced: 3500000,
      collected: 2200000,
      outstanding: 1300000,
      incomes: [
        { id: '5', description: 'Proje Başlangıç', date: '2024-02-01', gross: 1000000, collected: 1000000, outstanding: 0 },
        { id: '6', description: 'Sensör Altyapısı Teslimi', date: '2024-05-15', gross: 1200000, collected: 1200000, outstanding: 0 },
        { id: '7', description: 'Veri Merkezi Kurulumu', date: '2024-08-20', gross: 800000, collected: 0, outstanding: 800000 },
        { id: '8', description: 'Yazılım Entegrasyonu', date: '2024-11-10', gross: 500000, collected: 0, outstanding: 500000 },
      ]
    },
    {
      id: '3',
      code: 'TTO-2024-051',
      name: 'Biyomedikal Görüntüleme Cihazı Geliştirme',
      company: 'MedTech İnovasyon',
      budget: 8000000,
      invoiced: 6000000,
      collected: 3500000,
      outstanding: 2500000,
      incomes: [
        { id: '9', description: 'Ar-Ge Başlangıç Fonu', date: '2024-01-10', gross: 2000000, collected: 2000000, outstanding: 0 },
        { id: '10', description: 'Prototip Geliştirme', date: '2024-04-25', gross: 1500000, collected: 1500000, outstanding: 0 },
        { id: '11', description: 'Klinik Test Aşaması', date: '2024-07-30', gross: 1500000, collected: 0, outstanding: 1500000 },
        { id: '12', description: 'Sertifikasyon Süreci', date: '2024-10-15', gross: 1000000, collected: 0, outstanding: 1000000 },
      ]
    },
    {
      id: '4',
      code: 'TTO-2024-029',
      name: 'Enerji Verimliliği Optimizasyon Yazılımı',
      company: 'GreenEnergy Tech',
      budget: 1800000,
      invoiced: 1400000,
      collected: 900000,
      outstanding: 500000,
      incomes: [
        { id: '13', description: 'Analiz ve Tasarım', date: '2024-03-01', gross: 400000, collected: 400000, outstanding: 0 },
        { id: '14', description: 'Yazılım Geliştirme Faz 1', date: '2024-06-15', gross: 500000, collected: 500000, outstanding: 0 },
        { id: '15', description: 'Yazılım Geliştirme Faz 2', date: '2024-09-20', gross: 500000, collected: 0, outstanding: 500000 },
      ]
    },
    {
      id: '5',
      code: 'TTO-2025-003',
      name: 'Otonom Araç Simülasyon Platformu',
      company: 'AutoDrive Systems',
      budget: 12000000,
      invoiced: 8000000,
      collected: 4500000,
      outstanding: 3500000,
      incomes: [
        { id: '16', description: 'Proje Lansman Ödemesi', date: '2025-01-05', gross: 3000000, collected: 3000000, outstanding: 0 },
        { id: '17', description: 'Simülasyon Motoru Geliştirme', date: '2025-03-20', gross: 2500000, collected: 1500000, outstanding: 1000000 },
        { id: '18', description: 'Sensör Entegrasyonu', date: '2025-06-10', gross: 2500000, collected: 0, outstanding: 2500000 },
      ]
    },
    {
      id: '6',
      code: 'TTO-2024-067',
      name: 'Blockchain Tabanlı Tedarik Zinciri',
      company: 'ChainLogistics',
      budget: 3200000,
      invoiced: 2400000,
      collected: 1600000,
      outstanding: 800000,
      incomes: [
        { id: '19', description: 'Konsept ve Mimari', date: '2024-04-10', gross: 800000, collected: 800000, outstanding: 0 },
        { id: '20', description: 'Smart Contract Geliştirme', date: '2024-07-25', gross: 800000, collected: 800000, outstanding: 0 },
        { id: '21', description: 'Pilot Uygulama', date: '2024-10-30', gross: 800000, collected: 0, outstanding: 800000 },
      ]
    },
    {
      id: '7',
      code: 'TTO-2024-055',
      name: 'Kuantum Hesaplama Araştırma Projesi',
      company: 'QuantumLab Türkiye',
      budget: 15000000,
      invoiced: 10000000,
      collected: 8000000,
      outstanding: 2000000,
      incomes: [
        { id: '22', description: 'Laboratuvar Kurulumu', date: '2024-02-15', gross: 5000000, collected: 5000000, outstanding: 0 },
        { id: '23', description: 'Araştırma Faz 1', date: '2024-06-30', gross: 3000000, collected: 3000000, outstanding: 0 },
        { id: '24', description: 'Araştırma Faz 2', date: '2024-11-15', gross: 2000000, collected: 0, outstanding: 2000000 },
      ]
    },
    {
      id: '8',
      code: 'TTO-2024-044',
      name: 'Tarımsal Drone Teknolojileri',
      company: 'AgroTech Innovations',
      budget: 2200000,
      invoiced: 1600000,
      collected: 1336651.96,
      outstanding: 263348.04,
      incomes: [
        { id: '25', description: 'Drone Tasarımı', date: '2024-03-20', gross: 600000, collected: 600000, outstanding: 0 },
        { id: '26', description: 'Yazılım Geliştirme', date: '2024-06-25', gross: 500000, collected: 500000, outstanding: 0 },
        { id: '27', description: 'Saha Testleri', date: '2024-09-30', gross: 500000, collected: 236651.96, outstanding: 263348.04 },
      ]
    },
  ]
}

export default function OutstandingPage() {
  const router = useRouter()
  const [user] = useState<User>({ id: '1', full_name: 'Demo Kullanıcı', email: 'demo@tto.com', role: 'admin' })
  const [expandedProjects, setExpandedProjects] = useState<Set<string>>(new Set())
  const [searchTerm, setSearchTerm] = useState('')

  const toggleProject = (projectId: string) => {
    const newExpanded = new Set(expandedProjects)
    if (newExpanded.has(projectId)) {
      newExpanded.delete(projectId)
    } else {
      newExpanded.add(projectId)
    }
    setExpandedProjects(newExpanded)
  }

  const filteredProjects = MOCK_OUTSTANDING_DATA.projects.filter(project =>
    project.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    project.code.toLowerCase().includes(searchTerm.toLowerCase()) ||
    project.company.toLowerCase().includes(searchTerm.toLowerCase())
  )

  const maxOutstanding = Math.max(...MOCK_OUTSTANDING_DATA.projects.map(p => p.outstanding))

  return (
    <DashboardLayout user={user}>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center gap-4">
          <button
            onClick={() => router.push('/dashboard')}
            className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
          >
            <ArrowLeft className="w-5 h-5 text-slate-600" />
          </button>
          <div>
            <h1 className="text-2xl font-black text-navy">Açık Bakiyeler</h1>
            <p className="text-sm text-slate-500">Henüz tahsil edilmemiş fatura tutarları</p>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Toplam Açık Bakiye */}
          <div className="bg-white rounded-xl shadow-sm border border-slate-100 overflow-hidden">
            <div className="h-1 bg-gradient-to-r from-gold to-gold/50"></div>
            <div className="p-5">
              <div className="flex justify-between items-start mb-3">
                <p className="text-slate-500 font-semibold text-sm">Toplam Açık Bakiye</p>
                <AlertTriangle className="w-5 h-5 text-gold" />
              </div>
              <p className="text-2xl font-black text-gold">
                ₺{MOCK_OUTSTANDING_DATA.total.toLocaleString('tr-TR', { minimumFractionDigits: 2 })}
              </p>
            </div>
          </div>

          {/* Proje Sayısı */}
          <div className="bg-white rounded-xl shadow-sm border border-slate-100 overflow-hidden">
            <div className="h-1 bg-gradient-to-r from-navy to-navy/50"></div>
            <div className="p-5">
              <div className="flex justify-between items-start mb-3">
                <p className="text-slate-500 font-semibold text-sm">Proje Sayısı</p>
                <Building2 className="w-5 h-5 text-navy" />
              </div>
              <p className="text-2xl font-black text-navy">{MOCK_OUTSTANDING_DATA.projectCount}</p>
              <p className="text-xs text-slate-400 mt-1">Açık bakiyesi olan proje</p>
            </div>
          </div>

          {/* En Yüksek Bakiye */}
          <div className="bg-white rounded-xl shadow-sm border border-slate-100 overflow-hidden">
            <div className="h-1 bg-gradient-to-r from-red-500 to-red-300"></div>
            <div className="p-5">
              <div className="flex justify-between items-start mb-3">
                <p className="text-slate-500 font-semibold text-sm">En Yüksek Bakiye</p>
                <TrendingUp className="w-5 h-5 text-red-500" />
              </div>
              <p className="text-2xl font-black text-red-600">
                ₺{maxOutstanding.toLocaleString('tr-TR', { minimumFractionDigits: 2 })}
              </p>
            </div>
          </div>
        </div>

        {/* Search */}
        <div className="bg-white rounded-xl shadow-sm border border-slate-100 p-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4" />
            <input
              type="text"
              placeholder="Proje adı, kodu veya firma ara..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full h-10 bg-slate-50 border-none rounded-lg pl-10 pr-4 text-sm focus:ring-2 focus:ring-gold/20 placeholder:text-slate-400"
            />
          </div>
        </div>

        {/* Projects Accordion */}
        <div className="space-y-3">
          {filteredProjects.map((project) => (
            <div
              key={project.id}
              className={`bg-white rounded-xl shadow-sm border overflow-hidden transition-all ${
                expandedProjects.has(project.id)
                  ? 'border-gold/30 shadow-gold/10'
                  : 'border-slate-100 hover:border-gold/20'
              }`}
            >
              {/* Accordion Header */}
              <button
                onClick={() => toggleProject(project.id)}
                className="w-full p-5 flex items-center justify-between text-left hover:bg-slate-50/50 transition-colors"
              >
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 rounded-lg bg-gold/10 flex items-center justify-center">
                    <Building2 className="w-5 h-5 text-gold" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="font-bold text-navy">{project.name}</h3>
                      <span className="text-xs font-mono bg-slate-100 text-slate-600 px-2 py-0.5 rounded">
                        {project.code}
                      </span>
                    </div>
                    <p className="text-sm text-slate-500">{project.company}</p>
                  </div>
                </div>
                <div className="flex items-center gap-6">
                  <div className="text-right">
                    <p className="text-xs text-slate-400 uppercase font-bold">Açık Bakiye</p>
                    <p className="text-lg font-black text-gold">
                      ₺{project.outstanding.toLocaleString('tr-TR')}
                    </p>
                  </div>
                  {expandedProjects.has(project.id) ? (
                    <ChevronUp className="w-5 h-5 text-slate-400" />
                  ) : (
                    <ChevronDown className="w-5 h-5 text-slate-400" />
                  )}
                </div>
              </button>

              {/* Accordion Content */}
              {expandedProjects.has(project.id) && (
                <div className="border-t border-slate-100 bg-slate-50/30">
                  {/* Summary Bar */}
                  <div className="p-4 grid grid-cols-4 gap-4 border-b border-slate-100">
                    <div>
                      <p className="text-[10px] text-slate-400 uppercase font-bold">Bütçe</p>
                      <p className="text-sm font-bold text-slate-700">₺{project.budget.toLocaleString('tr-TR')}</p>
                    </div>
                    <div>
                      <p className="text-[10px] text-slate-400 uppercase font-bold">Faturalanan</p>
                      <p className="text-sm font-bold text-navy">₺{project.invoiced.toLocaleString('tr-TR')}</p>
                    </div>
                    <div>
                      <p className="text-[10px] text-slate-400 uppercase font-bold">Tahsil Edilen</p>
                      <p className="text-sm font-bold text-emerald-600">₺{project.collected.toLocaleString('tr-TR')}</p>
                    </div>
                    <div>
                      <p className="text-[10px] text-slate-400 uppercase font-bold">Açık Bakiye</p>
                      <p className="text-sm font-bold text-gold">₺{project.outstanding.toLocaleString('tr-TR')}</p>
                    </div>
                  </div>

                  {/* Income Records */}
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead>
                        <tr className="bg-slate-100/50">
                          <th className="px-4 py-3 text-left text-[10px] font-bold text-slate-500 uppercase">Açıklama</th>
                          <th className="px-4 py-3 text-left text-[10px] font-bold text-slate-500 uppercase">Tarih</th>
                          <th className="px-4 py-3 text-right text-[10px] font-bold text-slate-500 uppercase">Brüt Tutar</th>
                          <th className="px-4 py-3 text-right text-[10px] font-bold text-slate-500 uppercase">Tahsil Edilen</th>
                          <th className="px-4 py-3 text-right text-[10px] font-bold text-slate-500 uppercase">Bekleyen</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {project.incomes.map((income) => (
                          <tr key={income.id} className="hover:bg-white transition-colors">
                            <td className="px-4 py-3">
                              <div className="flex items-center gap-2">
                                <FileText className="w-4 h-4 text-slate-400" />
                                <span className="text-sm text-slate-700">{income.description}</span>
                              </div>
                            </td>
                            <td className="px-4 py-3 text-sm text-slate-600">
                              {new Date(income.date).toLocaleDateString('tr-TR')}
                            </td>
                            <td className="px-4 py-3 text-sm text-right font-medium text-slate-700">
                              ₺{income.gross.toLocaleString('tr-TR')}
                            </td>
                            <td className="px-4 py-3 text-sm text-right font-medium text-emerald-600">
                              ₺{income.collected.toLocaleString('tr-TR')}
                            </td>
                            <td className="px-4 py-3 text-sm text-right font-bold">
                              {income.outstanding > 0 ? (
                                <span className="text-gold">₺{income.outstanding.toLocaleString('tr-TR')}</span>
                              ) : (
                                <span className="text-slate-400">-</span>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>

        {/* Empty State */}
        {filteredProjects.length === 0 && (
          <div className="bg-white rounded-xl shadow-sm border border-slate-100 p-16 text-center">
            <div className="w-16 h-16 mx-auto mb-4 bg-slate-100 rounded-full flex items-center justify-center">
              <Search className="w-8 h-8 text-slate-400" />
            </div>
            <h3 className="text-lg font-bold text-slate-700 mb-2">Sonuç Bulunamadı</h3>
            <p className="text-slate-500">Arama kriterlerinize uygun proje bulunamadı.</p>
          </div>
        )}
      </div>
    </DashboardLayout>
  )
}

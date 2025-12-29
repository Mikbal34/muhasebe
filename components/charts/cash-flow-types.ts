// Cash Flow Diagram Types

export type ExpenseCategoryId = 'operasyonel' | 'personel' | 'vergiler' | 'pazarlama' | 'diger'

export interface CashFlowNode {
  id: string
  label: string
  value: number
  color: string
  depth: number  // 0=kaynak (gelir), 1=kategori, 2=alt-kategori, 3=net kalan
}

export interface CashFlowLink {
  source: string
  target: string
  value: number
  color: string
}

export interface CashFlowData {
  totalIncome: number
  totalExpenses: number
  netRemaining: number
  nodes: CashFlowNode[]
  links: CashFlowLink[]
}

export interface CategoryMapping {
  id: ExpenseCategoryId
  label: string
  color: string
  keywords: string[]
}

// Kategori renkleri ve keyword eşleştirmeleri
export const EXPENSE_CATEGORIES: CategoryMapping[] = [
  {
    id: 'operasyonel',
    label: 'Operasyonel',
    color: '#F59E0B', // amber-500
    keywords: ['kira', 'elektrik', 'su', 'doğalgaz', 'internet', 'telefon', 'ofis', 'sunucu', 'hosting', 'domain', 'malzeme', 'temizlik', 'bakım', 'onarım', 'sigorta', 'aidat']
  },
  {
    id: 'personel',
    label: 'Personel',
    color: '#8B5CF6', // violet-500
    keywords: ['maaş', 'maas', 'sgk', 'personel', 'çalışan', 'işçi', 'ücret', 'prim', 'ikramiye', 'yemek', 'servis', 'eğitim', 'sağlık']
  },
  {
    id: 'vergiler',
    label: 'Vergiler',
    color: '#EF4444', // red-500
    keywords: ['vergi', 'kdv', 'stopaj', 'damga', 'kurumsal', 'gelir vergisi', 'mtv', 'harç', 'ceza', 'faiz']
  },
  {
    id: 'pazarlama',
    label: 'Pazarlama',
    color: '#3B82F6', // blue-500
    keywords: ['reklam', 'google', 'ads', 'facebook', 'instagram', 'sosyal medya', 'tanıtım', 'promosyon', 'etkinlik', 'fuar', 'sponsor', 'ajans', 'grafik', 'tasarım']
  },
  {
    id: 'diger',
    label: 'Diğer',
    color: '#6B7280', // gray-500
    keywords: []
  }
]

export const FLOW_COLORS = {
  income: '#14B8A6',      // teal-500
  netRemaining: '#10B981', // emerald-500
  linkBase: 'rgba(148, 163, 184, 0.3)',  // slate-400 with opacity
  linkHover: 'rgba(148, 163, 184, 0.5)'
}

// Dönem seçenekleri
export type CashFlowPeriod = 'month' | 'quarter' | 'year'

export interface CashFlowPeriodOption {
  value: CashFlowPeriod
  label: string
}

export const PERIOD_OPTIONS: CashFlowPeriodOption[] = [
  { value: 'month', label: 'Bu Ay' },
  { value: 'quarter', label: 'Bu Çeyrek' },
  { value: 'year', label: 'Bu Yıl' }
]

'use client'

import { useState, useEffect } from 'react'
import { User, Briefcase, Search } from 'lucide-react'
import { turkishIncludes } from '@/lib/utils/string'

export type PersonType = 'user' | 'personnel'

export interface Person {
  id: string
  type: PersonType
  full_name: string
  email: string
  phone?: string | null
  iban?: string | null
  user_role?: string | null
  tc_no?: string | null
  balance?: {
    available_amount: number
    debt_amount: number
  }
}

interface PersonPickerProps {
  value: string
  onChange: (personId: string, personType: PersonType, person: Person) => void
  excludeIds?: string[]
  label?: string
  placeholder?: string
  showBalance?: boolean
  required?: boolean
  disabled?: boolean
  error?: string
  personTypeFilter?: PersonType // Filter to show only users or only personnel
}

export default function PersonPicker({
  value,
  onChange,
  excludeIds = [],
  label,
  placeholder = 'Bir kişi seçin...',
  showBalance = false,
  required = false,
  disabled = false,
  error,
  personTypeFilter,
}: PersonPickerProps) {
  const [people, setPeople] = useState<Person[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [showDropdown, setShowDropdown] = useState(false)

  useEffect(() => {
    fetchPeople()
  }, [personTypeFilter])

  const fetchPeople = async () => {
    try {
      const token = localStorage.getItem('token')
      if (!token) return

      let url = '/api/people/search?include_inactive=false'
      if (personTypeFilter) {
        url += `&person_type=${personTypeFilter}`
      }

      const response = await fetch(url, {
        headers: { 'Authorization': `Bearer ${token}` }
      })
      const data = await response.json()

      if (data.success) {
        setPeople(data.data.people || [])
      }
    } catch (err) {
      console.error('Failed to fetch people:', err)
    } finally {
      setLoading(false)
    }
  }

  const selectedPerson = people.find(p => p.id === value)

  const filteredPeople = people.filter(person => {
    // Exclude already selected IDs
    if (excludeIds.includes(person.id)) return false

    // Search filter
    if (searchTerm) {
      return (
        turkishIncludes(person.full_name, searchTerm) ||
        turkishIncludes(person.email, searchTerm)
      )
    }

    return true
  })

  const handleSelect = (person: Person) => {
    onChange(person.id, person.type, person)
    setShowDropdown(false)
    setSearchTerm('')
  }

  const getPersonTypeLabel = (type: PersonType) => {
    return type === 'user' ? 'Kullanıcı' : 'Personel'
  }

  const getPersonTypeColor = (type: PersonType) => {
    return type === 'user' ? 'bg-blue-100 text-blue-800' : 'bg-green-100 text-green-800'
  }

  const PersonIcon = ({ type }: { type: PersonType }) => {
    const Icon = type === 'user' ? User : Briefcase
    return <Icon className="h-4 w-4" />
  }

  if (loading) {
    return (
      <div>
        {label && (
          <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wider mb-1.5">
            {label}
            {required && <span className="text-red-500 ml-1">*</span>}
          </label>
        )}
        <div className="w-full px-3 py-2.5 border border-slate-200 rounded-lg bg-slate-50">
          <div className="animate-pulse text-sm text-slate-400">Yükleniyor...</div>
        </div>
      </div>
    )
  }

  return (
    <div className="relative">
      {label && (
        <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wider mb-1.5">
          {label}
          {required && <span className="text-red-500 ml-1">*</span>}
        </label>
      )}

      {/* Selected Person Display */}
      <div
        onClick={() => !disabled && setShowDropdown(!showDropdown)}
        className={`w-full px-3 py-2.5 border rounded-lg cursor-pointer transition-all ${
          error ? 'border-red-500' : 'border-slate-200'
        } ${disabled ? 'bg-slate-100 cursor-not-allowed' : 'hover:border-gold bg-slate-50 hover:bg-white'}`}
      >
        {selectedPerson ? (
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2 flex-1 min-w-0">
              <PersonIcon type={selectedPerson.type} />
              <span className="font-medium truncate">{selectedPerson.full_name}</span>
              <span
                className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${getPersonTypeColor(
                  selectedPerson.type
                )}`}
              >
                {getPersonTypeLabel(selectedPerson.type)}
              </span>
            </div>
            {showBalance && selectedPerson.balance && (
              <span className="text-sm text-gray-600 ml-2">
                ₺{selectedPerson.balance.available_amount.toLocaleString('tr-TR')}
              </span>
            )}
          </div>
        ) : (
          <span className="text-gray-500">{placeholder}</span>
        )}
      </div>

      {/* Dropdown */}
      {showDropdown && !disabled && (
        <div className="absolute z-[100] w-full mt-1 bg-white border border-slate-200 rounded-lg shadow-xl max-h-96 overflow-hidden">
          {/* Search Input */}
          <div className="p-3 border-b border-slate-100 bg-slate-50">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 h-4 w-4" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="İsim veya e-posta ara..."
                className="w-full pl-10 pr-3 py-2 bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-gold/30 focus:border-gold text-sm"
                autoFocus
              />
            </div>
          </div>

          {/* People List */}
          <div className="max-h-80 overflow-y-auto">
            {filteredPeople.length === 0 ? (
              <div className="px-4 py-8 text-center text-slate-400">
                <User className="w-8 h-8 mx-auto mb-2 opacity-50" />
                <p className="text-sm">{searchTerm ? 'Sonuç bulunamadı' : 'Kişi bulunamadı'}</p>
              </div>
            ) : (
              filteredPeople.map((person) => (
                <div
                  key={person.id}
                  onClick={() => handleSelect(person)}
                  className="px-4 py-3 hover:bg-gold/5 cursor-pointer border-b border-slate-50 last:border-0 transition-colors"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3 flex-1 min-w-0">
                      <div className="w-9 h-9 rounded-full bg-navy/10 flex items-center justify-center flex-shrink-0">
                        <PersonIcon type={person.type} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="font-semibold text-navy truncate">{person.full_name}</div>
                        <div className="text-xs text-slate-500 truncate">{person.email}</div>
                      </div>
                    </div>
                    <div className="flex items-center space-x-2 ml-2">
                      {showBalance && person.balance && (
                        <span className="text-sm font-medium text-gold whitespace-nowrap">
                          ₺{person.balance.available_amount.toLocaleString('tr-TR')}
                        </span>
                      )}
                      <span
                        className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold whitespace-nowrap ${
                          person.type === 'user'
                            ? 'bg-navy/10 text-navy'
                            : 'bg-gold/10 text-gold'
                        }`}
                      >
                        {getPersonTypeLabel(person.type)}
                      </span>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* Click Outside to Close */}
      {showDropdown && (
        <div
          className="fixed inset-0 z-[99]"
          onClick={() => setShowDropdown(false)}
        />
      )}

      {/* Error Message */}
      {error && <p className="mt-1 text-sm text-red-600">{error}</p>}
    </div>
  )
}

'use client'

import { useState, useEffect } from 'react'
import { User, Briefcase, Search } from 'lucide-react'

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
      const search = searchTerm.toLowerCase()
      return (
        person.full_name.toLowerCase().includes(search) ||
        person.email.toLowerCase().includes(search)
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
          <label className="block text-sm font-medium text-gray-700 mb-1">
            {label}
            {required && <span className="text-red-500 ml-1">*</span>}
          </label>
        )}
        <div className="w-full px-3 py-2 border border-gray-300 rounded-md bg-gray-50">
          <div className="animate-pulse">Yükleniyor...</div>
        </div>
      </div>
    )
  }

  return (
    <div className="relative">
      {label && (
        <label className="block text-sm font-medium text-gray-700 mb-1">
          {label}
          {required && <span className="text-red-500 ml-1">*</span>}
        </label>
      )}

      {/* Selected Person Display */}
      <div
        onClick={() => !disabled && setShowDropdown(!showDropdown)}
        className={`w-full px-3 py-2 border rounded-md cursor-pointer ${
          error ? 'border-red-500' : 'border-gray-300'
        } ${disabled ? 'bg-gray-100 cursor-not-allowed' : 'hover:border-gray-400 bg-white'}`}
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
        <div className="absolute z-50 w-full mt-1 bg-white border border-gray-300 rounded-md shadow-lg max-h-96 overflow-hidden">
          {/* Search Input */}
          <div className="p-2 border-b">
            <div className="relative">
              <Search className="absolute left-2 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Ara..."
                className="w-full pl-8 pr-3 py-1.5 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                autoFocus
              />
            </div>
          </div>

          {/* People List */}
          <div className="max-h-80 overflow-y-auto">
            {filteredPeople.length === 0 ? (
              <div className="px-3 py-8 text-center text-gray-500">
                {searchTerm ? 'Sonuç bulunamadı' : 'Kişi bulunamadı'}
              </div>
            ) : (
              filteredPeople.map((person) => (
                <div
                  key={person.id}
                  onClick={() => handleSelect(person)}
                  className="px-3 py-2 hover:bg-gray-100 cursor-pointer border-b border-gray-100 last:border-0"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2 flex-1 min-w-0">
                      <PersonIcon type={person.type} />
                      <div className="flex-1 min-w-0">
                        <div className="font-medium truncate">{person.full_name}</div>
                        <div className="text-sm text-gray-500 truncate">{person.email}</div>
                      </div>
                    </div>
                    <div className="flex items-center space-x-2 ml-2">
                      {showBalance && person.balance && (
                        <span className="text-sm text-gray-600 whitespace-nowrap">
                          ₺{person.balance.available_amount.toLocaleString('tr-TR')}
                        </span>
                      )}
                      <span
                        className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium whitespace-nowrap ${getPersonTypeColor(
                          person.type
                        )}`}
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
          className="fixed inset-0 z-40"
          onClick={() => setShowDropdown(false)}
        />
      )}

      {/* Error Message */}
      {error && <p className="mt-1 text-sm text-red-600">{error}</p>}
    </div>
  )
}

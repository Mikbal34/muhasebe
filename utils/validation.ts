// Form validation utilities

export interface ValidationRule<T = any> {
  validator: (value: T) => boolean
  message: string
}

export interface FormField<T = any> {
  value: T
  rules?: ValidationRule<T>[]
}

export interface ValidationResult {
  isValid: boolean
  errors: Record<string, string>
}

// Common validation rules
export const ValidationRules = {
  required: (message = 'Bu alan gereklidir'): ValidationRule<any> => ({
    validator: (value) => {
      if (typeof value === 'string') return value.trim().length > 0
      if (typeof value === 'number') return !isNaN(value)
      if (Array.isArray(value)) return value.length > 0
      return value !== null && value !== undefined && value !== ''
    },
    message
  }),

  email: (message = 'Geçerli bir email adresi giriniz'): ValidationRule<string> => ({
    validator: (value) => {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
      return !value || emailRegex.test(value.trim())
    },
    message
  }),

  minLength: (min: number, message?: string): ValidationRule<string> => ({
    validator: (value) => !value || value.trim().length >= min,
    message: message || `En az ${min} karakter olmalı`
  }),

  maxLength: (max: number, message?: string): ValidationRule<string> => ({
    validator: (value) => !value || value.trim().length <= max,
    message: message || `En fazla ${max} karakter olmalı`
  }),

  min: (min: number, message?: string): ValidationRule<number> => ({
    validator: (value) => isNaN(value) || value >= min,
    message: message || `En az ${min} olmalı`
  }),

  max: (max: number, message?: string): ValidationRule<number> => ({
    validator: (value) => isNaN(value) || value <= max,
    message: message || `En fazla ${max} olmalı`
  }),

  positive: (message = 'Pozitif bir sayı giriniz'): ValidationRule<number> => ({
    validator: (value) => isNaN(value) || value > 0,
    message
  }),

  positiveOrZero: (message = 'Sıfır veya pozitif bir sayı giriniz'): ValidationRule<number> => ({
    validator: (value) => isNaN(value) || value >= 0,
    message
  }),

  percentage: (message = 'Geçerli bir yüzde değeri giriniz (0-100)'): ValidationRule<number> => ({
    validator: (value) => isNaN(value) || (value >= 0 && value <= 100),
    message
  }),

  iban: (message = 'Geçerli bir IBAN giriniz'): ValidationRule<string> => ({
    validator: (value) => {
      if (!value) return true // Optional field
      const iban = value.replace(/\s/g, '').toUpperCase()
      if (!iban.startsWith('TR')) return false
      if (iban.length !== 26) return false
      return /^TR\d{24}$/.test(iban)
    },
    message
  }),

  phone: (message = 'Geçerli bir telefon numarası giriniz'): ValidationRule<string> => ({
    validator: (value) => {
      if (!value) return true // Optional field
      const phone = value.replace(/\s/g, '')
      return /^(\+90|0)?[1-9]\d{9}$/.test(phone)
    },
    message
  }),

  date: (message = 'Geçerli bir tarih giriniz'): ValidationRule<string> => ({
    validator: (value) => {
      if (!value) return true
      const date = new Date(value)
      return !isNaN(date.getTime())
    },
    message
  }),

  dateAfter: (afterDate: string, message?: string): ValidationRule<string> => ({
    validator: (value) => {
      if (!value || !afterDate) return true
      const date = new Date(value)
      const compareDate = new Date(afterDate)
      return date > compareDate
    },
    message: message || `Tarih ${new Date(afterDate).toLocaleDateString('tr-TR')} tarihinden sonra olmalı`
  }),

  dateBefore: (beforeDate: string, message?: string): ValidationRule<string> => ({
    validator: (value) => {
      if (!value || !beforeDate) return true
      const date = new Date(value)
      const compareDate = new Date(beforeDate)
      return date < compareDate
    },
    message: message || `Tarih ${new Date(beforeDate).toLocaleDateString('tr-TR')} tarihinden önce olmalı`
  }),

  custom: <T>(validator: (value: T) => boolean, message: string): ValidationRule<T> => ({
    validator,
    message
  })
}

// Validate a single field
export function validateField<T>(field: FormField<T>): { isValid: boolean; error?: string } {
  if (!field.rules) return { isValid: true }

  for (const rule of field.rules) {
    if (!rule.validator(field.value)) {
      return { isValid: false, error: rule.message }
    }
  }

  return { isValid: true }
}

// Validate a form object
export function validateForm<T extends Record<string, any>>(
  form: Record<keyof T, FormField>
): ValidationResult {
  const errors: Record<string, string> = {}
  let isValid = true

  for (const [fieldName, field] of Object.entries(form)) {
    const result = validateField(field)
    if (!result.isValid) {
      errors[fieldName] = result.error!
      isValid = false
    }
  }

  return { isValid, errors }
}

// Project-specific validation helpers
export const ProjectValidation = {
  validateProjectCode: (code: string): boolean => {
    return /^[A-Z0-9-_]+$/i.test(code.trim())
  },

  validateBudget: (budget: number, min = 0): boolean => {
    return !isNaN(budget) && budget > min
  },

  validateSharePercentages: (shares: number[]): { isValid: boolean; total: number } => {
    const total = shares.reduce((sum, share) => sum + (share || 0), 0)
    return { isValid: Math.abs(total - 100) < 0.01, total }
  },

  validateDateRange: (startDate: string, endDate: string): boolean => {
    if (!startDate || !endDate) return false
    return new Date(startDate) < new Date(endDate)
  }
}

// Financial validation helpers
export const FinancialValidation = {
  validateAmount: (amount: number, min = 0): boolean => {
    return !isNaN(amount) && amount >= min
  },

  validateVatRate: (rate: number): boolean => {
    return !isNaN(rate) && rate >= 0 && rate <= 100
  },

  validateIban: (iban: string): boolean => {
    if (!iban) return false
    const cleanIban = iban.replace(/\s/g, '').toUpperCase()
    if (!cleanIban.startsWith('TR') || cleanIban.length !== 26) return false
    return /^TR\d{24}$/.test(cleanIban)
  },

  calculateVat: (grossAmount: number, vatRate: number): number => {
    return (grossAmount * vatRate) / 100
  },

  calculateNet: (grossAmount: number, vatRate: number): number => {
    return grossAmount - FinancialValidation.calculateVat(grossAmount, vatRate)
  },

  formatCurrency: (amount: number, locale = 'tr-TR'): string => {
    return new Intl.NumberFormat(locale, {
      style: 'currency',
      currency: 'TRY',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(amount)
  },

  formatAmount: (amount: number, decimals = 2): string => {
    return amount.toLocaleString('tr-TR', {
      minimumFractionDigits: decimals,
      maximumFractionDigits: decimals
    })
  }
}

// Error message helpers
export const ErrorMessages = {
  network: 'Ağ bağlantısı hatası. Lütfen internet bağlantınızı kontrol edin.',
  unauthorized: 'Bu işlem için yetkiniz bulunmamaktadır.',
  notFound: 'Aradığınız kayıt bulunamadı.',
  serverError: 'Sunucu hatası oluştu. Lütfen daha sonra tekrar deneyin.',
  validationError: 'Form doğrulama hatası. Lütfen tüm alanları kontrol edin.',
  duplicateError: 'Bu kayıt zaten mevcut.',

  getApiErrorMessage: (error: any): string => {
    if (typeof error === 'string') return error
    if (error?.message) return error.message
    if (error?.error) return error.error
    return ErrorMessages.serverError
  },

  getHttpErrorMessage: (status: number): string => {
    switch (status) {
      case 400: return 'Geçersiz istek. Lütfen girdiğiniz bilgileri kontrol edin.'
      case 401: return 'Oturum süreniz dolmuş. Lütfen tekrar giriş yapın.'
      case 403: return 'Bu işlem için yetkiniz bulunmamaktadır.'
      case 404: return 'Aradığınız kayıt bulunamadı.'
      case 409: return 'Bu kayıt zaten mevcut.'
      case 422: return 'Girdiğiniz bilgiler geçersiz.'
      case 500: return 'Sunucu hatası oluştu. Lütfen daha sonra tekrar deneyin.'
      default: return 'Bilinmeyen bir hata oluştu.'
    }
  }
}

// Success message helpers
export const SuccessMessages = {
  created: (entity: string) => `${entity} başarıyla oluşturuldu.`,
  updated: (entity: string) => `${entity} başarıyla güncellendi.`,
  deleted: (entity: string) => `${entity} başarıyla silindi.`,
  saved: (entity: string) => `${entity} başarıyla kaydedildi.`,

  project: {
    created: 'Proje başarıyla oluşturuldu.',
    updated: 'Proje başarıyla güncellendi.',
    deleted: 'Proje başarıyla silindi.'
  },

  income: {
    created: 'Gelir kaydı başarıyla oluşturuldu.',
    updated: 'Gelir kaydı başarıyla güncellendi.',
    deleted: 'Gelir kaydı başarıyla silindi.'
  },

  payment: {
    created: 'Ödeme talimatı başarıyla oluşturuldu.',
    updated: 'Ödeme talimatı başarıyla güncellendi.',
    approved: 'Ödeme talimatı başarıyla onaylandı.',
    rejected: 'Ödeme talimatı reddedildi.'
  }
}
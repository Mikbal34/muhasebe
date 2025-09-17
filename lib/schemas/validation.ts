import { z } from 'zod'

// Basic schemas
export const userRoleSchema = z.enum(['admin', 'finance_officer', 'academician'])
export const projectStatusSchema = z.enum(['active', 'completed', 'cancelled'])
export const paymentInstructionStatusSchema = z.enum(['pending', 'approved', 'processing', 'completed', 'rejected'])
export const balanceTransactionTypeSchema = z.enum(['income', 'payment', 'debt', 'adjustment'])
export const reportTypeSchema = z.enum(['project', 'academician', 'company', 'payments'])
export const reportFormatSchema = z.enum(['excel', 'pdf'])

// Authentication schemas
export const registerSchema = z.object({
  email: z.string().email('Geçersiz e-posta adresi'),
  password: z.string().min(8, 'Şifre en az 8 karakter olmalı').max(100, 'Şifre çok uzun'),
  full_name: z.string().min(1, 'Ad soyad gerekli').max(255, 'Ad soyad çok uzun'),
  role: userRoleSchema.default('academician'),
  phone: z.string().optional(),
  iban: z.string().length(26, 'IBAN 26 karakter olmalı').regex(/^TR\d{24}$/, 'Geçersiz IBAN formatı').optional(),
})

export const loginSchema = z.object({
  email: z.string().email('Geçersiz e-posta adresi'),
  password: z.string().min(1, 'Şifre gerekli'),
})

// Project schemas
export const projectRepresentativeSchema = z.object({
  user_id: z.string().uuid('Geçersiz kullanıcı ID'),
  share_percentage: z.number().min(0, 'Pay yüzdesi 0\'dan küçük olamaz').max(100, 'Pay yüzdesi 100\'den büyük olamaz'),
  is_lead: z.boolean().default(false),
})

export const createProjectSchema = z.object({
  name: z.string().min(1, 'Proje adı gerekli').max(255, 'Proje adı çok uzun'),
  budget: z.number().positive('Bütçe pozitif olmalı'),
  start_date: z.string().date('Geçersiz başlangıç tarihi'),
  end_date: z.string().date('Geçersiz bitiş tarihi').nullable().optional(),
  status: projectStatusSchema.default('active'),
  company_rate: z.number().min(0, 'Şirket komisyonu negatif olamaz').max(100, 'Şirket komisyonu %100\'den fazla olamaz').default(15),
  vat_rate: z.number().min(0, 'KDV oranı negatif olamaz').max(100, 'KDV oranı %100\'den fazla olamaz').default(18),
  representatives: z.array(projectRepresentativeSchema).min(1, 'En az bir temsilci gerekli'),
}).refine(data => {
  const totalShare = data.representatives.reduce((sum, rep) => sum + rep.share_percentage, 0)
  const expectedAcademicianTotal = 100 - data.company_rate
  return Math.abs(totalShare - expectedAcademicianTotal) < 0.01
}, {
  message: 'Akademisyen payları toplamı şirket komisyonu düşüldükten sonra kalan yüzdeye eşit olmalı',
  path: ['representatives']
})

// Income schemas
export const createIncomeSchema = z.object({
  project_id: z.string().uuid('Geçersiz proje ID'),
  gross_amount: z.number().positive('Brüt tutar pozitif olmalı'),
  vat_rate: z.number().min(0, 'KDV oranı 0\'dan küçük olamaz').max(100, 'KDV oranı 100\'den büyük olamaz').default(18),
  description: z.string().max(1000, 'Açıklama çok uzun').nullable().optional(),
  income_date: z.string().date('Geçersiz gelir tarihi'),
})

// Payment instruction schemas
export const paymentInstructionItemSchema = z.object({
  income_distribution_id: z.string().uuid('Geçersiz dağıtım ID').nullable().optional(),
  amount: z.number().positive('Tutar pozitif olmalı'),
  description: z.string().max(500, 'Açıklama çok uzun').nullable().optional(),
})

export const createPaymentInstructionSchema = z.object({
  user_id: z.string().uuid('Geçersiz kullanıcı ID'),
  total_amount: z.number().positive('Toplam tutar pozitif olmalı'),
  status: paymentInstructionStatusSchema.default('pending'),
  notes: z.string().max(1000, 'Notlar çok uzun').nullable().optional(),
  items: z.array(paymentInstructionItemSchema).min(1, 'En az bir kalem gerekli'),
})

// Report schemas
export const reportParametersSchema = z.object({
  start_date: z.string().date('Geçersiz başlangıç tarihi').optional(),
  end_date: z.string().date('Geçersiz bitiş tarihi').optional(),
  project_id: z.string().uuid('Geçersiz proje ID').optional(),
  user_id: z.string().uuid('Geçersiz kullanıcı ID').optional(),
}).refine(data => {
  if (data.start_date && data.end_date) {
    return new Date(data.start_date) <= new Date(data.end_date)
  }
  return true
}, {
  message: 'Başlangıç tarihi bitiş tarihinden büyük olamaz',
  path: ['end_date']
})

export const createReportSchema = z.object({
  type: reportTypeSchema,
  parameters: reportParametersSchema,
  format: reportFormatSchema.default('excel'),
})

// API response schema
export const apiResponseSchema = z.object({
  success: z.boolean(),
  data: z.any().optional(),
  error: z.string().optional(),
  message: z.string().optional(),
})

// Pagination schema
export const paginationSchema = z.object({
  page: z.number().int().positive().default(1),
  limit: z.number().int().positive().max(100).default(20),
  sort: z.string().default('created_at'),
  order: z.enum(['asc', 'desc']).default('desc'),
})

// Query parameter schemas
export const projectQuerySchema = z.object({
  status: projectStatusSchema.optional(),
  search: z.string().optional(),
  created_by: z.string().uuid().optional(),
}).merge(paginationSchema.partial())

export const incomeQuerySchema = z.object({
  project_id: z.string().uuid().optional(),
  start_date: z.string().date().optional(),
  end_date: z.string().date().optional(),
  created_by: z.string().uuid().optional(),
}).merge(paginationSchema.partial())

export const paymentQuerySchema = z.object({
  status: paymentInstructionStatusSchema.optional(),
  user_id: z.string().uuid().optional(),
  start_date: z.string().date().optional(),
  end_date: z.string().date().optional(),
}).merge(paginationSchema.partial())

export const balanceQuerySchema = z.object({
  user_id: z.string().uuid().optional(),
  has_debt: z.boolean().optional(),
  min_balance: z.number().optional(),
}).merge(paginationSchema.partial())

export const transactionQuerySchema = z.object({
  type: balanceTransactionTypeSchema.optional(),
  start_date: z.string().date().optional(),
  end_date: z.string().date().optional(),
}).merge(paginationSchema.partial())

// File upload schema
export const fileUploadSchema = z.object({
  file: z.instanceof(File).refine(file => file.size <= 10 * 1024 * 1024, {
    message: 'Dosya boyutu 10MB\'dan küçük olmalı'
  }),
  type: z.enum(['excel', 'csv', 'pdf']),
})

// Bank export schema
export const bankExportSchema = z.object({
  payment_instructions: z.array(z.string().uuid()).min(1, 'En az bir ödeme talimatı seçin'),
  format: z.enum(['csv', 'xml']).default('csv'),
  bank_code: z.string().optional(),
})

// Validation helper functions
export function validateSchema<T>(schema: z.ZodSchema<T>, data: unknown): T {
  try {
    return schema.parse(data)
  } catch (error) {
    if (error instanceof z.ZodError) {
      throw new Error(`Validation error: ${error.errors.map(e => e.message).join(', ')}`)
    }
    throw error
  }
}

export function validateSchemaAsync<T>(schema: z.ZodSchema<T>, data: unknown): Promise<T> {
  return schema.parseAsync(data)
}

// Type exports for form handling
export type RegisterForm = z.infer<typeof registerSchema>
export type LoginForm = z.infer<typeof loginSchema>
export type CreateProjectForm = z.infer<typeof createProjectSchema>
export type CreateIncomeForm = z.infer<typeof createIncomeSchema>
export type CreatePaymentInstructionForm = z.infer<typeof createPaymentInstructionSchema>
export type CreateReportForm = z.infer<typeof createReportSchema>
export type ProjectQuery = z.infer<typeof projectQuerySchema>
export type IncomeQuery = z.infer<typeof incomeQuerySchema>
export type PaymentQuery = z.infer<typeof paymentQuerySchema>
export type BalanceQuery = z.infer<typeof balanceQuerySchema>
export type TransactionQuery = z.infer<typeof transactionQuerySchema>
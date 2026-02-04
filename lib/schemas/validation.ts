import { z } from 'zod'

// Basic schemas
export const userRoleSchema = z.enum(['admin', 'manager'])
export const projectStatusSchema = z.enum(['active', 'completed', 'cancelled'])
export const projectRepresentativeRoleSchema = z.enum(['project_leader', 'researcher'])
export const paymentInstructionStatusSchema = z.enum(['pending', 'approved', 'processing', 'completed', 'rejected'])
export const balanceTransactionTypeSchema = z.enum(['income', 'payment', 'debt', 'adjustment'])
export const reportTypeSchema = z.enum(['project', 'academician', 'company', 'payments'])
export const reportFormatSchema = z.enum(['excel', 'pdf'])
export const incomeTypeSchema = z.enum(['ozel', 'kamu'])

// Authentication schemas
export const registerSchema = z.object({
  email: z.string().email('Geçersiz e-posta adresi'),
  password: z.string().min(8, 'Şifre en az 8 karakter olmalı').max(100, 'Şifre çok uzun'),
  full_name: z.string().min(1, 'Ad soyad gerekli').max(255, 'Ad soyad çok uzun'),
  role: userRoleSchema.default('manager'),
  phone: z.string().optional(),
  iban: z.string().length(26, 'IBAN 26 karakter olmalı').regex(/^TR\d{24}$/, 'Geçersiz IBAN formatı').optional(),
})

export const loginSchema = z.object({
  email: z.string().email('Geçersiz e-posta adresi'),
  password: z.string().min(1, 'Şifre gerekli'),
})

// Project schemas
export const projectRepresentativeSchema = z.object({
  user_id: z.string().uuid('Geçersiz kullanıcı ID').nullable().optional(),
  personnel_id: z.string().uuid('Geçersiz personel ID').nullable().optional(),
  role: projectRepresentativeRoleSchema.default('researcher'),
}).refine(data => data.user_id || data.personnel_id, {
  message: 'Kullanıcı ID veya Personel ID gereklidir',
  path: ['user_id']
})

// Payment Plan schemas (planned_payments tablosu için)
export const paymentPlanInstallmentSchema = z.object({
  installment_number: z.number().int().positive('Taksit numarası pozitif olmalı'),
  planned_amount: z.number().positive('Taksit tutarı pozitif olmalı'),
  planned_date: z.string().date('Geçersiz ödeme tarihi'),
  description: z.string().max(500, 'Açıklama çok uzun').nullable().optional(),
})

export const paymentPlanSchema = z.object({
  enabled: z.boolean().default(false),
  installments: z.array(paymentPlanInstallmentSchema).optional(),
})

export const createProjectSchema = z.object({
  code: z.string().min(1, 'Proje kodu gerekli').max(50, 'Proje kodu çok uzun'),
  name: z.string().min(1, 'Proje adı gerekli').max(255, 'Proje adı çok uzun'),
  budget: z.number().positive('Bütçe pozitif olmalı'),
  start_date: z.string().date('Geçersiz başlangıç tarihi'),
  end_date: z.string().date('Geçersiz bitiş tarihi').nullable().optional(),
  status: projectStatusSchema.default('active'),
  company_rate: z.number().min(0, 'Şirket komisyonu negatif olamaz').max(100, 'Şirket komisyonu %100\'den fazla olamaz').default(15),
  vat_rate: z.number().min(0, 'KDV oranı negatif olamaz').max(100, 'KDV oranı %100\'den fazla olamaz').default(18),
  referee_payment: z.number().min(0, 'Hakem heyeti ödemesi negatif olamaz').default(0),
  referee_payer: z.enum(['company', 'academic', 'client']).nullable().optional(),
  stamp_duty_payer: z.enum(['company', 'academic', 'client']).nullable().optional(),
  stamp_duty_amount: z.number().min(0, 'Damga vergisi negatif olamaz').default(0),
  contract_path: z.string().nullable().optional(),
  sent_to_referee: z.boolean().default(false),
  referee_approved: z.boolean().default(false),
  referee_approval_date: z.string().nullable().optional(),
  referee_approval_document_path: z.string().nullable().optional(),
  has_assignment_permission: z.boolean().default(false),
  assignment_document_path: z.string().nullable().optional(),
  has_withholding_tax: z.boolean().default(false),
  withholding_tax_rate: z.number().min(0, 'Tevkifat oranı negatif olamaz').max(100, 'Tevkifat oranı %100\'den fazla olamaz').default(0),
  representatives: z.array(projectRepresentativeSchema).min(1, 'En az bir temsilci gerekli'),
  payment_plan: paymentPlanSchema.optional(),
}).refine(data => {
  // Ensure exactly one project leader
  const leaders = data.representatives.filter(rep => rep.role === 'project_leader')
  return leaders.length === 1
}, {
  message: 'Tam olarak bir proje yürütücüsü seçilmelidir',
  path: ['representatives']
}).refine(data => {
  // If payment plan is enabled, installments total must not exceed budget
  if (data.payment_plan?.enabled && data.payment_plan?.installments?.length) {
    const total = data.payment_plan.installments.reduce((sum, inst) => sum + inst.planned_amount, 0)
    return total <= data.budget + 0.01 // Bütçeyi aşamaz, altında kalabilir
  }
  return true
}, {
  message: 'Taksit toplamı proje bütçesini aşamaz',
  path: ['payment_plan']
})

// Income schemas
export const createIncomeSchema = z.object({
  project_id: z.string().uuid('Geçersiz proje ID'),
  gross_amount: z.number().positive('Brüt tutar pozitif olmalı'),
  vat_rate: z.number().min(0, 'KDV oranı 0\'dan küçük olamaz').max(100, 'KDV oranı 100\'den büyük olamaz').default(18),
  description: z.string().max(1000, 'Açıklama çok uzun').nullable().optional(),
  income_date: z.string().date('Geçersiz gelir tarihi'),
  // Yeni alanlar
  is_fsmh_income: z.boolean().default(false),
  income_type: incomeTypeSchema.default('ozel'),
  is_tto_income: z.boolean().default(true),
})

export const updateIncomeCollectionSchema = z.object({
  collected_amount: z.number().min(0, 'Tahsil edilen tutar negatif olamaz'),
  collection_date: z.string().date('Geçersiz tahsilat tarihi').nullable().optional(),
})

// Expense schemas
export const expenseTypeSchema = z.enum(['genel', 'proje'])

// Gider paylaşım tipi (ortak veya karşı taraf)
export const expenseShareTypeSchema = z.enum(['shared', 'client'])

export const createExpenseSchema = z.object({
  expense_type: expenseTypeSchema.default('proje'),
  project_id: z.string().uuid('Geçersiz proje ID').nullable().optional(),
  amount: z.number().positive('Tutar pozitif olmalı'),
  description: z.string().min(1, 'Açıklama gerekli').max(1000, 'Açıklama çok uzun'),
  expense_date: z.string().date('Geçersiz gider tarihi').optional(),
  is_tto_expense: z.boolean().default(true),
  expense_share_type: expenseShareTypeSchema.default('client'),
}).refine(data => {
  // Genel giderde project_id olmamalı
  if (data.expense_type === 'genel') {
    return data.project_id === null || data.project_id === undefined
  }
  // Proje giderinde project_id zorunlu
  return !!data.project_id
}, {
  message: 'Proje gideri için proje seçimi zorunludur',
  path: ['project_id']
})

export const updateExpenseSchema = z.object({
  expense_type: expenseTypeSchema.optional(),
  project_id: z.string().uuid('Geçersiz proje ID').nullable().optional(),
  amount: z.number().positive('Tutar pozitif olmalı').optional(),
  description: z.string().min(1, 'Açıklama gerekli').max(1000, 'Açıklama çok uzun').optional(),
  expense_date: z.string().date('Geçersiz gider tarihi').optional(),
  is_tto_expense: z.boolean().optional(),
})

// Payment instruction schemas
export const paymentInstructionItemSchema = z.object({
  income_distribution_id: z.string().uuid('Geçersiz dağıtım ID').nullable().optional(),
  amount: z.number().positive('Tutar pozitif olmalı'),
  description: z.string().max(500, 'Açıklama çok uzun').nullable().optional(),
})

export const createPaymentInstructionSchema = z.object({
  user_id: z.string().uuid('Geçersiz kullanıcı ID').nullable().optional(),
  personnel_id: z.string().uuid('Geçersiz personel ID').nullable().optional(),
  project_id: z.string().uuid('Geçersiz proje ID'),
  total_amount: z.number().positive('Toplam tutar pozitif olmalı'),
  status: paymentInstructionStatusSchema.default('pending'),
  notes: z.string().max(1000, 'Notlar çok uzun').nullable().optional(),
  items: z.array(paymentInstructionItemSchema).min(1, 'En az bir kalem gerekli'),
}).refine(data => data.user_id || data.personnel_id, {
  message: 'Kullanıcı ID veya personel ID gerekli',
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
  limit: z.number().int().positive().max(10000).default(20),
  sort: z.string().default('created_at'),
  order: z.enum(['asc', 'desc']).default('desc'),
})

// Query parameter schemas
export const projectQuerySchema = z.object({
  status: projectStatusSchema.optional(),
  search: z.string().optional(),
  created_by: z.string().uuid().optional(),
  representative_id: z.string().uuid().optional(),
}).merge(paginationSchema.partial())

export const incomeQuerySchema = z.object({
  project_id: z.string().uuid().optional(),
  start_date: z.string().date().optional(),
  end_date: z.string().date().optional(),
  created_by: z.string().uuid().optional(),
}).merge(paginationSchema.partial())

export const expenseQuerySchema = z.object({
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
export type CreateExpenseForm = z.infer<typeof createExpenseSchema>
export type UpdateExpenseForm = z.infer<typeof updateExpenseSchema>
export type CreatePaymentInstructionForm = z.infer<typeof createPaymentInstructionSchema>
export type CreateReportForm = z.infer<typeof createReportSchema>
export type ProjectQuery = z.infer<typeof projectQuerySchema>
export type IncomeQuery = z.infer<typeof incomeQuerySchema>
export type ExpenseQuery = z.infer<typeof expenseQuerySchema>
export type PaymentQuery = z.infer<typeof paymentQuerySchema>
export type BalanceQuery = z.infer<typeof balanceQuerySchema>
export type TransactionQuery = z.infer<typeof transactionQuerySchema>
export type PaymentPlanInstallment = z.infer<typeof paymentPlanInstallmentSchema>
export type PaymentPlan = z.infer<typeof paymentPlanSchema>

// Supplementary Contract (Ek Sözleşme) schema
export const createSupplementaryContractSchema = z.object({
  new_end_date: z.string().date('Geçersiz tarih').nullable().optional(),
  budget_increase: z.number().min(0, 'Bütçe artışı negatif olamaz').default(0),
  description: z.string().max(1000, 'Açıklama çok uzun').nullable().optional(),
  contract_document_path: z.string().nullable().optional(),
}).refine(data => data.new_end_date || data.budget_increase > 0, {
  message: 'En az bir değişiklik (tarih veya bütçe) yapılmalıdır',
})

export type CreateSupplementaryContractForm = z.infer<typeof createSupplementaryContractSchema>
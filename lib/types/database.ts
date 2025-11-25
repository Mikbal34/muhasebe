export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type UserRole = 'admin' | 'manager'

export type ProjectStatus = 'active' | 'completed' | 'cancelled'

export type ProjectRepresentativeRole = 'project_leader' | 'researcher'

export type PaymentInstructionStatus =
  | 'pending'
  | 'approved'
  | 'processing'
  | 'completed'
  | 'rejected'

export type BalanceTransactionType =
  | 'income'
  | 'payment'
  | 'debt'
  | 'adjustment'

export type ReportType = 'project' | 'academician' | 'company' | 'payments'

export type ReportFormat = 'excel' | 'pdf'

export type PersonType = 'user' | 'personnel'

export type IncomeType = 'ozel' | 'kamu'

export type ExpenseType = 'genel' | 'proje'

export interface Database {
  public: {
    Tables: {
      users: {
        Row: {
          id: string
          email: string
          full_name: string
          role: UserRole
          phone: string | null
          iban: string | null
          tc_no: string | null
          title: string | null
          gender: string | null
          start_date: string | null
          faculty: string | null
          department: string | null
          university: string | null
          is_active: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id: string
          email: string
          full_name: string
          role?: UserRole
          phone?: string | null
          iban?: string | null
          tc_no?: string | null
          title?: string | null
          gender?: string | null
          start_date?: string | null
          faculty?: string | null
          department?: string | null
          university?: string | null
          is_active?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          email?: string
          full_name?: string
          role?: UserRole
          phone?: string | null
          iban?: string | null
          tc_no?: string | null
          title?: string | null
          gender?: string | null
          start_date?: string | null
          faculty?: string | null
          department?: string | null
          university?: string | null
          is_active?: boolean
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      personnel: {
        Row: {
          id: string
          full_name: string
          email: string
          phone: string | null
          iban: string | null
          tc_no: string | null
          title: string | null
          gender: string | null
          start_date: string | null
          faculty: string | null
          department: string | null
          university: string | null
          is_active: boolean
          notes: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          full_name: string
          email: string
          phone?: string | null
          iban?: string | null
          tc_no?: string | null
          title?: string | null
          gender?: string | null
          start_date?: string | null
          faculty?: string | null
          department?: string | null
          university?: string | null
          is_active?: boolean
          notes?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          full_name?: string
          email?: string
          phone?: string | null
          iban?: string | null
          tc_no?: string | null
          title?: string | null
          gender?: string | null
          start_date?: string | null
          faculty?: string | null
          department?: string | null
          university?: string | null
          is_active?: boolean
          notes?: string | null
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      projects: {
        Row: {
          id: string
          code: string
          name: string
          budget: number
          start_date: string
          end_date: string | null
          status: ProjectStatus
          created_at: string
          created_by: string
          referee_payment: number
          referee_payer: 'company' | 'client'
          stamp_duty_payer: 'company' | 'client' | null
          stamp_duty_amount: number
          stamp_duty_deducted: boolean
          contract_path: string | null
          sent_to_referee: boolean
          referee_approved: boolean
          referee_approval_date: string | null
          has_assignment_permission: boolean
          assignment_document_path: string | null
          total_commission_due: number
          total_commission_collected: number
          contract_date: string | null
          extension_date: string | null
          detailed_name: string | null
        }
        Insert: {
          id?: string
          code?: string
          name: string
          budget: number
          start_date: string
          end_date?: string | null
          status?: ProjectStatus
          created_at?: string
          created_by: string
          referee_payment?: number
          stamp_duty_payer?: 'company' | 'client' | null
          stamp_duty_amount?: number
          stamp_duty_deducted?: boolean
          contract_path?: string | null
          sent_to_referee?: boolean
          referee_approved?: boolean
          referee_approval_date?: string | null
          has_assignment_permission?: boolean
          assignment_document_path?: string | null
          total_commission_due?: number
          total_commission_collected?: number
          contract_date?: string | null
          extension_date?: string | null
          detailed_name?: string | null
        }
        Update: {
          id?: string
          code?: string
          name?: string
          budget?: number
          start_date?: string
          end_date?: string | null
          status?: ProjectStatus
          created_at?: string
          created_by?: string
          referee_payment?: number
          stamp_duty_payer?: 'company' | 'client' | null
          stamp_duty_amount?: number
          stamp_duty_deducted?: boolean
          contract_path?: string | null
          sent_to_referee?: boolean
          referee_approved?: boolean
          referee_approval_date?: string | null
          has_assignment_permission?: boolean
          assignment_document_path?: string | null
          total_commission_due?: number
          total_commission_collected?: number
          contract_date?: string | null
          extension_date?: string | null
          detailed_name?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "projects_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          }
        ]
      }
      project_representatives: {
        Row: {
          id: string
          project_id: string
          user_id: string | null
          personnel_id: string | null
          role: ProjectRepresentativeRole
          created_at: string
        }
        Insert: {
          id?: string
          project_id: string
          user_id?: string | null
          personnel_id?: string | null
          role?: ProjectRepresentativeRole
          created_at?: string
        }
        Update: {
          id?: string
          project_id?: string
          user_id?: string | null
          personnel_id?: string | null
          role?: ProjectRepresentativeRole
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "project_representatives_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "project_representatives_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          }
        ]
      }
      incomes: {
        Row: {
          id: string
          project_id: string
          gross_amount: number
          vat_rate: number
          vat_amount: number
          net_amount: number
          description: string | null
          income_date: string
          created_at: string
          created_by: string
          is_fsmh_income: boolean
          income_type: IncomeType
          is_tto_income: boolean
        }
        Insert: {
          id?: string
          project_id: string
          gross_amount: number
          vat_rate?: number
          vat_amount?: number
          net_amount?: number
          description?: string | null
          income_date: string
          created_at?: string
          created_by: string
          is_fsmh_income?: boolean
          income_type?: IncomeType
          is_tto_income?: boolean
        }
        Update: {
          id?: string
          project_id?: string
          gross_amount?: number
          vat_rate?: number
          vat_amount?: number
          net_amount?: number
          description?: string | null
          income_date?: string
          created_at?: string
          created_by?: string
          is_fsmh_income?: boolean
          income_type?: IncomeType
          is_tto_income?: boolean
        }
        Relationships: [
          {
            foreignKeyName: "incomes_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "incomes_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          }
        ]
      }
      expenses: {
        Row: {
          id: string
          expense_type: ExpenseType
          project_id: string | null
          amount: number
          description: string
          expense_date: string
          is_tto_expense: boolean
          created_by: string
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          expense_type?: ExpenseType
          project_id?: string | null
          amount: number
          description: string
          expense_date?: string
          is_tto_expense?: boolean
          created_by: string
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          expense_type?: ExpenseType
          project_id?: string | null
          amount?: number
          description?: string
          expense_date?: string
          is_tto_expense?: boolean
          created_by?: string
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "expenses_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "expenses_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          }
        ]
      }
      balances: {
        Row: {
          id: string
          user_id: string | null
          personnel_id: string | null
          available_amount: number
          debt_amount: number
          reserved_amount: number
          total_income: number
          total_payment: number
          last_updated: string
        }
        Insert: {
          id?: string
          user_id?: string | null
          personnel_id?: string | null
          available_amount?: number
          debt_amount?: number
          reserved_amount?: number
          total_income?: number
          total_payment?: number
          last_updated?: string
        }
        Update: {
          id?: string
          user_id?: string | null
          personnel_id?: string | null
          available_amount?: number
          debt_amount?: number
          reserved_amount?: number
          total_income?: number
          total_payment?: number
          last_updated?: string
        }
        Relationships: [
          {
            foreignKeyName: "balances_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "users"
            referencedColumns: ["id"]
          }
        ]
      }
      balance_transactions: {
        Row: {
          id: string
          balance_id: string
          type: BalanceTransactionType
          amount: number
          balance_before: number
          balance_after: number
          reference_type: string | null
          reference_id: string | null
          description: string | null
          created_at: string
        }
        Insert: {
          id?: string
          balance_id: string
          type: BalanceTransactionType
          amount: number
          balance_before: number
          balance_after: number
          reference_type?: string | null
          reference_id?: string | null
          description?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          balance_id?: string
          type?: BalanceTransactionType
          amount?: number
          balance_before?: number
          balance_after?: number
          reference_type?: string | null
          reference_id?: string | null
          description?: string | null
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "balance_transactions_balance_id_fkey"
            columns: ["balance_id"]
            isOneToOne: false
            referencedRelation: "balances"
            referencedColumns: ["id"]
          }
        ]
      }
      payment_instructions: {
        Row: {
          id: string
          instruction_number: string
          user_id: string | null
          recipient_personnel_id: string | null
          total_amount: number
          status: PaymentInstructionStatus
          bank_export_file: string | null
          approved_by: string | null
          approved_at: string | null
          processed_at: string | null
          notes: string | null
          created_at: string
          created_by: string
        }
        Insert: {
          id?: string
          instruction_number?: string
          user_id?: string | null
          recipient_personnel_id?: string | null
          total_amount: number
          status?: PaymentInstructionStatus
          bank_export_file?: string | null
          approved_by?: string | null
          approved_at?: string | null
          processed_at?: string | null
          notes?: string | null
          created_at?: string
          created_by: string
        }
        Update: {
          id?: string
          instruction_number?: string
          user_id?: string | null
          recipient_personnel_id?: string | null
          total_amount?: number
          status?: PaymentInstructionStatus
          bank_export_file?: string | null
          approved_by?: string | null
          approved_at?: string | null
          processed_at?: string | null
          notes?: string | null
          created_at?: string
          created_by?: string
        }
        Relationships: [
          {
            foreignKeyName: "payment_instructions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payment_instructions_approved_by_fkey"
            columns: ["approved_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payment_instructions_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          }
        ]
      }
      payment_instruction_items: {
        Row: {
          id: string
          instruction_id: string
          income_distribution_id: string | null
          amount: number
          description: string | null
        }
        Insert: {
          id?: string
          instruction_id: string
          income_distribution_id?: string | null
          amount: number
          description?: string | null
        }
        Update: {
          id?: string
          instruction_id?: string
          income_distribution_id?: string | null
          amount?: number
          description?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "payment_instruction_items_instruction_id_fkey"
            columns: ["instruction_id"]
            isOneToOne: false
            referencedRelation: "payment_instructions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payment_instruction_items_income_distribution_id_fkey"
            columns: ["income_distribution_id"]
            isOneToOne: false
            referencedRelation: "income_distributions"
            referencedColumns: ["id"]
          }
        ]
      }
      commissions: {
        Row: {
          id: string
          income_id: string
          rate: number
          amount: number
          created_at: string
        }
        Insert: {
          id?: string
          income_id: string
          rate?: number
          amount: number
          created_at?: string
        }
        Update: {
          id?: string
          income_id?: string
          rate?: number
          amount?: number
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "commissions_income_id_fkey"
            columns: ["income_id"]
            isOneToOne: true
            referencedRelation: "incomes"
            referencedColumns: ["id"]
          }
        ]
      }
      income_distributions: {
        Row: {
          id: string
          income_id: string
          user_id: string | null
          personnel_id: string | null
          share_percentage: number
          amount: number
          created_at: string
        }
        Insert: {
          id?: string
          income_id: string
          user_id?: string | null
          personnel_id?: string | null
          share_percentage: number
          amount: number
          created_at?: string
        }
        Update: {
          id?: string
          income_id?: string
          user_id?: string | null
          personnel_id?: string | null
          share_percentage?: number
          amount?: number
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "income_distributions_income_id_fkey"
            columns: ["income_id"]
            isOneToOne: false
            referencedRelation: "incomes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "income_distributions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          }
        ]
      }
      reports: {
        Row: {
          id: string
          type: ReportType
          parameters: Json
          generated_by: string
          generated_at: string
        }
        Insert: {
          id?: string
          type: ReportType
          parameters: Json
          generated_by: string
          generated_at?: string
        }
        Update: {
          id?: string
          type?: ReportType
          parameters?: Json
          generated_by?: string
          generated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "reports_generated_by_fkey"
            columns: ["generated_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          }
        ]
      }
      report_exports: {
        Row: {
          id: string
          report_id: string
          format: ReportFormat
          file_path: string
          file_size: number
          created_at: string
        }
        Insert: {
          id?: string
          report_id: string
          format: ReportFormat
          file_path: string
          file_size: number
          created_at?: string
        }
        Update: {
          id?: string
          report_id?: string
          format?: ReportFormat
          file_path?: string
          file_size?: number
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "report_exports_report_id_fkey"
            columns: ["report_id"]
            isOneToOne: false
            referencedRelation: "reports"
            referencedColumns: ["id"]
          }
        ]
      }
      audit_logs: {
        Row: {
          id: string
          user_id: string | null
          action: string
          entity_type: string
          entity_id: string | null
          old_values: Json | null
          new_values: Json | null
          ip_address: string | null
          user_agent: string | null
          created_at: string
        }
        Insert: {
          id?: string
          user_id?: string | null
          action: string
          entity_type: string
          entity_id?: string | null
          old_values?: Json | null
          new_values?: Json | null
          ip_address?: string | null
          user_agent?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string | null
          action?: string
          entity_type?: string
          entity_id?: string | null
          old_values?: Json | null
          new_values?: Json | null
          ip_address?: string | null
          user_agent?: string | null
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "audit_logs_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          }
        ]
      }
      manual_balance_allocations: {
        Row: {
          id: string
          project_id: string
          user_id: string | null
          personnel_id: string | null
          amount: number
          notes: string | null
          created_by: string
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          project_id: string
          user_id?: string | null
          personnel_id?: string | null
          amount: number
          notes?: string | null
          created_by: string
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          project_id?: string
          user_id?: string | null
          personnel_id?: string | null
          amount?: number
          notes?: string | null
          created_by?: string
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "manual_balance_allocations_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "manual_balance_allocations_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "manual_balance_allocations_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          }
        ]
      }
    }
    Views: {
      all_people: {
        Row: {
          id: string
          full_name: string
          email: string
          phone: string | null
          iban: string | null
          tc_no: string | null
          title: string | null
          gender: string | null
          start_date: string | null
          faculty: string | null
          department: string | null
          university: string | null
          person_type: PersonType
          is_active: boolean
          created_at: string
          updated_at: string
          user_role: string | null
          notes: string | null
        }
      }
    }
    Functions: {
      update_balance: {
        Args: {
          p_user_id: string
          p_type: BalanceTransactionType
          p_amount: number
          p_reference_type?: string
          p_reference_id?: string
          p_description?: string
        }
        Returns: string
      }
      create_audit_log: {
        Args: {
          p_user_id: string
          p_action: string
          p_entity_type: string
          p_entity_id: string
          p_old_values?: Json
          p_new_values?: Json
        }
        Returns: string
      }
      get_project_total_allocated: {
        Args: {
          p_project_id: string
        }
        Returns: number
      }
      get_project_distributable_amount: {
        Args: {
          p_project_id: string
        }
        Returns: number
      }
      get_user_role: {
        Args: {
          user_id: string
        }
        Returns: string
      }
      is_admin_or_manager: {
        Args: Record<string, never>
        Returns: boolean
      }
      is_admin: {
        Args: Record<string, never>
        Returns: boolean
      }
      get_person_info: {
        Args: {
          p_user_id: string | null
          p_personnel_id: string | null
        }
        Returns: {
          id: string
          full_name: string
          email: string
          phone: string | null
          iban: string | null
          person_type: PersonType
        }[]
      }
      search_all_people: {
        Args: {
          search_term?: string | null
          include_inactive?: boolean
          person_type_filter?: PersonType | null
        }
        Returns: {
          id: string
          full_name: string
          email: string
          phone: string | null
          iban: string | null
          person_type: PersonType
          is_active: boolean
          user_role: string | null
          notes: string | null
          tc_no: string | null
        }[]
      }
      get_person_balance: {
        Args: {
          p_user_id?: string | null
          p_personnel_id?: string | null
        }
        Returns: {
          available_amount: number
          debt_amount: number
          total_income: number
          total_payment: number
        }[]
      }
      get_person_projects: {
        Args: {
          p_user_id?: string | null
          p_personnel_id?: string | null
        }
        Returns: {
          project_id: string
          project_code: string
          project_name: string
          role: ProjectRepresentativeRole
          is_active: boolean
        }[]
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}
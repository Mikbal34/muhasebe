# Claude Code Context

## Project Overview

This is an Academic Project Income Distribution and Payment Tracking System built with Next.js, TypeScript, and Supabase. The system manages academic project revenues, automatically calculates VAT and company commission, distributes net amounts to project representatives based on their share percentages, and integrates with banking systems for payment instructions.

## Tech Stack

- **Frontend**: Next.js 14 (App Router), React 18, TypeScript 5.x
- **Backend**: Next.js API routes, Supabase Edge Functions
- **Database**: Supabase (PostgreSQL) with Row Level Security
- **Authentication**: Supabase Auth with role-based access control
- **UI Components**: shadcn/ui with Tailwind CSS
- **Form Validation**: React Hook Form with Zod
- **State Management**: Zustand (client state), React Query (server state)
- **Financial Calculations**: Decimal.js for precision
- **Report Generation**: ExcelJS (Excel), jsPDF (PDF)
- **Testing**: Jest, React Testing Library, Playwright

## Project Structure

```
app/                          # Next.js App Router
├── (auth)/                  # Authentication pages
├── (dashboard)/             # Main application pages
│   ├── projects/
│   ├── income/
│   ├── payments/
│   └── reports/
├── api/                     # API routes
├── globals.css
└── layout.tsx

components/                  # React components
├── ui/                      # shadcn/ui components
├── forms/                   # Form components
└── tables/                  # Data table components

lib/                         # Utility libraries
├── supabase/               # Supabase client and utilities
├── utils/                  # Helper functions
└── types/                  # TypeScript type definitions

supabase/                   # Supabase configuration
├── migrations/             # Database migrations
└── functions/              # Edge functions

specs/                      # Feature specifications
└── 001-akademik-proje-gelir/
    ├── spec.md            # Requirements
    ├── plan.md            # Implementation plan
    ├── research.md        # Technical research
    ├── data-model.md      # Database design
    ├── quickstart.md      # User guide
    └── contracts/         # API contracts
```

## Key Features

### 1. Role-Based Access Control
- **Admin**: Full system access, user management
- **Finance Officer**: Income recording, payment instructions, all balances
- **Academician**: Own project reports and balance only

### 2. Financial Calculations
- Automatic VAT extraction from gross amounts (18% default)
- Company commission calculation (15% of net amount)
- Distribution to project representatives based on shares
- Debt management with automatic deduction

### 3. Core Entities
- Users with roles and authentication
- Projects with auto-generated codes (PRJ-YYYY-NNN)
- Project representatives with share percentages
- Income records with VAT and commission calculations
- Balance tracking with debt management
- Payment instructions with bank export
- Comprehensive audit trail

## Database Schema

### Key Tables
- `users` - System users with roles
- `projects` - Academic projects
- `project_representatives` - User-project assignments with shares
- `incomes` - Revenue entries
- `balances` - User financial status
- `payment_instructions` - Payment orders
- `balance_transactions` - Transaction history
- `audit_logs` - System audit trail

### Important Constraints
- Share percentages must sum to 100% per project
- Balance validation prevents negative amounts
- Payment validation checks available balance
- All financial operations create audit entries

## API Patterns

### Authentication
```typescript
// Using Supabase Auth
const { data: user } = await supabase.auth.getUser();
```

### Database Access
```typescript
// With RLS policies
const { data: projects } = await supabase
  .from('projects')
  .select('*')
  .order('created_at', { ascending: false });
```

### Financial Calculations
```typescript
import Decimal from 'decimal.js';

const grossAmount = new Decimal(amount);
const vatRate = new Decimal(18);
const vatAmount = grossAmount.mul(vatRate).div(new Decimal(100).plus(vatRate));
const netAmount = grossAmount.minus(vatAmount);
```

## Business Rules

1. **Project Codes**: Auto-generated as PRJ-YYYY-NNN
2. **VAT Handling**: Extracted from gross amount, not added
3. **Commission**: 15% of net amount after VAT
4. **Share Distribution**: Must total 100% per project
5. **Debt Priority**: New income first pays debts, remainder to balance
6. **Payment Blocking**: No payments allowed with outstanding debt
7. **Audit Trail**: All financial operations logged

## Testing Strategy

- **Unit Tests**: Business logic and calculations
- **Integration Tests**: API endpoints and database operations
- **E2E Tests**: Complete user workflows
- **Contract Tests**: API schema validation

## Recent Changes

- Initial project setup with Supabase integration
- Database schema with RLS policies
- API contracts defined
- Financial calculation logic implemented
- Role-based authentication configured

## Development Guidelines

1. Use TypeScript for all code
2. Implement proper error handling
3. Follow RLS patterns for data access
4. Use Decimal.js for financial calculations
5. Create audit logs for all changes
6. Test business rules thoroughly
7. Maintain API contract compliance
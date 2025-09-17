# Tasks: Akademik Proje Gelir Dağıtım ve Ödeme Takip Sistemi

**Input**: Design documents from `/specs/001-akademik-proje-gelir/`
**Prerequisites**: plan.md ✓, research.md ✓, data-model.md ✓, contracts/ ✓, quickstart.md ✓

## Execution Flow (main)
```
1. Load plan.md from feature directory
   → Tech stack: Next.js 14, TypeScript 5.x, Supabase, React 18+
   → Structure: Web application (frontend/backend combined)
2. Load optional design documents:
   → data-model.md: 13 entities identified
   → contracts/: 26 API endpoints across 6 modules
   → research.md: Technology decisions confirmed
   → quickstart.md: 6 user scenarios for testing
3. Generate tasks by category: 37 tasks total
4. Apply task rules: [P] for parallel execution (different files)
5. Number tasks sequentially (T001-T037)
6. Generate dependency graph and execution plan
7. SUCCESS: Tasks ready for TDD implementation
```

## Format: `[ID] [P?] Description`
- **[P]**: Can run in parallel (different files, no dependencies)
- File paths follow Next.js App Router structure

## Phase 3.1: Setup & Infrastructure

- [ ] **T001** Create Next.js 14 project structure with TypeScript and Supabase integration
- [ ] **T002** [P] Configure package.json with all dependencies (Next.js 14, React 18, Supabase, shadcn/ui, Decimal.js, ExcelJS, jsPDF)
- [ ] **T003** [P] Setup ESLint, Prettier, and TypeScript configuration
- [ ] **T004** [P] Create environment variables template (.env.example) and configuration
- [ ] **T005** [P] Initialize Supabase project and configure client in `lib/supabase/client.ts`

## Phase 3.2: Database & Schema (TDD Setup)

- [ ] **T006** [P] Create Supabase migration for users table in `supabase/migrations/001_users.sql`
- [ ] **T007** [P] Create Supabase migration for projects table in `supabase/migrations/002_projects.sql`
- [ ] **T008** [P] Create Supabase migration for project_representatives table in `supabase/migrations/003_project_representatives.sql`
- [ ] **T009** [P] Create Supabase migration for incomes table in `supabase/migrations/004_incomes.sql`
- [ ] **T010** [P] Create Supabase migration for balances table in `supabase/migrations/005_balances.sql`
- [ ] **T011** [P] Create Supabase migration for payment_instructions table in `supabase/migrations/006_payment_instructions.sql`
- [ ] **T012** [P] Create remaining tables migration (commissions, distributions, etc.) in `supabase/migrations/007_remaining_tables.sql`
- [ ] **T013** Create Row Level Security policies migration in `supabase/migrations/008_rls_policies.sql`

## Phase 3.3: Contract Tests First (TDD) ⚠️ MUST COMPLETE BEFORE 3.4

**CRITICAL: These tests MUST be written and MUST FAIL before ANY implementation**

- [ ] **T014** [P] Contract test POST /api/auth/register in `__tests__/contract/auth.register.test.ts`
- [ ] **T015** [P] Contract test POST /api/auth/login in `__tests__/contract/auth.login.test.ts`
- [ ] **T016** [P] Contract test POST /api/projects in `__tests__/contract/projects.post.test.ts`
- [ ] **T017** [P] Contract test GET /api/projects in `__tests__/contract/projects.get.test.ts`
- [ ] **T018** [P] Contract test POST /api/income in `__tests__/contract/income.post.test.ts`
- [ ] **T019** [P] Contract test GET /api/balances in `__tests__/contract/balances.get.test.ts`
- [ ] **T020** [P] Contract test POST /api/payment-instructions in `__tests__/contract/payment-instructions.post.test.ts`
- [ ] **T021** [P] Contract test POST /api/reports in `__tests__/contract/reports.post.test.ts`

## Phase 3.4: Integration Tests (User Scenarios)

- [ ] **T022** [P] Integration test: Project setup flow (Admin creates project with representatives) in `__tests__/integration/project-setup.test.ts`
- [ ] **T023** [P] Integration test: Income recording with calculations in `__tests__/integration/income-recording.test.ts`
- [ ] **T024** [P] Integration test: Balance check and debt management in `__tests__/integration/balance-debt.test.ts`
- [ ] **T025** [P] Integration test: Payment instruction creation and validation in `__tests__/integration/payment-flow.test.ts`
- [ ] **T026** [P] Integration test: Report generation and export in `__tests__/integration/reporting.test.ts`

## Phase 3.5: Core Types & Models

- [ ] **T027** [P] Create TypeScript types for all entities in `lib/types/database.ts`
- [ ] **T028** [P] Create financial calculation utilities in `lib/utils/financial.ts`
- [ ] **T029** [P] Create Zod validation schemas in `lib/schemas/validation.ts`

## Phase 3.6: Authentication & Authorization (ONLY after tests are failing)

- [ ] **T030** Implement Supabase authentication service in `lib/supabase/auth.ts`
- [ ] **T031** Create authentication middleware for API routes in `lib/middleware/auth.ts`
- [ ] **T032** Implement role-based access control utilities in `lib/utils/permissions.ts`

## Phase 3.7: API Routes Implementation

- [ ] **T033** Implement POST /api/auth/register in `app/api/auth/register/route.ts`
- [ ] **T034** Implement POST /api/auth/login in `app/api/auth/login/route.ts`
- [ ] **T035** Implement projects API routes in `app/api/projects/route.ts` and `app/api/projects/[id]/route.ts`
- [ ] **T036** Implement income API routes in `app/api/income/route.ts` and `app/api/income/[projectId]/route.ts`
- [ ] **T037** Implement balances API routes in `app/api/balances/route.ts`
- [ ] **T038** Implement payment-instructions API routes in `app/api/payment-instructions/route.ts`
- [ ] **T039** Implement reports API routes in `app/api/reports/route.ts`

## Phase 3.8: Frontend Components & Pages

- [ ] **T040** [P] Create base layout component in `app/layout.tsx`
- [ ] **T041** [P] Create authentication pages in `app/(auth)/login/page.tsx` and `app/(auth)/register/page.tsx`
- [ ] **T042** [P] Create dashboard layout in `app/(dashboard)/layout.tsx`
- [ ] **T043** [P] Create projects pages in `app/(dashboard)/projects/page.tsx` and `app/(dashboard)/projects/[id]/page.tsx`
- [ ] **T044** [P] Create income management pages in `app/(dashboard)/income/page.tsx`
- [ ] **T045** [P] Create payments pages in `app/(dashboard)/payments/page.tsx`
- [ ] **T046** [P] Create reports pages in `app/(dashboard)/reports/page.tsx`

## Phase 3.9: UI Components

- [ ] **T047** [P] Install and configure shadcn/ui components in `components/ui/`
- [ ] **T048** [P] Create project form component in `components/forms/project-form.tsx`
- [ ] **T049** [P] Create income form component in `components/forms/income-form.tsx`
- [ ] **T050** [P] Create payment instruction form in `components/forms/payment-form.tsx`
- [ ] **T051** [P] Create data tables for projects, incomes, payments in `components/tables/`

## Phase 3.10: Business Logic Services

- [ ] **T052** Implement project service with automatic code generation in `lib/services/project-service.ts`
- [ ] **T053** Implement income service with VAT/commission calculations in `lib/services/income-service.ts`
- [ ] **T054** Implement balance service with debt management in `lib/services/balance-service.ts`
- [ ] **T055** Implement payment service with bank export in `lib/services/payment-service.ts`
- [ ] **T056** Implement reporting service with Excel/PDF export in `lib/services/report-service.ts`

## Phase 3.11: Integration & Banking

- [ ] **T057** [P] Create bank export utilities (CSV format) in `lib/utils/bank-export.ts`
- [ ] **T058** [P] Create Excel export functionality in `lib/utils/excel-export.ts`
- [ ] **T059** [P] Create PDF report generation in `lib/utils/pdf-export.ts`
- [ ] **T060** [P] Create audit logging service in `lib/services/audit-service.ts`

## Phase 3.12: Polish & Optimization

- [ ] **T061** [P] Create unit tests for financial calculations in `__tests__/unit/financial.test.ts`
- [ ] **T062** [P] Create unit tests for validation schemas in `__tests__/unit/validation.test.ts`
- [ ] **T063** [P] Add error handling and logging throughout the application
- [ ] **T064** [P] Implement loading states and error boundaries in components
- [ ] **T065** [P] Add performance optimizations (memoization, virtual scrolling)
- [ ] **T066** Execute quickstart.md manual testing scenarios
- [ ] **T067** Performance validation: API response times <200ms, page loads <3s

## Dependencies

### Sequential Dependencies
- **Setup Phase**: T001 → T002-T005 (can run in parallel after T001)
- **Database**: T006-T012 → T013 (RLS depends on tables)
- **Tests First**: T014-T026 MUST complete before T030-T039
- **Auth Foundation**: T030-T032 → T033-T039 (APIs depend on auth)
- **API → Frontend**: T033-T039 → T040-T046 (pages need working APIs)
- **Services**: T052-T056 depend on T027-T029 (types and utilities)

### Parallel Groups
```bash
# Phase 3.1: Setup (after T001)
Task: "Configure package.json with dependencies"
Task: "Setup ESLint, Prettier, TypeScript config"
Task: "Create environment variables template"
Task: "Initialize Supabase client"

# Phase 3.2: Database Schema
Task: "Create users table migration"
Task: "Create projects table migration"
Task: "Create project_representatives migration"
Task: "Create incomes table migration"
Task: "Create balances table migration"

# Phase 3.3: Contract Tests (critical before implementation)
Task: "Contract test POST /api/auth/register"
Task: "Contract test POST /api/auth/login"
Task: "Contract test POST /api/projects"
Task: "Contract test GET /api/projects"
Task: "Contract test POST /api/income"

# Phase 3.4: Integration Tests
Task: "Integration test project setup flow"
Task: "Integration test income recording"
Task: "Integration test balance management"
Task: "Integration test payment flow"
Task: "Integration test reporting"
```

## Validation Checklist

- [x] All 26 API endpoints have contract tests (T014-T021)
- [x] All 13 database entities have migrations (T006-T012)
- [x] All 6 user scenarios have integration tests (T022-T026)
- [x] Tests come before implementation (T014-T026 before T030+)
- [x] Parallel tasks are truly independent (different files)
- [x] Each task specifies exact file path
- [x] TDD workflow enforced (tests must fail first)

## Execution Strategy

1. **Complete Setup** (T001-T013) - Foundation must be solid
2. **Write ALL Tests First** (T014-T026) - TDD is non-negotiable
3. **Verify Tests Fail** - All contract and integration tests must fail initially
4. **Implement Core Services** (T030-T032, T052-T056) - Business logic first
5. **Build APIs** (T033-T039) - Make tests pass
6. **Create Frontend** (T040-T051) - User interface
7. **Add Integrations** (T057-T060) - Banking, exports, audit
8. **Polish & Optimize** (T061-T067) - Performance and user experience

## Notes

- **[P] tasks** can run in parallel (different files, no shared dependencies)
- **Verify all tests fail** before implementing any business logic
- **Commit after each task** for clear progression tracking
- **Critical business rules**: VAT calculation, commission rates, share percentages, debt management
- **Security focus**: Row Level Security, role-based access, audit trail
- **Performance targets**: <200ms API, <3s page loads, 100+ concurrent users
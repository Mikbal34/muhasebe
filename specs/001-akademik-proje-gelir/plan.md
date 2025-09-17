# Implementation Plan: Akademik Proje Gelir Dağıtım ve Ödeme Takip Sistemi

**Branch**: `001-akademik-proje-gelir` | **Date**: 2025-09-16 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/001-akademik-proje-gelir/spec.md`

## Execution Flow (/plan command scope)
```
1. Load feature spec from Input path
   → Feature spec loaded successfully
2. Fill Technical Context (scan for NEEDS CLARIFICATION)
   → Detected Project Type: web (frontend+backend)
   → Structure Decision: Option 2 (Web application)
3. Fill the Constitution Check section
   → No constitution principles defined yet
4. Evaluate Constitution Check section
   → No violations (constitution not defined)
   → Update Progress Tracking: Initial Constitution Check
5. Execute Phase 0 → research.md
   → Researching Next.js, TypeScript, Supabase patterns
6. Execute Phase 1 → contracts, data-model.md, quickstart.md, CLAUDE.md
7. Re-evaluate Constitution Check section
   → No new violations
   → Update Progress Tracking: Post-Design Constitution Check
8. Plan Phase 2 → Task generation approach documented
9. STOP - Ready for /tasks command
```

**IMPORTANT**: The /plan command STOPS at step 7. Phases 2-4 are executed by other commands:
- Phase 2: /tasks command creates tasks.md
- Phase 3-4: Implementation execution (manual or via tools)

## Summary
Academic project income management system that tracks revenues, automatically calculates VAT and company commission (15%), distributes net amounts to project representatives based on share percentages, manages balances/debts, and integrates with banking systems for payment instructions. Built with Next.js, TypeScript, and Supabase for a modern, scalable web application.

## Technical Context
**Language/Version**: TypeScript 5.x / Node.js 18+
**Primary Dependencies**: Next.js 14+, React 18+, Supabase Cloud
**Storage**: Supabase (PostgreSQL with Row Level Security)
**Testing**: Jest, React Testing Library
**Target Platform**: Web browser (Chrome, Firefox, Safari, Edge)
**Project Type**: web - Full-stack application with frontend and backend
**Performance Goals**: <200ms API response time, <3s page load
**Constraints**: Role-based access control, real-time balance updates, audit trail
**Scale/Scope**: 100+ concurrent users, 1000+ projects, 10000+ transactions

## Constitution Check
*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

Since no specific constitution principles are defined in the template file, proceeding with standard best practices:
- ✅ Modular architecture with clear separation of concerns
- ✅ Type-safe implementation with TypeScript
- ✅ Database-backed with proper authentication and authorization
- ✅ Test coverage for critical business logic

## Project Structure

### Documentation (this feature)
```
specs/001-akademik-proje-gelir/
├── plan.md              # This file (/plan command output)
├── research.md          # Phase 0 output (/plan command)
├── data-model.md        # Phase 1 output (/plan command)
├── quickstart.md        # Phase 1 output (/plan command)
├── contracts/           # Phase 1 output (/plan command)
└── tasks.md             # Phase 2 output (/tasks command - NOT created by /plan)
```

### Source Code (repository root)
```
# Option 2: Web application (Next.js + Supabase)
app/
├── (auth)/              # Authentication pages
├── (dashboard)/         # Main application pages
│   ├── projects/
│   ├── income/
│   ├── payments/
│   └── reports/
├── api/                 # API routes
└── layout.tsx

components/
├── ui/                  # Reusable UI components
├── forms/               # Form components
└── tables/              # Data table components

lib/
├── supabase/           # Supabase client and utilities
├── utils/              # Helper functions
└── types/              # TypeScript type definitions

supabase/
├── migrations/         # Database migrations
└── functions/          # Edge functions
```

**Structure Decision**: Option 2 (Web application) - Next.js App Router with Supabase backend

## Phase 0: Outline & Research
1. **Extract unknowns from Technical Context**:
   - Bank integration format (XML/CSV structure)
   - Supabase Row Level Security patterns for role-based access
   - Next.js 14 App Router best practices
   - Report generation (Excel/PDF) libraries for Next.js

2. **Generate and dispatch research agents**:
   ```
   Task: "Research bank integration XML/CSV formats for Turkish banks"
   Task: "Find best practices for Supabase RLS with 3 user roles"
   Task: "Research Next.js 14 App Router patterns for financial applications"
   Task: "Evaluate Excel/PDF generation libraries for Next.js"
   ```

3. **Consolidate findings** in `research.md`:
   - Bank Integration: CSV format with standard fields
   - Supabase RLS: Policy-based access control
   - Next.js patterns: Server Components for data fetching
   - Report libraries: ExcelJS for Excel, jsPDF for PDF

**Output**: research.md with all clarifications resolved

## Phase 1: Design & Contracts
*Prerequisites: research.md complete*

1. **Extract entities from feature spec** → `data-model.md`:
   - users (id, email, role, full_name)
   - projects (id, code, name, budget, status)
   - project_representatives (project_id, user_id, share_percentage)
   - incomes (id, project_id, gross_amount, vat_amount, net_amount, date)
   - balances (user_id, available_amount, debt_amount)
   - payment_instructions (id, user_id, amount, status, bank_export)
   - commissions (income_id, amount, date)

2. **Generate API contracts** from functional requirements:
   - POST /api/projects - Create project
   - GET /api/projects - List projects
   - POST /api/income - Record income
   - GET /api/balances - Get user balances
   - POST /api/payment-instructions - Create payment instruction
   - GET /api/reports - Generate reports

3. **Generate contract tests** from contracts:
   - Test schema validation for each endpoint
   - Test role-based access control
   - Test business rule enforcement

4. **Extract test scenarios** from user stories:
   - Income recording with automatic calculations
   - Debt deduction from new payments
   - Payment instruction validation
   - Report generation with filters

5. **Update CLAUDE.md** for Claude Code assistant:
   - Add Next.js 14, TypeScript, Supabase context
   - Include project structure and patterns
   - Document testing approach

**Output**: data-model.md, /contracts/*, failing tests, quickstart.md, CLAUDE.md

## Phase 2: Task Planning Approach
*This section describes what the /tasks command will do - DO NOT execute during /plan*

**Task Generation Strategy**:
- Database schema and Supabase setup tasks [P]
- Authentication and role management tasks [P]
- API endpoint implementation tasks
- Frontend component tasks for each module
- Integration test tasks for user scenarios
- Report generation tasks

**Ordering Strategy**:
- Database and auth setup first
- Backend APIs before frontend
- Core features before reporting
- Tests alongside implementation

**Estimated Output**: 30-35 numbered, ordered tasks in tasks.md

**IMPORTANT**: This phase is executed by the /tasks command, NOT by /plan

## Phase 3+: Future Implementation
*These phases are beyond the scope of the /plan command*

**Phase 3**: Task execution (/tasks command creates tasks.md)
**Phase 4**: Implementation (execute tasks.md following Next.js/Supabase patterns)
**Phase 5**: Validation (run tests, execute quickstart.md, performance validation)

## Complexity Tracking
*No violations - proceeding with standard architecture*

## Progress Tracking
*This checklist is updated during execution flow*

**Phase Status**:
- [x] Phase 0: Research complete (/plan command)
- [x] Phase 1: Design complete (/plan command)
- [x] Phase 2: Task planning approach documented (/plan command)
- [ ] Phase 3: Tasks generated (/tasks command)
- [ ] Phase 4: Implementation complete
- [ ] Phase 5: Validation passed

**Gate Status**:
- [x] Initial Constitution Check: PASS
- [x] Post-Design Constitution Check: PASS
- [x] All NEEDS CLARIFICATION resolved
- [x] Complexity deviations documented (none)

---
*Implementation plan complete - Ready for /tasks command to generate tasks.md*
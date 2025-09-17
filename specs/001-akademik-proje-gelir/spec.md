# Feature Specification: Akademik Proje Gelir Da1t1m ve Ödeme Takip Sistemi

**Feature Branch**: `001-akademik-proje-gelir`
**Created**: 2025-09-16
**Status**: Draft
**Input**: User description: "Akademik projelerden gelen gelirleri kaydetmek, KDV ve _irket komisyonunu otomatik hesaplamak, net tutarlar1 proje temsilcilerine da1tmak ve ödeme talimat sistemi ile entegre çal1_t1rmak"

## Execution Flow (main)
```
1. Parse user description from Input
   ’ Income tracking and distribution system for academic projects identified
2. Extract key concepts from description
   ’ Actors: Admin, Finance Officer, Project Representative (Academician)
   ’ Actions: Income recording, tax calculation, commission deduction, payment distribution
   ’ Data: Projects, incomes, balances, payment instructions
   ’ Constraints: Role-based access, automatic calculations, debt blocking
3. For each unclear aspect:
   ’ Marked clarifications needed for payment gateway integration details
4. Fill User Scenarios & Testing section
   ’ User flows defined for all three roles
5. Generate Functional Requirements
   ’ Each requirement is testable and specific
6. Identify Key Entities
   ’ Projects, Users, Incomes, Payments, Balances identified
7. Run Review Checklist
   ’ Spec ready for planning phase
8. Return: SUCCESS (spec ready for planning)
```

---

## ¡ Quick Guidelines
-  Focus on WHAT users need and WHY
- L Avoid HOW to implement (no tech stack, APIs, code structure)
- =e Written for business stakeholders, not developers

---

## User Scenarios & Testing

### Primary User Story
Academic institutions need to manage project revenues, automatically calculate taxes and commissions, distribute net amounts to project representatives based on their share percentages, and track payment instructions with banking system integration.

### Acceptance Scenarios

1. **Given** a new academic project with budget and team members, **When** finance officer records an income, **Then** system automatically calculates VAT, deducts 15% company commission, and distributes remaining amount based on representative shares

2. **Given** an academician with existing debt, **When** a new payment is assigned to them, **Then** system automatically deducts the debt amount before allowing payment

3. **Given** a payment instruction request, **When** academician has insufficient balance, **Then** system shows warning and blocks the transaction

4. **Given** approved payment instructions, **When** finance officer confirms them, **Then** system generates export file for bank integration

5. **Given** multiple projects and academicians, **When** admin requests reports, **Then** system provides project-based, person-based, and date-range reports with Excel/PDF export

### Edge Cases
- What happens when project budget is exceeded?
- How does system handle partial payments when balance is insufficient?
- What occurs when share percentages don't sum to 100%?
- How are cancelled or reversed payments handled?
- What happens when an academician is removed from an active project?

## Requirements

### Functional Requirements

**Project Management Module:**
- **FR-001**: System MUST automatically generate unique project codes
- **FR-002**: System MUST record project name, budget, and team members with their share percentages
- **FR-003**: System MUST validate that total share percentages equal 100%
- **FR-004**: System MUST track project income entries and calculate payment plans

**Income-VAT-Commission Module:**
- **FR-005**: System MUST automatically separate VAT from gross income amount
- **FR-006**: System MUST calculate 15% company commission on net amount (after VAT)
- **FR-007**: System MUST distribute remaining amount to representatives based on their shares
- **FR-008**: System MUST maintain accurate calculation audit trail

**Balance and Debt Control Module:**
- **FR-009**: System MUST maintain individual balance for each academician
- **FR-010**: System MUST automatically deduct existing debts from new payments
- **FR-011**: System MUST block payments when academician has outstanding debt
- **FR-012**: System MUST show real-time balance status for each user

**Payment Instruction Integration Module:**
- **FR-013**: System MUST validate balance availability before payment instruction
- **FR-014**: System MUST display warning and block transaction for insufficient balance
- **FR-015**: System MUST generate XML/CSV export for approved payment instructions
- **FR-016**: System MUST support [NEEDS CLARIFICATION: specific bank integration format/protocol not specified]

**Reporting and Audit Module:**
- **FR-017**: System MUST generate project-based financial reports
- **FR-018**: System MUST generate academician-based payment history reports
- **FR-019**: System MUST generate company revenue reports with commission totals
- **FR-020**: System MUST provide date-range filtering for all reports
- **FR-021**: System MUST export reports in Excel and PDF formats

**Role-Based Access Control:**
- **FR-022**: System MUST support three user roles: Admin, Finance Officer, Project Representative
- **FR-023**: Admin role MUST access all modules and system management functions
- **FR-024**: Finance Officer role MUST access payment entries, balances, and payment instructions
- **FR-025**: Project Representative role MUST only access their own project reports
- **FR-026**: System MUST enforce role-based permissions on all operations

### Key Entities

- **Project**: Represents academic project with code, name, budget, status, and team composition
- **User**: System users with roles (Admin, Finance Officer, Academician) and authentication credentials
- **Project Representative**: Academician assigned to project with specific share percentage
- **Income**: Revenue entry for project with gross amount, VAT, net amount, and entry date
- **Balance**: Current financial status for each academician including available funds and debts
- **Payment Instruction**: Payment order with recipient, amount, status, and bank export data
- **Commission**: Company's 15% share from each income transaction
- **Report**: Generated financial documents with filters and export formats

---

## Review & Acceptance Checklist

### Content Quality
- [x] No implementation details (languages, frameworks, APIs)
- [x] Focused on user value and business needs
- [x] Written for non-technical stakeholders
- [x] All mandatory sections completed

### Requirement Completeness
- [ ] No [NEEDS CLARIFICATION] markers remain (1 item needs clarification)
- [x] Requirements are testable and unambiguous
- [x] Success criteria are measurable
- [x] Scope is clearly bounded
- [x] Dependencies and assumptions identified

---

## Execution Status

- [x] User description parsed
- [x] Key concepts extracted
- [x] Ambiguities marked
- [x] User scenarios defined
- [x] Requirements generated
- [x] Entities identified
- [x] Review checklist passed

---
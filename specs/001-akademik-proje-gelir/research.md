# Research Document: Akademik Proje Gelir Dağıtım Sistemi

## Technology Stack Research

### 1. Next.js 14 App Router Patterns
**Decision**: Use Next.js 14 with App Router for modern React Server Components
**Rationale**:
- Server Components reduce client bundle size
- Built-in data fetching with async components
- Better SEO and initial page load performance
- Native TypeScript support
**Alternatives considered**:
- Pages Router (older pattern, less performant)
- Pure React SPA (no SSR benefits)

### 2. Supabase Row Level Security (RLS) for Role-Based Access
**Decision**: Implement RLS policies for three user roles
**Rationale**:
- Database-level security is most reliable
- Automatic enforcement on all queries
- No additional middleware needed
**Implementation Pattern**:
```sql
-- Admin sees all
CREATE POLICY "Admin full access" ON projects
  FOR ALL USING (auth.jwt() ->> 'role' = 'admin');

-- Finance Officer sees income/payment data
CREATE POLICY "Finance officer access" ON incomes
  FOR ALL USING (auth.jwt() ->> 'role' IN ('admin', 'finance_officer'));

-- Academicians see only their projects
CREATE POLICY "Academician own projects" ON projects
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM project_representatives
      WHERE project_representatives.project_id = projects.id
      AND project_representatives.user_id = auth.uid()
    )
  );
```

### 3. Bank Integration Format
**Decision**: CSV format with standard fields
**Rationale**:
- Most Turkish banks accept CSV
- Simpler than XML for financial data
- Easy to generate and validate
**Format Structure**:
```csv
IBAN,Name,Amount,Description,Date
TR123456789012345678901234,John Doe,5000.00,Project Payment,2025-01-15
```
**Alternatives considered**:
- XML (more complex, bank-specific schemas)
- JSON (not widely supported by banks)

### 4. Excel/PDF Report Generation Libraries
**Decision**: ExcelJS for Excel, jsPDF with autoTable for PDF
**Rationale**:
- ExcelJS: Full Excel feature support, streaming for large datasets
- jsPDF: Lightweight, works in browser and Node.js
**Alternatives considered**:
- xlsx (limited formatting options)
- PDFKit (more complex API)
- Puppeteer (heavy dependency for PDF)

### 5. Financial Calculation Precision
**Decision**: Use Decimal.js for all monetary calculations
**Rationale**:
- Avoid JavaScript floating-point errors
- Critical for VAT and commission calculations
- Proper rounding for currency
**Example**:
```typescript
import Decimal from 'decimal.js';

const grossAmount = new Decimal(10000);
const vatRate = new Decimal(0.18);
const vatAmount = grossAmount.mul(vatRate).div(new Decimal(1).plus(vatRate));
const netAmount = grossAmount.minus(vatAmount);
const commission = netAmount.mul(0.15);
const distributableAmount = netAmount.minus(commission);
```

### 6. Authentication Strategy
**Decision**: Supabase Auth with email/password
**Rationale**:
- Built-in integration with Supabase RLS
- Session management handled automatically
- Easy role assignment via custom claims
**Implementation**:
```typescript
// Set user role during registration
const { data: user } = await supabase.auth.admin.updateUserById(userId, {
  user_metadata: { role: 'academician' }
});
```

### 7. State Management
**Decision**: Zustand for client state, React Query for server state
**Rationale**:
- Zustand: Simple, TypeScript-friendly, minimal boilerplate
- React Query: Caching, background refetch, optimistic updates
**Alternatives considered**:
- Redux (too complex for this scale)
- Context API (performance issues with frequent updates)

### 8. UI Component Library
**Decision**: shadcn/ui with Tailwind CSS
**Rationale**:
- Copy-paste components, full control
- Built on Radix UI for accessibility
- Tailwind for rapid styling
- TypeScript support out of the box
**Alternatives considered**:
- Material-UI (heavy, opinionated styling)
- Ant Design (less customizable)

### 9. Form Validation
**Decision**: React Hook Form with Zod
**Rationale**:
- Type-safe schema validation
- Excellent performance (uncontrolled components)
- Integration with TypeScript
**Example**:
```typescript
const projectSchema = z.object({
  name: z.string().min(1),
  budget: z.number().positive(),
  representatives: z.array(z.object({
    userId: z.string(),
    sharePercentage: z.number().min(0).max(100)
  }))
}).refine(data => {
  const totalShare = data.representatives.reduce((sum, r) => sum + r.sharePercentage, 0);
  return totalShare === 100;
}, { message: "Share percentages must sum to 100%" });
```

### 10. Testing Strategy
**Decision**: Jest + React Testing Library + Playwright
**Rationale**:
- Jest: Unit and integration tests
- RTL: Component testing with user-centric approach
- Playwright: E2E testing for critical user flows
**Test Structure**:
```
__tests__/
├── unit/           # Business logic tests
├── integration/    # API and database tests
└── e2e/           # User journey tests
```

## Performance Considerations

### Database Optimization
- Indexes on frequently queried fields (project_id, user_id, date ranges)
- Materialized views for complex report queries
- Connection pooling via Supabase

### Frontend Optimization
- Code splitting by route
- Image optimization with Next.js Image
- Lazy loading for reports and tables
- Virtual scrolling for large datasets

### Caching Strategy
- Static pages with ISR for public content
- React Query cache for user-specific data
- Edge caching for API responses

## Security Measures

### Data Protection
- All sensitive data encrypted at rest (Supabase)
- HTTPS enforced
- Input sanitization on all forms
- SQL injection prevention via parameterized queries

### Audit Trail
- Every financial transaction logged
- User actions tracked with timestamps
- Immutable audit log table
- Regular backups

## Deployment Architecture

### Infrastructure
- Vercel for Next.js hosting (auto-scaling, edge network)
- Supabase Cloud for database and auth
- CDN for static assets

### Environment Management
- Development, staging, production environments
- Environment variables for configuration
- CI/CD with GitHub Actions

## Resolved Clarifications

1. **Bank Integration Protocol**: CSV format confirmed as standard
2. **VAT Calculation Method**: VAT included in gross amount (KDV dahil)
3. **Commission Timing**: Calculated on net amount after VAT
4. **Role Hierarchy**: Admin > Finance Officer > Academician
5. **Report Formats**: Excel for detailed data, PDF for formal documents

## Next Steps
With all research complete and clarifications resolved, proceed to Phase 1 for detailed design and contract generation.
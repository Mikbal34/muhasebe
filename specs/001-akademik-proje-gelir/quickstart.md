# Quick Start Guide: Academic Project Income Distribution System

## Prerequisites

- Node.js 18+ installed
- Supabase account created
- Git installed

## Setup Instructions

### 1. Clone and Install

```bash
# Clone the repository
git clone <repository-url>
cd muhasebe_yazilimi

# Install dependencies
npm install

# Copy environment variables
cp .env.example .env.local
```

### 2. Configure Supabase

1. Create a new Supabase project at https://app.supabase.com
2. Get your project URL and anon key from Settings > API
3. Update `.env.local`:

```env
NEXT_PUBLIC_SUPABASE_URL=your-project-url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
```

### 3. Database Setup

```bash
# Run database migrations
npm run db:migrate

# Seed initial data (creates admin user)
npm run db:seed
```

Default admin credentials:
- Email: admin@example.com
- Password: Admin123!

### 4. Start Development Server

```bash
npm run dev
```

Visit http://localhost:3000

## User Scenarios Testing

### Scenario 1: Project Setup (Admin)

1. **Login as Admin**
   - Navigate to /login
   - Enter admin credentials
   - Verify redirect to dashboard

2. **Create Academicians**
   - Go to Users > Add User
   - Create 2 academician accounts:
     - Dr. Ali Yılmaz (ali@university.edu)
     - Dr. Ayşe Kaya (ayse@university.edu)
   - Set role as "academician"

3. **Create Project**
   - Navigate to Projects > New Project
   - Enter details:
     - Name: "AI Research Project 2025"
     - Budget: 100,000 TL
     - Start Date: Today
   - Add representatives:
     - Dr. Ali Yılmaz: 60% (Lead)
     - Dr. Ayşe Kaya: 40%
   - Click "Create Project"
   - Verify project code generated (e.g., PRJ-2025-001)

### Scenario 2: Income Recording (Finance Officer)

1. **Login as Finance Officer**
   - Use credentials: finance@example.com / Finance123!

2. **Record Income**
   - Go to Income > Record Income
   - Select project: PRJ-2025-001
   - Enter gross amount: 50,000 TL (VAT included)
   - Enter description: "First payment from sponsor"
   - Click "Record Income"

3. **Verify Calculations**
   - VAT (18%): 7,627.12 TL
   - Net Amount: 42,372.88 TL
   - Commission (15%): 6,355.93 TL
   - Distributable: 36,016.95 TL
   - Dr. Ali (60%): 21,610.17 TL
   - Dr. Ayşe (40%): 14,406.78 TL

### Scenario 3: Balance Check (Academician)

1. **Login as Academician**
   - Use credentials: ali@university.edu / password

2. **View Balance**
   - Dashboard shows current balance: 21,610.17 TL
   - No debts shown
   - View transaction history

3. **View Project Reports**
   - Navigate to My Projects
   - Select PRJ-2025-001
   - View income history
   - Export report as PDF

### Scenario 4: Payment Instruction (Finance Officer)

1. **Create Payment Instruction**
   - Go to Payments > New Instruction
   - Select Dr. Ali Yılmaz
   - Enter amount: 15,000 TL
   - Add notes: "Partial payment for January"
   - Click "Create Instruction"

2. **Verify Balance Check**
   - System shows available: 21,610.17 TL
   - Payment allowed
   - New balance after payment: 6,610.17 TL

3. **Export for Bank**
   - Click "Export CSV"
   - Verify CSV format:
     ```csv
     IBAN,Name,Amount,Description,Date
     TR123456789012345678901234,Dr. Ali Yılmaz,15000.00,PAY-2025-001,2025-01-20
     ```

### Scenario 5: Debt Management

1. **Create Debt Scenario**
   - As admin, create adjustment: -5,000 TL for Dr. Ayşe
   - Balance becomes negative (debt)

2. **Record New Income**
   - Record 20,000 TL income for the project
   - Dr. Ayşe's share: 6,805.08 TL

3. **Verify Debt Deduction**
   - System automatically deducts 5,000 TL debt
   - Remaining 1,805.08 TL added to available balance
   - Debt cleared

### Scenario 6: Reporting (Admin)

1. **Generate Project Report**
   - Go to Reports > Project Reports
   - Select PRJ-2025-001
   - Date range: Current month
   - Click "Generate"

2. **View Report Contents**
   - Total income: 70,000 TL
   - Total VAT: 10,677.97 TL
   - Total Commission: 8,898.30 TL
   - Total distributed: 50,423.73 TL

3. **Export Reports**
   - Click "Export Excel"
   - Verify Excel file with all sheets:
     - Summary
     - Income Details
     - Distribution Details
     - Payment History

## API Testing

### Test Authentication

```bash
# Register new user
curl -X POST http://localhost:3000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "Test123!",
    "fullName": "Test User",
    "role": "academician"
  }'

# Login
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "admin@example.com",
    "password": "Admin123!"
  }'
# Save the returned token
```

### Test Project Creation

```bash
TOKEN="your-jwt-token"

curl -X POST http://localhost:3000/api/projects \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Test Project",
    "budget": 50000,
    "startDate": "2025-01-01",
    "representatives": [
      {
        "userId": "user-uuid-1",
        "sharePercentage": 50,
        "isLead": true
      },
      {
        "userId": "user-uuid-2",
        "sharePercentage": 50
      }
    ]
  }'
```

### Test Income Recording

```bash
curl -X POST http://localhost:3000/api/income \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "projectId": "project-uuid",
    "grossAmount": 10000,
    "description": "Test income",
    "incomeDate": "2025-01-20"
  }'
```

## Validation Checklist

### Business Rules
- [ ] Project codes auto-generated sequentially
- [ ] Share percentages must sum to 100%
- [ ] VAT calculated correctly (18% by default)
- [ ] Commission calculated on net amount (15%)
- [ ] Distributions match share percentages
- [ ] Debts automatically deducted from new payments
- [ ] Payment blocked when insufficient balance
- [ ] Role-based access control working

### Technical Requirements
- [ ] All API endpoints return correct status codes
- [ ] Database transactions maintain consistency
- [ ] Audit logs created for all financial operations
- [ ] Reports generated accurately
- [ ] Excel/PDF exports working
- [ ] CSV bank export formatted correctly

### Performance
- [ ] Page load < 3 seconds
- [ ] API response < 200ms
- [ ] Report generation < 5 seconds
- [ ] Supports 100 concurrent users

## Troubleshooting

### Common Issues

1. **Database connection error**
   - Verify Supabase URL and keys in .env.local
   - Check Supabase project is active

2. **Authentication fails**
   - Clear browser cookies
   - Verify JWT secret configured
   - Check user role in database

3. **Calculations incorrect**
   - Verify Decimal.js library installed
   - Check calculation formulas in utils

4. **Reports not generating**
   - Verify ExcelJS and jsPDF installed
   - Check file permissions in exports directory

## Support

For issues or questions:
- Check logs in Supabase dashboard
- Review error messages in browser console
- Contact system administrator
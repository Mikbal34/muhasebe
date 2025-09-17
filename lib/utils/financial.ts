import Decimal from 'decimal.js'

// Set precision for financial calculations
Decimal.set({ precision: 10, rounding: 4 })

export interface IncomeCalculation {
  grossAmount: number
  vatRate: number
  vatAmount: number
  netAmount: number
  commissionRate: number
  commissionAmount: number
  distributableAmount: number
}

export interface DistributionCalculation {
  userId: string
  sharePercentage: number
  amount: number
}

/**
 * Calculate VAT amount from gross amount (VAT included)
 * Formula: VAT = gross * vatRate / (100 + vatRate)
 */
export function calculateVATFromGross(
  grossAmount: number,
  vatRate: number = 18
): number {
  const gross = new Decimal(grossAmount)
  const rate = new Decimal(vatRate)
  const divisor = new Decimal(100).plus(rate)

  return gross.mul(rate).div(divisor).toDecimalPlaces(2).toNumber()
}

/**
 * Calculate net amount after VAT deduction
 */
export function calculateNetAmount(
  grossAmount: number,
  vatAmount: number
): number {
  const gross = new Decimal(grossAmount)
  const vat = new Decimal(vatAmount)

  return gross.minus(vat).toDecimalPlaces(2).toNumber()
}

/**
 * Calculate commission amount (default 15% of net amount)
 */
export function calculateCommission(
  netAmount: number,
  commissionRate: number = 15
): number {
  const net = new Decimal(netAmount)
  const rate = new Decimal(commissionRate).div(100)

  return net.mul(rate).toDecimalPlaces(2).toNumber()
}

/**
 * Calculate distributable amount after commission
 */
export function calculateDistributableAmount(
  netAmount: number,
  commissionAmount: number
): number {
  const net = new Decimal(netAmount)
  const commission = new Decimal(commissionAmount)

  return net.minus(commission).toDecimalPlaces(2).toNumber()
}

/**
 * Complete income calculation pipeline
 */
export function calculateIncomeBreakdown(
  grossAmount: number,
  vatRate: number = 18,
  commissionRate: number = 15
): IncomeCalculation {
  const vatAmount = calculateVATFromGross(grossAmount, vatRate)
  const netAmount = calculateNetAmount(grossAmount, vatAmount)
  const commissionAmount = calculateCommission(netAmount, commissionRate)
  const distributableAmount = calculateDistributableAmount(netAmount, commissionAmount)

  return {
    grossAmount,
    vatRate,
    vatAmount,
    netAmount,
    commissionRate,
    commissionAmount,
    distributableAmount,
  }
}

/**
 * Calculate individual distributions based on share percentages
 */
export function calculateDistributions(
  distributableAmount: number,
  representatives: Array<{ userId: string; sharePercentage: number }>
): DistributionCalculation[] {
  const totalAmount = new Decimal(distributableAmount)

  return representatives.map(rep => {
    const share = new Decimal(rep.sharePercentage).div(100)
    const amount = totalAmount.mul(share).toDecimalPlaces(2).toNumber()

    return {
      userId: rep.userId,
      sharePercentage: rep.sharePercentage,
      amount,
    }
  })
}

/**
 * Validate that share percentages sum to 100%
 */
export function validateSharePercentages(
  representatives: Array<{ sharePercentage: number }>
): boolean {
  const total = representatives.reduce((sum, rep) => {
    return new Decimal(sum).plus(rep.sharePercentage)
  }, new Decimal(0))

  return total.equals(100)
}

/**
 * Format currency for display (Turkish Lira)
 */
export function formatCurrency(
  amount: number,
  currency: string = 'TRY',
  locale: string = 'tr-TR'
): string {
  return new Intl.NumberFormat(locale, {
    style: 'currency',
    currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount)
}

/**
 * Format percentage for display
 */
export function formatPercentage(
  value: number,
  decimals: number = 2,
  locale: string = 'tr-TR'
): string {
  return new Intl.NumberFormat(locale, {
    style: 'percent',
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(value / 100)
}

/**
 * Round to 2 decimal places for financial precision
 */
export function roundFinancial(amount: number): number {
  return new Decimal(amount).toDecimalPlaces(2).toNumber()
}

/**
 * Check if balance is sufficient for payment
 */
export function checkSufficientBalance(
  availableAmount: number,
  requestedAmount: number,
  debtAmount: number = 0
): { sufficient: boolean; shortfall?: number; hasDebt: boolean } {
  const available = new Decimal(availableAmount)
  const requested = new Decimal(requestedAmount)
  const debt = new Decimal(debtAmount)

  const hasDebt = debt.greaterThan(0)

  if (hasDebt) {
    return {
      sufficient: false,
      hasDebt: true,
      shortfall: debt.toNumber(),
    }
  }

  const sufficient = available.greaterThanOrEqualTo(requested)
  const shortfall = sufficient ? 0 : requested.minus(available).toNumber()

  return {
    sufficient,
    hasDebt: false,
    ...(shortfall > 0 && { shortfall }),
  }
}

/**
 * Calculate balance after debt deduction
 */
export function applyDebtToIncome(
  incomeAmount: number,
  currentDebt: number
): { remainingIncome: number; remainingDebt: number } {
  const income = new Decimal(incomeAmount)
  const debt = new Decimal(currentDebt)

  if (debt.equals(0)) {
    return {
      remainingIncome: income.toNumber(),
      remainingDebt: 0,
    }
  }

  if (income.greaterThanOrEqualTo(debt)) {
    // Income covers full debt
    return {
      remainingIncome: income.minus(debt).toNumber(),
      remainingDebt: 0,
    }
  } else {
    // Income partially covers debt
    return {
      remainingIncome: 0,
      remainingDebt: debt.minus(income).toNumber(),
    }
  }
}

/**
 * Generate project code
 */
export function generateProjectCode(year?: number): string {
  const currentYear = year || new Date().getFullYear()
  // Note: In production, this would query database for next sequence number
  const sequence = 1 // This should be calculated from existing projects
  return `PRJ-${currentYear}-${sequence.toString().padStart(3, '0')}`
}

/**
 * Generate payment instruction number
 */
export function generatePaymentInstructionNumber(year?: number): string {
  const currentYear = year || new Date().getFullYear()
  // Note: In production, this would query database for next sequence number
  const sequence = 1 // This should be calculated from existing instructions
  return `PAY-${currentYear}-${sequence.toString().padStart(3, '0')}`
}

/**
 * Convert Turkish number format to standard decimal
 */
export function parseTurkishNumber(value: string): number {
  // Replace Turkish decimal separator (,) with standard (.)
  const standardFormat = value.replace(/\./g, '').replace(',', '.')
  return parseFloat(standardFormat)
}

/**
 * Format number in Turkish format (comma as decimal separator)
 */
export function formatTurkishNumber(value: number): string {
  return new Intl.NumberFormat('tr-TR', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value)
}
import { NextRequest, NextResponse } from 'next/server'
import { apiResponse, withAuth, AuthContext } from '@/lib/middleware/auth'
const ExcelJS = require('exceljs')

// Column definition for Excel exports
export interface ExcelColumn<T = any> {
  key: string
  label: string
  width?: number
  numFmt?: string
  getValue: (item: T) => string | number | boolean | null
}

// Excel style definitions
export const EXCEL_STYLES = {
  header: {
    font: { bold: true, color: { argb: 'FFFFFF' } },
    fill: { type: 'pattern', pattern: 'solid', fgColor: { argb: '14B8A6' } },
    alignment: { horizontal: 'center', vertical: 'middle' },
    border: {
      top: { style: 'thin' },
      bottom: { style: 'thin' },
      left: { style: 'thin' },
      right: { style: 'thin' }
    }
  },
  data: {
    border: {
      top: { style: 'thin' },
      bottom: { style: 'thin' },
      left: { style: 'thin' },
      right: { style: 'thin' }
    },
    alignment: { horizontal: 'center', vertical: 'middle' }
  },
  title: {
    font: { bold: true, size: 16 },
    alignment: { horizontal: 'center' }
  }
} as const

// Excel export configuration
export interface ExcelExportConfig<T = any> {
  title: string
  sheetName: string
  filename: string
  columns: ExcelColumn<T>[]
}

// Generic Excel buffer generator
export async function generateExcelBuffer<T>(
  data: T[],
  config: ExcelExportConfig<T>,
  selectedColumns?: string[]
): Promise<Buffer> {
  const workbook = new ExcelJS.Workbook()
  workbook.creator = 'Muhasebe Yazilimi'
  workbook.created = new Date()

  const worksheet = workbook.addWorksheet(config.sheetName)

  // Filter columns if specific ones are selected
  const activeColumns = selectedColumns?.length
    ? config.columns.filter(col => selectedColumns.includes(col.key))
    : config.columns

  // Title row
  const lastCol = String.fromCharCode(64 + activeColumns.length)
  worksheet.mergeCells(`A1:${lastCol}1`)
  const titleCell = worksheet.getCell('A1')
  titleCell.value = config.title
  titleCell.font = EXCEL_STYLES.title.font as any
  titleCell.alignment = EXCEL_STYLES.title.alignment as any

  // Header row (row 3)
  activeColumns.forEach((col, index) => {
    const cell = worksheet.getCell(3, index + 1)
    cell.value = col.label
    cell.style = EXCEL_STYLES.header as any
  })

  // Data rows (starting from row 4)
  data.forEach((item, rowIndex) => {
    const row = rowIndex + 4
    activeColumns.forEach((col, colIndex) => {
      const cell = worksheet.getCell(row, colIndex + 1)
      cell.value = col.getValue(item)
      cell.style = EXCEL_STYLES.data as any
      if (col.numFmt) {
        cell.numFmt = col.numFmt
      }
    })
  })

  // Set column widths and formats
  activeColumns.forEach((col, index) => {
    const column = worksheet.getColumn(index + 1)
    column.width = col.width || 15
    if (col.numFmt) {
      column.numFmt = col.numFmt
    }
  })

  return await workbook.xlsx.writeBuffer()
}

// Create Excel response with proper headers
export function createExcelResponse(buffer: Buffer, filename: string): NextResponse {
  const headers = new Headers()
  headers.set('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet')
  const dateStr = new Date().toLocaleDateString('tr-TR').replace(/\./g, '-')
  headers.set('Content-Disposition', `attachment; filename="${filename}_${dateStr}.xlsx"`)
  // Convert Buffer to Uint8Array for NextResponse compatibility
  return new NextResponse(new Uint8Array(buffer), { headers })
}

// Export handler options
export interface ExportHandlerOptions<T, R> {
  // Role check
  allowedRoles?: string[]
  // Fetch data function
  fetchData: (ctx: AuthContext, filters: R) => Promise<T[]>
  // Parse request filters
  parseFilters: (body: any) => R
  // Excel configuration
  excelConfig: ExcelExportConfig<T>
  // Transform data for JSON preview (optional)
  transformForPreview?: (data: T[]) => any[]
  // Calculate summary for JSON preview (optional)
  calculateSummary?: (data: T[]) => Record<string, any>
}

// Generic export handler factory
export function createExportHandler<T, R>(options: ExportHandlerOptions<T, R>) {
  return async function handler(request: NextRequest) {
    return withAuth(request, async (req, ctx) => {
      // Role check
      const allowedRoles = options.allowedRoles || ['admin', 'manager']
      if (!allowedRoles.includes(ctx.user.role)) {
        return apiResponse.forbidden('Bu raporu disa aktarma yetkiniz yok')
      }

      try {
        const body = await request.json()
        const { columns, format = 'excel' } = body
        const filters = options.parseFilters(body)

        // Fetch data
        const data = await options.fetchData(ctx, filters)

        // JSON preview format
        if (format === 'json') {
          const rows = options.transformForPreview
            ? options.transformForPreview(data)
            : data

          const summary = options.calculateSummary
            ? options.calculateSummary(data)
            : { totalCount: data.length }

          return apiResponse.success({ rows, summary })
        }

        // Generate Excel
        const buffer = await generateExcelBuffer(data, options.excelConfig, columns)
        return createExcelResponse(buffer, options.excelConfig.filename)

      } catch (error: any) {
        console.error(`${options.excelConfig.filename} export error:`, error)
        return apiResponse.error('Export failed', error.message, 500)
      }
    })
  }
}

// Common column value getters
export const ColumnValueGetters = {
  // Format currency
  currency: (value: number | null | undefined) => value ?? 0,

  // Format date to Turkish locale
  date: (value: string | null | undefined) => {
    if (!value) return ''
    return new Date(value).toLocaleDateString('tr-TR')
  },

  // Format boolean to Evet/Hayir
  yesNo: (value: boolean | null | undefined) => value ? 'Evet' : 'Hayir',

  // Get nested object property
  nested: <T extends Record<string, any>>(item: T, path: string, defaultValue = 'N/A') => {
    const keys = path.split('.')
    let current: any = item
    for (const key of keys) {
      if (current === null || current === undefined) return defaultValue
      current = current[key]
    }
    return current ?? defaultValue
  }
}

// Common number formats for Excel
export const NUMBER_FORMATS = {
  currency: '#,##0.00 "₺"',
  currencyTL: '#,##0.00 "TL"',
  percentage: '0.00%',
  percentageSymbol: '0.00"%"',
  integer: '#,##0',
  decimal: '#,##0.00'
}

// Helper function to create workbook with common settings
export function createWorkbook() {
  const ExcelJS = require('exceljs')
  const workbook = new ExcelJS.Workbook()
  workbook.creator = 'Muhasebe Yazilimi'
  workbook.created = new Date()
  return workbook
}

// Helper to add a title row to a worksheet
export function addTitleRow(worksheet: any, title: string, columns: number, row: number = 1) {
  const lastCol = String.fromCharCode(64 + columns)
  worksheet.mergeCells(`A${row}:${lastCol}${row}`)
  const titleCell = worksheet.getCell(`A${row}`)
  titleCell.value = title
  titleCell.font = EXCEL_STYLES.title.font as any
  titleCell.alignment = EXCEL_STYLES.title.alignment as any
}

// Helper to add date row
export function addDateRow(worksheet: any, columns: number, row: number = 2) {
  const lastCol = String.fromCharCode(64 + columns)
  worksheet.mergeCells(`A${row}:${lastCol}${row}`)
  const dateCell = worksheet.getCell(`A${row}`)
  dateCell.value = `Rapor Tarihi: ${new Date().toLocaleDateString('tr-TR')}`
  dateCell.alignment = { horizontal: 'center' }
}

// Color constants for conditional formatting
export const EXCEL_COLORS = {
  profit: '16A34A',    // Green for positive/profit
  loss: 'DC2626',      // Red for negative/loss
  warning: 'F59E0B',   // Yellow/Orange for warning
  neutral: '000000',   // Black for neutral
  white: 'FFFFFF',
  primary: '14B8A6',   // Teal - primary brand color
  successBg: 'D1FAE5', // Light green background
  warningBg: 'FEF3C7', // Light yellow background
  errorBg: 'FEE2E2',   // Light red background
}

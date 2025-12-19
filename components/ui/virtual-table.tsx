'use client'

import { useVirtualizer } from '@tanstack/react-virtual'
import { useRef, ReactNode } from 'react'

interface Column<T> {
  key: string
  header: string
  width?: string
  className?: string
  render: (item: T, index: number) => ReactNode
}

interface VirtualTableProps<T> {
  items: T[]
  columns: Column<T>[]
  height?: number | string
  estimatedRowHeight?: number
  overscan?: number
  onRowClick?: (item: T) => void
  rowClassName?: (item: T) => string
  emptyMessage?: string
  getRowKey?: (item: T) => string
}

export function VirtualTable<T>({
  items,
  columns,
  height = 600,
  estimatedRowHeight = 56,
  overscan = 10,
  onRowClick,
  rowClassName,
  emptyMessage = 'Kayıt bulunamadı',
  getRowKey,
}: VirtualTableProps<T>) {
  const parentRef = useRef<HTMLDivElement>(null)

  const virtualizer = useVirtualizer({
    count: items.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => estimatedRowHeight,
    overscan,
  })

  if (items.length === 0) {
    return (
      <div className="bg-white rounded-lg shadow-sm border border-slate-200 p-8 text-center text-slate-500">
        {emptyMessage}
      </div>
    )
  }

  return (
    <div className="bg-white rounded-lg shadow-sm border border-slate-200 overflow-hidden">
      {/* Sticky Header */}
      <div className="overflow-x-auto border-b border-slate-200">
        <table className="min-w-full">
          <thead className="bg-slate-50">
            <tr>
              {columns.map((col) => (
                <th
                  key={col.key}
                  className={`px-4 py-3 text-left text-xs font-semibold text-slate-700 uppercase tracking-wider ${col.className || ''}`}
                  style={{ width: col.width }}
                >
                  {col.header}
                </th>
              ))}
            </tr>
          </thead>
        </table>
      </div>

      {/* Virtual Scrolling Body */}
      <div
        ref={parentRef}
        className="overflow-auto"
        style={{ height: typeof height === 'number' ? `${height}px` : height }}
      >
        <div
          style={{
            height: `${virtualizer.getTotalSize()}px`,
            width: '100%',
            position: 'relative',
          }}
        >
          {virtualizer.getVirtualItems().map((virtualRow) => {
            const item = items[virtualRow.index]
            const key = getRowKey ? getRowKey(item) : virtualRow.index

            return (
              <div
                key={key}
                className={`absolute top-0 left-0 w-full border-b border-slate-100 hover:bg-slate-50 transition-colors ${
                  onRowClick ? 'cursor-pointer' : ''
                } ${rowClassName ? rowClassName(item) : ''}`}
                style={{
                  height: `${virtualRow.size}px`,
                  transform: `translateY(${virtualRow.start}px)`,
                }}
                onClick={() => onRowClick?.(item)}
              >
                <table className="min-w-full h-full">
                  <tbody>
                    <tr className="h-full">
                      {columns.map((col) => (
                        <td
                          key={col.key}
                          className={`px-4 py-3 text-sm ${col.className || ''}`}
                          style={{ width: col.width }}
                        >
                          {col.render(item, virtualRow.index)}
                        </td>
                      ))}
                    </tr>
                  </tbody>
                </table>
              </div>
            )
          })}
        </div>
      </div>

      {/* Footer with count */}
      <div className="px-4 py-2 bg-slate-50 border-t border-slate-200 text-xs text-slate-500">
        Toplam {items.length} kayıt
      </div>
    </div>
  )
}

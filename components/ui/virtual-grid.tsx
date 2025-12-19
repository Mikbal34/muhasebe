'use client'

import { useVirtualizer } from '@tanstack/react-virtual'
import { useRef, ReactNode, useMemo } from 'react'

interface VirtualGridProps<T> {
  items: T[]
  height?: number | string
  columnCount: number
  estimatedRowHeight?: number
  gap?: number
  renderItem: (item: T, index: number) => ReactNode
  overscan?: number
  className?: string
  emptyMessage?: string
  getItemKey?: (item: T) => string
}

export function VirtualGrid<T>({
  items,
  height = 600,
  columnCount,
  estimatedRowHeight = 300,
  gap = 16,
  renderItem,
  overscan = 3,
  className = '',
  emptyMessage = 'Kayıt bulunamadı',
  getItemKey,
}: VirtualGridProps<T>) {
  const parentRef = useRef<HTMLDivElement>(null)

  // Satırlara böl
  const rows = useMemo(() => {
    const result: T[][] = []
    for (let i = 0; i < items.length; i += columnCount) {
      result.push(items.slice(i, i + columnCount))
    }
    return result
  }, [items, columnCount])

  const virtualizer = useVirtualizer({
    count: rows.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => estimatedRowHeight + gap,
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
    <div className={className}>
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
          {virtualizer.getVirtualItems().map((virtualRow) => (
            <div
              key={virtualRow.key}
              data-index={virtualRow.index}
              ref={virtualizer.measureElement}
              style={{
                position: 'absolute',
                top: 0,
                left: 0,
                width: '100%',
                transform: `translateY(${virtualRow.start}px)`,
                display: 'grid',
                gridTemplateColumns: `repeat(${columnCount}, 1fr)`,
                gap: `${gap}px`,
                paddingBottom: `${gap}px`,
              }}
            >
              {rows[virtualRow.index].map((item, colIndex) => {
                const itemIndex = virtualRow.index * columnCount + colIndex
                const key = getItemKey ? getItemKey(item) : itemIndex

                return (
                  <div key={key}>
                    {renderItem(item, itemIndex)}
                  </div>
                )
              })}
            </div>
          ))}
        </div>
      </div>

      {/* Footer with count */}
      <div className="mt-2 text-xs text-slate-500 text-center">
        Toplam {items.length} kayıt
      </div>
    </div>
  )
}

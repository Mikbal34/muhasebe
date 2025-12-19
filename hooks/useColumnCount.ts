'use client'

import { useState, useEffect } from 'react'

export function useColumnCount(breakpoints = { sm: 1, md: 2, lg: 3 }) {
  const [columnCount, setColumnCount] = useState(breakpoints.lg)

  useEffect(() => {
    const updateColumns = () => {
      if (window.innerWidth < 768) {
        setColumnCount(breakpoints.sm)
      } else if (window.innerWidth < 1024) {
        setColumnCount(breakpoints.md)
      } else {
        setColumnCount(breakpoints.lg)
      }
    }

    updateColumns()
    window.addEventListener('resize', updateColumns)
    return () => window.removeEventListener('resize', updateColumns)
  }, [breakpoints.sm, breakpoints.md, breakpoints.lg])

  return columnCount
}

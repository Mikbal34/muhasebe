import React from 'react'
import { TrendingUp, TrendingDown, Minus } from 'lucide-react'

// Simple Bar Chart Component
interface BarChartData {
  label: string
  value: number
  color?: string
}

interface BarChartProps {
  data: BarChartData[]
  height?: number
  showValues?: boolean
  formatValue?: (value: number) => string
}

export function BarChart({
  data,
  height = 200,
  showValues = true,
  formatValue = (v) => v.toLocaleString('tr-TR')
}: BarChartProps) {
  const maxValue = Math.max(...data.map(d => d.value))

  return (
    <div className="w-full">
      <div className="flex items-end justify-between space-x-2" style={{ height }}>
        {data.map((item, index) => {
          const percentage = maxValue > 0 ? (item.value / maxValue) * 100 : 0
          const barHeight = `${percentage}%`

          return (
            <div key={index} className="flex-1 flex flex-col items-center justify-end">
              {showValues && (
                <span className="text-xs font-medium text-gray-700 mb-1">
                  {formatValue(item.value)}
                </span>
              )}
              <div
                className="w-full rounded-t transition-all duration-300 hover:opacity-80"
                style={{
                  height: barHeight,
                  backgroundColor: item.color || '#3B82F6',
                  minHeight: '4px'
                }}
              />
              <span className="text-xs text-gray-600 mt-2 text-center truncate w-full">
                {item.label}
              </span>
            </div>
          )
        })}
      </div>
    </div>
  )
}

// Pie Chart Component (Simple CSS-based)
interface PieChartData {
  label: string
  value: number
  color: string
}

interface PieChartProps {
  data: PieChartData[]
  size?: number
  showLegend?: boolean
  formatValue?: (value: number) => string
}

export function PieChart({
  data,
  size = 200,
  showLegend = true,
  formatValue = (v) => v.toLocaleString('tr-TR')
}: PieChartProps) {
  const total = data.reduce((sum, item) => sum + item.value, 0)
  let cumulativePercentage = 0

  const createConicGradient = () => {
    const gradientStops = data.map((item) => {
      const percentage = (item.value / total) * 100
      const start = cumulativePercentage
      const end = cumulativePercentage + percentage
      cumulativePercentage = end
      return `${item.color} ${start}% ${end}%`
    })
    return `conic-gradient(${gradientStops.join(', ')})`
  }

  return (
    <div className="flex items-center space-x-4">
      <div className="relative">
        <div
          className="rounded-full"
          style={{
            width: size,
            height: size,
            background: createConicGradient()
          }}
        />
        <div
          className="absolute inset-0 flex items-center justify-center"
          style={{
            width: size,
            height: size
          }}
        >
          <div className="bg-white rounded-full shadow-inner" style={{ width: size * 0.6, height: size * 0.6 }}>
            <div className="flex flex-col items-center justify-center h-full">
              <span className="text-xs text-gray-500">Toplam</span>
              <span className="text-lg font-bold text-gray-900">
                {formatValue(total)}
              </span>
            </div>
          </div>
        </div>
      </div>

      {showLegend && (
        <div className="space-y-2">
          {data.map((item, index) => {
            const percentage = total > 0 ? ((item.value / total) * 100).toFixed(1) : '0'
            return (
              <div key={index} className="flex items-center space-x-2">
                <div
                  className="w-3 h-3 rounded-full"
                  style={{ backgroundColor: item.color }}
                />
                <div className="text-sm">
                  <span className="text-gray-700">{item.label}</span>
                  <span className="text-gray-500 ml-1">({percentage}%)</span>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

// Line Chart Component (Simple)
interface LineChartData {
  label: string
  value: number
}

interface LineChartProps {
  data: LineChartData[]
  height?: number
  color?: string
  showGrid?: boolean
  formatValue?: (value: number) => string
}

export function LineChart({
  data,
  height = 200,
  color = '#3B82F6',
  showGrid = true,
  formatValue = (v) => v.toLocaleString('tr-TR')
}: LineChartProps) {
  if (data.length === 0) return null

  const maxValue = Math.max(...data.map(d => d.value))
  const minValue = Math.min(...data.map(d => d.value))
  const range = maxValue - minValue || 1

  const points = data.map((item, index) => {
    const x = (index / (data.length - 1)) * 100
    const y = 100 - ((item.value - minValue) / range) * 100
    return `${x},${y}`
  }).join(' ')

  return (
    <div className="w-full">
      <div className="relative" style={{ height }}>
        <svg width="100%" height="100%" className="overflow-visible">
          {showGrid && (
            <>
              {[0, 25, 50, 75, 100].map(y => (
                <line
                  key={y}
                  x1="0%"
                  y1={`${y}%`}
                  x2="100%"
                  y2={`${y}%`}
                  stroke="#E5E7EB"
                  strokeDasharray="2,2"
                />
              ))}
            </>
          )}

          <polyline
            fill="none"
            stroke={color}
            strokeWidth="2"
            points={points}
            className="transition-all duration-300"
          />

          {data.map((item, index) => {
            const x = (index / (data.length - 1)) * 100
            const y = 100 - ((item.value - minValue) / range) * 100

            return (
              <g key={index}>
                <circle
                  cx={`${x}%`}
                  cy={`${y}%`}
                  r="4"
                  fill={color}
                  className="hover:r-6 transition-all duration-300"
                />
                <title>{`${item.label}: ${formatValue(item.value)}`}</title>
              </g>
            )
          })}
        </svg>
      </div>

      <div className="flex justify-between mt-2">
        {data.map((item, index) => (
          <span key={index} className="text-xs text-gray-600 truncate">
            {item.label}
          </span>
        ))}
      </div>
    </div>
  )
}

// Stat Card Component
interface StatCardProps {
  title: string
  value: string | number
  subtitle?: string
  icon?: React.ReactNode
  trend?: {
    value: number
    isPositive: boolean
  }
  color?: 'blue' | 'green' | 'red' | 'yellow' | 'purple' | 'gray'
}

export function StatCard({
  title,
  value,
  subtitle,
  icon,
  trend,
  color = 'blue'
}: StatCardProps) {
  const getColorClasses = () => {
    const colors = {
      blue: 'bg-blue-100 text-blue-600',
      green: 'bg-green-100 text-green-600',
      red: 'bg-red-100 text-red-600',
      yellow: 'bg-yellow-100 text-yellow-600',
      purple: 'bg-purple-100 text-purple-600',
      gray: 'bg-gray-100 text-gray-600'
    }
    return colors[color]
  }

  return (
    <div className="bg-white rounded-lg shadow-sm border p-6">
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <p className="text-sm font-medium text-gray-600">{title}</p>
          <p className="mt-2 text-3xl font-bold text-gray-900">{value}</p>

          {subtitle && (
            <p className="mt-1 text-sm text-gray-500">{subtitle}</p>
          )}

          {trend && (
            <div className="mt-2 flex items-center">
              {trend.isPositive ? (
                <TrendingUp className="h-4 w-4 text-green-500" />
              ) : trend.value === 0 ? (
                <Minus className="h-4 w-4 text-gray-500" />
              ) : (
                <TrendingDown className="h-4 w-4 text-red-500" />
              )}
              <span className={`ml-1 text-sm font-medium ${
                trend.isPositive ? 'text-green-600' : trend.value === 0 ? 'text-gray-600' : 'text-red-600'
              }`}>
                {trend.isPositive && '+'}%{Math.abs(trend.value).toFixed(1)}
              </span>
              <span className="ml-1 text-sm text-gray-500">önceki aya göre</span>
            </div>
          )}
        </div>

        {icon && (
          <div className={`p-3 rounded-lg ${getColorClasses()}`}>
            {icon}
          </div>
        )}
      </div>
    </div>
  )
}

// Progress Bar Component
interface ProgressBarProps {
  value: number
  max: number
  label?: string
  showPercentage?: boolean
  color?: string
  height?: number
}

export function ProgressBar({
  value,
  max,
  label,
  showPercentage = true,
  color = '#3B82F6',
  height = 8
}: ProgressBarProps) {
  const percentage = max > 0 ? Math.min((value / max) * 100, 100) : 0

  return (
    <div className="w-full">
      {label && (
        <div className="flex justify-between items-center mb-2">
          <span className="text-sm font-medium text-gray-700">{label}</span>
          {showPercentage && (
            <span className="text-sm text-gray-500">{percentage.toFixed(0)}%</span>
          )}
        </div>
      )}
      <div className="w-full bg-gray-200 rounded-full overflow-hidden" style={{ height }}>
        <div
          className="h-full rounded-full transition-all duration-300"
          style={{
            width: `${percentage}%`,
            backgroundColor: color
          }}
        />
      </div>
    </div>
  )
}

// Activity Timeline Component
interface TimelineItem {
  id: string
  title: string
  description?: string
  date: string
  icon?: React.ReactNode
  color?: string
}

interface ActivityTimelineProps {
  items: TimelineItem[]
}

export function ActivityTimeline({ items }: ActivityTimelineProps) {
  return (
    <div className="flow-root">
      <ul className="-mb-8">
        {items.map((item, idx) => (
          <li key={item.id}>
            <div className="relative pb-8">
              {idx !== items.length - 1 && (
                <span
                  className="absolute top-4 left-4 -ml-px h-full w-0.5 bg-gray-200"
                  aria-hidden="true"
                />
              )}
              <div className="relative flex space-x-3">
                <div>
                  <span
                    className="h-8 w-8 rounded-full flex items-center justify-center ring-8 ring-white"
                    style={{ backgroundColor: item.color || '#3B82F6' }}
                  >
                    {item.icon || (
                      <div className="h-2 w-2 bg-white rounded-full" />
                    )}
                  </span>
                </div>
                <div className="flex min-w-0 flex-1 justify-between space-x-4 pt-1.5">
                  <div>
                    <p className="text-sm text-gray-900">{item.title}</p>
                    {item.description && (
                      <p className="text-sm text-gray-500">{item.description}</p>
                    )}
                  </div>
                  <div className="whitespace-nowrap text-right text-sm text-gray-500">
                    {item.date}
                  </div>
                </div>
              </div>
            </div>
          </li>
        ))}
      </ul>
    </div>
  )
}
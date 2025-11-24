'use client'

import { Line } from 'react-chartjs-2'
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Filler,
  ChartOptions,
} from 'chart.js'

// Register ChartJS components
ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Filler)

interface MiniChartProps {
  data: number[]
  color?: string
  gradient?: boolean
  height?: number
}

export function MiniChart({
  data,
  color = '#14B8A6',
  gradient = true,
  height = 60
}: MiniChartProps) {
  const chartData = {
    labels: data.map((_, i) => i.toString()),
    datasets: [
      {
        data,
        borderColor: color,
        backgroundColor: gradient
          ? (context: any) => {
              const ctx = context.chart.ctx
              const gradient = ctx.createLinearGradient(0, 0, 0, height)
              gradient.addColorStop(0, `${color}40`) // 25% opacity
              gradient.addColorStop(1, `${color}00`) // 0% opacity
              return gradient
            }
          : 'transparent',
        borderWidth: 2,
        fill: gradient,
        tension: 0.4,
        pointRadius: 0,
        pointHoverRadius: 0,
      },
    ],
  }

  const options: ChartOptions<'line'> = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        display: false,
      },
      tooltip: {
        enabled: false,
      },
    },
    scales: {
      x: {
        display: false,
      },
      y: {
        display: false,
      },
    },
    interaction: {
      intersect: false,
      mode: 'index',
    },
  }

  return (
    <div style={{ height: `${height}px`, width: '100%' }}>
      <Line data={chartData} options={options} />
    </div>
  )
}

// Example mini bar chart for variety
interface MiniBarChartProps {
  data: number[]
  color?: string
  height?: number
}

export function MiniBarChart({
  data,
  color = '#14B8A6',
  height = 40
}: MiniBarChartProps) {
  const maxValue = Math.max(...data)
  const minValue = Math.min(...data)
  const range = maxValue - minValue || 1

  return (
    <div className="flex items-end gap-1" style={{ height: `${height}px` }}>
      {data.map((value, index) => {
        const percentage = ((value - minValue) / range) * 100
        return (
          <div
            key={index}
            className="flex-1 rounded-t transition-all"
            style={{
              height: `${Math.max(percentage, 5)}%`,
              backgroundColor: color,
              opacity: 0.6 + (percentage / 100) * 0.4,
            }}
          />
        )
      })}
    </div>
  )
}

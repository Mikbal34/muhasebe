'use client'

import { useEffect, useState } from 'react'

interface LoadingSplashProps {
  show: boolean
  message?: string
  onComplete?: () => void
  duration?: number // Animation duration in ms
}

// YTÜ Yıldız Logosu - Orijinal 12 Köşeli Yıldız
function StarLogo({ className = '' }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 54.51 56.43"
      fill="currentColor"
      className={className}
    >
      <path d="M24.27 40.72 27.35 38.41 30.33 40.7 27.27 51 24.26 40.73 24.26 40.73ZM17.21 36.72 21.41 36.65 22.43 40.16 13.62 46.78 17.21 36.72 17.21 36.72ZM32.31 40.18 33.46 36.54 37.07 36.63 40.28 46.2 32.32 40.17 32.32 40.17ZM13.74 29.13 17.22 31.54 15.97 35.16 4.92 35.43 13.73 29.13 13.73 29.13ZM38.07 34.83 36.73 31.11 40.35 28.76 49.46 35.45 38.07 34.83 38.07 34.83ZM5.42 21.34 15.79 21.34C15.79 21.34 17.02 24.96 17.02 24.96L13.87 27.2 5.42 21.34 5.42 21.34ZM37.52 24.81 38.68 21.35 49.37 21.21 40.45 26.95 37.52 24.82 37.52 24.82ZM30.77 16.99 32.11 21.34 32.14 21.43 37.17 21.37 35.79 25.43 39.07 27.84 35.07 30.41 34.99 30.46 36.43 34.74 32.27 34.51 32.17 34.51C32.17 34.51 30.82 39.05 30.82 39.05L27.45 36.5 27.38 36.44 23.81 39.12 22.6 34.99 17.79 35.11 19.28 30.94 15.18 28.1 18.78 25.53 17.38 21.34 22.31 21.34C22.31 21.34 23.62 17.04 23.62 17.04L27.19 19.64 30.77 16.98 30.77 16.98ZM16.87 19.84 13.48 9.67 22.29 16.09 21.13 19.9 16.87 19.85 16.87 19.85ZM32.11 15.98 41.3 9.16 37.7 19.77 33.29 19.81 32.11 15.98 32.11 15.98ZM24.09 15.49 27.18 5.34 30.28 15.41 27.12 17.71 24.09 15.49 24.09 15.49ZM27.19 0 22.77 14.52 10.38 5.45 15.27 19.82 0 19.63 12.43 28.23 0.09 37 15.43 36.75 10.5 51.06 22.91 41.75 27.2 56.43 31.81 41.82 43.96 51.14 38.75 36.68 54.4 37.07 41.76 27.88 54.51 19.62 39.24 19.77 44.05 5.45 31.66 14.44 27.19 0 27.19 0Z" />
    </svg>
  )
}

export function LoadingSplash({
  show,
  message,
  onComplete,
  duration = 2000
}: LoadingSplashProps) {
  const [isVisible, setIsVisible] = useState(false)
  const [isAnimating, setIsAnimating] = useState(false)

  useEffect(() => {
    if (show) {
      setIsVisible(true)
      // Start animation after a small delay for smooth entrance
      setTimeout(() => setIsAnimating(true), 100)

      // Call onComplete after animation duration
      if (onComplete) {
        const timer = setTimeout(() => {
          onComplete()
        }, duration)
        return () => clearTimeout(timer)
      }
    } else {
      setIsAnimating(false)
      // Delay hiding for fade out
      const timer = setTimeout(() => setIsVisible(false), 300)
      return () => clearTimeout(timer)
    }
  }, [show, onComplete, duration])

  if (!isVisible) return null

  return (
    <div
      className={`
        fixed inset-0 z-[100] flex flex-col items-center justify-center
        bg-[radial-gradient(circle_at_center,_#ffffff_0%,_#f7f3e9_100%)]
        transition-opacity duration-300
        ${show ? 'opacity-100' : 'opacity-0'}
      `}
    >
      {/* Logo Container */}
      <div className="relative w-40 h-40 md:w-48 md:h-48">
        {/* Background Star (outline) */}
        <div className="absolute inset-0 text-navy/20">
          <StarLogo className="w-full h-full" />
        </div>

        {/* Filling Star (animated) */}
        <div
          className="absolute inset-0 text-gold overflow-hidden"
          style={{
            clipPath: isAnimating ? 'inset(0 0 0 0)' : 'inset(100% 0 0 0)',
            transition: `clip-path ${duration * 0.8}ms cubic-bezier(0.4, 0, 0.2, 1)`
          }}
        >
          <StarLogo className="w-full h-full" />
        </div>

        {/* Glow effect when filled */}
        <div
          className={`
            absolute inset-0 text-gold/30 blur-xl
            transition-opacity duration-500
            ${isAnimating ? 'opacity-100' : 'opacity-0'}
          `}
          style={{
            transitionDelay: `${duration * 0.6}ms`
          }}
        >
          <StarLogo className="w-full h-full" />
        </div>
      </div>
    </div>
  )
}

export default LoadingSplash

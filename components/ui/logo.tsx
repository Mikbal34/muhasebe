'use client'

import Image from 'next/image'

interface LogoProps {
  variant?: 'full' | 'icon'
  theme?: 'dark' | 'light' // dark = dark logo for light bg, light = light logo for dark bg
  className?: string
  width?: number
  height?: number
}

export function Logo({
  variant = 'full',
  theme = 'dark',
  className = '',
  width,
  height,
}: LogoProps) {
  // Light theme uses white text (for dark backgrounds like sidebar)
  if (theme === 'light') {
    return (
      <Image
        src="/logo/logo-icon-light.svg"
        alt="YTÜ Yıldız TTO"
        width={width || 200}
        height={height || 60}
        className={className}
        priority
      />
    )
  }

  if (variant === 'icon') {
    return (
      <Image
        src="/logo/logo-icon.svg"
        alt="YTÜ Yıldız TTO"
        width={width || 40}
        height={height || 40}
        className={className}
        priority
      />
    )
  }

  return (
    <Image
      src="/logo/logo-full.png"
      alt="YTÜ Yıldız Teknoloji Transfer Ofisi"
      width={width || 200}
      height={height || 60}
      className={className}
      priority
    />
  )
}

export function LogoWithText({
  className = '',
}: {
  className?: string
}) {
  return (
    <div className={`flex items-center gap-3 ${className}`}>
      <Logo variant="icon" width={36} height={36} />
      <div className="flex flex-col">
        <span className="font-heading text-sm font-semibold text-white leading-tight">
          YTÜ Yıldız TTO
        </span>
        <span className="text-[10px] text-gold-300 leading-tight">
          Teknoloji Transfer Ofisi
        </span>
      </div>
    </div>
  )
}

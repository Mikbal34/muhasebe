import { User, Briefcase } from 'lucide-react'

export type PersonType = 'user' | 'personnel'

interface PersonBadgeProps {
  type: PersonType
  size?: 'sm' | 'md' | 'lg'
  showIcon?: boolean
}

export default function PersonBadge({ type, size = 'md', showIcon = true }: PersonBadgeProps) {
  const isUser = type === 'user'

  const sizeClasses = {
    sm: 'px-1.5 py-0.5 text-xs',
    md: 'px-2 py-0.5 text-xs',
    lg: 'px-2.5 py-1 text-sm',
  }

  const iconSizes = {
    sm: 'h-3 w-3',
    md: 'h-3 w-3',
    lg: 'h-4 w-4',
  }

  const colorClasses = isUser
    ? 'bg-blue-100 text-blue-800'
    : 'bg-green-100 text-green-800'

  const Icon = isUser ? User : Briefcase
  const label = isUser ? 'Kullanıcı' : 'Personel'

  return (
    <span
      className={`inline-flex items-center gap-1 rounded font-medium ${colorClasses} ${sizeClasses[size]}`}
    >
      {showIcon && <Icon className={iconSizes[size]} />}
      {label}
    </span>
  )
}

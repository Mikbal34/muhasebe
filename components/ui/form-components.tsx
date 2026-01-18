import React from 'react'
import { AlertTriangle, CheckCircle, Info, X } from 'lucide-react'

// Base Input Component
interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string
  error?: string
  helpText?: string
  required?: boolean
}

export function Input({
  label,
  error,
  helpText,
  required,
  className = '',
  ...props
}: InputProps) {
  const inputClasses = `
    w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 transition-colors
    ${error
      ? 'border-red-300 focus:ring-red-500 focus:border-red-500'
      : 'border-gray-300 focus:ring-navy/30 focus:border-navy'
    }
    ${className}
  `

  return (
    <div className="space-y-1">
      {label && (
        <label className="block text-sm font-medium text-gray-700">
          {label} {required && <span className="text-red-500">*</span>}
        </label>
      )}
      <input {...props} className={inputClasses} />
      {error && (
        <p className="text-sm text-red-600 flex items-center">
          <AlertTriangle className="h-3 w-3 mr-1" />
          {error}
        </p>
      )}
      {helpText && !error && (
        <p className="text-sm text-gray-500">{helpText}</p>
      )}
    </div>
  )
}

// Select Component
interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  label?: string
  error?: string
  helpText?: string
  required?: boolean
  options: Array<{ value: string; label: string; disabled?: boolean }>
  placeholder?: string
}

export function Select({
  label,
  error,
  helpText,
  required,
  options,
  placeholder,
  className = '',
  ...props
}: SelectProps) {
  const selectClasses = `
    w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 transition-colors
    ${error
      ? 'border-red-300 focus:ring-red-500 focus:border-red-500'
      : 'border-gray-300 focus:ring-navy/30 focus:border-navy'
    }
    ${className}
  `

  return (
    <div className="space-y-1">
      {label && (
        <label className="block text-sm font-medium text-gray-700">
          {label} {required && <span className="text-red-500">*</span>}
        </label>
      )}
      <select {...props} className={selectClasses}>
        {placeholder && <option value="">{placeholder}</option>}
        {options.map((option) => (
          <option
            key={option.value}
            value={option.value}
            disabled={option.disabled}
          >
            {option.label}
          </option>
        ))}
      </select>
      {error && (
        <p className="text-sm text-red-600 flex items-center">
          <AlertTriangle className="h-3 w-3 mr-1" />
          {error}
        </p>
      )}
      {helpText && !error && (
        <p className="text-sm text-gray-500">{helpText}</p>
      )}
    </div>
  )
}

// Textarea Component
interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string
  error?: string
  helpText?: string
  required?: boolean
}

export function Textarea({
  label,
  error,
  helpText,
  required,
  className = '',
  ...props
}: TextareaProps) {
  const textareaClasses = `
    w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 transition-colors resize-none
    ${error
      ? 'border-red-300 focus:ring-red-500 focus:border-red-500'
      : 'border-gray-300 focus:ring-navy/30 focus:border-navy'
    }
    ${className}
  `

  return (
    <div className="space-y-1">
      {label && (
        <label className="block text-sm font-medium text-gray-700">
          {label} {required && <span className="text-red-500">*</span>}
        </label>
      )}
      <textarea {...props} className={textareaClasses} />
      {error && (
        <p className="text-sm text-red-600 flex items-center">
          <AlertTriangle className="h-3 w-3 mr-1" />
          {error}
        </p>
      )}
      {helpText && !error && (
        <p className="text-sm text-gray-500">{helpText}</p>
      )}
    </div>
  )
}

// Checkbox Component
interface CheckboxProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label: string
  error?: string
  helpText?: string
}

export function Checkbox({
  label,
  error,
  helpText,
  className = '',
  ...props
}: CheckboxProps) {
  return (
    <div className="space-y-1">
      <div className="flex items-center">
        <input
          type="checkbox"
          {...props}
          className={`h-4 w-4 text-navy focus:ring-navy/30 border-gray-300 rounded ${className}`}
        />
        <label className="ml-2 block text-sm text-gray-700">
          {label}
        </label>
      </div>
      {error && (
        <p className="text-sm text-red-600 flex items-center">
          <AlertTriangle className="h-3 w-3 mr-1" />
          {error}
        </p>
      )}
      {helpText && !error && (
        <p className="text-sm text-gray-500">{helpText}</p>
      )}
    </div>
  )
}

// Alert Component
interface AlertProps {
  type: 'info' | 'success' | 'warning' | 'error'
  title?: string
  children: React.ReactNode
  onClose?: () => void
  className?: string
}

export function Alert({
  type,
  title,
  children,
  onClose,
  className = ''
}: AlertProps) {
  const getTypeClasses = () => {
    switch (type) {
      case 'info':
        return 'bg-blue-50 border-blue-200 text-blue-800'
      case 'success':
        return 'bg-green-50 border-green-200 text-green-800'
      case 'warning':
        return 'bg-yellow-50 border-yellow-200 text-yellow-800'
      case 'error':
        return 'bg-red-50 border-red-200 text-red-800'
      default:
        return 'bg-gray-50 border-gray-200 text-gray-800'
    }
  }

  const getIcon = () => {
    switch (type) {
      case 'info':
        return <Info className="h-5 w-5" />
      case 'success':
        return <CheckCircle className="h-5 w-5" />
      case 'warning':
        return <AlertTriangle className="h-5 w-5" />
      case 'error':
        return <AlertTriangle className="h-5 w-5" />
    }
  }

  return (
    <div className={`border rounded-md p-4 ${getTypeClasses()} ${className}`}>
      <div className="flex">
        <div className="flex-shrink-0">
          {getIcon()}
        </div>
        <div className="ml-3 flex-1">
          {title && (
            <h3 className="text-sm font-medium">{title}</h3>
          )}
          <div className={`text-sm ${title ? 'mt-2' : ''}`}>
            {children}
          </div>
        </div>
        {onClose && (
          <div className="ml-auto pl-3">
            <button
              onClick={onClose}
              className="inline-flex rounded-md p-1.5 hover:bg-black/5 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-transparent focus:ring-current"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        )}
      </div>
    </div>
  )
}

// Button Component
interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger'
  size?: 'sm' | 'md' | 'lg'
  loading?: boolean
  icon?: React.ReactNode
}

export function Button({
  variant = 'primary',
  size = 'md',
  loading = false,
  icon,
  children,
  className = '',
  disabled,
  ...props
}: ButtonProps) {
  const getVariantClasses = () => {
    switch (variant) {
      case 'primary':
        return 'bg-navy text-white hover:bg-navy-600 focus:ring-navy/30'
      case 'secondary':
        return 'bg-gold text-white hover:bg-gold-600 focus:ring-gold/30'
      case 'outline':
        return 'border border-gray-300 text-gray-700 bg-white hover:bg-gray-50 focus:ring-navy/30'
      case 'ghost':
        return 'text-gray-700 hover:bg-gray-100 focus:ring-gray-500'
      case 'danger':
        return 'bg-red-600 text-white hover:bg-red-700 focus:ring-red-500'
      default:
        return 'bg-navy text-white hover:bg-navy-600 focus:ring-navy/30'
    }
  }

  const getSizeClasses = () => {
    switch (size) {
      case 'sm':
        return 'px-3 py-1.5 text-sm'
      case 'md':
        return 'px-4 py-2 text-sm'
      case 'lg':
        return 'px-6 py-3 text-base'
      default:
        return 'px-4 py-2 text-sm'
    }
  }

  const buttonClasses = `
    inline-flex items-center justify-center font-medium rounded-md
    focus:outline-none focus:ring-2 focus:ring-offset-2
    transition-colors duration-200
    disabled:opacity-50 disabled:cursor-not-allowed
    ${getVariantClasses()}
    ${getSizeClasses()}
    ${className}
  `

  return (
    <button
      {...props}
      disabled={disabled || loading}
      className={buttonClasses}
    >
      {loading && (
        <div className="animate-spin rounded-full h-4 w-4 border-2 border-current border-t-transparent mr-2" />
      )}
      {!loading && icon && (
        <span className="mr-2">{icon}</span>
      )}
      {children}
    </button>
  )
}

// Loading Spinner Component
interface LoadingSpinnerProps {
  size?: 'sm' | 'md' | 'lg'
  className?: string
}

export function LoadingSpinner({ size = 'md', className = '' }: LoadingSpinnerProps) {
  const getSizeClasses = () => {
    switch (size) {
      case 'sm':
        return 'h-4 w-4'
      case 'md':
        return 'h-6 w-6'
      case 'lg':
        return 'h-8 w-8'
      default:
        return 'h-6 w-6'
    }
  }

  return (
    <div className={`animate-spin rounded-full border-2 border-navy border-t-transparent ${getSizeClasses()} ${className}`} />
  )
}

// Empty State Component
interface EmptyStateProps {
  icon?: React.ReactNode
  title: string
  description?: string
  action?: React.ReactNode
  className?: string
}

export function EmptyState({
  icon,
  title,
  description,
  action,
  className = ''
}: EmptyStateProps) {
  return (
    <div className={`text-center py-12 ${className}`}>
      {icon && (
        <div className="flex justify-center mb-4">
          <div className="text-gray-400">
            {icon}
          </div>
        </div>
      )}
      <h3 className="text-lg font-medium text-gray-900 mb-2">
        {title}
      </h3>
      {description && (
        <p className="text-gray-600 mb-4">
          {description}
        </p>
      )}
      {action && action}
    </div>
  )
}

// Card Component
interface CardProps {
  title?: string
  description?: string
  children: React.ReactNode
  actions?: React.ReactNode
  className?: string
}

export function Card({
  title,
  description,
  children,
  actions,
  className = ''
}: CardProps) {
  return (
    <div className={`bg-white rounded-lg shadow-sm border ${className}`}>
      {(title || description || actions) && (
        <div className="px-6 py-4 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              {title && (
                <h3 className="text-lg font-semibold text-gray-900">
                  {title}
                </h3>
              )}
              {description && (
                <p className="text-sm text-gray-600 mt-1">
                  {description}
                </p>
              )}
            </div>
            {actions && (
              <div className="flex items-center space-x-2">
                {actions}
              </div>
            )}
          </div>
        </div>
      )}
      <div className="p-6">
        {children}
      </div>
    </div>
  )
}
import React, { useState, useEffect, forwardRef } from 'react'
import { formatCurrencyInput } from '@/lib/utils/format'

interface MoneyInputProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'onChange' | 'value'> {
    value: string | number
    onChange: (value: string) => void
}

export const MoneyInput = forwardRef<HTMLInputElement, MoneyInputProps>(
    ({ value, onChange, className, ...props }, ref) => {
        const [displayValue, setDisplayValue] = useState('')

        useEffect(() => {
            // Update display value when external value changes
            setDisplayValue(formatCurrencyInput(value))
        }, [value])

        const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
            // Get raw input
            let inputValue = e.target.value

            // Allow only numbers, dots, and commas
            const cleanValue = inputValue.replace(/[^0-9,.]/g, '')

            // Remove all dots (thousands separators)
            const noDots = cleanValue.replace(/\./g, '')

            // Replace comma with dot for standard number format
            const standardFormat = noDots.replace(',', '.')

            // Check if it's a valid number or empty
            if (standardFormat === '' || !isNaN(Number(standardFormat))) {
                // Call parent with the standard number format (e.g., "1234.56")
                // The parent expects a string that can be parsed to a float
                onChange(standardFormat)
            }
        }

        return (
            <input
                {...props}
                ref={ref}
                type="text"
                value={displayValue}
                onChange={handleChange}
                className={className}
            />
        )
    }
)

MoneyInput.displayName = 'MoneyInput'

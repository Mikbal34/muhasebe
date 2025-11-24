import React, { useState, useEffect, forwardRef } from 'react'

interface MoneyInputProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'onChange' | 'value'> {
    value: string | number
    onChange: (value: string) => void
}

export const MoneyInput = forwardRef<HTMLInputElement, MoneyInputProps>(
    ({ value, onChange, className, ...props }, ref) => {
        const [displayValue, setDisplayValue] = useState('')

        // Format number to Turkish currency string (e.g., 1234.56 -> 1.234,56)
        const formatCurrency = (val: string | number) => {
            if (!val && val !== 0) return ''

            // Convert to string and handle decimals
            let parts = val.toString().split('.')

            // Add thousands separator to integer part
            parts[0] = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, '.')

            // Join with comma for decimal
            return parts.join(',')
        }

        useEffect(() => {
            // Update display value when external value changes
            // We only do this if the parsed display value doesn't match the new value
            // to avoid cursor jumping issues during typing if possible, though difficult with this approach
            // For simplicity in this controlled component, we'll trust the parent's value
            setDisplayValue(formatCurrency(value))
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

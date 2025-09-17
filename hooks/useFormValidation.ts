import { useState, useCallback, useMemo } from 'react'
import { ValidationResult, FormField, validateForm, validateField } from '@/utils/validation'

export interface UseFormValidationOptions<T> {
  initialValues: T
  validationRules?: Record<keyof T, FormField['rules']>
  onSubmit?: (values: T) => Promise<void> | void
}

export function useFormValidation<T extends Record<string, any>>({
  initialValues,
  validationRules = {} as Record<keyof T, FormField['rules']>,
  onSubmit
}: UseFormValidationOptions<T>) {
  const [values, setValues] = useState<T>(initialValues)
  const [errors, setErrors] = useState<Record<keyof T, string>>({} as Record<keyof T, string>)
  const [touched, setTouched] = useState<Record<keyof T, boolean>>({} as Record<keyof T, boolean>)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState<string>('')

  // Create form fields with validation rules
  const formFields = useMemo(() => {
    const fields: Record<keyof T, FormField> = {} as Record<keyof T, FormField>

    for (const key in values) {
      fields[key] = {
        value: values[key],
        rules: validationRules[key] || []
      }
    }

    return fields
  }, [values, validationRules])

  // Validate the entire form
  const validateAll = useCallback((): ValidationResult => {
    const result = validateForm(formFields)
    setErrors(result.errors as Record<keyof T, string>)
    return result
  }, [formFields])

  // Validate a single field
  const validateSingle = useCallback((fieldName: keyof T) => {
    const field = formFields[fieldName]
    if (!field) return true

    const result = validateField(field)
    setErrors(prev => ({
      ...prev,
      [fieldName]: result.error || ''
    }))

    return result.isValid
  }, [formFields])

  // Update a field value
  const setValue = useCallback((fieldName: keyof T, value: any) => {
    setValues(prev => ({ ...prev, [fieldName]: value }))

    // Clear error when user starts typing
    if (errors[fieldName]) {
      setErrors(prev => ({ ...prev, [fieldName]: '' }))
    }

    // Clear submit error
    if (submitError) {
      setSubmitError('')
    }
  }, [errors, submitError])

  // Update multiple values
  const setMultipleValues = useCallback((newValues: Partial<T>) => {
    setValues(prev => ({ ...prev, ...newValues }))
  }, [])

  // Mark field as touched
  const setFieldTouched = useCallback((fieldName: keyof T, isTouched = true) => {
    setTouched(prev => ({ ...prev, [fieldName]: isTouched }))
  }, [])

  // Handle field blur
  const handleBlur = useCallback((fieldName: keyof T) => {
    setTouched(prev => ({ ...prev, [fieldName]: true }))
    validateSingle(fieldName)
  }, [validateSingle])

  // Handle form submission
  const handleSubmit = useCallback(async (e?: React.FormEvent) => {
    if (e) {
      e.preventDefault()
    }

    const validation = validateAll()
    if (!validation.isValid) {
      // Mark all fields as touched to show errors
      const allTouched = Object.keys(values).reduce((acc, key) => {
        acc[key as keyof T] = true
        return acc
      }, {} as Record<keyof T, boolean>)
      setTouched(allTouched)
      return false
    }

    if (onSubmit) {
      setIsSubmitting(true)
      setSubmitError('')

      try {
        await onSubmit(values)
        return true
      } catch (error: any) {
        console.error('Form submission error:', error)
        setSubmitError(
          error?.message ||
          error?.error ||
          'Bir hata oluştu. Lütfen tekrar deneyin.'
        )
        return false
      } finally {
        setIsSubmitting(false)
      }
    }

    return true
  }, [validateAll, values, onSubmit])

  // Reset form to initial state
  const reset = useCallback(() => {
    setValues(initialValues)
    setErrors({} as Record<keyof T, string>)
    setTouched({} as Record<keyof T, boolean>)
    setIsSubmitting(false)
    setSubmitError('')
  }, [initialValues])

  // Check if form is valid
  const isValid = useMemo(() => {
    return Object.keys(errors).every(key => !errors[key as keyof T])
  }, [errors])

  // Check if form has been modified
  const isDirty = useMemo(() => {
    return JSON.stringify(values) !== JSON.stringify(initialValues)
  }, [values, initialValues])

  // Get field props for easy integration
  const getFieldProps = useCallback((fieldName: keyof T) => ({
    value: values[fieldName],
    onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
      const value = e.target.type === 'number' ? parseFloat(e.target.value) || 0 : e.target.value
      setValue(fieldName, value)
    },
    onBlur: () => handleBlur(fieldName),
    error: touched[fieldName] ? errors[fieldName] : ''
  }), [values, errors, touched, setValue, handleBlur])

  // Get field error (only if touched)
  const getFieldError = useCallback((fieldName: keyof T): string => {
    return touched[fieldName] ? errors[fieldName] || '' : ''
  }, [errors, touched])

  // Check if field has error
  const hasFieldError = useCallback((fieldName: keyof T): boolean => {
    return touched[fieldName] && !!errors[fieldName]
  }, [errors, touched])

  return {
    // Form state
    values,
    errors,
    touched,
    isSubmitting,
    submitError,
    isValid,
    isDirty,

    // Form actions
    setValue,
    setValues: setMultipleValues,
    setTouched: setFieldTouched,
    handleBlur,
    handleSubmit,
    reset,
    validateAll,
    validateSingle,

    // Field helpers
    getFieldProps,
    getFieldError,
    hasFieldError,

    // Setters for manual control
    setErrors,
    setSubmitError
  }
}
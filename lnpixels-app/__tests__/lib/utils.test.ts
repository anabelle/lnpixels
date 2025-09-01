import { describe, it, expect } from 'vitest'
import { cn } from '@/lib/utils'

describe('cn', () => {
  it('should merge Tailwind classes correctly', () => {
    const result = cn('px-2 py-1', 'px-4')
    expect(result).toBe('py-1 px-4')
  })

  it('should handle conditional classes', () => {
    const result = cn('px-2', true && 'py-1', false && 'px-4')
    expect(result).toBe('px-2 py-1')
  })

  it('should handle arrays of classes', () => {
    const result = cn(['px-2', 'py-1'], 'px-4')
    expect(result).toBe('py-1 px-4')
  })

  it('should handle undefined and null values', () => {
    const result = cn('px-2', undefined, null, 'py-1')
    expect(result).toBe('px-2 py-1')
  })

  it('should handle empty strings', () => {
    const result = cn('px-2', '', 'py-1')
    expect(result).toBe('px-2 py-1')
  })

  it('should handle complex class combinations', () => {
    const result = cn(
      'flex items-center',
      'justify-between',
      'flex-col',
      'md:flex-row'
    )
    expect(result).toBe('flex items-center justify-between flex-col md:flex-row')
  })

  it('should handle conflicting classes with proper precedence', () => {
    const result = cn('text-sm text-red-500', 'text-lg text-blue-500')
    expect(result).toBe('text-lg text-blue-500')
  })

  it('should return empty string for no classes', () => {
    const result = cn()
    expect(result).toBe('')
  })

  it('should handle single class', () => {
    const result = cn('px-4')
    expect(result).toBe('px-4')
  })

  it('should handle objects with conditional classes', () => {
    const result = cn({
      'px-2': true,
      'py-1': false,
      'text-red-500': true,
    })
    expect(result).toBe('px-2 text-red-500')
  })
})

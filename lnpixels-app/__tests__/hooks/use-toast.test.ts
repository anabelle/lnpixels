import { renderHook, act } from '@testing-library/react'
import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest'
import { useToast, toast } from '@/hooks/use-toast'

// Mock timers
beforeEach(() => {
  vi.useFakeTimers()
})

afterEach(() => {
  vi.restoreAllMocks()
  vi.useRealTimers()
})

describe('useToast', () => {
  it('should initialize with empty toasts', () => {
    const { result } = renderHook(() => useToast())

    expect(result.current.toasts).toEqual([])
  })

  it('should add a toast when toast function is called', () => {
    const { result } = renderHook(() => useToast())

    act(() => {
      toast({
        title: 'Test Toast',
        description: 'This is a test',
      })
    })

    expect(result.current.toasts).toHaveLength(1)
    expect(result.current.toasts[0].title).toBe('Test Toast')
    expect(result.current.toasts[0].description).toBe('This is a test')
    expect(result.current.toasts[0].open).toBe(true)
  })

  it('should limit toasts to TOAST_LIMIT', () => {
    const { result } = renderHook(() => useToast())

    act(() => {
      toast({ title: 'Toast 1' })
      toast({ title: 'Toast 2' })
      toast({ title: 'Toast 3' })
    })

    expect(result.current.toasts).toHaveLength(1) // Only the latest toast
    expect(result.current.toasts[0].title).toBe('Toast 3')
  })

  it('should dismiss a specific toast', () => {
    const { result } = renderHook(() => useToast())

    let toastId: string
    act(() => {
      const t = toast({ title: 'Test Toast' })
      toastId = t.id
    })

    expect(result.current.toasts[0].open).toBe(true)

    act(() => {
      result.current.dismiss(toastId)
    })

    expect(result.current.toasts[0].open).toBe(false)
  })

  it('should dismiss all toasts when no id provided', () => {
    const { result } = renderHook(() => useToast())

    act(() => {
      toast({ title: 'Toast 1' })
      toast({ title: 'Toast 2' })
    })

    expect(result.current.toasts).toHaveLength(1)

    act(() => {
      result.current.dismiss()
    })

    expect(result.current.toasts[0].open).toBe(false)
  })

  it('should update a toast', () => {
    const { result } = renderHook(() => useToast())

    let toastInstance: any
    act(() => {
      toastInstance = toast({ title: 'Original Title' })
    })

    act(() => {
      toastInstance.update({
        id: toastInstance.id,
        title: 'Updated Title',
      })
    })

    expect(result.current.toasts[0].title).toBe('Updated Title')
  })

  it('should call onOpenChange when toast is dismissed', () => {
    const onOpenChange = vi.fn()
    const { result } = renderHook(() => useToast())

    act(() => {
      toast({
        title: 'Test Toast',
        onOpenChange,
      })
    })

    act(() => {
      result.current.dismiss(result.current.toasts[0].id)
    })

    expect(onOpenChange).toHaveBeenCalledWith(false)
  })
})

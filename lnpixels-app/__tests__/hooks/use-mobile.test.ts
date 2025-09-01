import { renderHook, act } from '@testing-library/react'
import { vi, beforeAll, beforeEach, describe, it, expect } from 'vitest'
import { useIsMobile } from '@/hooks/use-mobile'

// Mock window.matchMedia
const mockMatchMedia = vi.fn()
const mockAddEventListener = vi.fn()
const mockRemoveEventListener = vi.fn()

beforeAll(() => {
  Object.defineProperty(window, 'matchMedia', {
    writable: true,
    value: mockMatchMedia,
  })

  Object.defineProperty(window, 'innerWidth', {
    writable: true,
    value: 1024,
  })
})

beforeEach(() => {
  mockMatchMedia.mockReturnValue({
    addEventListener: mockAddEventListener,
    removeEventListener: mockRemoveEventListener,
  })
  mockAddEventListener.mockClear()
  mockRemoveEventListener.mockClear()
})

describe('useIsMobile', () => {
  it('should return false for desktop width', () => {
    window.innerWidth = 1024

    const { result } = renderHook(() => useIsMobile())

    expect(result.current).toBe(false)
  })

  it('should return true for mobile width', () => {
    window.innerWidth = 767

    const { result } = renderHook(() => useIsMobile())

    expect(result.current).toBe(true)
  })

  it('should update when window resizes', () => {
    window.innerWidth = 1024

    const { result } = renderHook(() => useIsMobile())

    expect(result.current).toBe(false)

    // Simulate window resize to mobile
    act(() => {
      window.innerWidth = 767
      const changeEvent = new Event('change')
      mockAddEventListener.mock.calls[0][1](changeEvent)
    })

    expect(result.current).toBe(true)
  })

  it('should add and remove event listeners', () => {
    window.innerWidth = 1024

    const { unmount } = renderHook(() => useIsMobile())

    expect(mockAddEventListener).toHaveBeenCalledWith('change', expect.any(Function))
    expect(mockRemoveEventListener).not.toHaveBeenCalled()

    unmount()

    expect(mockRemoveEventListener).toHaveBeenCalledWith('change', expect.any(Function))
  })
})

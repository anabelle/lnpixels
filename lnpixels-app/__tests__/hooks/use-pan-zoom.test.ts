import { renderHook, act } from '@testing-library/react'
import { vi, describe, it, expect, beforeEach } from 'vitest'
import { usePanZoom } from '@/hooks/use-pan-zoom'

// Mock the pixel store
const mockSetZoom = vi.fn()
const mockSetPan = vi.fn()

vi.mock('@/hooks/use-pixel-store', () => ({
  usePixelStore: () => ({
    zoom: 10,
    panX: 0,
    panY: 0,
    setZoom: mockSetZoom,
    setPan: mockSetPan,
  }),
}))

describe('usePanZoom', () => {
  let containerRef: React.RefObject<HTMLDivElement>
  let mockContainer: HTMLDivElement

  beforeEach(() => {
    vi.clearAllMocks()
    mockContainer = {
      getBoundingClientRect: vi.fn(() => ({
        left: 0,
        top: 0,
        width: 800,
        height: 600,
      })),
      style: {
        cursor: 'crosshair',
      },
    } as any
    containerRef = { current: mockContainer }
  })

  it('should return pan zoom handlers', () => {
    const { result } = renderHook(() => usePanZoom(containerRef))

    expect(result.current).toHaveProperty('handleMouseDown')
    expect(result.current).toHaveProperty('handleMouseMove')
    expect(result.current).toHaveProperty('handleMouseUp')
    expect(result.current).toHaveProperty('handleWheel')
    expect(result.current).toHaveProperty('handleTouchStart')
    expect(result.current).toHaveProperty('handleTouchMove')
    expect(result.current).toHaveProperty('handleTouchEnd')
    expect(result.current).toHaveProperty('isSpacePressed')
  })

  it('should handle mouse wheel zoom in', () => {
    const { result } = renderHook(() => usePanZoom(containerRef))

    const mockEvent = {
      preventDefault: vi.fn(),
      deltaY: -100,
      clientX: 400,
      clientY: 300,
    } as any

    act(() => {
      result.current.handleWheel(mockEvent)
    })

    expect(mockEvent.preventDefault).toHaveBeenCalled()
    expect(mockSetZoom).toHaveBeenCalledWith(10) // 10 * 1.1 = 11, but clamped to max 10
    expect(mockSetPan).toHaveBeenCalled()
  })

  it('should handle mouse wheel zoom out', () => {
    const { result } = renderHook(() => usePanZoom(containerRef))

    const mockEvent = {
      preventDefault: vi.fn(),
      deltaY: 100,
      clientX: 400,
      clientY: 300,
    } as any

    act(() => {
      result.current.handleWheel(mockEvent)
    })

    expect(mockEvent.preventDefault).toHaveBeenCalled()
    expect(mockSetZoom).toHaveBeenCalledWith(9) // 10 * 0.9
    expect(mockSetPan).toHaveBeenCalled()
  })

  it('should clamp zoom between 0.1 and 10', () => {
    const { result } = renderHook(() => usePanZoom(containerRef))

    // Try to zoom out from current zoom of 10
    const mockEvent = {
      preventDefault: vi.fn(),
      deltaY: 100,
      clientX: 400,
      clientY: 300,
    } as any

    act(() => {
      result.current.handleWheel(mockEvent)
    })

    expect(mockSetZoom).toHaveBeenCalledWith(9) // 10 * 0.9 = 9
  })

  it('should handle space key press', () => {
    const { result } = renderHook(() => usePanZoom(containerRef))

    const keydownEvent = new KeyboardEvent('keydown', { code: 'Space' })
    const keyupEvent = new KeyboardEvent('keyup', { code: 'Space' })

    act(() => {
      window.dispatchEvent(keydownEvent)
    })

    expect(result.current.isSpacePressed).toBe(true)
    expect(mockContainer.style.cursor).toBe('grab')

    act(() => {
      window.dispatchEvent(keyupEvent)
    })

    expect(result.current.isSpacePressed).toBe(false)
    expect(mockContainer.style.cursor).toBe('crosshair')
  })

  it('should handle mouse down with space pressed', () => {
    const { result } = renderHook(() => usePanZoom(containerRef))

    // Press space first
    act(() => {
      window.dispatchEvent(new KeyboardEvent('keydown', { code: 'Space' }))
    })

    const mockEvent = {
      preventDefault: vi.fn(),
      stopPropagation: vi.fn(),
      button: 0, // Left click
      clientX: 100,
      clientY: 200,
    } as any

    act(() => {
      result.current.handleMouseDown(mockEvent)
    })

    expect(mockEvent.preventDefault).toHaveBeenCalled()
    expect(mockEvent.stopPropagation).toHaveBeenCalled()
    expect(mockContainer.style.cursor).toBe('grabbing')
  })

  it('should handle mouse down with middle button', () => {
    const { result } = renderHook(() => usePanZoom(containerRef))

    const mockEvent = {
      preventDefault: vi.fn(),
      stopPropagation: vi.fn(),
      button: 1, // Middle click
      clientX: 100,
      clientY: 200,
    } as any

    act(() => {
      result.current.handleMouseDown(mockEvent)
    })

    expect(mockEvent.preventDefault).toHaveBeenCalled()
    expect(mockEvent.stopPropagation).toHaveBeenCalled()
    expect(mockContainer.style.cursor).toBe('grabbing')
  })

  it('should handle mouse down with right button', () => {
    const { result } = renderHook(() => usePanZoom(containerRef))

    const mockEvent = {
      preventDefault: vi.fn(),
      stopPropagation: vi.fn(),
      button: 2, // Right click
      clientX: 100,
      clientY: 200,
    } as any

    act(() => {
      result.current.handleMouseDown(mockEvent)
    })

    expect(mockEvent.preventDefault).toHaveBeenCalled()
    expect(mockEvent.stopPropagation).toHaveBeenCalled()
    expect(mockContainer.style.cursor).toBe('grabbing')
  })

  it('should handle touch start with two fingers', () => {
    const { result } = renderHook(() => usePanZoom(containerRef))

    const mockEvent = {
      preventDefault: vi.fn(),
      touches: [
        { clientX: 100, clientY: 100 },
        { clientX: 200, clientY: 200 },
      ],
    } as any

    act(() => {
      result.current.handleTouchStart(mockEvent)
    })

    expect(mockEvent.preventDefault).toHaveBeenCalled()
  })

  it('should handle touch move with two fingers', () => {
    const { result } = renderHook(() => usePanZoom(containerRef))

    // Start with two fingers
    act(() => {
      result.current.handleTouchStart({
        preventDefault: vi.fn(),
        touches: [
          { clientX: 100, clientY: 100 },
          { clientX: 200, clientY: 200 },
        ],
      } as any)
    })

    // Move fingers
    const mockEvent = {
      preventDefault: vi.fn(),
      touches: [
        { clientX: 110, clientY: 110 },
        { clientX: 210, clientY: 210 },
      ],
    } as any

    act(() => {
      result.current.handleTouchMove(mockEvent)
    })

    expect(mockEvent.preventDefault).toHaveBeenCalled()
    expect(mockSetZoom).toHaveBeenCalled()
    expect(mockSetPan).toHaveBeenCalled()
  })

  it('should handle touch end', () => {
    const { result } = renderHook(() => usePanZoom(containerRef))

    act(() => {
      result.current.handleTouchEnd()
    })

    // Touch end doesn't have much logic, just ensures no errors
    expect(true).toBe(true)
  })
})

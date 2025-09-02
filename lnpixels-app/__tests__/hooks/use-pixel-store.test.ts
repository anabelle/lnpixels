import { renderHook, act } from '@testing-library/react'
import { vi, describe, it, expect, beforeEach } from 'vitest'
import { usePixelStore } from '@/hooks/use-pixel-store'
import { apiClient } from '@/lib/api'

// Mock the API client
vi.mock('@/lib/api', () => ({
  apiClient: {
    getPixels: vi.fn(),
  },
}))

describe('usePixelStore', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    // default resolve to empty list to keep non-fetch tests simple
    ;(apiClient.getPixels as unknown as ReturnType<typeof vi.fn>).mockResolvedValue([])
  })

  it('should initialize with default state', () => {
    const { result } = renderHook(() => usePixelStore())

    expect(result.current.pixels).toEqual([])
    expect(result.current.selectedColor).toBe('#000000')
    expect(result.current.brushSize).toBe(1)
    expect(result.current.zoom).toBe(10)
    expect(result.current.panX).toBe(0)
    expect(result.current.panY).toBe(0)
    expect(result.current.toolMode).toBe('paint')
    expect(result.current.saveModal).toEqual({
      isOpen: false,
      totalPixels: 0,
      totalCost: 0,
    })
    expect(result.current.isLoading).toBe(false)
    expect(result.current.error).toBe(null)
  })

  it('should set selected color', () => {
    const { result } = renderHook(() => usePixelStore())

    act(() => {
      result.current.setSelectedColor('#ff0000')
    })

    expect(result.current.selectedColor).toBe('#ff0000')
  })

  it('should set brush size', () => {
    const { result } = renderHook(() => usePixelStore())

    act(() => {
      result.current.setBrushSize(5)
    })

    expect(result.current.brushSize).toBe(5)
  })

  it('should set zoom', () => {
    const { result } = renderHook(() => usePixelStore())

    act(() => {
      result.current.setZoom(20)
    })

    expect(result.current.zoom).toBe(20)
  })

  it('should set pan', () => {
    const { result } = renderHook(() => usePixelStore())

    act(() => {
      result.current.setPan(100, 200)
    })

    expect(result.current.panX).toBe(100)
    expect(result.current.panY).toBe(200)
  })

  it('should set tool mode', () => {
    const { result } = renderHook(() => usePixelStore())

    act(() => {
      result.current.setToolMode('text')
    })

    expect(result.current.toolMode).toBe('text')
  })

  it('should reset view', () => {
    const { result } = renderHook(() => usePixelStore())

    act(() => {
      result.current.setZoom(5)
      result.current.setPan(50, 100)
      result.current.resetView()
    })

    expect(result.current.zoom).toBe(10)
    expect(result.current.panX).toBe(0)
    expect(result.current.panY).toBe(0)
  })

  it('should add pixel', () => {
    const { result } = renderHook(() => usePixelStore())

    const pixel = { x: 1, y: 2, color: '#ff0000', letter: 'A' }

    act(() => {
      result.current.addPixel(pixel)
    })

    expect(result.current.pixels).toEqual([pixel])
  })

  it('should replace pixel at same position', () => {
    const { result } = renderHook(() => usePixelStore())

    const pixel1 = { x: 1, y: 2, color: '#ff0000', letter: 'A' }
    const pixel2 = { x: 1, y: 2, color: '#00ff00', letter: 'B' }

    act(() => {
      result.current.addPixel(pixel1)
      result.current.addPixel(pixel2)
    })

    expect(result.current.pixels).toEqual([pixel2])
  })

  it('should update pixels', () => {
    const { result } = renderHook(() => usePixelStore())

    const pixels = [
      { x: 1, y: 1, color: '#ff0000' },
      { x: 2, y: 2, color: '#00ff00' },
    ]

    act(() => {
      result.current.updatePixels(pixels)
    })

    expect(result.current.pixels).toEqual(pixels)
  })

  it('should clear canvas', () => {
    const { result } = renderHook(() => usePixelStore())

    act(() => {
      result.current.addPixel({ x: 1, y: 1, color: '#ff0000' })
      result.current.clearCanvas()
    })

    expect(result.current.pixels).toEqual([])
  })

  it('should restore permanent pixels when clearing canvas', () => {
    const { result } = renderHook(() => usePixelStore())

    // Add a permanent pixel (simulating one loaded from database)
    const permanentPixel = { x: 0, y: 0, color: '#000000', sats: 10, isNew: false }
    act(() => {
      result.current.addExistingPixel(permanentPixel)
    })

    // User paints over the permanent pixel
    act(() => {
      result.current.addPixel({ x: 0, y: 0, color: '#ff0000' })
    })

    // Verify the permanent pixel is overwritten
    expect(result.current.pixels).toHaveLength(1)
    expect(result.current.pixels[0].color).toBe('#ff0000')
    expect(result.current.pixels[0].isNew).toBe(true)
    expect(result.current.pixels[0].originalPixel).toEqual(permanentPixel)

    // Clear canvas - should restore the permanent pixel
    act(() => {
      result.current.clearCanvas()
    })

    expect(result.current.pixels).toHaveLength(1)
    expect(result.current.pixels[0]).toEqual(permanentPixel)
  })

  it('should handle multiple overwritten pixels correctly', () => {
    const { result } = renderHook(() => usePixelStore())

    // Add multiple permanent pixels
    const permanentPixel1 = { x: 0, y: 0, color: '#000000', sats: 10, isNew: false }
    const permanentPixel2 = { x: 1, y: 1, color: '#ffffff', sats: 5, isNew: false }

    act(() => {
      result.current.addExistingPixel(permanentPixel1)
      result.current.addExistingPixel(permanentPixel2)
    })

    // User paints over both
    act(() => {
      result.current.addPixel({ x: 0, y: 0, color: '#ff0000' })
      result.current.addPixel({ x: 1, y: 1, color: '#00ff00' })
    })

    // Clear canvas - should restore both permanent pixels
    act(() => {
      result.current.clearCanvas()
    })

    expect(result.current.pixels).toHaveLength(2)
    const pixelMap = new Map(result.current.pixels.map(p => [`${p.x}:${p.y}`, p]))
    expect(pixelMap.get('0:0')).toEqual(permanentPixel1)
    expect(pixelMap.get('1:1')).toEqual(permanentPixel2)
  })

  it('should open save modal with correct calculations', () => {
    const { result } = renderHook(() => usePixelStore())

    const pixels = [
      { x: 1, y: 1, color: '#000000' }, // 1 sat (black)
      { x: 2, y: 2, color: '#ff0000' }, // 10 sats (color)
      { x: 3, y: 3, color: '#00ff00', letter: 'A' }, // 100 sats (color + letter)
    ]

    act(() => {
      result.current.updatePixels(pixels)
      result.current.openSaveModal()
    })

    expect(result.current.saveModal.isOpen).toBe(true)
    expect(result.current.saveModal.totalPixels).toBe(3)
    expect(result.current.saveModal.totalCost).toBe(111) // 1 + 10 + 100
  })

  it('should close save modal', () => {
    const { result } = renderHook(() => usePixelStore())

    act(() => {
      result.current.openSaveModal()
      result.current.closeSaveModal()
    })

    expect(result.current.saveModal.isOpen).toBe(false)
    expect(result.current.saveModal.totalPixels).toBe(0)
    expect(result.current.saveModal.totalCost).toBe(0)
  })

  it('should fetch pixels successfully', async () => {
    const mockPixels = [
      { x: 1, y: 1, color: '#ff0000' },
      { x: 2, y: 2, color: '#00ff00' },
    ]

    const { result } = renderHook(() => usePixelStore())

    ;(apiClient.getPixels as unknown as ReturnType<typeof vi.fn>).mockResolvedValueOnce(
      mockPixels
    )

    await act(async () => {
      await result.current.fetchPixels(0, 0, 10, 10)
    })

    expect(result.current.pixels).toEqual(mockPixels)
    expect(result.current.isLoading).toBe(false)
    expect(result.current.error).toBe(null)
  })

  it('should handle fetch pixels error', async () => {
    const errorMessage = 'Failed to fetch'
    const { result } = renderHook(() => usePixelStore())

    ;(apiClient.getPixels as unknown as ReturnType<typeof vi.fn>).mockRejectedValueOnce(
      new Error(errorMessage)
    )

    await act(async () => {
      await result.current.fetchPixels(0, 0, 10, 10)
    })

    expect(result.current.pixels).toEqual([])
    expect(result.current.isLoading).toBe(false)
    expect(result.current.error).toBe(errorMessage)
  })

  it('should set loading state during fetch', async () => {
    const { result } = renderHook(() => usePixelStore())

    ;(apiClient.getPixels as unknown as ReturnType<typeof vi.fn>).mockImplementationOnce(
      () => new Promise((resolve) => setTimeout(() => resolve([]), 100))
    )

    act(() => {
      result.current.fetchPixels(0, 0, 10, 10)
    })

    expect(result.current.isLoading).toBe(true)

    await act(async () => {
      await new Promise(resolve => setTimeout(resolve, 150))
    })

    expect(result.current.isLoading).toBe(false)
  })
})

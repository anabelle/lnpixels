import { renderHook, act } from '@testing-library/react'
import { vi, describe, it, expect, beforeEach } from 'vitest'
import { useWebSocket } from '@/hooks/use-websocket'
import { usePixelStore } from '@/hooks/use-pixel-store'
import { io } from 'socket.io-client'

// Mock the socket.io-client module
const mockSocket = {
  on: vi.fn(),
  off: vi.fn(),
  emit: vi.fn(),
  disconnect: vi.fn(),
  connect: vi.fn(),
}

vi.mock('socket.io-client', () => ({
  io: vi.fn(() => mockSocket),
}))

// Mock the use-pixel-store hook - only mock the functions used by useWebSocket
const mockAddPixel = vi.fn()
const mockUpdatePixels = vi.fn()
const mockAddExistingPixel = vi.fn()

vi.mock('@/hooks/use-pixel-store', () => ({
  usePixelStore: vi.fn(() => ({
    addPixel: mockAddPixel,
    updatePixels: mockUpdatePixels,
  addExistingPixel: mockAddExistingPixel,
    // Include other properties that might be accessed
    pixels: [],
    selectedColor: '#000000',
    brushSize: 1,
    zoom: 10,
    panX: 0,
    panY: 0,
    toolMode: 'paint',
    saveModal: { isOpen: false, totalPixels: 0, totalCost: 0 },
    isLoading: false,
    error: null,
    setSelectedColor: vi.fn(),
    setBrushSize: vi.fn(),
    setZoom: vi.fn(),
    setPan: vi.fn(),
    setToolMode: vi.fn(),
    resetView: vi.fn(),
    clearCanvas: vi.fn(),
    openSaveModal: vi.fn(),
    closeSaveModal: vi.fn(),
    fetchPixels: vi.fn(),
  })),
}))

describe('useWebSocket', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should connect to websocket server', () => {
    renderHook(() => useWebSocket())

  expect(io).toHaveBeenCalledWith('http://localhost:3000/api', {
      transports: ['websocket', 'polling'],
    })
  })

  it('should set up event listeners', () => {
    renderHook(() => useWebSocket())

    expect(mockSocket.on).toHaveBeenCalledWith('connect', expect.any(Function))
    expect(mockSocket.on).toHaveBeenCalledWith('disconnect', expect.any(Function))
  expect(mockSocket.on).toHaveBeenCalledWith('pixel.update', expect.any(Function))
  expect(mockSocket.on).toHaveBeenCalledWith('activity.append', expect.any(Function))
  })

  it('should handle pixel.update event', () => {
    renderHook(() => useWebSocket())

    const pixelUpdateCall = mockSocket.on.mock.calls.find(
      (call: any[]) => call[0] === 'pixel.update'
    )
    expect(pixelUpdateCall).toBeDefined()
    const pixelUpdateHandler = pixelUpdateCall![1]

    const pixelData = {
      x: 10,
      y: 20,
      color: '#ff0000',
      letter: 'A',
      sats: 100,
    }

    act(() => {
      pixelUpdateHandler(pixelData)
    })

  expect(mockAddExistingPixel).toHaveBeenCalledWith({
      x: 10,
      y: 20,
      color: '#ff0000',
      letter: 'A',
      sats: 100,
    })
  })

  it('should disconnect socket on unmount', () => {
    const { unmount } = renderHook(() => useWebSocket())

    unmount()

    expect(mockSocket.disconnect).toHaveBeenCalled()
  })

  it('should handle connect event', () => {
    const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {})

    renderHook(() => useWebSocket())

    const connectCall = mockSocket.on.mock.calls.find(
      (call: any[]) => call[0] === 'connect'
    )
    expect(connectCall).toBeDefined()
    const connectHandler = connectCall![1]

    act(() => {
      connectHandler()
    })

    expect(consoleSpy).toHaveBeenCalledWith('Connected to WebSocket server')

    consoleSpy.mockRestore()
  })

  it('should handle disconnect event', () => {
    const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {})

    renderHook(() => useWebSocket())

    const disconnectCall = mockSocket.on.mock.calls.find(
      (call: any[]) => call[0] === 'disconnect'
    )
    expect(disconnectCall).toBeDefined()
    const disconnectHandler = disconnectCall![1]

    act(() => {
      disconnectHandler()
    })

    expect(consoleSpy).toHaveBeenCalledWith('Disconnected from WebSocket server')

    consoleSpy.mockRestore()
  })
})

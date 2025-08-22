import { describe, it, expect, beforeEach, vi } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useViewport } from '../src/hooks/useViewport';
import { useCanvasCoordinates } from '../src/hooks/useCanvasCoordinates';
import { useCanvasEvents } from '../src/hooks/useCanvasEvents';

// Mock HTMLCanvasElement
const mockCanvas = {
  getContext: vi.fn(() => ({
    clearRect: vi.fn(),
    fillRect: vi.fn(),
    strokeRect: vi.fn(),
    fillStyle: '',
    strokeStyle: '',
    lineWidth: 1,
    font: '',
    textAlign: '',
    textBaseline: '',
    fillText: vi.fn(),
    save: vi.fn(),
    restore: vi.fn(),
    scale: vi.fn(),
    translate: vi.fn(),
    beginPath: vi.fn(),
    moveTo: vi.fn(),
    lineTo: vi.fn(),
    stroke: vi.fn(),
  })),
  width: 800,
  height: 600,
  getBoundingClientRect: vi.fn(() => ({
    left: 0,
    top: 0,
    width: 800,
    height: 600,
  })),
};

Object.defineProperty(HTMLCanvasElement.prototype, 'getContext', {
  value: mockCanvas.getContext,
});

describe('useViewport', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should initialize with default viewport', () => {
    const { result } = renderHook(() => useViewport());

    expect(result.current.viewport).toEqual({
      x: 0,
      y: 0,
      zoom: 20, // PIXEL_SIZE default
    });
  });

  it('should initialize with custom zoom', () => {
    const { result } = renderHook(() => useViewport(10));

    expect(result.current.viewport.zoom).toBe(10);
  });

  it('should pan viewport', () => {
    const { result } = renderHook(() => useViewport());

    act(() => {
      result.current.pan(10, 20);
    });

    expect(result.current.viewport.x).toBe(-0.5); // 10 / 20 (zoom)
    expect(result.current.viewport.y).toBe(-1.0); // 20 / 20 (zoom)
  });

  it('should zoom in', () => {
    const { result } = renderHook(() => useViewport());

    act(() => {
      result.current.zoom(1.1);
    });

    expect(result.current.viewport.zoom).toBeGreaterThan(20);
  });

  it('should zoom out', () => {
    const { result } = renderHook(() => useViewport());

    act(() => {
      result.current.zoom(0.9);
    });

    expect(result.current.viewport.zoom).toBeLessThan(20);
  });

  it('should respect zoom limits', () => {
    const { result } = renderHook(() => useViewport());

    act(() => {
      result.current.setZoom(200); // Above MAX_ZOOM
    });

    expect(result.current.viewport.zoom).toBe(100); // MAX_ZOOM

    act(() => {
      result.current.setZoom(1); // Below MIN_ZOOM
    });

    expect(result.current.viewport.zoom).toBe(5); // MIN_ZOOM
  });

  it('should center on coordinates', () => {
    const { result } = renderHook(() => useViewport());

    act(() => {
      result.current.centerOn(100, 200);
    });

    expect(result.current.viewport.x).toBe(100);
    expect(result.current.viewport.y).toBe(200);
  });
});

describe('useCanvasCoordinates', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should convert screen to world coordinates', () => {
    const canvasRef = { current: mockCanvas as any };
    const viewport = { x: 0, y: 0, zoom: 20 };
    const dimensions = { width: 800, height: 600 };

    const { result } = renderHook(() =>
      useCanvasCoordinates(canvasRef, viewport, dimensions)
    );

    const worldCoords = result.current.screenToWorld(400, 300);
    expect(worldCoords).toEqual({ x: 0, y: 0 }); // Center of canvas
  });

  it('should convert world to screen coordinates', () => {
    const canvasRef = { current: mockCanvas as any };
    const viewport = { x: 0, y: 0, zoom: 20 };
    const dimensions = { width: 800, height: 600 };

    const { result } = renderHook(() =>
      useCanvasCoordinates(canvasRef, viewport, dimensions)
    );

    const screenCoords = result.current.worldToScreen(0, 0);
    expect(screenCoords).toEqual({ x: 400, y: 300 }); // Center of canvas
  });

  it('should handle null canvas ref', () => {
    const canvasRef = { current: null };
    const viewport = { x: 0, y: 0, zoom: 20 };
    const dimensions = { width: 800, height: 600 };

    const { result } = renderHook(() =>
      useCanvasCoordinates(canvasRef, viewport, dimensions)
    );

    const worldCoords = result.current.screenToWorld(400, 300);
    expect(worldCoords).toEqual({ x: 0, y: 0 });
  });
});

describe('useCanvasEvents', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should handle mouse down event', () => {
    const mockPan = vi.fn();
    const mockZoom = vi.fn();
    const mockScreenToWorld = vi.fn(() => ({ x: 0, y: 0 }));
    const mockOnPixelSelect = vi.fn();

    const { result } = renderHook(() =>
      useCanvasEvents({
        viewport: { x: 0, y: 0, zoom: 20 },
        pan: mockPan,
        zoom: mockZoom,
        screenToWorld: mockScreenToWorld,
        onPixelSelect: mockOnPixelSelect,
      })
    );

    const mockEvent = {
      clientX: 100,
      clientY: 100,
    } as React.MouseEvent<HTMLCanvasElement>;

    act(() => {
      result.current.handleMouseDown(mockEvent);
    });

    expect(result.current.isPanning).toBe(true);
  });

  it('should handle click event for pixel selection', () => {
    const mockPan = vi.fn();
    const mockZoom = vi.fn();
    const mockScreenToWorld = vi.fn(() => ({ x: 10, y: 20 }));
    const mockOnPixelSelect = vi.fn();

    const { result } = renderHook(() =>
      useCanvasEvents({
        viewport: { x: 0, y: 0, zoom: 20 },
        pan: mockPan,
        zoom: mockZoom,
        screenToWorld: mockScreenToWorld,
        onPixelSelect: mockOnPixelSelect,
      })
    );

    const mockEvent = {
      clientX: 400,
      clientY: 300,
    } as React.MouseEvent<HTMLCanvasElement>;

    act(() => {
      result.current.handleClick(mockEvent);
    });

    expect(mockOnPixelSelect).toHaveBeenCalledWith(10, 20);
  });

  it('should handle wheel event for zooming', () => {
    const mockPan = vi.fn();
    const mockZoom = vi.fn();
    const mockScreenToWorld = vi.fn(() => ({ x: 0, y: 0 }));
    const mockOnPixelSelect = vi.fn();

    const { result } = renderHook(() =>
      useCanvasEvents({
        viewport: { x: 0, y: 0, zoom: 20 },
        pan: mockPan,
        zoom: mockZoom,
        screenToWorld: mockScreenToWorld,
        onPixelSelect: mockOnPixelSelect,
      })
    );

    const mockEvent = {
      preventDefault: vi.fn(),
      stopPropagation: vi.fn(),
      deltaY: -100,
    } as unknown as React.WheelEvent<HTMLCanvasElement>;

    act(() => {
      result.current.handleWheel(mockEvent);
    });

    expect(mockZoom).toHaveBeenCalledWith(1.05); // Zoom in
  });
});
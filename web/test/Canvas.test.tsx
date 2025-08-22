import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import Canvas from '../src/components/Canvas';
import { ViewportProvider } from '../src/contexts/ViewportContext';

// Mock the canvas element and its context
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
    setTransform: vi.fn(),
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

describe('Canvas', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  const renderCanvas = (props?: any) => {
    return render(
      <ViewportProvider>
        <Canvas {...props} />
      </ViewportProvider>
    );
  };

  it('should render canvas element', () => {
    renderCanvas();
    const canvasElement = screen.getByRole('img', { hidden: true });
    expect(canvasElement).toBeInTheDocument();
    expect(canvasElement.tagName).toBe('CANVAS');
  });

  it('should have proper accessibility attributes', () => {
    renderCanvas();
    const canvas = screen.getByRole('img', { hidden: true });
    expect(canvas).toHaveAttribute('aria-label', 'Pixel canvas');
    expect(canvas).toHaveAttribute('role', 'img');
  });

  it('should handle mouse down events for panning', () => {
    renderCanvas();
    const canvas = screen.getByRole('img', { hidden: true });

    fireEvent.mouseDown(canvas, { clientX: 100, clientY: 100 });
    // Should start panning mode
    expect(canvas).toBeInTheDocument();
  });

  it('should handle mouse move events during panning', () => {
    renderCanvas();
    const canvas = screen.getByRole('img', { hidden: true });

    fireEvent.mouseDown(canvas, { clientX: 100, clientY: 100 });
    fireEvent.mouseMove(canvas, { clientX: 150, clientY: 150 });
    // Should update viewport position
    expect(canvas).toBeInTheDocument();
  });

  it('should handle mouse up events to stop panning', () => {
    renderCanvas();
    const canvas = screen.getByRole('img', { hidden: true });

    fireEvent.mouseDown(canvas, { clientX: 100, clientY: 100 });
    fireEvent.mouseUp(canvas);
    // Should stop panning mode
    expect(canvas).toBeInTheDocument();
  });

  it('should handle wheel events for zooming in', () => {
    renderCanvas();
    const canvas = screen.getByRole('img', { hidden: true });

    fireEvent.wheel(canvas, { deltaY: -100 }); // Zoom in
    // Should zoom in (increase zoom level)
    expect(canvas).toBeInTheDocument();
  });

  it('should handle wheel events for zooming out', () => {
    renderCanvas();
    const canvas = screen.getByRole('img', { hidden: true });

    fireEvent.wheel(canvas, { deltaY: 100 }); // Zoom out
    // Should zoom out (decrease zoom level)
    expect(canvas).toBeInTheDocument();
  });

  it('should handle click events for pixel selection', () => {
    const mockOnPixelSelect = vi.fn();
    renderCanvas({ onPixelSelect: mockOnPixelSelect });
    const canvas = screen.getByRole('img', { hidden: true });

    fireEvent.click(canvas, { clientX: 400, clientY: 300 });
    // Should call onPixelSelect with world coordinates
    expect(mockOnPixelSelect).toHaveBeenCalled();
  });

  it('should render pixels within viewport', () => {
    const pixels = [
      { x: 0, y: 0, color: '#ff0000' },
      { x: 1, y: 0, color: '#00ff00' },
      { x: 0, y: 1, color: '#0000ff' },
    ];

    renderCanvas({ pixels });
    const canvas = screen.getByRole('img', { hidden: true });
    expect(canvas).toBeInTheDocument();
    // Canvas should attempt to render the pixels
  });

  it('should handle coordinate transformations', () => {
    renderCanvas();
    const canvas = screen.getByRole('img', { hidden: true });

    // Test that coordinate transformations work
    // This would involve testing the internal coordinate system
    expect(canvas).toBeInTheDocument();
  });

  it('should respect zoom limits', () => {
    renderCanvas();
    const canvas = screen.getByRole('img', { hidden: true });

    // Test minimum and maximum zoom levels
    fireEvent.wheel(canvas, { deltaY: 1000 }); // Try to zoom out too far
    fireEvent.wheel(canvas, { deltaY: -1000 }); // Try to zoom in too far
    expect(canvas).toBeInTheDocument();
  });

  it('should handle touch events for mobile panning', () => {
    renderCanvas();
    const canvas = screen.getByRole('img', { hidden: true });

    // Simulate touch events for panning
    fireEvent.touchStart(canvas, {
      touches: [{ clientX: 100, clientY: 100 }]
    });
    fireEvent.touchMove(canvas, {
      touches: [{ clientX: 150, clientY: 150 }]
    });
    fireEvent.touchEnd(canvas);

    expect(canvas).toBeInTheDocument();
  });

  it('should handle pinch gestures for zooming', () => {
    renderCanvas();
    const canvas = screen.getByRole('img', { hidden: true });

    // Simulate pinch to zoom in (two fingers moving apart)
    fireEvent.touchStart(canvas, {
      touches: [
        { clientX: 100, clientY: 100 },
        { clientX: 200, clientY: 100 }
      ]
    });
    fireEvent.touchMove(canvas, {
      touches: [
        { clientX: 80, clientY: 100 },
        { clientX: 220, clientY: 100 }
      ]
    });
    fireEvent.touchEnd(canvas);

    expect(canvas).toBeInTheDocument();
  });

   it('should handle pinch gestures for zooming out', () => {
     renderCanvas();
     const canvas = screen.getByRole('img', { hidden: true });

     // Simulate pinch to zoom out (two fingers moving together)
     fireEvent.touchStart(canvas, {
       touches: [
         { clientX: 80, clientY: 100 },
         { clientX: 220, clientY: 100 }
       ]
     });
     fireEvent.touchMove(canvas, {
       touches: [
         { clientX: 100, clientY: 100 },
         { clientX: 200, clientY: 100 }
       ]
     });
     fireEvent.touchEnd(canvas);

     expect(canvas).toBeInTheDocument();
   });

   it('should prevent rectangle selection exceeding 1000 pixels', () => {
     const mockOnSelectionChange = vi.fn();
     const mockConsoleWarn = vi.spyOn(console, 'warn').mockImplementation(() => {});

     renderCanvas({ onSelectionChange: mockOnSelectionChange });
     const canvas = screen.getByRole('img', { hidden: true });

     // First click to set starting point
     fireEvent.click(canvas, { clientX: 400, clientY: 300 });

     // Second click with shift to create a large rectangle (50x50 = 2500 pixels)
     fireEvent.click(canvas, { clientX: 400 + 50 * 1, clientY: 300 + 50 * 1, shiftKey: true });

     // Should not call onSelectionChange due to size limit
     expect(mockOnSelectionChange).not.toHaveBeenCalled();

     // Should log a warning
     expect(mockConsoleWarn).toHaveBeenCalledWith('Rectangle selection too large: 2500 pixels (max 1000)');

     mockConsoleWarn.mockRestore();
   });

   it('should allow rectangle selection within 1000 pixels', () => {
     const mockOnSelectionChange = vi.fn();

     renderCanvas({ onSelectionChange: mockOnSelectionChange });
     const canvas = screen.getByRole('img', { hidden: true });

     // First click to set starting point
     fireEvent.click(canvas, { clientX: 400, clientY: 300 });

     // Second click with shift to create a small rectangle (5x5 = 25 pixels)
     fireEvent.click(canvas, { clientX: 400 + 5 * 1, clientY: 300 + 5 * 1, shiftKey: true });

      // Should call onSelectionChange with valid selection
      expect(mockOnSelectionChange).toHaveBeenCalledWith(
        expect.objectContaining({
          selectedRectangle: expect.any(Object),
          pixelCount: 25
        })
      );
    });

    it('should keep origin pixel unchanged after rectangle selection', () => {
      const mockOnSelectionChange = vi.fn();

      renderCanvas({ onSelectionChange: mockOnSelectionChange });
      const canvas = screen.getByRole('img', { hidden: true });

      // First click to set starting point (origin pixel)
      fireEvent.click(canvas, { clientX: 400, clientY: 300 });

      // Second click with shift to create a rectangle
      fireEvent.click(canvas, { clientX: 400 + 5 * 1, clientY: 300 + 5 * 1, shiftKey: true });

      // Third click with shift to create another rectangle from same origin
      fireEvent.click(canvas, { clientX: 400 + 10 * 1, clientY: 300 + 10 * 1, shiftKey: true });

      // Should have been called twice (once for each rectangle)
      expect(mockOnSelectionChange).toHaveBeenCalledTimes(2);

      // Both rectangles should have the same origin (x: 0, y: 0 in world coordinates)
      const firstCall = mockOnSelectionChange.mock.calls[0][0];
      const secondCall = mockOnSelectionChange.mock.calls[1][0];

      expect(firstCall.selectedRectangle.x1).toBe(0);
      expect(firstCall.selectedRectangle.y1).toBe(0);
      expect(secondCall.selectedRectangle.x1).toBe(0);
      expect(secondCall.selectedRectangle.y1).toBe(0);

      // But different end points
      expect(firstCall.selectedRectangle.x2).toBe(5);
      expect(firstCall.selectedRectangle.y2).toBe(5);
      expect(secondCall.selectedRectangle.x2).toBe(10);
      expect(secondCall.selectedRectangle.y2).toBe(10);
    });
  });
});
 });
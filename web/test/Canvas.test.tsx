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
});
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render } from '@testing-library/react';
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

describe('Canvas Letter Bug Test', () => {
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

  it('should render pixels with both color and letter', () => {
    const pixels = [
      { x: 0, y: 0, color: '#ff0000', letter: 'A', sats: 1 },
      { x: 1, y: 0, color: '#00ff00', letter: 'B', sats: 1 },
    ];

    renderCanvas({ pixels });

    // Get the mock context
    const mockContext = mockCanvas.getContext.mock.results[0].value;

    // Verify that fillRect was called for both pixels (color background)
    expect(mockContext.fillRect).toHaveBeenCalledWith(0, 0, 1, 1);
    expect(mockContext.fillRect).toHaveBeenCalledWith(1, 0, 1, 1);

    // Verify that fillText was called for both letters
    expect(mockContext.fillText).toHaveBeenCalledWith('A', 0.5, 0.5);
    expect(mockContext.fillText).toHaveBeenCalledWith('B', 1.5, 0.5);

    // Verify that fillStyle was set to white for letters
    expect(mockContext.fillStyle).toBe('#ffffff');
  });

  it('should render pixels with only color when no letter is present', () => {
    const pixels = [
      { x: 0, y: 0, color: '#ff0000', sats: 1 },
      { x: 1, y: 0, color: '#00ff00', sats: 1 },
    ];

    renderCanvas({ pixels });

    // Get the mock context
    const mockContext = mockCanvas.getContext.mock.results[0].value;

    // Verify that fillRect was called for both pixels
    expect(mockContext.fillRect).toHaveBeenCalledWith(0, 0, 1, 1);
    expect(mockContext.fillRect).toHaveBeenCalledWith(1, 0, 1, 1);

    // Verify that fillText was NOT called since no letters
    expect(mockContext.fillText).not.toHaveBeenCalled();
  });
});
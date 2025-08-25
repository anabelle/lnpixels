import { describe, it, expect, vi } from 'vitest';
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
    arc: vi.fn(),
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

describe('Letter Visibility Test', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should render letters with proper visibility', () => {
    const pixels = [
      { x: 0, y: 0, color: '#ff0000', letter: 'A', sats: 100 },
      { x: 1, y: 0, color: '#ffffff', letter: 'B', sats: 10 }, // White background
      { x: 2, y: 0, color: '#000000', letter: 'C', sats: 1 },  // Black background
    ];

    render(
      <ViewportProvider>
        <Canvas pixels={pixels} />
      </ViewportProvider>
    );

    const mockContext = mockCanvas.getContext.mock.results[0].value;

    // Verify that fillText was called for each letter
    expect(mockContext.fillText).toHaveBeenCalledWith('A', 0.5, 0.5);
    expect(mockContext.fillText).toHaveBeenCalledWith('B', 1.5, 0.5);
    expect(mockContext.fillText).toHaveBeenCalledWith('C', 2.5, 0.5);

    // Verify that background circles were drawn
    expect(mockContext.arc).toHaveBeenCalledTimes(3);
  });
});
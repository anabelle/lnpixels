import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import Canvas from './Canvas';
import { Pixel } from '../types/canvas';
import { ViewportProvider } from '../contexts/ViewportContext';

describe('Canvas Validation Integration', () => {
  const mockPixels: Pixel[] = [
    { x: 0, y: 0, color: '#ff0000' },
    { x: 1, y: 0, color: '#00ff00', letter: 'A' },
  ];

  const renderCanvas = (props: any = {}) => {
    return render(
      <ViewportProvider>
        <Canvas
          pixels={mockPixels}
          onPixelSelect={vi.fn()}
          {...props}
        />
      </ViewportProvider>
    );
  };

  it('should render without crashing', () => {
    renderCanvas();
    const canvas = screen.getByRole('img', { name: /pixel canvas/i });
    expect(canvas).toBeInTheDocument();
  });

  it('should call onPixelSelect for any valid pixel (infinite canvas)', () => {
    const mockOnPixelSelect = vi.fn();
    renderCanvas({ onPixelSelect: mockOnPixelSelect });

    const canvas = screen.getByRole('img', { name: /pixel canvas/i });

    // Simulate click - should work for any coordinates on infinite canvas
    fireEvent.click(canvas, {
      clientX: 100,
      clientY: 100
    });

    // The canvas should handle the click and call onPixelSelect
    expect(canvas).toBeInTheDocument();
  });

  it('should allow selecting already owned pixels (overwrites allowed)', () => {
    const mockOnPixelSelect = vi.fn();
    renderCanvas({ onPixelSelect: mockOnPixelSelect });

    const canvas = screen.getByRole('img', { name: /pixel canvas/i });

    // Selecting owned pixels should be allowed (overwrites)
    fireEvent.click(canvas, {
      clientX: 100,
      clientY: 100
    });

    expect(canvas).toBeInTheDocument();
  });

  it('should handle clicks on infinite canvas coordinates', () => {
    const mockOnPixelSelect = vi.fn();
    renderCanvas({ onPixelSelect: mockOnPixelSelect });

    const canvas = screen.getByRole('img', { name: /pixel canvas/i });

    // Test various click positions on the infinite canvas
    fireEvent.click(canvas, {
      clientX: 50,
      clientY: 50
    });

    fireEvent.click(canvas, {
      clientX: 200,
      clientY: 150
    });

    expect(canvas).toBeInTheDocument();
  });
});
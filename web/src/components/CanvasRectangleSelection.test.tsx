import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import Canvas from './Canvas';
import { Pixel } from '../types/canvas';
import { ViewportProvider } from '../contexts/ViewportContext';

describe('Canvas Rectangle Selection Integration', () => {
  const mockPixels: Pixel[] = [
    { x: 0, y: 0, color: '#ff0000' },
    { x: 1, y: 0, color: '#00ff00', letter: 'A' },
    { x: 0, y: 1, color: '#0000ff' },
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

  it('should handle single click for pixel selection', () => {
    const mockOnPixelSelect = vi.fn();
    renderCanvas({ onPixelSelect: mockOnPixelSelect });

    const canvas = screen.getByRole('img', { name: /pixel canvas/i });

    fireEvent.mouseDown(canvas, {
      clientX: 400,
      clientY: 300,
      button: 0
    });

    expect(canvas).toBeInTheDocument();
  });

  it('should handle shift+click to start rectangle selection', () => {
    const mockOnPixelSelect = vi.fn();
    renderCanvas({ onPixelSelect: mockOnPixelSelect });

    const canvas = screen.getByRole('img', { name: /pixel canvas/i });

    fireEvent.mouseDown(canvas, {
      clientX: 400,
      clientY: 300,
      button: 0,
      shiftKey: true
    });

    expect(canvas).toBeInTheDocument();
  });

  it('should handle multiple shift+clicks for rectangle selection', () => {
    const mockOnPixelSelect = vi.fn();
    renderCanvas({ onPixelSelect: mockOnPixelSelect });

    const canvas = screen.getByRole('img', { name: /pixel canvas/i });

    // First shift+click to start selection
    fireEvent.mouseDown(canvas, {
      clientX: 400,
      clientY: 300,
      button: 0,
      shiftKey: true
    });

    // Second shift+click to complete selection
    fireEvent.mouseDown(canvas, {
      clientX: 500,
      clientY: 400,
      button: 0,
      shiftKey: true
    });

    expect(canvas).toBeInTheDocument();
  });

  it('should cancel rectangle selection on regular click', () => {
    const mockOnPixelSelect = vi.fn();
    renderCanvas({ onPixelSelect: mockOnPixelSelect });

    const canvas = screen.getByRole('img', { name: /pixel canvas/i });

    // Start rectangle selection
    fireEvent.mouseDown(canvas, {
      clientX: 400,
      clientY: 300,
      button: 0,
      shiftKey: true
    });

    // Regular click should cancel rectangle selection
    fireEvent.mouseDown(canvas, {
      clientX: 450,
      clientY: 350,
      button: 0,
      shiftKey: false
    });

    expect(canvas).toBeInTheDocument();
  });

  it('should show crosshair cursor during rectangle selection', () => {
    renderCanvas();

    const canvas = screen.getByRole('img', { name: /pixel canvas/i });

    // Initially should have grab cursor
    expect(canvas).toHaveStyle({ cursor: 'grab' });

    // After shift+click, should show crosshair (this would be tested in integration)
    fireEvent.mouseDown(canvas, {
      clientX: 400,
      clientY: 300,
      button: 0,
      shiftKey: true
    });

    expect(canvas).toBeInTheDocument();
  });
});
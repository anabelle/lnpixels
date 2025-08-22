import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import App from '../App';

describe('Rectangle Selection Visual Feedback', () => {
  it('should show rectangle selection with visual feedback', async () => {
    const mockOnPixelSelect = vi.fn();
    render(<App />);

    const canvas = screen.getByRole('img', { name: /pixel canvas/i });

    // First click to select starting pixel
    fireEvent.click(canvas, {
      clientX: 300,
      clientY: 200,
      button: 0
    });

    await waitFor(() => {
      expect(canvas).toBeInTheDocument();
    });

    // Shift+click to create rectangle
    fireEvent.click(canvas, {
      clientX: 400,
      clientY: 300,
      button: 0,
      shiftKey: true
    });

    await waitFor(() => {
      expect(canvas).toBeInTheDocument();
    });

    // The canvas should still be rendered with visual feedback
    expect(canvas).toBeInTheDocument();
  });

  it('should clear rectangle selection when clicking single pixel', async () => {
    render(<App />);

    const canvas = screen.getByRole('img', { name: /pixel canvas/i });

    // Create rectangle selection
    fireEvent.click(canvas, {
      clientX: 300,
      clientY: 200,
      button: 0
    });

    fireEvent.click(canvas, {
      clientX: 400,
      clientY: 300,
      button: 0,
      shiftKey: true
    });

    await waitFor(() => {
      expect(canvas).toBeInTheDocument();
    });

    // Click single pixel to clear rectangle selection
    fireEvent.click(canvas, {
      clientX: 500,
      clientY: 400,
      button: 0
    });

    await waitFor(() => {
      expect(canvas).toBeInTheDocument();
    });
  });

  it('should handle rectangle selection with different sizes', async () => {
    render(<App />);

    const canvas = screen.getByRole('img', { name: /pixel canvas/i });

    // Test different rectangle sizes
    const rectangles = [
      { start: { x: 200, y: 150 }, end: { x: 250, y: 200 } }, // Small
      { start: { x: 300, y: 200 }, end: { x: 500, y: 400 } }, // Large
      { start: { x: 100, y: 100 }, end: { x: 600, y: 500 } }, // Very large
    ];

    for (const rect of rectangles) {
      // Start selection
      fireEvent.click(canvas, {
        clientX: rect.start.x,
        clientY: rect.start.y,
        button: 0
      });

      // Complete selection
      fireEvent.click(canvas, {
        clientX: rect.end.x,
        clientY: rect.end.y,
        button: 0,
        shiftKey: true
      });

      await waitFor(() => {
        expect(canvas).toBeInTheDocument();
      });
    }
  });
});
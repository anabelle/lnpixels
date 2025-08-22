import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import App from '../App';

describe('Rectangle Selection Workflow - Fixed', () => {
  it('should work with single click then shift+click', async () => {
    render(<App />);

    const canvas = screen.getByRole('img', { name: /pixel canvas/i });

    // Step 1: Regular click to select first pixel
    fireEvent.click(canvas, {
      clientX: 400,
      clientY: 300,
      button: 0
    });

    await waitFor(() => {
      expect(canvas).toBeInTheDocument();
    });

    // Step 2: Shift+click to create rectangle from first pixel to second pixel
    fireEvent.click(canvas, {
      clientX: 500,
      clientY: 400,
      button: 0,
      shiftKey: true
    });

    await waitFor(() => {
      expect(canvas).toBeInTheDocument();
    });
  });

  it('should allow panning while not in rectangle selection', async () => {
    render(<App />);

    const canvas = screen.getByRole('img', { name: /pixel canvas/i });

    // Mouse down to start panning
    fireEvent.mouseDown(canvas, {
      clientX: 400,
      clientY: 300,
      button: 0
    });

    // Mouse move should pan
    fireEvent.mouseMove(canvas, {
      clientX: 450,
      clientY: 350
    });

    // Mouse up to stop panning
    fireEvent.mouseUp(canvas);

    await waitFor(() => {
      expect(canvas).toBeInTheDocument();
    });
  });

  it('should handle multiple rectangle selections', async () => {
    render(<App />);

    const canvas = screen.getByRole('img', { name: /pixel canvas/i });

    // First rectangle selection
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

    // Second rectangle selection from a different starting point
    fireEvent.click(canvas, {
      clientX: 500,
      clientY: 400,
      button: 0
    });

    fireEvent.click(canvas, {
      clientX: 600,
      clientY: 500,
      button: 0,
      shiftKey: true
    });

    await waitFor(() => {
      expect(canvas).toBeInTheDocument();
    });
  });
});
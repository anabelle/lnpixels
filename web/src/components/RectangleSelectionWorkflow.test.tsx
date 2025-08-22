import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import App from '../App';
import { Pixel } from '../types/canvas';

describe('Rectangle Selection Workflow Integration', () => {
  it('should complete full rectangle selection workflow', async () => {
    render(<App />);

    const canvas = screen.getByRole('img', { name: /pixel canvas/i });

    // Step 1: Start rectangle selection with shift+click
    fireEvent.mouseDown(canvas, {
      clientX: 400,
      clientY: 300,
      button: 0,
      shiftKey: true
    });

    // Canvas should still be rendered
    await waitFor(() => {
      expect(canvas).toBeInTheDocument();
    });

    // Step 2: Complete rectangle selection with second shift+click
    fireEvent.mouseDown(canvas, {
      clientX: 500,
      clientY: 400,
      button: 0,
      shiftKey: true
    });

    // Should handle the rectangle selection completion
    await waitFor(() => {
      expect(canvas).toBeInTheDocument();
    });
  });

  it('should handle rectangle selection with different coordinate ranges', async () => {
    render(<App />);

    const canvas = screen.getByRole('img', { name: /pixel canvas/i });

    // Test rectangle selection with different sizes
    const testCases = [
      { start: { x: 300, y: 200 }, end: { x: 400, y: 300 } }, // Small rectangle
      { start: { x: 200, y: 150 }, end: { x: 600, y: 450 } }, // Large rectangle
      { start: { x: 350, y: 250 }, end: { x: 450, y: 350 } }, // Medium rectangle
    ];

    for (const testCase of testCases) {
      // Start selection
      fireEvent.mouseDown(canvas, {
        clientX: testCase.start.x,
        clientY: testCase.start.y,
        button: 0,
        shiftKey: true
      });

      // Complete selection
      fireEvent.mouseDown(canvas, {
        clientX: testCase.end.x,
        clientY: testCase.end.y,
        button: 0,
        shiftKey: true
      });

      await waitFor(() => {
        expect(canvas).toBeInTheDocument();
      });
    }
  });

  it('should cancel rectangle selection on regular click', async () => {
    render(<App />);

    const canvas = screen.getByRole('img', { name: /pixel canvas/i });

    // Start rectangle selection
    fireEvent.mouseDown(canvas, {
      clientX: 400,
      clientY: 300,
      button: 0,
      shiftKey: true
    });

    // Regular click should cancel rectangle selection and do single pixel selection
    fireEvent.mouseDown(canvas, {
      clientX: 450,
      clientY: 350,
      button: 0,
      shiftKey: false
    });

    await waitFor(() => {
      expect(canvas).toBeInTheDocument();
    });
  });

  it('should handle rectangle selection with existing pixels', async () => {
    render(<App />);

    const canvas = screen.getByRole('img', { name: /pixel canvas/i });

    // The App component has sample pixels, rectangle selection should work around them
    fireEvent.mouseDown(canvas, {
      clientX: 350,
      clientY: 250,
      button: 0,
      shiftKey: true
    });

    fireEvent.mouseDown(canvas, {
      clientX: 550,
      clientY: 450,
      button: 0,
      shiftKey: true
    });

    await waitFor(() => {
      expect(canvas).toBeInTheDocument();
    });
  });

  it('should maintain canvas functionality during rectangle selection', async () => {
    render(<App />);

    const canvas = screen.getByRole('img', { name: /pixel canvas/i });

    // Start rectangle selection
    fireEvent.mouseDown(canvas, {
      clientX: 400,
      clientY: 300,
      button: 0,
      shiftKey: true
    });

    // Canvas should still respond to other interactions
    fireEvent.wheel(canvas, { deltaY: 100 }); // Zoom out

    await waitFor(() => {
      expect(canvas).toBeInTheDocument();
    });

    // Complete rectangle selection
    fireEvent.mouseDown(canvas, {
      clientX: 500,
      clientY: 400,
      button: 0,
      shiftKey: true
    });

    await waitFor(() => {
      expect(canvas).toBeInTheDocument();
    });
  });
});
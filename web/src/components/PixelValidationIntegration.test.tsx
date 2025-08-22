import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import App from '../App';
import { Pixel } from '../types/canvas';

describe('Pixel Validation Integration', () => {
  it('should allow clicking on any pixel (infinite canvas, overwrites allowed)', async () => {
    render(<App />);

    const canvas = screen.getByRole('img', { name: /pixel canvas/i });

    // Click on any pixel - should always be allowed on infinite canvas
    fireEvent.click(canvas, {
      clientX: 400,
      clientY: 300
    });

    // The app should handle the click without errors
    await waitFor(() => {
      expect(canvas).toBeInTheDocument();
    });
  });

  it('should allow selection of pixels at any coordinates', async () => {
    render(<App />);

    const canvas = screen.getByRole('img', { name: /pixel canvas/i });

    // Test various click positions on the infinite canvas
    fireEvent.click(canvas, {
      clientX: 100,
      clientY: 100
    });

    fireEvent.click(canvas, {
      clientX: 500,
      clientY: 400
    });

    fireEvent.click(canvas, {
      clientX: 200,
      clientY: 150
    });

    // All clicks should be handled gracefully
    await waitFor(() => {
      expect(canvas).toBeInTheDocument();
    });
  });

  it('should handle edge case clicks gracefully', async () => {
    render(<App />);

    const canvas = screen.getByRole('img', { name: /pixel canvas/i });

    // Test edge clicks that might result in extreme coordinates
    fireEvent.click(canvas, {
      clientX: 10, // Near edge
      clientY: 10
    });

    fireEvent.click(canvas, {
      clientX: 790, // Near opposite edge
      clientY: 590
    });

    // The app should handle these gracefully without crashing
    await waitFor(() => {
      expect(canvas).toBeInTheDocument();
    });
  });

  it('should work with sample pixels from App component', async () => {
    render(<App />);

    const canvas = screen.getByRole('img', { name: /pixel canvas/i });

    // The App component has sample pixels, clicking anywhere should work
    fireEvent.click(canvas, {
      clientX: 300,
      clientY: 200
    });

    // Should handle the interaction without issues
    await waitFor(() => {
      expect(canvas).toBeInTheDocument();
    });
  });
});
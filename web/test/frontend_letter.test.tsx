import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import PurchasePanel from '../src/components/PurchasePanel';
import { ViewportProvider } from '../src/contexts/ViewportContext';

// Mock fetch
global.fetch = vi.fn();

describe('Frontend Letter Integration', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  const renderPurchasePanel = (props?: any) => {
    return render(
      <ViewportProvider>
        <PurchasePanel
          collapsed={false}
          selectionState={{
            selectedPixel: { x: 10, y: 10 },
            selectedRectangle: null,
            selectedPixels: [{ x: 10, y: 10 }],
            pixelCount: 1
          }}
          purchasedPixels={[]}
          allPixels={[]}
          {...props}
        />
      </ViewportProvider>
    );
  };

  it('should send letter in single pixel purchase', async () => {
    // Mock successful API response
    (global.fetch as any).mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({
        invoice: 'lnbc...',
        payment_hash: 'hash123',
        amount: 100,
        id: 'payment123',
        isMock: true
      })
    });

    renderPurchasePanel();

    // Select letter type
    const letterButton = screen.getByRole('radio', { name: /Color \+ Letter/i });
    fireEvent.click(letterButton);

    // Enter a letter
    const letterInput = screen.getByLabelText(/Single letter for pixel/i);
    fireEvent.change(letterInput, { target: { value: 'A' } });

    // Click purchase button
    const purchaseButton = screen.getByRole('button', { name: /Purchase Pixels/i });
    fireEvent.click(purchaseButton);

    // Wait for fetch to be called
    await new Promise(resolve => setTimeout(resolve, 100));

    // Verify fetch was called with correct payload
    expect(global.fetch).toHaveBeenCalledWith('/api/invoices', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        x: 10,
        y: 10,
        color: '#ff0000', // default color
        letter: 'A'
      })
    });
  });

  it('should send letters in bulk purchase', async () => {
    // Mock successful API response
    (global.fetch as any).mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({
        invoice: 'lnbc...',
        payment_hash: 'hash123',
        amount: 300,
        id: 'payment123',
        pixelCount: 3,
        isMock: true
      })
    });

    renderPurchasePanel({
      selectionState: {
        selectedPixel: null,
        selectedRectangle: { x1: 0, y1: 0, x2: 2, y2: 0 },
        selectedPixels: [
          { x: 0, y: 0 },
          { x: 1, y: 0 },
          { x: 2, y: 0 }
        ],
        pixelCount: 3
      }
    });

    // Select letter type
    const letterButton = screen.getByRole('radio', { name: /Color \+ Letter/i });
    fireEvent.click(letterButton);

    // Enter a letter
    const letterInput = screen.getByLabelText(/Single letter for pixel/i);
    fireEvent.change(letterInput, { target: { value: 'H' } });

    // Click purchase button
    const purchaseButton = screen.getByRole('button', { name: /Purchase Pixels/i });
    fireEvent.click(purchaseButton);

    // Wait for fetch to be called
    await new Promise(resolve => setTimeout(resolve, 100));

    // Verify fetch was called with correct payload
    expect(global.fetch).toHaveBeenCalledWith('/api/invoices/bulk', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        x1: 0,
        y1: 0,
        x2: 2,
        y2: 0,
        color: '#ff0000', // default color
        letters: 'H' // single letter for bulk
      })
    });
  });

  it('should not send letter for basic or color types', async () => {
    // Mock successful API response
    (global.fetch as any).mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({
        invoice: 'lnbc...',
        payment_hash: 'hash123',
        amount: 10,
        id: 'payment123',
        isMock: true
      })
    });

    renderPurchasePanel();

    // Select color type (no letter)
    const colorButton = screen.getByRole('radio', { name: /Color/i });
    fireEvent.click(colorButton);

    // Click purchase button
    const purchaseButton = screen.getByRole('button', { name: /Purchase Pixels/i });
    fireEvent.click(purchaseButton);

    // Wait for fetch to be called
    await new Promise(resolve => setTimeout(resolve, 100));

    // Verify fetch was called without letter
    expect(global.fetch).toHaveBeenCalledWith('/api/invoices', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        x: 10,
        y: 10,
        color: '#ff0000',
        letter: undefined // no letter for color type
      })
    });
  });
});
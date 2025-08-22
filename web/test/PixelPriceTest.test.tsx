import { describe, it, expect } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import PurchasePanel from '../src/components/PurchasePanel';
import { ThemeProvider } from '../src/theme';

describe('Pixel Price Display', () => {
  const renderPurchasePanel = (props?: { collapsed?: boolean }) => {
    return render(
      <ThemeProvider>
        <PurchasePanel collapsed={false} {...props} />
      </ThemeProvider>
    );
  };

  it('should show individual prices for each pixel type', () => {
    renderPurchasePanel();

    // Check that each pixel type shows its own price
    expect(screen.getByText('Basic (1 sat)')).toBeInTheDocument();
    expect(screen.getByText('Color (10 sats)')).toBeInTheDocument();
    expect(screen.getByText('Color + Letter (100 sats)')).toBeInTheDocument();
  });

  it('should maintain individual prices when selecting different types', () => {
    renderPurchasePanel();

    // Initially, all types should show their individual prices
    expect(screen.getByText('Basic (1 sat)')).toBeInTheDocument();
    expect(screen.getByText('Color (10 sats)')).toBeInTheDocument();
    expect(screen.getByText('Color + Letter (100 sats)')).toBeInTheDocument();

    // Click on Color type
    const colorButton = screen.getByText('Color (10 sats)');
    colorButton.click();

    // After clicking, all types should still show their individual prices
    expect(screen.getByText('Basic (1 sat)')).toBeInTheDocument();
    expect(screen.getByText('Color (10 sats)')).toBeInTheDocument();
    expect(screen.getByText('Color + Letter (100 sats)')).toBeInTheDocument();
  });

  it('should show correct price format for single satoshi', () => {
    renderPurchasePanel();

    // Basic pixel should show "1 sat" (singular)
    expect(screen.getByText('Basic (1 sat)')).toBeInTheDocument();
  });

  it('should show correct price format for multiple satoshis', () => {
    renderPurchasePanel();

    // Color and Color+Letter should show "X sats" (plural)
    expect(screen.getByText('Color (10 sats)')).toBeInTheDocument();
    expect(screen.getByText('Color + Letter (100 sats)')).toBeInTheDocument();
  });

  it('should show selected type as active', async () => {
    const user = userEvent.setup();
    renderPurchasePanel();

    // Initially basic should be active
    const basicButton = screen.getByText('Basic (1 sat)').closest('button');
    expect(basicButton).toHaveClass('active');

    // Click color type
    const colorButton = screen.getByText('Color (10 sats)');
    await user.click(colorButton);

    // Wait for state update and check
    await waitFor(() => {
      expect(basicButton).not.toHaveClass('active');
      expect(colorButton.closest('button')).toHaveClass('active');
    });
  });
});
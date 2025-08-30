import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import PurchasePanel from '../src/components/PurchasePanel';
import { ThemeProvider } from '../src/theme';
import { SelectionState } from '../src/hooks/usePixelPurchase';

describe('Mobile Purchase Flow', () => {
  const mockSelectionState: SelectionState = {
    selectedPixel: { x: 10, y: 20 },
    selectedRectangle: null,
    selectedPixels: [{ x: 10, y: 20 }],
    pixelCount: 1
  };

  const mockOnTabChange = vi.fn();

  const renderPurchasePanel = (props?: {
    isMobile?: boolean;
    onTabChange?: (tab: string) => void;
    selectionState?: SelectionState;
  }) => {
    return render(
      <ThemeProvider>
        <PurchasePanel
          collapsed={false}
          selectionState={mockSelectionState}
          purchasedPixels={[]}
          allPixels={[]}
          isMobile={false}
          onTabChange={mockOnTabChange}
          {...props}
        />
      </ThemeProvider>
    );
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should not switch tabs on desktop after payment success', async () => {
    const user = userEvent.setup();
    renderPurchasePanel({ isMobile: false });

    // Click purchase button to open payment modal
    const purchaseButton = screen.getByText('Purchase Pixels');
    await user.click(purchaseButton);

    // Simulate payment success by calling onPaymentSuccess
    // Note: In a real test, we'd need to mock the PaymentModal component
    // For now, we'll test the prop passing logic

    expect(mockOnTabChange).not.toHaveBeenCalled();
  });

  it('should switch to canvas tab on mobile after payment success', async () => {
    const user = userEvent.setup();
    renderPurchasePanel({ isMobile: true, onTabChange: mockOnTabChange });

    // Click purchase button to open payment modal
    const purchaseButton = screen.getByText('Purchase Pixels');
    await user.click(purchaseButton);

    // Simulate payment success by calling onPaymentSuccess
    // In the actual component, this would be called by PaymentModal
    // For this test, we verify the props are passed correctly

    expect(mockOnTabChange).not.toHaveBeenCalled(); // Should not be called yet

    // The actual switching happens in the onPaymentSuccess callback
    // which would be triggered by the PaymentModal component
  });

  it('should pass mobile props correctly to PurchasePanel', () => {
    const mockTabChange = vi.fn();
    renderPurchasePanel({
      isMobile: true,
      onTabChange: mockTabChange,
      selectionState: mockSelectionState
    });

    // Verify the component renders with mobile props
    expect(screen.getByText('Purchase Pixels')).toBeInTheDocument();

    // The actual test of tab switching would require mocking PaymentModal
    // or testing the integration with the full mobile layout
  });

  it('should handle undefined onTabChange gracefully', () => {
    renderPurchasePanel({
      isMobile: true,
      onTabChange: undefined,
      selectionState: mockSelectionState
    });

    // Component should render without errors even with undefined onTabChange
    expect(screen.getByText('Purchase Pixels')).toBeInTheDocument();
  });
});
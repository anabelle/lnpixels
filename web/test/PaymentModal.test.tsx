import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import PaymentModal from '../src/components/PaymentModal';
import { SelectionState } from '../src/hooks/usePixelPurchase';

// Mock fetch globally
global.fetch = vi.fn(() =>
  Promise.resolve({
    ok: true,
    json: () => Promise.resolve({
      id: 'test-invoice',
      invoice: 'lnbc100...',
      payment_hash: 'hash123',
      amount: 10
    })
  })
) as any;

// Mock the NakaPayModal component
vi.mock('nakapay-react', () => ({
  NakaPayModal: ({ onPaymentSuccess, onPaymentError, onClose }: any) => (
    <div data-testid="nakapay-modal">
      <button
        data-testid="mock-success"
        onClick={() => onPaymentSuccess({ id: 'test-payment' })}
      >
        Mock Success
      </button>
      <button
        data-testid="mock-error"
        onClick={() => onPaymentError(new Error('Test error'))}
      >
        Mock Error
      </button>
      <button
        data-testid="mock-close"
        onClick={onClose}
      >
        Mock Close
      </button>
    </div>
  )
}));

describe('PaymentModal', () => {
  const mockSelectionState: SelectionState = {
    selectedPixel: null,
    selectedRectangle: null,
    selectedPixels: [{ x: 0, y: 0 }],
    pixelCount: 1
  };

  const mockPurchasedPixels = [{ x: 0, y: 0, sats: 100 }];
  const mockOnPaymentSuccess = vi.fn();
  const mockOnPaymentError = vi.fn();
  const mockOnClose = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should render loading state initially', () => {
    render(
      <PaymentModal
        isOpen={true}
        onClose={mockOnClose}
        selectionState={mockSelectionState}
        purchasedPixels={mockPurchasedPixels}
        onPaymentSuccess={mockOnPaymentSuccess}
        onPaymentError={mockOnPaymentError}
      />
    );

    expect(screen.getByText('Creating invoice...')).toBeInTheDocument();
  });

  it('should render payment modal after loading', async () => {
    render(
      <PaymentModal
        isOpen={true}
        onClose={mockOnClose}
        selectionState={mockSelectionState}
        purchasedPixels={mockPurchasedPixels}
        onPaymentSuccess={mockOnPaymentSuccess}
        onPaymentError={mockOnPaymentError}
      />
    );

    // Wait for the payment to be created
    await new Promise(resolve => setTimeout(resolve, 100));

    expect(screen.getByTestId('nakapay-modal')).toBeInTheDocument();
  });

  it('should call onPaymentSuccess when payment succeeds', async () => {
    render(
      <PaymentModal
        isOpen={true}
        onClose={mockOnClose}
        selectionState={mockSelectionState}
        purchasedPixels={mockPurchasedPixels}
        onPaymentSuccess={mockOnPaymentSuccess}
        onPaymentError={mockOnPaymentError}
      />
    );

    // Wait for the payment to be created
    await new Promise(resolve => setTimeout(resolve, 100));

    const successButton = screen.getByTestId('mock-success');
    fireEvent.click(successButton);

    expect(mockOnPaymentSuccess).toHaveBeenCalledWith({ id: 'test-payment' });
  });

  it('should call onPaymentError when payment fails', async () => {
    render(
      <PaymentModal
        isOpen={true}
        onClose={mockOnClose}
        selectionState={mockSelectionState}
        purchasedPixels={mockPurchasedPixels}
        onPaymentSuccess={mockOnPaymentSuccess}
        onPaymentError={mockOnPaymentError}
      />
    );

    // Wait for the payment to be created
    await new Promise(resolve => setTimeout(resolve, 100));

    const errorButton = screen.getByTestId('mock-error');
    fireEvent.click(errorButton);

    expect(mockOnPaymentError).toHaveBeenCalledWith(expect.any(Error));
  });

  it('should call onClose when modal is closed', async () => {
    render(
      <PaymentModal
        isOpen={true}
        onClose={mockOnClose}
        selectionState={mockSelectionState}
        purchasedPixels={mockPurchasedPixels}
        onPaymentSuccess={mockOnPaymentSuccess}
        onPaymentError={mockOnPaymentError}
      />
    );

    // Wait for the payment to be created
    await new Promise(resolve => setTimeout(resolve, 100));

    const closeButton = screen.getByTestId('mock-close');
    fireEvent.click(closeButton);

    expect(mockOnClose).toHaveBeenCalled();
  });

  it('should not render when isOpen is false', () => {
    render(
      <PaymentModal
        isOpen={false}
        onClose={mockOnClose}
        selectionState={mockSelectionState}
        purchasedPixels={mockPurchasedPixels}
        pixelType="basic"
        color="#ff0000"
        onPaymentSuccess={mockOnPaymentSuccess}
        onPaymentError={mockOnPaymentError}
      />
    );

    expect(screen.queryByText('Lightning Payment')).not.toBeInTheDocument();
  });

  it('should call onClose when close button is clicked', async () => {
    render(
      <PaymentModal
        isOpen={true}
        onClose={mockOnClose}
        selectionState={mockSelectionState}
        purchasedPixels={mockPurchasedPixels}
        pixelType="basic"
        color="#ff0000"
        onPaymentSuccess={mockOnPaymentSuccess}
        onPaymentError={mockOnPaymentError}
      />
    );

    // Wait for payment to be created
    await new Promise(resolve => setTimeout(resolve, 100));

    const closeButton = screen.getByLabelText('Close payment modal');
    fireEvent.click(closeButton);

    expect(mockOnClose).toHaveBeenCalled();
  });

  it('should call onClose when overlay is clicked', async () => {
    render(
      <PaymentModal
        isOpen={true}
        onClose={mockOnClose}
        selectionState={mockSelectionState}
        purchasedPixels={mockPurchasedPixels}
        pixelType="basic"
        color="#ff0000"
        onPaymentSuccess={mockOnPaymentSuccess}
        onPaymentError={mockOnPaymentError}
      />
    );

    // Wait for payment to be created
    await new Promise(resolve => setTimeout(resolve, 100));

    const overlay = screen.getByText('Lightning Payment').parentElement?.parentElement;
    fireEvent.click(overlay!);

    expect(mockOnClose).toHaveBeenCalled();
  });

  it('should not call onClose when modal content is clicked', async () => {
    render(
      <PaymentModal
        isOpen={true}
        onClose={mockOnClose}
        selectionState={mockSelectionState}
        purchasedPixels={mockPurchasedPixels}
        pixelType="basic"
        color="#ff0000"
        onPaymentSuccess={mockOnPaymentSuccess}
        onPaymentError={mockOnPaymentError}
      />
    );

    // Wait for payment to be created
    await new Promise(resolve => setTimeout(resolve, 100));

    const modalContent = screen.getByText('Lightning Payment').parentElement;
    fireEvent.click(modalContent!);

    expect(mockOnClose).not.toHaveBeenCalled();
  });

  it('should display QR code and invoice text', async () => {
    render(
      <PaymentModal
        isOpen={true}
        onClose={mockOnClose}
        selectionState={mockSelectionState}
        purchasedPixels={mockPurchasedPixels}
        pixelType="basic"
        color="#ff0000"
        onPaymentSuccess={mockOnPaymentSuccess}
        onPaymentError={mockOnPaymentError}
      />
    );

    // Wait for payment to be created
    await new Promise(resolve => setTimeout(resolve, 100));

    expect(screen.getByText('Scan QR Code')).toBeInTheDocument();
    expect(screen.getByText('Or Copy Invoice')).toBeInTheDocument();
    expect(screen.getByRole('img', { name: /qr code/i })).toBeInTheDocument();
  });

  it('should show correct payment amount', async () => {
    render(
      <PaymentModal
        isOpen={true}
        onClose={mockOnClose}
        selectionState={mockSelectionState}
        purchasedPixels={mockPurchasedPixels}
        pixelType="basic"
        color="#ff0000"
        onPaymentSuccess={mockOnPaymentSuccess}
        onPaymentError={mockOnPaymentError}
      />
    );

    // Wait for payment to be created
    await new Promise(resolve => setTimeout(resolve, 100));

    expect(screen.getByText('10 sats')).toBeInTheDocument();
  });
});
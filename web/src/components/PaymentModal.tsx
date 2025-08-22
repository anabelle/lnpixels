import React, { useState } from 'react';
import { NakaPayModal } from 'nakapay-react';
import { SelectionState } from '../hooks/usePixelPurchase';

interface PaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
  selectionState: SelectionState;
  purchasedPixels: { x: number; y: number; sats: number }[];
  pixelType: 'basic' | 'color' | 'letter';
  color: string;
  letter?: string;
  onPaymentSuccess: (payment: any) => void;
  onPaymentError: (error: any) => void;
}

const PaymentModal: React.FC<PaymentModalProps> = ({
  isOpen,
  onClose,
  selectionState,
  purchasedPixels,
  pixelType,
  color,
  letter,
  onPaymentSuccess,
  onPaymentError
}) => {
  console.log('PaymentModal props:', { isOpen, onClose: typeof onClose });

  const [payment, setPayment] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(false);

  console.log('PaymentModal render:', { isOpen, selectionState, pixelType, color, letter });
  console.log('PaymentModal render check:', { isOpen, isLoading, payment: !!payment });

  // Calculate total price based on pixel type and existing pixels
  const calculateTotalPrice = () => {
    let totalPrice = 0;
    const basePrices = { basic: 1, color: 10, letter: 100 };

    console.log('calculateTotalPrice:', { pixelType, basePrices });
    console.log('selectedPixels:', selectionState.selectedPixels);
    console.log('purchasedPixels:', purchasedPixels);

    selectionState.selectedPixels.forEach(pixel => {
      const existingPixel = purchasedPixels.find(p => p.x === pixel.x && p.y === pixel.y);
      console.log('Processing pixel:', pixel, 'existingPixel:', existingPixel);

      if (existingPixel) {
        // Pixel already exists - use 2x last sold price
        const pixelPrice = existingPixel.sats * 2;
        totalPrice += pixelPrice;
        console.log('Existing pixel price:', pixelPrice, 'total so far:', totalPrice);
      } else {
        // New pixel - use base price for selected type
        const pixelPrice = basePrices[pixelType];
        totalPrice += pixelPrice;
        console.log('New pixel price:', pixelPrice, 'total so far:', totalPrice);
      }
    });

    console.log('Final total price:', totalPrice);
    return totalPrice;
  };

  const totalPrice = calculateTotalPrice();

  const handleCreatePayment = async () => {
    console.log('handleCreatePayment called with selectionState:', selectionState);
    if (!selectionState.selectedPixels.length) {
      console.log('No pixels selected, calling onPaymentError');
      onPaymentError(new Error('No pixels selected'));
      return;
    }

    console.log('Setting loading state to true');
    setIsLoading(true);
    try {
      const isBulk = selectionState.selectedPixels.length > 1;
      const endpoint = isBulk ? '/api/invoices/bulk' : '/api/invoices';

      let payload: any = {};

      if (isBulk) {
        // Bulk payment - rectangle selection
        const { selectedRectangle } = selectionState;
        if (!selectedRectangle) {
          throw new Error('No rectangle selection found');
        }

        payload = {
          x1: selectedRectangle.x1,
          y1: selectedRectangle.y1,
          x2: selectedRectangle.x2,
          y2: selectedRectangle.y2,
          color: pixelType === 'basic' ? null : color,
          letters: pixelType === 'letter' ? letter : undefined
        };
      } else {
        // Single pixel payment
        const pixel = selectionState.selectedPixels[0];
        payload = {
          x: pixel.x,
          y: pixel.y,
          color: pixelType === 'basic' ? null : color,
          letter: pixelType === 'letter' ? letter : undefined
        };
      }

      const response = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (!response.ok) {
        throw new Error(`Payment creation failed: ${response.statusText}`);
      }

      const paymentData = await response.json();
      console.log('Payment data received:', paymentData);
      setPayment(paymentData);
    } catch (error) {
      console.error('Error creating payment:', error);
      onPaymentError(error);
    } finally {
      setIsLoading(false);
    }
  };

  const handlePaymentSuccess = (paymentResult: any) => {
    console.log('Payment successful!', paymentResult);
    onPaymentSuccess(paymentResult);
    setPayment(null);
    onClose();
  };

  const handlePaymentError = (error: any) => {
    console.error('Payment failed:', error);
    onPaymentError(error);
  };

  const handleClose = () => {
    console.log('handleClose called');
    setPayment(null);
    console.log('Calling onClose prop - onClose is:', typeof onClose);
    if (typeof onClose === 'function') {
      onClose();
      console.log('onClose prop called successfully');
    } else {
      console.error('onClose is not a function!');
    }
    console.log('handleClose completed');
  };

  // Auto-create payment when modal opens
  React.useEffect(() => {
    console.log('PaymentModal useEffect:', { isOpen, payment, isLoading });
    if (isOpen) {
      // Always reset and create new payment when modal opens
      console.log('Modal opened, resetting and creating new payment');
      setPayment(null);
      setIsLoading(true);
      handleCreatePayment();
    } else {
      // Reset state when modal closes
      console.log('Modal closed, resetting state');
      setPayment(null);
      setIsLoading(false);
    }
  }, [isOpen]);

  // Don't render anything if modal is not open
  if (!isOpen) {
    console.log('PaymentModal not rendering because isOpen is false');
    return null;
  }

  // Show loading state while creating payment
  if (isLoading) {
    console.log('PaymentModal showing loading state');
    return (
      <div className="payment-modal-overlay">
        <div className="payment-modal">
          <div className="payment-modal-content">
            <div className="loading-state">
              <div className="spinner"></div>
              <p>Creating invoice...</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Let NakaPayModal handle its own modal display
  if (payment) {
    console.log('Rendering NakaPayModal with payment:', payment);

    // Create a custom modal with QR code since NakaPayModal might not be showing it
    return (
      <div
        className="payment-modal-overlay"
        onClick={() => {
          console.log('Overlay clicked');
          onClose();
        }}
      >
        <div
          className="payment-modal"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="payment-modal-header">
            <h3>Lightning Payment</h3>
            <button
              className="close-button"
              onClick={() => {
                console.log('Close button clicked');
                onClose();
              }}
              aria-label="Close payment modal"
            >
              ×
            </button>
          </div>

          <div className="payment-modal-content">
            <div className="payment-summary">
              <div className="summary-item">
                <span>Amount:</span>
                <span className="amount">{payment.amount} sats</span>
              </div>
              <div className="summary-item">
                <span>Payment ID:</span>
                <span>{payment.id}</span>
              </div>
            </div>

            {/* QR Code Section */}
            <div className="qr-section">
              <h4>Scan QR Code</h4>
              <div className="qr-code-container">
                <img
                  src={`https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=${encodeURIComponent(payment.invoice)}`}
                  alt="Lightning Invoice QR Code"
                  className="qr-code-image"
                />
              </div>
            </div>

            {/* Invoice Text Section */}
            <div className="invoice-section">
              <h4>Or Copy Invoice</h4>
              <div className="invoice-text-container">
                <textarea
                  className="invoice-textarea"
                  value={payment.invoice}
                  readOnly
                  onClick={(e) => e.currentTarget.select()}
                />
                <button
                  className="copy-button"
                  onClick={() => {
                    navigator.clipboard.writeText(payment.invoice);
                    alert('Invoice copied to clipboard!');
                  }}
                >
                  Copy
                </button>
              </div>
            </div>

            <div className="payment-instructions">
              <p>Open your Lightning wallet and scan the QR code or paste the invoice to complete the payment.</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return null;
};

export default PaymentModal;
import React, { useState } from 'react';
import ColorPicker from './ColorPicker';
import PaymentModal from './PaymentModal';
import { usePixelPurchase, SelectionState } from '../hooks/usePixelPurchase';

interface PurchasePanelProps {
   collapsed?: boolean;
   onToggle?: () => void;
   selectionState?: SelectionState;
   purchasedPixels?: { x: number; y: number; sats: number }[];
   allPixels?: { x: number; y: number; color?: string; letter?: string; sats: number }[];
 }

const PurchasePanel: React.FC<PurchasePanelProps> = ({
   collapsed,
   onToggle,
   selectionState,
   purchasedPixels = [],
   allPixels = []
 }) => {
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  const [paymentError, setPaymentError] = useState<string | null>(null);

  const {
    state,
    setPixelType,
    setColor,
    setLetter,
    setSelection,
    isValid,
    getDisplayPrice,
    getPriceForType,
    getSelectedPixelCount,
    getEstimatedValue,
    getTotalDisplayPrice
  } = usePixelPurchase();

  // Debug modal state changes
  React.useEffect(() => {
    console.log('PurchasePanel: isPaymentModalOpen changed to:', isPaymentModalOpen);
    console.log('PurchasePanel: selectionState:', selectionState);
    console.log('PurchasePanel: isValid():', isValid());
  }, [isPaymentModalOpen, selectionState, isValid]);

  // Update selection state when props change
  React.useEffect(() => {
    if (selectionState) {
      setSelection(selectionState);
    }
  }, [selectionState, setSelection]);

  // Calculate estimated value
  const estimatedValue = getEstimatedValue(purchasedPixels);
  const selectedCount = selectionState?.pixelCount || 0;

  return (
    <aside
      className={`purchase-panel ${collapsed ? 'collapsed' : ''}`}
      role="complementary"
      aria-label="Purchase panel"
      onClick={collapsed ? onToggle : undefined}
    >
    <div className="panel-header" onClick={collapsed ? onToggle : undefined}>
      <h3>Pixel Purchase</h3>
      {onToggle && !collapsed && (
        <button
          className="toggle-button"
          onClick={onToggle}
          aria-label={collapsed ? 'Expand purchase panel' : 'Collapse purchase panel'}
        >
          {collapsed ? '→' : '←'}
        </button>
      )}
    </div>

    {!collapsed && (
      <>
        <div className="panel-section">
          <div className="pixel-type-selector" role="radiogroup" aria-label="Pixel type selection">
            <button
              className={`type-button ${state.type === 'basic' ? 'active' : ''}`}
              role="radio"
              aria-checked={state.type === 'basic'}
              aria-label="Basic pixel for 1 satoshi"
              onClick={() => setPixelType('basic')}
            >
              Basic ({getPriceForType('basic')})
            </button>
            <button
              className={`type-button ${state.type === 'color' ? 'active' : ''}`}
              role="radio"
              aria-checked={state.type === 'color'}
              aria-label="Color pixel for 10 satoshis"
              onClick={() => setPixelType('color')}
            >
              Color ({getPriceForType('color')})
            </button>
            <button
              className={`type-button ${state.type === 'letter' ? 'active' : ''}`}
              role="radio"
              aria-checked={state.type === 'letter'}
              aria-label="Color plus letter pixel for 100 satoshis"
              onClick={() => setPixelType('letter')}
            >
              Color + Letter ({getPriceForType('letter')})
            </button>
          </div>
        </div>

        {(state.type === 'color' || state.type === 'letter') && (
          <div className="panel-section">
            <h4>Choose Color</h4>
            <ColorPicker
              color={state.color}
              onColorChange={setColor}
              className="purchase-color-picker"
            />
          </div>
        )}

        {state.type === 'letter' && (
          <div className="panel-section">
            <h4>Letter</h4>
            <input
              type="text"
              maxLength={1}
              value={state.letter}
              onChange={(e) => setLetter(e.target.value)}
              placeholder="A"
              className="letter-input"
              aria-label="Single letter for pixel"
            />
          </div>
        )}

        <div className="panel-section">
          <h4>Selected Pixels</h4>
          <div className="selection-summary" role="region" aria-label="Selection summary">
            <div className="summary-item">
              <span>Count:</span>
              <span aria-label="Selected pixel count">{selectedCount}</span>
            </div>
            <div className="summary-item">
              <span>Available:</span>
              <span aria-label="Available pixels to purchase">{estimatedValue.availableCount}</span>
            </div>
            <div className="summary-item">
              <span>Already Purchased:</span>
              <span aria-label="Already purchased pixels">{estimatedValue.purchasedCount}</span>
            </div>
            <div className="summary-item">
              <span>New Pixels Price:</span>
              <span aria-label="Price for new pixels">{estimatedValue.availablePixelsPrice} sats</span>
            </div>
            <div className="summary-item">
              <span>Estimated Total:</span>
              <span aria-label="Estimated total cost in satoshis">{getTotalDisplayPrice(purchasedPixels)}</span>
            </div>
          </div>
        </div>

        <div className="panel-section">
          <div className="price-display">
            <span className="price-label">Per Pixel:</span>
            <span className="price-value">{getDisplayPrice()}</span>
          </div>
          <div className="price-display">
            <span className="price-label">Estimated Total:</span>
            <span className="price-value">{getTotalDisplayPrice(purchasedPixels)}</span>
          </div>
          {paymentError && (
            <div className="error-message" role="alert">
              {paymentError}
            </div>
          )}
          <button
            className="purchase-button"
            disabled={!isValid() || selectedCount === 0}
                  onClick={() => {
              console.log('Purchase button clicked', { isValid: isValid(), selectedCount, selectionState });
              console.log('Current payment modal state:', isPaymentModalOpen);
              console.log('Pixel type from state:', state.type);
              console.log('Pixel color from state:', state.color);
              console.log('Pixel letter from state:', state.letter);
              console.log('Setting payment modal to open...');
              setIsPaymentModalOpen(true);
              console.log('Payment modal state should now be true');
            }}
            aria-describedby="purchase-status"
          >
            Purchase Pixels
          </button>
          <div id="purchase-status" className="sr-only">
            {!isValid()
              ? 'Please select a valid color and letter (if required).'
              : selectedCount === 0
                ? 'Please select pixels to purchase.'
                : 'Ready to purchase pixels.'
            }
          </div>
        </div>
      </>
    )}

    <PaymentModal
      isOpen={isPaymentModalOpen}
      onClose={() => {
        console.log('PurchasePanel onClose called');
        console.log('Current payment modal state before close:', isPaymentModalOpen);
        setIsPaymentModalOpen(false);
        setPaymentError(null);
        console.log('Payment modal state after close should be false');
      }}
      selectionState={selectionState || {
        selectedPixel: null,
        selectedRectangle: null,
        selectedPixels: [],
        pixelCount: 0
      }}
      purchasedPixels={purchasedPixels}
      allPixels={allPixels}
      pixelType={state.type}
      color={state.color}
      letter={state.letter}
      onPaymentSuccess={(payment) => {
        console.log('Payment completed successfully:', payment);
        setPaymentError(null);
        // The payment success will be handled by the webhook
        // which will emit real-time updates via WebSocket
      }}
      onPaymentError={(error) => {
        console.error('Payment failed:', error);
        setPaymentError(error.message || 'Payment failed. Please try again.');
      }}
    />
  </aside>
  );
};

export default PurchasePanel;
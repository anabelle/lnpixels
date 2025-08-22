import React from 'react';
import ColorPicker from './ColorPicker';
import { usePixelPurchase } from '../hooks/usePixelPurchase';

interface PurchasePanelProps {
  collapsed?: boolean;
  onToggle?: () => void;
}

const PurchasePanel: React.FC<PurchasePanelProps> = ({ collapsed, onToggle }) => {
  const { state, setPixelType, setColor, setLetter, isValid, getDisplayPrice, getPriceForType } = usePixelPurchase();

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
              <span aria-label="Selected pixel count">0</span>
            </div>
            <div className="summary-item">
              <span>Total:</span>
              <span aria-label="Total cost in satoshis">0 sats</span>
            </div>
          </div>
        </div>

        <div className="panel-section">
          <div className="price-display">
            <span className="price-label">Price:</span>
            <span className="price-value">{getDisplayPrice()}</span>
          </div>
          <button
            className="purchase-button"
            disabled={!isValid()}
            aria-describedby="purchase-status"
          >
            Generate Invoice
          </button>
          <div id="purchase-status" className="sr-only">
            {!isValid()
              ? 'Please select a valid color and letter (if required).'
              : 'Ready to generate invoice.'
            }
          </div>
        </div>
      </>
    )}
  </aside>
  );
};

export default PurchasePanel;
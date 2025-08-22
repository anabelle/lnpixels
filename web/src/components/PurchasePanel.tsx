import React from 'react';

interface PurchasePanelProps {
  collapsed?: boolean;
  onToggle?: () => void;
}

const PurchasePanel: React.FC<PurchasePanelProps> = ({ collapsed, onToggle }) => (
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
            <button className="type-button active" role="radio" aria-checked="true" aria-label="Basic pixel for 1 satoshi">
              Basic (1 sat)
            </button>
            <button className="type-button" role="radio" aria-checked="false" aria-label="Color pixel for 10 satoshis">
              Color (10 sats)
            </button>
            <button className="type-button" role="radio" aria-checked="false" aria-label="Color plus letter pixel for 100 satoshis">
              Color + Letter (100 sats)
            </button>
          </div>
        </div>

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
          <button className="purchase-button" disabled aria-describedby="purchase-status">
            Generate Invoice
          </button>
          <div id="purchase-status" className="sr-only">
            No pixels selected. Please select pixels to generate an invoice.
          </div>
        </div>
      </>
    )}
  </aside>
);

export default PurchasePanel;
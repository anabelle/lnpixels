import React from 'react';

interface MobileTabsProps {
  activeTab: string;
  onTabChange: (tab: string) => void;
}

const MobileTabs: React.FC<MobileTabsProps> = ({ activeTab, onTabChange }) => (
  <nav className="mobile-tabs" role="tablist" aria-label="Mobile navigation">
    <button
      className={`tab-button ${activeTab === 'canvas' ? 'active' : ''}`}
      role="tab"
      aria-selected={activeTab === 'canvas'}
      aria-controls="canvas-panel"
      onClick={() => onTabChange('canvas')}
    >
      <span>Canvas</span>
    </button>
    <button
      className={`tab-button ${activeTab === 'purchase' ? 'active' : ''}`}
      role="tab"
      aria-selected={activeTab === 'purchase'}
      aria-controls="purchase-panel"
      onClick={() => onTabChange('purchase')}
    >
      <span>Purchase</span>
    </button>
    <button
      className={`tab-button ${activeTab === 'activity' ? 'active' : ''}`}
      role="tab"
      aria-selected={activeTab === 'activity'}
      aria-controls="activity-panel"
      onClick={() => onTabChange('activity')}
    >
      <span>Activity</span>
    </button>
  </nav>
);

export default MobileTabs;
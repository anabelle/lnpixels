import React from 'react';

interface ActivityFeedProps {
  collapsed?: boolean;
  onToggle?: () => void;
}

const ActivityFeed: React.FC<ActivityFeedProps> = ({ collapsed, onToggle }) => (
  <aside
    className={`activity-feed ${collapsed ? 'collapsed' : ''}`}
    role="complementary"
    aria-label="Activity feed"
    onClick={collapsed ? onToggle : undefined}
  >
    <div className="panel-header" onClick={collapsed ? onToggle : undefined}>
      <h3>Recent Activity</h3>
      {onToggle && !collapsed && (
        <button
          className="toggle-button"
          onClick={onToggle}
          aria-label={collapsed ? 'Expand activity feed' : 'Collapse activity feed'}
        >
          {collapsed ? '←' : '→'}
        </button>
      )}
    </div>

    {!collapsed && (
      <div className="panel-section">
        <div className="activity-list" role="log" aria-label="Recent pixel purchases" aria-live="polite">
          <div className="activity-item" role="article">
            <div className="activity-content">
              <span className="activity-text">Pixel (10, 20) purchased</span>
              <time className="activity-time" dateTime="2024-01-01T12:00:00Z">2 min ago</time>
            </div>
          </div>
          <div className="activity-item" role="article">
            <div className="activity-content">
              <span className="activity-text">Rectangle 5×3 purchased</span>
              <time className="activity-time" dateTime="2024-01-01T11:55:00Z">5 min ago</time>
            </div>
          </div>
          <div className="activity-item" role="article">
            <div className="activity-content">
              <span className="activity-text">Pixel (0, 0) updated</span>
              <time className="activity-time" dateTime="2024-01-01T11:52:00Z">8 min ago</time>
            </div>
          </div>
        </div>
      </div>
    )}
  </aside>
);

export default ActivityFeed;
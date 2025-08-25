import React from 'react';
import { useActivity } from '../hooks/useActivity';

interface ActivityFeedProps {
  collapsed?: boolean;
  onToggle?: () => void;
}

const ActivityFeed: React.FC<ActivityFeedProps> = ({ collapsed, onToggle }) => {
  const { activities, loading, error } = useActivity();

  const formatTimeAgo = (timestamp: number) => {
    const now = Date.now();
    const diff = now - timestamp;
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);

    if (days > 0) return `${days}d ago`;
    if (hours > 0) return `${hours}h ago`;
    if (minutes > 0) return `${minutes}m ago`;
    return 'Just now';
  };

  const formatActivityText = (activity: any) => {
    if (activity.type === 'bulk_purchase') {
      return `Rectangle purchased (${activity.x}, ${activity.y})`;
    }
    return `Pixel (${activity.x}, ${activity.y}) ${activity.letter ? `with "${activity.letter}" ` : ''}purchased`;
  };

  return (
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
            {loading && (
              <div className="activity-item">
                <div className="activity-content">
                  <span className="activity-text">Loading activity...</span>
                </div>
              </div>
            )}

            {error && (
              <div className="activity-item">
                <div className="activity-content">
                  <span className="activity-text" style={{ color: '#ff6b6b' }}>
                    Error loading activity: {error}
                  </span>
                </div>
              </div>
            )}

            {!loading && !error && activities.length === 0 && (
              <div className="activity-item">
                <div className="activity-content">
                  <span className="activity-text">No recent activity</span>
                </div>
              </div>
            )}

            {!loading && !error && activities.map((activity) => (
              <div key={`${activity.payment_hash}-${activity.x}-${activity.y}`} className="activity-item" role="article">
                <div className="activity-content">
                  <span className="activity-text">
                    {formatActivityText(activity)}
                  </span>
                  <time
                    className="activity-time"
                    dateTime={new Date(activity.created_at).toISOString()}
                  >
                    {formatTimeAgo(activity.created_at)}
                  </time>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </aside>
  );
};

export default ActivityFeed;
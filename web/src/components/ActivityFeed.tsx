import React from 'react';
import { useActivity } from '../hooks/useActivity';

interface ActivityFeedProps {
  collapsed?: boolean;
  onToggle?: () => void;
}

const ActivityFeed: React.FC<ActivityFeedProps> = ({ collapsed, onToggle }) => {
  const { activities, loading, error } = useActivity();

  const formatTimeAgo = (timestamp: number) => {
    try {
      // Validate timestamp
      if (!timestamp || isNaN(timestamp) || timestamp <= 0) {
        return 'Unknown time';
      }

      const now = Date.now();
      const diff = now - timestamp;

      // Handle negative timestamps (future dates)
      if (diff < 0) {
        return 'Just now';
      }

      const minutes = Math.floor(diff / 60000);
      const hours = Math.floor(diff / 3600000);
      const days = Math.floor(diff / 86400000);

      if (days > 0) return `${days}d ago`;
      if (hours > 0) return `${hours}h ago`;
      if (minutes > 0) return `${minutes}m ago`;
      return 'Just now';
    } catch (error) {
      console.error('Error formatting time:', error, timestamp);
      return 'Unknown time';
    }
  };

  const formatActivityText = (activity: any) => {
    try {
      const x = activity.x || 0;
      const y = activity.y || 0;
      const letter = activity.letter;

      if (activity.type === 'bulk_purchase') {
        return `Rectangle purchased (${x}, ${y})`;
      }
      return `Pixel (${x}, ${y}) ${letter ? `with "${letter}" ` : ''}purchased`;
    } catch (error) {
      console.error('Error formatting activity text:', error, activity);
      return 'Unknown activity';
    }
  };

  const renderPixelIndicator = (activity: any) => {
    const color = activity.color || '#ffffff';

    return (
      <span
        className="pixel-indicator"
        style={{
          display: 'inline-block',
          width: '12px',
          height: '12px',
          backgroundColor: color,
          border: '1px solid var(--border-primary)',
          borderRadius: '2px',
          marginRight: '4px',
          verticalAlign: 'middle',
          flexShrink: 0
        }}
        title={`Color: ${color}`}
      />
    );
  };

  const formatSatsPrice = (sats: number) => {
    if (sats === 1) {
      return '1 sat';
    }
    return `${sats} sats`;
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

            {!loading && !error && activities.map((activity) => {
              // Validate activity data
              if (!activity || typeof activity !== 'object') {
                console.warn('Invalid activity data:', activity);
                return null;
              }

              const key = `${activity.payment_hash || 'unknown'}-${activity.x || 0}-${activity.y || 0}`;

                return (
                  <div key={key} className="activity-item" role="article">
                    <div className="activity-content">
                      <div className="activity-text-container">
                        {renderPixelIndicator(activity)}
                        <span className="activity-text">
                          {formatActivityText(activity)}
                        </span>
                      </div>
                      <span className="activity-price">
                        {formatSatsPrice(activity.sats)}
                      </span>
                      <time
                        className="activity-time"
                        dateTime={
                          activity.created_at && !isNaN(activity.created_at) && activity.created_at > 0
                            ? new Date(activity.created_at).toISOString()
                            : new Date().toISOString()
                        }
                      >
                        {formatTimeAgo(activity.created_at)}
                      </time>
                    </div>
                  </div>
                );
            }).filter(Boolean)}
          </div>
        </div>
      )}
    </aside>
  );
};

export default ActivityFeed;
import { useState, useEffect } from 'react';

export interface ActivityItem {
  id?: number;
  x: number;
  y: number;
  color: string;
  letter?: string;
  sats: number;
  created_at: number;
  payment_hash: string;
  event_id?: string;
  type: string;
}

export const useActivity = () => {
  const [activities, setActivities] = useState<ActivityItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Fetch initial activity data
  const fetchActivities = async (limit = 20) => {
    try {
      setLoading(true);
      const response = await fetch(`/api/activity?limit=${limit}`);
      if (!response.ok) {
        throw new Error('Failed to fetch activities');
      }
      const data = await response.json();
      console.log('Fetched activities from API:', data.events);
      setActivities(data.events || []);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch activities');
      console.error('Error fetching activities:', err);
    } finally {
      setLoading(false);
    }
  };

  // Listen for real-time activity updates via custom events
  useEffect(() => {
    console.log('🎧 Setting up activity update listener');

    const handleActivityUpdate = (event: CustomEvent<ActivityItem>) => {
      try {
        const activity = event.detail;
        console.log('🎉 Received activity update via custom event:', activity);
        console.log('Activity created_at:', activity.created_at, typeof activity.created_at);

        // Validate the activity data
        if (!activity || typeof activity.created_at !== 'number' || isNaN(activity.created_at)) {
          console.error('❌ Invalid activity data received:', activity);
          return;
        }

        console.log('✅ Adding activity to state');
        setActivities(prev => [activity, ...prev.slice(0, 19)]); // Keep only 20 most recent
      } catch (error) {
        console.error('❌ Error handling activity update:', error);
      }
    };

    window.addEventListener('activityUpdate', handleActivityUpdate as EventListener);
    console.log('✅ Activity update listener set up');

    return () => {
      window.removeEventListener('activityUpdate', handleActivityUpdate as EventListener);
      console.log('🗑️ Activity update listener removed');
    };
  }, []);

  // Fetch activities on mount
  useEffect(() => {
    fetchActivities();
  }, []);

  return {
    activities,
    loading,
    error,
    refetch: fetchActivities
  };
};
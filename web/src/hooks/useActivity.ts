import { useState, useEffect } from 'react';
import { useSocket } from './useSocket';

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
  const socket = useSocket();

  // Fetch initial activity data
  const fetchActivities = async (limit = 20) => {
    try {
      setLoading(true);
      const response = await fetch(`/api/activity?limit=${limit}`);
      if (!response.ok) {
        throw new Error('Failed to fetch activities');
      }
      const data = await response.json();
      setActivities(data.events || []);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch activities');
      console.error('Error fetching activities:', err);
    } finally {
      setLoading(false);
    }
  };

  // Listen for real-time activity updates
  useEffect(() => {
    if (!socket) return;

    const handleActivityUpdate = (activity: ActivityItem) => {
      console.log('Received activity update:', activity);
      setActivities(prev => [activity, ...prev.slice(0, 19)]); // Keep only 20 most recent
    };

    socket.on('activity.append', handleActivityUpdate);

    return () => {
      socket.off('activity.append', handleActivityUpdate);
    };
  }, [socket]);

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
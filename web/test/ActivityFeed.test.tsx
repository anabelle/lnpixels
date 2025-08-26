import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import ActivityFeed from '../src/components/ActivityFeed';
import { useActivity } from '../src/hooks/useActivity';

// Mock the useActivity hook
vi.mock('../src/hooks/useActivity', () => ({
  useActivity: vi.fn(),
}));

const mockUseActivity = vi.mocked(useActivity);

describe('ActivityFeed', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should display sats price in activity cards', () => {
    // Mock activity data with sats prices
    const mockActivities = [
      {
        id: 1,
        x: 10,
        y: 20,
        color: '#ff0000',
        letter: 'A',
        sats: 5,
        created_at: Date.now() - 1000,
        payment_hash: 'hash1',
        type: 'single_purchase'
      },
      {
        id: 2,
        x: 15,
        y: 25,
        color: '#00ff00',
        letter: null,
        sats: 1,
        created_at: Date.now() - 2000,
        payment_hash: 'hash2',
        type: 'single_purchase'
      }
    ];

    mockUseActivity.mockReturnValue({
      activities: mockActivities,
      loading: false,
      error: null,
      refetch: vi.fn()
    });

    render(<ActivityFeed />);

    // Check that activity text is displayed
    expect(screen.getByText('Pixel (10, 20) with "A" purchased')).toBeInTheDocument();
    expect(screen.getByText('Pixel (15, 25) purchased')).toBeInTheDocument();

    // Check that sats prices are displayed
    expect(screen.getByText('5 sats')).toBeInTheDocument();
    expect(screen.getByText('1 sat')).toBeInTheDocument();
  });

  it('should handle bulk purchases with total sats', () => {
    const mockActivities = [
      {
        id: 1,
        x: 5,
        y: 5,
        color: '#0000ff',
        letter: null,
        sats: 25,
        created_at: Date.now() - 1000,
        payment_hash: 'hash3',
        type: 'bulk_purchase'
      }
    ];

    mockUseActivity.mockReturnValue({
      activities: mockActivities,
      loading: false,
      error: null,
      refetch: vi.fn()
    });

    render(<ActivityFeed />);

    // Check that bulk purchase text is displayed
    expect(screen.getByText('Rectangle purchased (5, 5)')).toBeInTheDocument();

    // Check that total sats is displayed
    expect(screen.getByText('25 sats')).toBeInTheDocument();
  });

  it('should handle loading state', () => {
    mockUseActivity.mockReturnValue({
      activities: [],
      loading: true,
      error: null,
      refetch: vi.fn()
    });

    render(<ActivityFeed />);

    expect(screen.getByText('Loading activity...')).toBeInTheDocument();
  });

  it('should handle error state', () => {
    mockUseActivity.mockReturnValue({
      activities: [],
      loading: false,
      error: 'Failed to load activities',
      refetch: vi.fn()
    });

    render(<ActivityFeed />);

    expect(screen.getByText('Error loading activity: Failed to load activities')).toBeInTheDocument();
  });

  it('should handle empty activities', () => {
    mockUseActivity.mockReturnValue({
      activities: [],
      loading: false,
      error: null,
      refetch: vi.fn()
    });

    render(<ActivityFeed />);

    expect(screen.getByText('No recent activity')).toBeInTheDocument();
  });
});
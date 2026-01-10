import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { correlatorClient, CorrelatorClient } from '../src/services/correlator';
import { Narrative, EconomicEvent } from '../src/types/correlator';

describe('CorrelatorClient', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  describe('constructor', () => {
    it('should use default URL if not provided', () => {
      const client = new CorrelatorClient();
      expect(client).toBeDefined();
    });

    it('should use provided URL', () => {
      const client = new CorrelatorClient('http://custom-url:3000');
      expect(client).toBeDefined();
    });
  });

  describe('analyzeCorrelations', () => {
    it('should successfully analyze correlations', async () => {
      const mockResponse = {
        success: true,
        data: {
          newCorrelations: 5,
          correlations: [],
          stats: { total: 10 },
          insights: ['Test insight']
        }
      };

      global.fetch = vi.fn().mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse
      } as Response);

      const result = await correlatorClient.analyzeCorrelations({
        narratives: [],
        economicEvents: []
      });

      expect(result.success).toBe(true);
      expect(result.data?.newCorrelations).toBe(5);
      expect(fetch).toHaveBeenCalledWith(
        expect.stringContaining('/correlations/analyze'),
        expect.objectContaining({
          method: 'POST',
          headers: { 'Content-Type': 'application/json' }
        })
      );
    });

    it('should handle fetch errors gracefully', async () => {
      global.fetch = vi.fn().mockRejectedValueOnce(new Error('Network error'));

      const result = await correlatorClient.analyzeCorrelations({
        narratives: [],
        economicEvents: []
      });

      expect(result.success).toBe(false);
      expect(result.error).toContain('Failed to analyze correlations');
    });

    it('should handle non-OK responses', async () => {
      global.fetch = vi.fn().mockResolvedValueOnce({
        ok: false,
        status: 500,
        text: async () => 'Internal Server Error'
      } as Response);

      const result = await correlatorClient.analyzeCorrelations({
        narratives: [],
        economicEvents: []
      });

      expect(result.success).toBe(false);
      expect(result.error).toContain('500');
    });

    it('should send correct request body', async () => {
      const narratives: Narrative[] = [
        {
          id: 'test-1',
          tags: ['test'],
          content: 'Test narrative',
          importance: 'medium'
        }
      ];

      const economicEvents: EconomicEvent[] = [
        {
          type: 'payment',
          amountSats: 100,
          timestamp: '2024-01-01T00:00:00Z'
        }
      ];

      global.fetch = vi.fn().mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true, data: { newCorrelations: 0, correlations: [], stats: {}, insights: [] } })
      } as Response);

      await correlatorClient.analyzeCorrelations({ narratives, economicEvents });

      expect(fetch).toHaveBeenCalledWith(
        expect.stringContaining('/correlations/analyze'),
        expect.objectContaining({
          body: JSON.stringify({ narratives, economicEvents })
        })
      );
    });
  });

  describe('getHealth', () => {
    it('should return health status when service is healthy', async () => {
      const mockHealth = {
        status: 'healthy',
        uptime: 123456,
        timestamp: '2024-01-01T00:00:00.000Z'
      };

      global.fetch = vi.fn().mockResolvedValueOnce({
        ok: true,
        json: async () => mockHealth
      } as Response);

      const result = await correlatorClient.getHealth();

      expect(result).toEqual(mockHealth);
      expect(fetch).toHaveBeenCalledWith(
        expect.stringContaining('/correlations/health')
      );
    });

    it('should return null on fetch error', async () => {
      global.fetch = vi.fn().mockRejectedValueOnce(new Error('Network error'));

      const result = await correlatorClient.getHealth();

      expect(result).toBeNull();
    });

    it('should return null on non-OK response', async () => {
      global.fetch = vi.fn().mockResolvedValueOnce({
        ok: false
      } as Response);

      const result = await correlatorClient.getHealth();

      expect(result).toBeNull();
    });
  });
});

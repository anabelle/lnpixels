import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { narrativeScheduler } from '../src/services/scheduler';

describe('NarrativeCorrelatorScheduler', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    vi.useFakeTimers();
  });

  afterEach(() => {
    narrativeScheduler.stop();
    vi.restoreAllMocks();
  });

  describe('constructor', () => {
    it('should initialize with default state', () => {
      const state = narrativeScheduler.getState();
      expect(state).toBeDefined();
      expect(state.totalRuns).toBe(0);
      expect(state.totalNarrativesExtracted).toBe(0);
      expect(state.totalEconomicEventsExtracted).toBe(0);
      expect(state.totalCorrelationsGenerated).toBe(0);
    });
  });

  describe('initialize', () => {
    it('should initialize PostgreSQL connection', async () => {
      const mockClient = {
        connect: vi.fn().mockResolvedValue(undefined)
      };

      vi.doMock('pg', () => ({
        Client: vi.fn(() => mockClient)
      }));

      expect(async () => {
        await narrativeScheduler.initialize();
      }).not.toThrow();
    });
  });

  describe('start and stop', () => {
    it('should start scheduler', () => {
      narrativeScheduler.start();
      expect(narrativeScheduler).toBeDefined();
    });

    it('should stop scheduler', () => {
      narrativeScheduler.start();
      narrativeScheduler.stop();
      expect(narrativeScheduler).toBeDefined();
    });

    it('should not start if already running', () => {
      const warnSpy = vi.spyOn(console, 'warn');
      narrativeScheduler.start();
      narrativeScheduler.start();

      expect(warnSpy).toHaveBeenCalledWith(expect.stringContaining('already running'));
    });
  });

  describe('getState', () => {
    it('should return current state', () => {
      const state = narrativeScheduler.getState();
      expect(state).toHaveProperty('lastRun');
      expect(state).toHaveProperty('totalRuns');
      expect(state).toHaveProperty('totalNarrativesExtracted');
      expect(state).toHaveProperty('totalEconomicEventsExtracted');
      expect(state).toHaveProperty('totalCorrelationsGenerated');
    });
  });
});

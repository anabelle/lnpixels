import { Client } from 'pg';
import { correlatorClient } from './correlator';
import { Narrative, EconomicEvent } from '../types/correlator';
import { AgentMemory } from '../types/correlator';

const POSTGRES_URL = process.env.POSTGRES_URL || 'postgresql://postgres:postgres@postgres:5432/pixel_agent';
const API_URL = process.env.API_URL || 'http://localhost:3000/api';
const JOB_INTERVAL_MS = 2 * 60 * 60 * 1000; // 2 hours

interface JobState {
  lastRun: string;
  totalRuns: number;
  totalNarrativesExtracted: number;
  totalEconomicEventsExtracted: number;
  totalCorrelationsGenerated: number;
}

class NarrativeCorrelatorScheduler {
  private interval: NodeJS.Timeout | null = null;
  private state: JobState;
  private pgClient: Client | null = null;

  constructor() {
    this.state = {
      lastRun: new Date().toISOString(),
      totalRuns: 0,
      totalNarrativesExtracted: 0,
      totalEconomicEventsExtracted: 0,
      totalCorrelationsGenerated: 0,
    };
  }

  async initialize(): Promise<void> {
    console.log('[Scheduler] Initializing narrative correlator scheduler...');

    try {
      this.pgClient = new Client({ connectionString: POSTGRES_URL });
      await this.pgClient.connect();
      console.log('[Scheduler] Connected to PostgreSQL database');
    } catch (error: any) {
      console.error('[Scheduler] Failed to connect to PostgreSQL:', error.message);
      console.error('[Scheduler] Scheduler will run without narrative extraction');
    }
  }

  async extractNarratives(): Promise<Narrative[]> {
    if (!this.pgClient) {
      console.warn('[Scheduler] PostgreSQL client not initialized, skipping narrative extraction');
      return [];
    }

    const narratives: Narrative[] = [];

    try {
      const query = `
        SELECT id, content, created_at
        FROM memories
        WHERE content->>'type' IN ('emerging_story', 'daily_report', 'narrative_weekly', 'hourly_digest')
        AND created_at > NOW() - INTERVAL '24 hours'
        ORDER BY created_at DESC
        LIMIT 100
      `;

      const result = await this.pgClient.query(query);
      console.log(`[Scheduler] Found ${result.rows.length} narrative memories in database`);

      for (const row of result.rows) {
        const content = row.content;
        const data = content?.data;

        if (!data) continue;

        let narrative: Narrative;

        if (content.type === 'emerging_story') {
          narrative = {
            id: row.id,
            tags: data.topics || [data.topic],
            content: `Emerging story: ${data.topic} - ${data.mentions} mentions, ${data.uniqueUsers} unique users`,
            summary: data.topic,
            importance: 'medium',
            score: data.mentions,
            timestamp: data.timestamp || row.created_at,
          };
        } else if (content.type === 'daily_report') {
          narrative = {
            id: row.id,
            tags: data.summary?.topTopics?.map((t: any) => t.topic) || [],
            content: `Daily report: ${data.date} - ${data.summary.activeUsers} active users, ${data.summary.totalEvents} events`,
            summary: `Daily report for ${data.date}`,
            importance: 'high',
            timestamp: row.created_at,
          };
        } else if (content.type === 'narrative_weekly') {
          narrative = {
            id: row.id,
            tags: data.topTopics?.map((t: any) => t.topic) || [],
            content: `Weekly narrative: ${data.startDate} to ${data.endDate} - ${data.totalEvents} events, ${data.uniqueUsers} users`,
            summary: `Weekly narrative report ${data.startDate} to ${data.endDate}`,
            importance: 'high',
            timestamp: row.created_at,
          };
        } else if (content.type === 'hourly_digest') {
          narrative = {
            id: row.id,
            tags: data.topics || [],
            content: `Hourly digest: ${data.summary || 'No summary available'}`,
            summary: 'Hourly narrative digest',
            importance: 'low',
            timestamp: row.created_at,
          };
        } else {
          continue;
        }

        narratives.push(narrative);
      }

      console.log(`[Scheduler] Extracted ${narratives.length} narratives from database`);
    } catch (error: any) {
      console.error('[Scheduler] Error extracting narratives:', error.message);
    }

    return narratives;
  }

  async extractEconomicEvents(): Promise<EconomicEvent[]> {
    const events: EconomicEvent[] = [];

    try {
      const response = await fetch(`${API_URL}/activity?limit=50`);

      if (!response.ok) {
        throw new Error(`API returned ${response.status}: ${response.statusText}`);
      }

      const data: any = await response.json();
      
      if (data.events && Array.isArray(data.events)) {
        for (const event of data.events) {
          if (event.sats && event.type) {
            events.push({
              type: event.type === 'single_purchase' || event.type === 'bulk_purchase' ? 'payment' : 'expense',
              amountSats: event.sats || event.totalSats || 0,
              timestamp: new Date(event.created_at).toISOString(),
              context: event.type,
              decision: event.summary || `Pixel at (${event.x}, ${event.y})`,
            });
          }
        }
      }

      console.log(`[Scheduler] Extracted ${events.length} economic events from API`);
    } catch (error: any) {
      console.error('[Scheduler] Error extracting economic events:', error.message);
    }

    return events;
  }

  async runJob(): Promise<void> {
    console.log('[Scheduler] Running narrative correlator job...');
    const startTime = Date.now();

    try {
      const health = await correlatorClient.getHealth();
      if (!health) {
        console.warn('[Scheduler] Correlator service is not healthy, skipping job');
        return;
      }

      console.log('[Scheduler] Correlator health:', health);

      const narratives = await this.extractNarratives();
      const economicEvents = await this.extractEconomicEvents();

      if (narratives.length === 0 && economicEvents.length === 0) {
        console.log('[Scheduler] No data to analyze - job complete');
        this.state.lastRun = new Date().toISOString();
        this.state.totalRuns += 1;
        return;
      }

      const result = await correlatorClient.analyzeCorrelations({
        narratives,
        economicEvents,
      });

      if (result.success && result.data) {
        this.state.totalNarrativesExtracted += narratives.length;
        this.state.totalEconomicEventsExtracted += economicEvents.length;
        this.state.totalCorrelationsGenerated += result.data.newCorrelations;
        this.state.totalRuns += 1;

        console.log('[Scheduler] Job successful:');
        console.log(`  - Narratives: ${narratives.length}`);
        console.log(`  - Economic events: ${economicEvents.length}`);
        console.log(`  - New correlations: ${result.data.newCorrelations}`);
        console.log(`  - Insights: ${result.data.insights.length}`);

        if (result.data.insights.length > 0) {
          console.log('[Scheduler] Insights:');
          result.data.insights.forEach((insight, i) => {
            console.log(`  ${i + 1}. ${insight}`);
          });
        }
      } else {
        console.error('[Scheduler] Job failed:', result.error);
      }

      this.state.lastRun = new Date().toISOString();

      const elapsed = Date.now() - startTime;
      console.log(`[Scheduler] Job completed in ${(elapsed / 1000).toFixed(2)}s`);
    } catch (error: any) {
      console.error('[Scheduler] Fatal error in job:', error.message);
    }
  }

  start(): void {
    if (this.interval) {
      console.warn('[Scheduler] Scheduler already running');
      return;
    }

    console.log(`[Scheduler] Starting scheduler with ${JOB_INTERVAL_MS / 1000 / 60 / 60} hour interval`);

    this.initialize().then(() => {
      this.runJob();

      this.interval = setInterval(() => {
        this.runJob();
      }, JOB_INTERVAL_MS);

      console.log('[Scheduler] Scheduler started successfully');
    }).catch((error) => {
      console.error('[Scheduler] Failed to start scheduler:', error);
    });
  }

  stop(): void {
    if (this.interval) {
      clearInterval(this.interval);
      this.interval = null;
      console.log('[Scheduler] Scheduler stopped');
    }

    if (this.pgClient) {
      this.pgClient.end().catch((error: any) => {
        console.error('[Scheduler] Error closing PostgreSQL connection:', error);
      });
    }
  }

  getState(): JobState {
    return { ...this.state };
  }
}

export const narrativeScheduler = new NarrativeCorrelatorScheduler();

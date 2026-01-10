import { CorrelationRequest, CorrelationResponse } from '../types/correlator';

const CORRELATOR_URL = process.env.CORRELATOR_URL || 'http://narrative-correlator:3004';

export class CorrelatorClient {
  private baseUrl: string;

  constructor(baseUrl?: string) {
    this.baseUrl = baseUrl || CORRELATOR_URL;
  }

  async analyzeCorrelations(request: CorrelationRequest): Promise<CorrelationResponse> {
    try {
      const response = await fetch(`${this.baseUrl}/correlations/analyze`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(request),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Correlator returned ${response.status}: ${errorText}`);
      }

      const result = await response.json() as CorrelationResponse;
      return result;
    } catch (error: any) {
      console.error('[CorrelatorClient] Error analyzing correlations:', error);
      return {
        success: false,
        error: error.message || 'Failed to analyze correlations',
      };
    }
  }

  async getHealth(): Promise<{ status: string; uptime: number; timestamp: string } | null> {
    try {
      const response = await fetch(`${this.baseUrl}/correlations/health`);
      if (!response.ok) {
        return null;
      }
      return await response.json() as { status: string; uptime: number; timestamp: string };
    } catch (error) {
      console.error('[CorrelatorClient] Error checking health:', error);
      return null;
    }
  }
}

export const correlatorClient = new CorrelatorClient();

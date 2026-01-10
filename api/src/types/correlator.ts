export interface Narrative {
  id: string;
  tags: string[];
  content: string;
  summary?: string;
  importance?: 'low' | 'medium' | 'high';
  score?: number;
  timestamp?: string;
}

export interface EconomicEvent {
  type: 'zap_in' | 'zap_out' | 'expense' | 'payment' | 'tip';
  amountSats: number;
  timestamp: string;
  context?: string;
  decision?: string;
}

export interface CorrelationRequest {
  narratives: Narrative[];
  economicEvents: EconomicEvent[];
}

export interface CorrelationResponse {
  success: boolean;
  data?: {
    newCorrelations: number;
    correlations: any[];
    stats: any;
    insights: string[];
  };
  error?: string;
}

export interface AgentMemory {
  id: string;
  content: {
    type: string;
    data?: any;
    summary?: any;
    date?: string;
    startDate?: string;
    endDate?: string;
    topics?: string[];
    topTopics?: any[];
    totalEvents?: number;
    uniqueUsers?: number;
    activeUsers?: number;
    timestamp?: string;
  };
  created_at: Date;
}

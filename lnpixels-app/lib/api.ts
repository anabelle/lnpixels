const API_BASE_URL = 'http://localhost:3000/api';

export interface Pixel {
  x: number;
  y: number;
  color: string;
  letter?: string;
  sats?: number;
}

export interface InvoiceResponse {
  invoice: string;
  payment_hash: string;
  amount: number;
  id: string;
  isMock: boolean;
  pixelCount?: number;
  quoteId?: string;
}

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

export class ApiClient {
  private baseUrl: string;

  constructor(baseUrl: string = API_BASE_URL) {
    this.baseUrl = baseUrl;
  }

  private async request<T>(endpoint: string, options?: RequestInit): Promise<T> {
    const url = `${this.baseUrl}${endpoint}`;
    const response = await fetch(url, {
      headers: {
        'Content-Type': 'application/json',
        ...options?.headers,
      },
      ...options,
    });

    if (!response.ok) {
      throw new Error(`API request failed: ${response.status} ${response.statusText}`);
    }

    return response.json();
  }

  // Get pixels within a rectangle
  async getPixels(x1: number, y1: number, x2: number, y2: number): Promise<Pixel[]> {
    return this.request<Pixel[]>(`/pixels?x1=${x1}&y1=${y1}&x2=${x2}&y2=${y2}`);
  }

  // Create invoice for single pixel purchase
  async createInvoice(x: number, y: number, color: string, letter?: string): Promise<InvoiceResponse> {
    return this.request<InvoiceResponse>('/invoices', {
      method: 'POST',
      body: JSON.stringify({ x, y, color, letter }),
    });
  }

  // Create bulk invoice for rectangle purchase
  async createBulkInvoice(
    x1: number,
    y1: number,
    x2: number,
    y2: number,
    color: string,
    letters?: string[]
  ): Promise<InvoiceResponse> {
    return this.request<InvoiceResponse>('/invoices/bulk', {
      method: 'POST',
      body: JSON.stringify({ x1, y1, x2, y2, color, letters }),
    });
  }

  // Create bulk invoice for specific set of pixels
  async createPixelsInvoice(pixels: Pixel[]): Promise<InvoiceResponse> {
    return this.request<InvoiceResponse>('/invoices/pixels', {
      method: 'POST',
      body: JSON.stringify({ pixels }),
    });
  }

  // Get activity feed
  async getActivity(limit?: number): Promise<ActivityItem[]> {
    const query = limit ? `?limit=${limit}` : '';
    const data = await this.request<{ events: ActivityItem[] }>(`/activity${query}`);
    return Array.isArray((data as any)?.events) ? (data as any).events : [];
  }

  // Verify payment event
  async verifyEvent(eventId: string): Promise<any> {
    return this.request(`/verify/${eventId}`);
  }
}

export const apiClient = new ApiClient();

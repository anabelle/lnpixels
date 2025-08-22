// API service for communicating with the backend
function getApiBaseUrl(): string {
  // Check for environment variable first (for custom deployments)
  if (import.meta.env.VITE_API_BASE_URL) {
    return import.meta.env.VITE_API_BASE_URL;
  }

  // Use relative path for both development and production
  // nginx will proxy /api requests to the backend server
  return '/api';
}

const API_BASE_URL = getApiBaseUrl();

// Log the API URL for debugging
console.log('API Base URL:', API_BASE_URL);

export interface Pixel {
  x: number;
  y: number;
  color: string;
  letter?: string;
  sats: number;
  created_at?: number;
}

export interface Rectangle {
  x1: number;
  y1: number;
  x2: number;
  y2: number;
}

export interface ApiError {
  error: string;
}

/**
 * Test API connection
 */
export async function testApiConnection(): Promise<boolean> {
  try {
    const response = await fetch('/api/', {
      method: 'GET',
    });
    return response.ok;
  } catch (error) {
    console.error('API connection test failed:', error);
    return false;
  }
}

/**
 * Fetch pixels within a specified rectangle
 */
export async function fetchPixels(rect: Rectangle): Promise<Pixel[]> {
  try {
    const url = `${API_BASE_URL}/pixels?x1=${rect.x1}&y1=${rect.y1}&x2=${rect.x2}&y2=${rect.y2}`;
    console.log('Fetching pixels from:', url);

    const response = await fetch(url);

    if (!response.ok) {
      let errorMessage = `HTTP ${response.status}: ${response.statusText}`;
      try {
        const errorData: ApiError = await response.json();
        errorMessage = errorData.error || errorMessage;
      } catch (parseError) {
        // If we can't parse the error response, use the status text
      }
      throw new Error(`Failed to fetch pixels: ${errorMessage}`);
    }

    const pixels: Pixel[] = await response.json();
    console.log(`Fetched ${pixels.length} pixels`);
    return pixels;
  } catch (error) {
    console.error('Error fetching pixels:', error);
    throw error;
  }
}

/**
 * Create an invoice for pixel purchase
 */
export async function createInvoice(options: {
  x: number;
  y: number;
  color?: string;
  letter?: string;
}): Promise<{ invoice: string; payment_hash: string }> {
  try {
    const response = await fetch(`${API_BASE_URL}/invoices`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(options),
    });

    if (!response.ok) {
      const errorData: ApiError = await response.json();
      throw new Error(errorData.error || 'Failed to create invoice');
    }

    return await response.json();
  } catch (error) {
    console.error('Error creating invoice:', error);
    throw error;
  }
}

/**
 * Create a bulk invoice for rectangle purchase
 */
export async function createBulkInvoice(options: {
  rect: Rectangle;
  letters?: string;
}): Promise<{ invoice: string; payment_hash: string }> {
  try {
    const response = await fetch(`${API_BASE_URL}/invoices/bulk`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(options),
    });

    if (!response.ok) {
      const errorData: ApiError = await response.json();
      throw new Error(errorData.error || 'Failed to create bulk invoice');
    }

    return await response.json();
  } catch (error) {
    console.error('Error creating bulk invoice:', error);
    throw error;
  }
}
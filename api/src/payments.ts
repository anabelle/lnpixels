import { NakaPay } from 'nakapay-sdk';
import crypto from 'crypto';

export interface PaymentsAdapter {
  createInvoice(amount: number, description: string, metadata?: any): Promise<{
    id: string;
    invoice: string;
    payment_hash: string;
  }>;
  verifyWebhook(rawBody: string, signature: string): boolean;
}

export class NakaPayAdapter implements PaymentsAdapter {
  private nakaPay: NakaPay;
  private processedNonces: Set<string> = new Set();
  private readonly MAX_AGE = 300; // 5 minutes
  private readonly CLEANUP_INTERVAL = 60000; // 1 minute

  constructor() {
    const apiKey = process.env.NAKAPAY_API_KEY;
    console.log('Initializing NakaPay with API key:', apiKey ? '***' + apiKey.slice(-4) : 'NOT FOUND');
    if (!apiKey) {
      throw new Error('NAKAPAY_API_KEY environment variable is required');
    }
    this.nakaPay = new NakaPay(apiKey);
    console.log('NakaPay initialized successfully');
    
    // Cleanup old nonces periodically
    setInterval(() => this.cleanupOldNonces(), this.CLEANUP_INTERVAL);
  }

  private cleanupOldNonces() {
    // Nonces are stored with timestamps in a Map for better cleanup
    // For now, we'll implement a simpler version that just clears occasionally
    if (this.processedNonces.size > 10000) {
      this.processedNonces.clear();
      console.log('Cleared processed nonces due to size limit');
    }
  }

  async createInvoice(amount: number, description: string, metadata?: any) {
    try {
      console.log('Creating invoice with NakaPay:', { amount, description, metadata });
      const paymentRequest = await this.nakaPay.createPaymentRequest({
        amount,
        description,
        destinationWallet: process.env.NAKAPAY_DESTINATION_WALLET || '',
        metadata
      });

      console.log('Invoice created successfully:', paymentRequest);
      return {
        id: paymentRequest.id,
        invoice: paymentRequest.invoice,
        payment_hash: paymentRequest.id // Using id as payment_hash for now
      };
    } catch (error: any) {
      console.error('NakaPay error:', error);
      throw new Error(`Failed to create invoice: ${error.message}`);
    }
  }

  verifyWebhook(rawBody: string, signature: string): boolean {
    const secret = process.env.NAKAPAY_WEBHOOK_SECRET;
    if (!secret) {
      console.error('NAKAPAY_WEBHOOK_SECRET environment variable is required');
      return false;
    }

    try {
      // Parse payload for replay protection
      const payload = JSON.parse(rawBody);
      
      // Check timestamp (prevent replay attacks)
      // NakaPay sends ISO string timestamp like "2025-05-06T11:30:00.000Z"
      if (payload.timestamp) {
        const webhookTime = new Date(payload.timestamp).getTime() / 1000;
        const now = Math.floor(Date.now() / 1000);
        if (now - webhookTime > this.MAX_AGE) {
          console.error(`Webhook timestamp too old: ${payload.timestamp}, current: ${now}`);
          return false;
        }
      }
      // Note: timestamp check is optional - signature is the primary security

      // Check payment_id for duplicate processing (NakaPay's idempotency key)
      if (payload.payment_id) {
        if (this.processedNonces.has(payload.payment_id)) {
          console.error(`Duplicate payment_id detected: ${payload.payment_id}`);
          return false;
        }
        this.processedNonces.add(payload.payment_id);
      }

      const expectedSignature = crypto
        .createHmac('sha256', secret)
        .update(rawBody)
        .digest('hex');

      // NakaPay sends signature as hex string, compare directly
      // Handle both hex-encoded and raw signature formats
      const sigBuffer = Buffer.from(signature, 'hex').length === signature.length / 2
        ? Buffer.from(signature, 'hex')
        : Buffer.from(signature);
      const expectedBuffer = Buffer.from(expectedSignature, 'hex');

      // Check if signatures have the same length before using timingSafeEqual
      if (sigBuffer.length !== expectedBuffer.length) {
        console.error(`Signature length mismatch: got ${sigBuffer.length}, expected ${expectedBuffer.length}`);
        return false;
      }

      return crypto.timingSafeEqual(sigBuffer, expectedBuffer);
    } catch (error) {
      console.error('NakaPay webhook verification error:', error);
      return false;
    }
  }
}

// For testing purposes
export class MockPaymentsAdapter implements PaymentsAdapter {
  async createInvoice(amount: number, description: string, metadata?: any) {
    return {
      id: `mock_${Date.now()}`,
      invoice: `lnbc${amount}...`, // Mock invoice
      payment_hash: `hash_${Date.now()}`
    };
  }

  verifyWebhook(rawBody: string, signature: string): boolean {
    return true; // Mock always returns true
  }
}
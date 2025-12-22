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
      if (!payload.timestamp) {
        console.error('Missing timestamp in webhook payload');
        return false;
      }
      
      const now = Math.floor(Date.now() / 1000);
      if (now - payload.timestamp > this.MAX_AGE) {
        console.error(`Webhook timestamp too old: ${payload.timestamp}, current: ${now}`);
        return false;
      }

      // Check nonce (prevent duplicate processing)
      if (payload.nonce) {
        if (this.processedNonces.has(payload.nonce)) {
          console.error(`Duplicate nonce detected: ${payload.nonce}`);
          return false;
        }
        this.processedNonces.add(payload.nonce);
      }

      const expectedSignature = crypto
        .createHmac('sha256', secret)
        .update(rawBody)
        .digest('hex');

      // Check if signatures have the same length before using timingSafeEqual
      if (signature.length !== expectedSignature.length) {
        return false;
      }

      return crypto.timingSafeEqual(
        Buffer.from(signature, 'hex'),
        Buffer.from(expectedSignature, 'hex')
      );
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
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

  constructor() {
    const apiKey = process.env.NAKAPAY_API_KEY;
    console.log('Initializing NakaPay with API key:', apiKey ? '***' + apiKey.slice(-4) : 'NOT FOUND');
    if (!apiKey) {
      throw new Error('NAKAPAY_API_KEY environment variable is required');
    }
    this.nakaPay = new NakaPay(apiKey);
    console.log('NakaPay initialized successfully');
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
    } catch (error) {
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
      console.error('Error verifying webhook signature:', error);
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
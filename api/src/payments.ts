import { NakaPay } from 'nakapay-sdk';

export interface PaymentsAdapter {
  createInvoice(amount: number, description: string, metadata?: any): Promise<{
    id: string;
    invoice: string;
    payment_hash: string;
  }>;
  verifyWebhook(payload: any, signature: string): boolean;
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

  verifyWebhook(payload: any, signature: string): boolean {
    // TODO: Implement webhook signature verification
    // This should verify the webhook signature from NakaPay
    return true; // Placeholder
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

  verifyWebhook(payload: any, signature: string): boolean {
    return true;
  }
}
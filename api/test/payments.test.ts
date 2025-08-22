import { describe, it, expect, beforeEach } from 'vitest';
import { MockPaymentsAdapter } from '../src/payments.js';

describe('PaymentsAdapter', () => {
  let adapter: MockPaymentsAdapter;

  beforeEach(() => {
    adapter = new MockPaymentsAdapter();
  });

  it('should create an invoice', async () => {
    const result = await adapter.createInvoice(100, 'Test payment');

    expect(result).toHaveProperty('id');
    expect(result).toHaveProperty('invoice');
    expect(result).toHaveProperty('payment_hash');
    expect(result.invoice).toContain('lnbc');
  });

  it('should verify webhook', () => {
    const payload = { event: 'payment.completed' };
    const signature = 'test-signature';

    const isValid = adapter.verifyWebhook(payload, signature);
    expect(isValid).toBe(true);
  });
});
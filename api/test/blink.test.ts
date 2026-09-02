import { describe, it, expect, beforeEach, vi } from 'vitest';
import crypto from 'crypto';

// Mock fetch before importing the adapter (Blink uses global fetch)
const fetchMock = vi.fn();
vi.stubGlobal('fetch', fetchMock);

import { BlinkAdapter, createPaymentsAdapter } from '../src/payments.js';

const SECRET_RAW = crypto.randomBytes(24);
const WHSEC = `whsec_${SECRET_RAW.toString('base64')}`;

function svixSign(rawBody: string, id: string, ts: number): string {
  const toSign = `${id}.${ts}.${rawBody}`;
  const mac = crypto.createHmac('sha256', SECRET_RAW).update(toSign).digest('base64');
  return `v1,${mac}`;
}

function graphqlResponse(data: any) {
  return { ok: true, json: async () => ({ data }) };
}

describe('BlinkAdapter', () => {
  let adapter: BlinkAdapter;

  beforeEach(() => {
    vi.clearAllMocks();
    process.env.BLINK_API_KEY = 'blink_test_key';
    process.env.BLINK_WEBHOOK_SECRET = WHSEC;
    delete process.env.BLINK_WALLET_ID;
    delete process.env.NAKAPAY_API_KEY;
    delete process.env.PAYMENTS_PROVIDER;
    adapter = new BlinkAdapter();
  });

  it('factory selects Blink when BLINK_API_KEY is set', () => {
    expect(createPaymentsAdapter()).toBeInstanceOf(BlinkAdapter);
  });

  it('factory honors explicit PAYMENTS_PROVIDER=nakapay', () => {
    process.env.PAYMENTS_PROVIDER = 'nakapay';
    process.env.NAKAPAY_API_KEY = 'x';
    // NakaPayAdapter constructor requires NAKAPAY_API_KEY (sdk mocked elsewhere)
    expect(createPaymentsAdapter()).not.toBeInstanceOf(BlinkAdapter);
  });

  it('creates an invoice: resolves BTC wallet, maps fields, stores pending metadata', async () => {
    fetchMock
      .mockResolvedValueOnce(graphqlResponse({ me: { defaultAccount: { wallets: [
        { id: 'usd-wallet', walletCurrency: 'USD' },
        { id: 'btc-wallet', walletCurrency: 'BTC' }
      ] } } }))
      .mockResolvedValueOnce(graphqlResponse({ lnInvoiceCreate: { invoice: {
        paymentRequest: 'lnbc100n1test...', paymentHash: 'abc123hash', satoshis: 100
      }, errors: [] } }));

    const result = await adapter.createInvoice(100, 'Pixel purchase: (1, 2)', { x: 1, y: 2, color: '#FF0000' });

    expect(result).toEqual({ id: 'abc123hash', invoice: 'lnbc100n1test...', payment_hash: 'abc123hash' });

    // First call = wallet resolution, second = invoice creation
    const invoiceCall = fetchMock.mock.calls[1];
    const body = JSON.parse(invoiceCall[1].body);
    expect(invoiceCall[1].headers['X-API-KEY']).toBe('blink_test_key');
    expect(body.variables.input).toEqual({ amount: 100, walletId: 'btc-wallet', memo: 'Pixel purchase: (1, 2)' });

    // Pending metadata must now be resolvable from a webhook
    const evt = adapter.extractPaymentEvent!(JSON.stringify({
      eventType: 'receive.lightning',
      transaction: {
        status: 'success',
        settlementAmount: 100,
        initiationVia: { type: 'lightning', paymentHash: 'abc123hash' }
      }
    }));
    expect(evt).toMatchObject({ event: 'payment.completed', payment_id: 'abc123hash', amount: 100, metadata: { x: 1, y: 2 } });
  });

  it('throws when Blink returns GraphQL errors', async () => {
    process.env.BLINK_WALLET_ID = 'w1';
    fetchMock.mockResolvedValueOnce(graphqlResponse({ lnInvoiceCreate: { invoice: null, errors: [{ message: 'boom' }] } }));
    await expect(adapter.createInvoice(50, 'd')).rejects.toThrow('boom');
  });

  describe('verifyWebhook (Standard Webhooks / Svix)', () => {
    const rawBody = JSON.stringify({ eventType: 'receive.lightning', transaction: {} });

    it('accepts a valid v1 signature', () => {
      const ts = Math.floor(Date.now() / 1000);
      const sig = svixSign(rawBody, 'msg_1', ts);
      expect(adapter.verifyWebhook(rawBody, sig, { 'svix-id': 'msg_1', 'svix-timestamp': String(ts) })).toBe(true);
    });

    it('rejects a wrong signature', () => {
      const ts = Math.floor(Date.now() / 1000);
      const sig = svixSign(rawBody + 'tampered', 'msg_1', ts);
      expect(adapter.verifyWebhook(rawBody, sig, { 'svix-id': 'msg_1', 'svix-timestamp': String(ts) })).toBe(false);
    });

    it('rejects stale timestamps (replay protection)', () => {
      const ts = Math.floor(Date.now() / 1000) - 3600;
      const sig = svixSign(rawBody, 'msg_1', ts);
      expect(adapter.verifyWebhook(rawBody, sig, { 'svix-id': 'msg_1', 'svix-timestamp': String(ts) })).toBe(false);
    });

    it('rejects when secret is unset (fail closed)', () => {
      delete process.env.BLINK_WEBHOOK_SECRET;
      const ts = Math.floor(Date.now() / 1000);
      expect(adapter.verifyWebhook(rawBody, svixSign(rawBody, 'm', ts), { 'svix-id': 'm', 'svix-timestamp': String(ts) })).toBe(false);
    });

    it('rejects when svix headers are missing', () => {
      const ts = Math.floor(Date.now() / 1000);
      expect(adapter.verifyWebhook(rawBody, svixSign(rawBody, 'm', ts), {})).toBe(false);
    });
  });

  describe('extractPaymentEvent', () => {
    it('ignores non-receive events', () => {
      expect(adapter.extractPaymentEvent!(JSON.stringify({ eventType: 'send.lightning', transaction: { status: 'success' } }))).toBeNull();
    });

    it('ignores unsuccessful transactions', () => {
      expect(adapter.extractPaymentEvent!(JSON.stringify({
        eventType: 'receive.lightning',
        transaction: { status: 'pending', initiationVia: { paymentHash: 'x' } }
      }))).toBeNull();
    });

    it('returns null for unknown payment hash', () => {
      expect(adapter.extractPaymentEvent!(JSON.stringify({
        eventType: 'receive.lightning',
        transaction: { status: 'success', settlementAmount: 1, initiationVia: { paymentHash: 'unknown' } }
      }))).toBeNull();
    });

    it('intraledger: matches unique pending by memo+amount', async () => {
      process.env.BLINK_WALLET_ID = 'w1';
      fetchMock.mockResolvedValue(graphqlResponse({ lnInvoiceCreate: { invoice: {
        paymentRequest: 'lnbc1n1x', paymentHash: 'ih1', satoshis: 21
      }, errors: [] } }));
      await adapter.createInvoice(21, 'Pixel purchase: (3, 4)', { x: 3, y: 4 });

      const evt = adapter.extractPaymentEvent!(JSON.stringify({
        eventType: 'receive.intraledger',
        transaction: { id: 'tx9', status: 'success', settlementAmount: 21, memo: 'Pixel purchase: (3, 4)', initiationVia: { type: 'intraledger' } }
      }));
      expect(evt).toMatchObject({ event: 'payment.completed', metadata: { x: 3, y: 4 } });
    });

    it('consumes pending entry after first webhook (dedupe by hash exhaustion)', async () => {
      process.env.BLINK_WALLET_ID = 'w1';
      fetchMock.mockResolvedValue(graphqlResponse({ lnInvoiceCreate: { invoice: {
        paymentRequest: 'lnbc1n1y', paymentHash: 'ih2', satoshis: 5
      }, errors: [] } }));
      await adapter.createInvoice(5, 'd', { a: 1 });

      const payload = JSON.stringify({
        eventType: 'receive.lightning',
        transaction: { status: 'success', settlementAmount: 5, initiationVia: { paymentHash: 'ih2' } }
      });
      expect(adapter.extractPaymentEvent!(payload)).not.toBeNull();
      expect(adapter.extractPaymentEvent!(payload)).toBeNull(); // consumed
    });
  });
});

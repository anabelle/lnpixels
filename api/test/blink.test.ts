import { describe, it, expect, beforeEach, vi } from 'vitest';
import crypto from 'crypto';

// Mock fetch before importing the adapter (Blink uses global fetch)
const fetchMock = vi.fn();
vi.stubGlobal('fetch', fetchMock);

import { BlinkAdapter, createPaymentsAdapter } from '../src/payments.js';
import { createTestDatabase } from '../src/database.js';

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

    // Pending metadata must now be resolvable from a webhook (+ pull-verify via O(1) status query)
    fetchMock.mockResolvedValueOnce(graphqlResponse({ lnInvoicePaymentStatus: { errors: [], status: 'PAID' } }));
    const evt = await adapter.extractPaymentEvent!(JSON.stringify({
      eventType: 'receive.lightning',
      transaction: {
        status: 'success',
        settlementAmount: 100,
        initiationVia: { type: 'lightning', paymentHash: 'abc123hash' }
      }
    }));
    expect(evt).toMatchObject({ event: 'payment.completed', payment_id: 'abc123hash', amount: 100, metadata: { x: 1, y: 2 } });
  });

  it('webhook is ignored when pull-verification fails (forged payload)', async () => {
    fetchMock.mockResolvedValue(graphqlResponse({ lnInvoiceCreate: { invoice: {
      paymentRequest: 'lnbc1n1z', paymentHash: 'forged1', satoshis: 7
    }, errors: [] } }));
    process.env.BLINK_WALLET_ID = 'w1';
    await adapter.createInvoice(7, 'd', { x: 9 });

    // transactions query returns NO matching settled tx
    fetchMock.mockResolvedValueOnce(graphqlResponse({ me: { defaultAccount: { transactions: { edges: [] } } } }));
    const evt = await adapter.extractPaymentEvent!(JSON.stringify({
      eventType: 'receive.lightning',
      transaction: { status: 'success', settlementAmount: 7, initiationVia: { paymentHash: 'forged1' } }
    }));
    expect(evt).toBeNull();
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

    it('soft-passes when secret is unset (pull-verification covers security)', () => {
      delete process.env.BLINK_WEBHOOK_SECRET;
      const ts = Math.floor(Date.now() / 1000);
      expect(adapter.verifyWebhook(rawBody, svixSign(rawBody, 'm', ts), { 'svix-id': 'm', 'svix-timestamp': String(ts) })).toBe(true);
    });

    it('rejects when svix headers are missing', () => {
      const ts = Math.floor(Date.now() / 1000);
      expect(adapter.verifyWebhook(rawBody, svixSign(rawBody, 'm', ts), {})).toBe(false);
    });
  });

  describe('extractPaymentEvent', () => {
    it('ignores non-receive events', async () => {
      expect(await adapter.extractPaymentEvent!(JSON.stringify({ eventType: 'send.lightning', transaction: { status: 'success' } }))).toBeNull();
    });

    it('ignores unsuccessful transactions', async () => {
      expect(await adapter.extractPaymentEvent!(JSON.stringify({
        eventType: 'receive.lightning',
        transaction: { status: 'pending', initiationVia: { paymentHash: 'x' } }
      }))).toBeNull();
    });

    it('returns null for unknown payment hash', async () => {
      expect(await adapter.extractPaymentEvent!(JSON.stringify({
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

      fetchMock.mockResolvedValueOnce(graphqlResponse({ me: { defaultAccount: { transactions: { edges: [
        { node: { id: 'tx9', direction: 'RECEIVE', status: 'SUCCESS', settlementAmount: 21, initiationVia: { type: 'intraledger' } } }
      ] } } } }));
      const evt = await adapter.extractPaymentEvent!(JSON.stringify({
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
      fetchMock.mockResolvedValueOnce(graphqlResponse({ lnInvoicePaymentStatus: { errors: [], status: 'PAID' } }));
      expect(await adapter.extractPaymentEvent!(payload)).not.toBeNull();
      expect(await adapter.extractPaymentEvent!(payload)).toBeNull(); // consumed
    });
  });

  describe('SQLite persistence (fix 4)', () => {
    it('pending invoice survives adapter restart — webhook settles against new instance', async () => {
      process.env.BLINK_WALLET_ID = 'w1';
      const db = createTestDatabase(':memory:');

      const first = new BlinkAdapter(db);
      fetchMock.mockResolvedValue(graphqlResponse({ lnInvoiceCreate: { invoice: {
        paymentRequest: 'lnbc1n1r', paymentHash: 'pers1', satoshis: 33
      }, errors: [] } }));
      await first.createInvoice(33, 'Pixel purchase: (7, 8)', { x: 7, y: 8 });

      // "restart": brand-new adapter over the same SQLite file
      const second = new BlinkAdapter(db);
      fetchMock.mockResolvedValueOnce(graphqlResponse({ lnInvoicePaymentStatus: { errors: [], status: 'PAID' } }));
      const evt = await second.extractPaymentEvent!(JSON.stringify({
        eventType: 'receive.lightning',
        transaction: { status: 'success', settlementAmount: 33, initiationVia: { paymentHash: 'pers1' } }
      }));
      expect(evt).toMatchObject({ event: 'payment.completed', payment_id: 'pers1', metadata: { x: 7, y: 8 }, amount: 33 });
      db.close();
    });

    it('verifySettled uses O(1) lnInvoicePaymentStatus when paymentRequest is known', async () => {
      process.env.BLINK_WALLET_ID = 'w1';
      fetchMock.mockResolvedValue(graphqlResponse({ lnInvoiceCreate: { invoice: {
        paymentRequest: 'lnbc1n1s', paymentHash: 'o1hash', satoshis: 9
      }, errors: [] } }));
      await adapter.createInvoice(9, 'd', { x: 1 });

      // Next call should be the status query (PAID) — no transactions scan
      fetchMock.mockResolvedValueOnce(graphqlResponse({ lnInvoicePaymentStatus: { errors: [], status: 'PAID' } }));
      const evt = await adapter.extractPaymentEvent!(JSON.stringify({
        eventType: 'receive.lightning',
        transaction: { status: 'success', settlementAmount: 9, initiationVia: { paymentHash: 'o1hash' } }
      }));
      expect(evt).toMatchObject({ payment_id: 'o1hash' });
      const statusCall = fetchMock.mock.calls.at(-1)!;
      expect(JSON.parse(statusCall[1].body).query).toContain('lnInvoicePaymentStatus');
    });

    it('falls back to transactions scan when status query fails', async () => {
      process.env.BLINK_WALLET_ID = 'w1';
      fetchMock.mockResolvedValue(graphqlResponse({ lnInvoiceCreate: { invoice: {
        paymentRequest: 'lnbc1n1t', paymentHash: 'fb1hash', satoshis: 11
      }, errors: [] } }));
      await adapter.createInvoice(11, 'd', { x: 2 });

      fetchMock.mockResolvedValueOnce({ ok: false, status: 500, text: async () => 'boom' });
      fetchMock.mockResolvedValueOnce(graphqlResponse({ me: { defaultAccount: { transactions: { edges: [
        { node: { direction: 'RECEIVE', status: 'SUCCESS', settlementAmount: 11, initiationVia: { paymentHash: 'fb1hash' } } }
      ] } } } }));
      const evt = await adapter.extractPaymentEvent!(JSON.stringify({
        eventType: 'receive.lightning',
        transaction: { status: 'success', settlementAmount: 11, initiationVia: { paymentHash: 'fb1hash' } }
      }));
      expect(evt).toMatchObject({ payment_id: 'fb1hash' });
    });

    it('pollPendingEvents settles paid invoices missed by webhooks (reconcile)', async () => {
      process.env.BLINK_WALLET_ID = 'w1';
      const db = createTestDatabase(':memory:');
      const a = new BlinkAdapter(db);
      fetchMock.mockResolvedValue(graphqlResponse({ lnInvoiceCreate: { invoice: {
        paymentRequest: 'lnbc1n1u', paymentHash: 'rec1', satoshis: 44
      }, errors: [] } }));
      await a.createInvoice(44, 'Pixel purchase: (9, 9)', { quoteId: 'q1', type: 'pixel_set' });

      // Restart — no webhook ever arrives. Poll says PAID.
      const b = new BlinkAdapter(db);
      fetchMock.mockResolvedValueOnce(graphqlResponse({ lnInvoicePaymentStatus: { errors: [], status: 'PAID' } }));
      const events = await b.pollPendingEvents!();
      expect(events).toHaveLength(1);
      expect(events[0]).toMatchObject({ event: 'payment.completed', payment_id: 'rec1', amount: 44, metadata: { quoteId: 'q1' } });

      // Consumed: second poll finds nothing (no fetch happens)
      expect(await b.pollPendingEvents!()).toHaveLength(0);
      db.close();
    });

    it('pollPendingEvents leaves unpaid invoices pending', async () => {
      process.env.BLINK_WALLET_ID = 'w1';
      const db = createTestDatabase(':memory:');
      const a = new BlinkAdapter(db);
      fetchMock.mockResolvedValue(graphqlResponse({ lnInvoiceCreate: { invoice: {
        paymentRequest: 'lnbc1n1v', paymentHash: 'rec2', satoshis: 55
      }, errors: [] } }));
      await a.createInvoice(55, 'd', { x: 5 });

      fetchMock.mockResolvedValueOnce(graphqlResponse({ lnInvoicePaymentStatus: { errors: [], status: 'PENDING' } }));
      expect(await a.pollPendingEvents!()).toHaveLength(0);
      db.close();
    });
  });

  describe('database payment-state tables', () => {
    it('quotes roundtrip and purge', () => {
      const db = createTestDatabase(':memory:');
      const quote = { pixelUpdates: [{ x: 1, y: 2, color: '#FF0000', price: 5 }], totalPrice: 5, totalPixels: 1, createdAt: Date.now() - 20 * 60000 };
      db.saveQuote('q_old', quote);
      db.saveQuote('q_new', { ...quote, createdAt: Date.now() });
      expect(db.getQuote('q_old')).toEqual(quote);
      expect(db.purgeQuotesOlderThan(10 * 60000)).toBe(1);
      expect(db.getQuote('q_old')).toBeUndefined();
      expect(db.getQuote('q_new')).toBeDefined();
      db.deleteQuote('q_new');
      expect(db.getQuote('q_new')).toBeUndefined();
      db.close();
    });

    it('processed payments roundtrip and purge', () => {
      const db = createTestDatabase(':memory:');
      expect(db.isPaymentProcessed('p1')).toBe(false);
      db.markPaymentProcessed('p1');
      db.markPaymentProcessed('p1'); // idempotent
      expect(db.isPaymentProcessed('p1')).toBe(true);
      db.markPaymentProcessed('p2');
      db.purgeProcessedPaymentsOlderThan(24 * 3600 * 1000);
      expect(db.isPaymentProcessed('p1')).toBe(true); // fresh markers survive
      db.close();
    });

    it('runInTransaction rolls back everything on failure', () => {
      const db = createTestDatabase(':memory:');
      db.saveQuote('qt', { pixelUpdates: [], totalPrice: 0, totalPixels: 0, createdAt: Date.now() });
      expect(() => db.runInTransaction(() => {
        db.deleteQuote('qt');
        throw new Error('boom');
      })).toThrow('boom');
      // Quote deletion rolled back
      expect(db.getQuote('qt')).toBeDefined();
      db.close();
    });
  });
});

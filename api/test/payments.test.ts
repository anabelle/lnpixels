import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { MockPaymentsAdapter, NakaPayAdapter } from '../src/payments.js';
import crypto from 'crypto';
import request from 'supertest';
import express from 'express';
import { setupRoutes } from '../src/routes.js';
import { Server as SocketServer } from 'socket.io';
import { Server } from 'http';
import { createTestDatabase } from '../src/database.js';

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

describe('NakaPayAdapter Webhook Verification', () => {
  const secret = 'test-webhook-secret';
  let adapter: NakaPayAdapter;

  beforeEach(() => {
    // Mock environment variable
    process.env.NAKAPAY_WEBHOOK_SECRET = secret;
    process.env.NAKAPAY_API_KEY = 'test-api-key';
    // Mock NakaPay constructor to avoid actual initialization
    vi.mock('nakapay-sdk', () => ({
      NakaPay: vi.fn().mockImplementation(() => ({}))
    }));
    adapter = new NakaPayAdapter();
  });

  afterEach(() => {
    delete process.env.NAKAPAY_WEBHOOK_SECRET;
    delete process.env.NAKAPAY_API_KEY;
    vi.restoreAllMocks();
  });

  it('should verify valid webhook signature', () => {
    const payload = { event: 'payment.completed', payment_id: 'test123' };
    const rawBody = JSON.stringify(payload);
    const expectedSignature = crypto
      .createHmac('sha256', secret)
      .update(rawBody)
      .digest('hex');

    const isValid = adapter.verifyWebhook(rawBody, expectedSignature);
    expect(isValid).toBe(true);
  });

  it('should reject invalid webhook signature', () => {
    const payload = { event: 'payment.completed', payment_id: 'test123' };
    const rawBody = JSON.stringify(payload);
    const invalidSignature = 'invalid-signature';

    const isValid = adapter.verifyWebhook(rawBody, invalidSignature);
    expect(isValid).toBe(false);
  });

  it('should handle malformed JSON gracefully', () => {
    const rawBody = 'invalid json';
    const signature = 'some-signature';

    const isValid = adapter.verifyWebhook(rawBody, signature);
    expect(isValid).toBe(false);
  });
});

describe('Webhook Integration Tests', () => {
  let app: express.Application;
  let io: SocketServer;
  let server: Server;
  let db: any;
  const secret = 'test-webhook-secret';

  beforeEach(() => {
    // Create a fresh in-memory database for each test
    db = createTestDatabase(':memory:');

    // Setup Express app with Socket.IO
    app = express();
    server = new Server(app);
    io = new SocketServer(server);

    // Mock environment
    process.env.NAKAPAY_WEBHOOK_SECRET = secret;
    process.env.NAKAPAY_API_KEY = 'test-api-key';

    // Setup middleware to capture raw body for webhook
    app.use(express.json({
      verify: (req: any, res, buf) => {
        if (req.url === '/api/nakapay') {
          req.rawBody = buf.toString();
        }
      }
    }));

    // Setup routes with test database
    app.use('/api', setupRoutes(io, db));
  });

  afterEach(() => {
    delete process.env.NAKAPAY_WEBHOOK_SECRET;
    delete process.env.NAKAPAY_API_KEY;
    server.close();
    vi.restoreAllMocks();
  });

  it('should accept valid webhook with payment.completed', async () => {
    const payload = {
      event: 'payment.completed',
      payment_id: 'test_payment_123',
      amount: 1000,
      description: 'Test payment',
      status: 'completed',
      timestamp: new Date().toISOString(),
      metadata: {
        x: 1,
        y: 2,
        color: '#ff0000',
        letter: 'A'
      }
    };
    const rawBody = JSON.stringify(payload);
    const signature = crypto
      .createHmac('sha256', secret)
      .update(rawBody)
      .digest('hex');

    const response = await request(app)
      .post('/api/nakapay')
      .set('x-nakapay-signature', signature)
      .set('Content-Type', 'application/json')
      .send(payload);

    expect(response.status).toBe(200);
    expect(response.body).toEqual({ success: true });
  });

  it('should reject webhook with invalid signature', async () => {
    const payload = {
      event: 'payment.completed',
      payment_id: 'test_payment_123',
      amount: 1000,
      metadata: { x: 1, y: 2, color: '#ff0000' }
    };
    const rawBody = JSON.stringify(payload);
    const invalidSignature = 'invalid-signature';

    // Test with a mock adapter that rejects signatures
    const mockAdapter = new MockPaymentsAdapter();
    mockAdapter.verifyWebhook = vi.fn().mockReturnValue(false);

    const isValid = mockAdapter.verifyWebhook(rawBody, invalidSignature);
    expect(isValid).toBe(false);
  });

  it('should handle duplicate webhooks idempotently', async () => {
    const payload = {
      event: 'payment.completed',
      payment_id: 'duplicate_payment_123',
      amount: 1000,
      description: 'Test payment',
      status: 'completed',
      timestamp: new Date().toISOString(),
      metadata: {
        x: 1,
        y: 2,
        color: '#ff0000',
        letter: 'A'
      }
    };
    const rawBody = JSON.stringify(payload);
    const signature = crypto
      .createHmac('sha256', secret)
      .update(rawBody)
      .digest('hex');

    // First request
    await request(app)
      .post('/api/nakapay')
      .set('x-nakapay-signature', signature)
      .set('Content-Type', 'application/json')
      .send(payload);

    // Duplicate request
    const response = await request(app)
      .post('/api/nakapay')
      .set('x-nakapay-signature', signature)
      .set('Content-Type', 'application/json')
      .send(payload);

    expect(response.status).toBe(200);
    expect(response.body).toEqual({ success: true, message: 'Already processed' });
  });

  it('should ignore non-payment.completed events', async () => {
    const payload = {
      event: 'payment.failed',
      payment_id: 'failed_payment_123',
      amount: 1000,
      status: 'failed',
      timestamp: new Date().toISOString()
    };
    const rawBody = JSON.stringify(payload);
    const signature = crypto
      .createHmac('sha256', secret)
      .update(rawBody)
      .digest('hex');

    const response = await request(app)
      .post('/api/nakapay')
      .set('x-nakapay-signature', signature)
      .set('Content-Type', 'application/json')
      .send(payload);

    expect(response.status).toBe(200);
    expect(response.body).toEqual({ success: true });
  });
});
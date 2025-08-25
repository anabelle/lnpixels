import { describe, it, expect, beforeEach, beforeAll } from 'vitest';
import { createTestDatabase } from '../src/database';
import request from 'supertest';
import express from 'express';
import { setupSocket } from '../src/socket';
import { setupRoutes } from '../src/routes';

describe('Activity Database', () => {
  let db: any;

  beforeEach(() => {
    // Create a fresh in-memory database for each test
    db = createTestDatabase(':memory:');
  });

  it('should insert and retrieve activity records', async () => {
    const activityData = {
      x: 10,
      y: 20,
      color: '#ff0000',
      letter: 'A',
      sats: 100,
      payment_hash: 'test_payment_hash_123',
      created_at: Date.now(),
      type: 'single_purchase'
    };

    // This should fail initially since insertActivity method doesn't exist yet
    db.insertActivity(activityData);

    const activities = db.getRecentActivity(10);
    expect(activities).toHaveLength(1);
    expect(activities[0]).toMatchObject({
      x: 10,
      y: 20,
      color: '#ff0000',
      letter: 'A',
      sats: 100,
      payment_hash: 'test_payment_hash_123',
      type: 'single_purchase'
    });
  });

  it('should return activities ordered by created_at descending', async () => {
    const now = Date.now();

    db.insertActivity({
      x: 1, y: 1, color: '#ff0000', letter: null, sats: 10,
      payment_hash: 'hash1', created_at: now - 2000, type: 'single_purchase'
    });

    db.insertActivity({
      x: 2, y: 2, color: '#00ff00', letter: 'B', sats: 20,
      payment_hash: 'hash2', created_at: now - 1000, type: 'single_purchase'
    });

    db.insertActivity({
      x: 3, y: 3, color: '#0000ff', letter: null, sats: 30,
      payment_hash: 'hash3', created_at: now, type: 'single_purchase'
    });

    const activities = db.getRecentActivity(10);
    expect(activities).toHaveLength(3);
    expect(activities[0].x).toBe(3); // Most recent first
    expect(activities[1].x).toBe(2);
    expect(activities[2].x).toBe(1);
  });

  it('should limit the number of returned activities', async () => {
    // Insert 5 activities
    for (let i = 0; i < 5; i++) {
      db.insertActivity({
        x: i, y: i, color: '#ff0000', letter: null, sats: 10,
        payment_hash: `hash${i}`, created_at: Date.now(), type: 'single_purchase'
      });
    }

    const activities = db.getRecentActivity(3);
    expect(activities).toHaveLength(3);
  });
});

describe('GET /api/activity', () => {
  let app: express.Application;
  let db: any;
  let testDbPath: string;

  beforeAll(() => {
    // Create a single database for all API tests to ensure data persistence
    testDbPath = `/tmp/test-activity-${Date.now()}-${Math.random()}.db`;
    db = createTestDatabase(testDbPath);
    app = express();

    // Add raw body parsing middleware for webhook signature verification
    app.use(express.json({
      verify: (req: any, res, buf) => {
        // Capture raw body for webhook signature verification
        if (req.url === '/api/nakapay') {
          req.rawBody = buf.toString();
        }
      }
    }));

    const { io } = setupSocket(app);
    app.use('/api', setupRoutes(io, db));
  });

  it('should return empty array when no activities exist', async () => {
    const response = await request(app)
      .get('/api/activity')
      .expect(200);

    expect(response.body).toEqual({ events: [] });
  });

  it('should return recent activities with default limit', async () => {
    // Insert some test activities
    db.insertActivity({
      x: 10, y: 20, color: '#ff0000', letter: 'A', sats: 100,
      payment_hash: 'hash1', created_at: Date.now(), type: 'single_purchase'
    });

    db.insertActivity({
      x: 5, y: 15, color: '#00ff00', letter: null, sats: 10,
      payment_hash: 'hash2', created_at: Date.now(), type: 'single_purchase'
    });

    // Verify activities were inserted
    const dbActivities = db.getRecentActivity(10);
    console.log('DB Activities:', dbActivities);
    expect(dbActivities).toHaveLength(2);

    const response = await request(app)
      .get('/api/activity')
      .expect(200);

    expect(response.body.events).toHaveLength(2);
    // Activities are returned in descending order by created_at (most recent first)
    expect(response.body.events[0]).toMatchObject({
      x: 10, y: 20, color: '#ff0000', letter: 'A', sats: 100
    });
    expect(response.body.events[1]).toMatchObject({
      x: 5, y: 15, color: '#00ff00', letter: null, sats: 10
    });
  });

  it('should respect custom limit parameter', async () => {
    // Insert 5 activities with unique payment hashes
    const timestamp = Date.now();
    for (let i = 0; i < 5; i++) {
      db.insertActivity({
        x: i, y: i, color: '#ff0000', letter: null, sats: 10,
        payment_hash: `hash${i}_${timestamp}_${Math.random()}`,
        created_at: timestamp + i,
        type: 'single_purchase'
      });
    }

    const response = await request(app)
      .get('/api/activity?limit=3')
      .expect(200);

    expect(response.body.events).toHaveLength(3);
  });

  it('should validate limit parameter', async () => {
    const response = await request(app)
      .get('/api/activity?limit=invalid')
      .expect(400);

    expect(response.body).toHaveProperty('error');
  });

  it('should persist activity when webhook processes single pixel payment', async () => {
    // First, create a pixel purchase invoice
    const invoiceResponse = await request(app)
      .post('/api/invoices')
      .send({ x: 1, y: 2, color: '#ff0000', letter: 'B' })
      .expect(200);

    const { payment_hash } = invoiceResponse.body;

    // Simulate webhook processing
    const webhookResponse = await request(app)
      .post('/api/nakapay')
      .set('x-nakapay-signature', 'test-signature')
      .send({
        event: 'payment.completed',
        payment_id: payment_hash,
        amount: 100,
        metadata: { x: 1, y: 2, color: '#ff0000', letter: 'B' }
      })
      .expect(200);

    // Check that activity was created
    const activityResponse = await request(app)
      .get('/api/activity')
      .expect(200);

    expect(activityResponse.body.events).toContainEqual(
      expect.objectContaining({
        x: 1,
        y: 2,
        color: '#ff0000',
        letter: 'B',
        payment_hash: payment_hash,
        type: 'single_purchase'
      })
    );
  });

  it('should persist activity when webhook processes bulk pixel payment', async () => {
    // First, create a bulk pixel purchase invoice
    const invoiceResponse = await request(app)
      .post('/api/invoices/bulk')
      .send({
        x1: 0, y1: 0, x2: 1, y2: 0,
        color: '#00ff00',
        letters: 'AB'
      })
      .expect(200);

    const { payment_hash } = invoiceResponse.body;

    // Simulate webhook processing
    const webhookResponse = await request(app)
      .post('/api/nakapay')
      .set('x-nakapay-signature', 'test-signature')
      .send({
        event: 'payment.completed',
        payment_id: payment_hash,
        amount: 20,
        metadata: {
          x1: 0, y1: 0, x2: 1, y2: 0,
          color: '#00ff00',
          letters: 'AB',
          pixelUpdates: [
            { x: 0, y: 0, color: '#00ff00', letter: 'A', price: 10 },
            { x: 1, y: 0, color: '#00ff00', letter: 'B', price: 10 }
          ]
        }
      })
      .expect(200);

    // Check that activities were created for both pixels
    const activityResponse = await request(app)
      .get('/api/activity')
      .expect(200);

    const activities = activityResponse.body.events;
    expect(activities).toContainEqual(
      expect.objectContaining({
        x: 0, y: 0, color: '#00ff00', letter: 'A',
        payment_hash: payment_hash, type: 'bulk_purchase'
      })
    );
    expect(activities).toContainEqual(
      expect.objectContaining({
        x: 1, y: 0, color: '#00ff00', letter: 'B',
        payment_hash: payment_hash, type: 'bulk_purchase'
      })
    );
  });
});
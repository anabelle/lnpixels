import { describe, it, expect, beforeEach } from 'vitest';
import request from 'supertest';
import express from 'express';
import { setupSocket } from '../src/socket';
import { setupRoutes } from '../src/routes';
import { createTestDatabase } from '../src/database';

describe('POST /invoices', () => {
  let app: express.Application;
  let db: any;

  beforeEach(() => {
    // Create a fresh in-memory database for each test
    db = createTestDatabase(':memory:');
    app = express();
    app.use(express.json());
    const { io } = setupSocket(app);
    app.use(setupRoutes(io, db));
  });

  it('should create an invoice for a single pixel', async () => {
    const response = await request(app)
      .post('/invoices')
      .send({ x: 0, y: 0, color: '#ff0000', letter: 'A' })
      .expect(200);

    expect(response.body).toHaveProperty('invoice');
    expect(response.body).toHaveProperty('payment_hash');
    expect(response.body).toHaveProperty('amount');
    expect(response.body).toHaveProperty('id');
    expect(response.body.amount).toBe(100); // Letter pixel price
  });

  it('should create an invoice for a pixel without letter', async () => {
    const response = await request(app)
      .post('/invoices')
      .send({ x: 1, y: 1, color: '#00ff00' })
      .expect(200);

    expect(response.body.amount).toBe(10); // Color-only pixel price
  });

  it('should validate input parameters', async () => {
    const response = await request(app)
      .post('/invoices')
      .send({ x: 'invalid', y: 0, color: '#ff0000' })
      .expect(400);

    expect(response.body).toHaveProperty('error');
  });
});

describe('POST /invoices/bulk', () => {
  let app: express.Application;
  let db: any;

  beforeEach(() => {
    // Create a fresh in-memory database for each test
    db = createTestDatabase(':memory:');
    app = express();
    app.use(express.json());
    const { io } = setupSocket(app);
    app.use(setupRoutes(io, db));
  });

  it('should create a bulk invoice for rectangle', async () => {
    const response = await request(app)
      .post('/invoices/bulk')
      .send({ x1: 0, y1: 0, x2: 1, y2: 1, color: '#ff0000', letters: 'AB' })
      .expect(200);

    expect(response.body).toHaveProperty('invoice');
    expect(response.body).toHaveProperty('payment_hash');
    expect(response.body).toHaveProperty('amount');
    expect(response.body).toHaveProperty('id');
    expect(response.body).toHaveProperty('pixelCount');
    expect(response.body.pixelCount).toBe(4); // 2x2 rectangle
  });

   it('should validate rectangle coordinates', async () => {
     const response = await request(app)
       .post('/invoices/bulk')
       .send({ x1: 'invalid', y1: 0, x2: 1, y2: 1, color: '#ff0000' })
       .expect(400);

     expect(response.body).toHaveProperty('error');
   });

   it('should reject rectangle exceeding max size of 1000 pixels', async () => {
     // 50x50 rectangle = 2500 pixels, exceeds 1000 limit
     const response = await request(app)
       .post('/invoices/bulk')
       .send({ x1: 0, y1: 0, x2: 49, y2: 49, color: '#ff0000' })
       .expect(413); // Payload Too Large

     expect(response.body).toHaveProperty('error');
     expect(response.body.error.message).toContain('exceeds maximum');
   });
 });

describe('POST /invoices/pixels', () => {
  let app: express.Application;
  let db: any;

  beforeEach(() => {
    // Create a fresh in-memory database for each test
    db = createTestDatabase(':memory:');
    app = express();
    app.use(express.json());
    const { io } = setupSocket(app);
    app.use(setupRoutes(io, db));
  });

  it('should create a bulk invoice for specific set of pixels', async () => {
    const pixels = [
      { x: 0, y: 0, color: '#ff0000', letter: 'A' },
      { x: 5, y: 10, color: '#00ff00' },
      { x: 15, y: 20, color: '#000000' }
    ];

    const response = await request(app)
      .post('/invoices/pixels')
      .send({ pixels })
      .expect(200);

    expect(response.body).toHaveProperty('invoice');
    expect(response.body).toHaveProperty('payment_hash');
    expect(response.body).toHaveProperty('amount');
    expect(response.body).toHaveProperty('id');
    expect(response.body).toHaveProperty('pixelCount');
    expect(response.body.pixelCount).toBe(3);
    // Expected amount: 100 (letter) + 10 (color) + 1 (black) = 111 sats
    expect(response.body.amount).toBe(111);
  });

  it('should validate pixels array', async () => {
    // Empty array
    const response1 = await request(app)
      .post('/invoices/pixels')
      .send({ pixels: [] })
      .expect(400);

    expect(response1.body).toHaveProperty('error');
    expect(response1.body.error).toContain('non-empty array');

    // Missing pixels property
    const response2 = await request(app)
      .post('/invoices/pixels')
      .send({})
      .expect(400);

    expect(response2.body).toHaveProperty('error');
  });

  it('should validate individual pixel properties', async () => {
    // Invalid coordinates
    const response1 = await request(app)
      .post('/invoices/pixels')
      .send({ pixels: [{ x: 'invalid', y: 0, color: '#ff0000' }] })
      .expect(400);

    expect(response1.body.error).toContain('coordinates');

    // Missing color
    const response2 = await request(app)
      .post('/invoices/pixels')
      .send({ pixels: [{ x: 0, y: 0 }] })
      .expect(400);

    expect(response2.body.error).toContain('color');
  });

  it('should reject pixel count exceeding max size of 1000 pixels', async () => {
    // Generate 1001 pixels to exceed the limit
    const pixels = Array.from({ length: 1001 }, (_, i) => ({
      x: i % 100,
      y: Math.floor(i / 100),
      color: '#ff0000'
    }));

    const response = await request(app)
      .post('/invoices/pixels')
      .send({ pixels })
      .expect(413); // Payload Too Large

    expect(response.body).toHaveProperty('error');
    expect(response.body.error.message).toContain('exceeds maximum');
  });

  it('should handle pixels with letters correctly', async () => {
    const pixels = [
      { x: 0, y: 0, color: '#ff0000', letter: 'H' },
      { x: 1, y: 0, color: '#ff0000', letter: 'I' }
    ];

    const response = await request(app)
      .post('/invoices/pixels')
      .send({ pixels })
      .expect(200);

    expect(response.body.pixelCount).toBe(2);
    // Expected amount: 100 + 100 = 200 sats (both letters)
    expect(response.body.amount).toBe(200);
  });
});
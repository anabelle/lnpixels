import { Router } from 'express';
import { Server as SocketServer } from 'socket.io';
import { PaymentsAdapter, NakaPayAdapter, MockPaymentsAdapter } from './payments.js';
import { price } from './pricing.js';

// Track processed payment IDs for idempotency
const processedPayments = new Set<string>();

const router = Router();

// In-memory storage for pixels (will be replaced with database later)
export let pixels: any[] = [
  { x: 0, y: 0, color: '#ff0000', letter: 'H', sats: 100, created_at: Date.now() },
  { x: 1, y: 0, color: '#00ff00', letter: 'E', sats: 10, created_at: Date.now() },
  { x: 2, y: 0, color: '#0000ff', letter: 'L', sats: 1, created_at: Date.now() },
  { x: 3, y: 0, color: '#ffff00', letter: 'L', sats: 100, created_at: Date.now() },
  { x: 4, y: 0, color: '#ff00ff', letter: 'O', sats: 10, created_at: Date.now() },
  { x: 0, y: 1, color: '#00ffff', sats: 1, created_at: Date.now() },
  { x: 1, y: 1, color: '#ff8000', sats: 10, created_at: Date.now() },
  { x: 2, y: 1, color: '#8000ff', sats: 100, created_at: Date.now() },
  { x: 3, y: 1, color: '#0080ff', sats: 1, created_at: Date.now() },
  { x: 4, y: 1, color: '#ff0080', sats: 10, created_at: Date.now() },
  { x: -2, y: -1, color: '#00ff80', letter: 'W', sats: 100, created_at: Date.now() },
  { x: -1, y: -1, color: '#80ff00', letter: 'O', sats: 10, created_at: Date.now() },
  { x: 0, y: -1, color: '#ff0080', letter: 'R', sats: 1, created_at: Date.now() },
  { x: 1, y: -1, color: '#8000ff', letter: 'L', sats: 100, created_at: Date.now() },
  { x: 2, y: -1, color: '#0080ff', letter: 'D', sats: 10, created_at: Date.now() },
];

// Initialize payments adapter
const paymentsAdapter: PaymentsAdapter = process.env.NAKAPAY_API_KEY
  ? new NakaPayAdapter()
  : new MockPaymentsAdapter();

export function setupRoutes(io: SocketServer) {
  // API info endpoint (mounted at /api/)
  router.get('/', (req, res) => res.json({
    name: 'LNPixels API',
    version: '1.0.0',
    endpoints: {
      'GET /api/pixels': 'Get pixels within a rectangle',
      'POST /api/invoices': 'Create invoice for pixel purchase',
      'POST /api/invoices/bulk': 'Create bulk invoice for rectangle purchase',
      'POST /api/nakapay': 'NakaPay webhook',
      'GET /api/activity': 'Get activity feed',
      'GET /api/verify/:eventId': 'Verify event'
    }
  }));

  // Also handle /api (without trailing slash)
  router.get('', (req, res) => res.json({
    name: 'LNPixels API',
    version: '1.0.0',
    endpoints: {
      'GET /api/pixels': 'Get pixels within a rectangle',
      'POST /api/invoices': 'Create invoice for pixel purchase',
      'POST /api/invoices/bulk': 'Create bulk invoice for rectangle purchase',
      'POST /api/nakapay': 'NakaPay webhook',
      'GET /api/activity': 'Get activity feed',
      'GET /api/verify/:eventId': 'Verify event'
    }
  }));

  // GET /pixels - returns pixels within specified rectangle
  router.get('/pixels', (req, res) => {
    const { x1, y1, x2, y2 } = req.query;

    // Validate parameters
    const x1Num = parseInt(x1 as string);
    const y1Num = parseInt(y1 as string);
    const x2Num = parseInt(x2 as string);
    const y2Num = parseInt(y2 as string);

    if (isNaN(x1Num) || isNaN(y1Num) || isNaN(x2Num) || isNaN(y2Num)) {
      return res.status(400).json({ error: 'Invalid rectangle coordinates' });
    }

    // Filter pixels within the rectangle bounds
    const pixelsInRect = pixels.filter(pixel =>
      pixel.x >= x1Num && pixel.x <= x2Num &&
      pixel.y >= y1Num && pixel.y <= y2Num
    );

    res.json(pixelsInRect);
  });

  // POST /invoices - Create invoice for single pixel purchase
  router.post('/invoices', async (req, res) => {
    try {
      const { x, y, color, letter } = req.body;

      // Validate input
      if (typeof x !== 'number' || typeof y !== 'number') {
        return res.status(400).json({ error: 'Invalid coordinates' });
      }

      // Find existing pixel to get last price
      const existingPixel = pixels.find(p => p.x === x && p.y === y);
      const lastPrice = existingPixel ? existingPixel.sats : null;

      // Calculate price
      const pixelPrice = price({ color, letter, lastPrice });

      // Create invoice
      const invoice = await paymentsAdapter.createInvoice(
        pixelPrice,
        `Pixel purchase: (${x}, ${y})`,
        { x, y, color, letter }
      );

      res.json({
        invoice: invoice.invoice,
        payment_hash: invoice.payment_hash,
        amount: pixelPrice,
        id: invoice.id
      });
    } catch (error) {
      console.error('Error creating invoice:', error);
      res.status(500).json({ error: 'Failed to create invoice' });
    }
  });

  // POST /invoices/bulk - Create bulk invoice for rectangle purchase
  router.post('/invoices/bulk', async (req, res) => {
    try {
      const { x1, y1, x2, y2, color, letters } = req.body;

      // Validate rectangle coordinates
      if ([x1, y1, x2, y2].some(coord => typeof coord !== 'number')) {
        return res.status(400).json({ error: 'Invalid rectangle coordinates' });
      }

      const width = Math.abs(x2 - x1) + 1;
      const height = Math.abs(y2 - y1) + 1;
      const totalPixels = width * height;

      // Validate letters length
      if (letters && letters.length > totalPixels) {
        return res.status(400).json({ error: 'Too many letters for rectangle size' });
      }

      // Calculate total price
      let totalPrice = 0;
      const pixelUpdates: any[] = [];

      for (let y = Math.min(y1, y2); y <= Math.max(y1, y2); y++) {
        for (let x = Math.min(x1, x2); x <= Math.max(x1, x2); x++) {
          const existingPixel = pixels.find(p => p.x === x && p.y === y);
          const lastPrice = existingPixel ? existingPixel.sats : null;
          const pixelPrice = price({ color, letter: null, lastPrice });
          totalPrice += pixelPrice;

          pixelUpdates.push({ x, y, color, letter: null, price: pixelPrice });
        }
      }

      // Assign letters if provided
      if (letters) {
        let letterIndex = 0;
        for (let y = Math.min(y1, y2); y <= Math.max(y1, y2); y++) {
          for (let x = Math.min(x1, x2); x <= Math.max(x1, x2); x++) {
            if (letterIndex < letters.length) {
              const existingPixel = pixels.find(p => p.x === x && p.y === y);
              const lastPrice = existingPixel ? existingPixel.sats : null;
              const pixelPrice = price({ color, letter: letters[letterIndex], lastPrice });
              totalPrice += (pixelPrice - price({ color, letter: null, lastPrice })); // Add letter premium
              pixelUpdates.find(p => p.x === x && p.y === y)!.letter = letters[letterIndex];
              letterIndex++;
            }
          }
        }
      }

      // Create bulk invoice
      const invoice = await paymentsAdapter.createInvoice(
        totalPrice,
        `Bulk pixel purchase: ${totalPixels} pixels`,
        { x1, y1, x2, y2, color, letters, pixelUpdates }
      );

      res.json({
        invoice: invoice.invoice,
        payment_hash: invoice.payment_hash,
        amount: totalPrice,
        id: invoice.id,
        pixelCount: totalPixels
      });
    } catch (error) {
      console.error('Error creating bulk invoice:', error);
      res.status(500).json({ error: 'Failed to create bulk invoice' });
    }
  });

  // POST /nakapay - Handle NakaPay webhooks
  router.post('/nakapay', (req, res) => {
    try {
      const signature = req.headers['x-nakapay-signature'] as string;
      const rawBody = (req as any).rawBody;

      if (!rawBody) {
        return res.status(400).json({ error: 'Missing raw body' });
      }

      // Verify webhook signature
      if (!paymentsAdapter.verifyWebhook(rawBody, signature)) {
        return res.status(401).json({ error: 'Invalid signature' });
      }

      const payload = JSON.parse(rawBody);

      // Verify webhook signature
      if (!paymentsAdapter.verifyWebhook(rawBody, signature)) {
        return res.status(401).json({ error: 'Invalid signature' });
      }

      // Handle payment completion
      if (payload.event === 'payment.completed') {
        const paymentId = payload.payment_id;

        // Check for idempotency
        if (processedPayments.has(paymentId)) {
          console.log(`Payment ${paymentId} already processed, skipping`);
          return res.json({ success: true, message: 'Already processed' });
        }

        const metadata = payload.metadata;

        if (metadata.pixelUpdates) {
          // Bulk payment
          metadata.pixelUpdates.forEach((update: any) => {
            const existingIndex = pixels.findIndex(p => p.x === update.x && p.y === update.y);
            const newPixel = {
              x: update.x,
              y: update.y,
              color: update.color,
              letter: update.letter,
              sats: update.price,
              created_at: Date.now()
            };

            if (existingIndex >= 0) {
              pixels[existingIndex] = newPixel;
            } else {
              pixels.push(newPixel);
            }

            // Emit real-time update
            io.emit('pixel.update', newPixel);
          });
        } else {
          // Single pixel payment
          const existingIndex = pixels.findIndex(p => p.x === metadata.x && p.y === metadata.y);
          const newPixel = {
            x: metadata.x,
            y: metadata.y,
            color: metadata.color,
            letter: metadata.letter,
            sats: payload.amount,
            created_at: Date.now()
          };

          if (existingIndex >= 0) {
            pixels[existingIndex] = newPixel;
          } else {
            pixels.push(newPixel);
          }

          // Emit real-time update
          io.emit('pixel.update', newPixel);
        }

        // Emit activity update
        io.emit('activity.append', {
          type: 'payment',
          amount: payload.amount,
          timestamp: Date.now(),
          metadata
        });

        // Mark payment as processed for idempotency
        processedPayments.add(paymentId);
      }

      res.json({ success: true });
    } catch (error) {
      console.error('Error processing webhook:', error);
      res.status(500).json({ error: 'Failed to process webhook' });
    }
  });

  // Example endpoint to simulate pixel update (for testing)
  router.post('/test-update', (req, res) => {
    const pixelData = { x: 10, y: 20, color: '#ff0000', letter: 'A', sats: 100, created_at: Date.now() };
    io.emit('pixel.update', pixelData);
    res.json({ success: true });
  });

  return router;
}
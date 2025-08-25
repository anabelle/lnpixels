import { Router } from 'express';
import { Namespace } from 'socket.io';
import { PaymentsAdapter, NakaPayAdapter, MockPaymentsAdapter } from './payments.js';
import { price } from './pricing.js';
import { getDatabase, PixelDatabase, Pixel } from './database.js';

// Track processed payment IDs for idempotency
const processedPayments = new Set<string>();

const router = Router();

// Initialize payments adapter
const paymentsAdapter: PaymentsAdapter = process.env.NAKAPAY_API_KEY
  ? new NakaPayAdapter()
  : new MockPaymentsAdapter();

export function setupRoutes(io: Namespace, db?: PixelDatabase) {
  // Use provided database or get default instance
  const database = db || getDatabase();
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

     try {
       // Get pixels from database
       const pixelsInRect = database.getPixelsInRectangle(x1Num, y1Num, x2Num, y2Num);
       res.json(pixelsInRect);
     } catch (error) {
       console.error('Error fetching pixels:', error);
       res.status(500).json({ error: 'Failed to fetch pixels' });
     }
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
       const existingPixel = database.getPixel(x, y);
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
         id: invoice.id,
         isMock: !process.env.NAKAPAY_API_KEY
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

       // Validate max rectangle size (1000 pixels per design.md)
       if (totalPixels > 1000) {
         return res.status(413).json({ error: { code: 'PAYLOAD_TOO_LARGE', message: 'Rectangle size exceeds maximum of 1000 pixels' } });
       }

       // Validate letters length
       if (letters && letters.length > totalPixels) {
         return res.status(400).json({ error: 'Too many letters for rectangle size' });
       }

      // Calculate total price
      let totalPrice = 0;
      const pixelUpdates: any[] = [];

       for (let y = Math.min(y1, y2); y <= Math.max(y1, y2); y++) {
         for (let x = Math.min(x1, x2); x <= Math.max(x1, x2); x++) {
           const existingPixel = database.getPixel(x, y);
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
               const existingPixel = database.getPixel(x, y);
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
         pixelCount: totalPixels,
         isMock: !process.env.NAKAPAY_API_KEY
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
           // Bulk payment - use database bulk upsert
           const pixelData = metadata.pixelUpdates.map((update: any) => ({
             x: update.x,
             y: update.y,
             color: update.color,
             letter: update.letter,
             sats: update.price
           }));

            try {
              const savedPixels = database.upsertPixels(pixelData);

              // Insert activity records for bulk purchase
              const timestamp = Date.now();
              const activityRecords = metadata.pixelUpdates.map((update: any) =>
                database.insertActivity({
                  x: update.x,
                  y: update.y,
                  color: update.color,
                  letter: update.letter,
                  sats: update.price,
                  payment_hash: paymentId,
                  created_at: timestamp,
                  type: 'bulk_purchase'
                })
              );

              console.log('Created bulk activity records:', activityRecords);

              // Emit real-time updates for each pixel
              savedPixels.forEach(pixel => {
                console.log('Emitting pixel.update for bulk purchase:', pixel);
                io.emit('pixel.update', pixel);
              });

              // Emit activity summary for bulk purchase
              if (activityRecords.length > 0) {
                const summaryActivity = {
                  ...activityRecords[0], // Use first record as base
                  summary: `${activityRecords.length} pixels purchased`,
                  type: 'bulk_purchase'
                };
                console.log('Emitting bulk activity.append event:', summaryActivity);
                io.emit('activity.append', summaryActivity);
              }
            } catch (error) {
              console.error('Error saving bulk pixels to database:', error);
              return res.status(500).json({ error: 'Failed to save pixels' });
            }
         } else {
           // Single pixel payment - use database upsert
            try {
              const savedPixel = database.upsertPixel({
                x: metadata.x,
                y: metadata.y,
                color: metadata.color,
                letter: metadata.letter,
                sats: payload.amount
              });

              // Insert activity record for single purchase
              const timestamp = Date.now();
              const activityRecord = database.insertActivity({
                x: metadata.x,
                y: metadata.y,
                color: metadata.color,
                letter: metadata.letter,
                sats: payload.amount,
                payment_hash: paymentId,
                created_at: timestamp,
                type: 'single_purchase'
              });

              console.log('Created activity record:', activityRecord);

              // Emit real-time updates
              console.log('Emitting pixel.update event:', savedPixel);
              io.emit('pixel.update', savedPixel);
              console.log('Emitting activity.append event:', activityRecord);
              io.emit('activity.append', activityRecord);
            } catch (error) {
              console.error('Error saving pixel to database:', error);
              return res.status(500).json({ error: 'Failed to save pixel' });
            }
         }

        // Emit activity update
        io.emit('activity.append', {
          type: 'payment',
          amount: payload.amount,
          timestamp: Date.now(),
          metadata
        });

        // Emit payment confirmation event for the specific payment
        io.emit('payment.confirmed', {
          paymentId: paymentId,
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



   // GET /activity - Get recent activity feed
   router.get('/activity', (req, res) => {
     const limitParam = req.query.limit as string;
     let limit = 20; // default limit

     if (limitParam) {
       const parsedLimit = parseInt(limitParam);
       if (isNaN(parsedLimit) || parsedLimit <= 0) {
         return res.status(400).json({ error: 'Invalid limit parameter' });
       }
       limit = Math.min(parsedLimit, 100); // max 100 items
     }

      try {
        const activities = database.getRecentActivity(limit);
        res.json({ events: activities });
      } catch (error) {
       console.error('Error fetching activity:', error);
       res.status(500).json({ error: 'Failed to fetch activity' });
     }
   });

   // Test endpoint for triggering pixel updates (only in development/test)
   if (process.env.NODE_ENV !== 'production') {
     router.post('/test-update', (req, res) => {
       const testPixel = {
         x: 10,
         y: 20,
         color: '#ff0000',
         letter: 'A',
         sats: 100,
         created_at: Date.now(),
         updated_at: Date.now()
       };

       io.emit('pixel.update', testPixel);
       res.json({ success: true, pixel: testPixel });
     });

     // Test endpoint for triggering activity updates
      router.post('/test-activity', (req, res) => {
        console.log('🧪 Test activity endpoint called');
        const testActivity = {
          x: 5,
          y: 15,
          color: '#00ff00',
          letter: 'B',
          sats: 50,
          payment_hash: 'test_hash_' + Date.now(),
          created_at: Date.now(),
          type: 'single_purchase'
        };

        console.log('📡 Emitting test activity event:', testActivity);
        io.emit('activity.append', testActivity);
        console.log('✅ Test activity event emitted');
        res.json({ success: true, activity: testActivity });
      });
   }

   return router;
}
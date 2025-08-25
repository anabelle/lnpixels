// Test webhook handling of letters
import fetch from 'node-fetch';
import crypto from 'crypto';

const API_BASE = 'http://localhost:3000/api';

async function testWebhookWithLetters() {
  console.log('Testing webhook with letters...\n');

  try {
    // First, create a single pixel invoice with letter
    console.log('1. Creating single pixel invoice with letter...');
    const invoiceResponse = await fetch(`${API_BASE}/invoices`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        x: 500,
        y: 500,
        color: '#ff00ff',
        letter: 'X'
      })
    });

    if (!invoiceResponse.ok) {
      console.log('❌ Failed to create invoice');
      return;
    }

    const invoiceData = await invoiceResponse.json();
    console.log('✅ Invoice created:', invoiceData.id);

    // Simulate webhook payment completion with proper signature
    console.log('\n2. Simulating webhook payment completion...');
    const webhookPayload = {
      event: 'payment.completed',
      payment_id: invoiceData.id,
      amount: invoiceData.amount,
      metadata: {
        x: 500,
        y: 500,
        color: '#ff00ff',
        letter: 'X'
      }
    };

    const rawBody = JSON.stringify(webhookPayload);
    // Use a mock secret for testing (this should work with MockPaymentsAdapter)
    const mockSecret = 'test-webhook-secret';
    const signature = crypto
      .createHmac('sha256', mockSecret)
      .update(rawBody)
      .digest('hex');

    const webhookResponse = await fetch(`${API_BASE}/nakapay`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-nakapay-signature': signature
      },
      body: rawBody
    });

    if (webhookResponse.ok) {
      console.log('✅ Webhook processed successfully');
    } else {
      console.log('❌ Webhook failed:', webhookResponse.status);
      const error = await webhookResponse.text();
      console.log('   Error:', error);
    }

    // Check if pixel was saved with letter
    console.log('\n3. Checking if pixel was saved with letter...');
    const pixelsResponse = await fetch(`${API_BASE}/pixels?x1=495&y1=495&x2=505&y2=505`);

    if (pixelsResponse.ok) {
      const pixels = await pixelsResponse.json();
      const targetPixel = pixels.find(p => p.x === 500 && p.y === 500);

      if (targetPixel) {
        console.log('✅ Pixel found at (500, 500)');
        console.log('   Color:', targetPixel.color);
        console.log('   Letter:', targetPixel.letter ? `"${targetPixel.letter}"` : 'null');
        console.log('   Sats:', targetPixel.sats);

        if (targetPixel.letter === 'X') {
          console.log('✅ Letter was saved correctly!');
        } else {
          console.log('❌ Letter was not saved correctly. Expected "X", got:', targetPixel.letter);
        }
      } else {
        console.log('❌ Pixel not found at (500, 500)');
      }
    } else {
      console.log('❌ Failed to fetch pixels');
    }

  } catch (error) {
    console.error('❌ Test failed with error:', error.message);
  }
}

// Run the test
testWebhookWithLetters();
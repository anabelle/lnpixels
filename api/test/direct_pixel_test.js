// Direct test of pixel saving with letters
import fetch from 'node-fetch';

const API_BASE = 'http://localhost:3000/api';

async function testDirectPixelSaving() {
  console.log('Testing direct pixel saving with letters...\n');

  try {
    // First, let's see what pixels are currently in the system
    console.log('1. Checking current pixels...');
    const initialResponse = await fetch(`${API_BASE}/pixels?x1=-5&y1=-5&x2=5&y2=5`);

    if (initialResponse.ok) {
      const initialPixels = await initialResponse.json();
      console.log(`   Found ${initialPixels.length} initial pixels`);
      initialPixels.forEach(p => {
        console.log(`   (${p.x}, ${p.y}): "${p.letter || ''}" - ${p.color} - ${p.sats} sats`);
      });
    }

    // Add a pixel directly to the system by calling the webhook endpoint
    console.log('\n2. Adding pixel with letter via webhook...');

    // First create an invoice to get a payment ID
    const invoiceResponse = await fetch(`${API_BASE}/invoices`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        x: 100,
        y: 100,
        color: '#ff00ff',
        letter: 'Z'
      })
    });

    if (!invoiceResponse.ok) {
      console.log('❌ Failed to create invoice');
      return;
    }

    const invoiceData = await invoiceResponse.json();
    console.log('   Invoice created:', invoiceData.id);

    // Now simulate the webhook with the correct format
    const webhookPayload = {
      event: 'payment.completed',
      payment_id: invoiceData.id,
      amount: invoiceData.amount,
      metadata: {
        x: 100,
        y: 100,
        color: '#ff00ff',
        letter: 'Z'
      }
    };

    // Use the same signature approach as the working tests
    const crypto = await import('crypto');
    const rawBody = JSON.stringify(webhookPayload);
    const mockSecret = 'test-webhook-secret';
    const signature = crypto.createHmac('sha256', mockSecret).update(rawBody).digest('hex');

    console.log('   Webhook payload:', JSON.stringify(webhookPayload, null, 2));
    console.log('   Signature:', signature);

    const webhookResponse = await fetch(`${API_BASE}/nakapay`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-nakapay-signature': signature
      },
      body: rawBody
    });

    console.log('   Webhook response status:', webhookResponse.status);

    if (webhookResponse.ok) {
      console.log('✅ Webhook processed successfully');
    } else {
      const error = await webhookResponse.text();
      console.log('❌ Webhook failed:', error);
    }

    // Check if pixel was saved
    console.log('\n3. Checking if pixel was saved...');
    const finalResponse = await fetch(`${API_BASE}/pixels?x1=95&y1=95&x2=105&y2=105`);

    if (finalResponse.ok) {
      const finalPixels = await finalResponse.json();
      const targetPixel = finalPixels.find(p => p.x === 100 && p.y === 100);

      if (targetPixel) {
        console.log('✅ Pixel found at (100, 100)');
        console.log('   Color:', targetPixel.color);
        console.log('   Letter:', targetPixel.letter ? `"${targetPixel.letter}"` : 'null');
        console.log('   Sats:', targetPixel.sats);

        if (targetPixel.letter === 'Z') {
          console.log('✅ Letter was saved correctly!');
        } else {
          console.log('❌ Letter was not saved correctly. Expected "Z", got:', targetPixel.letter);
        }
      } else {
        console.log('❌ Pixel not found at (100, 100)');
        console.log('   Available pixels:', finalPixels.map(p => `(${p.x}, ${p.y})`).join(', '));
      }
    } else {
      console.log('❌ Failed to fetch final pixels');
    }

  } catch (error) {
    console.error('❌ Test failed with error:', error.message);
  }
}

// Run the test
testDirectPixelSaving();
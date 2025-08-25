// Simple test to verify letters work via the test endpoint
import fetch from 'node-fetch';

const API_BASE = 'http://localhost:3000/api';

async function testLettersSimple() {
  console.log('Testing letters via simple endpoint...\n');

  try {
    // Test the test-update endpoint which directly saves a pixel with letter
    console.log('1. Testing direct pixel update with letter...');
    const response = await fetch(`${API_BASE}/test-update`, {
      method: 'POST'
    });

    if (response.ok) {
      console.log('✅ Test update endpoint called successfully');
    } else {
      console.log('❌ Test update endpoint failed:', response.status);
      return;
    }

    // Check if pixel was saved with letter
    console.log('\n2. Checking if pixel was saved with letter...');
    const pixelsResponse = await fetch(`${API_BASE}/pixels?x1=5&y1=15&x2=15&y2=25`);

    if (pixelsResponse.ok) {
      const pixels = await pixelsResponse.json();
      const targetPixel = pixels.find(p => p.x === 10 && p.y === 20);

      if (targetPixel) {
        console.log('✅ Pixel found at (10, 20)');
        console.log('   Color:', targetPixel.color);
        console.log('   Letter:', targetPixel.letter ? `"${targetPixel.letter}"` : 'null');
        console.log('   Sats:', targetPixel.sats);

        if (targetPixel.letter === 'A') {
          console.log('✅ Letter was saved correctly!');
        } else {
          console.log('❌ Letter was not saved correctly. Expected "A", got:', targetPixel.letter);
        }
      } else {
        console.log('❌ Pixel not found at (10, 20)');
        console.log('   Available pixels:', pixels.map(p => `(${p.x}, ${p.y})`).join(', '));
      }
    } else {
      console.log('❌ Failed to fetch pixels');
    }

  } catch (error) {
    console.error('❌ Test failed with error:', error.message);
  }
}

// Run the test
testLettersSimple();
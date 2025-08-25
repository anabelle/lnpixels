// Simple test to verify letter handling in API endpoints
import fetch from 'node-fetch';

const API_BASE = 'http://localhost:3000/api';

async function testLetterAPI() {
  console.log('Testing letter API endpoints...\n');

  try {
    // Test 1: Create single pixel invoice with letter
    console.log('1. Testing single pixel invoice with letter...');
    const singlePixelResponse = await fetch(`${API_BASE}/invoices`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        x: 100,
        y: 100,
        color: '#ff0000',
        letter: 'A'
      })
    });

    if (singlePixelResponse.ok) {
      const singlePixelData = await singlePixelResponse.json();
      console.log('✅ Single pixel invoice created successfully');
      console.log('   Invoice ID:', singlePixelData.id);
      console.log('   Amount:', singlePixelData.amount);
      console.log('   Is Mock:', singlePixelData.isMock);
    } else {
      console.log('❌ Single pixel invoice failed:', singlePixelResponse.status);
      const error = await singlePixelResponse.text();
      console.log('   Error:', error);
    }

    // Test 2: Create bulk invoice with letters
    console.log('\n2. Testing bulk invoice with letters...');
    const bulkResponse = await fetch(`${API_BASE}/invoices/bulk`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        x1: 200,
        y1: 200,
        x2: 202,
        y2: 200,
        color: '#00ff00',
        letters: 'HEL'
      })
    });

    if (bulkResponse.ok) {
      const bulkData = await bulkResponse.json();
      console.log('✅ Bulk invoice created successfully');
      console.log('   Invoice ID:', bulkData.id);
      console.log('   Amount:', bulkData.amount);
      console.log('   Pixel Count:', bulkData.pixelCount);
    } else {
      console.log('❌ Bulk invoice failed:', bulkResponse.status);
      const error = await bulkResponse.text();
      console.log('   Error:', error);
    }

    // Test 3: Fetch pixels to see if any have letters
    console.log('\n3. Testing pixel retrieval...');
    const pixelsResponse = await fetch(`${API_BASE}/pixels?x1=-10&y1=-10&x2=10&y2=10`);

    if (pixelsResponse.ok) {
      const pixels = await pixelsResponse.json();
      console.log(`✅ Retrieved ${pixels.length} pixels`);
      const pixelsWithLetters = pixels.filter(p => p.letter);
      console.log(`   Pixels with letters: ${pixelsWithLetters.length}`);
      if (pixelsWithLetters.length > 0) {
        console.log('   Sample pixels with letters:');
        pixelsWithLetters.slice(0, 3).forEach(p => {
          console.log(`     (${p.x}, ${p.y}): "${p.letter}" - ${p.color} - ${p.sats} sats`);
        });
      }
    } else {
      console.log('❌ Pixel retrieval failed:', pixelsResponse.status);
      const error = await pixelsResponse.text();
      console.log('   Error:', error);
    }

  } catch (error) {
    console.error('❌ Test failed with error:', error.message);
  }
}

// Run the test
testLetterAPI();
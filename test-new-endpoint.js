// Quick test for the new /invoices/pixels endpoint

async function testPixelsEndpoint() {
  const pixels = [
    { x: 0, y: 0, color: '#ff0000', letter: 'A' },
    { x: 5, y: 10, color: '#00ff00' },
    { x: 15, y: 20, color: '#000000' } // black pixel
  ];

  try {
    console.log('Testing new /invoices/pixels endpoint...');
    console.log('Sending pixels:', pixels);

    const response = await fetch('http://localhost:3000/api/invoices/pixels', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ pixels })
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`HTTP ${response.status}: ${error}`);
    }

    const result = await response.json();
    console.log('Response:', result);

    // Expected amount: 100 (letter) + 10 (color) + 1 (black) = 111 sats
    console.log('Expected amount: 111 sats');
    console.log('Actual amount:', result.amount, 'sats');
    console.log('Test', result.amount === 111 ? 'PASSED' : 'FAILED');

  } catch (error) {
    console.error('Test failed:', error);
  }
}

async function testApiInfo() {
  try {
    console.log('\nTesting API info endpoint...');
    const response = await fetch('http://localhost:3000/api/');
    const info = await response.json();
    console.log('API endpoints:', Object.keys(info.endpoints));
    console.log('New endpoint included:', 'POST /api/invoices/pixels' in info.endpoints ? 'YES' : 'NO');
  } catch (error) {
    console.error('API info test failed:', error);
  }
}

// Run tests
testApiInfo().then(() => testPixelsEndpoint());

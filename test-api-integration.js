// Simple test script to verify API integration
const testApi = async () => {
  console.log('Testing API integration...');

  try {
    // Test API root
    const apiResponse = await fetch('http://localhost:3000/api/');
    const apiData = await apiResponse.json();
    console.log('✅ API root working:', apiData.name);

    // Test pixels endpoint
    const pixelsResponse = await fetch('http://localhost:3000/api/pixels?x1=-5&y1=-5&x2=5&y2=5');
    const pixels = await pixelsResponse.json();
    console.log('✅ Pixels endpoint working, returned', pixels.length, 'pixels');

    // Test frontend API service (simulate frontend call)
    const frontendApiResponse = await fetch('http://localhost:5174/api/', {
      headers: { 'Accept': 'application/json' }
    });

    if (frontendApiResponse.ok) {
      const frontendData = await frontendApiResponse.json();
      console.log('✅ Frontend API proxy working:', frontendData.name);
    } else {
      console.log('⚠️  Frontend API proxy not working (expected if nginx not configured)');
    }

  } catch (error) {
    console.error('❌ API test failed:', error.message);
  }
};

testApi();
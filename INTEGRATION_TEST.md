# Integration Test for LNPixels

This script tests the integration between the new lnpixels-app and the API backend.

## Steps to test:

1. Start the API server:
   ```bash
   cd api && npm run dev
   ```

2. In another terminal, start the lnpixels-app:
   ```bash
   cd lnpixels-app && npm run dev
   ```

3. Open the lnpixels-app in your browser (usually http://localhost:3002)

4. Test the integration:
   - Draw some pixels on the canvas
   - Try both paint and text modes
   - Click the save button to test the new bulk pixels endpoint
   - Verify that the pricing is calculated correctly

## What was implemented:

1. **New API Endpoint**: `POST /api/invoices/pixels`
   - Accepts a specific set of pixels instead of a rectangle
   - Validates pixel coordinates, colors, and letters
   - Calculates pricing using the backend pricing logic
   - Supports up to 1000 pixels per request

2. **Updated Frontend**:
   - Modified API client to use the new endpoint
   - Updated save modal to send pixels to the new endpoint
   - Fixed WebSocket connections to use correct events
   - Aligned pricing logic with backend

3. **Pricing Updates**:
   - Black pixels (#000000) now cost 1 sat (like basic pixels)
   - Colored pixels cost 10 sats
   - Letter pixels cost 100 sats
   - Overwrite rule: 2x last sold price or base price, whichever is higher

4. **CORS Configuration**:
   - Added support for the new lnpixels-app port (3002)
   - Updated both HTTP and WebSocket CORS settings

## Testing the new endpoint manually:

```bash
curl -X POST http://localhost:3000/api/invoices/pixels \
  -H "Content-Type: application/json" \
  -d '{
    "pixels": [
      {"x": 0, "y": 0, "color": "#ff0000", "letter": "A"},
      {"x": 5, "y": 10, "color": "#00ff00"},
      {"x": 15, "y": 20, "color": "#000000"}
    ]
  }'
```

Expected response: Invoice with amount of 111 sats (100 + 10 + 1)

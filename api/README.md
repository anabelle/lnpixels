# LNPixels API

A Node.js API for the LNPixels application, providing Lightning Network payment integration via NakaPay.

## Features

- **Pixel Management**: Store and retrieve pixel data with coordinates, colors, and letters
- **Lightning Payments**: Create invoices for pixel purchases using NakaPay
- **Real-time Updates**: WebSocket integration for live pixel updates
- **Bulk Operations**: Purchase multiple pixels at once with rectangle selection
- **Activity Feed**: Recent pixel purchase activity
- **Nostr Integration**: Event verification for decentralized broadcasting

## Setup

1. Install dependencies:
```bash
pnpm install
```

2. Copy environment variables:
```bash
cp .env.example .env
```

3. Add your NakaPay API key to `.env`:
```
NAKAPAY_API_KEY=your_api_key_here
NAKAPAY_WEBHOOK_SECRET=your_webhook_secret_here
```

4. Start the development server:
```bash
pnpm run dev
```

## API Endpoints

### GET /api/
Get API information and available endpoints.

**Example:**
```bash
curl "http://localhost:3000/api/"
```

**Response:**
```json
{
  "name": "LNPixels API",
  "version": "1.0.0",
  "endpoints": [
    "GET /api/",
    "GET /api/pixels",
    "POST /api/invoices",
    "POST /api/invoices/bulk",
    "GET /api/activity",
    "GET /api/verify/:eventId",
    "POST /api/payments/webhook"
  ]
}
```

### GET /api/pixels
Get pixels within a specified rectangle.

**Query Parameters:**
- `x1`, `y1`, `x2`, `y2`: Rectangle coordinates (required)

**Example:**
```bash
curl "http://localhost:3000/api/pixels?x1=0&y1=0&x2=10&y2=10"
```

**Response:**
```json
{
  "pixels": [
    {"x": 0, "y": 0, "color": "#FF0000", "type": "color", "letter": null, "sats": 10},
    {"x": 1, "y": 0, "color": "#000000", "type": "basic", "letter": null, "sats": 1}
  ],
  "total": 2
}
```

### POST /api/invoices
Create an invoice for a single pixel purchase.

**Body:**
```json
{
  "x": 0,
  "y": 0,
  "color": "#ff0000",
  "type": "color"
}
```

**Parameters:**
- `x`, `y`: Pixel coordinates (0-999)
- `color`: Hex color code (#RRGGBB)
- `type`: Pixel type ("basic", "color", or "letter")
- `letter`: Optional single character (only for "letter" type)

**Example:**
```bash
curl -X POST "http://localhost:3000/api/invoices" \
  -H "Content-Type: application/json" \
  -d '{"x": 100, "y": 50, "color": "#FF5733", "type": "color"}'
```

**Response:**
```json
{
  "invoice": "lnbc10n1pjg6q8hpp5...",
  "amount": 10,
  "description": "Purchase color pixel at (100, 50)",
  "payment_hash": "a1b2c3d4...",
  "expires_at": 1640995200
}
```

### POST /api/invoices/bulk
Create an invoice for bulk pixel purchase (rectangle).

**Body:**
```json
{
  "x1": 100,
  "y1": 50,
  "x2": 110,
  "y2": 60,
  "color": "#ff0000",
  "type": "color",
  "letters": "HELLO"
}
```

**Example:**
```bash
curl -X POST "http://localhost:3000/api/invoices/bulk" \
  -H "Content-Type: application/json" \
  -d '{"x1": 100, "y1": 50, "x2": 110, "y2": 60, "color": "#FF5733", "type": "color"}'
```

**Response:**
```json
{
  "invoice": "lnbc100n1pjg7q9hpp5...",
  "amount": 100,
  "pixel_count": 121,
  "description": "Purchase 121 color pixels in rectangle (100,50) to (110,60)",
  "payment_hash": "e5f6g7h8...",
  "expires_at": 1640995200
}
```

### GET /api/activity
Get recent canvas activity and purchases.

**Query Parameters:**
- `limit`: Number of activities to return (default: 50, max: 100)
- `offset`: Pagination offset (default: 0)

**Example:**
```bash
curl "http://localhost:3000/api/activity?limit=10"
```

**Response:**
```json
{
  "activities": [
    {
      "id": 12345,
      "type": "pixel_purchase",
      "x": 100,
      "y": 50,
      "color": "#FF5733",
      "pixel_type": "color",
      "amount": 10,
      "timestamp": 1640995200,
      "payment_hash": "a1b2c3d4..."
    }
  ],
  "total": 1
}
```

### GET /api/verify/:eventId
Verify the authenticity of a Nostr event.

**Path Parameters:**
- `eventId`: Nostr event ID to verify

**Example:**
```bash
curl "http://localhost:3000/api/verify/a1b2c3d4e5f6..."
```

**Response:**
```json
{
  "verified": true,
  "event": {
    "id": "a1b2c3d4e5f6...",
    "pubkey": "npub1...",
    "created_at": 1640995200,
    "kind": 1,
    "content": "Just purchased pixels on LNPixels!"
  }
}
```

### POST /api/payments/webhook
Webhook endpoint for payment confirmations.

**Headers:**
- `X-Nakapay-Signature`: Webhook signature for verification
- `Content-Type`: application/json

**Body:**
```json
{
  "payment_hash": "a1b2c3d4...",
  "amount": 10,
  "status": "completed",
  "timestamp": 1640995200
}
```

**Response:**
```json
{
  "status": "processed",
  "pixels_updated": 1
}
```

## WebSocket Events

The API provides real-time updates via WebSocket at `ws://localhost:3000`.

**Connection Example:**
```javascript
import io from 'socket.io-client';
const socket = io('http://localhost:3000');

// Listen for pixel updates
socket.on('pixelUpdate', (data) => {
  console.log('Pixel updated:', data);
  // data: { x: 100, y: 50, color: '#FF5733', type: 'color' }
});

// Listen for bulk updates
socket.on('bulkUpdate', (data) => {
  console.log('Bulk pixels updated:', data);
  // data: { pixels: [...], payment_hash: '...' }
});
```

## Environment Variables

- `NAKAPAY_API_KEY`: Your NakaPay API key (required for production)
- `NAKAPAY_WEBHOOK_SECRET`: Webhook secret for payment verification
- `PORT`: Server port (default: 3000)

## Testing

Run the test suite:
```bash
pnpm run test
```

## Development

The API uses:
- **Express.js** for HTTP server
- **Socket.IO** for real-time communication
- **better-sqlite3** for SQLite database
- **NakaPay SDK** for Lightning payments
- **Vitest** for testing
- **TypeScript** for type safety
- **Node.js 22+** (see root .nvmrc)
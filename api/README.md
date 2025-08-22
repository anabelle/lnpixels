# LNPixels API

A Node.js API for the LNPixels application, providing Lightning Network payment integration via NakaPay.

## Features

- **Pixel Management**: Store and retrieve pixel data with coordinates, colors, and letters
- **Lightning Payments**: Create invoices for pixel purchases using NakaPay
- **Real-time Updates**: WebSocket integration for live pixel updates
- **Bulk Operations**: Purchase multiple pixels at once with rectangle selection

## Setup

1. Install dependencies:
```bash
npm install
```

2. Copy environment variables:
```bash
cp .env.example .env
```

3. Add your NakaPay API key to `.env`:
```
NAKAPAY_API_KEY=your_api_key_here
```

4. Start the development server:
```bash
npm run dev
```

## API Endpoints

### GET /api/pixels
Get pixels within a specified rectangle.

**Query Parameters:**
- `x1`, `y1`, `x2`, `y2`: Rectangle coordinates

**Example:**
```bash
curl "http://localhost:3000/api/pixels?x1=0&y1=0&x2=10&y2=10"
```

### POST /api/invoices
Create an invoice for a single pixel purchase.

**Body:**
```json
{
  "x": 0,
  "y": 0,
  "color": "#ff0000",
  "letter": "A"
}
```

**Example:**
```bash
curl -X POST http://localhost:3000/api/invoices \
  -H "Content-Type: application/json" \
  -d '{"x": 0, "y": 0, "color": "#ff0000", "letter": "A"}'
```

### POST /api/invoices/bulk
Create an invoice for bulk pixel purchase (rectangle).

**Body:**
```json
{
  "x1": 0,
  "y1": 0,
  "x2": 2,
  "y2": 2,
  "color": "#ff0000",
  "letters": "HELLO"
}
```

### POST /api/payments/webhook
Webhook endpoint for payment confirmations.

## Testing

Run the test suite:
```bash
npm run test
```

## Environment Variables

- `NAKAPAY_API_KEY`: Your NakaPay API key (required for production)
- `NAKAPAY_DESTINATION_WALLET`: Lightning wallet address for receiving payments (optional)

## Development

The API uses:
- **Express.js** for HTTP server
- **Socket.IO** for real-time communication
- **NakaPay SDK** for Lightning payments
- **Vitest** for testing
- **TypeScript** for type safety
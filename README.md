# LNPixels 🎨

A collaborative pixel art platform built with Lightning Network payments. Create, share, and monetize pixel art on a decentralized canvas.

## 🌟 Features

- **Collaborative Canvas**: Real-time pixel art creation with multiple users
- **Lightning Network Integration**: Pay-per-pixel with instant Bitcoin payments via NakaPay
- **QR Code Payments**: Scan QR codes with any Lightning wallet
- **WebSocket Real-time Updates**: Live canvas updates for all connected users
- **Professional Payment UI**: Polished modal with invoice display and error handling
- **Responsive Design**: Works on desktop and mobile devices
- **Development Ready**: Hot reload, TypeScript, and modern tooling
- **Comprehensive Testing**: TDD approach with extensive test coverage

## 🏗️ Architecture

### Backend (API)
- **Framework**: Node.js + Express + TypeScript
- **Real-time**: Socket.IO for WebSocket connections
- **Database**: SQLite with better-sqlite3
- **Payments**: Lightning Network integration via Nakapay
- **Development**: Hot reload with tsx

### Frontend (Web)
- **Framework**: React + TypeScript + Vite
- **State Management**: Zustand
- **Real-time**: Socket.IO client
- **Styling**: Tailwind CSS + shadcn/ui
- **Development**: Hot Module Replacement (HMR)

## 🚀 Quick Start

### Prerequisites
- Node.js 18+ (Node 20+ recommended)
- npm or yarn
- Git

### Installation

1. **Clone the repository**
   ```bash
   git clone <your-repo-url>
   cd lnpixels
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Start development servers**
   ```bash
   # Start both API and Web servers
   npm run dev

   # Or start individually:
   npm run dev -w api    # API server on port 3000
   npm run dev -w web    # Web server on port 5173
   ```

4. **Access the application**
   - **Development**: http://localhost:5173
   - **Production**: https://your-domain.com

## 📁 Project Structure

```
lnpixels/
├── api/                    # Backend API server
│   ├── src/
│   │   ├── server.ts       # Main Express server
│   │   └── ...
│   ├── test/               # API tests
│   ├── package.json
│   └── tsconfig.json
├── web/                    # Frontend React app
│   ├── src/
│   │   ├── App.tsx         # Main React component
│   │   ├── main.tsx        # React entry point
│   │   └── ...
│   ├── test/               # Frontend tests
│   ├── package.json
│   ├── vite.config.ts      # Vite configuration
│   └── tsconfig.json
├── ops/                    # Operations and docs
│   └── design.md           # Project design document
├── ecosystem.config.js     # PM2 process manager config
└── README.md              # This file
```

## 🛠️ Development

### Available Scripts

```bash
# Install all dependencies
npm install

# Start development servers
npm run dev

# Run tests
npm run test

# Run tests for specific workspace
npm run test -w api    # API tests only
npm run test -w web    # Web tests only

# Build for production
npm run build -w web   # Build React app
```

### Environment Setup

The application uses development defaults and doesn't require additional environment variables for basic functionality.

### Testing

```bash
# Run all tests
npm run test

# Run API tests only
cd api && npm run test

# Run Web tests only (note: coverage has happy-dom dependency issue)
cd web && npm run test

# Run tests in watch mode
npm run test -- --watch

# Run tests with coverage (API only, Web has dependency issue)
cd api && npm run test -- --coverage
```

### Test Coverage
- **API Tests**: ✅ Complete coverage for pricing, validation, and payment flows
- **Web Tests**: ✅ PaymentModal (8 tests), ColorPicker (11 tests), Canvas integration
- **Integration Tests**: ✅ End-to-end payment flows and WebSocket communication
- **TDD Approach**: ✅ All features developed with red-green-refactor cycles

## 🚀 Deployment

### Development Deployment

The project includes PM2 configuration for easy deployment:

```bash
# Install PM2 globally
npm install -g pm2

# Start applications with PM2
pm2 start ecosystem.config.js

# Save PM2 configuration for auto-restart
pm2 save

# View application status
pm2 status

# View logs
pm2 logs
```

### Production Deployment

1. **Build the frontend**
   ```bash
   npm run build -w web
   ```

2. **Configure nginx** (see nginx configuration in ecosystem.config.js)

3. **Set up SSL** (using Let's Encrypt/Certbot)

4. **Configure domain** and DNS

## 🔧 Configuration

### PM2 Configuration
The `ecosystem.config.js` file contains:
- API server on port 3000
- Web server on port 5173
- Auto-restart on file changes
- Memory and CPU monitoring

### Nginx Configuration
The nginx configuration provides:
- Reverse proxy for both API and Web
- WebSocket support for Socket.IO
- SSL termination
- Gzip compression
- Security headers

## 📊 API Reference

The LNPixels API provides RESTful endpoints for canvas management, payment processing, and real-time updates via WebSocket.

### Base URL
```
https://ln.pixel.xx.kg/api
```

### Authentication
Currently, no authentication is required for read operations. Payment operations are handled via Lightning Network invoices.

---

## 🎨 Canvas Management

### Get Canvas Pixels
Retrieve pixel data within a specified rectangle area.

**Endpoint:** `GET /api/pixels`

**Query Parameters:**
- `x1` (number, required): Left coordinate of rectangle
- `y1` (number, required): Top coordinate of rectangle
- `x2` (number, required): Right coordinate of rectangle
- `y2` (number, required): Bottom coordinate of rectangle

**Example Request:**
```bash
curl "https://ln.pixel.xx.kg/api/pixels?x1=0&y1=0&x2=10&y2=10"
```

**Response (200 OK):**
```json
{
  "pixels": [
    {"x": 0, "y": 0, "color": "#FF0000", "type": "color", "letter": null},
    {"x": 1, "y": 0, "color": "#000000", "type": "basic", "letter": null},
    {"x": 2, "y": 0, "color": "#FFFFFF", "type": "letter", "letter": "P"}
  ],
  "total": 3
}
```

**Error Responses:**
- `400 Bad Request`: Invalid coordinates
- `500 Internal Server Error`: Database error

### Get API Information
Retrieve API version and available endpoints.

**Endpoint:** `GET /api/`

**Example Request:**
```bash
curl "https://ln.pixel.xx.kg/api/"
```

**Response (200 OK):**
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

---

## 💰 Payment Management

### Create Single Pixel Invoice
Generate a Lightning invoice for purchasing a single pixel.

**Endpoint:** `POST /api/invoices`

**Request Body:**
```json
{
  "x": 100,
  "y": 50,
  "color": "#FF5733",
  "type": "color"
}
```

**Parameters:**
- `x` (number, required): X coordinate (0-999)
- `y` (number, required): Y coordinate (0-999)
- `color` (string, required): Hex color code (#RRGGBB)
- `type` (string, required): Pixel type ("basic", "color", or "letter")

**Example Request:**
```bash
curl -X POST "https://ln.pixel.xx.kg/api/invoices" \
  -H "Content-Type: application/json" \
  -d '{"x": 100, "y": 50, "color": "#FF5733", "type": "color"}'
```

**Response (200 OK):**
```json
{
  "invoice": "lnbc10n1pjg6q8hpp5...",
  "amount": 10,
  "description": "Purchase color pixel at (100, 50)",
  "payment_hash": "a1b2c3d4...",
  "expires_at": 1640995200
}
```

### Create Bulk Pixel Invoice
Generate a Lightning invoice for purchasing multiple pixels in a rectangle.

**Endpoint:** `POST /api/invoices/bulk`

**Request Body:**
```json
{
  "x1": 100,
  "y1": 50,
  "x2": 110,
  "y2": 60,
  "color": "#FF5733",
  "type": "color"
}
```

**Example Request:**
```bash
curl -X POST "https://ln.pixel.xx.kg/api/invoices/bulk" \
  -H "Content-Type: application/json" \
  -d '{"x1": 100, "y1": 50, "x2": 110, "y2": 60, "color": "#FF5733", "type": "color"}'
```

**Response (200 OK):**
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

### Payment Webhook
Handle payment confirmations from Lightning Network.

**Endpoint:** `POST /api/payments/webhook`

**Headers:**
- `X-Nakapay-Signature`: Webhook signature for verification
- `Content-Type`: application/json

**Request Body:**
```json
{
  "payment_hash": "a1b2c3d4...",
  "amount": 10,
  "status": "completed",
  "timestamp": 1640995200
}
```

**Response (200 OK):**
```json
{
  "status": "processed",
  "pixels_updated": 1
}
```

---

## 📈 Activity & Verification

### Get Recent Activity
Retrieve recent canvas activity and purchases.

**Endpoint:** `GET /api/activity`

**Query Parameters:**
- `limit` (number, optional): Number of activities to return (default: 50, max: 100)
- `offset` (number, optional): Pagination offset (default: 0)

**Example Request:**
```bash
curl "https://ln.pixel.xx.kg/api/activity?limit=10"
```

**Response (200 OK):**
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
    },
    {
      "id": 12344,
      "type": "bulk_purchase",
      "x1": 200,
      "y1": 100,
      "x2": 205,
      "y2": 105,
      "color": "#00FF00",
      "pixel_type": "basic",
      "pixel_count": 36,
      "amount": 36,
      "timestamp": 1640995100,
      "payment_hash": "e5f6g7h8..."
    }
  ],
  "total": 2
}
```

### Verify Nostr Event
Verify the authenticity of a Nostr event related to canvas activity.

**Endpoint:** `GET /api/verify/:eventId`

**Path Parameters:**
- `eventId` (string, required): Nostr event ID to verify

**Example Request:**
```bash
curl "https://ln.pixel.xx.kg/api/verify/a1b2c3d4e5f6..."
```

**Response (200 OK):**
```json
{
  "verified": true,
  "event": {
    "id": "a1b2c3d4e5f6...",
    "pubkey": "npub1...",
    "created_at": 1640995200,
    "kind": 1,
    "tags": [],
    "content": "Just purchased pixels on LNPixels!",
    "sig": "signature..."
  }
}
```

---

## 🔌 WebSocket Real-time Updates

The API also provides real-time updates via WebSocket for live canvas synchronization.

**WebSocket URL:** `wss://ln.pixel.xx.kg`

**Connection Example:**
```javascript
const socket = io('https://ln.pixel.xx.kg');

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

---

## 📝 Error Handling

All API endpoints return standardized error responses:

```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Invalid pixel coordinates",
    "details": {
      "x": "Must be between 0 and 999",
      "y": "Must be between 0 and 999"
    }
  }
}
```

**Common Error Codes:**
- `VALIDATION_ERROR`: Invalid request parameters
- `PAYMENT_ERROR`: Payment processing failed
- `DATABASE_ERROR`: Internal database error
- `RATE_LIMITED`: Too many requests
- `NOT_FOUND`: Resource not found

---

## ⚡ Rate Limiting

- **Canvas Queries**: 100 requests per minute per IP
- **Invoice Creation**: 10 requests per minute per IP
- **Activity Feed**: 30 requests per minute per IP
- **Verification**: 50 requests per minute per IP

Rate limit headers are included in responses:
```
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 99
X-RateLimit-Reset: 1640995260
```

## 🎨 Frontend Components

### Main Components
- **Canvas**: Interactive pixel art canvas with pan/zoom
- **PurchasePanel**: Pixel selection and pricing interface
- **PaymentModal**: Professional payment interface with QR codes
- **ActivityFeed**: Real-time activity updates
- **ColorPicker**: Advanced color selection with presets
- **MobileTabs**: Mobile-responsive navigation

### State Management
- **Canvas State**: Current pixel data and user interactions
- **Payment State**: Invoice management and payment flow
- **WebSocket State**: Real-time updates and connections
- **Selection State**: Rectangle and pixel selection management

## 💰 Payment Flow

1. **Select Pixels**: Use rectangle selection or click individual pixels
2. **Choose Pixel Type**: Basic (1 sat), Color (10 sats), or Letter (100 sats)
3. **Click "Purchase Pixels"**: Opens professional payment modal
4. **Scan QR Code**: Use any Lightning wallet to scan and pay
5. **Automatic Confirmation**: Payment confirmed via webhook, pixels updated in real-time

### Payment Features
- **Lightning Network**: Instant Bitcoin payments via NakaPay
- **QR Codes**: Easy wallet integration with scannable codes
- **Invoice Display**: Copyable Lightning invoice text
- **Real-time Status**: Live payment confirmation updates
- **Error Handling**: Comprehensive error messages and retry options

## 🔒 Security

- **Input Validation**: All user inputs are validated and sanitized
- **Payment Security**: Lightning Network payment verification via NakaPay
- **API Key Protection**: Server-side only API key handling
- **Webhook Verification**: Payment confirmation signature validation
- **WebSocket Security**: Connection limits and rate limiting
- **CORS**: Proper cross-origin resource sharing configuration

## ✅ Current Implementation Status

### MVP Features ✅ COMPLETED
- **Payment Integration**: Full Lightning Network support with NakaPay
- **Real-time Updates**: WebSocket communication for live canvas updates
- **Professional UI**: Polished payment modal with QR codes and error handling
- **Mobile Responsive**: Works seamlessly on all device sizes
- **Comprehensive Testing**: Extensive test coverage with TDD approach
- **Security**: Payment verification and input sanitization
- **Performance**: Optimized for real-time collaboration

### Recent Updates
- ✅ **Fixed Pricing Bug**: Basic pixels now correctly charge 1 sat (was 10 sats)
- ✅ **Enhanced Payment UI**: Professional modal with QR codes and invoice display
- ✅ **Improved Error Handling**: Better user feedback and retry mechanisms
- ✅ **Mobile Optimization**: Responsive design for all screen sizes
- ✅ **Test Coverage**: 8 PaymentModal tests + comprehensive API testing

## 📈 Performance

- **Code Splitting**: Dynamic imports for better loading
- **Caching**: Browser caching for static assets
- **Compression**: Gzip compression for all responses
- **WebSocket Optimization**: Efficient real-time updates

## 🔧 Troubleshooting

### Common Development Issues

**Happy-DOM Dependency Conflicts**
```bash
# If you encounter happy-dom issues in web tests
cd web
rm -rf node_modules
npm install

# Alternative: Use jsdom for testing
npm install --save-dev jsdom
# Update vitest.config.js to use jsdom instead of happy-dom
```

**WebSocket Connection Issues**
```bash
# Test WebSocket connectivity
curl -I http://localhost:3000
curl -I http://localhost:5173

# Check if ports are available
lsof -i :3000
lsof -i :5173
```

**Database Connection Issues**
```bash
# Check SQLite database
ls -la api/*.db

# Reset database if corrupted
cd api
rm -f *.db
npm run migrate  # If migration script exists
```

**Payment Integration Issues**
```bash
# Test NakaPay API connection
curl -X GET "https://api.nakapay.app/health"

# Verify webhook endpoint
curl -X POST http://localhost:3000/api/payments/webhook \
  -H "Content-Type: application/json" \
  -d '{"test": "webhook"}'
```

### Build and Deployment Issues

**Build Failures**
```bash
# Clear all caches
npm run clean
rm -rf node_modules api/node_modules web/node_modules

# Reinstall dependencies
npm install

# Build step by step
npm run build -w api
npm run build -w web
```

**PM2 Deployment Issues**
```bash
# Check PM2 status
pm2 status

# View logs
pm2 logs lnpixels-api
pm2 logs lnpixels-web

# Restart services
pm2 restart ecosystem.config.js
```

**Environment Configuration Issues**
```bash
# Verify environment files
cat api/.env
cat web/.env

# Check environment variable loading
cd api && node -e "console.log(process.env.NAKAPAY_API_KEY)"
```

### Performance Issues

**Slow Canvas Rendering**
```bash
# Check browser developer tools
# Look for WebSocket connection issues
# Monitor memory usage in browser

# Optimize canvas settings
# Reduce pixel update frequency if needed
```

**High Memory Usage**
```bash
# Monitor Node.js processes
top -p $(pgrep -f "node")

# Check for memory leaks
# Use Chrome DevTools memory profiler
```

**Database Performance**
```bash
# Analyze SQLite performance
sqlite3 pixels.db ".schema"
sqlite3 pixels.db "ANALYZE;"

# Check database file size
ls -lh api/*.db
```

### Testing Issues

**Test Coverage Problems**
```bash
# Run tests with coverage
cd api && npm run test -- --coverage

# Check coverage report
open api/coverage/index.html
```

**Integration Test Failures**
```bash
# Start API server for integration tests
cd api && npm run dev

# In another terminal, run integration tests
npm run test:integration
```

### Getting Help

**Debug Information to Include**
When reporting issues, please provide:
- Operating system and version
- Node.js version (`node --version`)
- npm version (`npm --version`)
- Browser and version (for web issues)
- Full error messages and stack traces
- Steps to reproduce the issue
- Environment configuration (without sensitive keys)

**Community Support**
- Open issues on the [LNPixels repository](https://github.com/anabelle/pixel)
- Check existing issues for similar problems
- Provide minimal reproduction cases
- Include screenshots for UI issues

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

### Development Guidelines

- Follow the existing code style
- Write tests for new features
- Update documentation as needed
- Use TypeScript for type safety
- Follow the TDD approach outlined in `design.md`

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- Lightning Network for enabling instant payments
- Socket.IO for real-time communication
- React ecosystem for excellent developer experience
- Vite for fast development and building

## 📞 Support

For support, please open an issue on GitHub or contact the development team.

---

**Happy pixelating! 🎨⚡**
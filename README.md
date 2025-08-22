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

## 📊 API Endpoints

### Canvas Management
- `GET /api/pixels?x1=0&y1=0&x2=10&y2=10` - Get pixels within rectangle
- `GET /api/` - API info and available endpoints

### Payment Management
- `POST /api/invoices` - Create single pixel payment invoice
- `POST /api/invoices/bulk` - Create bulk rectangle payment invoice
- `POST /api/payments/webhook` - Payment confirmation webhook

### Activity & Verification
- `GET /api/activity` - Get recent activity feed
- `GET /api/verify/:eventId` - Verify Nostr event

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
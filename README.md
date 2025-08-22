# LNPixels 🎨

A collaborative pixel art platform built with Lightning Network payments. Create, share, and monetize pixel art on a decentralized canvas.

## 🌟 Features

- **Collaborative Canvas**: Real-time pixel art creation with multiple users
- **Lightning Network Integration**: Pay-per-pixel with instant Bitcoin payments
- **WebSocket Real-time Updates**: Live canvas updates for all connected users
- **Responsive Design**: Works on desktop and mobile devices
- **Development Ready**: Hot reload, TypeScript, and modern tooling

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

# Run tests in watch mode
npm run test -- --watch

# Run tests with coverage
npm run test -- --coverage
```

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
- `GET /api/pixels` - Get all pixels
- `POST /api/pixels` - Set pixel (requires payment)
- `GET /api/pixels/:id` - Get pixel by ID

### Payment Management
- `POST /api/invoices` - Create payment invoice
- `POST /api/invoices/bulk` - Create bulk payment invoice
- `POST /api/payments/webhook` - Payment webhook

### Activity & Verification
- `GET /api/activity` - Get recent activity
- `GET /api/verify/:eventId` - Verify Nostr event

## 🎨 Frontend Components

### Main Components
- **Canvas**: Interactive pixel art canvas
- **Purchase Panel**: Payment interface for pixels
- **Activity Feed**: Real-time activity updates
- **User Interface**: Responsive design with mobile support

### State Management
- **Canvas State**: Current pixel data and user interactions
- **Payment State**: Invoice management and payment flow
- **WebSocket State**: Real-time updates and connections

## 🔒 Security

- **Input Validation**: All user inputs are validated and sanitized
- **Payment Security**: Lightning Network payment verification
- **WebSocket Security**: Connection limits and rate limiting
- **CORS**: Proper cross-origin resource sharing configuration

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
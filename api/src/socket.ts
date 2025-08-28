import { Server as SocketServer } from 'socket.io';
import { createServer } from 'http';
import express from 'express';

export function setupSocket(app: express.Application) {
  const server = createServer(app);
  const io = new SocketServer(server, {
    cors: {
      origin: [
        "http://localhost:5173",
        "http://127.0.0.1:5173",
        "https://lnpixels.heyanabelle.com",
        "https://vm-522.lnvps.cloud",
        "http://lnpixels.qzz.io",
        "https://lnpixels.qzz.io"
      ],
      methods: ["GET", "POST"],
      credentials: true
    }
  });

  // Default namespace for Socket.IO handshake
  io.on('connection', (socket) => {
    console.log('Client connected to default namespace:', socket.id);
    socket.on('disconnect', () => {
      console.log('Client disconnected from default namespace:', socket.id);
    });
  });

  // Create namespace for API endpoints
  const apiNamespace = io.of('/api');

  // Socket.IO event handling on /api namespace
  apiNamespace.on('connection', (socket) => {
    console.log('Client connected to /api namespace:', socket.id);
    socket.on('disconnect', () => {
      console.log('Client disconnected from /api namespace:', socket.id);
    });
  });

  return { server, io: apiNamespace };
}
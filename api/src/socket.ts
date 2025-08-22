import { Server as SocketServer } from 'socket.io';
import { createServer } from 'http';
import express from 'express';

export function setupSocket(app: express.Application) {
  const server = createServer(app);
  const io = new SocketServer(server);

  // Socket.IO event handling can be added here as needed
  io.on('connection', (socket) => {
    console.log('Client connected:', socket.id);
    socket.on('disconnect', () => {
      console.log('Client disconnected:', socket.id);
    });
  });

  return { server, io };
}
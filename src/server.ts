// src/server.ts

import express from 'express';
import http from 'http';
import { Server as IoServer } from 'socket.io';
import pino from 'pino';

// Logger
const logger = pino({ level: process.env.LOG_LEVEL || 'info' });

// إنشاء تطبيق Express
const app = express();

// Health-check لتجنّب سبات الحاوية
app.get('/healthz', (_req, res) => res.sendStatus(200));

// إنشاء خادم HTTP من Express
const server = http.createServer(app);

// تهيئة Socket.io على نفس الخادم، مع المسار /ws وCORS
const io = new IoServer(server, {
  path: '/ws',
  cors: {
    origin: [
      'https://ditonachat-new.vercel.app',
      'https://ditonachat-frontend.vercel.app',
    ],
    methods: ['GET', 'POST'],
  },
});

// منطق WebSocket: انتظار شريك، تمرير offer/answer/ICE
let waitingUser: string | null = null;

io.on('connection', (socket) => {
  logger.info(`🔌 WS client connected: ${socket.id}`);

  socket.on('ready', () => {
    if (waitingUser) {
      io.to(waitingUser).emit('partner', { isInitiator: true, partnerId: socket.id });
      socket.emit('partner',     { isInitiator: false, partnerId: waitingUser });
      waitingUser = null;
    } else {
      waitingUser = socket.id;
    }
  });

  socket.on('offer', ({ target, offer }) => {
    io.to(target).emit('offer', { from: socket.id, offer });
  });

  socket.on('answer', ({ target, answer }) => {
    io.to(target).emit('answer', { from: socket.id, answer });
  });

  socket.on('ice-candidate', ({ target, candidate }) => {
    io.to(target).emit('ice-candidate', candidate);
  });

  socket.on('disconnect', (reason) => {
    logger.warn(`❌ WS client disconnected (${socket.id}): ${reason}`);
    if (waitingUser === socket.id) waitingUser = null;
  });
});

// استمع على المنفذ الديناميكي من Render
const PORT = Number(process.env.PORT) || 3001;
server.listen(PORT, () => {
  logger.info(`🚀 Server listening on port ${PORT}`);
});

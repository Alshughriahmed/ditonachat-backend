// src/server.ts

import express from 'express';
import http from 'http';
import { Server as IoServer } from 'socket.io';
import pino from 'pino';

const logger = pino({ level: process.env.LOG_LEVEL || 'info' });
const app = express();

// هنا نعرّف server قبل استخدامه
const server = http.createServer(app);

const io = new IoServer(server, {
  path: '/ws',
  cors: {
    origin: ['https://ditonachat-new.vercel.app'],
    methods: ['GET', 'POST'],
  },
});

io.on('connection', socket => {
  logger.info(`🔌 New WS client: ${socket.id}`);
  socket.on('ready', () => socket.broadcast.emit('partner', { isInitiator: false }));
  socket.on('offer', offer => socket.broadcast.emit('offer', offer));
  socket.on('answer', ans => socket.broadcast.emit('answer', ans));
  socket.on('ice-candidate', cand => socket.broadcast.emit('ice-candidate', cand));
  socket.on('disconnect', reason => logger.warn(`❌ Disconnected ${socket.id}: ${reason}`));
});

app.get('/healthz', (_req, res) => res.sendStatus(200));

const PORT = Number(process.env.PORT) || 3001;
server.listen(PORT, () => {
  logger.info(`🚀 Server listening on port ${PORT}`);
});

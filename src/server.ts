import 'dotenv/config';
import fs from 'fs';
import path from 'path';
import fastify from 'fastify';
import fastifyCors from '@fastify/cors';
import { Server as IoServer } from 'socket.io';

// --- Load env ---
const PORT            = Number(process.env.PORT || 443);
const CERT_PATH       = process.env.CERT_PATH!;
const FRONTEND_ORIGIN = process.env.FRONTEND_ORIGIN!;

// --- HTTPS certs ---
const httpsOptions = {
  key:  fs.readFileSync(path.join(CERT_PATH, 'privkey.pem')),
  cert: fs.readFileSync(path.join(CERT_PATH, 'fullchain.pem'))
};

// --- Fastify instance over HTTPS ---
const app = fastify({ https: httpsOptions });

// --- CORS setup ---
await app.register(fastifyCors, {
  origin: FRONTEND_ORIGIN
});

// --- Health check ---
app.get('/health', async () => ({ status: 'ok' }));

// --- Socket.IO over the same server ---
const io = new IoServer(app.server, {
  path: '/ws',
  cors: {
    origin: FRONTEND_ORIGIN,
    methods: ['GET','POST']
  }
});

// --- User matching types and state ---
interface UserData {
  id: string;
  isVIP: boolean;
  gender: string;
  country: string;
  interests: string[];
}

const waitingUsers: UserData[]     = [];
const userPairs   = new Map<string,string>();

function findMatch(user: UserData): string | null {
  if (user.isVIP) {
    let m = waitingUsers.find(w => w.isVIP && w.gender===user.gender && w.country===user.country);
    if (m) return m.id;
    m = waitingUsers.find(w => w.gender===user.gender);
    if (m) return m.id;
    m = waitingUsers.find(w => w.gender==='paar');
    if (m) return m.id;
    m = waitingUsers.find(w=> w.interests.some(i=>user.interests.includes(i)));
    if (m) return m.id;
  }
  if (!user.isVIP) {
    const m = waitingUsers.find(w=> !w.isVIP && w.country===user.country);
    if (m) return m.id;
  }
  if (waitingUsers.length) {
    const rnd = waitingUsers[Math.floor(Math.random()*waitingUsers.length)];
    return rnd.id;
  }
  return null;
}

// --- Socket handlers ---
io.on('connection', socket => {
  console.log(`🔌 Connected: ${socket.id}`);

  let me: UserData = {
    id: socket.id,
    isVIP: false,
    gender: 'male',
    country: 'DE',
    interests: []
  };

  // join queue (client must emit this)
  socket.on('join-queue', (data: Partial<UserData>) => {
    me = { ...me, ...data, id: socket.id };
    const partner = findMatch(me);
    if (partner) {
      // remove partner from waiting
      const idx = waitingUsers.findIndex(u=>u.id===partner);
      if (idx>=0) waitingUsers.splice(idx,1);
      // pair
      userPairs.set(me.id, partner);
      userPairs.set(partner, me.id);
      io.to(me.id).emit('partner-found', partner);
      io.to(partner).emit('partner-found', me.id);
      console.log(`✅ Paired ${me.id} ↔ ${partner}`);
    } else {
      waitingUsers.push(me);
      console.log(`⏳ Queued ${me.id} (waiting: ${waitingUsers.length})`);
    }
  });

  // next-partner
  socket.on('next-partner', () => {
    const cur = userPairs.get(socket.id);
    if (cur) {
      io.to(cur).emit('partner-disconnected');
      userPairs.delete(cur);
      userPairs.delete(socket.id);
    }
    waitingUsers.push(me);
    console.log(`🔄 ${socket.id} looking for next`);
  });

  // relay signaling
  socket.on('signal', payload => {
    const peer = userPairs.get(socket.id);
    if (peer) io.to(peer).emit('signal', payload);
  });

  // disconnect cleanup
  socket.on('disconnect', () => {
    console.log(`❌ Disconnected: ${socket.id}`);
    const idx = waitingUsers.findIndex(u=>u.id===socket.id);
    if (idx>=0) waitingUsers.splice(idx,1);
    const peer = userPairs.get(socket.id);
    if (peer) {
      io.to(peer).emit('partner-disconnected');
      userPairs.delete(peer);
      userPairs.delete(socket.id);
    }
  });
});

// --- Start server ---
app.listen({ port: PORT, host: '0.0.0.0' })
  .then(() => {
    console.log(`🚀 HTTPS server listening on https://0.0.0.0:${PORT}`);
  })
  .catch(err => {
    app.log.error(err);
    process.exit(1);
  });

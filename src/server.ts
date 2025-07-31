import fastify from 'fastify';
import { Server } from 'socket.io';
import cors from '@fastify/cors';

const PORT = parseInt(process.env.PORT || '3001', 10);
const app = fastify({ logger: true });

app.register(cors, {
  origin: "https://ditonachat-new-g43w.vercel.app",
  methods: ["GET", "POST"],
});

// --- NEW HEALTH CHECK ROUTE ---
app.get('/', async (request, reply) => {
  return { status: 'ok', message: 'DitonaChat backend is running' };
});
// --- END OF NEW ROUTE ---

const io = new Server(app.server, {
  cors: {
    origin: "https://ditonachat-new-g43w.vercel.app",
    methods: ["GET", "POST"],
  }
});

// ... rest of the Socket.IO logic ...

app.listen({ port: PORT, host: '0.0.0.0' }, (err) => {
  if (err) {
    app.log.error(err);
    process.exit(1);
  }
});

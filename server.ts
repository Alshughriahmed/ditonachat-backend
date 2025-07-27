import Fastify from 'fastify';
import { Server } from 'socket.io';
import 'dotenv/config';

const PORT = parseInt(process.env.PORT || '3001', 10);

const app = Fastify({
  logger: true
});

const io = new Server(app.server, {
  path: '/ws',
  cors: {
    origin: "*", // عدله حسب الحاجة
    methods: ["GET", "POST"]
  }
});

io.on('connection', (socket) => {
  console.log(`✅ مستخدم جديد اتصل بالخادم: ${socket.id}`);

  socket.on('disconnect', () => {
    console.log(`❌ انقطع اتصال المستخدم: ${socket.id}`);
  });
});

const start = async () => {
  try {
    await app.listen({ port: PORT, host: '0.0.0.0' });
  } catch (err) {
    app.log.error(err);
    process.exit(1);
  }
};

start();

import fastify from "fastify";
import { Server as SocketIOServer } from "socket.io";
import cors from "@fastify/cors";

const app = fastify({ logger: true });

app.register(cors, {
  origin: "https://ditonachat-new-g43w.vercel.app",
  methods: ["GET", "POST"],
});

const io = new SocketIOServer(app.server, {
  cors: {
    origin: "https://ditonachat-new-g43w.vercel.app",
    methods: ["GET", "POST"],
  },
});

let waitingSocket: import("socket.io").Socket | null = null;

io.on("connection", (socket) => {
  app.log.info(`Client connected: ${socket.id}`);
  (socket as any).partnerId = null;

  socket.on("ready", () => {
    if (waitingSocket) {
      const partner = waitingSocket;
      waitingSocket = null;
      (socket as any).partnerId = partner.id;
      (partner as any).partnerId = socket.id;
      socket.emit("partner", { isInitiator: true });
      partner.emit("partner", { isInitiator: false });
      app.log.info(`Paired ${socket.id} with ${partner.id}`);
    } else {
      waitingSocket = socket;
      app.log.info(`Client queued: ${socket.id}`);
    }
  });

  socket.on("offer", (offer) => {
    const partnerId = (socket as any).partnerId;
    if (partnerId) io.to(partnerId).emit("offer", offer);
  });
  socket.on("answer", (answer) => {
    const partnerId = (socket as any).partnerId;
    if (partnerId) io.to(partnerId).emit("answer", answer);
  });
  socket.on("ice-candidate", (candidate) => {
    const partnerId = (socket as any).partnerId;
    if (partnerId) io.to(partnerId).emit("ice-candidate", candidate);
  });
  socket.on("chat-message", (message: string) => {
    const partnerId = (socket as any).partnerId;
    if (partnerId) io.to(partnerId).emit("chat-message", message);
  });
  socket.on("disconnect", () => {
    const partnerId = (socket as any).partnerId;
    if (waitingSocket && waitingSocket.id === socket.id) waitingSocket = null;
    if (partnerId) {
      const partnerSocket = io.sockets.sockets.get(partnerId);
      if (partnerSocket) {
        (partnerSocket as any).partnerId = null;
        partnerSocket.emit("partner-disconnected");
      }
    }
  });
});

const PORT = Number(process.env.PORT) || 3001;
app.listen({ port: PORT, host: "0.0.0.0" }, (err, address) => {
  if (err) {
    app.log.error(err);
    process.exit(1);
  }
  app.log.info(`Signalling server running at ${address}`);
});

import fastify from "fastify";
import { Server as SocketIOServer } from "socket.io";
import cors from "@fastify/cors";

const app = fastify({ logger: true });

app.register(cors, {
  origin: "*", // Loosened for debugging, can be tightened later
});

const io = new SocketIOServer(app.server, {
  cors: {
    origin: "*",
  },
});

let waitingUser: string | null = null;

io.on("connection", (socket) => {
  socket.on("ready", () => {
    if (waitingUser) {
      io.to(waitingUser).emit("partner", { partnerId: socket.id, isInitiator: true });
      socket.emit("partner", { partnerId: waitingUser, isInitiator: false });
      waitingUser = null;
    } else {
      waitingUser = socket.id;
    }
  });

  socket.on("offer", ({ target, offer }) => {
    io.to(target).emit("offer", { from: socket.id, offer });
  });

  socket.on("answer", ({ target, answer }) => {
    io.to(target).emit("answer", { from: socket.id, answer });
  });

  socket.on("ice-candidate", ({ target, candidate }) => {
    io.to(target).emit("ice-candidate", candidate);
  });

  socket.on("disconnect", () => {
    if (waitingUser === socket.id) {
      waitingUser = null;
    }
  });
});

const PORT = Number(process.env.PORT) || 3001;
server.listen(PORT, () => {
  console.log(`🚀 Server listening on port ${PORT}`);
});

import express from "express";
import { createServer } from "http";
import { Server } from "socket.io";
import { fileURLToPath } from "url";
import { dirname } from "path";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const app = express();
const server = createServer(app);
const io = new Server(server, {
  cors: {
    origin: "http://localhost:3000",
    methods: ["GET", "POST"],
  },
});

// Keep track of all connected users and their status
const users = new Map();

io.on("connection", (socket) => {
  console.log("User connected:", socket.id);
  users.set(socket.id, { status: "available" });

  socket.on("find_peer", () => {
    console.log("User searching for peer:", socket.id);

    // Find an available peer
    const availablePeer = Array.from(users.entries()).find(
      ([id, user]) => id !== socket.id && user.status === "available"
    );

    if (availablePeer) {
      const [peerId] = availablePeer;

      // Update both users' status
      users.set(socket.id, { status: "busy" });
      users.set(peerId, { status: "busy" });

      // Notify both users
      socket.emit("peer_found", peerId);
      io.to(peerId).emit("peer_found", socket.id);

      console.log(`Matched peers: ${socket.id} <-> ${peerId}`);
    } else {
      console.log("No available peer found for:", socket.id);
    }
  });

  socket.on("signal", ({ peerId, signal }) => {
    console.log(`Signal from ${socket.id} to ${peerId}:`, signal.type);
    io.to(peerId).emit("signal", {
      peerId: socket.id,
      signal,
    });
  });

  socket.on("disconnect", () => {
    console.log("User disconnected:", socket.id);
    users.delete(socket.id);
  });
});

const PORT = process.env.PORT || 5200;

server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

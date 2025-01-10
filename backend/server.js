const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const cors = require("cors");

const app = express();
app.use(cors());
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: ["http://localhost:3000", "https://mikitv.fun"],
    methods: ["GET", "POST"],
  },
});

// Function to check if there's any entry with status: 0
const hasStatusZero = () => {
  for (const [id, data] of users) {
    if (data.status === 0) {
      return id;
    }
  }
  return 0;
};

const users = new Map();

io.on("connection", (socket) => {
  console.log(`New connection: ${socket.id}`);
  // users.set(socket.id, { status: 0 });
  socket.on("findPeer", () => {
    // console.log(users.size, "length");
    const waitingPeerId = hasStatusZero(); //return id who have status 0
    console.log(waitingPeerId, "waiting peer");
    if (users.size > 0 && waitingPeerId !== 0) {
      users.set(socket.id, { status: 1, role: "o" });
      users.set(waitingPeerId, { status: 1, role: "a" });
      const waitingPeerUser = users.get(waitingPeerId);
      const socketPeerUser = users.get(socket.id);

      // console.log("peer found who's id is :", waitingPeer);
      // console.log(peerUser, "peerUser");
      io.to(waitingPeerId).emit("peerFound", {
        id: socket.id,
        info: socketPeerUser,
      });
      io.to(socket.id).emit("peerFound", {
        id: waitingPeerId,
        info: waitingPeerUser,
      });
      // socket.emit("peerFound", { PeerId: waitingPeerId, peerUser });
      // users.entries();
    } else {
      users.set(socket.id, { status: 0, role: "a" });
    }
    console.log(users, "users");
  });

  socket.on("offer", ({ offer, to }) => {
    // console.log(offer, "offer");
    // console.log(to, "to");
    io.to(to).emit("offer", {
      offer: offer,
      from: socket.id,
    });
  });
  socket.on("answer", ({ answer, to }) => {
    // console.log(offer, "offer");
    // console.log(to, "to");
    io.to(to).emit("answer", {
      answer: answer,
      from: socket.id,
    });
  });

  socket.on("ice-candidate", ({ candidate, to }) => {
    // console.log("ice candidate working");
    io.to(to).emit("ice-candidate", {
      candidate: candidate,
      from: socket.id,
    });
  });

  socket.on("disconnect", (reason) => {
    console.log("disconnected user", socket.id);
    users.delete(socket.id);
    console.log(users, "users");
  });
});

server.listen(5200, () => {
  console.log("Server running on port 5200");
});

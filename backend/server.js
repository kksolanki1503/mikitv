const express = require("express");
const http = require("http");
const { Server } = require("socket.io");

const app = express();
const cors = require("cors");
const server = http.createServer(app);
let waitingUsers = [];
app.use(
  cors({
    origin: ["http://localhost:3000", "https://thadi.in/"],
  })
);

const io = new Server(server, {
  cors: {
    origin: ["http://localhost:3000", "https://thadi.in/"], // Allow your React frontend
    methods: ["GET", "POST"],
  },
});

app.get("/test", (req, res) => {
  console.log("working");
  return res.status(200).json({ status: "success" });
});

io.on("connection", (socket) => {
  console.log(`User connected: ${socket.id}`);

  // Add the new user to the waiting list
  waitingUsers.push(socket);

  // Check if there's another user waiting
  if (waitingUsers.length >= 2) {
    // Pair the first two users in the queue
    const [user1, user2] = waitingUsers.splice(0, 2);

    // Create a unique room ID for the pair
    const roomID = `room-${user1.id}-${user2.id}`;

    // Add users to the room
    user1.join(roomID);
    user2.join(roomID);

    // Notify users they are paired
    user1.emit("userJoined", user2.id);
    user2.emit("userJoined", user1.id);

    console.log(`Paired users ${user1.id} and ${user2.id} in room ${roomID}`);
  }
  // socket.on("joinRoom", (room) => {
  //   socket.join(room);
  //   const otherUsers = Array.from(io.sockets.adapter.rooms.get(room) || []);
  //   const rooms = Array.from(io.sockets.adapter.rooms || []);

  //   if (otherUsers.length > 0) {
  //     socket.emit("otherUser", otherUsers[0]); // Notify the new user about the existing user
  //     io.to(otherUsers[0]).emit("userJoined", socket.id); // Notify the existing user about the new user
  //   }
  // });

  socket.on("offer", (payload) => {
    console.log(`Offer received from ${socket.id} to ${payload.target}`);
    io.to(payload.target).emit("offer", payload);
  });

  socket.on("answer", (payload) => {
    console.log(`Answer received from ${socket.id} to ${payload.target}`);
    io.to(payload.target).emit("answer", payload);
  });

  socket.on("ice-candidate", (payload) => {
    if (!payload.target) {
      console.error("Target user is null. Cannot send ICE candidate.");
      return;
    }
    io.to(payload.target).emit("ice-candidate", payload);
  });

  socket.on("disconnect", () => {
    console.log(`User disconnected: ${socket.id}`);
    waitingUsers = waitingUsers.filter((user) => user.id !== socket.id);
  });
});

server.listen(5200, () => {
  console.log("Server running on http://localhost:5200");
});

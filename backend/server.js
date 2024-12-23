const express = require("express");
const http = require("http");
const { Server } = require("socket.io");

const app = express();
const cors = require("cors");
const server = http.createServer(app);

app.use(cors({ origin: ["http://localhost:3000", "http://35.244.58.60:81"] }));

const io = new Server(server, {
  cors: {
    origin: ["http://localhost:3000", "http://35.244.58.60:81"], // Allow your React frontend
    methods: ["GET", "POST"],
  },
});

app.get("/test", (req, res) => {
  console.log("working");
  return res.status(200).json({ status: "success" });
});

io.on("connection", (socket) => {
  console.log("A user connected:", socket.id);

  socket.on("joinRoom", (room) => {
    socket.join(room);
    const otherUsers = Array.from(
      io.sockets.adapter.rooms.get(room) || []
    ).filter((id) => id !== socket.id);
    console.log(otherUsers, "other users");
    if (otherUsers.length > 0) {
      socket.emit("otherUser", otherUsers[0]); // Notify the new user about the existing user
      io.to(otherUsers[0]).emit("userJoined", socket.id); // Notify the existing user about the new user
    }
  });

  socket.on("offer", (payload) => {
    io.to(payload.target).emit("offer", payload);
  });

  socket.on("answer", (payload) => {
    io.to(payload.target).emit("answer", payload);
  });

  socket.on("ice-candidate", (payload) => {
    io.to(payload.target).emit("ice-candidate", payload);
  });

  socket.on("disconnect", () => {
    console.log("User disconnected:", socket.id);
  });
});

server.listen(5200, () => {
  console.log("Server running on http://localhost:5200");
});

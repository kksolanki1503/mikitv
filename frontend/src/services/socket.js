import { io } from "socket.io-client";

class SocketService {
  constructor() {
    if (SocketService.instance) {
      return SocketService.instance;
    }

    this.socket = io("http://localhost:5200");
    this.setupListeners();
    SocketService.instance = this;
  }

  setupListeners() {
    this.socket.on("connect", () => {
      console.log("Connected to signaling server");
    });

    this.socket.on("disconnect", () => {
      console.log("Disconnected from signaling server");
    });

    this.socket.on("connect_error", (error) => {
      console.error("Connection error:", error);
    });
  }

  findPeer() {
    console.log("Finding peer...");
    this.socket.emit("find_peer");
  }

  onPeerFound(callback) {
    this.socket.on("peer_found", (peerId) => {
      console.log("Peer found:", peerId);
      callback(peerId);
    });
  }

  sendSignal(peerId, signal) {
    console.log("Sending signal to:", peerId, signal.type);
    this.socket.emit("signal", { peerId, signal });
  }

  onSignal(callback) {
    this.socket.on("signal", callback);
  }

  disconnect() {
    this.socket.disconnect();
  }
}

export const socketService = new SocketService();

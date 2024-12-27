export class WebRTCService {
  constructor() {
    this.peerConnection = null;
    this.onIceCandidateCallback = null;
    this.onTrackCallback = null;
    this.currentPeerId = null;
    this.initializePeerConnection();
  }

  initializePeerConnection() {
    this.peerConnection = new RTCPeerConnection({
      iceServers: [
        { urls: "stun:stun.l.google.com:19302" },
        { urls: "stun:stun1.l.google.com:19302" },
      ],
    });

    this.peerConnection.onicecandidate = (event) => {
      if (
        event.candidate &&
        this.onIceCandidateCallback &&
        this.currentPeerId
      ) {
        this.onIceCandidateCallback(event.candidate, this.currentPeerId);
      }
    };

    this.peerConnection.ontrack = (event) => {
      if (this.onTrackCallback && event.streams[0]) {
        this.onTrackCallback(event.streams[0]);
      }
    };

    // Add connection state change handler
    this.peerConnection.onconnectionstatechange = () => {
      console.log("Connection state:", this.peerConnection.connectionState);
    };
  }

  setPeerId(peerId) {
    this.currentPeerId = peerId;
  }

  async createOffer(peerId) {
    if (!this.peerConnection) return null;
    this.currentPeerId = peerId;

    try {
      const offer = await this.peerConnection.createOffer();
      await this.peerConnection.setLocalDescription(offer);
      return offer;
    } catch (error) {
      console.error("Error creating offer:", error);
      throw error;
    }
  }

  async handleAnswer(answer) {
    if (!this.peerConnection) return;

    try {
      if (this.peerConnection.signalingState !== "have-local-offer") {
        console.warn(
          "Invalid state for handling answer:",
          this.peerConnection.signalingState
        );
        return;
      }
      await this.peerConnection.setRemoteDescription(
        new RTCSessionDescription(answer)
      );
    } catch (error) {
      console.error("Error handling answer:", error);
    }
  }

  async handleOffer(offer, peerId) {
    if (!this.peerConnection) return null;
    this.currentPeerId = peerId;

    try {
      await this.peerConnection.setRemoteDescription(
        new RTCSessionDescription(offer)
      );
      const answer = await this.peerConnection.createAnswer();
      await this.peerConnection.setLocalDescription(answer);
      return answer;
    } catch (error) {
      console.error("Error handling offer:", error);
      return null;
    }
  }

  addTrack(stream) {
    if (!this.peerConnection || !stream) return;
    stream.getTracks().forEach((track) => {
      this.peerConnection.addTrack(track, stream);
    });
  }

  async addIceCandidate(candidate) {
    if (!this.peerConnection) return;
    try {
      await this.peerConnection.addIceCandidate(new RTCIceCandidate(candidate));
    } catch (error) {
      console.error("Error adding ICE candidate:", error);
    }
  }

  onIceCandidate(callback) {
    this.onIceCandidateCallback = callback;
  }

  onTrack(callback) {
    this.onTrackCallback = callback;
  }

  cleanup() {
    if (this.peerConnection) {
      this.peerConnection.close();
      this.peerConnection = null;
    }
    this.currentPeerId = null;
    this.onIceCandidateCallback = null;
    this.onTrackCallback = null;
  }
}

import React, { useRef, useState, useEffect } from "react";
import io from "socket.io-client";

const socket = io("http://localhost:81"); // Replace with your server URL

const VideoCall = () => {
  const [room, setRoom] = useState("");
  const [partnerId, setPartnerId] = useState(null);

  const localVideoRef = useRef();
  const remoteVideoRef = useRef();
  const peerConnectionRef = useRef();
  const localStreamRef = useRef();

  const config = {
    iceServers: [
      { urls: "stun:stun.l.google.com:19302" },
      {
        urls: "turn:turnserver.example.com",
        username: "user",
        credential: "password",
      },
    ],
  };

  useEffect(() => {
    const getMediaStream = async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: true,
          audio: true,
        });
        localStreamRef.current = stream;
        localVideoRef.current.srcObject = stream;
      } catch (error) {
        console.error("Error accessing media devices:", error);
      }
    };

    navigator.permissions
      .query({ name: "camera" })
      .then((permissionStatus) => {
        if (permissionStatus.state === "granted") {
          // Permission granted
          getMediaStream();
        } else if (permissionStatus.state === "prompt") {
          // Ask for permission
          navigator.mediaDevices
            .getUserMedia({ video: true, audio: true })
            .then(getMediaStream)
            .catch(console.error);
        }
      })
      .catch(console.error);

    socket.on("otherUser", (userId) => {
      setPartnerId(userId);
      callUser(userId);
    });

    socket.on("userJoined", (userId) => {
      setPartnerId(userId);
    });

    socket.on("offer", async ({ sdp, caller }) => {
      if (!peerConnectionRef.current) createPeerConnection();

      try {
        await peerConnectionRef.current.setRemoteDescription(
          new RTCSessionDescription(sdp)
        );
        const answer = await peerConnectionRef.current.createAnswer();
        await peerConnectionRef.current.setLocalDescription(answer);
        socket.emit("answer", { sdp: answer, target: caller });
      } catch (error) {
        console.error("Error handling offer:", error);
      }
    });

    socket.on("answer", async ({ sdp }) => {
      if (peerConnectionRef.current) {
        try {
          await peerConnectionRef.current.setRemoteDescription(
            new RTCSessionDescription(sdp)
          );
        } catch (error) {
          console.error("Error handling answer:", error);
        }
      }
    });

    socket.on("ice-candidate", (payload) => {
      const candidate = new RTCIceCandidate(payload.candidate);
      peerConnectionRef.current.addIceCandidate(candidate);
    });
  }, []);

  const joinRoom = () => {
    socket.emit("joinRoom", room);
  };

  const createPeerConnection = () => {
    peerConnectionRef.current = new RTCPeerConnection(config);

    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach((track) => {
        peerConnectionRef.current.addTrack(track, localStreamRef.current);
      });
    }

    peerConnectionRef.current.onnegotiationneeded = async () => {
      try {
        const offer = await peerConnectionRef.current.createOffer();
        await peerConnectionRef.current.setLocalDescription(offer);
        socket.emit("offer", { sdp: offer, target: partnerId });
      } catch (error) {
        console.error("Error during negotiation:", error);
      }
    };

    peerConnectionRef.current.ontrack = (event) => {
      if (remoteVideoRef.current.srcObject !== event.streams[0]) {
        remoteVideoRef.current.srcObject = event.streams[0];
      }
    };

    peerConnectionRef.current.onicecandidate = (event) => {
      if (event.candidate) {
        socket.emit("ice-candidate", {
          target: partnerId,
          candidate: event.candidate,
        });
      }
    };
  };

  const callUser = async (userId) => {
    try {
      if (!peerConnectionRef.current) createPeerConnection();
      const offer = await peerConnectionRef.current.createOffer();
      await peerConnectionRef.current.setLocalDescription(offer);
      socket.emit("offer", { sdp: offer, target: userId, caller: socket.id });
    } catch (error) {
      console.error("Error during callUser:", error);
    }
  };

  return (
    <div>
      <h1>Video Call</h1>
      <input
        type="text"
        value={room}
        onChange={(e) => setRoom(e.target.value)}
        placeholder="Enter room name"
      />
      <button onClick={joinRoom}>Join Room</button>
      <div
        style={{ display: "flex", marginTop: "20px", border: "2px solid red" }}
      >
        <video ref={localVideoRef} autoPlay muted style={{ width: "45%" }} />
        <video ref={remoteVideoRef} autoPlay style={{ width: "45%" }} />
      </div>
    </div>
  );
};

export default VideoCall;

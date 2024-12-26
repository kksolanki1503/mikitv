import React, { useRef, useState, useEffect } from "react";
import io from "socket.io-client";
import AppConstant from "../src/AppConstant/AppConstant";
const socket = io(AppConstant.baseURL, { path: "/socket.io/" }); // Replace with your server URL

const VideoCall = () => {
  const [partnerId, setPartnerId] = useState(null);
  // console.log(partnerId, "partnerId");
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

    socket.on("userJoined", (userId) => {
      console.log("Paired with:", userId);
      setPartnerId(userId);
      callUser(userId);
    });

    socket.on("offer", async ({ sdp, caller }) => {
      console.log("Received offer from:", caller);
      if (!peerConnectionRef.current) createPeerConnection();

      try {
        await peerConnectionRef.current.setRemoteDescription(
          new RTCSessionDescription(sdp)
        );
        console.log("Set remote description for offer");
        const answer = await peerConnectionRef.current.createAnswer();
        await peerConnectionRef.current.setLocalDescription(answer);
        socket.emit("answer", { sdp: answer, target: caller });
        console.log("Sent answer to:", caller);
      } catch (error) {
        console.error("Error handling offer:", error);
      }
    });

    socket.on("answer", async ({ sdp }) => {
      console.log("Received answer");
      if (peerConnectionRef.current) {
        try {
          await peerConnectionRef.current.setRemoteDescription(
            new RTCSessionDescription(sdp)
          );
          console.log("Set remote description for answer");
        } catch (error) {
          console.error("Error handling answer:", error);
        }
      }
    });

    socket.on("ice-candidate", (payload) => {
      console.log("Received ICE candidate");
      const candidate = new RTCIceCandidate(payload.candidate);
      peerConnectionRef.current.addIceCandidate(candidate);
    });
  }, []);

  const createPeerConnection = () => {
    console.log("Creating peer connection");
    peerConnectionRef.current = new RTCPeerConnection(config);

    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach((track) => {
        peerConnectionRef.current.addTrack(track, localStreamRef.current);
      });
      console.log("Local tracks added to peer connection");
    }

    peerConnectionRef.current.onnegotiationneeded = async () => {
      try {
        const offer = await peerConnectionRef.current.createOffer();
        await peerConnectionRef.current.setLocalDescription(offer);
        console.log("Created and set local offer");
        socket.emit("offer", { sdp: offer, target: partnerId });
      } catch (error) {
        console.error("Error during negotiation:", error);
      }
    };

    peerConnectionRef.current.ontrack = (event) => {
      console.log("Received remote track");
      if (remoteVideoRef.current.srcObject !== event.streams[0]) {
        remoteVideoRef.current.srcObject = event.streams[0];
        console.log("Set remote stream");
      }
    };

    peerConnectionRef.current.onicecandidate = (event) => {
      if (event.candidate) {
        if (!partnerId) {
          console.error("Partner ID is null. Cannot send ICE candidate.");
          return;
        }
        console.log("Sending ICE candidate");
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
    <div className="border border-red-500 sm:px-[80px]">
      <div className="border border-red-600 flex  min-h-[90vh]">
        <div className="border border-red-500 w-full h-fit">
          <video ref={localVideoRef} autoPlay muted className="w-full h-fit" />
        </div>

        <div className="border border-red-600 w-full">
          <video ref={remoteVideoRef} autoPlay className="w-full h-auto" />
        </div>
      </div>

      <button>Start</button>
      <button>Stop</button>
    </div>
  );
};

export default VideoCall;

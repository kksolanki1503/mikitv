import React, { useEffect, useState, useRef } from "react";
import io from "socket.io-client";
import "./App.css";

const SERVER_URL = "http://localhost:5200";
const socket = io(SERVER_URL);
function App() {
  // const [localStream, setLocalStream] = useState(null);
  let localStreamRef = useRef(null);
  let remoteStreamRef = useRef(null);

  const [connected, setConnected] = useState(false);
  const [isFinding, setIsFinding] = useState(false);

  // const [socket, setSocket] = useState(null);
  // const [peerConnection, setPeerConnection] = useState(null);
  let peerConnectionRef = useRef(null);
  const [partner, setPartner] = useState(null);
  // const partnerRef = useRef(null);

  const localVideoRef = useRef();
  const remoteVideoRef = useRef();

  const startCall = () => {
    setIsFinding(true);
    socket.emit("findPeer");
  };

  const createPeerConnection = async () => {
    const configuration = {
      iceServers: [{ urls: "stun:stun.l.google.com:19302" }],
    };
    const peerConnection = new RTCPeerConnection(configuration);
    peerConnectionRef.current = peerConnection;

    if (peerConnectionRef.current && localStreamRef.current) {
      console.log("adding localstream to track");
      localStreamRef.current.getTracks().forEach((track) => {
        peerConnectionRef.current.addTrack(track, localStreamRef.current);
      });
    } else {
      console.log("no local stream");
    }

    if (partner) {
      console.log("partner found");
      setIsFinding(false);
      if (partner.info.role === "a") {
        // Create and send an offer
        console.log("creating offer");
        const offer = await peerConnectionRef.current.createOffer();
        await peerConnectionRef.current.setLocalDescription(offer);
        console.log("offer:", offer);
        console.log("send offer to ", partner.id);
        socket.emit("offer", { offer, to: partner.id });

        socket.on("answer", async ({ answer, from }) => {
          console.log("answer receiver", answer, "from ", from);
          const remoteDesc = new RTCSessionDescription(answer);
          await peerConnection.setRemoteDescription(remoteDesc);
        });
      } else if (partner.info.role === "o") {
        // Wait for an offer, create and send an answer
        socket.on("offer", async ({ offer, from }) => {
          console.log("offer receiver: ", offer, "from ", from);

          await peerConnection.setRemoteDescription(offer);
          const answer = await peerConnection.createAnswer();
          await peerConnection.setLocalDescription(answer);
          console.log("send answer to ", from);
          socket.emit("answer", { answer, to: from });
        });
      }
    } else {
      console.log("No partner found");
    }
    //iceCandidate setting
    console.log("iceCandidate:");
    if (!peerConnectionRef.current) {
      console.log("no peerConnectinoRef found");
      return;
    } else {
      peerConnectionRef.current.addEventListener("icecandidate", (event) => {
        // console.log("entered in iceCandidate");

        if (event.candidate) {
          // Send the candidate to the remote peer via signaling
          console.log(
            "sending candidate :",
            event.candidate,
            " to ",
            partner.id
          );
          socket.emit("ice-candidate", {
            candidate: event.candidate,
            to: partner.id,
          });
        } else {
          console.log("no candidate found");
        }
      });
    }

    // peerConnectionRef.current.onicecandidate = (event) => {
    //   if (event.candidate) {
    //     // Send the candidate to the remote peer via signaling
    //     console.log("sending candidate :", event.candidate, " to ", partner.id);
    //     socket.emit("ice-candidate", {
    //       candidate: event.candidate,
    //       to: partner.id,
    //     });
    //   } else {
    //     console.log("no candidate found");
    //   }
    // };
    //received icecandiadte
    socket.on("ice-candidate", async ({ candidate, from }) => {
      try {
        console.log("ice-candidate receiver: ", candidate, "from ", from);
        await peerConnectionRef.current.addIceCandidate(
          new RTCIceCandidate(candidate)
        );
        console.log("ICE candidate added successfully");
      } catch (error) {
        console.error("Error adding ICE candidate:", error);
      }
    });

    // Listen for connectionstatechange on the local RTCPeerConnection
    peerConnectionRef.current.addEventListener(
      "connectionstatechange",
      (event) => {
        console.log("state: ", peerConnectionRef.current.connectionState);
        if (peerConnectionRef.current.connectionState === "connected") {
          setConnected(true);
        }
      }
    );

    //remote trace
    peerConnectionRef.current.addEventListener("track", async (event) => {
      console.log("receiving remote track");
      // console.log(event.streams);
      const [remoteStream] = event.streams;
      console.log(remoteStream, "remoteStream");
      remoteStreamRef.current = remoteStream;
      remoteVideoRef.current.srcObject = remoteStreamRef.current;
    });
  };

  const localStreaming = async () => {
    try {
      const localStream = await navigator.mediaDevices.getUserMedia({
        video: true,
        audio: true,
      });
      localStreamRef.current = localStream;

      localVideoRef.current.srcObject = localStream;
      console.log("Got MediaStream:", localStream);
    } catch (error) {
      console.error("Error accessing media devices.", error);
    }
  };

  useEffect(() => {
    const setting = async () => {
      await createPeerConnection();
      // console.log(partner, "partner");
    };

    setting();
  }, [partner]);

  const endCall = () => {
    // localStreamRef = null;
    remoteStreamRef = null;
    setConnected(false);
    peerConnectionRef.current.close();
    setPartner(null);
  };

  useEffect(() => {
    // firsttime initiallization

    const setting = async () => {
      await localStreaming();
      socket.on("peerFound", (peerInfo) => {
        setPartner(peerInfo);
      });
    };
    setting();

    // Return cleanup function
    return () => {
      if (peerConnectionRef.current) {
        peerConnectionRef.current.close();
      }
    };
  }, []);

  return (
    <div className="app max-w-[1990px] sm:px-[80px] px-[20px] min-h-screen bg-[#0B192C] nunito-font">
      <div className="flex flex-col video-container sm:flex-row ">
        <div className="w-full bg-[#1E3E62] ">
          <video
            ref={localVideoRef}
            autoPlay
            playsInline
            muted
            className="object-cover w-full local-video"
          />
        </div>
        <div className="w-full   bg-[#1E3E62] h-auto flex justify-center items-center text-white text-[2rem] relative">
          <video
            ref={remoteVideoRef}
            autoPlay
            playsInline
            className={`w-full remote-video h-full  ${
              !isFinding && connected ? "block" : "hidden"
            }`}
          />
          {isFinding ? (
            <div className="h-auto">Finding</div>
          ) : (
            <div className={`${connected ? "hidden" : ""} h-auto`}>MikiTV</div>
          )}
        </div>
      </div>
      <div className="controls pt-[10px] flex gap-3">
        <button
          className="bg-[#FF6500] sm:px-[50px] px-[10px] sm:py-[10px] text-white sm:text-[3rem] text-[2rem] rounded-xl"
          onClick={startCall}
          disabled={connected}
        >
          Start
        </button>
        <button
          className="bg-[#FF6500] sm:px-[50px] px-[10px] sm:py-[10px] text-white sm:text-[3rem] text-[2rem] rounded-xl"
          onClick={endCall}
          disabled={!connected}
        >
          End
        </button>
        {/* <button onClick={nextUser} disabled={!connected}>
          Next
        </button> */}
      </div>
    </div>
  );
}

export default App;

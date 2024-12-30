import React, { useEffect, useState, useRef } from "react";
import io from "socket.io-client";
import "./App.css";
import AppConstant from "./AppConstant/AppConstant";
import { Mic } from "lucide-react";
import { MicOff } from "lucide-react";
import { Video } from "lucide-react";
import { VideoOff } from "lucide-react";
const SERVER_URL = AppConstant.baseUrl;
const socket = io(SERVER_URL);

function App() {
  // const [localStream, setLocalStream] = useState(null);
  let localStreamRef = useRef(null);
  let remoteStreamRef = useRef(null);

  const [connected, setConnected] = useState(false);
  const [isFinding, setIsFinding] = useState(false);
  const [isVideo, setIsVideo] = useState(true);
  const [isMic, setIsMic] = useState(true);

  // const [socket, setSocket] = useState(null);
  // const [peerConnection, setPeerConnection] = useState(null);
  let peerConnectionRef = useRef(null);
  const [partner, setPartner] = useState(null);
  // const partnerRef = useRef(null);

  const localVideoRef = useRef();
  const remoteVideoRef = useRef();
  const [isStarted, setIsStarted] = useState(false);

  const startCall = () => {
    setIsFinding(true);
    setIsStarted(true);
    socket.emit("findPeer");
  };

  const createPeerConnection = async () => {
    if (peerConnectionRef.current) {
      console.log("Existing peer connection found, closing...");
      peerConnectionRef.current.close();
      peerConnectionRef.current = null;
    }

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

          if (peerConnectionRef.current.signalingState === "have-local-offer") {
            const remoteDesc = new RTCSessionDescription(answer);
            await peerConnectionRef.current.setRemoteDescription(remoteDesc);
          } else {
            console.warn(
              "Cannot handle answer: Invalid signaling state",
              peerConnectionRef.current.signalingState
            );
          }
        });
      } else if (partner.info.role === "o") {
        // Wait for an offer, create and send an answer
        socket.on("offer", async ({ offer, from }) => {
          console.log("offer receiver: ", offer, "from ", from);
          if (peerConnectionRef.current.signalingState === "stable") {
            await peerConnectionRef.current.setRemoteDescription(offer);
            const answer = await peerConnectionRef.current.createAnswer();
            await peerConnectionRef.current.setLocalDescription(answer);
            console.log("send answer to ", from);
            socket.emit("answer", { answer, to: from });
          } else {
            console.warn(
              "Cannot handle offer: Invalid signaling state",
              peerConnectionRef.current.signalingState
            );
          }
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

  const toggleVideo = () => {
    if (localStreamRef.current) {
      const videoTrack = localStreamRef.current.getVideoTracks()[0];
      if (videoTrack) {
        setIsVideo(!videoTrack.enabled);
        videoTrack.enabled = !videoTrack.enabled;
        console.log(`Video is now ${videoTrack.enabled ? "ON" : "OFF"}`);
      } else {
        console.warn("No video track found");
      }
    } else {
      console.warn("No local stream available");
    }
  };

  const toggleMic = () => {
    if (localStreamRef.current) {
      const audioTrack = localStreamRef.current.getAudioTracks()[0];
      if (audioTrack) {
        setIsMic(!audioTrack.enabled);
        audioTrack.enabled = !audioTrack.enabled;
        console.log(`Microphone is now ${audioTrack.enabled ? "ON" : "OFF"}`);
      } else {
        console.warn("No audio track found");
      }
    } else {
      console.warn("No local stream available");
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
    if (peerConnectionRef.current) {
      peerConnectionRef.current.close();

      peerConnectionRef = null;
    } else {
      console.log("no peerREf found");
    }
    if (remoteVideoRef.current) remoteVideoRef.current.srcObject = null;
    console.log("stream clear");
    remoteStreamRef = null;
    console.log("partner clear");
    setPartner(null);
    console.log("connection clear");
    setConnected(false);

    console.log("socket clear");
    socket.off("offer");
    socket.off("answer");
    socket.off("ice-candidate");
    console.log("isStarted clear");
    setIsStarted(false);
    console.log("isFinding clear");
    setIsFinding(false);
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
    // return () => {
    //   if (peerConnectionRef.current) {
    //     peerConnectionRef.current.close();
    //   }
    // };
  }, []);

  return (
    <div className="app max-w-[1990px] mx-auto px-[2.5vw] min-h-screen bg-[#212121] nunito-font  ">
      <div className="flex flex-col items-center justify-center video-container sm:flex-row ">
        <div className=" bg-[#161616]      relative sm:w-1/2 w-full flex items-center justify-center">
          <video
            ref={localVideoRef}
            autoPlay
            playsInline
            muted
            className="object-contain  local-video h-[40vh]  sm:h-[80vh] "
          />
          <div
            className="absolute bottom-[2vw] left-[2vw] text-white   bg-black/70 px-[10px] py-[2px] rounded-full"
            style={{ fontSize: "clamp(1rem,2.5vw,1.2rem)" }}
          >
            you
          </div>
        </div>
        <div className=" w-full sm:w-1/2 text-center   bg-[#161616] h-auto flex justify-center items-center text-white text-[2rem] relative">
          <video
            ref={remoteVideoRef}
            autoPlay
            playsInline
            className={` remote-video h-[40vh]  sm:h-[80vh] border  object-contain  ${
              !isFinding && connected ? "block" : "hidden"
            }`}
          />
          {isFinding ? (
            <div className="h-[40vh]  sm:h-[80vh] flex items-center">
              Finding
            </div>
          ) : (
            <div
              className={`${
                connected ? "hidden" : ""
              } h-[40vh]  sm:h-[80vh]  flex items-center`}
            >
              MikiTV
            </div>
          )}
        </div>
      </div>

      {/* controller */}
      <div
        className="controls pt-[10px] flex gap-3 justify-start items-center flex-wrap"
        style={{ fontSize: "clamp(2rem,4vw,3rem)" }}
      >
        {isStarted ? (
          <button
            className="button"
            // style={{padding:""}}
            onClick={() => {
              endCall();
              startCall();
            }}
          >
            Next
          </button>
        ) : (
          <button className=" button" onClick={startCall}>
            Start
          </button>
        )}

        <button className="button" onClick={endCall}>
          {isFinding ? `Stop` : `End`}
        </button>

        <button className="button" onClick={toggleVideo}>
          {isVideo ? <Video /> : <VideoOff />}
        </button>
        <button className="button" onClick={toggleMic}>
          {isMic ? <Mic /> : <MicOff />}
        </button>
      </div>
    </div>
  );
}

export default App;

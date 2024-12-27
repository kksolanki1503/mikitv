import React, { useState, useCallback, useEffect } from "react";
import { VideoPlayer } from "./components/VideoPlayer";
import { Controls } from "./components/Controls";
import { WebRTCService } from "./services/webrtc";
import { socketService } from "./services/socket";
import { useVideoStore } from "./store/videoStore";
import { useMediaStream } from "./hooks/useMediaStream";
import { useVideoControls } from "./hooks/useVideoControls";
import { Video } from "lucide-react";

let webrtc = null;
function App() {
  // const [webrtc, setWebrtc] = useState(null);
  const {
    localStream,
    remoteStream,
    isConnected,
    isFinding,
    setRemoteStream,
    setIsConnected,
    setIsFinding,
  } = useVideoStore();

  const { isVideoEnabled, isAudioEnabled, toggleVideo, toggleAudio } =
    useVideoControls();

  useMediaStream();

  const handleSignal = useCallback(
    async ({ peerId, signal }) => {
      console.log(
        "handling signal with peerId:",
        peerId,
        " and signal:",
        signal
      );
      console.log(webrtc, "webrtc");
      if (!webrtc) {
        console.log("webrtc is null to return ");
        return;
      }
      try {
        if (signal.type === "offer") {
          const answer = await webrtc.handleOffer(signal.offer, peerId);
          console.log("this is the answer:", answer);
          if (answer) {
            socketService.sendSignal(peerId, { type: "answer", answer });
          }
        } else if (signal.type === "answer") {
          await webrtc.handleAnswer(signal.answer);
        } else if (signal.type === "ice-candidate" && signal.candidate) {
          await webrtc.addIceCandidate(signal.candidate);
        }
      } catch (error) {
        console.error("Signal handling error:", error);
        setIsFinding(false);
      }
    },
    [webrtc, setIsFinding]
  );

  // useEffect(() => {
  //   console.log(webrtc, "webrtc");
  // }, [webrtc]);

  const handleFindPeer = () => {
    if (!localStream) return;
    console.log("handling find peer");
    setIsFinding(true);
    const rtc = new WebRTCService();
    console.log(rtc, "this is rtc");
    // setWebrtc(rtc);
    webrtc = rtc;
    console.log(webrtc, "set webrtc");

    rtc.addTrack(localStream);

    rtc.onTrack((stream) => {
      console.log("Received remote stream", stream);
      setRemoteStream(stream);
      setIsConnected(true);
      setIsFinding(false);
    });

    rtc.onConnectionStateChange((state) => {
      console.log("Connection state changed:", state);
      if (state === "connected") {
        setIsConnected(true);
        setIsFinding(false);
      } else if (
        state === "failed" ||
        state === "disconnected" ||
        state === "closed"
      ) {
        setIsConnected(false);
        setIsFinding(false);
        setRemoteStream(null);
      }
    });

    rtc.onIceCandidate((candidate, peerId) => {
      console.log("onIceCandidate", candidate, "peerId", peerId);
      socketService.sendSignal(peerId, { type: "ice-candidate", candidate });
    });

    socketService.onPeerFound(async (peerId) => {
      console.log("on Peer found trigger");
      rtc.setPeerId(peerId);
      try {
        const offer = await rtc.createOffer(peerId);
        console.log(offer, "offer created");
        if (offer) {
          socketService.sendSignal(peerId, { type: "offer", offer });
        }
      } catch (error) {
        console.error("Error creating offer:", error);
        setIsFinding(false);
      }
    });

    socketService.onSignal(handleSignal);
    socketService.findPeer();
  };

  const handleDisconnect = () => {
    webrtc?.cleanup();
    // setWebrtc(null);
    webrtc = null;
    setRemoteStream(null);
    setIsConnected(false);
    setIsFinding(false);
  };

  console.log(localStream, "localStream");
  console.log(remoteStream, "remoteStream");
  console.log(isConnected, "isConnected");
  console.log(isFinding, "isFinding");

  return (
    <div className="min-h-screen p-8 text-white bg-gray-900">
      <div className="max-w-6xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-2">
            <Video className="w-8 h-8" />
            {/* <VideoPlayer
              stream={remoteStream}
              muted
              className="w-full h-full border"
            /> */}
            <h1 className="text-2xl font-bold">Random Video Chat</h1>
          </div>
          {!isConnected && !isFinding && (
            <button
              onClick={handleFindPeer}
              className="px-6 py-2 font-medium bg-blue-500 rounded-lg hover:bg-blue-600"
            >
              Start Chat
            </button>
          )}
        </div>

        <div className="grid grid-cols-1 gap-8 md:grid-cols-2">
          <div className="relative overflow-hidden bg-gray-800 rounded-lg aspect-video">
            <VideoPlayer stream={localStream} muted className="w-full h-full" />
            <div className="absolute bottom-4 left-4">
              <span className="px-3 py-1 rounded-lg bg-gray-900/75">You</span>
            </div>
          </div>

          <div className="relative overflow-hidden bg-gray-800 rounded-lg aspect-video">
            {remoteStream ? (
              <VideoPlayer stream={remoteStream} className="w-full h-full " />
            ) : (
              <div className="flex items-center justify-center h-full">
                {isFinding ? (
                  <div className="text-center">
                    <p className="mb-2 text-lg">Finding a peer...</p>
                    <div className="w-8 h-8 mx-auto border-b-2 border-white rounded-full animate-spin"></div>
                  </div>
                ) : (
                  <p className="text-lg">Waiting to start...</p>
                )}
              </div>
            )}
            {remoteStream && (
              <div className="absolute bottom-4 left-4">
                <span className="px-3 py-1 rounded-lg bg-gray-900/75">
                  Peer
                </span>
              </div>
            )}
          </div>
        </div>

        <div className="flex justify-center mt-8">
          <Controls
            isVideoEnabled={isVideoEnabled}
            isAudioEnabled={isAudioEnabled}
            onToggleVideo={toggleVideo}
            onToggleAudio={toggleAudio}
            onDisconnect={handleDisconnect}
          />
        </div>
      </div>
    </div>
  );
}

export default App;

import React, { useState, useCallback } from "react";
import { VideoPlayer } from "./components/VideoPlayer";
import { Controls } from "./components/Controls";
import { WebRTCService } from "./services/webrtc";
import { socketService } from "./services/socket";
import { useVideoStore } from "./store/videoStore";
import { useMediaStream } from "./hooks/useMediaStream";
import { useVideoControls } from "./hooks/useVideoControls";
import { Video } from "lucide-react";

function App() {
  const [webrtc, setWebrtc] = useState(null);
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
      if (!webrtc) return;

      try {
        if (signal.type === "offer") {
          const answer = await webrtc.handleOffer(signal.offer, peerId);
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
      }
    },
    [webrtc]
  );

  const handleFindPeer = () => {
    if (!localStream) return;

    setIsFinding(true);
    const rtc = new WebRTCService();
    setWebrtc(rtc);

    rtc.addTrack(localStream);
    rtc.onTrack((stream) => {
      console.log("Received remote stream");
      setRemoteStream(stream);
      setIsConnected(true);
      setIsFinding(false);
    });

    rtc.onIceCandidate((candidate, peerId) => {
      socketService.sendSignal(peerId, { type: "ice-candidate", candidate });
    });

    socketService.onPeerFound(async (peerId) => {
      rtc.setPeerId(peerId);
      try {
        const offer = await rtc.createOffer(peerId);
        if (offer) {
          socketService.sendSignal(peerId, { type: "offer", offer });
        }
      } catch (error) {
        console.error("Error creating offer:", error);
      }
    });

    socketService.onSignal(handleSignal);
    socketService.findPeer();
  };

  const handleDisconnect = () => {
    webrtc?.cleanup();
    setWebrtc(null);
    setRemoteStream(null);
    setIsConnected(false);
    setIsFinding(false);
  };

  return (
    <div className="min-h-screen bg-gray-900 text-white p-8">
      <div className="max-w-6xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-2">
            <Video className="w-8 h-8" />
            <h1 className="text-2xl font-bold">Random Video Chat</h1>
          </div>
          {!isConnected && !isFinding && (
            <button
              onClick={handleFindPeer}
              className="bg-blue-500 hover:bg-blue-600 px-6 py-2 rounded-lg font-medium"
            >
              Start Chat
            </button>
          )}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          <div className="relative aspect-video bg-gray-800 rounded-lg overflow-hidden">
            <VideoPlayer stream={localStream} muted className="w-full h-full" />
            <div className="absolute bottom-4 left-4">
              <span className="bg-gray-900/75 px-3 py-1 rounded-lg">You</span>
            </div>
          </div>

          <div className="relative aspect-video bg-gray-800 rounded-lg overflow-hidden">
            {remoteStream ? (
              <VideoPlayer stream={remoteStream} className="w-full h-full" />
            ) : (
              <div className="flex items-center justify-center h-full">
                {isFinding ? (
                  <p className="text-lg">Finding a peer...</p>
                ) : (
                  <p className="text-lg">Waiting to start...</p>
                )}
              </div>
            )}
            {remoteStream && (
              <div className="absolute bottom-4 left-4">
                <span className="bg-gray-900/75 px-3 py-1 rounded-lg">
                  Peer
                </span>
              </div>
            )}
          </div>
        </div>

        <div className="mt-8 flex justify-center">
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

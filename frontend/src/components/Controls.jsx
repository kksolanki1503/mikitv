import React from "react";
import { Video, VideoOff, Mic, MicOff, PhoneOff } from "lucide-react";

export function Controls({
  onToggleVideo,
  onToggleAudio,
  onDisconnect,
  isVideoEnabled,
  isAudioEnabled,
}) {
  return (
    <div className="flex gap-4 justify-center items-center bg-gray-900 p-4 rounded-lg">
      <button
        onClick={onToggleVideo}
        className={`p-3 rounded-full ${
          isVideoEnabled
            ? "bg-gray-700 hover:bg-gray-600"
            : "bg-red-500 hover:bg-red-600"
        }`}
      >
        {isVideoEnabled ? (
          <Video className="w-6 h-6 text-white" />
        ) : (
          <VideoOff className="w-6 h-6 text-white" />
        )}
      </button>
      <button
        onClick={onToggleAudio}
        className={`p-3 rounded-full ${
          isAudioEnabled
            ? "bg-gray-700 hover:bg-gray-600"
            : "bg-red-500 hover:bg-red-600"
        }`}
      >
        {isAudioEnabled ? (
          <Mic className="w-6 h-6 text-white" />
        ) : (
          <MicOff className="w-6 h-6 text-white" />
        )}
      </button>
      <button
        onClick={onDisconnect}
        className="p-3 rounded-full bg-red-500 hover:bg-red-600"
      >
        <PhoneOff className="w-6 h-6 text-white" />
      </button>
    </div>
  );
}

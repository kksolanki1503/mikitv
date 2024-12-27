import { useEffect } from "react";
import { useVideoStore } from "../store/videoStore";

export function useMediaStream() {
  const { setLocalStream, localStream } = useVideoStore();

  useEffect(() => {
    const initializeMedia = async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: true,
          audio: true,
        });
        setLocalStream(stream);
      } catch (error) {
        console.error("Error accessing media devices:", error);
      }
    };

    initializeMedia();
    return () => {
      localStream?.getTracks().forEach((track) => track.stop());
    };
  }, []);
}

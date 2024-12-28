import React, { useEffect, useRef } from "react";

export function VideoPlayer({ stream, muted = false, className = "" }) {
  console.log(stream, "stream");
  const videoRef = useRef(null);

  useEffect(() => {
    if (videoRef.current && stream) {
      videoRef.current.srcObject = stream;
    }
  }, [stream]);

  return (
    <video
      ref={videoRef}
      autoPlay
      playsInline
      muted={muted}
      className={`rounded-lg object-cover ${className}`}
    />
  );
}

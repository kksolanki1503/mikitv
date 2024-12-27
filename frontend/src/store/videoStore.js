import { create } from "zustand";

export const useVideoStore = create((set) => ({
  localStream: null,
  remoteStream: null,
  isConnected: false,
  isFinding: false,
  setLocalStream: (stream) => set({ localStream: stream }),
  setRemoteStream: (stream) => set({ remoteStream: stream }),
  setIsConnected: (connected) => set({ isConnected: connected }),
  setIsFinding: (finding) => set({ isFinding: finding }),
}));

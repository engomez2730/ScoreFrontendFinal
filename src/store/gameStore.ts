import { create } from "zustand";
import { Socket } from "socket.io-client";

interface GameState {
  socket: Socket | null;
  setSocket: (socket: Socket) => void;
  currentGameId: number | null;
  setCurrentGameId: (id: number | null) => void;
  clock: number;
  setClock: (ms: number) => void;
  isClockRunning: boolean;
  setIsClockRunning: (running: boolean) => void;
}

export const useGameStore = create<GameState>((set) => ({
  socket: null,
  setSocket: (socket) => set({ socket }),
  currentGameId: null,
  setCurrentGameId: (id) => set({ currentGameId: id }),
  clock: 0,
  setClock: (ms) => set({ clock: ms }),
  isClockRunning: false,
  setIsClockRunning: (running) => set({ isClockRunning: running }),
}));

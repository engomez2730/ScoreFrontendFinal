import { create } from "zustand";
import { Socket } from "socket.io-client";
import type { Game, Team, Player } from "../types";

interface GameState {
  // ===== SOCKET =====
  socket: Socket | null;
  setSocket: (socket: Socket) => void;
  
  // ===== GAME DATA =====
  currentGame: Game | null;
  homeTeam: Team | null;
  awayTeam: Team | null;
  setGame: (game: Game) => void;
  setTeams: (home: Team, away: Team) => void;
  updateScore: (home: number, away: number) => void;
  
  // ===== TIMER STATE =====
  gameTime: number; // Seconds remaining
  isClockRunning: boolean;
  currentQuarter: number;
  setGameTime: (time: number | ((prev: number) => number)) => void;
  setIsClockRunning: (running: boolean) => void;
  setCurrentQuarter: (quarter: number) => void;
  
  // ===== PLAYER TRACKING =====
  playerMinutes: Record<number, number>; // { playerId: milliseconds }
  playerPlusMinus: Record<number, number>;
  playersOnCourt: {
    home: number[]; // Array of playerIds
    away: number[];
  };
  updatePlayerMinutes: (minutes: Record<number, number>) => void;
  updatePlayerPlusMinus: (plusMinus: Record<number, number>) => void;
  setPlayersOnCourt: (home: number[], away: number[]) => void;
  
  // ===== ACTIONS =====
  resetGame: () => void;
}

const initialState = {
  socket: null,
  currentGame: null,
  homeTeam: null,
  awayTeam: null,
  gameTime: 600, // 10 minutes default
  isClockRunning: false,
  currentQuarter: 1,
  playerMinutes: {},
  playerPlusMinus: {},
  playersOnCourt: { home: [], away: [] },
};

export const useGameStore = create<GameState>((set, get) => ({
  ...initialState,
  
  // Socket actions
  setSocket: (socket) => set({ socket }),
  
  // Game actions
  setGame: (game) => set({ 
    currentGame: game,
    gameTime: game.gameTime || 600,
    currentQuarter: game.currentQuarter || 1,
  }),
  
  setTeams: (home, away) => set({
    homeTeam: home,
    awayTeam: away,
  }),
  
  updateScore: (home, away) => set((state) => ({
    currentGame: state.currentGame 
      ? { ...state.currentGame, homeScore: home, awayScore: away }
      : null,
  })),
  
  // Timer actions
  setGameTime: (time) => set((state) => ({
    gameTime: typeof time === 'function' ? time(state.gameTime) : time
  })),
  setIsClockRunning: (running) => set({ isClockRunning: running }),
  setCurrentQuarter: (quarter) => set({ currentQuarter: quarter }),
  
  // Player tracking actions
  updatePlayerMinutes: (minutes) => set({ playerMinutes: minutes }),
  
  updatePlayerPlusMinus: (plusMinus) => set({ playerPlusMinus: plusMinus }),
  
  setPlayersOnCourt: (home, away) => set({
    playersOnCourt: { home, away },
  }),
  
  // Reset action
  resetGame: () => set(initialState),
}));

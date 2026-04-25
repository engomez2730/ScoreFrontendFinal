/**
 * Socket.IO Event Types
 * Type-safe socket event definitions
 */

import type { PlayerGameStats } from './game.types';

export interface ClockEvent {
  gameId: number;
  time: number;
  quarter: number;
  isRunning: boolean;
}

export interface StatsUpdateEvent {
  gameId: number;
  playerId: number;
  stats: Partial<PlayerGameStats>;
}

export interface SubstitutionEvent {
  gameId: number;
  playerInId: number;
  playerOutId: number;
  gameTime: number;
  quarter: number;
  timestamp: string;
}

export interface ScoreUpdateEvent {
  gameId: number;
  homeScore: number;
  awayScore: number;
}

// Map of all socket events for type safety
export interface SocketEventMap {
  // Server -> Client
  clockStarted: ClockEvent;
  clockPaused: ClockEvent;
  clockReset: ClockEvent;
  statsUpdated: StatsUpdateEvent;
  substitutionMade: SubstitutionEvent;
  scoreUpdated: ScoreUpdateEvent;
  gameUpdated: { gameId: number };
  
  // Client -> Server
  joinGame: number; // gameId
  leaveGame: number; // gameId
  startClock: number;
  pauseClock: number;
  resetClock: number;
}

// Helper type for event handlers
export type SocketEventHandler<K extends keyof SocketEventMap> = (
  data: SocketEventMap[K]
) => void;

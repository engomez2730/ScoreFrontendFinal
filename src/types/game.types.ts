/**
 * Game Types
 * Centralized TypeScript interfaces for game-related entities
 */

export type GameStatus = 'scheduled' | 'in_progress' | 'paused' | 'finished';

export interface Game {
  id: number;
  eventId: number;
  teamHomeId: number;
  teamAwayId: number;
  fecha: Date | string;
  estado: GameStatus;
  gameTime: number;
  currentQuarter: number;
  quarterTime: number;
  quarterLength: number;
  totalQuarters: number;
  homeScore: number;
  awayScore: number;
  isOvertime?: boolean;
  overtimeLength?: number;
  createdAt?: Date | string;
  updatedAt?: Date | string;
  
  // Populated relations
  stats?: PlayerGameStats[];
  teamHome?: Team;
  teamAway?: Team;
  event?: Event;
}

export interface PlayerGameStats {
  id: number;
  gameId: number;
  playerId: number;
  
  // Scoring stats
  puntos: number;
  tirosIntentados: number;
  tirosAnotados: number;
  tiros3Intentados: number;
  tiros3Anotados: number;
  tirosLibresIntentados: number;
  tirosLibresAnotados: number;
  
  // Other stats
  rebotes: number;
  rebotesOfensivos: number;
  asistencias: number;
  robos: number;
  tapones: number;
  perdidas: number;
  faltasPersonales: number;
  
  // Fouls by quarter
  faltasQ1?: number;
  faltasQ2?: number;
  faltasQ3?: number;
  faltasQ4?: number;
  faltasOT?: number;
  
  // Points by quarter
  puntosQ1?: number;
  puntosQ2?: number;
  puntosQ3?: number;
  puntosQ4?: number;
  puntosOT?: number;
  
  // Time tracking (in milliseconds)
  minutos: number;
  minutosQ1?: number;
  minutosQ2?: number;
  minutosQ3?: number;
  minutosQ4?: number;
  minutosOT?: number;
  
  // Plus-Minus
  plusMinus: number;
  plusMinusQ1?: number;
  plusMinusQ2?: number;
  plusMinusQ3?: number;
  plusMinusQ4?: number;
  plusMinusOT?: number;
  
  isStarter: boolean;
  createdAt?: Date | string;
  updatedAt?: Date | string;
  
  // Populated relation
  player?: Player;
}

export interface Team {
  id: number;
  nombre: string;
  logo?: string;
  ciudad?: string;
  categoria?: string;
  score?: number; // For game context
  players: Player[];
  createdAt?: Date | string;
  updatedAt?: Date | string;
}

export interface Player {
  id: number;
  nombre: string;
  apellido: string;
  numero: number;
  posicion: string;
  teamId: number;
  
  // UI state (not from DB)
  isOnCourt?: boolean;
  stats?: PlayerGameStats;
  
  createdAt?: Date | string;
  updatedAt?: Date | string;
}

export interface Event {
  id: number;
  nombre: string;
  fechaInicio: Date | string;
  fechaFin: Date | string;
  createdAt?: Date | string;
  updatedAt?: Date | string;
}

export interface Substitution {
  id: number;
  gameId: number;
  playerInId: number;
  playerOutId: number;
  gameTime: number;
  quarter?: number;
  timestamp: Date | string;
  createdAt?: Date | string;
  
  // Populated relations
  playerIn?: Player;
  playerOut?: Player;
}

// Future: Event Sourcing for time tracking
export interface PlayerTimeEvent {
  id: number;
  gameId: number;
  playerId: number;
  eventType: 'ENTER_COURT' | 'EXIT_COURT';
  gameTime: number;
  quarter: number;
  timestamp: Date | string;
  createdAt?: Date | string;
}

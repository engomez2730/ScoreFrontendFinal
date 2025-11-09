export { default as teamService } from "./teamService";
export { default as playerService } from "./playerService";
export { default as gameService } from "./gameService";
export { default as eventService } from "./eventService";
export { default as playerGameStatsService } from "./playerGameStatsService";
export { default as substitutionService } from "./substitutionService";
export { default as authService } from "./authService";

// Re-export types
export type { Team } from "./teamService";
export type { Player, PlayerGameStats } from "./playerService";
export type { Game } from "./gameService";
export type { Event } from "./eventService";
export type { Substitution } from "./substitutionService";
export type {
  User,
  LoginCredentials,
  RegisterData,
  AuthResponse,
} from "./authService";

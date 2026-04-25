/**
 * Game constants
 */

// Time constants (in seconds)
export const QUARTER_LENGTH = 600; // 10 minutes
export const OVERTIME_LENGTH = 300; // 5 minutes
export const TOTAL_QUARTERS = 4;

// Player limits
export const MAX_PLAYERS_ON_COURT = 5;
export const MIN_PLAYERS_TO_START = 5;

// Auto-save interval (in milliseconds)
export const AUTO_SAVE_INTERVAL = 10000; // 10 seconds

// Game statuses
export const GAME_STATUS = {
  SCHEDULED: 'scheduled',
  IN_PROGRESS: 'in_progress',
  PAUSED: 'paused',
  FINISHED: 'finished',
} as const;

// Shot types
export const SHOT_TYPES = {
  TWO_POINT: '2pt',
  THREE_POINT: '3pt',
  FREE_THROW: 'ft',
} as const;

// Basketball positions
export const POSITIONS = [
  'Base',
  'Escolta',
  'Alero',
  'Ala-Pívot',
  'Pívot',
] as const;

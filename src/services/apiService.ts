import axios from "axios";

const BASE_URL = "http://localhost:4000/api";

// Create axios instance with base configuration
const api = axios.create({
  baseURL: BASE_URL,
  timeout: 10000,
  headers: {
    "Content-Type": "application/json",
  },
});

// Game API functions
export const gameAPI = {
  // Get all games
  getGames: () => api.get("/games"),

  // Get game by ID
  getGame: (gameId: string | number) => api.get(`/games/${gameId}`),

  // Update game
  updateGame: (gameId: string | number, gameData: any) =>
    api.put(`/games/${gameId}`, gameData),

  // Update game time
  updateGameTime: (gameId: string | number, gameTime: number) =>
    api.put(`/games/${gameId}/time`, { gameTime }),

  // Reset game time
  resetGameTime: (gameId: string | number) =>
    api.post(`/games/${gameId}/reset-time`),

  // Update game score
  updateScore: (
    gameId: string | number,
    homeScore: number,
    awayScore: number
  ) => api.put(`/games/${gameId}/score`, { homeScore, awayScore }),

  // Update player stats
  updatePlayerStats: (gameId: string | number, playerId: number, stats: any) =>
    api.put(`/games/${gameId}/player-stats`, { playerId, stats }),

  // Record shot (intelligent shot tracking)
  recordShot: (
    gameId: string | number,
    shotData: {
      playerId: number;
      shotType: string;
      made: boolean;
      gameTime: number;
      playerMinutes: number;
    }
  ) => api.post(`/games/${gameId}/record-shot`, shotData),

  // Record assist
  recordAssist: (gameId: string | number, playerId: number) =>
    api.post(`/games/${gameId}/record-assist`, { playerId }),

  // Record rebound
  recordRebound: (gameId: string | number, playerId: number) =>
    api.post(`/games/${gameId}/record-rebound`, { playerId }),

  // Record steal
  recordSteal: (gameId: string | number, playerId: number) =>
    api.post(`/games/${gameId}/record-steal`, { playerId }),

  // Record block
  recordBlock: (gameId: string | number, playerId: number) =>
    api.post(`/games/${gameId}/record-block`, { playerId }),

  // Record turnover
  recordTurnover: (gameId: string | number, playerId: number) =>
    api.post(`/games/${gameId}/record-turnover`, { playerId }),

  // Get game stats
  getGameStats: (gameId: string | number) => api.get(`/games/${gameId}/stats`),

  // Create new game
  createGame: (gameData: any) => api.post("/games", gameData),

  // Delete game
  deleteGame: (gameId: string | number) => api.delete(`/games/${gameId}`),
};

// Team API functions
export const teamAPI = {
  // Get team by ID
  getTeam: (teamId: string | number) => api.get(`/teams/${teamId}`),

  // Get all teams
  getTeams: () => api.get("/teams"),

  // Create new team
  createTeam: (teamData: any) => api.post("/teams", teamData),

  // Update team
  updateTeam: (teamId: string | number, teamData: any) => api.put(`/teams/${teamId}`, teamData),

  // Delete team
  deleteTeam: (teamId: string | number) => api.delete(`/teams/${teamId}`),
};

// Substitution API functions
export const substitutionAPI = {
  // Create substitution
  createSubstitution: (substitutionData: any) =>
    api.post("/substitutions", substitutionData),

  // Get substitutions for a game
  getGameSubstitutions: (gameId: string | number) =>
    api.get(`/substitutions/game/${gameId}`),
};

// Player API functions
export const playerAPI = {
  // Get all players
  getPlayers: () => api.get("/players"),

  // Get player by ID
  getPlayer: (playerId: string | number) => api.get(`/players/${playerId}`),

  // Get players by team
  getTeamPlayers: (teamId: string | number) =>
    api.get(`/players/team/${teamId}`),

  // Create new player
  createPlayer: (playerData: any) => api.post("/players", playerData),

  // Update player
  updatePlayer: (playerId: string | number, playerData: any) => api.put(`/players/${playerId}`, playerData),

  // Delete player
  deletePlayer: (playerId: string | number) => api.delete(`/players/${playerId}`),
};

// Event API functions
export const eventAPI = {
  // Get all events
  getEvents: () => api.get("/events"),

  // Get event by ID
  getEvent: (eventId: string | number) => api.get(`/events/${eventId}`),

  // Create new event
  createEvent: (eventData: any) => api.post("/events", eventData),

  // Update event
  updateEvent: (eventId: string | number, eventData: any) => api.put(`/events/${eventId}`, eventData),

  // Delete event
  deleteEvent: (eventId: string | number) => api.delete(`/events/${eventId}`),
};

// Export the axios instance for custom requests if needed
export default api;

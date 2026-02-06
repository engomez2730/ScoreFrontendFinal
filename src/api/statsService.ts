import api from "./axios";
import publicApi from "./publicAxios";

export interface GameStats {
  gameId: number;
  playerId: number;
  puntos: number;
  rebotes: number;
  asistencias: number;
  robos: number;
  tapones: number;
  faltas: number;
  minutos: number;
}

const statsService = {
  // Get all stats for a game (public)
  getGameStats: async (gameId: number) => {
    const response = await publicApi.get(`/games/${gameId}/stats`);
    return response.data;
  },

  // Get player stats in a game (public)
  getPlayerGameStats: async (gameId: number, playerId: number) => {
    const response = await publicApi.get(
      `/games/${gameId}/players/${playerId}/stats`
    );
    return response.data;
  },

  // Update player stats in a game
  updatePlayerGameStats: async (
    gameId: number,
    playerId: number,
    stats: Partial<GameStats>
  ) => {
    const response = await api.put(
      `/games/${gameId}/players/${playerId}/stats`,
      stats
    );
    return response.data;
  },

  // Create initial stats entry for a player in a game
  createPlayerGameStats: async (stats: GameStats) => {
    const response = await api.post(
      `/games/${stats.gameId}/players/${stats.playerId}/stats`,
      stats
    );
    return response.data;
  },

  // Delete player stats from a game
  deletePlayerGameStats: async (gameId: number, playerId: number) => {
    await api.delete(`/games/${gameId}/players/${playerId}/stats`);
  },

  // Get team stats for a game (public)
  getTeamGameStats: async (gameId: number, teamId: number) => {
    const response = await publicApi.get(`/games/${gameId}/teams/${teamId}/stats`);
    return response.data;
  },
};

export default statsService;

import api from "./axios";
import type { PlayerGameStats } from ".";

const playerGameStatsService = {
  getGameStats: async (gameId: number) => {
    const response = await api.get(`/player-game-stats/game/${gameId}`);
    return response.data;
  },

  getPlayerStats: async (playerId: number) => {
    const response = await api.get(`/player-game-stats/player/${playerId}`);
    return response.data;
  },

  createOrUpdate: async (
    gameId: number,
    playerId: number,
    stats: PlayerGameStats
  ) => {
    const response = await api.post(
      `/player-game-stats/${gameId}/${playerId}`,
      stats
    );
    return response.data;
  },
};

export default playerGameStatsService;

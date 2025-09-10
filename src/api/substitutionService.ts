import api from "./axios";

export interface Substitution {
  gameId: number;
  playerInId: number;
  playerOutId: number;
  timestamp: string;
}

const substitutionService = {
  getGameSubstitutions: async (gameId: number) => {
    const response = await api.get(`/games/${gameId}/substitutions`);
    return response.data;
  },

  create: async (gameId: number, substitution: { playerInId: number; playerOutId: number; gameTime: number }) => {
    // Prepare the request body in exact format required
    const requestBody = {
      playerOutId: substitution.playerOutId,
      playerInId: substitution.playerInId,
      gameTime: substitution.gameTime
    };

    console.log('Making substitution request:', {
      url: `/games/${gameId}/substitution`,
      body: requestBody
    });

    try {
      const response = await api.post(`/games/${gameId}/substitution`, requestBody);
      return response.data;
    } catch (error: any) {
      console.log('%c ❌ Substitution Error', 'background: #e74c3c; color: white; padding: 2px 5px; border-radius: 3px;', {
        status: error.response?.status,
        error: error.response?.data,
        requestData: {
          gameId,
          ...substitution
        }
      });
      throw error;
    }
  },
};

export default substitutionService;

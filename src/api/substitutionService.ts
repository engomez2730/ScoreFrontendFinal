import api from "./axios";

export interface Substitution {
  gameId: number;
  playerInId: number;
  playerOutId: number;
  timestamp: string;
}

const substitutionService = {
  getGameSubstitutions: async (gameId: number) => {
    const response = await api.get(`/substitutions/game/${gameId}`);
    return response.data;
  },

  create: async (substitution: Substitution) => {
    const response = await api.post("/substitutions", substitution);
    return response.data;
  },
};

export default substitutionService;

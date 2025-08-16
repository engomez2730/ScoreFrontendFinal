import api from "./axios";

export interface Game {
  id?: number;
  eventId: number;
  fecha: string;
  estado: "programado" | "en_progreso" | "finalizado";
  teamHomeId: number;
  teamAwayId: number;
}

const gameService = {
  getAll: async () => {
    const response = await api.get("/games");
    return response.data;
  },

  getById: async (id: number) => {
    const response = await api.get(`/games/${id}`);
    return response.data;
  },

  create: async (game: Game) => {
    const response = await api.post("/games", game);
    return response.data;
  },

  update: async (id: number, game: Game) => {
    const response = await api.put(`/games/${id}`, game);
    return response.data;
  },

  delete: async (id: number) => {
    await api.delete(`/games/${id}`);
  },
};

export default gameService;

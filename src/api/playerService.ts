import api from "./axios";

export interface Player {
  id?: number;
  nombre: string;
  apellido: string;
  numero: number;
  posicion: string;
  teamId: number;
}

export interface PlayerGameStats {
  puntos: number;
  rebotes: number;
  asistencias: number;
  robos: number;
  tapones: number;
  tirosIntentados: number;
  tirosAnotados: number;
  tiros3Intentados: number;
  tiros3Anotados: number;
  minutos: number;
  plusMinus: number;
}

const playerService = {
  getAll: async () => {
    const response = await api.get("/players");
    return response.data;
  },

  getById: async (id: number) => {
    const response = await api.get(`/players/${id}`);
    return response.data;
  },

  create: async (player: Player) => {
    const response = await api.post("/players", player);
    return response.data;
  },

  update: async (id: number, player: Player) => {
    const response = await api.put(`/players/${id}`, player);
    return response.data;
  },

  delete: async (id: number) => {
    await api.delete(`/players/${id}`);
  },
};

export default playerService;

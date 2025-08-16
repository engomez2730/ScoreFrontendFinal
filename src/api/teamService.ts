import api from "./axios";

export interface Team {
  id?: number;
  nombre: string;
  logo?: string;
}

export interface Player {
  id?: number;
  nombre: string;
  apellido: string;
  numero: number;
  posicion: string;
  teamId: number;
}

const teamService = {
  getAll: async () => {
    const response = await api.get("/teams");
    return response.data;
  },

  getById: async (id: number) => {
    const response = await api.get(`/teams/${id}`);
    return response.data;
  },

  create: async (team: Team) => {
    const response = await api.post("/teams", team);
    return response.data;
  },

  update: async (id: number, team: Team) => {
    const response = await api.put(`/teams/${id}`, team);
    return response.data;
  },

  delete: async (id: number) => {
    await api.delete(`/teams/${id}`);
  },
};

export default teamService;

import api from "./axios";

export interface Event {
  id?: number;
  nombre: string;
  fechaInicio: string;
  fechaFin: string;
}

const eventService = {
  getAll: async () => {
    const response = await api.get("/events");
    return response.data;
  },

  getById: async (id: number) => {
    const response = await api.get(`/events/${id}`);
    return response.data;
  },

  create: async (event: Event) => {
    const response = await api.post("/events", event);
    return response.data;
  },

  update: async (id: number, event: Event) => {
    const response = await api.put(`/events/${id}`, event);
    return response.data;
  },

  delete: async (id: number) => {
    await api.delete(`/events/${id}`);
  },
};

export default eventService;

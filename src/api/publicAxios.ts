import axios from "axios";

const API_BASE = (import.meta.env.VITE_API_BASE as string) ||
  "https://quizbackendfinal-production.up.railway.app";

const publicApi = axios.create({
  baseURL: `${API_BASE}/api`,
  headers: {
    "Content-Type": "application/json",
  },
});

export default publicApi;

import axios from "axios";

// Token management utility
const getToken = (): string | null => {
  const value = `; ${document.cookie}`;
  const parts = value.split(`; auth_token=`);
  if (parts.length === 2) {
    return parts.pop()?.split(";").shift() || null;
  }
  return null;
};

const api = axios.create({
  baseURL: "http://localhost:4000/api", // Update this with your backend URL
  headers: {
    "Content-Type": "application/json",
  },
});

// Add request interceptor to include auth token
api.interceptors.request.use(
  (config) => {
    const token = getToken();
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
      console.log(
        "🔑 Adding auth token to request:",
        token.substring(0, 20) + "..."
      );
    } else {
      console.log("⚠️ No auth token found in cookies");
    }
    console.log(
      "📤 Request URL:",
      `${config.baseURL || "http://localhost:4000/api"}${config.url || ""}`
    );
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Add response interceptor to handle auth errors
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      // Token is invalid or expired
      document.cookie =
        "auth_token=; path=/; expires=Thu, 01 Jan 1970 00:00:01 GMT";
      localStorage.removeItem("auth_user");

      // Redirect to login if not already on login page
      if (window.location.pathname !== "/login") {
        window.location.href = "/login";
      }
    }
    return Promise.reject(error);
  }
);

export default api;

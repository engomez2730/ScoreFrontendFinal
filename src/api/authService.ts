import api from "./axios";

export interface LoginCredentials {
  email: string;
  password: string;
}

export interface RegisterData {
  email: string;
  password: string;
  confirmPassword?: string;
  nombre: string;
  rol:
    | "USER"
    | "ADMIN"
    | "SCORER"
    | "REBOUNDER_ASSISTS"
    | "STEALS_BLOCKS"
    | "ALL_AROUND";
}

export type UserRole =
  | "USER"
  | "ADMIN"
  | "SCORER"
  | "REBOUNDER_ASSISTS"
  | "STEALS_BLOCKS"
  | "ALL_AROUND";

export interface User {
  id: number;
  email: string;
  nombre: string;
  apellido?: string;
  rol: UserRole;
  isActive?: boolean;
  createdAt: string;
}

// Game permissions interface
export interface GamePermissions {
  // Stats permissions
  canEditPoints: boolean;
  canEditRebounds: boolean;
  canEditAssists: boolean;
  canEditSteals: boolean;
  canEditBlocks: boolean;
  canEditTurnovers: boolean;
  canEditShots: boolean;
  canEditFreeThrows: boolean;
  canEditPersonalFouls: boolean;

  // Game control permissions
  canControlTime: boolean;
  canMakeSubstitutions: boolean;
  canEndQuarter: boolean;
  canSetStarters: boolean;

  // Admin permissions
  canManagePermissions: boolean;
  canViewAllStats: boolean;
}

export interface UserGamePermissions {
  userId: number;
  gameId: number;
  permissions: GamePermissions;
  isGameCreator: boolean;
}

export interface AuthResponse {
  token: string;
  user: User;
}

// Cookie management utilities
const TOKEN_KEY = "auth_token";
const USER_KEY = "auth_user";

export const tokenUtils = {
  setToken: (token: string) => {
    document.cookie = `${TOKEN_KEY}=${token}; path=/; max-age=${
      60 * 60 * 24 * 7
    }; SameSite=Strict`; // 7 days
  },

  getToken: (): string | null => {
    const value = `; ${document.cookie}`;
    const parts = value.split(`; ${TOKEN_KEY}=`);
    if (parts.length === 2) {
      return parts.pop()?.split(";").shift() || null;
    }
    return null;
  },

  removeToken: () => {
    document.cookie = `${TOKEN_KEY}=; path=/; expires=Thu, 01 Jan 1970 00:00:01 GMT`;
  },

  setUser: (user: User) => {
    localStorage.setItem(USER_KEY, JSON.stringify(user));
  },

  getUser: (): User | null => {
    const userData = localStorage.getItem(USER_KEY);
    return userData ? JSON.parse(userData) : null;
  },

  removeUser: () => {
    localStorage.removeItem(USER_KEY);
  },
};

const authService = {
  // Login user
  login: async (credentials: LoginCredentials): Promise<AuthResponse> => {
    const response = await api.post("/auth/login", credentials);
    const { token, user } = response.data;

    // Store token and user data
    tokenUtils.setToken(token);
    tokenUtils.setUser(user);

    return response.data;
  },

  // Register new user
  register: async (userData: RegisterData): Promise<AuthResponse> => {
    // Enviar solo los campos que el backend espera
    const { nombre, email, password, rol } = userData;
    const response = await api.post("/auth/register", {
      nombre,
      email,
      password,
      rol,
    });

    console.log("📝 Registration response:", response);
    const { token, user } = response.data;

    // Store token and user data
    tokenUtils.setToken(token);
    tokenUtils.setUser(user);

    return response.data;
  },

  // Get user profile
  getProfile: async (): Promise<User> => {
    const response = await api.get("/auth/profile");
    return response.data;
  },

  // Verify token
  verifyToken: async (): Promise<{ valid: boolean; user?: User }> => {
    try {
      const response = await api.post("/auth/verify-token");
      return response.data;
    } catch {
      return { valid: false };
    }
  },

  // Logout user
  logout: async (): Promise<void> => {
    try {
      await api.post("/auth/logout");
    } catch (error) {
      console.error("Error during logout:", error);
    } finally {
      // Always clear local storage regardless of API response
      tokenUtils.removeToken();
      tokenUtils.removeUser();
    }
  },

  // Check if user is authenticated
  isAuthenticated: (): boolean => {
    return !!tokenUtils.getToken();
  },

  // Get current user from storage
  getCurrentUser: (): User | null => {
    return tokenUtils.getUser();
  },
};

export default authService;

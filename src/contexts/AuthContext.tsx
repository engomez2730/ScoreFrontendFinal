import React, { createContext, useContext, useState, useEffect } from "react";
import type { ReactNode } from "react";
import authService from "../api/authService";
import permissionService from "../api/permissionService";
import type {
  User,
  LoginCredentials,
  RegisterData,
  GamePermissions,
  UserGamePermissions,
} from "../api/authService";
import { message } from "antd";

interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  currentGamePermissions: GamePermissions | null;
  isGameCreator: boolean;
  login: (credentials: LoginCredentials) => Promise<boolean>;
  register: (userData: RegisterData) => Promise<boolean>;
  logout: () => Promise<void>;
  verifyAuth: () => Promise<void>;
  // Permission management
  joinGame: (gameId: number) => Promise<boolean>;
  leaveGame: (gameId: number) => Promise<void>;
  loadGamePermissions: (gameId: number) => Promise<void>;
  hasPermission: (permission: keyof GamePermissions) => boolean;
  isAdmin: () => boolean;
  canManageGame: () => boolean; // isAdmin || isGameCreator
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};

interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [currentGamePermissions, setCurrentGamePermissions] =
    useState<GamePermissions | null>(null);
  const [isGameCreator, setIsGameCreator] = useState(false);
  const [currentGameId, setCurrentGameId] = useState<number | null>(null);

  const isAuthenticated = !!user;

  // Verify authentication on app load
  useEffect(() => {
    const initAuth = async () => {
      setIsLoading(true);
      try {
        if (authService.isAuthenticated()) {
          const result = await authService.verifyToken();
          if (result.valid && result.user) {
            setUser(result.user);
          } else {
            // Token is invalid, clear it
            await logout();
          }
        }
      } catch (error) {
        console.error("Auth verification failed:", error);
        await logout();
      } finally {
        setIsLoading(false);
      }
    };

    initAuth();
  }, []);

  const verifyAuth = async () => {
    setIsLoading(true);
    try {
      if (authService.isAuthenticated()) {
        const result = await authService.verifyToken();
        if (result.valid && result.user) {
          setUser(result.user);
        } else {
          // Token is invalid, clear it
          await logout();
        }
      }
    } catch (error) {
      console.error("Auth verification failed:", error);
      await logout();
    } finally {
      setIsLoading(false);
    }
  };

  const login = async (credentials: LoginCredentials): Promise<boolean> => {
    try {
      const response = await authService.login(credentials);
      setUser(response.user);
      message.success("¡Inicio de sesión exitoso!");
      return true;
    } catch (error: unknown) {
      const errorMessage =
        error instanceof Error ? error.message : "Error al iniciar sesión";
      message.error(errorMessage);
      return false;
    }
  };

  const register = async (userData: RegisterData): Promise<boolean> => {
    try {
      const response = await authService.register(userData);
      setUser(response.user);
      message.success("¡Registro exitoso! Bienvenido.");
      return true;
    } catch (error: unknown) {
      const errorMessage =
        error instanceof Error ? error.message : "Error al registrarse";
      message.error(errorMessage);
      return false;
    }
  };

  const logout = async (): Promise<void> => {
    try {
      await authService.logout();
      setUser(null);
      setCurrentGamePermissions(null);
      setIsGameCreator(false);
      setCurrentGameId(null);
      message.success("Sesión cerrada correctamente");
    } catch (error) {
      console.error("Logout error:", error);
      // Still clear local state even if API call fails
      setUser(null);
      setCurrentGamePermissions(null);
      setIsGameCreator(false);
      setCurrentGameId(null);
    }
  };

  // Permission management functions
  const joinGame = async (gameId: number): Promise<boolean> => {
    try {
      const result = await permissionService.joinGame(gameId);
      setCurrentGameId(gameId);
      setCurrentGamePermissions(result.permissions);
      setIsGameCreator(result.isGameCreator);
      message.success("Te has unido al juego correctamente");
      return true;
    } catch (error) {
      console.error("Error joining game:", error);
      message.error("Error al unirse al juego");
      return false;
    }
  };

  const leaveGame = async (gameId: number): Promise<void> => {
    try {
      await permissionService.leaveGame(gameId);
      setCurrentGamePermissions(null);
      setIsGameCreator(false);
      setCurrentGameId(null);
      message.success("Has salido del juego");
    } catch (error) {
      console.error("Error leaving game:", error);
      message.error("Error al salir del juego");
    }
  };

  const loadGamePermissions = async (gameId: number): Promise<void> => {
    try {
      const permissions = await permissionService.getMyPermissions(gameId);
      setCurrentGameId(gameId);
      setCurrentGamePermissions(permissions.permissions);
      setIsGameCreator(permissions.isGameCreator);
    } catch (error) {
      console.error("Error loading game permissions:", error);
      // Don't show error message as this might be called automatically
    }
  };

  // Permission checking functions
  const hasPermission = (permission: keyof GamePermissions): boolean => {
    // Game creator has all permissions
    if (isGameCreator) return true;
    
    // Admin has all permissions
    if (user?.rol === "ADMIN") return true;
    
    // If game permissions are loaded, use them
    if (currentGamePermissions) {
      return currentGamePermissions[permission];
    }
    
    // If no game permissions are loaded yet, check default role permissions
    if (user?.rol) {
      const defaultPermissions = permissionService.getDefaultPermissions(user.rol);
      return defaultPermissions[permission] || false;
    }
    
    return false;
  };

  const isAdmin = (): boolean => {
    return user?.rol === "ADMIN";
  };

  const canManageGame = (): boolean => {
    return isAdmin() || isGameCreator;
  };

  const value: AuthContextType = {
    user,
    isAuthenticated,
    isLoading,
    currentGamePermissions,
    isGameCreator,
    login,
    register,
    logout,
    verifyAuth,
    joinGame,
    leaveGame,
    loadGamePermissions,
    hasPermission,
    isAdmin,
    canManageGame,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

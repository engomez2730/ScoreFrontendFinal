import api from "./axios";
import type { GamePermissions, UserGamePermissions } from "./authService";

export interface JoinGameResponse {
  success: boolean;
  permissions: GamePermissions;
  isGameCreator: boolean;
}

export interface GameUser {
  userId: number;
  user: {
    id: number;
    nombre: string;
    apellido?: string;
    email: string;
    rol: string;
  };
  permissions: GamePermissions;
  isGameCreator: boolean;
  joinedAt: string;
}

const permissionService = {
  // Join a game
  joinGame: async (gameId: number): Promise<JoinGameResponse> => {
    const response = await api.post(`/user-game/games/${gameId}/join`);
    return response.data;
  },

  // Leave a game
  leaveGame: async (gameId: number): Promise<void> => {
    await api.post(`/user-game/games/${gameId}/leave`);
  },

  // Get users connected to a game
  getGameUsers: async (gameId: number): Promise<GameUser[]> => {
    const response = await api.get(`/user-game/games/${gameId}/users`);
    return response.data;
  },

  // Get my permissions for a game
  getMyPermissions: async (gameId: number): Promise<UserGamePermissions> => {
    const response = await api.get(`/user-game/games/${gameId}/my-permissions`);
    return response.data;
  },

  // Get permissions for a specific user (Admin/Creator only)
  getUserPermissions: async (
    gameId: number,
    userId: number
  ): Promise<UserGamePermissions> => {
    const response = await api.get(
      `/user-game/games/${gameId}/users/${userId}/permissions`
    );
    return response.data;
  },

  // Set permissions for a user (Admin/Creator only)
  setUserPermissions: async (
    gameId: number,
    userId: number,
    permissions: Partial<GamePermissions>
  ): Promise<UserGamePermissions> => {
    const response = await api.post(
      `/user-game/games/${gameId}/users/${userId}/permissions`,
      permissions
    );
    return response.data;
  },

  // Get all permissions for a game (Admin/Creator only)
  getAllGamePermissions: async (
    gameId: number
  ): Promise<UserGamePermissions[]> => {
    const response = await api.get(`/user-game/games/${gameId}/permissions`);
    return response.data;
  },

  // Remove user permissions (Admin/Creator only)
  removeUserPermissions: async (
    gameId: number,
    userId: number
  ): Promise<void> => {
    await api.delete(`/user-game/games/${gameId}/users/${userId}/permissions`);
  },

  // Helper functions for permission checking
  hasPermission: (
    permissions: GamePermissions | null,
    permission: keyof GamePermissions
  ): boolean => {
    return permissions?.[permission] ?? false;
  },

  // Check if user has any stats editing permissions
  canEditAnyStats: (permissions: GamePermissions | null): boolean => {
    if (!permissions) return false;
    return (
      permissions.canEditPoints ||
      permissions.canEditRebounds ||
      permissions.canEditAssists ||
      permissions.canEditSteals ||
      permissions.canEditBlocks ||
      permissions.canEditTurnovers ||
      permissions.canEditShots ||
      permissions.canEditFreeThrows ||
      permissions.canEditPersonalFouls
    );
  },

  // Get default permissions for different roles
  getDefaultPermissions: (role: string): Partial<GamePermissions> => {
    switch (role) {
      case "ADMIN":
        return {
          // Administrador con todos los permisos
          canEditPoints: true,
          canEditRebounds: true,
          canEditAssists: true,
          canEditSteals: true,
          canEditBlocks: true,
          canEditTurnovers: true,
          canEditShots: true,
          canEditFreeThrows: true,
          canEditPersonalFouls: true,
          canControlTime: true,
          canMakeSubstitutions: true,
          canEndQuarter: true,
          canSetStarters: true,
          canManagePermissions: true,
          canViewAllStats: true,
        };
      case "SCORER":
        return {
          // Puntos, tiros de campo, triples y tiros libres
          canEditPoints: true,
          canEditShots: true,
          canEditFreeThrows: true,
          canEditRebounds: false,
          canEditAssists: false,
          canEditSteals: false,
          canEditBlocks: false,
          canEditTurnovers: false,
          canEditPersonalFouls: false,
          canControlTime: false,
          canMakeSubstitutions: false,
          canEndQuarter: false,
          canSetStarters: false,
          canManagePermissions: false,
          canViewAllStats: true,
        };
      case "REBOUNDER_ASSISTS":
        return {
          // Rebotes, asistencias y pérdidas de balón
          canEditRebounds: true,
          canEditAssists: true,
          canEditTurnovers: true,
          canEditPoints: false,
          canEditSteals: false,
          canEditBlocks: false,
          canEditShots: false,
          canEditFreeThrows: false,
          canEditPersonalFouls: false,
          canControlTime: false,
          canMakeSubstitutions: false,
          canEndQuarter: false,
          canSetStarters: false,
          canManagePermissions: false,
          canViewAllStats: true,
        };
      case "STEALS_BLOCKS":
        return {
          // Robos y bloqueos/tapones
          canEditSteals: true,
          canEditBlocks: true,
          canEditPoints: false,
          canEditRebounds: false,
          canEditAssists: false,
          canEditTurnovers: false,
          canEditShots: false,
          canEditFreeThrows: false,
          canEditPersonalFouls: false,
          canControlTime: false,
          canMakeSubstitutions: false,
          canEndQuarter: false,
          canSetStarters: false,
          canManagePermissions: false,
          canViewAllStats: true,
        };
      case "ALL_AROUND":
        return {
          // Todas las estadísticas excepto control de tiempo
          canEditPoints: true,
          canEditRebounds: true,
          canEditAssists: true,
          canEditSteals: true,
          canEditBlocks: true,
          canEditTurnovers: true,
          canEditShots: true,
          canEditFreeThrows: true,
          canEditPersonalFouls: true,
          canControlTime: false, // NO control de tiempo
          canMakeSubstitutions: false,
          canEndQuarter: false,
          canSetStarters: false,
          canManagePermissions: false,
          canViewAllStats: true,
        };
      case "USER":
      default:
        return {
          // Permisos asignados específicamente (ninguno por defecto)
          canEditPoints: false,
          canEditRebounds: false,
          canEditAssists: false,
          canEditSteals: false,
          canEditBlocks: false,
          canEditTurnovers: false,
          canEditShots: false,
          canEditFreeThrows: false,
          canEditPersonalFouls: false,
          canControlTime: false,
          canMakeSubstitutions: false,
          canEndQuarter: false,
          canSetStarters: false,
          canManagePermissions: false,
          canViewAllStats: false,
        };
    }
  },
};

export default permissionService;

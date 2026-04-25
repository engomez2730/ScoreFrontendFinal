/**
 * Permissions Types
 * User roles and game permissions
 */

export type UserRole = 
  | 'USER'
  | 'ADMIN' 
  | 'SCORER'
  | 'REBOUNDER_ASSISTS'
  | 'STEALS_BLOCKS'
  | 'ALL_AROUND'
  | 'SUPER_ADMIN'
  | 'TIME_CONTROLLER';

export interface User {
  id: number;
  nombre: string;
  apellido?: string;
  email: string;
  rol: UserRole;
  isActive: boolean;
  createdAt?: Date | string;
  updatedAt?: Date | string;
}

export interface GamePermissions {
  canEditPoints: boolean;
  canEditRebounds: boolean;
  canEditAssists: boolean;
  canEditSteals: boolean;
  canEditBlocks: boolean;
  canEditTurnovers: boolean;
  canEditShots: boolean;
  canEditFreeThrows: boolean;
  canEditPersonalFouls: boolean;
  canControlTime: boolean;
  canMakeSubstitutions: boolean;
  canEndQuarter: boolean;
  canSetStarters: boolean;
  canManagePermissions: boolean;
  canViewAllStats: boolean;
}

export interface UserGame {
  id: number;
  userId: number;
  gameId: number;
  isGameCreator: boolean;
  joinedAt: Date | string;
  permissions: GamePermissions;
  user?: User;
}

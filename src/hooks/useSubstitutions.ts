/**
 * useSubstitutions Hook
 * Manages player substitution logic and state
 */

import { useState, useCallback } from 'react';
import { message } from 'antd';
import { gameAPI } from '../services/apiService';
import type { Player, Team } from '../types/game.types';

interface SubstitutionState {
  isSelecting: boolean;
  selectedTeam: 'home' | 'away' | null;
  playerOut: Player | null;
}

interface UseSubstitutionsProps {
  gameId: string | undefined;
  homeTeam: Team | null;
  awayTeam: Team | null;
  gameTime: number;
  quarterLength: number;
  playerMinutes: Record<number, number>;
  hasPermission: (permission: any) => boolean;
  onTeamUpdate: (team: 'home' | 'away', players: Player[]) => void;
}

export const useSubstitutions = ({
  gameId,
  homeTeam,
  awayTeam,
  gameTime,
  quarterLength,
  playerMinutes,
  hasPermission,
  onTeamUpdate,
}: UseSubstitutionsProps) => {
  const [substitutionState, setSubstitutionState] = useState<SubstitutionState>({
    isSelecting: false,
    selectedTeam: null,
    playerOut: null,
  });

  /**
   * Start substitution process
   */
  const startSubstitution = useCallback(
    (player: Player, team: 'home' | 'away') => {
      if (!hasPermission('canMakeSubstitutions')) {
        message.error('No tienes permisos para hacer sustituciones');
        return;
      }

      setSubstitutionState({
        isSelecting: true,
        selectedTeam: team,
        playerOut: player,
      });

      message.info({
        content: `${player.nombre} ${player.apellido} seleccionado. Elige un jugador del banco para sustituir.`,
        duration: 3,
      });
    },
    [hasPermission]
  );

  /**
   * Cancel substitution
   */
  const cancelSubstitution = useCallback(() => {
    setSubstitutionState({
      isSelecting: false,
      selectedTeam: null,
      playerOut: null,
    });
    message.info('Sustitución cancelada');
  }, []);

  /**
   * Complete substitution
   */
  const completeSubstitution = useCallback(
    async (playerIn: Player) => {
      if (!gameId || !substitutionState.playerOut) {
        message.error('Missing game or player data for substitution');
        return;
      }

      // Validate same player
      if (playerIn.id === substitutionState.playerOut.id) {
        message.error('Cannot substitute a player with themselves');
        return;
      }

      // Get target team
      const targetTeam = substitutionState.selectedTeam === 'home' ? homeTeam : awayTeam;
      const actualPlayerOut = targetTeam?.players.find(
        (p: Player) => p.id === substitutionState.playerOut?.id
      );
      const actualPlayerIn = targetTeam?.players.find((p: Player) => p.id === playerIn.id);

      // Validate player status
      if (!actualPlayerOut?.isOnCourt) {
        message.error('Selected player to substitute out is not on the court');
        return;
      }

      if (actualPlayerIn?.isOnCourt) {
        message.error('Selected player to substitute in is already on the court');
        return;
      }

      // Validate same team
      if (
        !substitutionState.selectedTeam ||
        (substitutionState.selectedTeam === 'home' && playerIn.teamId !== homeTeam?.id) ||
        (substitutionState.selectedTeam === 'away' && playerIn.teamId !== awayTeam?.id)
      ) {
        message.error('Cannot substitute players from different teams');
        return;
      }

      try {
        const currentGameTime = quarterLength - gameTime;

        const substitutionData = {
          gameId: Number(gameId),
          playerOutId: Number(substitutionState.playerOut.id),
          playerInId: Number(playerIn.id),
          gameTime: currentGameTime,
        };

        console.log('Making substitution with:', substitutionData);

        // Call appropriate API endpoint
        let response;
        if (substitutionState.selectedTeam === 'home') {
          response = await gameAPI.makeHomeSubstitution(substitutionData);
        } else {
          response = await gameAPI.makeAwaySubstitution(substitutionData);
        }

        console.log('Substitution response:', response);

        // Success message
        const playerOutName = `${substitutionState.playerOut.nombre} ${substitutionState.playerOut.apellido}`;
        const playerInName = `${playerIn.nombre} ${playerIn.apellido}`;
        message.success({
          content: `Sustitución exitosa: ${playerOutName} sale, ${playerInName} entra`,
          duration: 4,
        });

        // Update local state
        console.log('🔄 Updating team states for substitution...');
        console.log(
          `   Player OUT: ${substitutionState.playerOut.nombre} (ID: ${substitutionState.playerOut.id}) - Current minutes: ${Math.round((playerMinutes[substitutionState.playerOut.id] || 0) / 1000)}s`
        );
        console.log(
          `   Player IN: ${playerIn.nombre} (ID: ${playerIn.id}) - Current minutes: ${Math.round((playerMinutes[playerIn.id] || 0) / 1000)}s`
        );

        if (substitutionState.selectedTeam === 'home' && homeTeam) {
          const updatedPlayers = homeTeam.players.map((p: Player) => {
            if (p.id === playerIn.id) {
              console.log(`   ✅ Setting ${p.nombre} as ON COURT`);
              return { ...p, isOnCourt: true };
            }
            if (p.id === substitutionState.playerOut?.id) {
              console.log(`   ⛔ Setting ${p.nombre} as OFF COURT`);
              return { ...p, isOnCourt: false };
            }
            return p;
          });
          onTeamUpdate('home', updatedPlayers);
        } else if (substitutionState.selectedTeam === 'away' && awayTeam) {
          const updatedPlayers = awayTeam.players.map((p: Player) => {
            if (p.id === playerIn.id) {
              console.log(`   ✅ Setting ${p.nombre} as ON COURT`);
              return { ...p, isOnCourt: true };
            }
            if (p.id === substitutionState.playerOut?.id) {
              console.log(`   ⛔ Setting ${p.nombre} as OFF COURT`);
              return { ...p, isOnCourt: false };
            }
            return p;
          });
          onTeamUpdate('away', updatedPlayers);
        }

        // Reset substitution state
        setSubstitutionState({
          isSelecting: false,
          selectedTeam: null,
          playerOut: null,
        });
      } catch (err: any) {
        console.error('Error making substitution:', err);
        message.error({
          content: err.response?.data?.error || 'Error al realizar la sustitución',
          duration: 4,
        });
      }
    },
    [
      gameId,
      substitutionState,
      homeTeam,
      awayTeam,
      gameTime,
      quarterLength,
      playerMinutes,
      onTeamUpdate,
    ]
  );

  return {
    substitutionState,
    startSubstitution,
    cancelSubstitution,
    completeSubstitution,
  };
};

export default useSubstitutions;

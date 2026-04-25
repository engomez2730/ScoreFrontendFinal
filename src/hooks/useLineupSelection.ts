/**
 * useLineupSelection Hook
 * Manages selection of starting lineup (5 players per team)
 */

import { useState, useCallback } from 'react';
import { message, notification } from 'antd';

interface UseLineupSelectionProps {
  maxPlayers?: number;
}

export const useLineupSelection = ({ maxPlayers = 5 }: UseLineupSelectionProps = {}) => {
  const [selectedPlayers, setSelectedPlayers] = useState<{
    home: number[];
    away: number[];
  }>({
    home: [],
    away: [],
  });

  /**
   * Toggle player selection
   */
  const togglePlayerSelection = useCallback(
    (playerId: number, team: 'home' | 'away') => {
      setSelectedPlayers((prev) => {
        const currentTeam = prev[team];
        const isSelected = currentTeam.includes(playerId);

        if (isSelected) {
          // Remove player
          return {
            ...prev,
            [team]: currentTeam.filter((id) => id !== playerId),
          };
        } else {
          // Add player if under limit
          if (currentTeam.length >= maxPlayers) {
            message.warning(`Ya has seleccionado ${maxPlayers} jugadores para este equipo`);
            return prev;
          }
          return {
            ...prev,
            [team]: [...currentTeam, playerId],
          };
        }
      });
    },
    [maxPlayers]
  );

  /**
   * Set selected players directly
   */
  const setSelection = useCallback(
    (selection: { home: number[]; away: number[] }) => {
      setSelectedPlayers(selection);
    },
    []
  );

  /**
   * Clear selection
   */
  const clearSelection = useCallback(() => {
    setSelectedPlayers({ home: [], away: [] });
  }, []);

  /**
   * Validate selection (both teams have correct number of players)
   */
  const isSelectionValid = useCallback(() => {
    return (
      selectedPlayers.home.length === maxPlayers &&
      selectedPlayers.away.length === maxPlayers
    );
  }, [selectedPlayers, maxPlayers]);

  /**
   * Get validation message
   */
  const getValidationMessage = useCallback(() => {
    if (selectedPlayers.home.length !== maxPlayers) {
      return `Equipo local: ${selectedPlayers.home.length}/${maxPlayers} jugadores`;
    }
    if (selectedPlayers.away.length !== maxPlayers) {
      return `Equipo visitante: ${selectedPlayers.away.length}/${maxPlayers} jugadores`;
    }
    return null;
  }, [selectedPlayers, maxPlayers]);

  return {
    selectedPlayers,
    togglePlayerSelection,
    setSelection,
    clearSelection,
    isSelectionValid,
    getValidationMessage,
  };
};

export default useLineupSelection;

/**
 * usePlayerMinutes Hook
 * Tracks player minutes on court with precise millisecond accuracy
 */

import { useCallback } from 'react';
import { useGameStore } from '../store/gameStore';
import type { Player } from '../types';

export const usePlayerMinutes = () => {
  const { 
    playerMinutes, 
    playersOnCourt,
    updatePlayerMinutes,
    setPlayersOnCourt,
  } = useGameStore();
  
  /**
   * Update minutes for players currently on court
   * Called by timer hook with elapsed milliseconds
   */
  const updateOnCourtPlayerMinutes = useCallback((
    elapsed: number,
    homeTeam: { players: Player[] },
    awayTeam: { players: Player[] }
  ) => {
    const onCourtPlayers = [
      ...homeTeam.players.filter(p => p.isOnCourt),
      ...awayTeam.players.filter(p => p.isOnCourt),
    ];
    
    const updatedMinutes = { ...playerMinutes };
    
    onCourtPlayers.forEach(player => {
      const currentMinutes = updatedMinutes[player.id] || 0;
      updatedMinutes[player.id] = currentMinutes + elapsed;
    });
    
    updatePlayerMinutes(updatedMinutes);
  }, [playerMinutes, updatePlayerMinutes]);
  
  /**
   * Initialize minutes for all players to 0
   */
  const initializePlayerMinutes = useCallback((
    homeTeam: { players: Player[] },
    awayTeam: { players: Player[] }
  ) => {
    const minutes: Record<number, number> = {};
    
    [...homeTeam.players, ...awayTeam.players].forEach(player => {
      minutes[player.id] = 0;
    });
    
    updatePlayerMinutes(minutes);
    console.log('✅ Player minutes initialized');
  }, [updatePlayerMinutes]);
  
  /**
   * Reset all player minutes to 0
   * Should only be called for new games (estado === 'scheduled')
   */
  const resetPlayerMinutes = useCallback(() => {
    updatePlayerMinutes({});
    console.log('🔄 Player minutes reset');
  }, [updatePlayerMinutes]);
  
  /**
   * Get formatted minutes for a player (MM:SS)
   */
  const getPlayerMinutesFormatted = useCallback((playerId: number): string => {
    const ms = playerMinutes[playerId] || 0;
    const totalSeconds = Math.floor(ms / 1000);
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  }, [playerMinutes]);
  
  /**
   * Update players on court status
   */
  const updatePlayersOnCourt = useCallback((
    homeTeam: { players: Player[] },
    awayTeam: { players: Player[] }
  ) => {
    const homePlayers = homeTeam.players
      .filter(p => p.isOnCourt)
      .map(p => p.id);
    
    const awayPlayers = awayTeam.players
      .filter(p => p.isOnCourt)
      .map(p => p.id);
    
    setPlayersOnCourt(homePlayers, awayPlayers);
  }, [setPlayersOnCourt]);
  
  return {
    playerMinutes,
    playersOnCourt,
    updateOnCourtPlayerMinutes,
    initializePlayerMinutes,
    resetPlayerMinutes,
    getPlayerMinutesFormatted,
    updatePlayersOnCourt,
  };
};

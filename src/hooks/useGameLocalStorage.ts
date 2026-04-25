/**
 * useGameLocalStorage Hook
 * Centralized localStorage management for game state
 */

import { useEffect, useCallback } from 'react';

interface GameLocalStorageData {
  gameTime?: number;
  clockRunning?: boolean;
  playerMinutes?: Record<number, number>;
  playerPlusMinus?: Record<number, number>;
  activePlayers?: { home: number[]; away: number[] };
}

export const useGameLocalStorage = (gameId: number | string) => {
  const getKey = useCallback((key: string) => {
    return `game-${gameId}-${key}`;
  }, [gameId]);
  
  /**
   * Save game time
   */
  const saveGameTime = useCallback((time: number) => {
    localStorage.setItem(getKey('gameTime'), time.toString());
  }, [getKey]);
  
  /**
   * Load game time
   */
  const loadGameTime = useCallback((): number | null => {
    const saved = localStorage.getItem(getKey('gameTime'));
    return saved ? parseInt(saved, 10) : null;
  }, [getKey]);
  
  /**
   * Save clock running state
   */
  const saveClockRunning = useCallback((isRunning: boolean) => {
    localStorage.setItem(getKey('clockRunning'), isRunning.toString());
  }, [getKey]);
  
  /**
   * Load clock running state
   */
  const loadClockRunning = useCallback((): boolean => {
    const saved = localStorage.getItem(getKey('clockRunning'));
    return saved === 'true';
  }, [getKey]);
  
  /**
   * Save player minutes
   */
  const savePlayerMinutes = useCallback((minutes: Record<number, number>) => {
    localStorage.setItem(getKey('playerMinutes'), JSON.stringify(minutes));
  }, [getKey]);
  
  /**
   * Load player minutes
   */
  const loadPlayerMinutes = useCallback((): Record<number, number> | null => {
    const saved = localStorage.getItem(getKey('playerMinutes'));
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        console.error('Error parsing player minutes from localStorage:', e);
        return null;
      }
    }
    return null;
  }, [getKey]);
  
  /**
   * Save player plus-minus
   */
  const savePlayerPlusMinus = useCallback((plusMinus: Record<number, number>) => {
    localStorage.setItem(getKey('plusMinus'), JSON.stringify(plusMinus));
  }, [getKey]);
  
  /**
   * Load player plus-minus
   */
  const loadPlayerPlusMinus = useCallback((): Record<number, number> | null => {
    const saved = localStorage.getItem(getKey('plusMinus'));
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        console.error('Error parsing plus-minus from localStorage:', e);
        return null;
      }
    }
    return null;
  }, [getKey]);
  
  /**
   * Save active players
   */
  const saveActivePlayers = useCallback((players: { home: number[]; away: number[] }) => {
    localStorage.setItem(getKey('activePlayers'), JSON.stringify(players));
  }, [getKey]);
  
  /**
   * Load active players
   */
  const loadActivePlayers = useCallback((): { home: number[]; away: number[] } | null => {
    const saved = localStorage.getItem(getKey('activePlayers'));
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        console.error('Error parsing active players from localStorage:', e);
        return null;
      }
    }
    return null;
  }, [getKey]);
  
  /**
   * Clear all game data from localStorage
   */
  const clearGameStorage = useCallback(() => {
    const keys = [
      'gameTime',
      'clockRunning',
      'playerMinutes',
      'plusMinus',
      'activePlayers',
    ];
    
    keys.forEach(key => {
      localStorage.removeItem(getKey(key));
    });
    
    console.log(`🗑️ Cleared localStorage for game ${gameId}`);
  }, [getKey, gameId]);
  
  /**
   * Load all game data
   */
  const loadAllGameData = useCallback((): GameLocalStorageData => {
    return {
      gameTime: loadGameTime() ?? undefined,
      clockRunning: loadClockRunning(),
      playerMinutes: loadPlayerMinutes() ?? undefined,
      playerPlusMinus: loadPlayerPlusMinus() ?? undefined,
      activePlayers: loadActivePlayers() ?? undefined,
    };
  }, [loadGameTime, loadClockRunning, loadPlayerMinutes, loadPlayerPlusMinus, loadActivePlayers]);
  
  return {
    saveGameTime,
    loadGameTime,
    saveClockRunning,
    loadClockRunning,
    savePlayerMinutes,
    loadPlayerMinutes,
    savePlayerPlusMinus,
    loadPlayerPlusMinus,
    saveActivePlayers,
    loadActivePlayers,
    clearGameStorage,
    loadAllGameData,
  };
};

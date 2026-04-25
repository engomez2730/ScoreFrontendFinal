/**
 * useGameTimer Hook
 * Manages game timer logic with event-based player minutes tracking
 */

import { useRef, useEffect, useCallback } from 'react';
import { useGameStore } from '../store/gameStore';

interface UseGameTimerOptions {
  gameId: number;
  quarterLength?: number; // in seconds
  onQuarterEnd?: () => void;
  onTimerTick?: (elapsed: number) => void;
}

export const useGameTimer = ({
  gameId,
  quarterLength = 600, // 10 minutes default
  onQuarterEnd,
  onTimerTick,
}: UseGameTimerOptions) => {
  const { 
    gameTime, 
    isClockRunning, 
    setGameTime, 
    setIsClockRunning 
  } = useGameStore();
  
  const timerIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const lastUpdateRef = useRef<number>(Date.now());
  const isClockRunningRef = useRef<boolean>(isClockRunning);
  
  // Sync isClockRunning state with ref to avoid closure issues
  useEffect(() => {
    isClockRunningRef.current = isClockRunning;
  }, [isClockRunning]);
  
  // Start timer
  const startTimer = useCallback(() => {
    if (timerIntervalRef.current) {
      console.log('⏱️ Timer already running');
      return;
    }
    
    // Reset last update timestamp
    lastUpdateRef.current = Date.now();
    setIsClockRunning(true);
    
    console.log('⏱️ Starting timer');
    
    const interval = setInterval(() => {
      setGameTime((prev: number) => {
        const newTime = prev - 1;
        
        if (newTime >= 0) {
          // Calculate elapsed time for player minutes
          if (isClockRunningRef.current) {
            const now = Date.now();
            const elapsed = now - lastUpdateRef.current;
            lastUpdateRef.current = now;
            
            // Notify parent about time elapsed
            onTimerTick?.(elapsed);
          }
          
          return newTime;
        }
        
        // Timer reached 0:00 - quarter end
        console.log('🏁 Quarter ended');
        clearInterval(interval);
        timerIntervalRef.current = null;
        setIsClockRunning(false);
        onQuarterEnd?.();
        
        return 0;
      });
    }, 1000);
    
    timerIntervalRef.current = interval;
  }, [setGameTime, setIsClockRunning, onTimerTick, onQuarterEnd]);
  
  // Stop timer
  const stopTimer = useCallback(() => {
    console.log('⏹️ Stopping timer');
    
    if (timerIntervalRef.current) {
      clearInterval(timerIntervalRef.current);
      timerIntervalRef.current = null;
    }
    
    setIsClockRunning(false);
  }, [setIsClockRunning]);
  
  // Reset timer
  const resetTimer = useCallback((time?: number) => {
    console.log('🔄 Resetting timer');
    stopTimer();
    setGameTime(time ?? quarterLength);
  }, [stopTimer, setGameTime, quarterLength]);
  
  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (timerIntervalRef.current) {
        clearInterval(timerIntervalRef.current);
      }
    };
  }, []);
  
  return {
    gameTime,
    isClockRunning,
    startTimer,
    stopTimer,
    resetTimer,
  };
};

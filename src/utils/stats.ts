/**
 * Statistics calculation utilities
 */

import type { PlayerGameStats } from '../types';

/**
 * Calculate field goal percentage
 * @param made Field goals made
 * @param attempted Field goals attempted
 * @returns Percentage (0-100)
 */
export const calculateFGPercentage = (made: number, attempted: number): number => {
  if (attempted === 0) return 0;
  return Math.round((made / attempted) * 100);
};

/**
 * Calculate 3-point percentage
 */
export const calculate3PPercentage = (made: number, attempted: number): number => {
  return calculateFGPercentage(made, attempted);
};

/**
 * Calculate free throw percentage
 */
export const calculateFTPercentage = (made: number, attempted: number): number => {
  return calculateFGPercentage(made, attempted);
};

/**
 * Calculate effective field goal percentage (eFG%)
 * Accounts for 3-pointers being worth more
 */
export const calculateEffectiveFGPercentage = (
  fg2Made: number,
  fg3Made: number,
  fgAttempted: number
): number => {
  if (fgAttempted === 0) return 0;
  return Math.round(((fg2Made + 1.5 * fg3Made) / fgAttempted) * 100);
};

/**
 * Calculate true shooting percentage (TS%)
 * Most comprehensive shooting metric
 */
export const calculateTrueShootingPercentage = (
  points: number,
  fgAttempted: number,
  ftAttempted: number
): number => {
  const tsa = fgAttempted + 0.44 * ftAttempted;
  if (tsa === 0) return 0;
  return Math.round((points / (2 * tsa)) * 100);
};

/**
 * Calculate FIBA efficiency (EFC)
 * (PTS + REB + AST + STL + BLK) - (FGA - FGM) - (FTA - FTM) - TO
 * Field goal attempts already include 3-pointers.
 */
export const calculateEfficiency = (stats: PlayerGameStats): number =>
  stats.puntos +
  stats.rebotes +
  stats.asistencias +
  stats.robos +
  stats.tapones -
  (stats.tirosIntentados - stats.tirosAnotados) -
  (stats.tirosLibresIntentados - stats.tirosLibresAnotados) -
  stats.perdidas;

/**
 * Get player stats summary
 */
export const getStatsSummary = (stats: PlayerGameStats) => {
  const fgPercentage = calculateFGPercentage(
    stats.tirosAnotados,
    stats.tirosIntentados
  );
  
  const fg3Percentage = calculate3PPercentage(
    stats.tiros3Anotados,
    stats.tiros3Intentados
  );
  
  const ftPercentage = calculateFTPercentage(
    stats.tirosLibresAnotados,
    stats.tirosLibresIntentados
  );
  
  return {
    points: stats.puntos,
    rebounds: stats.rebotes,
    assists: stats.asistencias,
    steals: stats.robos,
    blocks: stats.tapones,
    turnovers: stats.perdidas,
    fouls: stats.faltasPersonales,
    fgPercentage,
    fg3Percentage,
    ftPercentage,
    plusMinus: stats.plusMinus,
    efficiency: stats.eficiencia ?? calculateEfficiency(stats),
    minutes: Math.round(stats.minutos / 60000), // Convert ms to minutes
  };
};

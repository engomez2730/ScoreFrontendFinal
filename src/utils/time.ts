/**
 * Utility functions for time formatting and calculations
 */

/**
 * Format seconds into MM:SS format
 * @param seconds Total seconds
 * @returns Formatted time string (e.g., "09:45")
 */
export const formatTime = (seconds: number): string => {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
};

/**
 * Convert milliseconds to seconds
 * @param ms Milliseconds
 * @returns Seconds (rounded)
 */
export const msToSeconds = (ms: number): number => {
  return Math.floor(ms / 1000);
};

/**
 * Convert seconds to milliseconds
 * @param seconds Seconds
 * @returns Milliseconds
 */
export const secondsToMs = (seconds: number): number => {
  return seconds * 1000;
};

/**
 * Format milliseconds into MM:SS format
 * @param ms Milliseconds
 * @returns Formatted time string
 */
export const formatMs = (ms: number): string => {
  return formatTime(msToSeconds(ms));
};

/**
 * Parse time string (MM:SS) into seconds
 * @param timeString Time string in MM:SS format
 * @returns Total seconds
 */
export const parseTimeString = (timeString: string): number => {
  const [mins, secs] = timeString.split(':').map(Number);
  return mins * 60 + secs;
};

/**
 * Get quarter display name
 * @param quarter Quarter number (1-4, 5+ for OT)
 * @returns Display name (e.g., "Q1", "OT1")
 */
export const getQuarterDisplayName = (quarter: number): string => {
  if (quarter <= 4) {
    return `Q${quarter}`;
  }
  return `OT${quarter - 4}`;
};

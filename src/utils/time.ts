import { ParsedTime } from '../types';

/**
 * Parse time input strings into minutes
 * Supports formats:
 * - 90 (minutes)
 * - 1h, 2h (hours)
 * - 30m, 45m (minutes)
 * - 1h 30m, 2h 15m (hours + minutes)
 * - 01:30, 02:15 (HH:MM format)
 */
export function parseTimeInput(input: string): ParsedTime | null {
  if (!input || typeof input !== 'string') {
    return null;
  }

  const trimmed = input.trim().toLowerCase();
  
  // Try HH:MM format first
  const timeMatch = trimmed.match(/^(\d{1,2}):(\d{2})$/);
  if (timeMatch) {
    const hours = parseInt(timeMatch[1], 10);
    const minutes = parseInt(timeMatch[2], 10);
    if (hours >= 0 && minutes >= 0 && minutes < 60) {
      return {
        minutes: hours * 60 + minutes,
        originalInput: input
      };
    }
  }

  // Try hours and minutes format (e.g., "1h 30m", "2h", "45m")
  let totalMinutes = 0;
  const hourMatch = trimmed.match(/(\d+(?:\.\d+)?)h/);
  const minuteMatch = trimmed.match(/(\d+)m/);
  
  if (hourMatch) {
    const hours = parseFloat(hourMatch[1]);
    totalMinutes += Math.round(hours * 60);
  }
  
  if (minuteMatch) {
    totalMinutes += parseInt(minuteMatch[1], 10);
  }

  // If we found h or m patterns, return the result
  if (hourMatch || minuteMatch) {
    return {
      minutes: totalMinutes,
      originalInput: input
    };
  }

  // Try pure number (treated as minutes)
  const numberMatch = trimmed.match(/^(\d+)$/);
  if (numberMatch) {
    const minutes = parseInt(numberMatch[1], 10);
    if (minutes >= 0 && minutes <= 480) { // Reasonable limit: 8 hours max
      return {
        minutes,
        originalInput: input
      };
    }
  }

  return null;
}

/**
 * Round minutes to nearest 15-minute interval
 */
export function roundToNearestQuarterHour(minutes: number): number {
  return Math.round(minutes / 15) * 15;
}

/**
 * Validate time entry and apply business rules
 */
export function validateTimeEntry(minutes: number): { isValid: boolean; roundedMinutes: number; warning?: string } {
  if (minutes <= 0) {
    return { isValid: false, roundedMinutes: 0 };
  }

  if (minutes > 480) { // More than 8 hours
    return { 
      isValid: false, 
      roundedMinutes: 0,
      warning: 'Time entries cannot exceed 8 hours (480 minutes)'
    };
  }

  const rounded = roundToNearestQuarterHour(minutes);
  
  if (rounded !== minutes) {
    return {
      isValid: true,
      roundedMinutes: rounded,
      warning: `Time rounded to ${rounded} minutes (nearest 15 minutes)`
    };
  }

  return { isValid: true, roundedMinutes: rounded };
}

/**
 * Format minutes for display
 */
export function formatMinutes(minutes: number): string {
  if (minutes < 60) {
    return `${minutes}m`;
  }
  
  const hours = Math.floor(minutes / 60);
  const remainingMinutes = minutes % 60;
  
  if (remainingMinutes === 0) {
    return `${hours}h`;
  }
  
  return `${hours}h ${remainingMinutes}m`;
}

/**
 * Check if time entry requires confirmation (>= 4 hours)
 */
export function requiresConfirmation(minutes: number): boolean {
  return minutes >= 240; // 4 hours
}

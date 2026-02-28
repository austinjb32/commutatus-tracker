import { ParsedTime } from '../types';
import { TIME_LIMITS } from '../config/constants';

export function parseTimeInput(input: string): ParsedTime | null {
  if (!input || typeof input !== 'string') {
    return null;
  }

  const trimmed = input.trim().toLowerCase();
  
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

  if (hourMatch || minuteMatch) {
    return {
      minutes: totalMinutes,
      originalInput: input
    };
  }

  const numberMatch = trimmed.match(/^(\d+)$/);
  if (numberMatch) {
    const minutes = parseInt(numberMatch[1], 10);
    if (minutes >= 0 && minutes <= TIME_LIMITS.MAX_MINUTES_FOR_PURE_NUMBER) {
      return {
        minutes,
        originalInput: input
      };
    }
  }

  return null;
}

export function roundToNearestQuarterHour(minutes: number): number {
  return Math.round(minutes / TIME_LIMITS.QUARTER_HOUR_INTERVAL) * TIME_LIMITS.QUARTER_HOUR_INTERVAL;
}

export function validateTimeEntry(minutes: number): { isValid: boolean; roundedMinutes: number; warning?: string } {
  if (minutes <= 0) {
    return { isValid: false, roundedMinutes: 0 };
  }

  if (minutes > TIME_LIMITS.MAX_MINUTES_PER_ENTRY) {
    return { 
      isValid: false, 
      roundedMinutes: 0,
      warning: `Time entries cannot exceed ${TIME_LIMITS.MAX_MINUTES_PER_ENTRY} minutes (${Math.floor(TIME_LIMITS.MAX_MINUTES_PER_ENTRY / 60)} hours)`
    };
  }

  const rounded = roundToNearestQuarterHour(minutes);
  
  if (rounded !== minutes) {
    return {
      isValid: true,
      roundedMinutes: rounded,
      warning: `Time rounded to ${rounded} minutes (nearest ${TIME_LIMITS.QUARTER_HOUR_INTERVAL} minutes)`
    };
  }

  return { isValid: true, roundedMinutes: rounded };
}

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

export function requiresConfirmation(minutes: number): boolean {
  return minutes >= TIME_LIMITS.CONFIRMATION_THRESHOLD_MINUTES;
}

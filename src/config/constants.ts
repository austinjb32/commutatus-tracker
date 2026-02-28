export const API_BASE_URL = process.env.API_URL || 'https://api.commutatus.com';

export const CONFIG_KEYS = {
  API_URL: 'commutatusTracker.apiUrl',
  TASK_ID: 'commutatusTracker.taskId'
} as const;

export const STORAGE_KEYS = {
  CURRENT_TASK_ID: 'currentTaskId'
} as const;

export const TIME_LIMITS = {
  MAX_MINUTES_PER_ENTRY: 480,
  MAX_MINUTES_FOR_PURE_NUMBER: 480,
  QUARTER_HOUR_INTERVAL: 15,
  CONFIRMATION_THRESHOLD_MINUTES: 240
} as const;

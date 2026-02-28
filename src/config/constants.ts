/**
 * Extension configuration constants
 */

// Base URL for the Commutatus API
// Can be overridden by environment variable or VS Code settings
export const API_BASE_URL = process.env.API_URL || 'https://api.commutatus.com';

// Extension configuration keys
export const CONFIG_KEYS = {
  API_URL: 'commutatusTracker.apiUrl',
  TASK_ID: 'commutatusTracker.taskId'
} as const;

// Storage keys for extension state
export const STORAGE_KEYS = {
  CURRENT_TASK_ID: 'currentTaskId'
} as const;

// Time validation constants
export const TIME_LIMITS = {
  MAX_MINUTES_PER_ENTRY: 480, // 8 hours
  MAX_MINUTES_FOR_PURE_NUMBER: 480, // 8 hours for pure number input
  QUARTER_HOUR_INTERVAL: 15, // 15-minute rounding interval
  CONFIRMATION_THRESHOLD_MINUTES: 240 // 4 hours - requires confirmation
} as const;

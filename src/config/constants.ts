/**
 * Extension configuration constants
 */

// Base URL for the Commutatus API
// Can be overridden by environment variable or VS Code settings
export const API_BASE_URL = process.env.API_URL || 'http://localhost:3000';

// Extension configuration keys
export const CONFIG_KEYS = {
  API_URL: 'commutatusTracker.apiUrl',
  TASK_ID: 'commutatusTracker.taskId'
} as const;

// Storage keys for extension state
export const STORAGE_KEYS = {
  CURRENT_TASK_ID: 'currentTaskId'
} as const;

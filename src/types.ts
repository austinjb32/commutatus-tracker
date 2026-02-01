/**
 * Core types for the Commutatus Task Tracker extension
 * These define the data structures used throughout the extension
 */

export interface Task {
  id: string;
  title: string;
  description: string;
  logs: TaskLog[];
  time_logs: TimeLog[];
}

export interface TaskLog {
  id: string;
  message: string;
  created_at: string;
  user: string;
}

export interface TimeLog {
  date: string;
  minutes: number;
  note?: string;
}

export interface TimeLogPayload {
  minutes: number;
  note?: string;
}

export interface ApiClient {
  getTask(taskId: string): Promise<Task>;
  addTimeLog(taskId: string, payload: TimeLogPayload): Promise<void>;
}

export interface TaskResolver {
  getCurrentTaskId(): Promise<string | null>;
  setTaskId(taskId: string): Promise<void>;
}

export interface AuthManager {
  getApiToken(): Promise<string | null>;
  setApiToken(token: string): Promise<void>;
  clearApiToken(): Promise<void>;
}

/**
 * Time parsing result for manual time entry
 */
export interface ParsedTime {
  minutes: number;
  originalInput: string;
}

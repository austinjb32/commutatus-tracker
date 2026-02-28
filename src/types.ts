/**
 * Core types for the Commutatus Task Tracker extension
 * These define the data structures used throughout the extension
 */

export interface Task {
  id: string;
  title: string;
  description: string;
  status?: string;
  priority?: string;
  due_date?: string;
  project_category_id?: number;
  project_category_name?: string;
  project_category?: string; // From index endpoint
  assignee_ids?: number[];
  assignee_names?: string;
  time_estimate?: string;
  created_at?: string;
  updated_at?: string;
  logs?: TaskLog[]; // From show endpoint
  comments?: TaskLog[]; // From index/create/update endpoints
  time_logs: TimeLog[];
}

export interface TaskLog {
  id: string;
  message: string;
  created_at: string;
  user: string;
}

export interface TimeLog {
  date: string; // Now in ISO8601 format
  minutes: number;
  note?: string;
}

export interface TimeLogPayload {
  time_log: {
    minutes: number;
    note?: string;
  };
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

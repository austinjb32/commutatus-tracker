import * as vscode from 'vscode';
import { ApiClient, Task, TimeLogPayload } from '../types';

/**
 * API client for Commutatus task tracking
 * Provides read-only access to task data and manual time entry
 */
export class CommutatusApiClient implements ApiClient {
  private baseUrl: string;
  private authToken: string | null = null;

  constructor(baseUrl: string) {
    this.baseUrl = baseUrl.replace(/\/$/, ''); // Remove trailing slash
  }

  /**
   * Set authentication token for API requests
   */
  setAuthToken(token: string): void {
    this.authToken = token;
  }

  /**
   * Fetch task details by ID
   * GET /api/tasks/{TASK_ID}
   */
  async getTask(taskId: string): Promise<Task> {
    if (!this.authToken) {
      throw new Error('API token not set. Please configure your API token first.');
    }

    const url = `${this.baseUrl}/api/tasks/${encodeURIComponent(taskId)}`;
    
    try {
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${this.authToken}`,
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        }
      });

      if (!response.ok) {
        if (response.status === 401) {
          throw new Error('Invalid API token. Please check your authentication token.');
        } else if (response.status === 404) {
          throw new Error(`Task ${taskId} not found.`);
        } else {
          throw new Error(`API request failed: ${response.status} ${response.statusText}`);
        }
      }

      const task = await response.json();
      return this.validateTaskResponse(task);
    } catch (error) {
      if (error instanceof Error) {
        throw error;
      }
      throw new Error(`Failed to fetch task: ${error}`);
    }
  }

  /**
   * Add time log to a task
   * POST /api/tasks/{TASK_ID}/time_logs
   */
  async addTimeLog(taskId: string, payload: TimeLogPayload): Promise<void> {
    if (!this.authToken) {
      throw new Error('API token not set. Please configure your API token first.');
    }

    const url = `${this.baseUrl}/api/tasks/${encodeURIComponent(taskId)}/time_logs`;
    
    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.authToken}`,
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        body: JSON.stringify(payload)
      });

      if (!response.ok) {
        if (response.status === 401) {
          throw new Error('Invalid API token. Please check your authentication token.');
        } else if (response.status === 404) {
          throw new Error(`Task ${taskId} not found.`);
        } else if (response.status === 400) {
          const errorData = await response.json().catch(() => ({})) as any;
          throw new Error(`Invalid time log data: ${errorData.message || 'Unknown error'}`);
        } else {
          throw new Error(`API request failed: ${response.status} ${response.statusText}`);
        }
      }
    } catch (error) {
      if (error instanceof Error) {
        throw error;
      }
      throw new Error(`Failed to add time log: ${error}`);
    }
  }

  /**
   * Validate API response matches expected Task interface
   */
  private validateTaskResponse(task: any): Task {
    if (!task || typeof task !== 'object') {
      throw new Error('Invalid task response: not an object');
    }

    if (!task.id || typeof task.id !== 'string') {
      throw new Error('Invalid task response: missing or invalid id');
    }

    if (!task.title || typeof task.title !== 'string') {
      throw new Error('Invalid task response: missing or invalid title');
    }

    if (task.description && typeof task.description !== 'string') {
      throw new Error('Invalid task response: invalid description');
    }

    // Validate arrays
    if (!Array.isArray(task.logs)) {
      task.logs = [];
    }

    if (!Array.isArray(task.time_logs)) {
      task.time_logs = [];
    }

    return {
      id: task.id,
      title: task.title,
      description: task.description || '',
      logs: task.logs || [],
      time_logs: task.time_logs || []
    };
  }

  /**
   * Test API connection with current token
   */
  async testConnection(): Promise<boolean> {
    if (!this.authToken) {
      return false;
    }

    try {
      // Try to fetch a simple task or use a health check endpoint
      const response = await fetch(`${this.baseUrl}/api/health`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${this.authToken}`,
          'Content-Type': 'application/json'
        }
      });

      return response.ok;
    } catch {
      return false;
    }
  }
}

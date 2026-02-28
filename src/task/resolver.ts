import * as vscode from 'vscode';
import { exec } from 'child_process';
import { promisify } from 'util';
import { TaskResolver } from '../types';
import { STORAGE_KEYS } from '../config/constants';

const execAsync = promisify(exec);

/**
 * Task ID resolver that extracts task IDs from git branch names
 * Follows the pattern: [A-Z]+-\d+ (e.g., TRIP-142, BUG-123)
 */
export class GitBranchTaskResolver implements TaskResolver {
  private static readonly TASK_ID_REGEX = /[A-Z]+-\d+/;

  constructor(private context?: vscode.ExtensionContext) {}

  /**
   * Get current task ID from git branch or session storage
   * Priority: git branch > session storage
   */
  async getCurrentTaskId(): Promise<string | null> {
    try {
      // First try to get from current git branch
      const branchTaskId = await this.getTaskIdFromGitBranch();
      if (branchTaskId) {
        // Cache it in session storage
        await this.setTaskId(branchTaskId);
        return branchTaskId;
      }

      // Fall back to session storage
      return await this.getSessionTaskId();
    } catch (error) {
      console.error('Error getting current task ID:', error);
      return await this.getSessionTaskId();
    }
  }

  /**
   * Set task ID in workspace session storage
   */
  async setTaskId(taskId: string): Promise<void> {
    if (this.context) {
      await this.context.workspaceState.update(STORAGE_KEYS.CURRENT_TASK_ID, taskId);
    }
  }

  /**
   * Extract task ID from current git branch name
   * Examples that work:
   * - TRIP-142
   * - feature/TRIP-142
   * - bugfix/TRIP-142-query
   */
  private async getTaskIdFromGitBranch(): Promise<string | null> {
    try {
      // Get current git branch
      const { stdout } = await execAsync('git rev-parse --abbrev-ref HEAD', {
        cwd: vscode.workspace.workspaceFolders?.[0]?.uri.fsPath
      });

      const branchName = stdout.trim();
      if (!branchName || branchName === 'HEAD') {
        return null;
      }

      // Extract task ID using regex
      const match = branchName.match(GitBranchTaskResolver.TASK_ID_REGEX);
      return match ? match[0] : null;
    } catch (error) {
      // Not in a git repository or git command failed
      return null;
    }
  }

  /**
   * Get task ID from workspace session storage
   */
  private async getSessionTaskId(): Promise<string | null> {
    if (this.context) {
      return this.context.workspaceState.get<string>(STORAGE_KEYS.CURRENT_TASK_ID) || null;
    }
    return null;
  }

  /**
   * Validate task ID format
   */
  static isValidTaskId(taskId: string): boolean {
    return GitBranchTaskResolver.TASK_ID_REGEX.test(taskId);
  }

  /**
   * Prompt user to enter task ID manually
   * Used when no task ID can be extracted from git branch
   */
  async promptForTaskId(): Promise<string | null> {
    const taskId = await vscode.window.showInputBox({
      prompt: 'Enter task ID (e.g., TRIP-142)',
      placeHolder: 'TRIP-142',
      validateInput: (value) => {
        if (!value) {
          return 'Task ID is required';
        }
        if (!GitBranchTaskResolver.isValidTaskId(value)) {
          return 'Invalid format. Expected format: [A-Z]+-[0-9]+ (e.g., TRIP-142)';
        }
        return null;
      }
    });

    if (taskId) {
      await this.setTaskId(taskId);
      return taskId;
    }

    return null;
  }
}

import * as vscode from 'vscode';
import { exec } from 'child_process';
import { promisify } from 'util';
import { TaskResolver } from '../types';

const execAsync = promisify(exec);

/**
 * Task ID resolver that extracts task IDs from git branch names
 * Follows the pattern: [A-Z]+-\d+ (e.g., TRIP-142, BUG-123)
 */
export class GitBranchTaskResolver implements TaskResolver {
  private static readonly TASK_ID_REGEX = /[A-Z]+-\d+/;
  private static readonly WORKSPACE_TASK_ID_KEY = 'commutatus-tracker.taskId';

  /**
   * Get current task ID from git branch or cached workspace value
   * Priority: git branch > cached workspace value
   */
  async getCurrentTaskId(): Promise<string | null> {
    try {
      // First try to get from current git branch
      const branchTaskId = await this.getTaskIdFromGitBranch();
      if (branchTaskId) {
        // Cache it for this workspace
        await this.setTaskId(branchTaskId);
        return branchTaskId;
      }

      // Fall back to cached workspace value
      return await this.getCachedTaskId();
    } catch (error) {
      console.error('Error getting current task ID:', error);
      return await this.getCachedTaskId();
    }
  }

  /**
   * Set task ID for current workspace
   */
  async setTaskId(taskId: string): Promise<void> {
    await vscode.workspace.getConfiguration().update(
      GitBranchTaskResolver.WORKSPACE_TASK_ID_KEY,
      taskId,
      vscode.ConfigurationTarget.Workspace
    );
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
   * Get cached task ID from workspace settings
   */
  private async getCachedTaskId(): Promise<string | null> {
    const config = vscode.workspace.getConfiguration();
    return config.get<string>(GitBranchTaskResolver.WORKSPACE_TASK_ID_KEY) || null;
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

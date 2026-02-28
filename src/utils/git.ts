import * as vscode from 'vscode';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

/**
 * Centralized git operations utility
 * Provides consistent git command execution and error handling
 */
export class GitOperations {
  /**
   * Get the workspace folder path
   */
  private static getWorkspaceFolder(): string | null {
    return vscode.workspace.workspaceFolders?.[0]?.uri.fsPath || null;
  }

  /**
   * Execute a git command in the workspace directory
   */
  private static async execGitCommand(command: string): Promise<{ stdout: string; stderr: string }> {
    const workspaceFolder = this.getWorkspaceFolder();
    if (!workspaceFolder) {
      throw new Error('No workspace folder found');
    }

    try {
      return await execAsync(command, { cwd: workspaceFolder });
    } catch (error) {
      throw new Error(`Git command failed: ${command} - ${error}`);
    }
  }

  /**
   * Get the last commit message
   */
  static async getLastCommitMessage(): Promise<string | null> {
    try {
      const { stdout } = await this.execGitCommand('git log -1 --pretty=format:%s');
      return stdout.trim() || null;
    } catch (error) {
      console.warn('Failed to get last commit message:', error);
      return null;
    }
  }

  /**
   * Get current git branch name
   */
  static async getCurrentBranch(): Promise<string | null> {
    try {
      const { stdout } = await this.execGitCommand('git rev-parse --abbrev-ref HEAD');
      const branch = stdout.trim();
      return branch === 'HEAD' ? null : branch; // HEAD means detached state
    } catch (error) {
      console.warn('Failed to get current branch:', error);
      return null;
    }
  }

  /**
   * Check if we're in a git repository
   */
  static async isInGitRepository(): Promise<boolean> {
    try {
      await this.execGitCommand('git rev-parse --git-dir');
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Check if there are any commits in the repository
   */
  static async hasCommits(): Promise<boolean> {
    try {
      await this.execGitCommand('git rev-parse --verify HEAD');
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Get git directory path
   */
  static async getGitDir(): Promise<string | null> {
    try {
      const { stdout } = await this.execGitCommand('git rev-parse --git-dir');
      return stdout.trim() || null;
    } catch (error) {
      console.warn('Failed to get git directory:', error);
      return null;
    }
  }
}

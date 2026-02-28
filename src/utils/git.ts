import * as vscode from 'vscode';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

export class GitOperations {
  private static getWorkspaceFolder(): string | null {
    return vscode.workspace.workspaceFolders?.[0]?.uri.fsPath || null;
  }

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

  static async getLastCommitMessage(): Promise<string | null> {
    try {
      const { stdout } = await this.execGitCommand('git log -1 --pretty=format:%s');
      return stdout.trim() || null;
    } catch (error) {
      console.warn('Failed to get last commit message:', error);
      return null;
    }
  }

  static async getCurrentBranch(): Promise<string | null> {
    try {
      const { stdout } = await this.execGitCommand('git rev-parse --abbrev-ref HEAD');
      const branch = stdout.trim();
      return branch === 'HEAD' ? null : branch;
    } catch (error) {
      console.warn('Failed to get current branch:', error);
      return null;
    }
  }

  static async isInGitRepository(): Promise<boolean> {
    try {
      await this.execGitCommand('git rev-parse --git-dir');
      return true;
    } catch {
      return false;
    }
  }

  static async hasCommits(): Promise<boolean> {
    try {
      await this.execGitCommand('git rev-parse --verify HEAD');
      return true;
    } catch {
      return false;
    }
  }

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

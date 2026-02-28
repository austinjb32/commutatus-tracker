import * as vscode from 'vscode';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

/**
 * Git integration for triggering time logging on commit
 */
export class GitHookManager {
  private static readonly POST_COMMIT_HOOK_NAME = 'post-commit';
  private static readonly PRE_COMMIT_HOOK_NAME = 'pre-commit';

  /**
   * Set up git hooks to trigger time logging
   */
  static async setupHooks(context: vscode.ExtensionContext): Promise<void> {
    const workspaceFolder = vscode.workspace.workspaceFolders?.[0]?.uri.fsPath;
    if (!workspaceFolder) {
      console.log('No workspace folder found, skipping git hook setup');
      return;
    }

    try {
      // Check if we're in a git repository
      await execAsync('git rev-parse --git-dir', { cwd: workspaceFolder });
      
      // Set up post-commit hook to trigger time logging
      await this.setupPostCommitHook(workspaceFolder, context);
      
      console.log('Git hooks set up successfully');
    } catch (error) {
      console.log('Not in a git repository or git command failed:', error);
    }
  }

  /**
   * Set up post-commit hook to trigger time logging after commit
   */
  private static async setupPostCommitHook(workspaceFolder: string, context: vscode.ExtensionContext): Promise<void> {
    try {
      const gitDir = (await execAsync('git rev-parse --git-dir', { cwd: workspaceFolder })).stdout.trim();
      const hooksDir = `${gitDir}/hooks`;
      const postCommitPath = `${hooksDir}/${this.POST_COMMIT_HOOK_NAME}`;

      // Create hooks directory if it doesn't exist
      await execAsync(`mkdir -p ${hooksDir}`);

      // Check if hook already exists
      try {
        await execAsync(`test -f ${postCommitPath}`);
        // Hook exists, check if it already includes our command
        const existingHook = (await execAsync(`cat ${postCommitPath}`)).stdout;
        if (existingHook.includes('commutatus-tracker.logCommitTime')) {
          console.log('Post-commit hook already set up');
          return;
        }
      } catch {
        // Hook doesn't exist, we'll create it
      }

      // Create the post-commit hook
      const hookScript = `#!/bin/sh
# Commutatus Task Tracker - Trigger time logging after commit
code --command commutatus-tracker.logCommitTime
`;

      // Write the hook
      await execAsync(`echo '${hookScript}' > ${postCommitPath}`);
      await execAsync(`chmod +x ${postCommitPath}`);

      console.log('Post-commit hook created');
    } catch (error) {
      console.error('Failed to set up post-commit hook:', error);
    }
  }

  /**
   * Remove git hooks
   */
  static async removeHooks(): Promise<void> {
    const workspaceFolder = vscode.workspace.workspaceFolders?.[0]?.uri.fsPath;
    if (!workspaceFolder) {
      return;
    }

    try {
      const gitDir = (await execAsync('git rev-parse --git-dir', { cwd: workspaceFolder })).stdout.trim();
      const hooksDir = `${gitDir}/hooks`;
      const postCommitPath = `${hooksDir}/${this.POST_COMMIT_HOOK_NAME}`;

      // Remove the hook if it exists and contains our command
      try {
        const existingHook = (await execAsync(`cat ${postCommitPath}`)).stdout;
        if (existingHook.includes('commutatus-tracker.logCommitTime')) {
          await execAsync(`rm ${postCommitPath}`);
          console.log('Post-commit hook removed');
        }
      } catch {
        // Hook doesn't exist or can't be read
      }
    } catch (error) {
      console.error('Failed to remove git hooks:', error);
    }
  }

  /**
   * Get the most recent commit message
   */
  static async getLastCommitMessage(): Promise<string | null> {
    const workspaceFolder = vscode.workspace.workspaceFolders?.[0]?.uri.fsPath;
    if (!workspaceFolder) {
      return null;
    }

    try {
      const { stdout } = await execAsync('git log -1 --pretty=format:%s', {
        cwd: workspaceFolder
      });
      return stdout.trim() || null;
    } catch (error) {
      return null;
    }
  }

  /**
   * Check if there are any commits in the repository
   */
  static async hasCommits(): Promise<boolean> {
    const workspaceFolder = vscode.workspace.workspaceFolders?.[0]?.uri.fsPath;
    if (!workspaceFolder) {
      return false;
    }

    try {
      await execAsync('git rev-parse --verify HEAD', { cwd: workspaceFolder });
      return true;
    } catch {
      return false;
    }
  }
}

import * as vscode from 'vscode';
import * as fs from 'fs/promises';
import * as path from 'path';
import { GitOperations } from '../utils/git';

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
    try {
      // Check if we're in a git repository
      const isInGitRepo = await GitOperations.isInGitRepository();
      if (!isInGitRepo) {
        console.log('Not in a git repository, skipping git hook setup');
        return;
      }
      
      // Set up post-commit hook to trigger time logging
      await this.setupPostCommitHook(context);
      
      console.log('Git hooks set up successfully');
    } catch (error) {
      console.log('Git hook setup failed:', error);
    }
  }

  /**
   * Set up post-commit hook to trigger time logging after commit
   */
  private static async setupPostCommitHook(context: vscode.ExtensionContext): Promise<void> {
    try {
      const gitDir = await GitOperations.getGitDir();
      if (!gitDir) {
        throw new Error('Could not determine git directory');
      }

      const hooksDir = path.join(gitDir, 'hooks');
      const postCommitPath = path.join(hooksDir, this.POST_COMMIT_HOOK_NAME);

      // Create hooks directory if it doesn't exist
      await fs.mkdir(hooksDir, { recursive: true });

      // Check if hook already exists
      try {
        const existingHook = await fs.readFile(postCommitPath, 'utf8');
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

      // Write the hook securely using fs module
      await fs.writeFile(postCommitPath, hookScript, 'utf8');
      await fs.chmod(postCommitPath, 0o755);

      console.log('Post-commit hook created');
    } catch (error) {
      console.error('Failed to set up post-commit hook:', error);
    }
  }

  /**
   * Remove git hooks
   */
  static async removeHooks(): Promise<void> {
    try {
      const gitDir = await GitOperations.getGitDir();
      if (!gitDir) {
        return;
      }

      const hooksDir = path.join(gitDir, 'hooks');
      const postCommitPath = path.join(hooksDir, this.POST_COMMIT_HOOK_NAME);

      // Remove the hook if it exists and contains our command
      try {
        const existingHook = await fs.readFile(postCommitPath, 'utf8');
        if (existingHook.includes('commutatus-tracker.logCommitTime')) {
          await fs.unlink(postCommitPath);
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
    return await GitOperations.getLastCommitMessage();
  }

  /**
   * Check if there are any commits in the repository
   */
  static async hasCommits(): Promise<boolean> {
    return await GitOperations.hasCommits();
  }
}

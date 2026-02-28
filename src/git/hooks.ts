import * as vscode from 'vscode';
import * as fs from 'fs/promises';
import * as path from 'path';
import { GitOperations } from '../utils/git';

export class GitHookManager {
  private static readonly POST_COMMIT_HOOK_NAME = 'post-commit';
  private static readonly PRE_COMMIT_HOOK_NAME = 'pre-commit';

  static async setupHooks(context: vscode.ExtensionContext): Promise<void> {
    try {
      const isInGitRepo = await GitOperations.isInGitRepository();
      if (!isInGitRepo) {
        console.log('Not in a git repository, skipping git hook setup');
        return;
      }
      
      await this.setupPostCommitHook(context);
      
      console.log('Git hooks set up successfully');
    } catch (error) {
      console.log('Git hook setup failed:', error);
    }
  }

  private static async setupPostCommitHook(context: vscode.ExtensionContext): Promise<void> {
    try {
      const gitDir = await GitOperations.getGitDir();
      if (!gitDir) {
        throw new Error('Could not determine git directory');
      }

      const hooksDir = path.join(gitDir, 'hooks');
      const postCommitPath = path.join(hooksDir, this.POST_COMMIT_HOOK_NAME);

      await fs.mkdir(hooksDir, { recursive: true });

      try {
        const existingHook = await fs.readFile(postCommitPath, 'utf8');
        if (existingHook.includes('commutatus-tracker.logCommitTime')) {
          console.log('Post-commit hook already set up');
          return;
        }
      } catch {
      }

      const hookScript = `#!/bin/sh
# Commutatus Task Tracker - Trigger time logging after commit
code --command commutatus-tracker.logCommitTime
`;

      await fs.writeFile(postCommitPath, hookScript, 'utf8');
      await fs.chmod(postCommitPath, 0o755);

      console.log('Post-commit hook created');
    } catch (error) {
      console.error('Failed to set up post-commit hook:', error);
    }
  }

  static async removeHooks(): Promise<void> {
    try {
      const gitDir = await GitOperations.getGitDir();
      if (!gitDir) {
        return;
      }

      const hooksDir = path.join(gitDir, 'hooks');
      const postCommitPath = path.join(hooksDir, this.POST_COMMIT_HOOK_NAME);

      try {
        const existingHook = await fs.readFile(postCommitPath, 'utf8');
        if (existingHook.includes('commutatus-tracker.logCommitTime')) {
          await fs.unlink(postCommitPath);
          console.log('Post-commit hook removed');
        }
      } catch {
      }
    } catch (error) {
      console.error('Failed to remove git hooks:', error);
    }
  }

  static async getLastCommitMessage(): Promise<string | null> {
    return await GitOperations.getLastCommitMessage();
  }

  static async hasCommits(): Promise<boolean> {
    return await GitOperations.hasCommits();
  }
}

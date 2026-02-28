import * as vscode from 'vscode';
import { ApiClient, TaskResolver, AuthManager } from '../types';
import { parseTimeInput, validateTimeEntry, formatMinutes, requiresConfirmation } from '../utils/time';

/**
 * Command handler for adding time logs triggered by git commit
 * Provides quick time entry with commit message as default note
 */
export async function commitTimeLogCommand(
  context: vscode.ExtensionContext,
  apiClient: ApiClient,
  taskResolver: TaskResolver,
  authManager: AuthManager,
  commitMessage?: string
): Promise<void> {
  try {
    console.log(`commitTimeLogCommand called with message: ${commitMessage}`);
    
    // Get current task ID
    const taskId = await taskResolver.getCurrentTaskId();
    console.log(`Task ID: ${taskId}`);
    if (!taskId) {
      console.log('No task ID found, returning silently');
      // Don't show error for commit-triggered calls, just return silently
      return;
    }

    // Check if API token is available
    const token = await authManager.getApiToken();
    console.log(`API token available: ${!!token}`);
    if (!token) {
      console.log('No API token found, returning silently');
      // Don't show error for commit-triggered calls, just return silently
      return;
    }

    console.log('Proceeding with time logging dialog...');

    // Use commit message as default note if available
    const defaultNote = commitMessage && commitMessage.trim() ? commitMessage.trim() : '';
    
    const note = await vscode.window.showInputBox({
      prompt: 'What did you work on for this commit?',
      placeHolder: defaultNote || 'Brief description of your work',
      value: defaultNote
    });

    // If user cancelled, don't proceed
    if (note === undefined) {
      return;
    }

    // Prompt for time input
    const timeInput = await vscode.window.showInputBox({
      prompt: 'Enter time spent on this commit (e.g., 90, 1h, 1h 30m, 01:30)',
      placeHolder: '30m',
      validateInput: (value) => {
        if (!value || value.trim() === '') {
          return 'Time is required';
        }
        
        const parsed = parseTimeInput(value);
        if (!parsed) {
          return 'Invalid format. Use formats like: 90, 1h, 1h 30m, 01:30';
        }
        
        const validation = validateTimeEntry(parsed.minutes);
        if (!validation.isValid) {
          return validation.warning || 'Invalid time entry';
        }
        
        return null;
      }
    });

    if (!timeInput) {
      return; // User cancelled
    }

    // Parse and validate time
    const parsed = parseTimeInput(timeInput);
    if (!parsed) {
      vscode.window.showErrorMessage('Invalid time format');
      return;
    }

    const validation = validateTimeEntry(parsed.minutes);
    if (!validation.isValid) {
      vscode.window.showErrorMessage(validation.warning || 'Invalid time entry');
      return;
    }

    const roundedMinutes = validation.roundedMinutes;

    // Show warning if time was rounded
    if (validation.warning) {
      const continueAnyway = await vscode.window.showWarningMessage(
        validation.warning,
        'Continue Anyway',
        'Cancel'
      );
      if (continueAnyway !== 'Continue Anyway') {
        return;
      }
    }

    // Quick confirmation for commit entries (less verbose)
    const noteText = note && note.trim() ? ` for "${note.trim()}"` : '';
    const confirmMessage = `Log ${formatMinutes(roundedMinutes)}${noteText}?`;
    const confirmation = await vscode.window.showInformationMessage(
      confirmMessage,
      'Log Time',
      'Skip'
    );
    if (confirmation !== 'Log Time') {
      return;
    }

    // Prepare and send API request
    const timeLogPayload = {
      time_log: {
        minutes: roundedMinutes,
        note: note && note.trim() ? note.trim() : undefined
      }
    };

    // Show progress indicator
    await vscode.window.withProgress({
      location: vscode.ProgressLocation.Notification,
      title: 'Logging commit time...',
      cancellable: false
    }, async (progress) => {
      try {
        await apiClient.addTimeLog(taskId, timeLogPayload);
        
        // Success notification
        vscode.window.showInformationMessage(
          `✅ Logged ${formatMinutes(roundedMinutes)} for task ${taskId}`
        );

        // Refresh any open task views
        vscode.commands.executeCommand('commutatus-tracker.showTask');
        
      } catch (error) {
        console.error('Error adding time log:', error);
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        vscode.window.showErrorMessage(`Failed to log time: ${errorMessage}`);
      }
    });

  } catch (error) {
    console.error('Error in commitTimeLogCommand:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    vscode.window.showErrorMessage(`Failed to log time: ${errorMessage}`);
  }
}

/**
 * Extract commit message from git command or recent commit
 */
export async function getCommitMessage(): Promise<string | null> {
  try {
    const workspaceFolder = vscode.workspace.workspaceFolders?.[0]?.uri.fsPath;
    if (!workspaceFolder) {
      return null;
    }

    const { exec } = require('child_process');
    const { promisify } = require('util');
    const execAsync = promisify(exec);

    // Try to get the current commit message (if in the middle of a commit)
    // This is a fallback approach since we can't easily intercept git commit messages
    const { stdout } = await execAsync('git log -1 --pretty=format:%s', {
      cwd: workspaceFolder
    });

    return stdout.trim() || null;
  } catch (error) {
    return null;
  }
}

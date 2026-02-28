import * as vscode from 'vscode';
import { ApiClient, TaskResolver, AuthManager } from '../types';
import { parseTimeInput, validateTimeEntry, formatMinutes, requiresConfirmation } from '../utils/time';
import { ErrorHandler } from '../utils/errorHandler';
import { GitOperations } from '../utils/git';

export async function commitTimeLogCommand(
  context: vscode.ExtensionContext,
  apiClient: ApiClient,
  taskResolver: TaskResolver,
  authManager: AuthManager,
  commitMessage?: string
): Promise<void> {
  try {
    console.log(`commitTimeLogCommand called with message: ${commitMessage}`);
    
    const taskId = await taskResolver.getCurrentTaskId();
    console.log(`Task ID: ${taskId}`);
    if (!taskId) {
      console.log('No task ID found, returning silently');
      return;
    }

    const token = await authManager.getApiToken();
    console.log(`API token available: ${!!token}`);
    if (!token) {
      console.log('No API token found, returning silently');
      return;
    }

    console.log('Proceeding with time logging dialog...');

    const defaultNote = commitMessage && commitMessage.trim() ? commitMessage.trim() : '';
    
    const note = await vscode.window.showInputBox({
      prompt: 'What did you work on for this commit?',
      placeHolder: defaultNote || 'Brief description of your work',
      value: defaultNote
    });

    if (note === undefined) {
      return;
    }

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
      return;
    }

    const parsed = parseTimeInput(timeInput);
    if (!parsed) {
      ErrorHandler.handleCommandError(
        new Error('Invalid time format'),
        'log commit time'
      );
      return;
    }

    const validation = validateTimeEntry(parsed.minutes);
    if (!validation.isValid) {
      ErrorHandler.handleCommandError(
        new Error(validation.warning || 'Invalid time entry'),
        'log commit time'
      );
      return;
    }

    const roundedMinutes = validation.roundedMinutes;

    if (validation.warning) {
      const continueAnyway = await ErrorHandler.showWarning(
        validation.warning,
        'Continue Anyway',
        'Cancel'
      );
      if (continueAnyway !== 'Continue Anyway') {
        return;
      }
    }

    const noteText = note && note.trim() ? ` for "${note.trim()}"` : '';
    const confirmMessage = `Log ${formatMinutes(roundedMinutes)}${noteText}?`;
    const confirmation = await ErrorHandler.showInfo(
      confirmMessage,
      'Log Time',
      'Skip'
    );
    if (confirmation !== 'Log Time') {
      return;
    }

    const timeLogPayload = {
      time_log: {
        minutes: roundedMinutes,
        note: note && note.trim() ? note.trim() : undefined
      }
    };

    await vscode.window.withProgress({
      location: vscode.ProgressLocation.Notification,
      title: 'Logging commit time...',
      cancellable: false
    }, async (progress) => {
      try {
        await apiClient.addTimeLog(taskId, timeLogPayload);
        
        ErrorHandler.showSuccess(
          `✅ Logged ${formatMinutes(roundedMinutes)} for task ${taskId}`
        );

        vscode.commands.executeCommand('commutatus-tracker.showTask');
        
      } catch (error) {
        ErrorHandler.handleCommandError(error, 'log commit time');
      }
    });

  } catch (error) {
    ErrorHandler.handleCommandError(error, 'log commit time');
  }
}

export async function getCommitMessage(): Promise<string | null> {
  return await GitOperations.getLastCommitMessage();
}

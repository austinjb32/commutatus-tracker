import * as vscode from 'vscode';
import { ApiClient, TaskResolver, AuthManager } from '../types';
import { parseTimeInput, validateTimeEntry, formatMinutes, requiresConfirmation } from '../utils/time';
import { ErrorHandler } from '../utils/errorHandler';

/**
 * Command handler for adding time logs
 * Provides manual time entry with validation and confirmation
 */
export async function addTimeLogCommand(
  context: vscode.ExtensionContext,
  apiClient: ApiClient,
  taskResolver: TaskResolver,
  authManager: AuthManager
): Promise<void> {
  try {
    // Get current task ID
    const taskId = await taskResolver.getCurrentTaskId();
    if (!taskId) {
      ErrorHandler.handleCommandError(
        new Error('No active task found'),
        'add time log - please switch to a task branch or set a task ID manually'
      );
      return;
    }

    // Check if API token is available
    const token = await authManager.getApiToken();
    if (!token) {
      ErrorHandler.handleCommandError(
        new Error('API token not configured'),
        'add time log - please set your API token first'
      );
      return;
    }

    // Prompt for note first
    const note = await vscode.window.showInputBox({
      prompt: 'What did you work on?',
      placeHolder: 'Brief description of your work'
    });

    // Prompt for time input
    const timeInput = await vscode.window.showInputBox({
      prompt: 'Enter time (e.g., 90, 1h, 1h 30m, 01:30)',
      placeHolder: '1h 30m',
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
      ErrorHandler.handleCommandError(
        new Error('Invalid time format'),
        'add time log'
      );
      return;
    }

    const validation = validateTimeEntry(parsed.minutes);
    if (!validation.isValid) {
      ErrorHandler.handleCommandError(
        new Error(validation.warning || 'Invalid time entry'),
        'add time log'
      );
      return;
    }

    const roundedMinutes = validation.roundedMinutes;

    // Show warning if time was rounded
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

    // Confirm large time entries
    if (requiresConfirmation(roundedMinutes)) {
      const noteText = note && note.trim() ? ` for "${note.trim()}"` : '';
      const confirmMessage = `Add ${formatMinutes(roundedMinutes)} to task ${taskId}${noteText}? This is a large time entry.`;
      const confirmation = await ErrorHandler.showWarning(
        confirmMessage,
        'Yes, Add Time',
        'Cancel'
      );
      if (confirmation !== 'Yes, Add Time') {
        return;
      }
    } else {
      // Standard confirmation for normal entries
      const noteText = note && note.trim() ? ` for "${note.trim()}"` : '';
      const confirmMessage = `Add ${formatMinutes(roundedMinutes)} to task ${taskId}${noteText}?`;
      const confirmation = await ErrorHandler.showInfo(
        confirmMessage,
        'Add Time',
        'Cancel'
      );
      if (confirmation !== 'Add Time') {
        return;
      }
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
      title: 'Adding time log...',
      cancellable: false
    }, async (progress) => {
      try {
        await apiClient.addTimeLog(taskId, timeLogPayload);
        
        // Success notification
        const noteText = note && note.trim() ? ` for "${note.trim()}"` : '';
        ErrorHandler.showSuccess(
          `✅ Added ${formatMinutes(roundedMinutes)} to task ${taskId}${noteText}`
        );

        // Refresh any open task views
        vscode.commands.executeCommand('commutatus-tracker.showTask');
        
      } catch (error) {
        ErrorHandler.handleCommandError(error, 'add time log');
      }
    });

  } catch (error) {
    ErrorHandler.handleCommandError(error, 'add time log');
  }
}

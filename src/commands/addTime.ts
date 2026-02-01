import * as vscode from 'vscode';
import { ApiClient, TaskResolver, AuthManager } from '../types';
import { parseTimeInput, validateTimeEntry, formatMinutes, requiresConfirmation } from '../utils/time';

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
      vscode.window.showErrorMessage('No active task found. Please switch to a task branch or set a task ID manually.');
      return;
    }

    // Check if API token is available
    const token = await authManager.getApiToken();
    if (!token) {
      vscode.window.showErrorMessage('API token not configured. Please set your API token first.');
      return;
    }

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

    // Confirm large time entries
    if (requiresConfirmation(roundedMinutes)) {
      const confirmMessage = `Add ${formatMinutes(roundedMinutes)} to task ${taskId}? This is a large time entry.`;
      const confirmation = await vscode.window.showWarningMessage(
        confirmMessage,
        'Yes, Add Time',
        'Cancel'
      );
      if (confirmation !== 'Yes, Add Time') {
        return;
      }
    } else {
      // Standard confirmation for normal entries
      const confirmMessage = `Add ${formatMinutes(roundedMinutes)} to task ${taskId}?`;
      const confirmation = await vscode.window.showInformationMessage(
        confirmMessage,
        'Add Time',
        'Cancel'
      );
      if (confirmation !== 'Add Time') {
        return;
      }
    }

    // Prompt for optional note
    const note = await vscode.window.showInputBox({
      prompt: 'Optional note for time log',
      placeHolder: 'What did you work on?'
    });

    // Prepare and send API request
    const timeLogPayload = {
      minutes: roundedMinutes,
      note: note && note.trim() ? note.trim() : undefined
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
        vscode.window.showInformationMessage(
          `✅ Added ${formatMinutes(roundedMinutes)} to task ${taskId}`
        );

        // Refresh any open task views
        vscode.commands.executeCommand('commutatus-tracker.showTask');
        
      } catch (error) {
        console.error('Error adding time log:', error);
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        vscode.window.showErrorMessage(`Failed to add time log: ${errorMessage}`);
      }
    });

  } catch (error) {
    console.error('Error in addTimeLogCommand:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    vscode.window.showErrorMessage(`Failed to add time log: ${errorMessage}`);
  }
}

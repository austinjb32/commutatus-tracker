import * as vscode from 'vscode';
import { TaskResolver } from '../types';

/**
 * Command handler for setting task ID manually
 * Prompts user for task ID and validates format
 */
export async function setTaskIdCommand(taskResolver: TaskResolver): Promise<void> {
  try {
    // Get current task ID for context
    const currentTaskId = await taskResolver.getCurrentTaskId();
    
    const promptMessage = currentTaskId 
      ? `Current task: ${currentTaskId}. Enter new task ID:`
      : 'Enter task ID (e.g., TRIP-142):';

    // Prompt for task ID
    const taskId = await vscode.window.showInputBox({
      prompt: promptMessage,
      placeHolder: 'TRIP-142',
      value: currentTaskId || undefined,
      validateInput: (value) => {
        if (!value || value.trim() === '') {
          return 'Task ID is required';
        }
        
        // Validate format: [A-Z]+-[0-9]+
        const taskIdRegex = /^[A-Z]+-\d+$/;
        if (!taskIdRegex.test(value.trim())) {
          return 'Invalid format. Expected format: [A-Z]+-[0-9]+ (e.g., TRIP-142)';
        }
        
        return null;
      }
    });

    if (!taskId) {
      return; // User cancelled
    }

    // Set the task ID
    await taskResolver.setTaskId(taskId.trim());

    // Show success message
    vscode.window.showInformationMessage(
      `✅ Task ID set to ${taskId.trim()}`
    );

    // Refresh status bar
    vscode.commands.executeCommand('commutatus-tracker.showTask');

  } catch (error) {
    console.error('Error setting task ID:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    vscode.window.showErrorMessage(`Failed to set task ID: ${errorMessage}`);
  }
}

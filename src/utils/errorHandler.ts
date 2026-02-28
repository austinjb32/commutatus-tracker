import * as vscode from 'vscode';

/**
 * Centralized error handling for extension commands
 * Provides consistent error reporting and user feedback
 */
export class ErrorHandler {
  /**
   * Handle command errors with consistent user feedback
   */
  static handleCommandError(error: unknown, context: string, showToUser: boolean = true): void {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    
    // Always log to console for debugging
    console.error(`Error in ${context}:`, error);
    
    // Show user-friendly error message if requested
    if (showToUser) {
      const userMessage = this.formatUserMessage(errorMessage, context);
      vscode.window.showErrorMessage(userMessage);
    }
  }

  /**
   * Handle errors that should be silent (not shown to user)
   */
  static handleSilentError(error: unknown, context: string): void {
    console.error(`Silent error in ${context}:`, error);
  }

  /**
   * Format error message for user display
   */
  private static formatUserMessage(errorMessage: string, context: string): string {
    // Remove technical details and provide user-friendly message
    if (errorMessage.includes('API token')) {
      return 'Authentication failed. Please check your API token in settings.';
    }
    
    if (errorMessage.includes('not found')) {
      return 'Task not found. Please check your task ID.';
    }
    
    if (errorMessage.includes('network') || errorMessage.includes('fetch')) {
      return 'Network error. Please check your internet connection and try again.';
    }
    
    if (errorMessage.includes('Invalid time')) {
      return 'Invalid time format. Please use formats like: 90, 1h, 1h 30m, 01:30';
    }
    
    // Generic error with context
    return `Failed to ${context}. ${errorMessage}`;
  }

  /**
   * Show success message
   */
  static showSuccess(message: string): void {
    vscode.window.showInformationMessage(message);
  }

  /**
   * Show warning message with options
   */
  static async showWarning(message: string, ...items: string[]): Promise<string | undefined> {
    return await vscode.window.showWarningMessage(message, ...items);
  }

  /**
   * Show info message with options
   */
  static async showInfo(message: string, ...items: string[]): Promise<string | undefined> {
    return await vscode.window.showInformationMessage(message, ...items);
  }
}

import * as vscode from 'vscode';

export class ErrorHandler {
  static handleCommandError(error: unknown, context: string, showToUser: boolean = true): void {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    
    console.error(`Error in ${context}:`, error);
    
    if (showToUser) {
      const userMessage = this.formatUserMessage(errorMessage, context);
      vscode.window.showErrorMessage(userMessage);
    }
  }

  static handleSilentError(error: unknown, context: string): void {
    console.error(`Silent error in ${context}:`, error);
  }

  private static formatUserMessage(errorMessage: string, context: string): string {
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
    
    return `Failed to ${context}. ${errorMessage}`;
  }

  static showSuccess(message: string): void {
    vscode.window.showInformationMessage(message);
  }

  static async showWarning(message: string, ...items: string[]): Promise<string | undefined> {
    return await vscode.window.showWarningMessage(message, ...items);
  }

  static async showInfo(message: string, ...items: string[]): Promise<string | undefined> {
    return await vscode.window.showInformationMessage(message, ...items);
  }
}

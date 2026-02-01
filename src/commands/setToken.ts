import * as vscode from 'vscode';
import { AuthManager } from '../types';
import { CommutatusApiClient } from '../api/client';

/**
 * Command handler for setting API token
 * Prompts user for token and stores it securely
 */
export async function setApiTokenCommand(authManager: AuthManager, apiClient: CommutatusApiClient): Promise<void> {
  try {
    // Prompt for API token
    const token = await vscode.window.showInputBox({
      prompt: 'Enter your Commutatus API token',
      password: true, // Mask the input
      placeHolder: 'Enter API token...',
      validateInput: (value) => {
        if (!value || value.trim() === '') {
          return 'API token is required';
        }
        if (value.trim().length < 10) {
          return 'API token appears to be too short';
        }
        return null;
      }
    });

    if (!token) {
      return; // User cancelled
    }

    // Store the token
    await authManager.setApiToken(token.trim());
    
    // Update API client with new token
    apiClient.setAuthToken(token.trim());

    // Show success message
    vscode.window.showInformationMessage('✅ API token saved successfully');

  } catch (error) {
    console.error('Error setting API token:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    vscode.window.showErrorMessage(`Failed to set API token: ${errorMessage}`);
  }
}

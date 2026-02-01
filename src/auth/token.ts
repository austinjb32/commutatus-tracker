import * as vscode from 'vscode';
import { AuthManager } from '../types';

/**
 * Manages API token storage using VS Code's SecretStorage
 * Provides secure storage for authentication tokens
 */
export class SecretStorageAuthManager implements AuthManager {
  private static readonly API_TOKEN_KEY = 'commutatus-tracker.apiToken';

  constructor(private readonly secretStorage: vscode.SecretStorage) {}

  /**
   * Get stored API token
   */
  async getApiToken(): Promise<string | null> {
    try {
      const token = await this.secretStorage.get(SecretStorageAuthManager.API_TOKEN_KEY);
      return token || null;
    } catch (error) {
      console.error('Error retrieving API token:', error);
      return null;
    }
  }

  /**
   * Store API token securely
   */
  async setApiToken(token: string): Promise<void> {
    try {
      if (!token || token.trim() === '') {
        throw new Error('API token cannot be empty');
      }
      
      await this.secretStorage.store(SecretStorageAuthManager.API_TOKEN_KEY, token.trim());
    } catch (error) {
      console.error('Error storing API token:', error);
      throw new Error('Failed to store API token');
    }
  }

  /**
   * Clear stored API token
   */
  async clearApiToken(): Promise<void> {
    try {
      await this.secretStorage.delete(SecretStorageAuthManager.API_TOKEN_KEY);
    } catch (error) {
      console.error('Error clearing API token:', error);
      throw new Error('Failed to clear API token');
    }
  }

  /**
   * Prompt user to enter API token
   * Shows input dialog with password masking
   */
  async promptForApiToken(): Promise<string | null> {
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

    if (token) {
      try {
        await this.setApiToken(token);
        return token;
      } catch (error) {
        vscode.window.showErrorMessage(`Failed to store API token: ${error}`);
        return null;
      }
    }

    return null;
  }

  /**
   * Check if API token is available
   */
  async hasApiToken(): Promise<boolean> {
    const token = await this.getApiToken();
    return token !== null && token.length > 0;
  }
}

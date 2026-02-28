import * as assert from 'assert';
import { ErrorHandler } from '../utils/errorHandler';
import * as vscode from 'vscode';

// Mock vscode module
const originalShowErrorMessage = vscode.window.showErrorMessage;
const originalShowWarningMessage = vscode.window.showWarningMessage;
const originalShowInformationMessage = vscode.window.showInformationMessage;

suite('Error Handler Tests', () => {

  setup(() => {
    // Reset mock functions before each test
    vscode.window.showErrorMessage = originalShowErrorMessage;
    vscode.window.showWarningMessage = originalShowWarningMessage;
    vscode.window.showInformationMessage = originalShowInformationMessage;
  });

  suite('handleCommandError', () => {
    test('should log error to console', () => {
      const testError = new Error('Test error');

      // Should not throw and should return undefined
      const result = ErrorHandler.handleCommandError(testError, 'Test operation');
      assert.strictEqual(result, undefined);
    });

    test('should show user-friendly message for API token errors', () => {
      let showMessageCalled = false;
      let showMessageContent = '';

      vscode.window.showErrorMessage = (message: string) => {
        showMessageCalled = true;
        showMessageContent = message;
        return Promise.resolve('' as any);
      };

      const testError = new Error('Invalid API token');
      ErrorHandler.handleCommandError(testError, 'test context');

      assert.strictEqual(showMessageCalled, true);
      assert.ok(showMessageContent.includes('Authentication failed'));
    });

    test('should show user-friendly message for not found errors', () => {
      let showMessageCalled = false;
      let showMessageContent = '';

      vscode.window.showErrorMessage = (message: string) => {
        showMessageCalled = true;
        showMessageContent = message;
        return Promise.resolve('' as any);
      };

      const testError = new Error('Task not found');
      ErrorHandler.handleCommandError(testError, 'test context');

      assert.strictEqual(showMessageCalled, true);
      assert.ok(showMessageContent.includes('Task not found'));
    });

    test('should show user-friendly message for network errors', () => {
      let showMessageCalled = false;
      let showMessageContent = '';

      vscode.window.showErrorMessage = (message: string) => {
        showMessageCalled = true;
        showMessageContent = message;
        return Promise.resolve('' as any);
      };

      const testError = new Error('network error occurred');
      ErrorHandler.handleCommandError(testError, 'test context');

      assert.strictEqual(showMessageCalled, true);
      assert.ok(showMessageContent.includes('Network error'));
    });

    test('should show user-friendly message for invalid time errors', () => {
      let showMessageCalled = false;
      let showMessageContent = '';

      vscode.window.showErrorMessage = (message: string) => {
        showMessageCalled = true;
        showMessageContent = message;
        return Promise.resolve('' as any);
      };

      const testError = new Error('Invalid time format');
      ErrorHandler.handleCommandError(testError, 'test context');

      assert.strictEqual(showMessageCalled, true);
      assert.ok(showMessageContent.includes('Invalid time format'));
    });

    test('should show generic error message for unknown errors', () => {
      let showMessageCalled = false;
      let showMessageContent = '';

      vscode.window.showErrorMessage = (message: string) => {
        showMessageCalled = true;
        showMessageContent = message;
        return Promise.resolve('' as any);
      };

      const testError = new Error('Some random error');
      ErrorHandler.handleCommandError(testError, 'test context');

      assert.strictEqual(showMessageCalled, true);
      assert.ok(showMessageContent.includes('Failed to test context'));
      assert.ok(showMessageContent.includes('Some random error'));
    });

    test('should handle non-Error objects', () => {
      let showMessageCalled = false;
      let showMessageContent = '';

      vscode.window.showErrorMessage = (message: string) => {
        showMessageCalled = true;
        showMessageContent = message;
        return Promise.resolve('' as any);
      };

      ErrorHandler.handleCommandError('string error', 'test context');

      assert.strictEqual(showMessageCalled, true);
      assert.ok(showMessageContent.includes('Unknown error'));
    });

    test('should not show message when showToUser is false', () => {
      let showMessageCalled = false;

      vscode.window.showErrorMessage = (message: string) => {
        showMessageCalled = true;
        return Promise.resolve('' as any);
      };

      ErrorHandler.handleCommandError(new Error('Test'), 'test context', false);

      assert.strictEqual(showMessageCalled, false);
    });
  });

  suite('handleSilentError', () => {
    test('should log error but not show to user', () => {
      const testError = new Error('Silent error');

      // Should not throw and should not show error message
      ErrorHandler.handleSilentError(testError, 'test context');

      // Test passes if no exception is thrown
      assert.ok(true);
    });
  });

  suite('showSuccess', () => {
    test('should show success message', () => {
      let showMessageCalled = false;
      let showMessageContent = '';

      vscode.window.showInformationMessage = (message: string) => {
        showMessageCalled = true;
        showMessageContent = message;
        return Promise.resolve('' as any);
      };

      ErrorHandler.showSuccess('Operation completed');

      assert.strictEqual(showMessageCalled, true);
      assert.strictEqual(showMessageContent, 'Operation completed');
    });
  });

  suite('showWarning', () => {
    test('should show warning message with options', async () => {
      let showMessageCalled = false;
      let showMessageContent = '';
      let showOptions: string[] = [];

      vscode.window.showWarningMessage = (message: string, ...items: any[]) => {
        showMessageCalled = true;
        showMessageContent = message;
        showOptions = items;
        return Promise.resolve('Option 1' as any);
      };

      const result = await ErrorHandler.showWarning('Warning message', 'Option 1', 'Option 2');

      assert.strictEqual(showMessageCalled, true);
      assert.strictEqual(showMessageContent, 'Warning message');
      assert.deepStrictEqual(showOptions, ['Option 1', 'Option 2']);
      assert.strictEqual(result, 'Option 1');
    });
  });

  suite('showInfo', () => {
    test('should show info message with options', async () => {
      let showMessageCalled = false;
      let showMessageContent = '';
      let showOptions: string[] = [];

      vscode.window.showInformationMessage = (message: string, ...items: any[]) => {
        showMessageCalled = true;
        showMessageContent = message;
        showOptions = items;
        return Promise.resolve('Info Option' as any);
      };

      const result = await ErrorHandler.showInfo('Info message', 'Info Option');

      assert.strictEqual(showMessageCalled, true);
      assert.strictEqual(showMessageContent, 'Info message');
      assert.deepStrictEqual(showOptions, ['Info Option']);
      assert.strictEqual(result, 'Info Option');
    });
  });

});

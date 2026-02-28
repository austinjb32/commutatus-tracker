import * as assert from 'assert';
import { parseTimeInput, validateTimeEntry, formatMinutes } from '../utils/time';
import { ErrorHandler } from '../utils/errorHandler';
import { GitOperations } from '../utils/git';
import * as vscode from 'vscode';

let mockShowInputBoxCalls: any[] = [];
let mockShowInformationMessageCalls: any[] = [];
let mockShowWarningMessageCalls: any[] = [];
let mockShowErrorMessageCalls: any[] = [];
let mockWithProgressCalls: any[] = [];
let mockExecuteCommandCalls: any[] = [];

suite('Command Functions Tests', () => {

  setup(() => {
    mockShowInputBoxCalls = [];
    mockShowInformationMessageCalls = [];
    mockShowWarningMessageCalls = [];
    mockShowErrorMessageCalls = [];
    mockWithProgressCalls = [];
    mockExecuteCommandCalls = [];

    (vscode.window.showInputBox as any) = async (options: any) => {
      mockShowInputBoxCalls.push(options);
      return 'test-value';
    };

    (vscode.window.showInformationMessage as any) = async (message: string, ...items: string[]) => {
      mockShowInformationMessageCalls.push({ message, items });
      return items[0];
    };

    (vscode.window.showWarningMessage as any) = async (message: string, ...items: string[]) => {
      mockShowWarningMessageCalls.push({ message, items });
      return items[0];
    };

    (vscode.window.showErrorMessage as any) = async (message: string, ...items: string[]) => {
      mockShowErrorMessageCalls.push({ message, items });
      return items[0];
    };

    (vscode.window.withProgress as any) = async (options: any, callback: any) => {
      mockWithProgressCalls.push(options);
      await callback();
    };

    (vscode.commands.executeCommand as any) = async (command: string, ...args: any[]) => {
      mockExecuteCommandCalls.push({ command, args });
    };
  });

  suite('Time Input Validation', () => {
    test('should accept valid time inputs', () => {
      const validInputs = ['90', '1h', '45m', '1h 30m', '01:30', '2.5h'];

      for (const input of validInputs) {
        const parsed = parseTimeInput(input);
        assert.ok(parsed !== null, `Input "${input}" should be valid`);
        assert.ok(parsed!.minutes > 0, `Input "${input}" should have positive minutes`);
      }
    });

    test('should reject invalid time inputs', () => {
      const invalidInputs = ['invalid', '', '   ', 'abc', '25:61', '12:60'];

      for (const input of invalidInputs) {
        const parsed = parseTimeInput(input);
        assert.strictEqual(parsed, null, `Input "${input}" should be invalid`);
      }
    });

    test('should validate time entries correctly', () => {
      const validEntry = validateTimeEntry(60);
      assert.strictEqual(validEntry.isValid, true);
      assert.strictEqual(validEntry.roundedMinutes, 60);

      const invalidEntry = validateTimeEntry(-10);
      assert.strictEqual(invalidEntry.isValid, false);

      const largeEntry = validateTimeEntry(500);
      assert.strictEqual(largeEntry.isValid, false);
    });
  });

  suite('Error Handling in Commands', () => {
    test('should handle missing task ID gracefully', async () => {
      const mockApiClient = {
        addTimeLog: async () => { throw new Error('Should not be called'); }
      };

      const mockTaskResolver = {
        getCurrentTaskId: async () => null,
        setCurrentTaskId: async () => { },
        clearCurrentTaskId: async () => { },
        getTaskIdFromBranch: async () => null,
        updateTaskFromBranch: async () => { }
      };

      const mockAuthManager = {
        getApiToken: async () => 'token',
        setApiToken: async () => { },
        clearApiToken: async () => { }
      };

      const mockExtensionContext = {
        subscriptions: [],
        globalState: { get: () => { }, update: () => Promise.resolve() },
        workspaceState: { get: () => { }, update: () => Promise.resolve() },
        secrets: { get: () => Promise.resolve(), store: () => Promise.resolve() },
        extensionUri: { fsPath: '/test' }
      } as any;

      const { addTimeLogCommand } = await import('../commands/addTime.js');

      await addTimeLogCommand(mockExtensionContext, mockApiClient as any, mockTaskResolver as any, mockAuthManager as any);

      assert.ok(mockShowErrorMessageCalls.length > 0);
      assert.ok(mockShowErrorMessageCalls[0].message.includes('No active task found'));
    });

    test('should handle missing API token gracefully', async () => {
      const mockApiClient = {
        addTimeLog: async () => { throw new Error('Should not be called'); }
      };

      const mockTaskResolver = {
        getCurrentTaskId: async () => 'task-1',
        setTaskId: async () => { },
        getTaskIdFromGitBranch: async () => null,
        getSessionTaskId: async () => null,
        isValidTaskId: async () => true,
        promptForTaskId: async () => 'task-1'
      };

      const mockAuthManager = {
        getApiToken: async () => null,
        setApiToken: async () => { },
        clearApiToken: async () => { }
      };

      const mockExtensionContext = {
        subscriptions: [],
        globalState: { get: () => { }, update: () => Promise.resolve() },
        workspaceState: { get: () => { }, update: () => Promise.resolve() },
        secrets: { get: () => Promise.resolve(), store: () => Promise.resolve() },
        extensionUri: { fsPath: '/test' }
      } as any;

      const { addTimeLogCommand } = await import('../commands/addTime.js');

      await addTimeLogCommand(mockExtensionContext, mockApiClient as any, mockTaskResolver as any, mockAuthManager as any);

      assert.ok(mockShowErrorMessageCalls.length > 0);
      assert.ok(mockShowErrorMessageCalls[0].message.includes('Authentication failed'));
    });
  });

  suite('User Input Handling', () => {
    test('should cancel when user cancels note input', async () => {
      (vscode.window.showInputBox as any) = async (options: any) => {
        mockShowInputBoxCalls.push(options);
        return undefined; // User cancelled
      };

      const mockApiClient = {
        addTimeLog: async () => { throw new Error('Should not be called'); }
      };

      const mockTaskResolver = {
        getCurrentTaskId: async () => 'task-1',
        setTaskId: async () => { },
        getTaskIdFromGitBranch: async () => null,
        getSessionTaskId: async () => null,
        isValidTaskId: async () => true,
        promptForTaskId: async () => 'task-1'
      };

      const mockAuthManager = {
        getApiToken: async () => 'token',
        setApiToken: async () => { },
        clearApiToken: async () => { }
      };

      const mockExtensionContext = {
        subscriptions: [],
        globalState: { get: () => { }, update: () => Promise.resolve() },
        workspaceState: { get: () => { }, update: () => Promise.resolve() },
        secrets: { get: () => Promise.resolve(), store: () => Promise.resolve() },
        extensionUri: { fsPath: '/test' }
      } as any;

      const { addTimeLogCommand } = await import('../commands/addTime.js');

      await addTimeLogCommand(mockExtensionContext, mockApiClient as any, mockTaskResolver as any, mockAuthManager as any);

      assert.strictEqual(mockShowInputBoxCalls.length, 2);
    });

    test('should validate time input format', async () => {
      (vscode.window.showInputBox as any) = async (options: any) => {
        mockShowInputBoxCalls.push(options);
        if (options.prompt?.includes('What did you work on')) {
          return 'Test note';
        } else if (options.prompt?.includes('Enter time')) {
          return 'invalid'; // Invalid time format
        }
        return undefined;
      };

      const mockApiClient = {
        addTimeLog: async () => { throw new Error('Should not be called'); }
      };

      const mockTaskResolver = {
        getCurrentTaskId: async () => 'task-1',
        setTaskId: async () => { },
        getTaskIdFromGitBranch: async () => null,
        getSessionTaskId: async () => null,
        isValidTaskId: async () => true,
        promptForTaskId: async () => 'task-1'
      };

      const mockAuthManager = {
        getApiToken: async () => 'token',
        setApiToken: async () => { },
        clearApiToken: async () => { }
      };

      const mockExtensionContext = {
        subscriptions: [],
        globalState: { get: () => { }, update: () => Promise.resolve() },
        workspaceState: { get: () => { }, update: () => Promise.resolve() },
        secrets: { get: () => Promise.resolve(), store: () => Promise.resolve() },
        extensionUri: { fsPath: '/test' }
      } as any;

      const { addTimeLogCommand } = await import('../commands/addTime.js');

      await addTimeLogCommand(mockExtensionContext, mockApiClient as any, mockTaskResolver as any, mockAuthManager as any);

      assert.ok(mockShowErrorMessageCalls.length > 0);
    });
  });

  suite('Success Scenarios', () => {
    test('should successfully add time log with valid input', async () => {
      (vscode.window.showInputBox as any) = async (options: any) => {
        mockShowInputBoxCalls.push(options);
        if (options.prompt?.includes('What did you work on')) {
          return 'Test note';
        } else if (options.prompt?.includes('Enter time')) {
          return '30m';
        }
        return undefined;
      };

      const mockApiClient = {
        addTimeLog: async () => ({ id: 'log-1' })
      };

      const mockTaskResolver = {
        getCurrentTaskId: async () => 'task-1',
        setTaskId: async () => { },
        getTaskIdFromGitBranch: async () => null,
        getSessionTaskId: async () => null,
        isValidTaskId: async () => true,
        promptForTaskId: async () => 'task-1'
      };

      const mockAuthManager = {
        getApiToken: async () => 'token',
        setApiToken: async () => { },
        clearApiToken: async () => { }
      };

      const mockExtensionContext = {
        subscriptions: [],
        globalState: { get: () => { }, update: () => Promise.resolve() },
        workspaceState: { get: () => { }, update: () => Promise.resolve() },
        secrets: { get: () => Promise.resolve(), store: () => Promise.resolve() },
        extensionUri: { fsPath: '/test' }
      } as any;

      const { addTimeLogCommand } = await import('../commands/addTime.js');

      await addTimeLogCommand(mockExtensionContext, mockApiClient as any, mockTaskResolver as any, mockAuthManager as any);

      assert.ok(mockWithProgressCalls.length > 0);
      assert.ok(mockShowInformationMessageCalls.length > 0);
    });
  });

});

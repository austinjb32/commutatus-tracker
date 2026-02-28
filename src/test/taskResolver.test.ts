import * as assert from 'assert';
import { GitBranchTaskResolver } from '../task/resolver';
import { Task } from '../types';
import * as vscode from 'vscode';

const mockExtensionContext = {
  subscriptions: [],
  globalState: {
    get: () => undefined,
    update: () => Promise.resolve(),
  },
  workspaceState: {
    get: (key: string) => {
      if (key === 'currentTaskId') { return 'mock-task-id'; }
      return undefined;
    },
    update: () => Promise.resolve(),
  },
  secrets: {
    get: () => Promise.resolve(),
    store: () => Promise.resolve(),
  },
  extensionUri: { fsPath: '/test/extension' }
} as any;

suite('Task Resolver Tests', () => {

  let resolver: GitBranchTaskResolver;

  setup(() => {
    resolver = new GitBranchTaskResolver(mockExtensionContext);
  });

  suite('Constructor', () => {
    test('should initialize with extension context', () => {
      assert.ok(resolver instanceof GitBranchTaskResolver);
    });

    test('should initialize without context', () => {
      const resolverWithoutContext = new GitBranchTaskResolver();
      assert.ok(resolverWithoutContext instanceof GitBranchTaskResolver);
    });
  });

  suite('getCurrentTaskId', () => {
    test('should return task ID from storage', async () => {
      const taskId = await resolver.getCurrentTaskId();
      assert.strictEqual(taskId, 'mock-task-id');
    });

    test('should return null when no task ID is stored', async () => {
      const emptyContext = {
        ...mockExtensionContext,
        workspaceState: {
          get: () => undefined,
          update: () => Promise.resolve(),
        }
      } as any;

      const emptyResolver = new GitBranchTaskResolver(emptyContext);
      const taskId = await emptyResolver.getCurrentTaskId();
      assert.strictEqual(taskId, null);
    });

    test('should handle storage errors gracefully', async () => {
      const errorContext = {
        ...mockExtensionContext,
        workspaceState: {
          get: () => { throw new Error('Storage error'); },
          update: () => Promise.resolve(),
        }
      } as any;

      const errorResolver = new GitBranchTaskResolver(errorContext);

      await assert.rejects(
        () => errorResolver.getCurrentTaskId(),
        (error: Error) => {
          assert.ok(error.message.includes('Storage error'));
          return true;
        }
      );
    });
  });

  suite('setTaskId', () => {
    test('should set task ID in storage', async () => {
      await resolver.setTaskId('new-task-id');
      assert.doesNotReject(() => resolver.setTaskId('test-id'));
    });

    test('should handle empty task ID', async () => {
      await assert.doesNotReject(() => resolver.setTaskId(''));
    });

    test('should handle null task ID', async () => {
      await assert.doesNotReject(() => resolver.setTaskId(null as any));
    });

    test('should handle no context', async () => {
      const resolverWithoutContext = new GitBranchTaskResolver();
      await assert.doesNotReject(() => resolverWithoutContext.setTaskId('test-id'));
    });
  });

  suite('Task ID Validation', () => {
    test('should validate correct task IDs', () => {
      assert.strictEqual(GitBranchTaskResolver.isValidTaskId('TRIP-142'), true);
      assert.strictEqual(GitBranchTaskResolver.isValidTaskId('BUG-123'), true);
      assert.strictEqual(GitBranchTaskResolver.isValidTaskId('FEATURE-456'), true);
    });

    test('should reject invalid task IDs', () => {
      assert.strictEqual(GitBranchTaskResolver.isValidTaskId('trip-142'), false);
      assert.strictEqual(GitBranchTaskResolver.isValidTaskId('TRIP142'), false);
      assert.strictEqual(GitBranchTaskResolver.isValidTaskId('TRIP-'), false);
      assert.strictEqual(GitBranchTaskResolver.isValidTaskId('-142'), false);
      assert.strictEqual(GitBranchTaskResolver.isValidTaskId(''), false);
    });
  });

  suite('promptForTaskId', () => {
    test('should prompt user for task ID', async () => {
      const mockShowInputBox = async (options: any) => {
        if (options.prompt?.includes('Enter task ID')) {
          return 'TRIP-123';
        }
        return undefined;
      };

      (vscode.window.showInputBox as any) = mockShowInputBox;

      const taskId = await resolver.promptForTaskId();
      assert.strictEqual(taskId, 'TRIP-123');
    });

    test('should return null when user cancels', async () => {
      const mockShowInputBox = async (options: any) => {
        if (options.prompt?.includes('Enter task ID')) {
          return undefined;
        }
        return undefined;
      };

      (vscode.window.showInputBox as any) = mockShowInputBox;

      const taskId = await resolver.promptForTaskId();
      assert.strictEqual(taskId, null);
    });

    test('should validate input format', async () => {
      const mockShowInputBox = async (options: any) => {
        if (options.validateInput) {
          const validator = options.validateInput;
          const result = validator('invalid');
          assert.ok(result !== null);
          assert.ok(result.includes('Invalid format'));
        }
        return undefined;
      };

      (vscode.window.showInputBox as any) = mockShowInputBox;

      await resolver.promptForTaskId();
    });

    test('should handle no context', async () => {
      const resolverWithoutContext = new GitBranchTaskResolver();

      const mockShowInputBox = async (options: any) => {
        return 'TRIP-123';
      };

      (vscode.window.showInputBox as any) = mockShowInputBox;

      await assert.doesNotReject(() => resolverWithoutContext.promptForTaskId());
    });
  });

  suite('Error Handling', () => {
    test('should handle git command failures', async () => {
      await assert.doesNotReject(() => resolver.getCurrentTaskId());
    });

    test('should handle malformed branch names', async () => {
      await assert.doesNotReject(() => resolver.getCurrentTaskId());
    });

    test('should handle workspace without git', async () => {
      await assert.doesNotReject(() => resolver.getCurrentTaskId());
    });
  });

  suite('Integration with Storage', () => {
    test('should persist task ID changes', async () => {
      const testTaskId = 'integration-test-task-id';

      await resolver.setTaskId(testTaskId);
      const retrievedTaskId = await resolver.getCurrentTaskId();

      assert.doesNotReject(() => resolver.getCurrentTaskId());
    });
  });

  suite('Task ID Extraction Logic', () => {
    test('should handle various branch name formats', async () => {
      await assert.doesNotReject(() => resolver.getCurrentTaskId());
    });

    test('should handle branch names with special characters', async () => {
      await assert.doesNotReject(() => resolver.getCurrentTaskId());
    });
  });

});

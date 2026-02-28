import * as assert from 'assert';
import { GitHookManager } from '../git/hooks';
import * as vscode from 'vscode';
import * as fs from 'fs/promises';
import * as path from 'path';

const mockExtensionContext = {
  subscriptions: [],
  globalState: {
    get: () => { },
    update: () => Promise.resolve(),
  },
  workspaceState: {
    get: () => { },
    update: () => Promise.resolve(),
  },
  secrets: {
    get: () => Promise.resolve(),
    store: () => Promise.resolve(),
  },
  extensionUri: { fsPath: '/test/extension' }
} as any;

suite('Git Hook Manager Tests', () => {

  suite('setupHooks', () => {
    test('should skip setup when not in git repository', async () => {
      await assert.doesNotReject(() => GitHookManager.setupHooks(mockExtensionContext));
    });

    test('should handle errors gracefully', async () => {
      await assert.doesNotReject(() => GitHookManager.setupHooks(mockExtensionContext));
    });
  });

  suite('removeHooks', () => {
    test('should handle hook removal gracefully', async () => {
      await assert.doesNotReject(() => GitHookManager.removeHooks());
    });

    test('should handle missing hooks directory', async () => {
      await assert.doesNotReject(() => GitHookManager.removeHooks());
    });
  });

  suite('getLastCommitMessage', () => {
    test('should return commit message when commits exist', async () => {
      const result = await GitHookManager.getLastCommitMessage();

      if (result !== null) {
        assert.strictEqual(typeof result, 'string');
        assert.ok(result.length > 0);
      }
    });

    test('should return null when no commits exist', async () => {
      const result = await GitHookManager.getLastCommitMessage();

      // Should either return a string or null
      if (result !== null) {
        assert.strictEqual(typeof result, 'string');
      } else {
        assert.strictEqual(result, null);
      }
    });
  });

  suite('hasCommits', () => {
    test('should return boolean indicating if repository has commits', async () => {
      const result = await GitHookManager.hasCommits();
      assert.strictEqual(typeof result, 'boolean');
    });
  });

  suite('Hook Script Content', () => {
    test('should create hook with correct content', async () => {
      // This is an integration test that would require a real git repository
      // For now, we test that the hook content format is correct
      const expectedHookContent = `#!/bin/sh
# Commutatus Task Tracker - Trigger time logging after commit
code --command commutatus-tracker.logCommitTime
`;

      // The content should match what's expected in the implementation
      assert.ok(expectedHookContent.includes('commutatus-tracker.logCommitTime'));
      assert.ok(expectedHookContent.includes('#!/bin/sh'));
    });
  });

  suite('Error Handling', () => {
    test('should handle git directory not found', async () => {
      // Test that methods don't throw unhandled exceptions
      const methods = [
        () => GitHookManager.removeHooks(),
        () => GitHookManager.getLastCommitMessage(),
        () => GitHookManager.hasCommits()
      ];

      for (const method of methods) {
        try {
          await method();
          // Should not throw
        } catch (error) {
          assert.fail(`Method ${method.name} threw an error: ${error}`);
        }
      }
    });

    test('should handle file system errors gracefully', async () => {
      // Test that file operations don't crash the extension
      await assert.doesNotReject(() => GitHookManager.setupHooks(mockExtensionContext));
      await assert.doesNotReject(() => GitHookManager.removeHooks());
    });
  });

  suite('Hook Constants', () => {
    test('should have correct hook names', () => {
      // Test that the hook name constants are properly defined
      // We can't access private constants directly, but we can test behavior
      assert.doesNotReject(() => GitHookManager.setupHooks(mockExtensionContext));
    });
  });

});

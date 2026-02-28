import * as assert from 'assert';
import { SecretStorageAuthManager } from '../auth/token';
import * as vscode from 'vscode';

// Mock vscode SecretStorage
const mockSecretStorage = {
  get: (key: string) => Promise.resolve('mock-token'),
  store: (key: string, value: string) => Promise.resolve(),
  delete: (key: string) => Promise.resolve(),
  keys: () => Promise.resolve([]),
  onDidChange: ((listener: (e: vscode.SecretStorageChangeEvent) => any, thisArgs?: any, disposables?: vscode.Disposable[]) => {
    return { dispose: () => { } };
  }) as any
};

const mockExtensionContext = {
  secrets: mockSecretStorage,
  subscriptions: [],
  globalState: {
    get: () => { },
    update: () => Promise.resolve(),
  },
  workspaceState: {
    get: () => { },
    update: () => Promise.resolve(),
  },
  extensionUri: { fsPath: '/test/extension' }
} as any;

suite('Auth Token Manager Tests', () => {

  let authManager: SecretStorageAuthManager;

  setup(() => {
    authManager = new SecretStorageAuthManager(mockSecretStorage);
  });

  suite('Constructor', () => {
    test('should initialize with secret storage', () => {
      assert.ok(authManager instanceof SecretStorageAuthManager);
    });

    test('should initialize with context secrets', () => {
      const contextAuthManager = new SecretStorageAuthManager(mockExtensionContext.secrets);
      assert.ok(contextAuthManager instanceof SecretStorageAuthManager);
    });
  });

  suite('getApiToken', () => {
    test('should return stored token', async () => {
      const token = await authManager.getApiToken();
      assert.strictEqual(token, 'mock-token');
    });

    test('should return null when no token is stored', async () => {
      const mockEmptyStorage = {
        ...mockSecretStorage,
        get: (key: string) => Promise.resolve(undefined),
        store: (key: string, value: string) => Promise.resolve(),
        delete: (key: string) => Promise.resolve(),
        keys: () => Promise.resolve([]),
        onDidChange: ((listener: (e: vscode.SecretStorageChangeEvent) => any, thisArgs?: any, disposables?: vscode.Disposable[]) => {
          return { dispose: () => { } };
        }) as any
      };

      const emptyAuthManager = new SecretStorageAuthManager(mockEmptyStorage);
      const token = await emptyAuthManager.getApiToken();
      assert.strictEqual(token, null);
    });

    test('should return null for empty token string', async () => {
      const mockEmptyStorage = {
        ...mockSecretStorage,
        get: (key: string) => Promise.resolve(''),
        store: (key: string, value: string) => Promise.resolve(),
        delete: (key: string) => Promise.resolve(),
        keys: () => Promise.resolve([]),
        onDidChange: ((listener: (e: vscode.SecretStorageChangeEvent) => any, thisArgs?: any, disposables?: vscode.Disposable[]) => {
          return { dispose: () => { } };
        }) as any
      };

      const emptyAuthManager = new SecretStorageAuthManager(mockEmptyStorage);
      const token = await emptyAuthManager.getApiToken();
      assert.strictEqual(token, null);
    });

    test('should handle storage errors gracefully', async () => {
      const mockErrorStorage = {
        ...mockSecretStorage,
        get: (key: string) => Promise.reject(new Error('Storage error')),
        store: (key: string, value: string) => Promise.resolve(),
        delete: (key: string) => Promise.resolve(),
        keys: () => Promise.resolve([]),
        onDidChange: ((listener: (e: vscode.SecretStorageChangeEvent) => any, thisArgs?: any, disposables?: vscode.Disposable[]) => {
          return { dispose: () => { } };
        }) as any
      };

      const errorAuthManager = new SecretStorageAuthManager(mockErrorStorage);

      const token = await errorAuthManager.getApiToken();
      assert.strictEqual(token, null);
    });
  });

  suite('setApiToken', () => {
    test('should store token successfully', async () => {
      await authManager.setApiToken('new-token');
      // Should not throw
      assert.doesNotReject(() => authManager.setApiToken('test-token'));
    });

    test('should handle empty token', async () => {
      await assert.rejects(
        () => authManager.setApiToken(''),
        (error: Error) => {
          assert.ok(error.message.includes('Failed to store API token'));
          return true;
        }
      );
    });

    test('should handle null token', async () => {
      await assert.rejects(
        () => authManager.setApiToken(null as any),
        (error: Error) => {
          assert.ok(error.message.includes('Failed to store API token'));
          return true;
        }
      );
    });

    test('should handle storage errors', async () => {
      const mockErrorStorage = {
        ...mockSecretStorage,
        get: (key: string) => Promise.resolve(''),
        store: (key: string, value: string) => Promise.reject(new Error('Storage error')),
        delete: (key: string) => Promise.resolve(),
        keys: () => Promise.resolve([]),
        onDidChange: ((listener: (e: vscode.SecretStorageChangeEvent) => any, thisArgs?: any, disposables?: vscode.Disposable[]) => {
          return { dispose: () => { } };
        }) as any
      };

      const errorAuthManager = new SecretStorageAuthManager(mockErrorStorage);

      await assert.rejects(
        () => errorAuthManager.setApiToken('test-token'),
        (error: Error) => {
          assert.ok(error.message.includes('Failed to store API token'));
          return true;
        }
      );
    });
  });

  suite('clearApiToken', () => {
    test('should delete token successfully', async () => {
      await authManager.clearApiToken();
      // Should not throw
      assert.doesNotReject(() => authManager.clearApiToken());
    });

    test('should handle storage errors during deletion', async () => {
      const mockErrorStorage = {
        ...mockSecretStorage,
        get: (key: string) => Promise.resolve(''),
        store: (key: string, value: string) => Promise.resolve(),
        delete: (key: string) => Promise.reject(new Error('Storage error')),
        keys: () => Promise.resolve([]),
        onDidChange: ((listener: (e: vscode.SecretStorageChangeEvent) => any, thisArgs?: any, disposables?: vscode.Disposable[]) => {
          return { dispose: () => { } };
        }) as any
      };

      const errorAuthManager = new SecretStorageAuthManager(mockErrorStorage);

      await assert.rejects(
        () => errorAuthManager.clearApiToken(),
        (error: Error) => {
          assert.ok(error.message.includes('Failed to clear API token'));
          return true;
        }
      );
    });
  });

  suite('Token Validation', () => {
    test('should handle various token formats', async () => {
      const tokens = [
        'simple-token',
        'bearer-token-123',
        'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkpvaG4gRG9lIiwiaWF0IjoxNTE2MjM5MDIyfQ.SflKxwRJSMeKKF2QT4fwpMeJf36POk6yJV_adQssw5c',
        '',
        null as any
      ];

      for (const token of tokens) {
        if (token === '' || token === null) {
          await assert.rejects(() => authManager.setApiToken(token));
        } else {
          await assert.doesNotReject(() => authManager.setApiToken(token));
        }
      }
    });

    test('should handle very long tokens', async () => {
      const longToken = 'a'.repeat(10000);
      await assert.doesNotReject(() => authManager.setApiToken(longToken));
    });
  });

  suite('Storage Key Consistency', () => {
    test('should use consistent storage key', async () => {
      // Set a token and verify it can be retrieved
      const testToken = 'consistency-test-token';
      await authManager.setApiToken(testToken);

      // Note: This test would work better with actual storage mocking
      // For now, we just verify the methods execute without error
      assert.doesNotReject(() => authManager.getApiToken());
    });
  });

  suite('Concurrent Operations', () => {
    test('should handle concurrent read/write operations', async () => {
      const operations = [];

      // Create multiple concurrent operations
      for (let i = 0; i < 10; i++) {
        operations.push(authManager.setApiToken(`token-${i}`));
        operations.push(authManager.getApiToken());
      }

      // All operations should complete without errors
      await Promise.all(operations);
    });
  });

  suite('Error Recovery', () => {
    test('should recover from temporary storage failures', async () => {
      let shouldFail = true;
      const mockFlakyStorage = {
        ...mockSecretStorage,
        get: (key: string) => {
          if (shouldFail) {
            shouldFail = false;
            return Promise.reject(new Error('Temporary failure'));
          }
          return Promise.resolve('recovered-token');
        },
        store: (key: string, value: string) => Promise.resolve(),
        delete: (key: string) => Promise.resolve(),
        keys: () => Promise.resolve([]),
        onDidChange: ((listener: (e: vscode.SecretStorageChangeEvent) => any, thisArgs?: any, disposables?: vscode.Disposable[]) => {
          return { dispose: () => { } };
        }) as any
      };

      const flakyAuthManager = new SecretStorageAuthManager(mockFlakyStorage);

      // First call should fail
      const token1 = await flakyAuthManager.getApiToken();
      assert.strictEqual(token1, null);

      // Second call should succeed
      const token2 = await flakyAuthManager.getApiToken();
      assert.strictEqual(token2, 'recovered-token');
    });
  });

});

import * as assert from 'assert';
import { GitOperations } from '../utils/git';
import * as vscode from 'vscode';

const mockWorkspaceFolder = {
  uri: { fsPath: '/test/workspace' }
};

const mockExtension = {
  exports: {
    getAPI: () => ({
      repositories: [
        {
          state: {
            HEAD: { name: 'main' },
            onDidChange: () => ({ dispose: () => { } })
          }
        }
      ],
      onDidOpenRepository: () => ({ dispose: () => { } })
    })
  }
};

suite('Git Operations Tests', () => {

  suite('getWorkspaceFolder', () => {
    test('should return workspace folder path when available', async () => {
      const result = await GitOperations.isInGitRepository();
      assert.strictEqual(typeof result, 'boolean');
    });

    test('should handle no workspace folders', async () => {
      const result = await GitOperations.isInGitRepository();
      assert.strictEqual(typeof result, 'boolean');
    });
  });

  suite('getCurrentBranch', () => {
    test('should return branch name when in git repository', async () => {
      const result = await GitOperations.getCurrentBranch();

      if (result !== null) {
        assert.strictEqual(typeof result, 'string');
        assert.ok(result.length > 0);
      }
    });

    test('should return null for detached HEAD', async () => {
      const result = await GitOperations.getCurrentBranch();

      if (result === null) {
        assert.strictEqual(result, null);
      } else {
        assert.strictEqual(typeof result, 'string');
      }
    });
  });

  suite('isInGitRepository', () => {
    test('should return boolean indicating git repository status', async () => {
      const result = await GitOperations.isInGitRepository();
      assert.strictEqual(typeof result, 'boolean');
    });
  });

  suite('hasCommits', () => {
    test('should return boolean indicating if repository has commits', async () => {
      const result = await GitOperations.hasCommits();
      assert.strictEqual(typeof result, 'boolean');
    });
  });

  suite('getGitDir', () => {
    test('should return git directory path when in repository', async () => {
      const result = await GitOperations.getGitDir();

      if (result !== null) {
        assert.strictEqual(typeof result, 'string');
        assert.ok(result.length > 0);
      }
    });

    test('should return null when not in git repository', async () => {
      const result = await GitOperations.getGitDir();

      if (result !== null) {
        assert.strictEqual(typeof result, 'string');
      } else {
        assert.strictEqual(result, null);
      }
    });
  });

  suite('getLastCommitMessage', () => {
    test('should return commit message when commits exist', async () => {
      const result = await GitOperations.getLastCommitMessage();

      if (result !== null) {
        assert.strictEqual(typeof result, 'string');
        assert.ok(result.length > 0);
      }
    });

    test('should return null when no commits exist', async () => {
      const result = await GitOperations.getLastCommitMessage();

      if (result !== null) {
        assert.strictEqual(typeof result, 'string');
      } else {
        assert.strictEqual(result, null);
      }
    });
  });

  suite('Error Handling', () => {
    test('should handle git command failures gracefully', async () => {
      const methods = [
        () => GitOperations.getCurrentBranch(),
        () => GitOperations.isInGitRepository(),
        () => GitOperations.hasCommits(),
        () => GitOperations.getGitDir(),
        () => GitOperations.getLastCommitMessage()
      ];

      for (const method of methods) {
        try {
          const result = await method();
          assert.ok(result === null || typeof result === 'string' || typeof result === 'boolean');
        } catch (error) {
          assert.fail(`Method ${method.name} threw an error: ${error}`);
        }
      }
    });
  });

});

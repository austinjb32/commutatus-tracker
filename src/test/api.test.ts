import * as assert from 'assert';
import { CommutatusApiClient } from '../api/client';
import { Task, TimeLogPayload } from '../types';

suite('API Client Tests', () => {
  let testApiClient: CommutatusApiClient;

  setup(() => {
    testApiClient = new CommutatusApiClient('https://test-api.com');
  });

  suite('Constructor', () => {
    test('should initialize without throwing', () => {
      assert.doesNotThrow(() => new CommutatusApiClient('https://api.example.com'));
    });

    test('should set auth token', () => {
      assert.doesNotThrow(() => testApiClient.setAuthToken('test-token'));
    });
  });

  suite('getTask', () => {
    test('should fetch task successfully', async () => {
      const mockTask: Task = {
        id: '1',
        title: 'Test Task 1',
        description: 'Description 1',
        status: 'open',
        time_logs: [],
        logs: [],
        comments: []
      };

      (global as any).fetch = async () => ({
        ok: true,
        json: async () => mockTask
      });

      testApiClient.setAuthToken('test-token');
      const result = await testApiClient.getTask('task-1');

      assert.strictEqual(result.id, '1');
      assert.strictEqual(result.title, 'Test Task 1');
      assert.strictEqual(result.description, 'Description 1');
      assert.strictEqual(result.status, 'open');
      assert.deepStrictEqual(result.time_logs, []);
    });

    test('should handle 401 unauthorized error', async () => {
      (global as any).fetch = async () => ({
        ok: false,
        status: 401,
        statusText: 'Unauthorized'
      });

      testApiClient.setAuthToken('test-token');

      await assert.rejects(
        () => testApiClient.getTask('task-1'),
        (error: Error) => {
          assert.ok(error.message.includes('Invalid API token'));
          return true;
        }
      );
    });

    test('should handle network error', async () => {
      (global as any).fetch = async () => {
        throw new Error('Network error');
      };

      testApiClient.setAuthToken('test-token');

      await assert.rejects(
        () => testApiClient.getTask('task-1'),
        (error: Error) => {
          assert.ok(error.message.includes('Network error'));
          return true;
        }
      );
    });

    test('should require auth token', async () => {
      await assert.rejects(
        () => testApiClient.getTask('task-1'),
        (error: Error) => {
          assert.ok(error.message.includes('API token not set'));
          return true;
        }
      );
    });
  });

  suite('addTimeLog', () => {
    const mockTimeLog: TimeLogPayload = {
      time_log: {
        minutes: 60,
        note: 'Test time log'
      }
    };

    test('should add time log successfully', async () => {
      let fetchCall: any;
      (global as any).fetch = async (url: string, options?: any) => {
        fetchCall = { url, options };
        return { ok: true, json: async () => ({}) };
      };

      testApiClient.setAuthToken('test-token');
      await testApiClient.addTimeLog('task-1', mockTimeLog);

      assert.strictEqual(fetchCall.url, 'https://test-api.com/api/tasks/task-1/time_logs');
      assert.strictEqual(fetchCall.options.method, 'POST');
      assert.deepStrictEqual(JSON.parse(fetchCall.options.body), mockTimeLog);
    });

    test('should handle 401 unauthorized error', async () => {
      (global as any).fetch = async () => ({
        ok: false,
        status: 401,
        statusText: 'Unauthorized'
      });

      testApiClient.setAuthToken('test-token');

      await assert.rejects(
        () => testApiClient.addTimeLog('task-1', mockTimeLog),
        (error: Error) => {
          assert.ok(error.message.includes('Invalid API token'));
          return true;
        }
      );
    });

    test('should handle 404 not found error', async () => {
      (global as any).fetch = async () => ({
        ok: false,
        status: 404,
        statusText: 'Not Found'
      });

      testApiClient.setAuthToken('test-token');

      await assert.rejects(
        () => testApiClient.addTimeLog('task-1', mockTimeLog),
        (error: Error) => {
          assert.ok(error.message.includes('Task task-1 not found'));
          return true;
        }
      );
    });

    test('should handle 400 bad request error', async () => {
      (global as any).fetch = async () => ({
        ok: false,
        status: 400,
        json: async () => ({ message: 'Invalid time log data' })
      });

      testApiClient.setAuthToken('test-token');

      await assert.rejects(
        () => testApiClient.addTimeLog('task-1', mockTimeLog),
        (error: Error) => {
          assert.ok(error.message.includes('Invalid time log data: Invalid time log data'));
          return true;
        }
      );
    });

    test('should require auth token', async () => {
      await assert.rejects(
        () => testApiClient.addTimeLog('task-1', mockTimeLog),
        (error: Error) => {
          assert.ok(error.message.includes('API token not set'));
          return true;
        }
      );
    });
  });

});

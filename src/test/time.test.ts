import * as assert from 'assert';
import {
  parseTimeInput,
  validateTimeEntry,
  formatMinutes,
  requiresConfirmation,
  roundToNearestQuarterHour
} from '../utils/time';
import { TIME_LIMITS } from '../config/constants';

suite('Time Utilities Tests', () => {

  suite('parseTimeInput', () => {
    test('should parse minutes as number', () => {
      const result = parseTimeInput('90');
      assert.strictEqual(result?.minutes, 90);
      assert.strictEqual(result?.originalInput, '90');
    });

    test('should parse hours format', () => {
      const result = parseTimeInput('2h');
      assert.strictEqual(result?.minutes, 120);
      assert.strictEqual(result?.originalInput, '2h');
    });

    test('should parse minutes format', () => {
      const result = parseTimeInput('45m');
      assert.strictEqual(result?.minutes, 45);
      assert.strictEqual(result?.originalInput, '45m');
    });

    test('should parse hours and minutes format', () => {
      const result = parseTimeInput('1h 30m');
      assert.strictEqual(result?.minutes, 90);
      assert.strictEqual(result?.originalInput, '1h 30m');
    });

    test('should parse HH:MM format', () => {
      const result = parseTimeInput('01:30');
      assert.strictEqual(result?.minutes, 90);
      assert.strictEqual(result?.originalInput, '01:30');
    });

    test('should parse decimal hours', () => {
      const result = parseTimeInput('1.5h');
      assert.strictEqual(result?.minutes, 90);
      assert.strictEqual(result?.originalInput, '1.5h');
    });

    test('should return null for invalid format', () => {
      assert.strictEqual(parseTimeInput('invalid'), null);
    });

    test('should return null for empty input', () => {
      assert.strictEqual(parseTimeInput(''), null);
      assert.strictEqual(parseTimeInput('   '), null);
    });

    test('should return null for non-string input', () => {
      assert.strictEqual(parseTimeInput(null as any), null);
      assert.strictEqual(parseTimeInput(undefined as any), null);
    });

    test('should reject minutes over limit', () => {
      assert.strictEqual(parseTimeInput('500'), null);
    });

    test('should reject invalid HH:MM format', () => {
      assert.strictEqual(parseTimeInput('25:61'), null);
      assert.strictEqual(parseTimeInput('12:99'), null);
      assert.strictEqual(parseTimeInput('ab:cd'), null);
    });
  });

  suite('roundToNearestQuarterHour', () => {
    test('should round down to nearest 15 minutes', () => {
      assert.strictEqual(roundToNearestQuarterHour(7), 0);
      assert.strictEqual(roundToNearestQuarterHour(22), 15);
    });

    test('should round up to nearest 15 minutes', () => {
      assert.strictEqual(roundToNearestQuarterHour(8), 15);
      assert.strictEqual(roundToNearestQuarterHour(23), 30);
    });

    test('should handle exact quarter hours', () => {
      assert.strictEqual(roundToNearestQuarterHour(15), 15);
      assert.strictEqual(roundToNearestQuarterHour(30), 30);
      assert.strictEqual(roundToNearestQuarterHour(60), 60);
    });

    test('should handle large values', () => {
      assert.strictEqual(roundToNearestQuarterHour(477), 480);
    });
  });

  suite('validateTimeEntry', () => {
    test('should accept valid time entries', () => {
      const result = validateTimeEntry(60);
      assert.strictEqual(result.isValid, true);
      assert.strictEqual(result.roundedMinutes, 60);
      assert.strictEqual(result.warning, undefined);
    });

    test('should reject zero or negative values', () => {
      assert.strictEqual(validateTimeEntry(0).isValid, false);
      assert.strictEqual(validateTimeEntry(-10).isValid, false);
    });

    test('should reject values over maximum limit', () => {
      const result = validateTimeEntry(TIME_LIMITS.MAX_MINUTES_PER_ENTRY + 1);
      assert.strictEqual(result.isValid, false);
      assert.strictEqual(result.roundedMinutes, 0);
      assert.ok(result.warning?.includes('cannot exceed'));
    });

    test('should round time and show warning', () => {
      const result = validateTimeEntry(23);
      assert.strictEqual(result.isValid, true);
      assert.strictEqual(result.roundedMinutes, 30);
      assert.ok(result.warning?.includes('rounded'));
    });

    test('should handle exact quarter hours without warning', () => {
      const result = validateTimeEntry(30);
      assert.strictEqual(result.isValid, true);
      assert.strictEqual(result.roundedMinutes, 30);
      assert.strictEqual(result.warning, undefined);
    });
  });

  suite('formatMinutes', () => {
    test('should format minutes only', () => {
      assert.strictEqual(formatMinutes(45), '45m');
    });

    test('should format hours only', () => {
      assert.strictEqual(formatMinutes(120), '2h');
    });

    test('should format hours and minutes', () => {
      assert.strictEqual(formatMinutes(90), '1h 30m');
    });

    test('should handle zero minutes', () => {
      assert.strictEqual(formatMinutes(0), '0m');
    });

    test('should handle large values', () => {
      assert.strictEqual(formatMinutes(480), '8h');
      assert.strictEqual(formatMinutes(495), '8h 15m');
    });
  });

  suite('requiresConfirmation', () => {
    test('should require confirmation for large time entries', () => {
      assert.strictEqual(requiresConfirmation(TIME_LIMITS.CONFIRMATION_THRESHOLD_MINUTES), true);
      assert.strictEqual(requiresConfirmation(TIME_LIMITS.CONFIRMATION_THRESHOLD_MINUTES + 1), true);
    });

    test('should not require confirmation for normal entries', () => {
      assert.strictEqual(requiresConfirmation(TIME_LIMITS.CONFIRMATION_THRESHOLD_MINUTES - 1), false);
      assert.strictEqual(requiresConfirmation(60), false);
    });

    test('should handle threshold boundary', () => {
      assert.strictEqual(requiresConfirmation(239), false);
      assert.strictEqual(requiresConfirmation(240), true);
    });
  });

});

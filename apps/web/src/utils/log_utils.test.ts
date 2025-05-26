import { sanitizeLogMessage } from './log_utils';

describe('sanitizeLogMessage', () => {
  test('removes newlines from strings', () => {
    expect(sanitizeLogMessage('hello\nworld')).toBe('hello world');
    expect(sanitizeLogMessage('hello\r\nworld')).toBe('hello world');
  });

  test('handles objects by converting to JSON and removing newlines', () => {
    const obj = { foo: 'bar\nbaz', nested: { value: 'test\r\n' } };
    const result = sanitizeLogMessage(obj);
    expect(result).not.toContain('\n');
    expect(result).not.toContain('\r');
  });

  test('handles null and undefined', () => {
    expect(sanitizeLogMessage(null)).toBe('null');
    expect(sanitizeLogMessage(undefined)).toBe('undefined');
  });

  test('handles numbers and booleans', () => {
    expect(sanitizeLogMessage(123)).toBe('123');
    expect(sanitizeLogMessage(true)).toBe('true');
  });
});

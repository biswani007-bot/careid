import { parseDurationToMs } from '../duration.util';

describe('parseDurationToMs', () => {
  it('should parse milliseconds correctly', () => {
    expect(parseDurationToMs('500ms')).toBe(500);
    expect(parseDurationToMs('1ms')).toBe(1);
    expect(parseDurationToMs('  250MS  ')).toBe(250);
  });

  it('should parse seconds correctly', () => {
    expect(parseDurationToMs('30s')).toBe(30 * 1000);
    expect(parseDurationToMs('1s')).toBe(1000);
  });

  it('should parse minutes correctly', () => {
    expect(parseDurationToMs('15m')).toBe(15 * 60 * 1000);
    expect(parseDurationToMs('1m')).toBe(60 * 1000);
  });

  it('should parse hours correctly', () => {
    expect(parseDurationToMs('24h')).toBe(24 * 60 * 60 * 1000);
    expect(parseDurationToMs('1h')).toBe(60 * 60 * 1000);
  });

  it('should parse days correctly', () => {
    expect(parseDurationToMs('7d')).toBe(7 * 24 * 60 * 60 * 1000);
    expect(parseDurationToMs('30d')).toBe(30 * 24 * 60 * 60 * 1000);
    expect(parseDurationToMs('1d')).toBe(24 * 60 * 60 * 1000);
  });

  it('should parse weeks correctly', () => {
    expect(parseDurationToMs('2w')).toBe(14 * 24 * 60 * 60 * 1000);
  });

  it('should handle whitespace and uppercase units', () => {
    expect(parseDurationToMs('  7D  ')).toBe(7 * 24 * 60 * 60 * 1000);
    expect(parseDurationToMs('15 M')).toBe(15 * 60 * 1000);
  });

  it('should throw an error for invalid formats or units', () => {
    expect(() => parseDurationToMs('')).toThrow();
    expect(() => parseDurationToMs('invalid')).toThrow();
    expect(() => parseDurationToMs('7y')).toThrow();
    expect(() => parseDurationToMs(null as any)).toThrow();
  });
});

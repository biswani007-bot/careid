/**
 * Parses a duration string (e.g. '500ms', '30s', '15m', '1h', '7d', '2w') into milliseconds.
 * Throws an Error if the format or unit is invalid.
 */
export function parseDurationToMs(duration: string): number {
  if (!duration || typeof duration !== 'string') {
    throw new Error('Duration must be a non-empty string');
  }

  const trimmed = duration.trim();
  const match = trimmed.match(/^(\d+)\s*(ms|[smhdw])$/i);

  if (!match) {
    throw new Error(`Invalid duration format: '${duration}'. Expected format like '500ms', '30s', '15m', '1h', '7d'.`);
  }

  const value = parseInt(match[1], 10);
  const unit = match[2].toLowerCase();

  switch (unit) {
    case 'ms':
      return value;
    case 's':
      return value * 1000;
    case 'm':
      return value * 60 * 1000;
    case 'h':
      return value * 60 * 60 * 1000;
    case 'd':
      return value * 24 * 60 * 60 * 1000;
    case 'w':
      return value * 7 * 24 * 60 * 60 * 1000;
    default:
      throw new Error(`Unsupported duration unit: '${unit}'`);
  }
}

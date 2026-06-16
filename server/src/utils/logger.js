/* Minimal, dependency-free structured logger with timestamps and levels. */

const COLORS = {
  reset: '\x1b[0m',
  gray: '\x1b[90m',
  blue: '\x1b[34m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  red: '\x1b[31m',
};

const stamp = () => new Date().toISOString();

const format = (color, level, args) =>
  [`${COLORS.gray}${stamp()}${COLORS.reset}`, `${color}${level}${COLORS.reset}`, ...args];

export const logger = {
  info: (...args) => console.log(...format(COLORS.blue, 'INFO ', args)),
  success: (...args) => console.log(...format(COLORS.green, 'OK   ', args)),
  warn: (...args) => console.warn(...format(COLORS.yellow, 'WARN ', args)),
  error: (...args) => console.error(...format(COLORS.red, 'ERROR', args)),
};

export default logger;

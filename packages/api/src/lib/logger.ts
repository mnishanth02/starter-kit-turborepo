type LogLevel = 'info' | 'warn' | 'error' | 'debug';

function formatMessage(level: LogLevel, requestId: string | undefined, message: string): string {
  const timestamp = new Date().toISOString();
  const id = requestId ? `[${requestId}]` : '[-]';
  return `${timestamp} ${level.toUpperCase().padEnd(5)} ${id} ${message}`;
}

export function createLogger(requestId?: string) {
  return {
    info: (message: string) => console.log(formatMessage('info', requestId, message)),
    warn: (message: string) => console.warn(formatMessage('warn', requestId, message)),
    error: (message: string, err?: Error) => {
      console.error(formatMessage('error', requestId, message));
      if (err?.stack && process.env.NODE_ENV === 'development') {
        console.error(err.stack);
      }
    },
    debug: (message: string) => {
      if (process.env.NODE_ENV === 'development') {
        console.debug(formatMessage('debug', requestId, message));
      }
    },
  };
}

// App-level logger (no request context)
export const appLogger = createLogger();

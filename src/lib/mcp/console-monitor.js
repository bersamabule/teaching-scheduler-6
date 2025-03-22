// Console Monitor for MCP integration
// This script captures console logs and forwards them to the MCP server

// Configuration
const MCP_SERVER_URL = 'http://localhost:3099/mcp/console';
const APP_NAME = 'teaching-scheduler';

// Store original console methods
const originalConsole = {
  log: console.log,
  error: console.error,
  warn: console.warn,
  info: console.info,
  debug: console.debug
};

// Buffer for batching logs
let logBuffer = [];
let sendTimeout = null;

// Function to send logs to MCP server
function sendLogs() {
  if (logBuffer.length === 0) return;
  
  const logsToSend = [...logBuffer];
  logBuffer = [];
  
  try {
    fetch(MCP_SERVER_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        app: APP_NAME,
        timestamp: new Date().toISOString(),
        logs: logsToSend
      })
    }).catch(err => {
      // Silent failure - don't disrupt the app
      originalConsole.log('[MCP] Failed to send logs:', err);
    });
  } catch (e) {
    // Ignore errors to prevent disruption
  }
}

// Schedule sending logs (debounced)
function scheduleSend() {
  if (sendTimeout) clearTimeout(sendTimeout);
  sendTimeout = setTimeout(sendLogs, 1000);
}

// Add log to buffer
function bufferLog(level, args) {
  try {
    const logEntry = {
      level,
      timestamp: new Date().toISOString(),
      message: Array.from(args).map(arg => {
        if (arg instanceof Error) {
          return {
            name: arg.name,
            message: arg.message,
            stack: arg.stack
          };
        } else if (typeof arg === 'object') {
          try {
            return JSON.stringify(arg);
          } catch (e) {
            return String(arg);
          }
        } else {
          return String(arg);
        }
      }).join(' ')
    };
    
    logBuffer.push(logEntry);
    scheduleSend();
  } catch (e) {
    // Ignore errors to prevent disruption
  }
}

// Override console methods
console.log = function() {
  bufferLog('log', arguments);
  originalConsole.log.apply(console, arguments);
};

console.error = function() {
  bufferLog('error', arguments);
  originalConsole.error.apply(console, arguments);
};

console.warn = function() {
  bufferLog('warn', arguments);
  originalConsole.warn.apply(console, arguments);
};

console.info = function() {
  bufferLog('info', arguments);
  originalConsole.info.apply(console, arguments);
};

console.debug = function() {
  bufferLog('debug', arguments);
  originalConsole.debug.apply(console, arguments);
};

// Initialize
originalConsole.log('[MCP] Console monitoring initialized');

// Export for potential programmatic use
export const mcpConsole = {
  flushLogs: sendLogs,
  originalConsole
}; 
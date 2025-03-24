// Console Monitor for MCP integration
// This script captures console logs and forwards them to the MCP server

// Configuration
const API_ENDPOINT = '/api/console-logs';
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

// Track connection status
let connectionStatus = {
  lastSuccessTime: null,
  failures: 0,
  isHealthy: true
};

// Function to send logs to MCP server
function sendLogs() {
  if (logBuffer.length === 0) return;
  
  const logsToSend = [...logBuffer];
  logBuffer = [];
  
  try {
    fetch(API_ENDPOINT, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        level: logsToSend[0].level,
        message: logsToSend[0].message,
        timestamp: logsToSend[0].timestamp,
        meta: {
          app: APP_NAME,
          url: window.location.pathname,
          userAgent: navigator.userAgent,
          batchSize: logsToSend.length > 1 ? logsToSend.length : undefined
        }
      })
    }).then(response => {
      if (response.ok) {
        connectionStatus.lastSuccessTime = Date.now();
        connectionStatus.isHealthy = true;
        if (connectionStatus.failures > 0) {
          connectionStatus.failures = 0;
          originalConsole.log('[MCP] Console monitoring connection restored');
        }
        
        // If we had multiple logs, send the rest individually
        if (logsToSend.length > 1) {
          // Re-add the remaining logs to the buffer
          logBuffer = [...logsToSend.slice(1), ...logBuffer];
          scheduleSend();
        }
      } else {
        handleConnectionFailure();
      }
    }).catch(err => {
      handleConnectionFailure(err);
    });
  } catch (e) {
    handleConnectionFailure(e);
  }
}

// Handle connection failures
function handleConnectionFailure(err) {
  connectionStatus.failures++;
  
  // Only log occasional failures to avoid spam
  if (connectionStatus.failures === 1 || connectionStatus.failures % 10 === 0) {
    originalConsole.warn(`[MCP] Console monitoring connection issue (${connectionStatus.failures} failures)`, err);
  }
  
  if (connectionStatus.failures > 5) {
    connectionStatus.isHealthy = false;
  }
  
  // If we have too many failures, clear the buffer to avoid memory leaks
  if (connectionStatus.failures > 50) {
    logBuffer = [];
    originalConsole.warn('[MCP] Console monitoring disabled due to connection issues');
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
    // Get the current component/context from error stack
    let context = '';
    try {
      const stackError = new Error();
      const stackLines = stackError.stack.split('\n');
      
      // Find the first line that isn't part of this file
      for (let i = 2; i < stackLines.length; i++) {
        const line = stackLines[i];
        if (!line.includes('console-monitor.js')) {
          // Extract component name or file
          const match = line.match(/at (\w+) \((.+)\)/) || line.match(/at (.+)/);
          if (match) {
            context = match[1];
          }
          break;
        }
      }
    } catch (e) {
      // Ignore errors in stack parsing
    }
    
    const logEntry = {
      level,
      timestamp: new Date().toISOString(),
      context,
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

// Capture global errors and unhandled rejections
window.addEventListener('error', function(event) {
  bufferLog('error', [
    `Unhandled error: ${event.message} at ${event.filename}:${event.lineno}:${event.colno}`,
    event.error
  ]);
});

window.addEventListener('unhandledrejection', function(event) {
  bufferLog('error', [
    'Unhandled promise rejection:',
    event.reason
  ]);
});

// Initialize
originalConsole.log('[MCP] Console monitoring initialized');

// Export for potential programmatic use
export const mcpConsole = {
  flushLogs: sendLogs,
  getStatus: () => ({ ...connectionStatus }),
  originalConsole
}; 
/**
 * Console Monitor MCP Server
 * 
 * This MCP server provides a way to capture and analyze browser console logs
 * from the Teaching Scheduler application, enabling better troubleshooting.
 */

// Try to load the MCP server package, but provide fallback if not available
let createServer;
try {
  createServer = require('@anthropic-ai/mcp-server').createServer;
  console.log('MCP server package found, initializing with full functionality');
} catch (error) {
  console.log('MCP server package not found, initializing with limited functionality');
  // Create a simple mock for the createServer function
  createServer = (config) => {
    console.log('Using mock MCP server implementation');
    return {
      listen: (port) => {
        console.log(`Mock MCP server listening on port ${port}`);
      }
    };
  };
}

const fs = require('fs');
const path = require('path');
const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');

// Max number of log entries to keep
const MAX_LOGS = 1000;

// Storage for console logs
const logs = [];

// Create express app for receiving logs
const app = express();
app.use(cors());
app.use(bodyParser.json());

// Endpoint to receive console logs from the browser
app.post('/api/console-logs', (req, res) => {
  const { level, message, timestamp, meta } = req.body;
  
  // Add the log to our storage
  logs.push({
    level,
    message,
    timestamp: timestamp || new Date().toISOString(),
    meta: meta || {},
  });
  
  // Keep logs under the maximum size
  if (logs.length > MAX_LOGS) {
    logs.shift();
  }
  
  // Log to server console for immediate visibility
  let logMethod = console.log;
  if (level === 'error') logMethod = console.error;
  if (level === 'warn') logMethod = console.warn;
  
  logMethod(`[Browser:${level}]`, message);
  
  res.status(200).json({ success: true });
});

// GET endpoint to retrieve logs
app.get('/api/console-logs', (req, res) => {
  // Apply filters if provided
  let filteredLogs = logs;
  const { level, limit = 100, search, sinceMins } = req.query;
  
  // Filter by level if specified
  if (level && level !== 'all') {
    filteredLogs = filteredLogs.filter(log => log.level === level);
  }
  
  // Filter by time if specified
  if (sinceMins) {
    const cutoff = new Date(Date.now() - (sinceMins * 60 * 1000));
    filteredLogs = filteredLogs.filter(log => {
      const logTime = new Date(log.timestamp);
      return logTime >= cutoff;
    });
  }
  
  // Filter by search term if specified
  if (search) {
    const searchLower = search.toLowerCase();
    filteredLogs = filteredLogs.filter(log => {
      return JSON.stringify(log).toLowerCase().includes(searchLower);
    });
  }
  
  // Apply limit and return most recent logs first
  res.json({
    logs: filteredLogs.slice(-limit).reverse(),
    totalCount: filteredLogs.length,
    totalAllLogs: logs.length
  });
});

// DELETE endpoint to clear logs
app.delete('/api/console-logs', (req, res) => {
  const count = logs.length;
  logs.length = 0;
  res.json({ success: true, clearedCount: count });
});

// Handle POST to clear logs as well
app.post('/api/console-logs/clear', (req, res) => {
  const count = logs.length;
  logs.length = 0;
  res.json({ success: true, clearedCount: count });
});

// Start the Express server
const PORT = process.env.PORT || 3004;
app.listen(PORT, () => {
  console.log(`Console monitor HTTP server running on port ${PORT}`);
});

// Try to create the MCP server
try {
  // Create the MCP server with simplified configuration
  const server = createServer({
    roots: {
      consoleLogs: {
        description: 'Browser console logs monitoring and analysis',
        tools: {
          getLogs: {
            description: 'Retrieve console logs with optional filtering',
            parameters: {
              level: { 
                type: 'string', 
                enum: ['error', 'warn', 'info', 'log', 'debug', 'all'],
                description: 'Filter logs by level',
                required: false
              },
              limit: { 
                type: 'number', 
                description: 'Maximum number of logs to return',
                required: false
              }
            },
            function: async ({ level, limit = 100 }) => {
              // Filter by level if specified
              let filteredLogs = logs;
              if (level && level !== 'all') {
                filteredLogs = filteredLogs.filter(log => log.level === level);
              }
              
              // Apply limit and return most recent logs first
              return { 
                logs: filteredLogs.slice(-limit).reverse(),
                totalCount: filteredLogs.length,
                totalAllLogs: logs.length
              };
            }
          },
          clearLogs: {
            description: 'Clear the console log history',
            function: async () => {
              const count = logs.length;
              logs.length = 0;
              return { success: true, clearedCount: count };
            }
          }
        }
      }
    }
  });

  // Start the MCP server on the same port
  server.listen(PORT);
  console.log(`Console monitor MCP server running on port ${PORT}`);
} catch (error) {
  console.log(`Failed to start MCP server: ${error.message}`);
  console.log('Running in HTTP-only mode');
}

// Create browser integration code file
const clientCode = `
// Console Monitor Client Integration Code
// Injected into the browser to capture console logs and send them to the MCP server

(function() {
  // Save original console methods
  const originalConsole = {
    log: console.log,
    info: console.info,
    warn: console.warn,
    error: console.error,
    debug: console.debug
  };

  // Function to send logs to the server
  async function sendLog(level, args) {
    try {
      // Convert arguments to a string or object
      let message;
      
      if (args.length === 1) {
        message = args[0];
      } else {
        message = Array.from(args).map(arg => {
          if (typeof arg === 'object') {
            try {
              return JSON.stringify(arg);
            } catch (e) {
              return String(arg);
            }
          }
          return String(arg);
        }).join(' ');
      }
      
      // Don't stringify circular structures
      let meta = {};
      try {
        if (args.length > 0 && typeof args[0] === 'object') {
          meta = { objectType: args[0]?.constructor?.name };
        }
      } catch (e) {}
      
      // Send to the server
      fetch('/api/console-monitor', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          level,
          message,
          timestamp: new Date().toISOString(),
          meta
        })
      }).catch(err => {
        // Don't log this error to avoid infinite loops
      });
    } catch (e) {
      // Don't crash if there's an error
    }
  }

  // Override console methods
  console.log = function() {
    sendLog('log', arguments);
    originalConsole.log.apply(console, arguments);
  };

  console.info = function() {
    sendLog('info', arguments);
    originalConsole.info.apply(console, arguments);
  };

  console.warn = function() {
    sendLog('warn', arguments);
    originalConsole.warn.apply(console, arguments);
  };

  console.error = function() {
    sendLog('error', arguments);
    originalConsole.error.apply(console, arguments);
  };

  console.debug = function() {
    sendLog('debug', arguments);
    originalConsole.debug.apply(console, arguments);
  };

  // Capture unhandled errors
  window.addEventListener('error', function(event) {
    sendLog('error', [event.error ? event.error.stack || event.error.message : 'Unhandled error: ' + event.message]);
  });

  // Capture unhandled promise rejections
  window.addEventListener('unhandledrejection', function(event) {
    sendLog('error', [event.reason ? event.reason.stack || event.reason.message : 'Unhandled rejection: ' + event.reason]);
  });

  // Notify that the console monitor is active
  originalConsole.log('Console monitor active. Logs are being sent to MCP server.');
})();
`;

// Write client code to a file for inclusion in the application
const clientCodePath = path.join(__dirname, 'console-monitor-client.js');
fs.writeFileSync(clientCodePath, clientCode);
console.log(`Console monitor client code written to ${clientCodePath}`);

// Create API route for the Next.js app
const apiRoutePath = path.join(__dirname, '../src/app/api/console-monitor/route.ts');
const apiRouteCode = `
import { NextResponse } from 'next/server';

/**
 * API route to proxy console logs to the MCP server
 */
export async function POST(request: Request) {
  try {
    const body = await request.json();
    
    // Forward to the MCP server
    const response = await fetch('http://localhost:3004/api/console-logs', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(body)
    });
    
    if (!response.ok) {
      return NextResponse.json({ success: false, error: 'Failed to send logs to MCP server' }, { status: 500 });
    }
    
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error in console monitor API route:', error);
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 });
  }
}
`;

// Create directory for API route if it doesn't exist
const apiRouteDir = path.dirname(apiRoutePath);
if (!fs.existsSync(apiRouteDir)) {
  fs.mkdirSync(apiRouteDir, { recursive: true });
}

// Write API route file
fs.writeFileSync(apiRoutePath, apiRouteCode);
console.log(`Console monitor API route written to ${apiRoutePath}`);

// Create script to inject the monitor into the application
const monitorInjectionPath = path.join(__dirname, '../src/components/ConsoleMonitorLoader.tsx');
const monitorInjectionCode = `
'use client';

import { useEffect } from 'react';

/**
 * Component that injects the console monitor script into the browser
 */
export default function ConsoleMonitorLoader() {
  useEffect(() => {
    // Only run in the browser
    if (typeof window === 'undefined') return;

    // Inject the console monitor script
    const script = document.createElement('script');
    script.innerHTML = \`
      // Console Monitor Client Integration Code
      // Injected into the browser to capture console logs and send them to the MCP server

      (function() {
        // Save original console methods
        const originalConsole = {
          log: console.log,
          info: console.info,
          warn: console.warn,
          error: console.error,
          debug: console.debug
        };

        // Function to send logs to the server
        async function sendLog(level, args) {
          try {
            // Convert arguments to a string or object
            let message;
            
            if (args.length === 1) {
              message = args[0];
            } else {
              message = Array.from(args).map(arg => {
                if (typeof arg === 'object') {
                  try {
                    return JSON.stringify(arg);
                  } catch (e) {
                    return String(arg);
                  }
                }
                return String(arg);
              }).join(' ');
            }
            
            // Don't stringify circular structures
            let meta = {};
            try {
              if (args.length > 0 && typeof args[0] === 'object') {
                meta = { objectType: args[0]?.constructor?.name };
              }
            } catch (e) {}
            
            // Send to the server
            fetch('/api/console-monitor', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json'
              },
              body: JSON.stringify({
                level,
                message,
                timestamp: new Date().toISOString(),
                meta
              })
            }).catch(err => {
              // Don't log this error to avoid infinite loops
            });
          } catch (e) {
            // Don't crash if there's an error
          }
        }

        // Override console methods
        console.log = function() {
          sendLog('log', arguments);
          originalConsole.log.apply(console, arguments);
        };

        console.info = function() {
          sendLog('info', arguments);
          originalConsole.info.apply(console, arguments);
        };

        console.warn = function() {
          sendLog('warn', arguments);
          originalConsole.warn.apply(console, arguments);
        };

        console.error = function() {
          sendLog('error', arguments);
          originalConsole.error.apply(console, arguments);
        };

        console.debug = function() {
          sendLog('debug', arguments);
          originalConsole.debug.apply(console, arguments);
        };

        // Capture unhandled errors
        window.addEventListener('error', function(event) {
          sendLog('error', [event.error ? event.error.stack || event.error.message : 'Unhandled error: ' + event.message]);
        });

        // Capture unhandled promise rejections
        window.addEventListener('unhandledrejection', function(event) {
          sendLog('error', [event.reason ? event.reason.stack || event.reason.message : 'Unhandled rejection: ' + event.reason]);
        });

        // Notify that the console monitor is active
        originalConsole.log('Console monitor active. Logs are being sent to MCP server.');
      })();
    \`;
    document.head.appendChild(script);
  }, []);

  return null;
}
`;

// Write monitor injection file
fs.writeFileSync(monitorInjectionPath, monitorInjectionCode);
console.log(`Console monitor loader component written to ${monitorInjectionPath}`); 
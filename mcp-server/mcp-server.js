const express = require('express');
const cors = require('cors');
const fs = require('fs');
const path = require('path');
const { createServer } = require('http');
const bodyParser = require('body-parser');

// Create Express app
const app = express();
const httpServer = createServer(app);

// Configure middleware
app.use(cors());
app.use(bodyParser.json({ limit: '10mb' }));

// Console logs storage
const LOGS_DIR = path.join(__dirname, 'mcp-logs');
const CONSOLE_LOG_FILE = path.join(LOGS_DIR, 'console.log');

// Ensure logs directory exists
if (!fs.existsSync(LOGS_DIR)) {
  fs.mkdirSync(LOGS_DIR, { recursive: true });
}

// Initialize log file
if (!fs.existsSync(CONSOLE_LOG_FILE)) {
  fs.writeFileSync(CONSOLE_LOG_FILE, '# MCP Console Logs\n\n');
}

// Helper to format a log entry
function formatLogEntry(entry) {
  const timestamp = new Date(entry.timestamp).toLocaleTimeString();
  const levelPadded = entry.level.toUpperCase().padEnd(5, ' ');
  return `[${timestamp}] ${levelPadded} | ${entry.message}\n`;
}

// Endpoint to receive console logs
app.post('/mcp/console', (req, res) => {
  try {
    const { app, timestamp, logs } = req.body;
    
    if (!logs || !Array.isArray(logs)) {
      return res.status(400).json({ error: 'Invalid logs format' });
    }
    
    // Format and append logs to file
    const formattedLogs = logs.map(formatLogEntry).join('');
    fs.appendFileSync(CONSOLE_LOG_FILE, formattedLogs);
    
    // Also output to server console
    console.log(`[MCP] Received ${logs.length} logs from ${app}`);
    logs.forEach(log => {
      const method = log.level === 'error' ? 'error' : 
                     log.level === 'warn' ? 'warn' : 'log';
      console[method](`[Browser] ${log.message}`);
    });
    
    res.status(200).json({ success: true, count: logs.length });
  } catch (error) {
    console.error('Error processing logs:', error);
    res.status(500).json({ error: 'Server error processing logs' });
  }
});

// Health check endpoint
app.get('/mcp/health', (req, res) => {
  res.status(200).json({ status: 'ok', uptime: process.uptime() });
});

// Get logs endpoint
app.get('/mcp/logs', (req, res) => {
  try {
    const logs = fs.readFileSync(CONSOLE_LOG_FILE, 'utf8');
    res.status(200).send(logs);
  } catch (error) {
    console.error('Error reading logs:', error);
    res.status(500).json({ error: 'Server error reading logs' });
  }
});

// Clear logs endpoint
app.delete('/mcp/logs', (req, res) => {
  try {
    fs.writeFileSync(CONSOLE_LOG_FILE, '# MCP Console Logs\n\n');
    res.status(200).json({ success: true, message: 'Logs cleared' });
  } catch (error) {
    console.error('Error clearing logs:', error);
    res.status(500).json({ error: 'Server error clearing logs' });
  }
});

// Start the server
const PORT = process.env.MCP_PORT || 3099;
httpServer.listen(PORT, () => {
  console.log(`MCP Server running on port ${PORT}`);
  console.log(`Console logs will be saved to: ${CONSOLE_LOG_FILE}`);
}); 